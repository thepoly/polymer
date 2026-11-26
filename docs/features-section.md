# Features section

`/features` is `components/Features/FeaturesFront.tsx`, rendered by
`app/(frontend)/[section]/page.tsx` (which adds the header and footer and
reads the editor's pins). Which story goes where is decided by
`planFeaturesFront` in `lib/featuresFront.ts`, a pure function covered by
`tests/lib/featuresFront.test.ts`. Top to bottom:

| Part | What it shows |
| --- | --- |
| The top | Three columns with thin rules between them. Middle: the cover (the pinned cover while it's fresh and has a photo, otherwise the newest story with one): its photo, loaded first at high priority, then its section, headline, summary and byline, centred. Left: the two newest stories after it with photos, each photo above its headline. Right: the next four newest, listed with small square photos and bylines without dates, with the pitch between the third and fourth: "Have a suggestion?" and "Tell Features about it →" (it asks for tips about events and places, not finished stories), centred, the box growing so the right column ends level with the left, opening an email to features@ with the subject "Suggestion for Features". The pitch sits on a pinned photo in the Get involved page's style (the photo stays put as the page scrolls past): the editor's Pitch photo, else the newest photo story's photo; with no photo at all it's the two lines on their own. Tablets: the cover across the page, the left two side by side with their photos, the pitch as a 150px bar across the whole screen (edge to edge, past the page margins), then the right column's first two side by side with their photos. Phones: the cover, then the left two as a list, then the pitch. The right-column stories a width leaves out (two on tablets, all four on phones) go to their sections there: the page plans each width with its own `topRight` (4, `TOP_RIGHT_TABLET` = 2, 0) and renders a copy of the sections per distinct plan, shown only at its widths. |
| Campus Life | A row of up to three cards (a list with thumbnails on phones) |
| Arts & Culture | The lead's photo (3:2, on the right) beside its headline, then up to three more stories underneath as photo cards |
| People | A row of up to three cards |
| Photo Short Stories | A film reel of a photo story's photos (`components/Features/PhotoReel.tsx`), the next two listed under it |
| Looking for an article? | `components/SectionSearchPrompt.tsx`: search, "Browse all Features" (the unfiltered archive) and contact |

Every story appears once on the page. The page follows the
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
- Stories are claimed in order: cover, reel, the top's left and right
  columns, Campus Life, Arts & Culture, People. The top takes the newest
  stories left from any section (seven with the cover on computers, about
  half a year's Features; five on tablets, three on phones), so the sections
  below show the next ones in their department.
  A section lead an editor pinned (and that's still fresh) is kept out of
  the top for its section.
- Arts & Culture needs a lead with a photo; without one, it falls back to a
  row of cards.
- The reel leads with the pinned photo story if it has at least three
  photos, otherwise the newest that does.
- No cover (no story in the window has a photo) means no top on the page,
  so the top claims nothing and those stories stay in their sections.

The page makes three article queries: the newest story (the anchor), the
year's window together with any pinned stories (up to 80, with authors and
photos trimmed by `populate`), and the bodies of up to four candidate photo
stories for the reel.

## One page, three widths

The top's right column lists four stories on computers, two on tablets and
none on phones, and the stories a width leaves out go to their sections. So
the sections can hold different stories at each width (on the local data
Campus Life starts with a different story on a phone than on a computer),
and even a different Arts & Culture lead. The page is rendered on the
server, which doesn't know the screen's width, so FeaturesFront plans each
width (`planFeaturesFront` with `topRight` 4, `TOP_RIGHT_TABLET` and 0)
and renders one copy of the sections per distinct plan, hidden by CSS at
the other widths (`md:hidden`, `max-md:hidden lg:hidden`, `max-lg:hidden`).
Widths whose plans match share a copy, and heading ids get a `-phone` or
`-tablet` suffix so they stay unique.

Decided 2026-11-25 to keep this. Measured on the local page: each copy is
about 28 KB of HTML, so up to about 56 KB extra before compression; photos
in hidden copies aren't downloaded (0 of 20 at 390px and 1280px); screen
readers skip the hidden copies. The cost is the extra HTML and crawlers
seeing each section's links up to three times. Rejected: one copy with
per-story visibility (the moved stories go to the front of a section and
can change the Arts lead and the row's column count, so the CSS gets
fragile); guessing the device on the server (unreliable, and breaks
caching); laying out in the browser after measuring (content jumps, weaker
for search); dropping the per-width split (undoes the phone and tablet
tops).

## The editor's pins

The Features Layout editor (`components/Dashboard/FeaturesLayoutEditor`)
has five story slots and a Pitch photo slot, each with its fallback written under it:

| Slot | Takes |
| --- | --- |
| Cover story | Any Features story with a featured image |
| Arts & Culture lead | An Arts & Culture story with a featured image |
| Campus Life lead, People lead | A story in that section (it goes first in the row) |
| Photo Short Story | A photo story; it needs at least three photos in its body |
| Pitch photo | Not a pin: drop any story with a featured image to put its photo behind the pitch. Without one, the page uses the newest photo story's photo. |

With a Pitch photo picked, **Pitch photo position** appears under it: the
real Features page framed at phone, tablet and computer size, each scrolled
to the pitch box, with the same drag, zoom and reset as the Get Involved
photo and the Senate / E-Board panel photo (`components/admin/PinnedPhotoPreview.tsx`,
shared with the Get Involved field). Each screen is set separately; one
that hasn't been moved uses the photo's focal point, not zoomed, and Reset
goes back to that. Picking a different photo clears the positions. The
page reads them as CSS variables (`pitchPositionVars`, `--pitch-pos-m/t/d`
and `--pitch-zoom-m/t/d`), so the previews update without reloading. The
fallback photo (no Pitch photo picked) always uses its focal point.

A story dropped in the wrong slot is refused with the reason. A slot whose
pin has gone stale says so ("Stale, the page is using the newest story
instead"). A saved pin the slot no longer takes (an Arts & Culture lead
without a featured image, pinned before leads needed one) says why, and
that the page is using the newest story. A Pitch photo since deleted from
Media shows as deleted, with × to clear it; the page falls back to the
newest photo story's photo. The pool can be filtered by section.

The pins are stored in `features-page-layout.layout`, a JSON field, as the
v3 layout (`pitch` is a media id, the pitch's photo, and `pitchPositions` its focus point and zoom per screen, `null` for the focal point; the rest are story ids):

```json
{
  "version": 3, "cover": 12, "leads": { "campus": 3, "arts": null, "people": 7 }, "reel": 40, "pitch": 25,
  "pitchPositions": { "mobile": { "x": 60, "y": 50, "zoom": 1.2 }, "tablet": null, "desktop": null }
}
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

On a Features story in the admin, a read-only note under the kicker says
which section the kicker puts it in, warns when there's no featured image
(or, for a photo story, that it needs one to appear in the reel), and says
whether a photo story has enough photos in its body to lead the reel,
counting each photo once as the page does
(`components/admin/FeaturesPlacementHint.tsx`, a `ui` field on Articles, so
no column and no migration).

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
of the screen. Swipe on phones and tablets; on desktop the rail scrolls
with a trackpad, Shift+wheel, or the arrow keys (the rail takes focus).
There's no photo counter; wide phones (640–767px) get arrow buttons, and
the title card's label gives the photo count. On tablets the two
stories under the reel put their photos on top, so the two cards match.
Its title card is centred top to bottom on the photos, and the headline is
the link to the story. The section title opens the archive filtered to
Photo Short Stories.
