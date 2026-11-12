# Polymer

Polymer is the rebuilt web platform for **The Polytechnic**, RPI's independent student newspaper. This repository combines the public site and editorial CMS in a single Next.js application. From here, we:

- Serve the public homepage and section pages for https://poly.rpi.edu
- Render article pages with multiple different layouts, customizable via Payload
- Host staff pages and public author profiles
- Provide a Payload admin panel for publishing, media management, homepage curation, theme/SEO globals, and submission triage
- Provide a framework for sending FCM breaking-news push notifications to the Android app
- Capture privacy-conscious analytics through PostHog
- Deploy to our on-prem server with smoke checks and rollback support

## Gallery

Some UI elements and backend features we're incredibly proud of:

### Our front page

<img width="1610" height="980" alt="image" src="https://github.com/user-attachments/assets/5088b53d-a206-437c-b84d-dc5b374004b6" />

### Photofeature articles

<img width="1616" height="950" alt="image" src="https://github.com/user-attachments/assets/d27f0193-ec91-4a8c-9668-dafe5aa2f710" />

### Photo galleries

<img width="1615" height="944" alt="image" src="https://github.com/user-attachments/assets/25e6833d-99d6-4596-9e42-2bf04516c921" />

### Dark mode

<img width="1614" height="923" alt="image" src="https://github.com/user-attachments/assets/f454b99c-8ef0-4366-9031-3f78e381ec0c" />
<img width="1611" height="935" alt="image" src="https://github.com/user-attachments/assets/8880e380-be65-4ff8-8738-4b0853b65fd8" />

### Graph generator

A graph generator capable of generating any type of graph used by our reporters. Generates graphs consistent with our brand.

<img width="1650" height="1014" alt="image" src="https://github.com/user-attachments/assets/96db489c-d7ff-462a-bd4f-b2e826d24f72" />


## Stack

- Next.js `16.1.7` (App Router, Turbopack build)
- React `19.2.3`
- TypeScript
- Payload CMS `3.80.x` with Lexical rich text
- PostgreSQL (`@payloadcms/db-postgres`)
- Tailwind CSS 4
- PostHog (`posthog-js` + `posthog-node`)
- Playwright
- pnpm 10

## Project Layout

```text
.
|-- app/
|   |-- (frontend)/              # Public-facing routes
|   |-- (payload)/               # Payload admin + newsroom routes
|   `-- api/                     # Search, health, push, weather, submissions, etc.
|-- collections/                 # Payload collection + global definitions
|-- components/                  # Shared UI, article layouts, dashboard UI
|-- lib/                         # Server helpers (PostHog, FCM, theme, archive, weather)
|-- migrations/                  # Payload-format TypeScript migrations
|-- mobile/                      # Capacitor Android shell
|-- public/                      # Static assets, icons, and fonts
|-- scripts/                     # Deploy, env bootstrap, and seed scripts
|-- tests/                       # Playwright smoke and search tests
|-- utils/                       # Formatting, routing, rate limiting, search helpers
|-- middleware.ts                # 410 Gone handler for unpublished article URLs
|-- payload.config.ts            # Payload config and Postgres adapter setup
|-- next.config.ts               # Next.js config wrapped with Payload
|-- ecosystem.config.cjs         # PM2 runtime config (production)
`-- .github/workflows/           # CI, deploy, and Android release workflows
```

## Core Content Model

Collections:

- `articles`: Draft/published stories with section, authors, featured media, subdeck, breaking-news flag, and rich text content
- `live-articles`: Live-blog entries with append-only updates, surfaced on `/live`
- `layout`: Curated homepage configuration — lead story, pinned slots, layout template, and volume/issue metadata
- `opinion-page-layout`, `features-page-layout`, `sports-page-layout`, `staff-page-layout`: Per-section page composition
- `users`: Staff accounts, roles, slug, headshot, bio, retired flag, and position history
- `media`: Uploaded assets with alt text, caption, photographer attribution, and source URL
- `job-titles`: Reusable staff titles for profile timelines
- `submissions`: Public op-ed / letter-to-the-editor submissions
- `event-submissions`: Public event submissions for the calendar
- `logos`: Branded section logos and homepage assets
- `device-tokens`: Registered Android FCM tokens for push notifications

Globals:

- `theme`: Site-wide color palette + typography + header animation toggle
- `seo`: Default SEO metadata and Open Graph fields

Article role access:

- update: `admin`, `eic`; `editor` is constrained to their assigned `section`
- create: `admin`, `eic`, `editor`
- delete: `admin`
- anonymous read: published only

## Quickstart

### Prerequisites

- Node.js 20+
- pnpm 10
- PostgreSQL

### Install

```bash
pnpm install
```

If `.env` does not exist, the postinstall script (`scripts/generate-env.js`) creates one and seeds a random `PAYLOAD_SECRET`.

### Required Environment Variables

```bash
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/polymer
PAYLOAD_SECRET=replace-with-a-long-random-string
```

### Optional Environment Variables

```bash
LEGACY_DATABASE_URI=postgres://USER:PASSWORD@HOST:5432/legacy_poly
NEXT_PUBLIC_SITE_URL=http://localhost:3000
BASE_URL=http://127.0.0.1:3000
PLAYWRIGHT_WEB_SERVER=1
PLAYWRIGHT_WEB_SERVER_COMMAND=pnpm dev

# Analytics (optional; client + server)
NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_key
NEXT_PUBLIC_POSTHOG_HOST=https://t.poly.rpi.edu

# Breaking-news push notifications (optional)
INTERNAL_PUSH_SECRET=shared-secret-between-payload-and-the-push-route
FCM_SERVICE_ACCOUNT_JSON={...raw JSON of a Firebase service account...}
```

