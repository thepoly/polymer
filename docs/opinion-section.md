# Opinion pages

The public section page builds its author spotlights on the server. Only the
explicit public projection from `lib/opinionArticles.ts` is passed to the client;
populated Payload user documents must never be passed through as component props.
The same module defines the card selection, including guest bylines.

## Layouts and permissions

`lib/opinionLayout.ts` validates new writes and normalizes legacy or malformed
reads. Columns retain empty slots, image settings, and their configured length.
Each column has at most 20 slots; editors can choose at most three editor picks
and 16 spotlight authors. Missing or unpublished pins fall back to automatic
articles without moving other pins. Image settings apply on mobile and desktop.

Admins, editors-in-chief, and editors assigned to Opinion can change the layout.
Only admins can delete it. Anonymous submission creation is disabled on the
Payload collection; the public form uses `/api/submit`, which explicitly creates
the submission after applying its intake safeguards.

The layout editor uses authenticated `/api/opinion/articles` and
`/api/opinion/staff` endpoints. These expose narrow projections, support archive
search, and resolve old pins separately from recent search results. Native slot
menus provide keyboard placement alongside dragging. The save response only
marks the submitted revision saved, preserving edits made during the request.

## Deployment

Run `20261117_000000_opinion_layout_singleton` through the normal Payload migration
process **before starting the updated application**. The production SQL migration
script contains the equivalent idempotent operation.

The migration keeps the newest existing layout (the previous default selection)
under the fixed name `Opinion Layout`, renames other documents to
`Archived Opinion Layout #<id>`, and adds a unique name index. Archived content is
retained. New creates always use the fixed name, and update access targets that
name, so simultaneous creates cannot establish competing active layouts. The
editor retries the lookup when another request creates it first. Rollback removes
the index and retains the names and archived content.

The migration was not executed against a database during this cleanup: the local
Docker database service was unavailable. Verify it on staging before deployment.

## Archives and validation

Category lists use ten-record server pages with stable date/ID ordering and
`?page=N` links. Canonical URLs include the page number, and out-of-range pages
return 404. The shared card selection preserves guest authors.

Run:

```sh
pnpm typecheck
pnpm test:unit
pnpm test:opinion-ui
```

The isolated browser suite uses mocked HTTP responses and actual editor/carousel
components. It requires Playwright Chromium, or `PLAYWRIGHT_CHANNEL=msedge` to use
an installed Edge browser. It does not require a database or a running Next app.

## Local seed data

`pnpm db:seed:opinion` ([`scripts/seed-opinion.ts`](../scripts/seed-opinion.ts))
adds six placeholder columnists (`columnist1@dev.local` to `columnist6@dev.local`,
password `devpassword`, no headshots) and 34 opinion articles over the last seven
weeks, covering every opinion type. Each category archive gets more than ten
stories, so `?page=2` has content. When no `Opinion Layout` exists, it creates one
with the first slot of each column pinned, three Opinion’s Choice picks and the
columnists in the spotlight. An existing layout is left alone. Re-running is
idempotent (columnists by email, articles by slug). Run `pnpm db:seed` first.

> **Never** run this against production: it creates placeholder users and
> articles.
It covers old pins, remote search, keyboard placement, automatic image settings,
edits during save, carousel focus behavior, and pause/resume controls. Unit tests
cover permissions, public projections, layout validation, filling, attribution,
classification, pagination, and the authenticated editorial APIs.
