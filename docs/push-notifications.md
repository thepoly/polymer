# Push Notifications

Breaking-news pushes from Payload to the Android app, end to end.

## Components

```
Android app  ──► POST /api/push/register   (saves token in `device-tokens`)
Article publish (breakingNews=true)
             ──► Articles.afterChange      (article hook)
             ──► POST /api/push/send       (with x-internal-secret)
             ──► lib/fcm.ts → FCM HTTP v1  (fan-out to all device-tokens)
                                  └──► Android device shows notification
```

| Piece | File |
| --- | --- |
| Token storage | [`collections/DeviceTokens.ts`](../collections/DeviceTokens.ts) |
| Registration endpoint | [`app/api/push/register/route.ts`](../app/api/push/register/route.ts) |
| Internal fan-out endpoint | [`app/api/push/send/route.ts`](../app/api/push/send/route.ts) |
| FCM v1 client | [`lib/fcm.ts`](../lib/fcm.ts) |
| Article publish hook | [`collections/Articles.ts`](../collections/Articles.ts) (`hooks.afterChange`) |
| Android registration code | [`mobile/`](../mobile/) (Capacitor + a small Java/Kotlin plugin) |

## Required secrets

| Var | Where it lives | Notes |
| --- | --- | --- |
| `INTERNAL_PUSH_SECRET` | `/var/www/polymer/shared/.env` | Shared between the article hook (caller) and `/api/push/send` (server). The endpoint rejects with `401` if the request header `x-internal-secret` doesn't match. |
| `FCM_SERVICE_ACCOUNT_JSON` | `/var/www/polymer/shared/.env` | Raw JSON of a Firebase service account with the Firebase Cloud Messaging API scope. **Not** base64 — paste the JSON as the value. |

If either is unset:

- the article hook still fires its outbound `fetch`, but `/api/push/send`
  returns `401`
- inside `/api/push/send`, `lib/fcm.ts` short-circuits with no sends —
  nothing breaks, just no pushes go out

This is intentional so dev and CI environments don't need Firebase
credentials.

## Registration flow

1. The Android app obtains its FCM registration token via the Capacitor
   FCM plugin.
2. It POSTs to `/api/push/register` with `{ token, platform: 'android' }`.
3. The endpoint validates length (`MAX_TOKEN_LENGTH = 4096`), throttles
   re-registrations (in-memory `recentTokens` map, `RATE_LIMIT_WINDOW_MS
   = 60_000`), and upserts into `device-tokens`.
4. `device-tokens` rows are unique on `token`. Re-registering an existing
   token updates `lastSeenAt` rather than creating a duplicate.

> The rate-limit map is per-process. With multiple Node processes (cluster
> mode), a determined client could register past the limit; that's
> acceptable since the rate limit is purely there to keep boots from
> hammering the DB.

## Send flow

1. An editor publishes an article with `breakingNews=true`.
2. `Articles.afterChange` detects the unpublished→published transition.
3. It fires (and intentionally doesn't await) a `fetch` to
   `${NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000'}/api/push/send`
   with header `x-internal-secret: ${INTERNAL_PUSH_SECRET}` and a JSON
   body containing the article ID.
4. The endpoint validates the secret, paginates through all
   `device-tokens` rows, and calls `sendFcmToTokens` from `lib/fcm.ts`.
5. `lib/fcm.ts` mints an OAuth bearer from the service account, posts
   the FCM v1 message in chunks, and reports back per-token failures.
   Tokens that come back as `UNREGISTERED` should be removed from
   `device-tokens` (TODO if not yet wired).

## Local testing

Without Firebase you can still smoke-test the wiring:

```bash
INTERNAL_PUSH_SECRET=devsecret NEXT_PUBLIC_SITE_URL=http://localhost:3000 pnpm dev
```

In another terminal:

```bash
# Register a fake token
curl -X POST http://localhost:3000/api/push/register \
  -H 'content-type: application/json' \
  -d '{"token":"fake-token-1","platform":"android"}'

# Pretend an article published
curl -X POST http://localhost:3000/api/push/send \
  -H 'content-type: application/json' \
  -H "x-internal-secret: devsecret" \
  -d '{"articleId": <id>}'
```

Without `FCM_SERVICE_ACCOUNT_JSON`, the response will indicate zero sends
but the path is exercised.

## Operational notes

- Pushes are intentionally fire-and-forget from the article hook. A slow
  FCM call must not block a publish. If `/api/push/send` is misbehaving,
  the worst case is a missed push — the article still publishes.
- If you change the wire shape of `/api/push/send`, update **both** the
  caller in `Articles.afterChange` and the endpoint together. There's
  only one caller in the codebase; CI typecheck will catch most
  mismatches but JSON body shape is checked at runtime.
- For multi-platform support, add an iOS branch to `device-tokens.platform`
  and a APNs-or-FCM dispatch in `lib/fcm.ts`. The platform column is
  already enum-bounded to `android | ios`.

## Incident playbook

- **Pushes don't fire after a publish.** Check `/var/www/polymer/shared/.env`
  for both `INTERNAL_PUSH_SECRET` and `FCM_SERVICE_ACCOUNT_JSON`. Inspect
  PM2 logs for `[breaking-news]` entries from the article hook.
- **All sends fail with `401` from FCM.** The service account JSON is
  invalid or the Firebase project ID doesn't match the package name
  (`edu.rpi.poly`). Regenerate the service account and rotate the env var.
- **Tokens accumulate forever.** Until token cleanup is wired,
  `device-tokens` grows monotonically. Manually prune rows older than ~6
  months (`DELETE FROM device_tokens WHERE last_seen_at < NOW() -
  INTERVAL '6 months'`) — they were likely uninstalled.
