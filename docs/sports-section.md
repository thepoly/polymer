# Sports section

`/sports` has its own page, layout editor and data, in the same
editor-pinned style as Opinion and Features. This page covers what was
added, what has to happen once it's deployed, and what needs looking after
over time.

## What's on the page

| Part | What it shows | Where the data comes from |
| --- | --- | --- |
| Score strip (top) | For each sport in the standings card: RPI's last two finals and next game | rpiathletics.com calendar feed ([`lib/schedule.ts`](../lib/schedule.ts)) |
| Lead + scoreboard | Lead story with a scoreboard (logos, score, sport, status, date played) | The lead article's game result + `schools` |
| Below-lead stories | One wide story, or two when the scoreboard is off | Layout editor, auto-filled with the newest stories |
| Standings card | 3-5 sports, top five teams with RPI held at its real rank | ECAC Hockey and Liberty League standings pages ([`lib/standings.ts`](../lib/standings.ts)) |
| Headlines | Three stories | Layout editor / newest stories |
| More Headlines | A carousel of seven photo cards, ending in a link to `/sports/all` | Layout editor / newest unused stories |
| `/sports/all` | Every sports story by month, filterable by sport, 24 per page | Articles |

The page components are in [`components/Sports/`](../components/Sports/),
and the route is the `sports` branch of
[`app/(frontend)/[section]/page.tsx`](../app/(frontend)/[section]/page.tsx).
Both pages revalidate every 60 seconds.

## For editors

**On a sports article** (right under Section; shown only for sports):
- **Sport.** Choosing one fills an empty kicker with the sport's name.
  For a story that isn't about one team, pick "General / Multiple Sports",
  or leave Sport blank and write a kicker, which is then used as the
  story's label on `/sports`.
- **Game result** (all optional): opponent (a school), home / away /
  neutral, RPI score, opponent score, and status. Leave status blank for
  "Final"; type "Final/OT" and similar when it applies. The scoreboard only
  appears when the lead story has an opponent.

**Sports Layout** (in the newsroom):
- Drag stories into the lead, below-lead, Headlines and More Headlines
  slots. Empty slots fill themselves with the newest stories, so the page
  works before anyone sets it up.
- **Scoreboard** switch, and **Date played** under it. The scoreboard
  otherwise shows the publish date, which is often a day after the game.
  The date belongs to the story it was typed for: change the lead and it
  goes back to the publish date.
- **Scores banner** switch. Turning it off shows the plain
  "Sports | Contact" header and stops the site contacting RPI Athletics.
- **Lead title overlay** switch.
- **Standings**: each sport shows whether it's in season. **Show** or
  **Hide** forces a sport on or off for 7 days, then the calendar takes
  over again. **Auto** goes back to the calendar now.
- More Headlines cards can be reframed by dragging the photo. Otherwise
  they use the photo's focal point.
- The **Schools** button beside "Create New" opens the list of opponents.
  Schools is kept out of the sidebar because it rarely changes. Editors,
  EICs and admins can add and edit schools; only admins can delete them.

## Database changes

Three migrations, in both paths (`migrations/` and
`scripts/run_deploy_sql_migrations.sh`):

- `20261022_000000_add_sports_page_layout`: `sports_page_layout` table
  (layout stored as one JSON column, like `features_page_layout`)
- `20261022_010000_add_schools_and_game_result`: `schools` upload
  collection; `opponent_id`, `home_away`, `rpi_score`, `opponent_score`,
  `game_status` on `articles` and `_articles_v`
- `20261022_020000_add_article_sport`: `sport` enum column on `articles`
  and `_articles_v`

All changes are additive. The new columns are nullable, existing articles
need no backfill, and nothing is dropped or renamed. The deploy's schema
check ([`deploy.yml`](../.github/workflows/deploy.yml)) now also queries
the new tables and columns.

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
| `libertyleagueathletics.com` standings | Football, basketball, soccer, lacrosse, baseball, softball | [`lib/standings.ts`](../lib/standings.ts) |

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
| Season dates shift | Each sport's appear / regular-season-end / leave dates (month-day, Troy time) | `STANDINGS_SPORTS` in [`lib/standingsSchedule.ts`](../lib/standingsSchedule.ts) |
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
- The pending `fix/dedupe-migration-tracking` branch changes the format of
  the tracking rows at the top of `run_deploy_sql_migrations.sh`. Whichever
  of the two merges second must rewrite this PR's three rows as
  `('<name>', 32),`, because an old-format row would make the tracking
  insert fail without failing the deploy.
