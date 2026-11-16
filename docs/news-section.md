# News section and Student Government timelines

`/news` has its own page and layout editor, and links to two timeline pages:
one for the Student Senate and one for the Executive Board. Each timeline
shows one term (GM Week to GM Week) at a time and ends in a "shelf" of every
term. This page covers how it all works, what has to happen once it's
deployed, and what needs looking after over time.

Everything editorial below happens in the admin (`/newsroom`) and shows on the
public site within about a minute (pages revalidate every 60 seconds). None of
it needs a code change or a deploy.

## The News page

| Part | What it shows | Where the data comes from |
| --- | --- | --- |
| Header | Section title, Archive link, Contact link (emails `news@` and `eic@`) | [`components/News/NewsPage.tsx`](../components/News/NewsPage.tsx) |
| Lead story | Two thirds of the width, text north / south / east / west of the photo, or over it | Pinned in the News Layout editor; otherwise the newest news story with a photo |
| Stories under the lead | Full-width strips with no photo: the headline end to end, the subdeck under it | Pinned in the News Layout editor (two slots); an empty slot takes the next newest news story. Two when the lead's text is beside its photo, one when it's over the photo. With the text above or below the photo, one only if the lead ends well short of the Student Government column |
| Student Government column | A Senate box and an Executive Board box, in either order | Each box: the latest 2 or 3 timeline entries, or one pinned article |
| Featured row | Under the two columns, full width: four cards with photo, headline, byline and subdeck (two across on tablets, one on phones) | Pinned in the News Layout editor (four slots); an empty slot takes the next newest news story with a photo. [`components/News/NewsFeatured.tsx`](../components/News/NewsFeatured.tsx) |
| Topic row | Under Featured: four headers (Administration, Academia, Campus Infrastructure, Interview); clicking one swipes in its six newest stories, 3×2 on computers | Stories whose kicker is in that topic's list in [`components/News/newsTopics.ts`](../components/News/newsTopics.ts), any capitalisation, from the whole archive, skipping anything shown above, unless the editor chose that tab's stories (News Layout editor, Topic row → Stories). Opens on the first topic with stories. [`components/News/NewsTopicTabs.tsx`](../components/News/NewsTopicTabs.tsx) |

