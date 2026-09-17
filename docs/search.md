# Search

How `/api/search`, the archive endpoints, and the search UI fit together.

## Two corpora, one endpoint

`GET /api/search` ([`app/api/search/route.ts`](../app/api/search/route.ts))
unions two sources:

1. **Current content** — Payload `articles` queried via `getPayload`. Only
   published rows are visible to anonymous callers (`access.read`).
2. **Legacy archive** — the read-only Wagtail-era Postgres referenced by
   `LEGACY_DATABASE_URI`. Helpers live in
   [`lib/archive.ts`](../lib/archive.ts) and
   [`lib/payloadArchive.ts`](../lib/payloadArchive.ts).

If `LEGACY_DATABASE_URI` is unset, the legacy half of the query becomes
an empty result set; the current-content half still works.

## Query forms

`/api/search` expands the user query into multiple separator forms so
hyphen/space variants match each other. From `route.ts`:

```
"anti-discrimination"  →  ["anti-discrimination",
                           "anti discrimination",
                           "antidiscrimination"]
```

Implemented in `queryForms` (top of `route.ts`). The expansion runs
against both corpora.

## Streaming results

The search UI ([`components/SearchOverlay.tsx`](../components/SearchOverlay.tsx))
calls `/api/search?...&stream=1`, which returns NDJSON — one JSON object
per line — instead of a single response:

1. A count from the **headline pass** (`plainTitle`, `subdeck`, `kicker`,
   `writeInAuthors.name`). Those short columns scan in ~0.3s where the
   body scan takes seconds.
2. Batches of those headline matches (`STREAM_BATCH` at a time), each
   with the page `order` so far, so rows render as they arrive.
3. The **full page** once the body scan lands: `order` for the whole
   page (newest first, body mentions included), the articles the client
   doesn't have yet, `totalResults`, `totalPages` and `done: true`.

Later matches displace earlier ones in the list, and the count climbs as
each batch lands. The client keeps articles by id and renders whatever
`order` says, so a re-order costs no extra requests.

`X-Accel-Buffering: no` is required on the response — without it nginx
buffers the whole stream and it arrives as one chunk. Next flushes each
chunk through its gzip middleware on its own.

Without `stream=1` the endpoint returns the plain JSON page it always
did (used by the 404 page's search box and the spellcheck retry).

## Filters

`section`, `range` (`any`/`week`/`month`/`year`) and `sort`
(`newest`/`oldest`) narrow the query; they're parsed by
`parseSearchFilters` in [`utils/search.ts`](../utils/search.ts), kept in
the `/search` URL, and ignored when unrecognized.

## Sanitization & limits

[`utils/search.ts`](../utils/search.ts) provides:

- `sanitizeSearchQuery(q)` — strips control characters, collapses
  whitespace, trims to a max length so a hostile query can't blow up
  Postgres LIKE planning
- `parseSearchPage(p)` and `parseSearchPageSize(s)` — bound the
  pagination params (default page size is `DEFAULT_SEARCH_PAGE_SIZE`)

## Rate limiting

`route.ts` calls `checkRateLimit` from
[`utils/rateLimit.ts`](../utils/rateLimit.ts) with:

- `SEARCH_RATE_LIMIT = 80`
- `SEARCH_RATE_LIMIT_WINDOW_MS = 10_000`

That's 80 requests per 10s per client IP, in-memory per process. It's a
best-effort limit, not a security boundary — abuse traffic should be
filtered upstream (CDN/WAF) for anything serious.

The rate limit has a dedicated test in
[`tests/search-limit.spec.ts`](../tests/search-limit.spec.ts) — run it
with `pnpm test:search-limit`.

## Spellcheck

`GET /api/search/spellcheck` returns suggested corrections for a query
that returned no results. The implementation is intentionally narrow:
small dictionary, no external service.

## Archive browsing

- `GET /api/archive/day` — index entries for a specific day in the
  legacy archive. Driven by `lib/archiveDateQuery.ts`.
- `GET /api/search/archive-date` — date-bounded archive search.

Frontend routes:

- `/archive` and `/archives` — landing pages
- The search overlay (`components/SearchOverlay.tsx`) is the primary
  entry point for users; search lives in the global header.

## Frontend integration

- [`components/SearchInput.tsx`](../components/SearchInput.tsx) — the
  inline input
- [`components/SearchOverlay.tsx`](../components/SearchOverlay.tsx) — the
  full-screen overlay on `/`
- `app/(frontend)/search/` — the dedicated search results page

## Adding a new searchable field

1. Add the field to the relevant collection (`articles` is the usual one).
2. Update the `where` clause in `app/api/search/route.ts` to include the
   field in the OR group, and any expansion in `queryForms` if the field
   is text with separators.
3. If the field needs to surface in results, extend
   `formatArticle` ([`utils/formatArticle.ts`](../utils/formatArticle.ts))
   and the result type in `components/FrontPage/types.ts`.
4. If the field exists in the legacy archive too, mirror the change in
   `lib/archive.ts` / `lib/payloadArchive.ts`.

## Performance notes

- The Postgres adapter uses ILIKE-style queries via Payload's
  `like`/`contains` operators. There's no FTS index today; if search
  latency becomes a problem we'd add `tsvector` columns and update the
  query layer in `route.ts` rather than swapping the search engine.
- The endpoint is `dynamic = "force-dynamic"`-friendly — Next won't try
  to statically prerender it.
