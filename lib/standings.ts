// Conference standings for the /sports page, read from the conferences' public
// standings pages (both run on Sidearm, the same platform as rpiathletics.com).
// There is no official feed, so this parses the HTML table: if a conference
// redesigns its page, parsing fails, the last good table keeps showing, and a
// sport with no good table is simply left out. Which sports appear is decided
// in ./standingsSchedule.
import type { SportValue } from './sports'
import {
  STANDINGS_SPORTS,
  selectStandings,
  type StandingsAvailability,
  type StandingsOverride,
} from './standingsSchedule'

export type StandingsRow = {
  rank: number
  team: string
  conf: string
  pts: number | null
  overall: string
  isRpi: boolean
}

export type SportStandings = {
  sport: SportValue
  tabLabel: string
  conference: string
  sourceUrl: string
  hasPoints: boolean
  /** False until at least one conference game has been played */
  confStarted: boolean
  /** Start year of the season the table covers ("2026-27" → 2026) */
  seasonYear: number | null
  /** RPI's division ("East") when the conference splits into divisions */
  division: string | null
  /** True when `conf` holds division records (the "Div" column) */
  divisionRecords: boolean
  rows: StandingsRow[]
}

type Conference = 'ECAC Hockey' | 'Liberty League'

const SOURCES: Partial<Record<SportValue, { conference: Conference; path: string }>> = {
  'mens-ice-hockey': { conference: 'ECAC Hockey', path: 'mhockey' },
  'womens-ice-hockey': { conference: 'ECAC Hockey', path: 'whockey' },
  football: { conference: 'Liberty League', path: 'football' },
  'mens-basketball': { conference: 'Liberty League', path: 'mbball' },
  'womens-basketball': { conference: 'Liberty League', path: 'wbball' },
  'mens-soccer': { conference: 'Liberty League', path: 'msoc' },
  'womens-soccer': { conference: 'Liberty League', path: 'wsoc' },
  'mens-lacrosse': { conference: 'Liberty League', path: 'mlax' },
  'womens-lacrosse': { conference: 'Liberty League', path: 'wlax' },
  baseball: { conference: 'Liberty League', path: 'baseball' },
  softball: { conference: 'Liberty League', path: 'softball' },
}

const CONFERENCE_SITES: Record<Conference, string> = {
  'ECAC Hockey': 'https://ecachockey.com',
  'Liberty League': 'https://libertyleagueathletics.com',
}

const REFRESH_SECONDS = 60 * 60
const RECORD = /^\d+-\d+(-\d+)?$/

// Last table that parsed cleanly, per sport, for when a refresh fails
const lastGood = new Map<SportValue, SportStandings>()

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#39;/g, "'")
    // Last, so "&amp;#39;" stays "&#39;" rather than being decoded twice
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

