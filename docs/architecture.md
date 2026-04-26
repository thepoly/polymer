# Architecture

A working mental model of how Polymer fits together. Read this first.

## High-level shape

Polymer is a single Next.js 16 app that hosts:

- the **public site** (App Router routes under `app/(frontend)/`)
- the **Payload CMS admin** (mounted under `/admin`, served from `app/(payload)/`)
- a small set of **JSON APIs** (`app/api/*`) — search, health, push,
  weather, public submission forms, and internal admin hooks

It talks to two PostgreSQL databases:

- the **primary** Payload-managed DB (`DATABASE_URL`) — current articles,
  layout, users, media, etc.
- an optional **legacy archive** (`LEGACY_DATABASE_URI`) — the old Wagtail
  Poly site, queried read-only by the search and `/archive` endpoints

A self-hosted PostHog instance (`t.poly.rpi.edu`) receives privacy-filtered
analytics; FCM HTTP v1 is the transport for breaking-news pushes to the
Android app.

```
                ┌─────────────────────────────────────────────────┐
                │                   Next.js 16                    │
                │                                                 │
   browser ───▶ │  app/(frontend)/  ──▶ Payload (in-process)      │
                │  app/(payload)/   ──▶ Postgres (primary)        │
                │  app/api/*        ──▶ Postgres (legacy archive) │
                │                                                 │
                └───────────────┬───────────────┬─────────────────┘
                                │               │
                          PostHog (t.poly)   FCM HTTP v1
```

## Runtime layers

### Frontend — `app/(frontend)/`

Plain App Router server components. Article-rendering branches by section
and content flag:

- standard / news / sports / features → `components/Article/StandardLayout`
- opinion → `components/Article/OpinionLayout`
- first paragraph contains `#photofeature#` → `components/Article/PhotofeatureLayout`

Homepage composition is **data-driven**: the `layout` collection (one
versioned global-ish doc) describes what's pinned, what's lead, and which
sections render below. `app/(frontend)/page.tsx` reads layout and supplements
empty slots with recent stories from each section.

The header animation, theme colors, and SEO defaults all come from globals
(`theme`, `seo`) so they can be edited from the admin without a deploy.

### Payload — `app/(payload)/` and `payload.config.ts`

Payload is mounted in-process (no separate server). The config wires up:

- collections (`collections/*.ts`) — articles, live-articles, layout,
  per-section page layouts, users, media, job titles, submissions,
  event submissions, logos, device tokens
- globals — `theme`, `seo`
- the Lexical rich-text editor with two custom blocks (`photo_gallery`,
  `carousel`) and a `media` upload field that adds a caption + photo-credit
  override
- a custom dashboard view (`@/components/Dashboard#default`) and login
  graphics

`db.push` is enabled in development unless `PAYLOAD_DISABLE_PUSH=1` —
useful when you want to run migrations against your dev DB without Payload
auto-syncing on the side.

### API routes — `app/api/`

Roughly grouped:

- **public read**: `health`, `search`, `search/spellcheck`,
  `search/archive-date`, `archive/day`, `staff/[slug]`, `weather`,
  `logos/file`, `section-layout`
- **public write**: `submit`, `submit-event`, `push/register`
- **internal**: `push/send` (requires `x-internal-secret`), `inline-edit`,
  `admin/archive`, `newsroom/admin-move-notice`

Most are thin wrappers around `getPayload({ config })` and the legacy
Postgres pool helpers in `lib/`.

### Middleware — `middleware.ts`

Matches the article URL pattern `/:section/:year/:month/:slug` and, if the
matching `articles` row exists but is **not** published, returns a `410
Gone`. This is so search engines de-index unpublished articles faster than
they would from a bare 404. There's a tiny in-process cache (`CACHE_TTL_MS
= 60_000`) so the lookup doesn't run on every hit. Ignored paths (assets,
`/api`, `/admin`, sitemaps, etc.) are excluded by the matcher config.

The middleware runs in the **Node.js runtime** (`export const runtime =
'nodejs'`) so it can import Payload directly. Edge would have meant an
internal HTTP call back into the app, which CodeQL flagged as SSRF.

## Data lifecycle

1. **Drafts**: editors create articles in the admin. `versions.drafts: true`
   on the `articles` collection means rows can exist with
   `_status='draft'` and never be visible to anonymous readers.
2. **Publish**: in `Articles.beforeChange`, the first transition to
   `_status='published'` writes `publishedDate = NOW()`. `lastModifiedBy`
   is stamped on every change so each version captures who made it.
3. **Side effects** (in `Articles.afterChange`):
   - PostHog `article_published` event
   - if `breakingNews=true`, fire-and-forget POST to `/api/push/send` with
     `INTERNAL_PUSH_SECRET` → fans out FCM to every `device-tokens` row
4. **Live**: `live-articles` is its own collection with append-only
   `updates`. It feeds `/live` and the homepage `LiveStrip`.
5. **Unpublish**: setting status back to draft does not delete the row but
   the middleware will start serving `410` for the URL.

## How the homepage gets built

`app/(frontend)/page.tsx`:

1. Fetches the `layout` doc (versioned; latest published version wins).
2. Resolves slot references (lead, pinned, top-4) into article rows via
   `lib/homepageSlots.ts`.
3. Backfills any empty section blocks with recent published articles.
4. Reads the `theme` global for colors / typography and the `seo` global
   for metadata.
5. Returns server-rendered HTML; client islands handle search overlay,
   mobile menu, header animation, and the live strip.

## Key files to know

| Concern | File |
| --- | --- |
| Payload setup | [`payload.config.ts`](../payload.config.ts) |
| Article schema + hooks | [`collections/Articles.ts`](../collections/Articles.ts) |
| Live blog schema | [`collections/LiveArticles.ts`](../collections/LiveArticles.ts) |
| Homepage layout schema | [`collections/Layout.ts`](../collections/Layout.ts) |
| 410-on-unpublished middleware | [`middleware.ts`](../middleware.ts) |
| Health probe | [`app/api/health/route.ts`](../app/api/health/route.ts) |
| Search | [`app/api/search/route.ts`](../app/api/search/route.ts), [`utils/search.ts`](../utils/search.ts), [`lib/payloadArchive.ts`](../lib/payloadArchive.ts) |
| Breaking-news fan-out | [`app/api/push/send/route.ts`](../app/api/push/send/route.ts), [`lib/fcm.ts`](../lib/fcm.ts) |
| Token registration | [`app/api/push/register/route.ts`](../app/api/push/register/route.ts) |
| PostHog (server) | [`lib/posthog-server.ts`](../lib/posthog-server.ts), [`lib/posthog-config.ts`](../lib/posthog-config.ts) |
| PostHog (client) | [`instrumentation-client.ts`](../instrumentation-client.ts) |
| PM2 runtime | [`ecosystem.config.cjs`](../ecosystem.config.cjs) |
| CI | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) |
| Deploy | [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) |
| Android | [`mobile/`](../mobile/) |
