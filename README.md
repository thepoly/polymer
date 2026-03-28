# Polymer

Polymer is the rebuilt web platform for **The Polytechnic**, RPI's independent student newspaper. This repository combines the public site, editorial CMS, archive-aware search, and deployment tooling in a single Next.js + Payload application.

## What This Repo Does

- Serves the public homepage and section pages for `news`, `features`, `sports`, and `opinion`
- Renders article pages with standard, opinion, and photofeature layouts
- Hosts staff pages and public author profiles
- Provides a Payload admin panel for publishing, media management, and homepage curation
- Searches both the current Payload content store and the legacy Poly archive
- Deploys to a self-hosted production environment with smoke checks and rollback support

## Stack

- Next.js 16 with the App Router
- React 19
- TypeScript
- Payload CMS 3
- PostgreSQL
- Tailwind CSS 4
- Playwright
- pnpm

## Project Layout

```text
.
|-- app/
|   |-- (frontend)/              # Public-facing routes
|   |-- (payload)/               # Payload admin + API routes
|   `-- api/                     # Search, health, weather, and utility endpoints
|-- collections/                 # Payload collection definitions
|-- components/                  # Shared UI, article layouts, dashboard UI
|-- migrations/                  # SQL / Payload migration assets
|-- public/                      # Static assets, icons, and fonts
|-- scripts/                     # Deploy and local bootstrap scripts
|-- tests/                       # Playwright smoke and search tests
|-- utils/                       # Formatting, routing, rate limiting, search helpers
|-- payload.config.ts            # Payload config and Postgres adapter setup
|-- next.config.ts               # Next.js config wrapped with Payload
`-- .github/workflows/           # CI and production deployment workflows
```

## Core Content Model

- `articles`: Draft/published stories with section, authors, featured media, subdeck, and rich text content
- `layout`: The curated homepage configuration, including lead story and pinned slots
- `users`: Staff accounts, roles, headshots, bios, and position history
- `media`: Uploaded assets with alt text and photographer attribution
- `job-titles`: Reusable staff titles for profile timelines

Article write access is role-based. Admins, EICs, and section editors can update articles; writers can create them; anonymous visitors only see published content.

## Local Development

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL

### Install

```bash
pnpm install
```

If `.env` does not exist, the postinstall script will generate one and create a random `PAYLOAD_SECRET`.

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
```

`LEGACY_DATABASE_URI` is required if you want archive-backed search results from the old site. Without it, the current-content site can still run, but the legacy search endpoints will not be fully functional.

### Run the App

```bash
pnpm dev
```

Open `http://localhost:3000` for the public site and `http://localhost:3000/admin` for the CMS. On a fresh database, Payload will prompt you to create the first admin user.

## Scripts

- `pnpm dev`: Start the local Next.js + Payload dev server
- `pnpm build`: Build the production app
- `pnpm start`: Run the built app
- `pnpm lint`: Run ESLint
- `pnpm typecheck`: Run TypeScript without emitting files
- `pnpm test:smoke`: Run the main Playwright smoke suite
- `pnpm test:search-limit`: Run the search query bounds test
- `pnpm test:deploy-smoke`: Run the post-deploy health/smoke script
- `pnpm generate:types`: Regenerate `payload-types.ts`

## Runtime Notes

- Homepage content is driven by the `layout` collection rather than a hardcoded editorial order.
- Search combines Payload content with legacy Wagtail-era content through `LEGACY_DATABASE_URI`.
- The health endpoint is `GET /api/health` and verifies that the app can reach the primary database.
- The article route format is `/:section/:year/:month/:slug`.

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

## Deployment

Production deploys are triggered by GitHub Actions after the `CI` workflow succeeds on a push to `main`.

The deploy workflow:

1. Creates a fresh release directory on the self-hosted server
2. Installs dependencies with `pnpm install --frozen-lockfile`
3. Links shared runtime assets like `.env` and `media`
4. Runs SQL migrations before the app build
5. Builds the app
6. Atomically switches the active release
7. Reloads the `polymer` PM2 process
8. Verifies `/api/health` and runs deploy smoke checks
9. Rolls back to the previous release automatically if verification fails

Because `main` is deployment-sensitive, treat it as a release branch rather than a scratch branch.

## License

MIT. See [LICENSE](LICENSE).