On computers the two columns are squared off to end on the same line
([`BalanceColumns`](fit-text.md#balancecolumns-two-columns-that-end-together)).
Whichever column is shorter has its type set larger: the strips and the
lead's headline on the left, the docket entries on the right (a box set to 2
entries gains a third first). The lead photo's height then closes the last
gap, anywhere from 16:9 to 4:3, or up to square beside its text. If the
Student Government column is still the longer one, its type is set slightly
smaller and, failing that, its summaries are dropped. Phones show everything
at its base size, with no third entry and no optional strip.

The route is the `news` branch of
[`app/(frontend)/[section]/page.tsx`](../app/(frontend)/[section]/page.tsx);
the layout shape is in [`components/News/newsLayout.ts`](../components/News/newsLayout.ts).
An unpublished pin (lead or box) falls back to automatic rather than breaking
the page. Entries hidden on a timeline are left out of its box too.

The previous layout, [`NewsSectionPage.tsx`](../components/News/NewsSectionPage.tsx),
is still in the repo but no longer rendered.

## The timelines

| Page | Address |
| --- | --- |
| Student Senate, term in session | `/news/student-government/senate` |
| A past Senate, by number | `/news/student-government/senate/56` |
| Executive Board, year in session | `/news/student-government/e-board` |
| A past E-Board, by year | `/news/student-government/e-board/2025-26` |

The current term's own address (`/senate/57`) redirects to the plain page. An
unknown term, or one taken off the shelf, gets a per-body 404 linking to the
current term. `/news/student-government` itself forwards (308) to `/news`.

### Terms run GM Week to GM Week

Both bodies change over at GM Week in late March. A term starts at the new
body's **first meeting** (usually April) and runs to the day before the next
term's first meeting, so anything between GM Week and that meeting belongs to
the outgoing term. Terms are not school years. The newest term whose first
meeting has passed is "in session"; one dated in the future isn't shown yet.

Term logic is in [`components/News/studentGovTerms.ts`](../components/News/studentGovTerms.ts)
(client-safe, shared by the pages, the editor and the collection). Stored
date-only fields are read by their UTC calendar day; entry timestamps by their
calendar day in Troy.

If no terms have been entered for a body, the pages make stand-in terms from
the entry dates: April 1 starts, no leaders, Senate numbers counted from the
57th (2026–27). That keeps the pages working before
`pnpm db:seed:terms` runs.

### What lands on a timeline

1. **Articles by kicker (automatic).** Published News-section articles whose
   whole kicker names the body, in any capitalisation (`kickerPattern` in
   [`components/News/studentGov.ts`](../components/News/studentGov.ts)).
   "STUDENT SENATE" and "Senate" count; "Faculty Senate" doesn't.
2. **Articles added from the archive (by hand).** Any section or kicker, added
   with the Archive finder. Stored as article ids in
   `news-page-layout.layout.timelinePages[body].included`.
3. **Updates.** Short title + blurb items from `student-gov-updates`.

Each entry goes in the term its date falls in; anything older than the oldest
term is left off. The archive holds some stories twice (same title, same day,
often different kicker capitalisation), left over from the legacy import:
each shows once, keeping the copy with a photo, then the lowest id
(`dropDuplicateStories` in `studentGovTerms.ts`, used by the page, the editor
and the Archive finder). Entries in `timelinePages[body].hidden` are left off the
timeline and the News page box. The loader is
[`lib/studentGovTimeline.ts`](../lib/studentGovTimeline.ts); the page is
assembled in [`lib/studentGovPage.tsx`](../lib/studentGovPage.tsx).

### What's on a timeline page

| Part | What it shows | Code |
| --- | --- | --- |
| Photo panel (left, sticky) | Body name, term ("57th Senate · 2026–27"), link to the other body's same term, the month in view (older months are reached by scrolling) | [`StudentGovMonthPanel.tsx`](../components/News/StudentGovMonthPanel.tsx) |
| Stream (right, scrolls on its own on desktop; the swipe or wheel turn that reaches its end stops there, momentum and all, and the next one carries the page on to the footer) | The term's entries by month, newest first | [`StudentGovSplitTimeline.tsx`](../components/News/StudentGovSplitTimeline.tsx) |
| Back link (past terms only) | Top of the stream: a white book from the shelf lying on its side (hairline edge, hinge lines near each end), "TO 57TH SENATE" / "TO 2026–27 E-BOARD" on its spine in red, in the term label's type (Raleway, bold, uppercase), and the Poly P charm in red, pin included, pinned in the middle of the spine's width near its right end, hanging over it as on the shelf. The name is the term in session (the newest whose first meeting has passed), worked out on every request, so it moves to the 58th Senate by itself once that term is entered and has met. On hover the book lifts, the charm swings once and the ‹ nudges left | [`StudentGovBackLink.tsx`](../components/News/StudentGovBackLink.tsx) |
| Stream markers | Top of a past term: the GM Week that ended it, linked to the election story. A divider at a mid-term leader change. Senate only: a "2026 Summer recess · No meetings" line, placed at June 1 of each term once that day has passed, placed by date like the other dividers (automatic; editors don’t add it). No automatic first-meeting marker: editors post the first meeting as an update. | Same file; text from `studentGovTerms.ts` |
| Shelf (end of the stream) | One book per covered term, newest left, flat, narrow spines in a minimal style (rounded corners, 2px apart, a soft sheen, title in serif reading top to bottom, foot in small capitals); on desktop the first book stands 2px off the photo panel and the row runs to the stream column's right edge, under a red "From the stacks" kicker and a header about the book in view: the term on the page, or the one being previewed. The header is the formal name ("54th Student Senate" / "2025–26 Executive Board", with an "In session" pill for the current term), then "2026–27 · Grand Marshal Jordan Krishnayah (160th)" ("President of the Union …" on E-Board pages; numbers when entered; just the years when no leader is entered). The term on the page has the Poly P (from the favicon) hanging on its spine as a charm: a pin near the top of the spine, a short cord and ring, and the P, above the title, all in one colour; only the cord and P cast a soft shadow. When the shelf slides sideways the charm swings like a pendulum (a damped spring, up to 12°, settling in about 1.5s); it stays still for reduced motion. Red on light spines, near-white on red ones. Every book is a link to its term: with a mouse, resting on a book (120ms) lifts it and crossfades the header to it; a click opens it, and the book rises a little further while the page loads. The preview lasts while the mouse is anywhere over the shelf and ends when it leaves, or when focus leaves the shelf. On touch the first tap lifts a book and the second opens it. Arrow keys, Home and End move along the shelf, Enter opens. Clicking the term on the page scrolls its stream back to the top. The headlines share one grid cell, so the books never move as the headline changes. The row scrolls sideways with no scrollbar (a sideways trackpad swipe, a touch swipe, shift + wheel, arrow keys; any mostly vertical wheel or trackpad scroll over it goes to the stream instead, even at the stream's end), and snaps books into place. Opening a term remounts the whole timeline (keyed by term), so the new stream starts at the top. | [`StudentGovShelf.tsx`](../components/News/StudentGovShelf.tsx) |