const cells = (html: string, tag: 'th' | 'td') =>
  [...html.matchAll(new RegExp(`<${tag}([^>]*)>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => ({
    attrs: m[1],
    text: text(m[2]),
  }))

// Each table repeats some cells for its mobile layout (aria-hidden); keep only
// the desktop cells so headers and values line up.
const desktopOnly = <T extends { attrs: string }>(list: T[]) => list.filter((c) => !/aria-hidden/.test(c.attrs))

const sumRecord = (record: string) => record.split('-').reduce((a, n) => a + Number(n), 0)

function parseStandings(html: string, conference: Conference) {
  const start = html.indexOf('sidearm-standings-table')
  if (start < 0) return null
  const table = html.slice(start, html.indexOf('</table>', start))
  const thead = table.slice(0, table.indexOf('</thead>'))
  const tbody = table.slice(table.indexOf('<tbody'))

  let headers = desktopOnly(cells(thead, 'th')).map((c) => c.text.toUpperCase())
  // Liberty League repeats the team header once more for desktop
  if (headers[0] === headers[1]) headers = headers.slice(1)

  const col = (name: string, which: 'first' | 'last' = 'first') =>
    which === 'first' ? headers.indexOf(name) : headers.lastIndexOf(name)
  const confCol = conference === 'ECAC Hockey' ? col('W-L-T') : col('CONF')
  const overallCol = conference === 'ECAC Hockey' ? col('W-L-T', 'last') : col('OVERALL')
  const ptsCol = col('PTS')
  if (confCol < 1 || overallCol < 1 || confCol === overallCol) return null

  // Divisional tables (Liberty League baseball) open each division with a
  // header row ("East"); rows are grouped under it and ranked within it, by
  // the division record in the DIV column
  const divCol = col('DIV')
  const divRecords = new Map<StandingsRow, string>()
  const groups: { division: string | null; rows: StandingsRow[] }[] = [{ division: null, rows: [] }]
  for (const tr of tbody.split('<tr').slice(1)) {
    const values = desktopOnly(cells(tr, 'td')).map((c) => c.text)
    if (values.length === 0) {
      const heading = desktopOnly(cells(tr, 'th'))[0]?.text
      if (!heading) return null
      groups.push({ division: heading, rows: [] })
      continue
    }
    // After the regular season teams carry their tournament seed: "RPI (3)"
    const team = values[0]?.replace(/\s*\(\d+\)$/, '')
    const conf = values[confCol]
    const overall = values[overallCol]
    if (!team || !RECORD.test(conf ?? '') || !RECORD.test(overall ?? '')) return null
    const group = groups[groups.length - 1]
    const row: StandingsRow = {
      rank: group.rows.length + 1,
      team,
      conf,
      pts: ptsCol >= 0 && values[ptsCol] !== undefined ? Number(values[ptsCol]) : null,
      overall,
      isRpi: team === 'RPI',
    }
    group.rows.push(row)
    const div = divCol > 0 ? values[divCol] : undefined
    if (div && RECORD.test(div)) divRecords.set(row, div)
  }

  // Sanity checks: a real conference table, with RPI in it
  const teamCount = groups.reduce((n, g) => n + g.rows.length, 0)
  const group = groups.find((g) => g.rows.some((r) => r.isRpi))
  if (teamCount < 4 || !group || group.rows.length < 2) return null

  // With divisions, RPI's is the table that matters. Its record column shows
  // the division record the ranking follows, when every team has one;
  // otherwise it keeps the conference record (and its conference label)
  const division = groups.length > 1 ? group.division : null
  const divisionRecords = Boolean(division) && group.rows.every((r) => divRecords.has(r))
  const rows = divisionRecords ? group.rows.map((r) => ({ ...r, conf: divRecords.get(r)! })) : group.rows

  // The season picker's selected option, e.g. "2026-27 Men's Ice Hockey Standings"
  const season = html.match(/<option selected="selected"[^>]*>\s*(\d{4})/)

  return {
    rows,
    division,
    divisionRecords,
    hasPoints: ptsCol >= 0,
    confStarted: rows.some((r) => sumRecord(r.conf) > 0),
    seasonYear: season ? Number(season[1]) : null,
  }
}

async function fetchSport(sport: SportValue): Promise<SportStandings | null> {
  const source = SOURCES[sport]
  const entry = STANDINGS_SPORTS.find((s) => s.sport === sport)
  if (!source || !entry) return null
  const url = `${CONFERENCE_SITES[source.conference]}/standings.aspx?path=${source.path}`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'The Polytechnic (poly.rpi.edu) sports desk' },
      next: { revalidate: REFRESH_SECONDS },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const parsed = parseStandings(await res.text(), source.conference)
    if (!parsed) throw new Error('standings table not recognised')
    const standings: SportStandings = {
      sport,
      tabLabel: entry.tabLabel,
      conference: source.conference,
      sourceUrl: url,
      ...parsed,
    }
    lastGood.set(sport, standings)
    return standings
  } catch (err) {
    console.warn(`[standings] ${sport}: ${(err as Error).message}`)
    return lastGood.get(sport) ?? null
  }
}

/**
 * Standings for the sports the schedule picks today, in tab order. Every
 * sport's table is fetched (each cached for an hour) because the data checks
 * and summer hold-over need to know what each conference page shows.
 */
export async function getSportsStandings({
  now = new Date(),
  overrides,
}: { now?: Date; overrides?: StandingsOverride[] } = {}): Promise<SportStandings[]> {
  const fetched = (await Promise.all(STANDINGS_SPORTS.map((s) => fetchSport(s.sport)))).filter(
    (s): s is SportStandings => s !== null,
  )
  const bySport = new Map(fetched.map((s) => [s.sport, s]))

  const available = new Map<SportValue, StandingsAvailability>(
    fetched.map((s) => {
      const rpi = s.rows.find((r) => r.isRpi)
      return [s.sport, { seasonYear: s.seasonYear, rpiGames: rpi ? sumRecord(rpi.overall) : 0 }]
    }),
  )

  const selected = selectStandings({ now, available, overrides })
    .map((sport) => bySport.get(sport))
    .filter((s): s is SportStandings => s !== undefined)

  // Sports whose conference play hasn't begun (just a "hasn't started" note)
  // move behind those with a real table, so the card opens on something worth
  // reading. A men's/women's pair moves together, and order is otherwise kept.
  const groupOf = (s: SportStandings) => STANDINGS_SPORTS.find((e) => e.sport === s.sport)?.group ?? s.sport
  const startedGroups = new Set(selected.filter((s) => s.confStarted).map(groupOf))
  return [
    ...selected.filter((s) => startedGroups.has(groupOf(s))),
    ...selected.filter((s) => !startedGroups.has(groupOf(s))),
  ]
}
