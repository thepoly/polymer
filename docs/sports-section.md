# Sports section

`/sports` has its own page, layout editor and data, in the same
editor-pinned style as Opinion and Features. This page covers what was
added, what has to happen once it's deployed, and what needs looking after
over time.

## What's on the page

| Part | What it shows | Where the data comes from |
| --- | --- | --- |
| Score strip (top) | For each sport in the standings card: RPI's last two finals and next game | rpiathletics.com calendar feed ([`lib/schedule.ts`](../lib/schedule.ts)) |
| Lead + scoreboard | Lead story with a scoreboard (logos, score, sport, status, date played) | One or two games on the lead article + `schools` |
| Below-lead stories | One wide story, or two when no scoreboard shows | Layout editor, auto-filled with the newest stories |
| Standings card | Every sport in season (at least 3). Five tabs fit; any more scroll sideways (trackpad or finger swipe, desktop mouse drag, or the arrows). Top five teams, with RPI held at its real rank | ECAC Hockey and Liberty League standings pages ([`lib/standings.ts`](../lib/standings.ts)) |
| Headlines | Three stories | Layout editor / newest stories |
| More Headlines | A carousel of seven photo cards, ending in a link to `/sports/all` | Layout editor / newest unused stories |
| `/sports/all` | Every sports story by month, filterable by sport, 24 per page | Articles |

Below 1024px, the score strip reaches both screen edges and joins directly
to the date/volume bar, sharing its bottom rule without a gap or doubled
border. The header keeps its usual spacing when there is no score strip.
Below 768px, Standings tab/table surfaces also reach both screen edges;
its text, heading rule and source link retain the page's reading inset.
Standings keeps its existing tablet and desktop widths.

More Headlines scrolls horizontally by finger swipe or trackpad. On desktop,
readers can also drag the cards with a mouse or use the arrows to move four
cards at a time. The arrows are hidden below the desktop breakpoint (1024px).
Their 48px circles use a translucent fill, 10px backdrop blur, a fine border
and a soft shadow. Hover strengthens the fill and turns the arrow red;
keyboard focus gets an accent outline. Dark mode uses a smoky dark fill,
and browsers without backdrop blur get a more opaque fallback.
Dragging a card does not open its story; a normal click or tap still does.
Quick finger flicks in the score strip and More Headlines coast farther than
slow drags; desktop mouse dragging in both rows also coasts after release. Touching a
moving row stops it, and holding still before release prevents a coast.
Vertical page scrolling and pinch zoom remain available. With reduced motion
enabled, the rows stop on release. Trackpads keep their native momentum.

The page components are in [`components/Sports/`](../components/Sports/).
On mobile, Standings initially selects the leftmost displayed sport, even if
its conference play has not started. Desktop initially prefers the lead
story's sport when conference play has started. A reader's chosen tab stays
selected when resizing between mobile and desktop.
The active sport's underline matches its label width, rather than the wider
button used to space the tabs.
It slides between selections with the masthead section underline's 420ms
timing and easing. Rapid selections continue from its current position;
resizing keeps it aligned, and reduced motion switches it immediately.
The standings content swaps with the same full-width slide used between
Senate and E-Board: the old table leaves one side as the new table follows
from the selected tab's direction, on the underline's timing. The heading
and tabs stay fixed. Height changes ease with the slide; outgoing content
is hidden from assistive technology and cannot receive focus. A new choice
or resize clears the previous slide, and reduced motion swaps immediately.
The gap from Standings to the Headlines rule is 12px below 768px.
Between 768px and 1023px wide the gap is 20px; desktop retains 24px.

At desktop widths (1024px and up), the sport tabs also support mouse grab
scrolling and coast after release. Dragging does not select a different tab;
normal clicks and keyboard activation still do. Pressing the row, using an
arrow, scrolling with a wheel, or focusing a tab stops the coast. Reduced
motion disables coasting and makes arrow scrolling immediate. Mobile keeps
native touch scrolling.

The route is the `sports` branch of
[`app/(frontend)/[section]/page.tsx`](../app/(frontend)/[section]/page.tsx),
which gets everything besides the newest stories from
[`lib/sportsPage.ts`](../lib/sportsPage.ts). The layout's JSON is defined
and read in [`lib/sportsLayout.ts`](../lib/sportsLayout.ts).

`/sports` revalidates every 60 seconds. `/sports/all` reads its query
string, so it renders on every request; the count behind its sport tabs is
cached for 60 seconds.

## For editors

