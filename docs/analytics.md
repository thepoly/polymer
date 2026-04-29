# Analytics

PostHog is the only analytics tool in the stack. It runs against a
self-hosted instance (`t.poly.rpi.edu`), proxied through `/ingest` so the
client never talks to a third-party origin directly.

## Files

| Concern | File |
| --- | --- |
| Client init | [`instrumentation-client.ts`](../instrumentation-client.ts) |
| Server client (lazy singleton) | [`lib/posthog-server.ts`](../lib/posthog-server.ts) |
| Shared config + path helpers | [`lib/posthog-config.ts`](../lib/posthog-config.ts) |
| `article_published` event | [`collections/Articles.ts`](../collections/Articles.ts) (`hooks.afterChange`) |
| User identify | [`collections/Users.ts`](../collections/Users.ts) (`hooks.afterChange`) |
| Ingest proxy | configured via Next rewrites (see `next.config.ts`) |

## Environment

| Var | Notes |
| --- | --- |
| `NEXT_PUBLIC_POSTHOG_KEY` (or `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`) | If unset, **all** PostHog wiring is disabled — both client and server. Use this in local dev unless you're actively debugging analytics. |
| `NEXT_PUBLIC_POSTHOG_HOST` | Defaults to `https://t.poly.rpi.edu` |

The server-side `getPostHogClient()` returns `null` when the key is
unset, so every call site has the form `getPostHogClient()?.capture(...)`.

## What we capture

### Client (`posthog-js`)

Init in `instrumentation-client.ts`:

- `autocapture: false` — no DOM event scraping
- `capture_pageleave: false`
- `capture_pageview: 'history_change'` — Next App Router routing fires
  pageviews on history change rather than full reloads
- `disable_session_recording: true`
- `persistence: 'sessionStorage'`

Pageviews are decorated with a `page_type` derived from the path
(`homepage | article | section | staff | about | contact | other`).

The `before_send` hook strips the following PII-leaning properties from
every event:

- `$ip`
- `$browser_language`
- `$timezone`
- `$raw_user_agent`
- `$screen_height`, `$screen_width`
- `$viewport_height`, `$viewport_width`

Paths that fail `shouldTrackPath` (admin, dashboards, etc.) get
`opt_out_capturing()` invoked on the loaded instance.

### Server (`posthog-node`)

| Event | Source | Properties |
| --- | --- | --- |
| `article_published` | `Articles.afterChange` on first publish | `article_id`, `article_title` (plain), `article_section`, `article_slug` |
| `identify` | `Users.afterChange` | identifies the user record |

`flushAt: 1, flushInterval: 0` — every server-side capture flushes
immediately. This is fine because server-side events are infrequent
(publish, user updates).

## Privacy posture

- All ingest goes through `/ingest` (same-origin proxy). The client never
  sees the PostHog hostname directly, which keeps third-party blockers
  from killing analytics for legitimate readers.
- The server-side `posthog-node` instance does not auto-collect
  client metadata; it only emits the events listed above.
- `before_send` strips IP and a long list of fingerprint-relevant
  properties before they leave the browser.
- Session recording is disabled. Autocapture is disabled.

## Adding an event

Server side:

```ts
import { getPostHogClient } from '@/lib/posthog-server'

const posthog = getPostHogClient()
posthog?.capture({
  distinctId: String(req.user?.id || 'unknown'),
  event: 'my_new_event',
  properties: { ... },
})
```

Client side, prefer reading `POSTHOG_KEY` and bailing if disabled:

```ts
import posthog from 'posthog-js'
import { POSTHOG_KEY } from '@/lib/posthog-config'

if (POSTHOG_KEY) {
  posthog.capture('my_new_event', { ... })
}
```

If the new event introduces user-identifying properties, extend the
`before_send` strip list to keep the privacy posture intact.

## Disabling analytics for a route

Add the route to `shouldTrackPath` in `lib/posthog-config.ts`. Example:
admin paths and the dashboard are already excluded.

## Observability of the analytics pipeline itself

There's no internal alert when PostHog is unreachable. If you suspect
events aren't landing:

1. Confirm the env vars are set in `/var/www/polymer/shared/.env` on prod.
2. Hit `/ingest` from a logged-in browser and verify a 2xx.
3. Check the PostHog instance's project events list for live ingest.

PostHog itself has SDK-level retry/buffering — short outages don't lose
events, but a long unreachable window will.