`LEGACY_DATABASE_URI` is required for archive-backed search results from the old Wagtail site. Without it, the current-content site still runs but legacy search endpoints return current-content-only results.

`FCM_SERVICE_ACCOUNT_JSON` and `INTERNAL_PUSH_SECRET` are only needed if you intend to actually fan out push notifications. Without them the breaking-news hook becomes a no-op.

### Run the App

```bash
pnpm dev
```

Open `http://localhost:3000` for the public site and `http://localhost:3000/admin` for the CMS. On a fresh database, Payload will prompt you to create the first admin user.

## Scripts

- `pnpm dev`: Start the local Next.js + Payload dev server
- `pnpm build`: Build the production app
- `pnpm start`: Run the built app (binds to `127.0.0.1`)
- `pnpm lint`: Run ESLint
- `pnpm typecheck`: Run TypeScript without emitting files
- `pnpm test:smoke`: Run the main Playwright smoke suite
- `pnpm test:search-limit`: Run the search query bounds test
- `pnpm test:deploy-smoke`: Run the post-deploy health/smoke script
- `pnpm generate:types`: Regenerate `payload-types.ts`

## Runtime Notes

- Article URL format: `/:section/:year/:month/:slug`. `middleware.ts` returns `410 Gone` for matching URLs whose article exists but is unpublished, so search engines de-index faster than from a bare 404.
- Article layouts pick by section and content flag:
  - `news` / `sports` / `features` / standard → `StandardLayout`
  - `opinion` → `OpinionLayout`
  - `#photofeature#` token in the first paragraph → `PhotofeatureLayout`
- Homepage composition is driven by the `layout` collection, not a hardcoded editorial order.
- Search combines Payload content with legacy Wagtail-era content via `LEGACY_DATABASE_URI`, with separator-form expansion and per-IP rate limiting.
- Breaking-news pushes: when an article is published with the `breakingNews` flag, the article's `afterChange` hook calls `/api/push/send` (authenticated via `INTERNAL_PUSH_SECRET`), which fans out FCM messages to every registered `device-tokens` row.
- The health endpoint is `GET /api/health` and verifies that the app can reach Payload/Postgres.

## API Routes

- `GET /api/health` — readiness probe (200 ok / 503 db-error)
- `GET /api/search` — site + archive search with rate limiting
- `GET /api/search/archive-date` — archive lookups by date
- `GET /api/search/spellcheck` — query spellcheck suggestions
- `GET /api/archive/day` — archive index for a given day
- `GET /api/staff/[slug]` — public staff profile data
- `GET /api/weather` — weather widget feed
- `GET /api/logos/file` — logo asset proxy
- `GET /api/section-layout` — per-section layout fetch
- `POST /api/submit` — public op-ed / letter submissions
- `POST /api/submit-event` — public event submissions
- `POST /api/push/register` — Android FCM token registration
- `POST /api/push/send` — internal breaking-news fan-out (requires `x-internal-secret`)
- `POST /api/inline-edit` — admin inline-editing handler
- `POST /api/admin/archive` — admin archive utilities
- `POST /api/newsroom/admin-move-notice` — newsroom move-notice flow

## Testing

The Playwright suite checks that key public routes render without framework errors, uncaught page errors, or broken critical assets. The smoke coverage includes:

- Homepage
- Section pages
- Article pages
- Staff pages
- Search input sanitization behavior

For local smoke runs:

```bash
pnpm test:smoke
pnpm test:search-limit
```

Playwright is not part of the CI runtime path; CI runs lint, typecheck, and build against a Postgres 16 service container.

## Deployment

Production deploys are triggered by GitHub Actions after the `CI` workflow succeeds on a push to `main` (`workflow_run` trigger).

The deploy workflow:

1. Creates a fresh release directory on the self-hosted server (`/var/www/polymer/releases/<sha>-<attempt>`)
2. Writes the shared runtime `.env` (Postgres + Payload + PostHog secrets) to `/var/www/polymer/shared/.env`
3. Installs dependencies with `pnpm install --frozen-lockfile`
4. Links shared runtime assets like `.env` and `media`
5. Runs SQL migrations (`scripts/run_deploy_sql_migrations.sh`) before the app build
6. Builds the app
7. Atomically switches the active release symlink
8. Reloads the `polymer` PM2 process (owned by `actions-runner`)
9. Verifies `/api/health` and runs deploy smoke checks
10. Rolls back to the previous release automatically if verification fails
11. Prunes old releases (keeps the 5 most recent)

Because `main` is deployment-sensitive, treat it as a release branch rather than a scratch branch. See `CLAUDE.md` for the full operations runbook (host setup, PM2 ownership rules, incident guardrails)..

## Android app

The [`mobile/`](mobile/) directory contains a Capacitor-based Android shell that loads `poly.rpi.edu` in a native WebView and adds FCM push notifications for breaking news.

- **Install:** grab the latest `app-release.apk` (or `app-debug.apk` prior to keystore setup) from the [Releases](../../releases) page, enable "Install unknown apps" for your browser or file manager, and tap the APK.
- **Build locally:** see [`mobile/README.md`](mobile/README.md) for SDK setup, icon regeneration, Firebase configuration, and signing.
- **Release runbook:** [`docs/android-release.md`](docs/android-release.md).
- **Design doc:** [`docs/superpowers/specs/2026-04-24-capacitor-android-app-design.md`](docs/superpowers/specs/2026-04-24-capacitor-android-app-design.md).

## License

MIT. See [LICENSE](LICENSE).
