# CLAUDE.md

This document is the canonical project + operations reference for Claude Code in this repository.

## Project Overview

Polymer is The Polytechnic's web platform (public newspaper site + Payload CMS admin) built on Next.js + Payload + PostgreSQL, with a Capacitor Android shell that wraps the production site and receives FCM breaking-news pushes.

**This project is live in production with a real production database. Exercise caution with schema changes, migrations, and any destructive operations.**

For deeper architectural context, see [`docs/`](docs/) (architecture, data model, migrations, search, push, analytics, deployment, local-development).

## Stack

- Next.js `16.1.7` (App Router, Turbopack build)
- React `19.2.3`
- Payload CMS `3.80.x` (`@payloadcms/db-postgres`, `@payloadcms/richtext-lexical`)
- PostgreSQL
- TypeScript
- Tailwind CSS 4
- PostHog (`posthog-js` + `posthog-node`, self-hosted ingest at `t.poly.rpi.edu`)
- pnpm 10

## Repository Layout

- `app/(frontend)/`: public site routes (`/`, section pages, article pages, staff, search, `/live`, submission forms, `/about`, `/contact`, etc.)
- `app/(payload)/`: Payload admin/app API integration routes (`/admin`, `/newsroom`)
- `app/api/`: custom API routes (`/api/health`, search, push, weather, submit, etc.)
- `collections/`: Payload collection + global definitions
- `components/`: UI + article layout + dashboard components
- `lib/`: server helpers (PostHog, FCM, theme, archive query, weather, homepage slot resolution)
- `migrations/`: Payload-format TypeScript migrations registered via `migrations/index.ts`
- `mobile/`: Capacitor Android shell (separate `package.json`)
- `scripts/`: deploy/runtime scripts (`run_deploy_sql_migrations.sh`, `deploy-smoke.mjs`, `generate-env.js`)
- `middleware.ts`: returns `410 Gone` for matching article URLs whose row is unpublished
- `.github/workflows/`: CI, production deploy, and Android release workflows

## Core Behavior

- Article URL format: `/:section/:year/:month/:slug`
- Homepage composition comes from the `layout` collection + recent section stories (`app/(frontend)/page.tsx`)
- Article layouts:
  - standard / news / sports / features → `StandardLayout`
  - opinion → `OpinionLayout`
  - `#photofeature#` flag in first content paragraph → `PhotofeatureLayout`
- Live blog: `live-articles` collection drives `/live` and the homepage `LiveStrip` widget
- Breaking news: when an article publishes with `breakingNews=true`, the `Articles.afterChange` hook calls `/api/push/send` (with `INTERNAL_PUSH_SECRET`) which fans out FCM messages to every `device-tokens` row.

## Data Model (Current)

Collections:

- `articles`: drafts/publish enabled (`versions.drafts: true`); `publishedDate` is set on first publish in a `beforeChange` hook; `lastModifiedBy` is stamped on every change; `opinionType` auto-derives from the kicker for opinion pieces
- `live-articles`: live-blog entries with append-only `updates`; mirrors the photo-gallery / carousel rich-text blocks
- `layout`: homepage curation (lead, slots, top-4, layout template, sections, volume/issue) — drafts enabled
- `opinion-page-layout`, `features-page-layout`, `staff-page-layout`: per-section page composition
- `users`: staff/auth/roles + slug, headshot, retired flag, "one-liner", and seen-newsroom-notice flag
- `media`: uploaded assets (alt, title, caption, source URL, photographer relationship, write-in photographer)
- `job-titles`: staff position metadata
- `submissions`: public op-ed / letter submissions (anonymous create, staff triage)
- `event-submissions`: public event submissions for the calendar
- `logos`: branded section logos and homepage assets
- `device-tokens`: registered Android FCM tokens (anonymous create via `/api/push/register`, admin-only read/delete)

Globals:

- `theme`: site-wide colors, typography, header animation toggle
- `seo`: default SEO metadata + Open Graph defaults

Role access (`articles`):

- update: `admin`, `eic`; `editor` is constrained to their assigned `section`
- create: `admin`, `eic`, `editor`
- delete: `admin`
- anonymous read: published only

## Local Development

### Prerequisites

- Node 20+
- pnpm 10
- PostgreSQL

### Environment

Required:

- `DATABASE_URL`
- `PAYLOAD_SECRET`

Optional:

