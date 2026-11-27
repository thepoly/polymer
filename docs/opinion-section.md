# Opinion pages

## The Opinion page

`/opinion` is `components/Opinion/OpinionSectionPage.tsx`, rendered by the
`opinion` branch of `app/(frontend)/[section]/page.tsx` (which reads the
Opinion Layout and adds the header and footer). Top to bottom:

| Part | What it shows |
| --- | --- |
| Heading | Screen-reader-only "Opinion" `<h1>`; the header's section nav marks the page, as on News and Features |
| The columns | Computers: three columns with thin rules between them. Column 1: the lead (with its photo), two more, the guest-writer box, the rest. Column 2: a story, the author spotlight carousel, the rest. Column 3: Opinion’s Choice (three numbered picks), then its stories. Every slot is pinned in the Opinion Layout editor or fills with the newest story not already shown; each slot's photo is switched on or off there. Tablets (768–1023px): the same stories in phone order, in two columns that fill top to bottom (so photos leave no gaps), with the guest-writer box beside Opinion’s Choice. Phones: one column, photos edge to edge |
| Cards | The opinion type in red ("Staff Editorial", "Column", from the kicker) in the Features kicker style (12px, semibold, wide tracking), the headline in regular-weight serif, byline and date ("Nov 14, 2026"), and the summary in muted serif (three lines), as on News and Features. Consecutive stories in a column are split by a hairline, so a run without photos still reads as separate pieces; tablets keep plain space, since a rule could land at the top of a flowing column |
| Lead | Column 1's first slot is the page's lead: a 30–38px headline and the full summary, with its photo when the slot's image is on. Most opinion pieces have no photo, so the headline size, not a picture, is the entry point. Phones and tablets set it across the page; on tablets the next story sits beside the author carousel |
| Editorials, Opinions, Other | Under the rainbow divider: three groups side by side on computers (one under another below that), each titled as on Features (the title links to its full list, with a chevron, over a rule). Each shows the four newest stories of its types that aren't already on the page: the first with its photo, the next three listed with small photos. Tablets put the first beside the list. A group with nothing left is left out |
| Looking for an article? | `components/SectionSearchPrompt.tsx`: search limited to Opinion and "Contact Opinion" (edop@). No archive link: Opinion has no single archive, and each group title links to its own list |

Every story appears once on the page: the groups skip anything in the
columns or Opinion’s Choice (the page fetches 20 per group so four are left).
Which types go in which group is `components/Opinion/opinionGroups.ts`.

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

## Guest-writer box

"Have an opinion? Submit an op-ed →" links to `/submit`. It's the Features
pitch box (`components/PhotoPitch.tsx`): a window onto a photo pinned to the
screen, the two lines centred on a dark tint, the photographer's credit in the
corner. The wording is short so it can use the box's `large` type (14px label,
28px link line; Features keeps 12px and 22px for its longer invitation). On
computers it sits in column 1 after the third slot; on phones, after the sixth
story, before Opinion’s Choice; on tablets, beside Opinion’s Choice, as tall
as it.

The page has no visible title: the stories start under the header, whose
section nav already marks Opinion, as on Features. The `<h1>` is still there
for screen readers (`sr-only`). The Submit · Contact links that sat beside the
old title are gone too.

The photo is the editor's pick: in the Opinion Layout editor, drop any story
with a featured image on the **Guest writer photo** slot (in column 1, where
the box goes) to use its photo; the story stays where it is. Without a pick,
or if the picked photo has been deleted from Media, the page uses the newest
opinion story's photo at its focal point; with no photo at all it's the two
lines between rules.

With a photo picked, **Guest writer photo position** appears under the
columns: the real Opinion page framed at phone, tablet and computer size,
scrolled to the box, with the same drag, zoom and reset as the Features pitch
photo (`components/admin/PitchPositionsEditor.tsx`). Each screen is set
separately; Reset goes back to the photo's focal point, and picking a
different photo clears the positions. Activate saves them.

Both are stored in the layout JSON, so there's no migration: `pitch` (a media
id) and `pitchPositions` (`{ mobile, tablet, desktop }`, each `{ x, y, zoom }`
or `null`). `validateOpinionLayout` rejects anything else, and
`normalizeOpinionLayout` clamps what it reads. `/api/opinion/articles` returns
each story's photo id, size and focal point for the slot.

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