**On a sports article** (right under Section; shown only for sports):
- **Sport.** The kicker follows it: an empty kicker gets the sport's name,
  and changing the sport changes a kicker that still names the old one. A
  kicker an editor wrote stays. For a story that isn't about one team, pick
  "General / Multiple Sports" (which adds no label) or leave Sport blank,
  and write a kicker if you want one; it is then the story's label on
  `/sports`.
- **Games.** Add the opponent, date played, site, whole-number scores and
  status for each game. For a weekend recap, add both games in playing order.
  Both games can use the same school or different opponents. Leave Games
  empty for a story without a game.
- An article with one game shows a ruled score band beneath its deck, or
  beneath its headline when the deck is empty. With two games, both boards
  stay side by side on phones and larger screens. A desktop photofeature
  carries the band immediately below its full-screen hero.
- Enter statuses such as “Final/OT” or “7:00 PM” as needed. A blank status
  defaults to “Final” with both scores and “Scheduled” otherwise. Missing
  scores show a dash. A tie gives both teams equal emphasis. The series
  record counts only games with both scores, in RPI win–loss–tie order.
  Two dates from the same Friday through Sunday are labeled “Weekend”.
- Moving a story out of Sports clears its sport and games.

**Sports Layout** (in the newsroom):
- Drag stories into the lead, below-lead, Headlines and More Headlines
  slots. Empty slots fill themselves with the newest stories, so the page
  works before anyone sets it up.
- A pinned story that has been unpublished is marked "not published"; its
  slot fills itself until the story is published again. A pin whose story
  was deleted says so and can be removed with ×.
- **Scoreboard** controls the lead slot. A single game uses the large
  scoreboard. A series shows two boards above the lead, using each game’s
  own date. On phones the headline and photo follow the boards.
  **Date played** overrides the date for a pinned single-game lead only.
  Single games fall back to the publication date when the game date is empty.
  A lead without a board makes room for the second below-lead story.
- **Scores banner** switch. Turning it off shows the plain
  "Sports | Contact" header and stops the site contacting RPI Athletics.
- **Lead title overlay** switch.
- **Standings**: each sport shows whether it's in season. **Show** or
  **Hide** forces a sport on or off for 7 days, then the calendar takes
  over again. **Auto** goes back to the calendar now. Show can't bring
  back a sport whose conference page can't be read.
- More Headlines cards can be reframed by dragging the photo. Otherwise
  they use the photo's focal point.
- The **Schools** button beside "Create New" opens the list of opponents.
  Schools is kept out of the sidebar because it rarely changes. Editors,
  EICs and admins can add and edit schools; only admins can delete them.

## Database changes

Sports migrations are in both paths (`migrations/` and
`scripts/run_deploy_sql_migrations.sh`):

- `20261022_000000_add_sports_page_layout`: `sports_page_layout` table
  (layout stored as one JSON column, like `features_page_layout`)
- `20261022_010000_add_schools_and_game_result`: `schools` upload
  collection; `opponent_id`, `home_away`, `rpi_score`, `opponent_score`,
  `game_status` on `articles` and `_articles_v`
- `20261022_020000_add_article_sport`: `sport` enum column on `articles`
  and `_articles_v`

- `20261121_000000_add_article_games` adds ordered rows in `articles_games`
  and `_articles_v_version_games`. Existing games and saved revisions are
  copied into their first row. Older records with only the original fields
  also render through the single-game fallback. The deploy schema check
  covers both tables. A rollback can keep the first game in the legacy fields.

Checked locally: a database migrated with the TypeScript migrations and one
built with `main`'s migrations plus this branch's deploy SQL (run twice)
produce identical schemas.

Settings added later (date played, scores banner, title overlay, More
Headlines slots, card framing) live in the layout's JSON, so they needed no
migration.

## After the first deploy (one-time)

**Seed the schools.** Production starts with an empty `schools` table, so
the scoreboard and standings have no logos. On the server:

```bash
cd /var/www/polymer/current
sudo -u actions-runner pnpm db:seed:schools
```

- It reads [`scripts/data/schools.json`](../scripts/data/schools.json)
  (195 opponents from four seasons of RPI schedules) and downloads each logo
  from rpiathletics.com or the conference site, so the server needs
  outbound internet access.
- Run it as `actions-runner` so the logo files in `/var/www/polymer-media`
  are owned by the user the site runs as.
- It's safe to re-run. Existing schools are matched by name and left alone,
  except that a missing logo or athletics link gets filled in. Editors'
  changes are never overwritten.
- RPI's own record, `Rensselaer Polytechnic Institute`, supplies the home
  side of the scoreboard, so check it exists afterwards.

Then open `/sports` and the Sports Layout editor to check that the strip,
standings and scoreboard look right.

## Outside data it depends on

