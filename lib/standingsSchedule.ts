// Which sports the /sports standings card shows, decided by the calendar plus
// editor overrides. Pure date logic (no fetching), so the layout editor can use
// it too.
//
// Each sport has a yearly window (month-day, America/New_York):
//   appear  — about two weeks after typical opening weekend
//   regEnd  — usual end of the regular season / conference tournament;
//             before it the sport is "live", after it "winding down"
//   leave   — roughly the national final; the finished table stays up until
//             then so readers can see how the season went
// A live sport only shows once its table is this season's and RPI has played;
// see selectStandings.
import type { SportValue } from './sports'

type StandingsSport = {
  sport: SportValue
  /** Tab name, e.g. "M. Hockey" */
  tabLabel: string
  /** Sports picked together (men's/women's pairs, baseball/softball) */
  group: string
  appear: string
  regEnd: string
  leave: string
}

// Reading order of the tabs, left to right. Also the priority when more
// sports qualify than fit.
export const STANDINGS_SPORTS: StandingsSport[] = [
  { sport: 'mens-ice-hockey', tabLabel: 'M. Hockey', group: 'hockey', appear: '10-18', regEnd: '03-21', leave: '04-12' },
  { sport: 'womens-ice-hockey', tabLabel: 'W. Hockey', group: 'hockey', appear: '10-11', regEnd: '03-08', leave: '03-23' },
  { sport: 'football', tabLabel: 'Football', group: 'football', appear: '09-20', regEnd: '11-15', leave: '11-30' },
  { sport: 'mens-basketball', tabLabel: 'M. Basketball', group: 'basketball', appear: '11-22', regEnd: '03-01', leave: '03-21' },
  { sport: 'womens-basketball', tabLabel: 'W. Basketball', group: 'basketball', appear: '11-22', regEnd: '03-01', leave: '03-21' },
  { sport: 'mens-soccer', tabLabel: 'M. Soccer', group: 'soccer', appear: '09-14', regEnd: '11-09', leave: '11-30' },
  { sport: 'womens-soccer', tabLabel: 'W. Soccer', group: 'soccer', appear: '09-14', regEnd: '11-09', leave: '11-30' },
  { sport: 'mens-lacrosse', tabLabel: 'M. Lacrosse', group: 'lacrosse', appear: '03-08', regEnd: '05-03', leave: '05-27' },
  { sport: 'womens-lacrosse', tabLabel: 'W. Lacrosse', group: 'lacrosse', appear: '03-08', regEnd: '05-03', leave: '05-27' },
  { sport: 'baseball', tabLabel: 'Baseball', group: 'diamond', appear: '03-22', regEnd: '05-10', leave: '06-07' },
  { sport: 'softball', tabLabel: 'Softball', group: 'diamond', appear: '03-22', regEnd: '05-10', leave: '05-31' },
]

const MAX_TABS = 5
const MIN_TABS = 3
/** How long an editor's Show/Hide choice lasts before automation takes over */
export const OVERRIDE_DAYS = 7

export type Phase = 'live' | 'winding-down' | 'off'

export type StandingsOverride = {
  sport: SportValue
  mode: 'show' | 'hide'
  /** ISO timestamp the override expires */
  until: string
}

/** What the fetched table says, for the data checks */
export type StandingsAvailability = {
  /** Start year of the season the conference page is showing (2026 for "2026-27") */
  seasonYear: number | null
  /** Games RPI has played this season (overall record) */
  rpiGames: number
}

