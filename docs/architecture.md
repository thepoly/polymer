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
Android and iOS apps.

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

Text article headers leave 29.25px below the fixed article strip on phones
and 35.25px from the `md` breakpoint (Opinion: 21px / 27px), a 25% reduction
from 39px / 47px (Opinion: 28px / 36px). Layouts reserve 60px for the 56px
strip, its 1px border and clearance. Standard article margins are 6.25px /
12.25px with 20px header padding; Opinion uses 9px / 15px with 9px padding.
Mobile photofeatures use the same spacing; their desktop hero stays full-screen.

All four sections use `components/Article/ArticleSectionLabel.tsx` above the
article title: centered accent section name, uppercase kicker in the main
text color, and a short rule. Empty kickers and kickers matching the section
are omitted. Opinion uses its stored kicker, falling back to its type label
for older articles. Photofeature heroes use white kicker text and a white rule
over the photo; mobile photofeatures use the standard header.

Article titles use regular weight, including bold spans stored in rich-text
headlines. These overrides apply only to the title within standard, Opinion,
photofeature and live articles, and to the title in the sticky article strip;
italic emphasis is preserved.

News recommendation titles at the bottom of articles also use regular weight,
including bold spans in their rich-text headlines. The News block leaves
32px above its heading and 34px below its content on phones, and 46px above
and below from `md`, halving its previous surrounding gaps. Bottom spacing
includes the footer's existing 12px margin.

On phones (below 768px), the article strip keeps its logo centered while
scrolling. Tablets (768–1023px) start with a centered logo; after 100px of
scrolling they show a burger menu on the left and centered `Section | Title`.
Both tablet text links return to the section page. The burger opens the same
`MobileMenuDrawer` as the mobile header and photofeature hero. It is a portalled
modal dialog with a visible close button, section descriptions/current-section
marker, archive search, paper links, `/get-involved` link, dark-mode switch
and colophon. Phone width is min(86vw, 360px); tablets use 380px. Changing the
theme keeps the drawer open, preserving its focus, scroll position and page
isolation. Its search uses the same `UnderlinedSearchForm` as section-page
footers: a typing field, accent underline and rainbow wave, submitting a GET
request to `/search`.
Drawer searches are site-wide; section footers retain their section filter.
Submitting closes the drawer without returning focus to the menu trigger.
The panel scrolls on short screens, with its footer last and split safe-area padding.
At tablet widths, its lower area includes the three latest published stories
across all sections, with section labels, regular-weight headlines and dates
in Troy's time zone. The optional feed loads when a tablet drawer opens, using
the public collection API without credentials and selecting only summary
fields. Requests are shared/cached for one minute; future/invalid items are
excluded, and an empty or unavailable feed leaves the navigation usable.
Phones neither display nor request this list. Story links close the modal.
Opening moves focus inside; Tab stays in the dialog and the page behind is
inert. Close restores prior inert/scroll state and focus, except when following
a link or opening search. The 220ms swipe/slide uses the rendered panel width;
reduced motion disables transitions. Font tokens are carried across the portal
to preserve article-local Follytechnic styling. The tablet trigger closes on
resize or returning to the top. A secondary drawer trigger
does not add another global swipe-to-open gesture, and closed drawers ignore
touches while another drawer is open.
Theme/share controls stay on the right. Desktop and homepage strips retain
their existing behavior.

The desktop header's "Submit" and drawer's "Get involved" links open
`/get-involved`, a server-rendered hub
for joining staff, submitting an op-ed/letter through `/submit`, and sending a
news tip. Only the mutually exclusive native desk accordion and clipboard
button need client components. The copy button selects the email text if
clipboard access fails. Meetings use the times/room already on `/contact`;
update both pages if these change. Below 1024px, meetings appear first and
native jump links remain visible. Desktop groups the staff introduction,
meeting times and desk list in the left column, with op-ed submissions and
news tips stacked in the right column. From 768px, the content aligns with
the header container. Below 1024px, the title scales to fit on one line and
the path index uses larger links; the staff section has no trailing divider.
Desktop retains its 76px title with balanced wrapping, without a hero divider,
and uses a 24px gap before the column labels.
An events/advertising block follows news tips, stacking below 640px. The
advertising address reuses the copy control with its own accessible label.
The event link uses `/features/submit-event`, which currently redirects to
Features because the earlier event form was removed.
Jump-link smooth scrolling is disabled for reduced motion.
Metadata is static and the route is included in the sitemap; no SEO schema or
submission/contact/staff behavior changes are required.

Homepage composition is **data-driven**: the `layout` collection (one
versioned global-ish doc) describes what's pinned, what's lead, and which
sections render below. `app/(frontend)/page.tsx` reads layout and supplements
empty slots with recent stories from each section.

The header animation, theme colors, and SEO defaults all come from globals
(`theme`, `seo`) so they can be edited from the admin without a deploy.

The desktop section underline slides between section links. Opening a
section from the landing page brings its underline in from outside the
rule's left edge and slides it beneath the selected label at a fixed width.
Choosing the masthead logo from a section carries that underline onto the
landing-page rule and slides it off the left edge, without delaying navigation.
It uses the section slide's 420ms timing and easing, with the active-colour text
following the bar. Reduced motion and mobile skip these entrance and exit
animations; resizing or navigating again cleans them up.

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
- "Preview draft" / "Copy preview link" in the article edit view's three-dot
  menu (`admin.components.edit.editMenuItems`), which open
  `/preview/:id`: the latest saved version rendered through the public article
  layouts, behind the newsroom login (signed-out visitors are sent to
  `/newsroom/login` and back)

`db.push` is enabled in development unless `PAYLOAD_DISABLE_PUSH=1` —
useful when you want to run migrations against your dev DB without Payload
auto-syncing on the side.

### API routes — `app/api/`

Roughly grouped:

- **public read**: `health`, `search`, `search/spellcheck`,
  `search/archive-date`, `archive/day`, `staff/[slug]`, `weather`,
  `logos/file`, `section-layout`
- **public write**: `submit`, `push/register`
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
| Android | [`mobile/android/`](../mobile/android/) |
| iOS | [`mobile/ios/`](../mobile/ios/), [`.github/workflows/ios-build.yml`](../.github/workflows/ios-build.yml) |
