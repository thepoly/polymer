# Features section

`/features` is `components/Features/FeaturesFront.tsx`, rendered by
`app/(frontend)/[section]/page.tsx` (which adds the header and footer and
reads the editor's pins). Which story goes where is decided by
`planFeaturesFront` in `lib/featuresFront.ts`, a pure function covered by
`tests/lib/featuresFront.test.ts`. Top to bottom:

| Part | What it shows |
| --- | --- |
| Cover | The pinned cover while it's fresh and has a photo; otherwise the newest story with one. Its photo is pinned behind the headline (`components/PhotoWindow.tsx`), loaded first at high priority. |
| Latest | The four newest stories after the cover, from any section, so the page opens with the five newest. The lead's photo (3:2, on the right) beside its headline; the next three in a row underneath, each with its photo above its title. No visible heading (only one for screen readers). |
| Campus Life | A row of up to three cards (a list with thumbnails on phones) |
| Arts & Culture | A row of up to three cards |
| People | Like Campus Life with the photo on the left, and up to two more stories |
| Photo Short Stories | A film reel of a photo story's photos (`components/Features/PhotoReel.tsx`), the next two listed under it |
| Looking for an article? | `components/SectionSearchPrompt.tsx`: search, "Browse all Features" (the unfiltered archive), contact, and a line inviting pitches |

Every story appears once on the page. Only the cover's photo is pinned to
the screen; every other photo scrolls with the page. The page follows the
site theme (white in light mode, dark in dark mode). On phones each section
shows three stories in all; its title links to the rest.

## How the page fills itself

Features publishes about 16 stories a year, two or three a month in term
and almost none over breaks, so every slot fills itself and every pin gives
way when it goes stale. All windows are measured from the newest Features
story (the anchor), not from today, so the page doesn't empty over the
summer:

- A section shows stories from the 365 days before the newest story
  (`SECTION_WINDOW_DAYS`); nothing older appears outside the archive.
- A pin holds while its story is within 42 days (six weeks) of the newest
  story (`PIN_STALE_DAYS`). The reel's pin holds for the whole year.
- A section needs at least two stories in its window (`MIN_SECTION_STORIES`)
  or it's left out; the others keep their layouts.
- Stories are claimed in order: cover, reel, Latest, Campus Life, Arts &
  Culture, People. Latest takes the newest stories left from any section,
  so the sections below it show the next ones in their department. A
  section lead an editor pinned (and that's still fresh) is kept out of
  Latest for its section.
- Latest and People need a lead with a photo; without one, they fall back
  to a row of cards.
- The reel leads with the pinned photo story if it has at least three
  photos, otherwise the newest that does.

The page makes three article queries: the newest story (the anchor), the
year's window together with any pinned stories (up to 80, with authors and
photos trimmed by `populate`), and the bodies of up to four candidate photo
stories for the reel.

## The editor's pins

The Features Layout editor (`components/Dashboard/FeaturesLayoutEditor`)
has five slots, each with its fallback written under it:

| Slot | Takes |
| --- | --- |
| Cover story | Any Features story with a featured image |
| People lead | A People story with a featured image |
| Campus Life lead, Arts & Culture lead | A story in that section (it goes first in the row) |
| Photo Short Story | A photo story; it needs at least three photos in its body |

A story dropped in the wrong slot is refused with the reason. A slot whose
pin has gone stale says so ("Stale, the page is using the newest story
instead"). The pool can be filtered by section.

The pins are stored in `features-page-layout.layout`, a JSON field, as the
v3 layout:

```json
{ "version": 3, "cover": 12, "leads": { "campus": 3, "arts": null, "people": 7 }, "reel": 40 }
```

`normalizeFeaturesLayout` reads any saved shape. Older layouts (On Campus,
Featured, Latest, Photo Band, The Arts, Photo Spotlight) keep only their
first Featured slot, as the cover; the editor's next save rewrites them as
v3. Missing keys, `null`s and ids of unpublished or deleted stories are
ignored. No migration is needed for any of this.

## Sections

Kickers are free text, so `departmentOf` in `lib/featuresDepartments.ts`
maps them to four sections: Campus Life, Arts & Culture, People and Photo
Short Stories. A kicker containing "photo" is always Photo Short Stories.
Each other section matches whole kickers ("EMPAC", "RCOS") and parts of
kickers ("review", "spotlight", "event"), so variants in any case or spelling
sort too. Arts & Culture is checked first, then People, then Campus Life:
"Empac Event" is Arts & Culture and "Club Spotlight" is People. A story whose
kicker matches none never appears under a section's name; it can still be
the cover. To move a kicker, edit the rules in that file (covered by
`tests/lib/featuresDepartments.test.ts`, which also lists the kickers that
are deliberately unsorted).

Each section's title (with a chevron) is a link to the archive with that
section's filter on; there are no separate "All N stories" links.

The three topic sections come from 2,799 Features stories published from
2001 to November 2026. Since 2022 about 55% are Campus Life, 16% Arts &
Culture, 13% People and 13% Photo Short Stories. Reviews were the largest
group from 2015 to 2019.

## The archive

`/features/archive` is the one list of Features stories, newest first (the
200 newest; `components/Features/FeaturesListPage.tsx`, ten to a page). When
there are more, it says so and links to the site search for older stories.
A row of filters under the title narrows it to a section: All, Campus Life,
Arts & Culture, People and Photo Short Stories, each with its count. A
filter is a link, `/features/archive?section=<key>` (`campus`, `arts`,
`people`, `photo`), so the Features page links straight to a filtered list
and a filtered list can be shared. A section with no stories gets no filter.

## Photo Short Stories

The reel shows the photos inside the story (its `photo_gallery` and
`carousel` blocks), not just the featured image; a photo story on the site
runs ten to fifteen. Each photo carries its photographer's credit
("Name/The Polytechnic", from the media item's photographer or write-in
photographer) on a fixed line under it; section lead photos get the same
credit. The rail starts at the page's left edge and runs off the right edge
of the screen. Swipe on phones; from tablet width up there are arrow
buttons, and the rail itself takes focus so the arrow keys scroll it. The
counter shows the photo count until the rail moves, then the photo number.
Its title card is centred top to bottom on the photos, and the headline is
the link to the story. The section title opens the archive filtered to
Photo Short Stories.