The panel shows **one photo for the whole term** (no per-month photos): the
term's own, set in the page editor, else the page's default photo, else plain
red. Only hand-picked photos are used, never article photos, so with nothing
set every term is plain red. Saved in
`timelinePages[body].photos` as `default` and `terms[termSlug]`.

**Spine size** comes from the term's article count only (updates don't count),
on a fixed scale: 240 × 38 px with no articles, growing evenly to 290 × 60 px at
30 articles and staying there (38px is the narrowest that fits the widest foot,
"PU 136"). The constants are at the top of `lib/studentGovPage.tsx`. Past terms
cycle through twenty-one reds, pinks, whites and greys (no blacks), ordered so
neighbours mostly differ in tone or hue: crimson, white, oxblood, paper white,
light grey, dark warm grey, cherry, blush pink, a cooler tangy red, wine, tangy
red, slate grey, garnet, rose (the first fourteen, enough for every past
term today), then deep red, pale grey, raspberry, soft white, a cooler tangy
red still, warm light grey, coral red. The tangy reds are RPI red made a touch
less orange. The term in session is RPI red (#D6001C). Whites carry red
lettering and a hairline edge so they show on the white page; pinks and
greys have maroon, deep red or dark grey lettering; the reds are lettered in
near-white.

**Book details.** A few past terms carry a small, hand-picked detail so the
shelf reads as real volumes: a striped headband, raised bands, a faint cloth
weave, a sun-faded head, a dust jacket shorter than its boards, old-style
figures in the title, and the oldest book leaning on its neighbour. They're
listed by Senate number and E-Board start year in
`components/News/shelfDetails.ts`, chosen rather than generated: older books
have more, a few stay plain, and the term in session (and any new term) is
always plain. None depends on the spine's colour, which shifts each year as a
new term takes the first slot. Add or move one by editing that file.

## For editors

### News Layout editor

Newsroom → **News Layout**. Pin the lead story, set its text position, swap
the two Student Government boxes, and set each box to timeline (its 2 or 3
latest entries; with 2, a third is added when the column ends short of the lead's) or one
pinned article. Each box's nameplate shows the term in session.

**Bullets (both boxes)**: **With summaries** (the default) or **Headlines
only** (`bulletsHeadlinesOnly`), which drops the summaries and sets the
headlines larger. A pinned story keeps its summary either way. With headlines
only the column is shorter, so the story strips under the lead only appear
when there's room for them.

**Lead photo crop**, under the text position: because the page changes the
lead photo's height to make the two columns end together, the editor shows the shortest
and tallest shapes it can take, plus the phone's. Drag a preview to choose
what stays in view and zoom to crop tighter; unset, the photo's focal point
is used. The crop is saved for that story only (`leadFrame`).

**Under the lead**: two slots for the photo-less stories under the lead
(`secondary`). Drop a story on a slot to pin it; an empty slot takes the next
newest story not already on the page. The second slot only shows when the
lead's text is beside its photo, and each slot's label says whether the
current text position shows it. A story pinned here that is also the lead is
skipped.

**Featured**: four slots, left to right, for the Featured row (`featured`).
An empty slot takes the next newest story with a photo. No story appears
twice on the page: a story pinned to Featured is kept out of the automatic
picks under the lead, and automatic Featured picks skip everything above.

**Topic row**: how the topic row's cards look (`topicCards`). Headlines
**Over the photo** (white on a dark gradient; the default) or **Under the
photo**. Under the photo adds a second choice, **Subdeck**: show or hide it
under the byline.

**Stories** (`topicPicks`): per topic tab, **Six newest** (the default) or
**Choose stories**, which shows six slots to drop articles into, in card
order. Any news story can be chosen, whatever its kicker, and a chosen story
shows even if it's also higher up the page. An empty slot takes the next
newest story in that topic. Switching back to Six newest keeps the picks, so
switching to Choose stories again restores them.

Save with **Activate**. Editor:
[`components/Dashboard/NewsLayoutEditor/`](../components/Dashboard/NewsLayoutEditor/).

### Senate and Executive Board page editors

Newsroom → arrow beside **News Layout** → **Senate page** / **Executive Board
page** (`?page=senate` / `?page=executive-board` on the News Layout edit view).
Editor: [`components/Dashboard/TimelinePageEditor/`](../components/Dashboard/TimelinePageEditor/).
Photos, hidden entries, layouts and archive additions save with **Activate**;
updates save as soon as they're added or edited.

| Tool | What it does |
| --- | --- |
| Term | Which term the stream list and previews show |
| Layout | An entry's size, photo placement and position. Default: newest article full width, the rest zig-zag |
| Hide / Show | Takes a kicker-matched entry off the timeline and the News page box (the article is untouched) |
| Remove | Takes an archive addition back off |
| Panel photo | One photo for the term picked in the Term menu, plus a default for terms without their own; framed separately for computers and phones |
| Add an update | New update for this body; Edit / Delete on each update in the stream |
| Archive finder | Finds stories about this body that aren't on the timeline (below) |
| Terms | Opens Student Gov Terms |

**Archive finder.** On opening it searches every published story (any
section) back to the oldest term for the body's `archiveTerms` in titles,
subdecks and kickers. Editors can type their own words and tick "Article text
too" to search `plainContent`. Results show date, section, kicker and the
term they'd land in, leaving out what's already on the timeline (and Faculty
Senate stories for the Senate). **Add** puts a story in the term it was
published. A story can be added to both timelines.

### Student Gov Terms

Opened from the page editors' Terms button (the collection is hidden from the
sidebar, like the updates). Create/update: admin, EIC, news-section editors.
Delete: admin, EIC.

| Field | Purpose |
| --- | --- |
| Body | Student Senate or Executive Board |
| Senate number | Senate only: 57 for the 57th. Sets the URL |
| First meeting | **Decides which term every entry falls in**; not shown on the page |
| GM Week result | When the election producing this term was decided (the runoff, if any). Shown on the GM Week marker at the top of the *previous* term |
| Election results story | Links that marker |
| On the shelf | Untick for terms the archive doesn't cover; the term leaves the shelf and its page 404s |
| Chaired by | GM / PU name, number and how they took office. A second row with a **From** date adds a mid-term divider, and on the E-Board spine both numbers stack ("PU 134" over "PU 135"; "2 PUs" if either number is missing). Leave empty if unknown: the "Chaired by" line is hidden |

Name and slug (`senate-57`, `eboard-2026-27`) fill in from a `beforeValidate`
hook.

## Student Senate

| | |
| --- | --- |
| Kickers counted automatically | "Student Senate", "Senate" (any capitalisation, News section) |
| Led by | Grand Marshal |
| Spine / foot | "57th Senate" / "26–27" |
| Summer | Mostly inactive. A "2026 Summer recess · No meetings" line appears at June 1 each year: in the archive (2012–2026) the last spring story is always by May 31 (usually early May, after finals; Commencement is mid-May) and coverage resumes from late August. The only summer meeting covered was June 2020 |
| Archive finder words | student senate, senate, senator, grand marshal (Faculty Senate skipped) |

Terms seeded by `pnpm db:seed:terms`: fifteen terms, the 43rd (2012–13)
through the 57th (2026–27). The live archive goes back to 2010; the numbering
matches its "44th Student Senate" (April 2014) and the 50th, 51st, 52nd and
55th. Article counts below are from a check of the live archive on 2026-11-13
(any-capitalisation kicker, April 1 term starts).

| Term | Year | Grand Marshal | Articles |
| --- | --- | --- | ---: |
| 57th | 2026–27 | Jordan Krishnayah (160th) | 8 so far |
| 56th | 2025–26 | Tiburon Benavides (159th, unverified) | 9 |
| 55th | 2024–25 | Vivian Rost-Nasshan (runoff; number missing) | 19 |
| 54th | 2023–24 | missing | 21 |
| 53rd | 2022–23 | missing | 21 |
| 52nd | 2021–22 | missing | 16 |
| 51st | 2020–21 | missing | 6 |
| 50th | 2019–20 | missing | 26 |
| 49th | 2018–19 | missing | 36 |
| 48th | 2017–18 | missing | 34 |
| 47th | 2016–17 | Paul Ilori (151st); first meeting April 28, 2016 | 21 |
| 46th | 2015–16 | missing | 26 |
| 45th | 2014–15 | missing (149th, per "Meet RPI's 149th Grand Marshal", Aug 2014) | 5 |
| 44th | 2013–14 | missing | 0 |
| 43rd | 2012–13 | Dai, 147th (first name missing; "147th Grand Marshal Dai bids farewell", Apr 2013) | 0 |

Archive notes:

- About 40 Senate stories are filed under other kickers and aren't on the
  timeline until added: mostly Top Hat columns, plus press releases, election
  stories and a few filed under "Executive Board".
- The bare kicker "Senate" / "SENATE" (2015–2017) was checked: every story
  under it is about the Student Senate.
- Before 2014–15 Senate stories almost never carry the kicker. 92
  Senate-titled stories filed under other kickers or sections (2012–13: 18,
  2013–14: 21, 2014–15: 19, 2015–16: 7, the rest later; mostly Top Hat
  columns and kicker-less news) were reviewed by hand and listed in
  [`scripts/data/student-gov-archive.json`](../scripts/data/student-gov-archive.json);
  `pnpm db:seed:student-gov-archive` adds them, like the Archive finder's Add.
  Left out (reasons in the same file): April Fools pieces, the US Senate,
  Faculty Senate, the President of the Union's "Derby" columns, E-Board
  funding votes that name the Senate, and two "PSS:" items from 2012–13
  (an editorial decision).
- The archive check counts include duplicate copies (32 of the 250 Senate
  kicker matches); the page shows each story once.

## Executive Board

| | |
| --- | --- |
| Kickers counted automatically | "Executive Board", "E-Board", "EBoard" (any capitalisation, News section) |
| Led by | President of the Union, who appoints 15–20 members; the Senate approves them |
| Spine / foot | "2026–27" / "PU 137" (two PUs stack: "PU 134" over "PU 135") |
| Summer | May keep meeting; no recess line |
| Archive finder words | executive board, e-board, eboard, president of the union |

| Year | President of the Union | Articles |
| --- | --- | ---: |
| 2026–27 | Kate Goldstein (137th) | 1 so far |
| 2025–26 | Isabele Lieber (136th, inferred) | 5 |
| 2024–25 | Catherine Philipps (135th) | 20 |
| 2023–24 | Ava Gallagher, then Catherine Philipps (appointed 135th; date is a placeholder) | 29 |
| 2022–23 | missing | 25 |
| 2021–22 | missing | 18 |
| 2020–21 | missing | 8 |
| 2019–20 | missing | 24 |
| 2018–19 | missing | 54 |
| 2017–18 | missing | 33 |
| 2016–17 | missing | 16 |
| 2015–16 | missing | 22 |
| 2014–15 | missing | 2 |
| 2013–14 | missing | 0 |
| 2012–13 | missing | 0 |

Nothing is filed under the E-Board kicker before February 2015. 117 E-Board
stories filed under other kickers or sections (2012–13: 25, 2013–14: 12,
2014–15: 16, 2015–16: 13, the rest later) were reviewed by hand and are in
the same data file as the Senate's: the board's meetings, budgets, members,
bylaws and disputes; the President of the Union's "Derby" columns when
they're about the board or the role; Senate confirmations of E-Board members;
and PU election results, withdrawals, runoffs and primaries. Left out:
campaign coverage (candidate profiles, endorsements, debates), Derby columns
about campus life, humour, and a Senate meeting story. With those, the shelf
goes back fifteen years to 2012–13, like the Senate's. Philipps leading two
terms with the same number is correct. Several
"Executive Board" stories are really about the Senate; they stay here and can
also be added to the Senate timeline.

## Database changes

| Migration | Adds |
| --- | --- |
| `20261112_000000_add_news_page_layout` | `news_page_layout` (one row; the whole layout is a `layout` jsonb) |
| `20261112_010000_add_student_gov_updates` | `student_gov_updates` |
| `20261113_000000_add_student_gov_terms` | `student_gov_terms`, `student_gov_terms_leaders` (the `leaders` array) |

All three are in both paths ([`migrations.md`](migrations.md)). Nothing on
`articles` changes: hidden entries, archive additions, layouts and photos all
live in the `news_page_layout` jsonb.

## After the first deploy (one-time)

1. **Seed the terms** from the current release:
   `cd /var/www/polymer/current && sudo -u actions-runner pnpm db:seed:terms`.
   It only creates missing terms (matched by slug) and never overwrites edits.
   Until it runs, the pages use stand-in terms.
2. **Add the vetted archive stories**, once:
   `cd /var/www/polymer/current && sudo -u actions-runner pnpm db:seed:student-gov-archive`.
   It adds the stories in `scripts/data/student-gov-archive.json` to the
   timelines (matched by slug and date) and never removes anything. Don't
   re-run it later: it would bring back stories editors have removed.
3. Open both timelines and both page editors and check they load.
4. In Student Gov Terms:
   - enter the real **first-meeting date** for every term (all but the 47th
     Senate are April 1 placeholders; the archive's "first meeting" stories
     are the source);
   - fill in the missing Grand Marshals (43rd–46th and 48th–54th; leads for
     the 43rd and 45th are in the Senate table), the Presidents of the Union
     (2012–13 to 2022–23), and the missing numbers;
   - verify the inferred entries (Benavides 159th, Lieber 136th, Philipps's
     2024-02-01 appointment date);
   - add GM Week dates and election stories for past years (only 2026 is
     entered);
   - untick "On the shelf" for any term the archive doesn't cover well.
5. Comb the archive in both page editors for anything the vetted list missed:
   a pass with "Article text too", and kicker matches that don't belong
   (hide them).
6. Set panel photos and the News page lead and boxes.

> **Never** run `pnpm db:seed`, `scripts/seed-news.ts`,
> `pnpm db:seed:news-topics` or `scripts/seed-sports.ts` against production. They create placeholder users,
> photos, articles and updates for local development.

## Ongoing maintenance

| When | What | Where |
| --- | --- | --- |
| Every GM Week (late March) | Create the new Senate and E-Board terms: number (Senate), GM Week result date, the new leader with number, election story once published. Set First meeting to the expected date; correct it after the meeting. The outgoing term stays in session until then | Student Gov Terms |
| A leader resigns or is replaced | Add a second Chaired by row: name, "Appointed", number, From date | Student Gov Terms |
| A runoff decides GM Week | GM Week result = date the runoff was decided; leader's "how" = Elected in a runoff | Student Gov Terms |
| Filing stories | Kicker "Student Senate" / "Executive Board" puts News stories on the timeline by itself | Article editor |
| Stories under other kickers (press releases, election coverage, Top Hat, interviews) | Add the ones that belong | Page editor → Archive finder |
| Short items | Post an update | Page editor → Add an update |
| A wrong kicker match | Hide it | Page editor |
| News page | Change the lead pin and box modes as the news changes | News Layout |
| Now and then | Term photos, stream layouts | Page editor |

## Local development

- `pnpm db:seed:terms` seeds the same terms locally.
- [`scripts/seed-news.ts`](../scripts/seed-news.ts) adds placeholder news
  articles and updates, including updates spread over past terms and four
  archive-style stories (an all-caps kicker, a press release, a Top Hat
  column, a Faculty Senate story) for exercising the finder. Local only.
- `pnpm db:seed:news-topics` ([`scripts/seed-news-topics.ts`](../scripts/seed-news-topics.ts))
  adds seven placeholder stories per topic in the topic row, backdated 3 to
  15 weeks, so every topic fills its six cards. Needs `pnpm db:seed` first.
  Safe to re-run. Local only.

## Known gaps and follow-ups

- Open questions from the design handoff: how far back coverage really goes
  (sets the oldest spine).
- Remove [`NewsSectionPage.tsx`](../components/News/NewsSectionPage.tsx) once
  the new page ships.
- Not built from the handoff: the optional `stat` callout on entries, and a
  "load earlier months" button (the stream shows the whole term).
