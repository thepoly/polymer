# CLAUDE.md

This document is the canonical project + operations reference for Claude Code in this repository.

## Project Overview

Polymer is The Polytechnic's web platform (public newspaper site + Payload CMS admin) built on Next.js + Payload + PostgreSQL.

**This project is live in production with a real production database. Exercise caution with schema changes, migrations, and any destructive operations.**

## Stack

- Next.js `16.1.6` (App Router, Turbopack build)
- React `19.2.3`
- Payload CMS `3.75.0`
- PostgreSQL (`@payloadcms/db-postgres`)
- TypeScript
- Tailwind CSS 4
- pnpm

## Repository Layout

- `app/(frontend)/`: public site routes (`/`, section pages, article pages, staff, search)
- `app/(payload)/`: Payload admin/app API integration routes
- `app/api/`: custom API routes (`/api/health`, search, weather, etc.)
- `collections/`: Payload collection definitions
- `components/`: UI + article layout components
- `migrations/`: migration assets
- `scripts/`: deploy/runtime scripts (`run_deploy_sql_migrations.sh`, `deploy-smoke.mjs`)
- `.github/workflows/`: CI and production deployment workflows

## Core Behavior

- Article URL format: `/:section/:year/:month/:slug`
- Homepage composition comes from `layout` + recent section stories (`app/(frontend)/page.tsx`)
- Article layouts:
  - standard/news/sports/features -> `StandardLayout`
  - opinion -> `OpinionLayout`
  - `#photofeature#` flag in first content paragraph -> `PhotofeatureLayout`

## Data Model (Current)

- `articles`: draft/publish enabled (`versions.drafts: true`), `publishedDate` set on first publish in a `beforeChange` hook
- `layout`: homepage slot/pinning collection
- `users`: staff/auth/roles
- `media`: uploaded assets
- `job-titles`: staff position metadata

Role access in `articles`:
- update: `admin`, `eic`, `editor`
- create: `admin`, `eic`, `editor`, `writer`
- delete: `admin`
- anonymous read: published only

## Local Development

### Prerequisites

- Node 20+
- pnpm
- PostgreSQL

### Environment

Required:
- `DATABASE_URL`
- `PAYLOAD_SECRET`

Optional:
- `LEGACY_DATABASE_URI`
- `NEXT_PUBLIC_SITE_URL`
- `BASE_URL`
- `PLAYWRIGHT_WEB_SERVER`
- `PLAYWRIGHT_WEB_SERVER_COMMAND`

`pnpm install` runs `scripts/generate-env.js` to create `.env` if missing.

### Common Commands

- `pnpm dev`
- `pnpm build`
- `pnpm start`
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

Playwright is not part of current CI runtime path.

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
2. Write shared `.env` from GitHub secrets
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

- readiness endpoint: `GET /api/health`
- implementation: `app/api/health/route.ts`
- behavior:
  - returns `200` with `{ status: "ok" }` when app + DB/Payload check succeeds
  - returns `503` with `{ status: "error", checks.database: "error" }` on DB/Payload failure

## Agent Operations

- **Pre-commit checks:** Always run `pnpm lint` and `pnpm typecheck` before committing. Do not commit code that fails either check.
- **Linting & Code Quality:** You must ensure that any code changes you make are lint-safe before completing your task. Either review your code rigorously for common ESLint and React purity warnings, or execute `pnpm lint` to automatically verify.
- **Database Migrations:** When adding or modifying Payload collection fields that change the DB schema (new fields, new collections, enum changes), you MUST create corresponding migrations in BOTH paths:
  1. A TypeScript migration file in `migrations/` and register it in `migrations/index.ts` (used by CI via `pnpm exec payload migrate`)
  2. The equivalent SQL in `scripts/run_deploy_sql_migrations.sh` with a tracking INSERT entry (used by production deploy)
  Failing to do this will break production — the site will crash on startup if Payload tries to query columns/tables that don't exist.

## Incident Guardrails

- If you see `missing secret key` / Payload init errors:
  - verify `/var/www/polymer/shared/.env` readability for runtime user
  - verify app was started by `actions-runner` PM2
- If deploy says success but site looks wrong:
  - check for competing PM2 daemons/users
  - verify who owns port 3000 with `ss -ltnp '( sport = :3000 )'`
