# Features section

`/features` is `components/Features/FeaturesFront.tsx`, rendered by
`app/(frontend)/[section]/page.tsx` (which adds the header and footer). Top
to bottom:

| Part | What it shows |
| --- | --- |
| Cover | The editor's pinned lead (the Features layout's first Featured slot) when it has a photo; otherwise the newest story with one. Its photo is pinned behind the headline (`components/PhotoWindow.tsx`). |
| Campus Life | Lead story and up to four more listed on the left, the lead's photo on the right |
| Arts & Culture | A row of up to four cards (a list with thumbnails on phones) |
| People | Like Campus Life, with the photo on the left |
| Photo Short Stories | A film reel of the newest photo story's photos (`components/Features/PhotoReel.tsx`), the next two listed under it |
| Looking for an article? | `components/SectionSearchPrompt.tsx`: search, "Browse all Features" (the unfiltered archive), contact |

Every story appears once on the page. Only the cover's photo is pinned;
every other photo scrolls with the page. The page follows the site theme
(white in light mode, dark in dark mode).

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
`tests/lib/featuresDepartments.test.ts`).

A section needs at least three stories (after the cover) to appear; one
that's short is left out. Each section's title (with a chevron) is a link to
the archive with that section's filter on; there are no separate "All N
stories" links.

The three topic sections come from 2,799 Features stories published from
2001 to November 2026. Since 2022 about 55% are Campus Life, 16% Arts &
Culture, 13% People and 13% Photo Short Stories. Reviews were the largest
group from 2015 to 2019. Features has averaged about 16 stories a year over
the two years to November 2026, so the page shows most of a year's work and
the smaller sections often show stories a few months old.

## The archive

`/features/archive` is the one list of Features stories, newest first (the
200 newest; `components/Features/FeaturesListPage.tsx`, ten to a page). A
row of filters under the title narrows it to a section: All, Campus Life,
Arts & Culture, People and Photo Short Stories, each with its count. A
filter is a link, `/features/archive?section=<key>` (`campus`, `arts`,
`people`, `photo`), so the Features page links straight to a filtered list
and a filtered list can be shared. A section with no stories gets no filter.

## Photo Short Stories

The reel shows the photos inside the story (its `photo_gallery` and
`carousel` blocks, without captions), not just the featured image; a photo
story on the site runs ten to fifteen. The story it leads with is the
newest photo story with at least three photos. The rail starts at the page's
left edge and runs off the right edge of the screen; swipe on phones, arrow
buttons on desktop. Its title card is centred top to bottom on the photos,
and the headline is the link to the story. The section title opens the
archive filtered to Photo Short Stories.

## Editor leftovers

The Features Layout editor still has the photo band, right-hand cover pins,
On Campus, The Arts, Photo Spotlight, spotlight stories and wide story
panels. The page reads only the first Featured slot (the cover) and ignores
the rest of the layout JSON.
