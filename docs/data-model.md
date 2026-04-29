# Data Model

Reference for every Payload collection and global. For a step-by-step on
**adding** or **changing** schema, read [`migrations.md`](migrations.md)
first — that part is non-obvious and easy to get wrong.

## Collections

All collections are registered in [`payload.config.ts`](../payload.config.ts).
Slugs below match the URL path under `/admin/collections/<slug>`.

### `articles` — [`collections/Articles.ts`](../collections/Articles.ts)

The main news/sports/features/opinion content type.

- **Drafts**: `versions.drafts: true`, so rows can have `_status='draft'`.
- **`useAsTitle`**: `plainTitle` (a derived plaintext copy of the rich-text
  title, see migration `20260405_000000_migrate_title_to_richtext` and
  the `getPlainText` util).
- **Hooks**:
  - `beforeChange`: stamps `publishedDate` on first publish; stamps
    `lastModifiedBy` on every change; auto-derives `opinionType` from the
    kicker for opinion articles.
  - `afterChange`: emits the `article_published` PostHog event on first
    publish and triggers a breaking-news push if `breakingNews=true`.
- **Access** (see `access` block in the file):
  - `update`: `admin`, `eic` always; `editor` only for articles in their assigned section
  - `create`: `admin`, `eic`, `editor`
  - `delete`: `admin`
  - `read`: published only for anonymous; full access for any logged-in user

### `live-articles` — [`collections/LiveArticles.ts`](../collections/LiveArticles.ts)

Live-blog posts surfaced at `/live` and via the homepage `LiveStrip`.
Updates are append-only; the same `photo_gallery` and `carousel` Lexical
blocks as articles are available in the rich-text update body.

### `layout` — [`collections/Layout.ts`](../collections/Layout.ts)

The single curated homepage configuration. Drafts/versions are enabled so
editorial can stage a new front page without it going live. Includes
lead, top-4, pinned slots, layout template, sections, and volume/issue
metadata.

### Per-section page layouts

- `opinion-page-layout` — [`collections/OpinionPageLayout.ts`](../collections/OpinionPageLayout.ts)
- `features-page-layout` — [`collections/FeaturesPageLayout.ts`](../collections/FeaturesPageLayout.ts)
- `staff-page-layout` — [`collections/StaffPageLayout.ts`](../collections/StaffPageLayout.ts)

Each is the editor-curated composition for its section landing page.

### `users` — [`collections/Users.ts`](../collections/Users.ts)

Staff accounts. Auth-enabled (`maxLoginAttempts: 5`, `lockTime: 10m`).
Notable fields:

- `roles` (array of `admin | eic | editor | writer | photographer | …`)
- `section` — restricts an editor's `articles` write access to one section
- `slug` — drives `/staff/[slug]` URLs (migration `20260310_211734_add_user_slug`)
- `retired` — when set, the password is rotated to a random value to
  invalidate the account without deleting historical attribution
- `oneLiner`, `seenNewsroomNotice` — minor UX fields

Access: `admin` and `eic` can read/create/update/delete; everyone else
can only see/edit themselves.

### `media` — [`collections/Media.ts`](../collections/Media.ts)

Uploaded assets. Fields include `alt`, `title`, `caption`, `sourceUrl`,
`photographer` (relationship to `users`), and `writeInPhotographer`
(plain text fallback when the photographer isn't a staff user).

The `media` upload field inside Lexical also has a per-instance `caption`
and `credit` override (see `payload.config.ts`) so you can re-caption an
image without changing the underlying media row.

### `job-titles` — [`collections/JobTitles.ts`](../collections/JobTitles.ts)

Reusable position labels for staff profile timelines.

### `submissions` — [`collections/Submissions.ts`](../collections/Submissions.ts)

Public op-ed and letter-to-the-editor submissions. Anyone can `create`
(via the public form at `/submit`); `admin`/`eic`/`editor` can read and
update; only `admin` can delete.

### `event-submissions` — [`collections/EventSubmissions.ts`](../collections/EventSubmissions.ts)

Public event submissions for the calendar (`/api/submit-event`).

### `logos` — [`collections/Logos.ts`](../collections/Logos.ts)

Branded section/homepage assets. Served via `/api/logos/file`.

### `device-tokens` — [`collections/DeviceTokens.ts`](../collections/DeviceTokens.ts)

Registered Android FCM tokens. Schema:

- `token` (text, unique, indexed)
- `platform` (`android | ios`, default `android`)
- `lastSeenAt`
- timestamps

Access:

- `create`: anonymous (the Android client posts to `/api/push/register`)
- `read` / `delete`: `admin` only
- `update`: nobody (the registration endpoint deletes-and-re-creates if
  needed)

## Globals

Registered in `payload.config.ts` under `globals: [Theme, Seo]`.

### `theme` — [`collections/Theme.ts`](../collections/Theme.ts)

Site-wide visual configuration. A grid of color fields, typography
choices, and a header animation toggle. On change, `theme` calls
`revalidatePath('/')` so the site picks up new colors without a deploy.

### `seo` — [`collections/Seo.ts`](../collections/Seo.ts)

Default SEO metadata: site title, description, Open Graph image, Twitter
defaults, and per-section overrides (e.g. `news_more` SEO block from
migration `20260424_000000_add_news_more_seo_fields`). Versioning is
enabled, so the `_seo_v` shadow table mirrors most fields.

## Generated types

Payload writes a single TypeScript types file at
[`payload-types.ts`](../payload-types.ts). After any schema change run:

```bash
pnpm generate:types
```

CI doesn't regenerate; the file is committed.

## Custom Lexical blocks

Defined inline in `payload.config.ts` and reused by both `articles` and
`live-articles`:

- `photo_gallery` — array of `{ image, caption }` (image is a `media` upload)
- `carousel` — same shape; rendered as a swipe carousel on the frontend

The `media` upload feature also injects two extra fields on the embedded
upload reference: `caption` (per-use caption) and `credit` (per-use
photographer override).
