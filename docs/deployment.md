# Deployment

Production runs on a self-hosted Arch Linux box behind a GitHub Actions
self-hosted runner. This doc captures the actual sequence the deploy
workflow executes plus the host invariants you need to maintain.

## TL;DR

- `main` is auto-deployed after CI succeeds (`workflow_run` trigger).
- The workflow file is [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).
- Releases live at `/var/www/polymer/releases/<sha>-<attempt>`. The
  `current` symlink at `/var/www/polymer/current` is what PM2 runs.
- All PM2 commands must be run as `actions-runner`. **Do not run app
  PM2 commands as another user.** See [PM2 ownership](#pm2-ownership-rule-critical).

## Triggering a deploy

There is no "deploy on tag" or manual button. Pushes to `main` that pass
CI deploy automatically:

```
push → CI workflow → (success) → workflow_run "Deploy to polymer@archlinux"
```

The deploy job is gated on `github.event.workflow_run.conclusion == 'success'`
and `event == 'push'`, so PRs don't deploy and failed CI runs don't deploy.

A `concurrency.group` of `polymer-production-deploy` with
`cancel-in-progress: false` means parallel deploys queue rather than
clobber each other.

## Server paths

| Path | Role |
| --- | --- |
| `/var/www/polymer/` | Deploy root |
| `/var/www/polymer/current` | Symlink to the active release |
| `/var/www/polymer/releases/<sha>-<attempt>/` | A single release (full source + node_modules + .next) |
| `/var/www/polymer/shared/.env` | Shared runtime env, re-linked into each release |
| `/var/www/polymer-media/` | Persistent media uploads (symlinked as `current/media`) |

## One-time host setup

Required state on the box:

- `actions-runner` user with the GitHub Actions self-hosted runner
  installed and active
- Node.js 20+, pnpm 10, `psql` client, PM2 — all on `actions-runner`'s PATH
- The four directories above pre-created with `actions-runner` write
  access:
  - `/var/www/polymer`
  - `/var/www/polymer/releases`
  - `/var/www/polymer/shared`
  - `/var/www/polymer-media`
- `actions-runner` can read `/var/www/polymer/shared/.env`; the runtime
  process (which is `actions-runner` if PM2 was started by them) can
  read it too.
- PM2 is set to start on boot for `actions-runner` (`pm2 startup` then
  `pm2 save`).

## Deploy sequence

Every step of the deploy job, in order:

1. **Checkout** the head SHA from the upstream `CI` workflow.
2. **Prepare release directory**: `mkdir -p` the release/shared/media
   roots, then `rsync` source into a fresh
   `/var/www/polymer/releases/<sha>-<attempt>` excluding `.git`,
   `node_modules`, `.next`, and `media`.
3. **Write shared `.env`** from GitHub secrets: `DATABASE_URL`,
   `PAYLOAD_SECRET`, `LEGACY_DATABASE_URI`, PostHog keys. `chmod 644`
   so the runtime user can read it.
4. **Install** with `pnpm install --frozen-lockfile` in the release dir.
5. **Link runtime assets**: replace `release/.env` with a symlink to the
   shared file; replace `release/media` with a symlink to
   `/var/www/polymer-media`.
6. **Run SQL migrations**: `bash scripts/run_deploy_sql_migrations.sh`.
   This applies any pending DDL **before** the build so the build sees
   the right schema (Payload reads schema during build).
7. **Build**: `pnpm run build`.
8. **Record previous release** target so we can roll back.
9. **Atomic switch**: `ln -sfn <release_dir> /var/www/polymer/current`.
10. **Restart PM2**: `pm2 startOrReload ecosystem.config.cjs --only polymer`
    (run as `actions-runner`).
11. **Verify**: curl `HEALTHCHECK_URL` (default `http://127.0.0.1:3000/api/health`)
    with retries until 200 or timeout.
12. **Roll back on failure**: switch the `current` symlink back to the
    previous release and restart PM2.
13. **Prune** older releases, keeping the 5 most recent.

## PM2 ownership rule (critical)

There is **one** PM2 control plane on the host: `actions-runner`'s.

- ✅ `sudo -u actions-runner pm2 ...`
- ❌ `pm2 ...` as `poly` or any other user

Mixing PM2 users creates split daemons. Each daemon keeps its own
`pm2 list` and you end up with two processes both binding port 3000 —
the deploy "succeeds" because the runner's daemon is happy, but actual
requests hit the older other-user process. To check who owns port 3000:

```bash
ss -ltnp '( sport = :3000 )'
```

The output's process name should be the `actions-runner` Next.js process.

## Runtime config

[`ecosystem.config.cjs`](../ecosystem.config.cjs):

- name: `polymer`
- cwd: `/var/www/polymer/current`
- script: `node_modules/next/dist/bin/next`
- args: `start`
- mode: `cluster`, `instances: 1` (we keep this at 1 deliberately —
  multiple instances would multiply per-process caches like the
  middleware status cache and the in-memory rate limit)
- env: `NODE_ENV=production`, `PORT=3000`

## Health probe

[`app/api/health/route.ts`](../app/api/health/route.ts) responds to both
`GET` and `HEAD`:

- 200 + `{ status: 'ok', checks: { app: 'ok', database: 'ok' } }` on success
- 503 + `{ status: 'error', checks.database: 'error' }` on Payload/DB
  failure
- always `Cache-Control: no-store`

The deploy verification step polls this endpoint after PM2 reloads.

## Rolling back manually

If the auto-rollback didn't trigger but the site is broken:

```bash
ssh box
sudo -u actions-runner bash -c '
  cd /var/www/polymer
  ls -1 releases | sort | tail -n 5             # see candidates
  ln -sfn /var/www/polymer/releases/<previous>-<attempt> current
  pm2 startOrReload current/ecosystem.config.cjs --only polymer
  curl -fsS http://127.0.0.1:3000/api/health
'
```

Don't `git revert` to roll back unless you also need the code change
gone — flipping the symlink is faster and doesn't cycle CI.

## Manual smoke

Outside the deploy workflow, you can run the post-deploy smoke script
against any URL:

```bash
HEALTHCHECK_URL=https://poly.rpi.edu/api/health pnpm test:deploy-smoke
```

It just curls a few public routes and checks for non-2xx responses.

## Incident playbook

| Symptom | First check |
| --- | --- |
| `missing secret key` on Payload init | `actions-runner` can read `/var/www/polymer/shared/.env`; PM2 is the right user |
| Deploy succeeded but site looks stale | Two PM2 daemons (see [PM2 ownership](#pm2-ownership-rule-critical)) |
| Deploy fails on migrations | Bad SQL in the latest entry of `run_deploy_sql_migrations.sh` — fix on a branch and re-deploy |
| Health endpoint 503 right after deploy | DB unreachable or Payload init crashed; PM2 logs show the stack |
| No breaking-news pushes | `INTERNAL_PUSH_SECRET` and `FCM_SERVICE_ACCOUNT_JSON` set in the shared `.env`; see [`push-notifications.md`](push-notifications.md) |
