# Features section

`/features`, top to bottom:

| Part | Component | Where it comes from |
| --- | --- | --- |
| Cover | `components/Features/FeaturesCover.tsx` | The editor's Featured (lead and the two under it) and right-hand pins, then the newest stories |
| Photo band | `components/Features/FeaturesPhotoBand.tsx` | `features-page-layout.layout.photoBand` (`lib/featuresPhotoBand.ts`); not shown until an editor picks one |
| Browse by section | `components/Features/FeaturesBrowse.tsx` | Every published story, sorted into sections by kicker (`lib/featuresDepartments.ts`) |
| Thin second band | same `FeaturesPhotoBand`, `thin` | A second window onto the band's photo, above the index |
| Every Features story | `components/Features/FeaturesBrowse.tsx` | The same list, filtered by section and semester in the browser |
| Missed something? | `components/SectionSearchPrompt.tsx` | Search, archive, contact |

## Sections

Kickers are free text, so `departmentOf` in `lib/featuresDepartments.ts`
maps them to four sections: Around Campus, Arts & Troy, People and Photo
Stories. A kicker containing "photo" is always Photo Stories. A story whose
kicker matches none never appears under a section's name; it still shows in
the cover and under "All" in the index. To move a kicker, edit the sets in
that file (covered by `tests/lib/featuresDepartments.test.ts`).

The section list is the Get involved desk list (`useDetailsAccordion`,
shared with `components/GetInvolved/DeskList.tsx`): one row open at a time,
the first open on load. A row shows its five newest stories, preferring
ones not already in the cover, and "All N stories" filters the index below
and scrolls to it. Sections with no stories are left out.

## The index

`lib/featuresIndex.ts` sends every published Features story once (title,
link, kicker, date, byline; no photos). The index shows ten at a time with
"Show 10 more", grouped under semester headings. Semesters are in Troy time:
August to December is Fall, January to July is Spring.

## Photo windows

Both bands are `PhotoWindow`s onto one pinned photo, so they read as one
photo behind the page. Don't put a `PhotoWindow` inside a section row: the
row's height animation clips with `overflow: hidden`, which doesn't clip a
pinned image (see `components/PhotoWindow.tsx`).

## Editor leftovers

The Features Layout editor still has the On Campus, The Arts, Photo
Spotlight, spotlight stories and wide story panels. The page no longer shows
those parts and ignores their keys in the layout JSON.
