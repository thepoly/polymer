# Features section

`/features` follows the layout language of `/sports` and `/news`: a lead story,
a two-to-one row with a module only this section has, wide strips, then a row of
photo cards. Features runs two or three stories a month during the semester and
almost nothing over the summer, so the page is built to look right without
weekly attention: every slot can be pinned, and every slot fills itself when it
isn't.

Everything here is edited in the admin under **Features Layout** and shows on
the site within about a minute (the page revalidates every 60 seconds). No
code change or deploy is needed.

## The page

| Part | What it shows | Where it comes from |
| --- | --- | --- |
| Cover | The photo across the page (2.35:1 on desktop, 4:5 on phones, cropped at the photo's focal point), with the kicker, headline, dek and byline in a box over its lower left corner | Pinned in the editor, else the newest Features story with a photo |
| Second story | A portrait photo beside the headline, dek and byline | Pinned, else the next newest |
| The Lens | One photo, with the photographer named at byline size and linked to their staff page, the caption, and a link to the story it's from | A set of photos editors pick; one shows each day, in turn. See below |
| Strips | Two full-width rows: headline and dek, photo on the right | Pinned, else the next newest |
| Photo Stories | Three photo cards with the number of photos in each story | Pinned (with a choice of which photo the card shows), else the newest photo-led stories |
| From the Archive | The Sports carousel of photo cards, ending in a link to `/features/archive` | The next twelve stories, newest first |
| Missed something? | Section search, archive and contact | `components/SectionSearchPrompt.tsx` |

Code: `components/Features/FeaturesSectionPage.tsx` (page),
`lib/featuresPage.ts` (resolves the layout into stories),
`lib/featuresLayout.ts` (the stored layout's shape, shared with the editor),
`components/Dashboard/FeaturesLayoutEditor/` (the editor).

## Rules that keep the page from going stale

- **Pins expire on their own.** A pinned story stays until an editor changes
  it, unless it is more than six weeks (`PIN_STALE_DAYS`) older than the
  newest Features story. Then the slot fills automatically, as if empty.
- **The Lens rotates.** One photo of the editors' set shows each day (changing
  at midnight in Troy), so six to ten photos last weeks. If the set is empty,
  or every photo in it was added more than two months ago (`LENS_STALE_DAYS`),
  The Lens shows recent credited photos from any section instead. Stale picks
  still show if there is nothing newer.
- **Photo Stories only fill with photo-led stories.** A story counts when its
  kicker contains "Photo", it is a photo feature, or its body has a photo
  gallery or carousel. When too few qualify, the row shows fewer cards (or
  none) rather than mislabel a story. Pinned stories always show.
- **Nothing is labeled "this week".** Dates show the month and day, with the
  year once it isn't this year.

## The stored layout

`features-page-layout.layout` is JSON (no schema migration is involved):

```ts
{
  version: 2,
  cover: [id | null],
  second: [id | null],
  strips: [id | null, id | null],
  photoStories: [id | null, id | null, id | null],
  photoStoryImages: [url | null, url | null, url | null],
  lens: [{ url, caption, articleTitle, articleUrl, photographerName, photographerUrl, addedAt }],
}
```

Layouts saved by the old three-column editor are read with
`normalizeFeaturesLayout`: the hero and sub-features become the cover, second
story and strips, the Photo Spotlight becomes The Lens, and the spotlight
stories become Photo Stories. The On Campus, Latest and Arts pins are dropped.
The first save in the new editor writes the new shape.
