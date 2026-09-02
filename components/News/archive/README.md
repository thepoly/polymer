# Archived news page

`NewsSectionPage.tsx` and `newsGroups.ts` in this folder are the previous `/news`
section page, archived in September 2026. Nothing imports them — they are kept so
the old layout can be read or restored.

## Why it was retired

The old page could render as an empty shell:

- `app/(frontend)/[section]/page.tsx` only queried news published in the last 8
  weeks. Over breaks that window is empty, the route fell through to its
  placeholder, and `/news` showed nothing but the masthead and the word "NEWS".
- Even with articles in the window, every column was filtered by an exact kicker
  (`Student Senate`, `Executive Board`, `Campus Infrastructure`, `Press Release`,
  `Interview`, `Town Hall`, `GM Week 2026`). Articles carrying any other kicker
  landed in no column, so the three-column grid could come up blank while
  published news existed.

The replacement copies the Features page layout, which fills every slot from a
pool of recent articles (kickers only bias placement), so the page is populated
whenever any news article exists.

## Restoring it

1. `git mv components/News/archive/NewsSectionPage.tsx components/News/` and the
   same for `newsGroups.ts`, then drop the archive banner at the top of the file.
2. In `app/(frontend)/[section]/page.tsx`, pass `pinnedArticle` (single article)
   and `groupedArticles` (keyed by `newsGroups`) instead of the current
   `pinnedArticles` / `hasOlderArticles` props. The commit that introduced the
   new page has the removed data-fetching code.
