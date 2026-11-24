# Bylines

One convention for every byline on the public site (cards, article headers,
Sports meta lines, the photofeature hero). Red marks one thing per story, the
kicker, so bylines carry no accent colour.

| Rule | Spec |
|---|---|
| Colour | Names `text-text-main`; "By", separators and dates `BYLINE_META_CLASS` (from `components/FrontPage/Byline.tsx`). That's `text-text-muted` in light mode. In dark mode the muted token is mixed 65% toward the background, because the plain token sits only about 1.3:1 from the names. The mix keeps a 3.2:1 step, like light mode's 3.3:1, and stays above 4.5:1 on the page. Never `text-accent` at rest. |
| Weight | Names 600 (`font-semibold`), everything else 400. |
| Case | Sentence case, `tracking-[0.01em]`: "By Morgan Patel · 3 hours ago". Only a Sports card's sport label stays uppercase. |
| "By" | Always, in every context. |
| Joining | `utils/joinNames.ts`: "A", "A and B", "A, B and C" (AP, no serial comma). Every name is listed. Don't join names by hand. |
| Author list | `utils/articleAuthors.ts` (`getArticleAuthors`): staff in byline order, then write-ins, trimmed, empties dropped. Every byline builds its list here. |
| No authors | "By *The Polytechnic*". Only a staff editorial (`opinionType: 'staff-editorial'`) reads "By *The Polytechnic* Editorial Board", since that credit means the paper's official opinion. Cards say "By The Polytechnic" either way. |
| Links | Names on cards are plain text. A card is one link to its story, and a second link inside it can't be valid HTML: it would show the story's URL on hover and add a Tab stop per name. Profiles are linked from the article header (underlined, red on hover) and the photofeature hero. Headshots next to linked names are decorative (`alt=""`, `aria-hidden`, out of the Tab order), so each person is one link. |
| Dates | `utils/articleDates.ts`, always in Troy's time zone. Home page cards show "3 hours ago" for a story's first week, then nothing (`recentAge`); the home lead shows the publish date after that week (`leadDate`). Section pages never use relative dates. They show a publish date where readers judge timing, and nowhere else (see the table below). Archive lists always show the date. |

## Dates on the section pages

The sections publish one or two stories a week, so a one-week "days ago" label
would leave nearly every story undated. Where a section page shows dates, they
are absolute and include the year.

| Section | Dated | Undated |
|---|---|---|
| News | Every story: lead, strips, tablet row, topic row, Student Government boxes (`newsBylineDate`, "November 13, 2026") | — |
| Features | The Latest column ("Nov 14") | Everything else: the lead and the stories under it, On Campus, The Arts, More Stories, Photo Spotlight |
| Opinion | The three main columns and the Editorials / Opinions / Other groups ("Nov 14, 2026"): an opinion answers a moment | Editor's Choice and the author carousel (curated picks) |
| Sports | Every story, including the lead ("Oct 17, 2026"), plus game dates in the score strip | — |
| Archives | More in News, More in Features, the Opinion lists ("November 13, 2026"), Sports all stories (month headings plus dates) | — |
| Photographers | Caption credits keep "Name/The Polytechnic", upright at 11px with no opacity. The article header adds "Photos by Name" when the featured image's photographer isn't already an author. |

## Where it lives

- `components/FrontPage/Byline.tsx`: card bylines. Pass `authors={article.authorLinks}`
  (from `formatArticle`). `size` is matched to the headline: `"sm"` 13px, `"md"` 14px
  (default), `"lg"` 15px for leads. `margin` replaces the default space above
  (`mt-1 md:mt-1.5`); `className` adds anything else.
- `components/Article/ArticleByline.tsx`: article header. Up to three authors
  with at least one job title get a block each (name over title, only the first
  says "By"); otherwise one sentence. The photographer comes from
  `withPopulatedPhotographer` in `lib/publicArticle.ts`, which fetches their job
  title and headshot (the page's depth-2 fetch stops one level short).
- `components/Sports/SportsByline.tsx`: the Sports cards' "By" and names.
- `utils/formatArticle.ts`: `author` is plain text ("A, B and C", or
  "The Polytechnic"), `authorLinks` the list, and `date` the card date.
