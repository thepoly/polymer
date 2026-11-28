# Summaries

One convention for every story summary (the subdeck, `excerpt` on cards) on
the public site: the home page, the section pages, list pages, search, the
archive, recommendations and the article header.

| Rule | Spec |
|---|---|
| Look | `SUMMARY_CLASS` from [`components/summaryClass.ts`](../components/summaryClass.ts): Raleway (`font-meta`), regular weight, in ink (`text-text-main`, so the theme global and dark mode apply). Never serif, never muted grey, never medium weight. |
| Per card | A card adds only its size, leading, spacing and line clamp to `SUMMARY_CLASS`. |
| Exception | The photofeature hero's subdeck sits on the photo, so it stays white (`components/Article/Photofeature/ArticleHeader.tsx`). |

Until 2026-11-27 the site had four looks: Raleway regular in ink (home
page), Raleway medium in ink (News), Raleway regular in grey (article header,
lists, archive) and Minion serif in grey (Features, Opinion and Sports
fronts). Those are now one.

## Sizes

Raleway runs much larger than Minion at the same pixel size, so the former
serif summaries moved down to News's sizes rather than keeping theirs.

| Context | Size |
|---|---|
| Article header subdeck | 20px, 24px from `md` |
| Leads and large cards (Features cover and lead, Sports lead, News secondary, recommendations) | 15–17px |
| Section-page cards (News, Opinion, Student Government) | 15px |
| Lists, archive, Sports headlines column | 13–14px |
| Home page cards, search results | 12–15px, set by each home layout |