/** Today as YYYY-MM-DD in Troy, so windows flip at local midnight */
function localDay(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

type SeasonInfo = {
  phase: Phase
  /** Calendar year the current (or most recent) season started */
  seasonYear: number
  /** YYYY-MM-DD the most recent finished season left; '' if none */
  lastLeave: string
}

export function seasonInfo(entry: StandingsSport, now: Date): SeasonInfo {
  const today = localDay(now)
  const year = Number(today.slice(0, 4))
  // Dates after `appear` in the calendar belong to the same season year;
  // earlier ones (e.g. a March end for an October start) fall in the next.
  const at = (startYear: number, md: string) => `${md >= entry.appear ? startYear : startYear + 1}-${md}`

  let lastLeave = ''
  let lastStart = year
  for (const start of [year, year - 1, year - 2]) {
    const appear = `${start}-${entry.appear}`
    const regEnd = at(start, entry.regEnd)
    const leave = at(start, entry.leave)
    if (appear <= today && today < leave) {
      return { phase: today < regEnd ? 'live' : 'winding-down', seasonYear: start, lastLeave }
    }
    if (leave <= today && leave > lastLeave) {
      lastLeave = leave
      lastStart = start
    }
  }
  return { phase: 'off', seasonYear: lastStart, lastLeave }
}

export function activeOverrides(overrides: StandingsOverride[] | undefined, now: Date) {
  return (overrides ?? []).filter((o) => new Date(o.until).getTime() > now.getTime())
}

/**
 * Pick up to MAX_TABS sports, in tab order:
 *   1. editor "show" overrides
 *   2. live sports, then winding-down ones, by priority; a men's/women's pair
 *      is added together or not at all
 *   3. if fewer than MIN_TABS, the most recently finished sports (this is what
 *      holds the spring tables over the summer)
 * Editor "hide" overrides are skipped everywhere.
 */
export function selectStandings({
  now,
  available,
  overrides,
}: {
  now: Date
  available: Map<SportValue, StandingsAvailability>
  overrides?: StandingsOverride[]
}): SportValue[] {
  const active = activeOverrides(overrides, now)
  const hidden = new Set(active.filter((o) => o.mode === 'hide').map((o) => o.sport))
  const shown = active.filter((o) => o.mode === 'show').map((o) => o.sport)
  const selected = new Set<SportValue>()

  const candidates = STANDINGS_SPORTS.filter((s) => available.has(s.sport) && !hidden.has(s.sport))
  const info = new Map(candidates.map((s) => [s.sport, seasonInfo(s, now)]))

  for (const sport of shown) {
    if (available.has(sport) && selected.size < MAX_TABS) selected.add(sport)
  }

  const isCurrentSeason = (s: StandingsSport) => {
    const year = available.get(s.sport)?.seasonYear
    return year == null || year === info.get(s.sport)?.seasonYear
  }
  const qualifies = (s: StandingsSport, phase: Phase) =>
    info.get(s.sport)?.phase === phase &&
    isCurrentSeason(s) &&
    (phase !== 'live' || (available.get(s.sport)?.rpiGames ?? 0) > 0)

  // Groups in priority order (the order they first appear in STANDINGS_SPORTS)
  const groups = [...new Set(candidates.map((s) => s.group))].map((g) => candidates.filter((s) => s.group === g))

  const addGroup = (members: StandingsSport[]) => {
    const fresh = members.filter((s) => !selected.has(s.sport))
    if (fresh.length > 0 && selected.size + fresh.length <= MAX_TABS) fresh.forEach((s) => selected.add(s.sport))
  }

  for (const phase of ['live', 'winding-down'] as const) {
    for (const members of groups) addGroup(members.filter((s) => qualifies(s, phase)))
  }

  if (selected.size < MIN_TABS) {
    const recent = groups
      .map((members) => ({
        members: members.filter((s) => info.get(s.sport)?.phase === 'off'),
        lastLeave: members.reduce((latest, s) => {
          const leave = info.get(s.sport)?.lastLeave ?? ''
          return leave > latest ? leave : latest
        }, ''),
      }))
      .filter((g) => g.members.length > 0 && g.lastLeave)
      .sort((a, b) => b.lastLeave.localeCompare(a.lastLeave))
    for (const { members } of recent) {
      if (selected.size >= MIN_TABS) break
      addGroup(members)
    }
  }

  return STANDINGS_SPORTS.filter((s) => selected.has(s.sport)).map((s) => s.sport)
}
