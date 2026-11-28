# Opinion pages

## The Opinion page

`/opinion` is `components/Opinion/OpinionSectionPage.tsx`, rendered by the
`opinion` branch of `app/(frontend)/[section]/page.tsx` (which reads the
Opinion Layout and adds the header and footer). Top to bottom:

| Part | What it shows |
| --- | --- |
| Heading | Screen-reader-only "Opinion" `<h1>`; the header's section nav marks the page, as on News and Features |
| The columns | Computers: three equal columns, 48px apart with a thin rule down the middle of each gap, on the same grid as the groups below (`OPINION_GRID`, `RULE_AFTER`), so every column is the same width and the rules line up from top to bottom. Two story slots per column (`OPINION_COLUMN_SLOTS`; editors can add more; three until 2026-11-27, when the author spotlight began showing each columnist's latest piece). Column 1: the lead (with its photo), one more, then the guest-writer box. Column 2: a story, the author spotlight carousel, a second (with its photo). Column 3: its two stories (the second with its photo), then Opinion’s Choice closing the column (three picks, `components/Opinion/EditorsChoice.tsx`; each is its headline and byline, unnumbered since the picks are equal, and undated). How it's set off is the editors' choice in the Opinion Layout editor (`editorsChoiceStyle` in the layout JSON): a 1px frame with the label set into its top edge (`keyline`, the default), the label over a 2px rule as the group titles are (`rule`), or a red label and a vertical rule down the left of the picks (`margin`). Nothing above it in the column is a rule, so it never stacks under the header's. Column 3 must always show a photo: at least one of its slots has IMG on (the editor won't switch off the last one, `validateOpinionLayout` rejects a layout without one, and a layout read without one gets its last slot's switched on), and Activate is refused if its only IMG slots are pinned to stories without a featured image. Automatic slots follow the default order below. Every slot is pinned in the Opinion Layout editor or filled by the default order below; each slot's photo is switched on or off there. Tablets (768–1023px): two columns and no author spotlight (2026-11-28). The same stories, the guest-writer box and Opinion’s Choice are placed by `components/Opinion/TabletOpinionColumns.tsx`, which measures them and tries every arrangement: stories keep their order (the newest at top left); the two boxes go anywhere but the top of a column. It keeps the one where no two story photos and no two boxes sit side by side and the columns end together, stretching or shrinking the photos (16:9 to 4:5) and the guest-writer box (2.4:1 to 1.4:1) to square them off; then the fewest stories out of reading order and the least change to the photos. Phones: one column, photos edge to edge |
| Squared off | On computers the three columns end on one line: `BalanceColumns` stretches or shrinks each column's photo between 16:9 and 4:5 (at its focal point), drops the summaries from a column that's still far too long, and spreads a small leftover through the shorter columns. See [`fit-text.md`](fit-text.md#three-or-more-columns-opinion) |
| Author spotlight | `components/Opinion/AuthorSpotlightCarousel.tsx`, between rules, a fixed 240px tall inside them (`SPOTLIGHT_HEIGHT`, so `BalanceColumns` can square off column 2). One columnist at a time, on top: their headshot (60px, or initials on a grey gradient), then name and major on one line (`detail`, cut off with an ellipsis rather than wrapping); then their latest piece, the largest type in it, set as the Opinion cards' headlines (up to three lines). The whole slide links to the piece. Below it, a strip of the authors' faces is the page indicator and the way to jump between them: all in full colour (the others are not dimmed or greyed, 2026-11-28), the current one ringed, its ring drawn round over the five seconds it's shown. It changes author every five seconds. Each change is a full slide (Web Animations API, 600ms): the piece on show leaves across the whole width as the next comes in from the side the reader moved toward (from the right for the rotation, wrap included); readers who prefer reduced motion get a short crossfade and no rotation. There is no pause button and there are no arrows, on purpose (2026-11-27): hovering or focus inside it stop the rotation, the ring resumes where it stopped, and swipe, ←/→ and the faces change author by hand. On computers a two-finger trackpad swipe sideways while hovering does too: one author per swipe, its momentum ignored but a new swipe on top of it counted (the movement picking up again, or turning round), mostly vertical movement left to scroll the page, and the browser's swipe-back held off over the carousel. Screen readers hear those changes but not the rotation. The editor's pinned authors, else the eight who wrote the most of the recent opinion pieces (`buildOpinionSpotlights`) |
| Cards | The opinion type in red ("Staff Editorial", "Column", from the kicker), the headline, byline and date ("Nov 14, 2026"), and the summary in the site-wide summary style ([`summaries.md`](summaries.md)) |
| Editorials, Opinions, Other | Below the columns, set off by white space (no divider since 2026-11-27; their titles carry rules): three groups side by side on computers (one under another below that), each titled as on Features (the title links to its full list, with a chevron, over a rule). Each leads with the newest story of its types that has a photo (shown with it), then lists the two newest of the rest without photos (three stories in all; tablets list four beside the lead, five in all) (`pickGroupStories` in `components/Opinion/opinionGroups.ts`), so the lead can be older than the stories under it; none of them already on the page. Tablets put the first beside the list. A group with nothing left is left out |
| Looking for an article? | `components/SectionSearchPrompt.tsx`: search limited to Opinion and "Contact Opinion" (edop@). No archive link: Opinion has no single archive, and each group title links to its own list |

### Default order and pins

The columns fill newest first along a snake, row by row with the direction
alternating (`snakeOrder` and `planOpinionColumns` in `lib/opinionLayout.ts`):

```
   Left    Middle   Right
   1 ▣  |  2     |  3        row 1, left to right
   6    |  5 ▣   |  4 ▣      row 2, right to left
   ▣ = photo slot (IMG on; the defaults shown)
```

Each story goes into the next free slot along the snake that takes it: a photo
slot takes only a story with a photo. So when the newest story has no photo it
skips the lead and goes to the top of the middle column, the newest story with
a photo takes the lead, and the rest carry on along the snake. A story without
a photo that only photo slots are left for goes to the groups below instead.
Photo slots nothing with a photo could fill take any stories left. Phones and
tablets show the column stories in the same snake order, so they read newest
first.

Editors override the default by pinning: a pinned slot keeps its story and the
default flows around it. In the Opinion Layout editor each automatic slot says
what the default will put there ("Auto: …"), so editors only pin where they
disagree. A column pin lapses once its story is more than two weeks
(`OPINION_PIN_STALE_DAYS` = 14) older than the newest opinion story, measured
from the newest story rather than today so pins don't all lapse over a break
(Features does the same with 42 days). The page then uses the default for that
slot, and the editor marks the pin "Expired" and names the story the page uses.
Opinion's Choice picks don't lapse.

Every story appears once on the page: the groups skip anything in the
columns or Opinion’s Choice (the page fetches 20 per group, so there's a photo story and four more left).
Which types go in which group is `components/Opinion/opinionGroups.ts`.

The public section page builds its author spotlights on the server. Only the
explicit public projection from `lib/opinionArticles.ts` (`SpotlightAuthor` in
`components/Opinion/spotlight.tsx`: id, name, headshot URL, major, latest piece)
is passed to the client;
populated Payload user documents must never be passed through as component props.
The same module defines the card selection, including guest bylines.

## Layouts and permissions

`lib/opinionLayout.ts` validates new writes and normalizes legacy or malformed
reads. Columns retain empty slots, image settings, and their configured length.
The columns start with two slots each (`version: 3`, 2026-11-27). Older
layouts are brought down when read, and the next save stores `version: 3`,
after which slots an editor adds are kept:

Automatic slots without a photo go first (the last such each time), then
trailing automatic ones; a pinned slot is never dropped, so pins and photo
slots stay (`shrinkColumn`).

- `version: 2` (three slots each, earlier on 2026-11-27): each column drops
  one slot. A column with nothing to drop keeps its slots.
- No version (5/4/4, before that): each column comes down to two, or as near
  as its pins allow.
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
computers it sits in column 1 after its second story; on phones, after the fourth
story, before Opinion’s Choice; on tablets, wherever the two-column
arrangement puts it (never beside Opinion’s Choice).

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
edits during save, the carousel's hover and focus pauses, its full-width slide, and changing
author by keyboard and by the face strip. Unit tests
cover permissions, public projections, layout validation, filling, attribution,
classification, pagination, and the authenticated editorial APIs.