None of these are official APIs. They're the JSON and HTML behind public
Sidearm-hosted sites (the platform rpiathletics.com and both conferences
use).

| Source | Used for | Code |
| --- | --- | --- |
| `rpiathletics.com` calendar feed (`responsive-calendar.ashx`) | Score strip | [`lib/schedule.ts`](../lib/schedule.ts) |
| `ecachockey.com` standings | Men's and women's hockey | [`lib/standings.ts`](../lib/standings.ts) |
| `libertyleagueathletics.com` standings | Football, basketball, soccer, field hockey, lacrosse, baseball, softball, tennis | [`lib/standings.ts`](../lib/standings.ts) |

How it behaves:
- Each page or feed is fetched at most once an hour, with an 8-second
  timeout.
- A standings table is used only if it parses cleanly and includes RPI.
- On a failed fetch or parse, the last good data keeps showing. That copy
  is held in memory, so it's lost when the app restarts (every deploy). If
  a source is down right after a deploy, the affected sport is left out, or
  the score strip falls back to the plain header, until the source recovers.
- Nothing ever breaks the page. The worst case is a missing sport or a
  missing strip.

**If standings or the strip disappear:** open the source page in a browser.
If the conference or RPI Athletics has redesigned it, the parser in
`lib/standings.ts` or `lib/schedule.ts` needs updating. Until then, editors
can turn the scores banner off.

## Ongoing maintenance

| When | What | Where |
| --- | --- | --- |
| A new opponent appears | Add it with the Schools button (name, short name, logo, athletics URL). The score strip falls back to RPI Athletics' logo until then. | Newsroom → Sports Layout → Schools |
| Season dates shift | Each sport's appear / regular-season-end / leave dates (month-day, Troy time). Tennis covers only its spring season; its fall matches are too few to show. | `STANDINGS_SPORTS` in [`lib/standingsSchedule.ts`](../lib/standingsSchedule.ts) |
| RPI changes conference, or a conference moves its site | Conference and URL path per sport | `SOURCES` and `CONFERENCE_SITES` in [`lib/standings.ts`](../lib/standings.ts) |
| Adding a sport | 1. Add to `SPORTS` in [`lib/sports.ts`](../lib/sports.ts). It's a Postgres enum, so this **needs a migration in both paths** ([`docs/migrations.md`](migrations.md)). 2. For standings: `STANDINGS_SPORTS` + `SOURCES`. 3. For the score strip: `FEED_SPORTS` in `lib/schedule.ts`. | |
| Refreshing the seed list | Edit `scripts/data/schools.json` and re-run `pnpm db:seed:schools`. Only new schools and missing logos or links are added. | |

Nothing has to be updated every year: seasons roll over by date, and each
standings table records which season it covers.

## Site-wide changes in this PR

These aren't sports-specific, so reviewers should look at the whole site,
not just `/sports`:

- **Image quality.** Photos are now resized from the original upload and
  served at quality 90 (previously re-compressed copies at 75). Next 16
  only serves qualities listed in `images.qualities` in
  [`next.config.ts`](../next.config.ts), currently `[90]`. A new `quality`
  prop with any other value is silently snapped to 90, so add a value there
  if one is ever needed. Images also got missing `sizes` hints.
- **Transitions.** `globals.css` no longer gives every element a colour
  transition. That rule was blocking every Tailwind transition on the site.
  Colours now fade only while the theme changes (`.theme-fading`, added by
  `ThemeProvider`). Hover colour changes need an explicit
  `transition-colors`.
- **Alignment.** The rule under the desktop logo and the News, Features and
  Opinion pages use the header's side padding at every width.
- **Headlines.** Sports headlines use the same light serif as Opinion and
  Features everywhere.
- **Dev caching.** The one-year `immutable` cache header on
  `/_next/static` is now production-only. It used to leave the dev server
  serving stale CSS and JS.

## Known gaps and follow-ups

- While the score strip is showing, the sports header has no "Contact"
  link. The link only appears with the plain header (banner off, or no
  feed data).
- Schools logos are stored in the same media directory as `media` and
  `logos` uploads (`MEDIA_DIR`), like the other upload collections.
- A **Show** override for a sport whose conference page failed to load or
  parse does nothing, and the layout editor can't tell which sports are
  affected: it would need the page's standings status passed to it.
- The pending `fix/dedupe-migration-tracking` branch changes the format of
  the tracking rows at the top of `run_deploy_sql_migrations.sh`. Whichever
  of the two merges second must rewrite this PR's three rows as
  `('<name>', 32),`, because an old-format row would make the tracking
  insert fail without failing the deploy.