- `LEGACY_DATABASE_URI` (legacy Wagtail archive)
- `NEXT_PUBLIC_SITE_URL`
- `BASE_URL`
- `PLAYWRIGHT_WEB_SERVER`
- `PLAYWRIGHT_WEB_SERVER_COMMAND`
- `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`
- `NEXT_PUBLIC_POSTHOG_HOST` (defaults to `https://t.poly.rpi.edu`)
- `INTERNAL_PUSH_SECRET` (required to actually fan out breaking-news pushes)
- `FCM_SERVICE_ACCOUNT_JSON` (raw JSON, not base64 — required for FCM v1)
- `PAYLOAD_DISABLE_PUSH=1` (disables Payload's dev-mode `db.push` schema sync)

`pnpm install` runs `scripts/generate-env.js` to create `.env` if missing.

### Common Commands

- `pnpm dev`
- `pnpm build`
- `pnpm start` (binds to `127.0.0.1`; PM2/nginx fronts it in prod)
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:smoke`
- `pnpm test:search-limit`
- `pnpm test:deploy-smoke` (manual smoke script; not used by deploy workflow)
- `pnpm generate:types`

## CI (Current)

Workflow: `.github/workflows/ci.yml`

Runs on PRs + pushes to `main`:

1. Postgres service (`postgres:16`)
2. `pnpm install --frozen-lockfile`
3. `pnpm exec payload migrate`
4. `pnpm lint`
5. `pnpm typecheck`
6. `pnpm build`

Playwright is not part of the current CI runtime path.

## Production Deployment (Arch Linux)

Workflow: `.github/workflows/deploy.yml`
Trigger: successful `CI` workflow on push to `main` (`workflow_run`)

### Server Paths

- deploy root: `/var/www/polymer`
- current symlink: `/var/www/polymer/current`
- releases: `/var/www/polymer/releases/<sha>-<attempt>`
- shared runtime env: `/var/www/polymer/shared/.env`
- persistent media: `/var/www/polymer-media` (symlinked as `current/media`)

### Arch Linux Host Setup (One-Time)

Required host state:

- GitHub Actions self-hosted runner installed and active as `actions-runner`
- Node.js 20+, pnpm 10, `psql` client, and PM2 available to `actions-runner`
- deployment directories created:
  - `/var/www/polymer`
  - `/var/www/polymer/releases`
  - `/var/www/polymer/shared`
  - `/var/www/polymer-media`
- write access:
  - `actions-runner` must be able to create/update release directories and `/var/www/polymer/shared/.env`
  - runtime process must be able to read `/var/www/polymer/shared/.env` and read/write `/var/www/polymer-media` as needed
- PM2 persistence configured for `actions-runner` (`pm2 startup` + `pm2 save`)

Operator rule:

- when managing production PM2 manually, run `sudo -u actions-runner pm2 ...`

### Deploy Sequence

1. Rsync source into fresh release directory
2. Write shared `.env` from GitHub secrets (Postgres, Payload, PostHog)
3. `chmod 644 /var/www/polymer/shared/.env`
4. Install deps in release (`pnpm install --frozen-lockfile`)
5. Link shared `.env` and media symlink into release
6. Run SQL migrations (`scripts/run_deploy_sql_migrations.sh`)
7. Build app (`pnpm run build`)
8. Record previous release target
9. Atomically switch `current` symlink
10. Restart PM2 app from ecosystem file
11. Verify readiness with health endpoint (`curl` retries against `HEALTHCHECK_URL`)
12. On failure, roll back `current` symlink and restart PM2
13. Prune old releases (keep 5)

### PM2 Ownership Rule (Critical)

Use a single PM2 control plane: `actions-runner`.

- Allowed: `sudo -u actions-runner pm2 ...`
- Avoid: running app PM2 commands as `poly`

Mixing PM2 users creates split daemons/process lists and inconsistent runtime ownership on port 3000.

### Runtime Process Config

`ecosystem.config.cjs`:

- app name: `polymer`
- cwd: `/var/www/polymer/current`
- script: `node_modules/next/dist/bin/next`
- args: `start`
- mode: `cluster`, `instances: 1`
- env: `NODE_ENV=production`, `PORT=3000`

## Health & Verification

- readiness endpoint: `GET /api/health` (also supports `HEAD`)
- implementation: `app/api/health/route.ts`
- behavior:
  - returns `200` with `{ status: "ok" }` when app + Payload/Postgres check succeeds
  - returns `503` with `{ status: "error", checks.database: "error" }` on DB/Payload failure
  - response is `Cache-Control: no-store`

## Push Notifications (Breaking News)

- registration: `POST /api/push/register` (Android client; in-memory rate limit + token de-dupe)
- fan-out: `POST /api/push/send` (internal; requires `x-internal-secret` matching `INTERNAL_PUSH_SECRET`)
- transport: FCM HTTP v1 via `lib/fcm.ts` using `FCM_SERVICE_ACCOUNT_JSON`
- trigger: `Articles.afterChange` when an article transitions to published with `breakingNews=true`
- if `INTERNAL_PUSH_SECRET` or `FCM_SERVICE_ACCOUNT_JSON` is unset, the fan-out becomes a no-op so dev/CI is unaffected

## Agent Operations

- **Pre-commit checks:** Always run `pnpm lint` and `pnpm typecheck` before committing. Do not commit code that fails either check.
- **Linting & Code Quality:** Ensure code changes are lint-safe before completing your task. Either review your code rigorously for common ESLint and React purity warnings, or execute `pnpm lint` to automatically verify.
- **Database Migrations:** When adding or modifying Payload collection fields that change the DB schema (new fields, new collections, enum changes), you MUST create corresponding migrations in BOTH paths:
  1. A TypeScript migration file in `migrations/` and register it in `migrations/index.ts` (used by CI via `pnpm exec payload migrate`)
  2. The equivalent SQL in `scripts/run_deploy_sql_migrations.sh` with a tracking INSERT entry (used by production deploy)
  Failing to do this will break production — the site will crash on startup if Payload tries to query columns/tables that don't exist. See [`docs/migrations.md`](docs/migrations.md) for the full step-by-step.

## Incident Guardrails

- If you see `missing secret key` / Payload init errors:
  - verify `/var/www/polymer/shared/.env` readability for runtime user
  - verify app was started by `actions-runner` PM2
- If deploy says success but site looks wrong:
  - check for competing PM2 daemons/users
  - verify who owns port 3000 with `ss -ltnp '( sport = :3000 )'`
- If breaking-news pushes don't fire:
  - confirm `INTERNAL_PUSH_SECRET` and `FCM_SERVICE_ACCOUNT_JSON` are set in `/var/www/polymer/shared/.env`
  - check the `device-tokens` collection has rows
  - inspect server logs for `[breaking-news]` entries
