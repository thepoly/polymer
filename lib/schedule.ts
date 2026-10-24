// RPI's games for the /sports score strip, read from rpiathletics.com's
// calendar feed (the JSON behind the site's own calendar widget; Sidearm, the
// same platform as the conference standings pages). It isn't an official API:
// if a fetch fails or the feed changes, the last good data keeps showing, and
// a sport with no usable games is left out of the strip.
import type { SportValue } from './sports'

const SITE = 'https://rpiathletics.com'
const REFRESH_SECONDS = 60 * 60
/** Windows always fetched, in months from today: one back, two ahead */
const BASE_MONTHS = [-1, 0, 1, 2]
/** Furthest back to look for a sport's last finals (holds spring sports over the summer) */
const MAX_LOOKBACK_MONTHS = 8
/** A longer break between two games ends a season */
const SEASON_GAP_DAYS = 60
const CELLS = 3

// Sidearm's sport codes (global_sport_shortname) → ours. The conference sites
// use the same codes in their standings URLs.
const FEED_SPORTS: Record<string, SportValue> = {
  mhockey: 'mens-ice-hockey',
  whockey: 'womens-ice-hockey',
  football: 'football',
  mbball: 'mens-basketball',
  wbball: 'womens-basketball',
  msoc: 'mens-soccer',
  wsoc: 'womens-soccer',
  mlax: 'mens-lacrosse',
  wlax: 'womens-lacrosse',
  baseball: 'baseball',
  softball: 'softball',
  fhockey: 'field-hockey',
  mswim: 'mens-swimming-and-diving',
  wswim: 'womens-swimming-and-diving',
  mtrack: 'mens-track-and-field',
  wtrack: 'womens-track-and-field',
  mcross: 'mens-cross-country',
  wcross: 'womens-cross-country',
  mten: 'mens-tennis',
  wten: 'womens-tennis',
  golf: 'golf',
}

// The parts of the feed used here
type FeedLink = { url: string | null } | null
type FeedEvent = {
  id: number
  /** Troy local time, no offset: "2026-10-24T19:00:00" */
  date: string
  /** As RPI shows it: "7:05 PM", "TBA", or empty */
  time: string | null
  location_indicator: string
  /** A upcoming, O played, P postponed, C canceled */
  status: string
  sport: { global_sport_shortname: string } | null
  opponent: {
    title: string
    prefix: string | null
    image: { filename: string | null; path: string | null } | null
  } | null
  result: {
    status: string | null
    team_score: string | null
    opponent_score: string | null
    postscore_info: string | null
    boxscore: FeedLink
    recap: FeedLink
  } | null
}

export type ScheduleOpponent = {
  name: string
  shortName: string
  logo: string | null
  /** Poll ranking shown before the name, e.g. "#7" */
  rank: string | null
}

export type ScheduleGame = {
  id: number
  /** Troy local date and time, "2026-10-24T19:00:00" */
  date: string
  /** Start time as RPI lists it ("7:05 PM"); null when not set */
  time: string | null
  homeAway: 'home' | 'away' | 'neutral'
  opponent: ScheduleOpponent
  /** Set once the game is final */
  result: {
    outcome: 'W' | 'L' | 'T'
    rpiScore: number
    opponentScore: number
    /** "OT", "2OT", or innings played when not the usual count */
    note: string | null
  } | null
  /** Recap, else box score, for finals */
  link: string | null
}

export type SportSchedule = {
  sport: SportValue
  scheduleUrl: string
  /** Up to three games, oldest first */
  games: ScheduleGame[]
}

// Last good response per window, for when a refresh fails
const lastGood = new Map<string, FeedEvent[]>()

/** Today as YYYY-MM-DD in Troy, the feed's time zone */
function localDay(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** "2026-10" plus n months */
function addMonths(day: string, n: number): string {
  const d = new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1 + n, 1))
  return d.toISOString().slice(0, 7)
}

const dayNumber = (date: string) =>
  Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))) / 86_400_000

const absolute = (url: string | null | undefined) =>
  url ? (url.startsWith('/') ? `${SITE}${url}` : url) : null

const parseScore = (s: string | null | undefined) => (s && /^\d+$/.test(s.trim()) ? Number(s) : null)

/** "University of Rochester" → "Rochester", "Skidmore College" → "Skidmore" */
const shortSchoolName = (name: string) =>
  name
    .replace(/^(The )?University of /, '')
    .replace(/ (University|College)$/, '')
    .trim()

/** "(OT)" → "OT", "(5 innings)" → "5"; anything longer is dropped */
function resultNote(info: string | null | undefined): string | null {
  const note = (info ?? '').replace(/[()]/g, '').trim()
  const innings = note.match(/^(\d+) innings$/i)
  if (innings) return innings[1]
  return note && note.length <= 6 ? note.toUpperCase() : null
}

/** A plain clock time; tournament blurbs ("FRI 6 PM / SAT 12 PM") and TBA are dropped */
function startTime(time: string | null | undefined): string | null {
  const t = (time ?? '').trim()
  return /^\d{1,2}(:\d{2})? ?[AP]\.?M\.?$/i.test(t) ? t : null
}

/** One month's calendar grid (about six weeks, every sport) */
async function fetchWindow(month: string): Promise<FeedEvent[]> {
  const url = `${SITE}/services/responsive-calendar.ashx?type=month&sport=0&date=${month.slice(5, 7)}/15/${month.slice(0, 4)}`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'The Polytechnic (poly.rpi.edu) sports desk' },
      next: { revalidate: REFRESH_SECONDS },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const days = (await res.json()) as { events?: FeedEvent[] | null }[]
    if (!Array.isArray(days)) throw new Error('calendar response not recognised')
    const events = days.flatMap((d) => d.events ?? [])
    lastGood.set(month, events)
    return events
  } catch (err) {
    console.warn(`[schedule] ${month}: ${(err as Error).message}`)
    return lastGood.get(month) ?? []
  }
}

/**
 * A final, or a game still to come. Postponed and canceled games, and past
 * games RPI never posted a result for, are skipped.
 */
function toGame(e: FeedEvent, today: string): ScheduleGame | null {
  if (!e.opponent?.title || !/^\d{4}-\d{2}-\d{2}/.test(e.date)) return null
  const r = e.result
  const outcome = r?.status === 'W' || r?.status === 'L' || r?.status === 'T' ? r.status : null
  const rpiScore = parseScore(r?.team_score)
  const opponentScore = parseScore(r?.opponent_score)
  const result: ScheduleGame['result'] =
    outcome && rpiScore !== null && opponentScore !== null
      ? { outcome, rpiScore, opponentScore, note: resultNote(r?.postscore_info) }
      : null
  if (!result && (e.status === 'P' || e.status === 'C' || e.date.slice(0, 10) < today)) return null

  const image = e.opponent.image
  // Postseason games carry the round: "Clarkson University | ECAC Opening Round"
  const name = e.opponent.title.split(' | ')[0].trim()
  return {
    id: e.id,
    date: e.date,
    time: startTime(e.time),
    homeAway: e.location_indicator === 'A' ? 'away' : e.location_indicator === 'N' ? 'neutral' : 'home',
    opponent: {
      name,
      shortName: shortSchoolName(name),
      logo: image?.filename ? `${SITE}${image.path ?? '/images/logos'}/${encodeURIComponent(image.filename)}` : null,
      rank: e.opponent.prefix?.trim() || null,
    },
    result,
    link: result ? absolute(r?.recap?.url) ?? absolute(r?.boxscore?.url) : null,
  }
}

/**
 * Three games, oldest first: normally the last two finals and the next game.
 * Missing games are filled from the other side: after the last game, the last
 * three finals; early on, one final and the next two; before the opener, the
 * first three games. Only the current season counts, so a new season never
 * shows last season's finals.
 */
function pickGames(games: ScheduleGame[]): ScheduleGame[] {
  const sorted = [...games].sort((a, b) => a.date.localeCompare(b.date))

  // Seasons are split at long breaks; use the one the next game belongs to,
  // else the most recent
  const seasons: ScheduleGame[][] = []
  for (const game of sorted) {
    const current = seasons.at(-1)
    const previous = current?.at(-1)
    if (current && previous && dayNumber(game.date) - dayNumber(previous.date) <= SEASON_GAP_DAYS) {
      current.push(game)
    } else {
      seasons.push([game])
    }
  }
  const season = seasons.find((s) => s.some((g) => !g.result)) ?? seasons.at(-1) ?? []

  const finals = season.filter((g) => g.result)
  const upcoming = season.filter((g) => !g.result)
  let upcomingCount = Math.min(1, upcoming.length)
  const finalCount = Math.min(finals.length, CELLS - upcomingCount)
  upcomingCount = Math.min(upcoming.length, CELLS - finalCount)
  return [...finals.slice(finals.length - finalCount), ...upcoming.slice(0, upcomingCount)]
}

/**
 * Each sport's three games for the score strip, in the order given (the
 * standings card's sports). Sports with no games are left out.
 */
export async function getSportsSchedule(sports: SportValue[], now = new Date()): Promise<SportSchedule[]> {
  if (sports.length === 0) return []
  const today = localDay(now)
  const wanted = new Set(sports)
  const bySport = new Map<SportValue, Map<number, ScheduleGame>>(sports.map((s) => [s, new Map()]))

  const add = (events: FeedEvent[]) => {
    for (const e of events) {
      const sport = FEED_SPORTS[e.sport?.global_sport_shortname ?? '']
      if (!sport || !wanted.has(sport)) continue
      const game = toGame(e, today)
      if (game) bySport.get(sport)?.set(game.id, game)
    }
  }

  ;(await Promise.all(BASE_MONTHS.map((n) => fetchWindow(addMonths(today, n))))).forEach(add)

  // Look further back when a sport is short of finals and no season break
  // shows before its earliest game yet; a sport with no games at all needs
  // last season's finals over the off-season. The older months are fetched
  // together, so a slow feed costs one timeout rather than one per month;
  // pickGames ignores anything from an earlier season.
  const needsMore = (sport: SportValue) => {
    const games = [...(bySport.get(sport)?.values() ?? [])]
    if (games.filter((g) => g.result).length >= CELLS) return false
    if (games.length === 0) return true
    const earliest = Math.min(...games.map((g) => dayNumber(g.date)))
    return earliest - dayNumber(`${addMonths(today, BASE_MONTHS[0])}-01`) < SEASON_GAP_DAYS
  }
  if (sports.some(needsMore)) {
    const older = Array.from({ length: MAX_LOOKBACK_MONTHS + BASE_MONTHS[0] }, (_, i) => addMonths(today, BASE_MONTHS[0] - 1 - i))
    ;(await Promise.all(older.map(fetchWindow))).forEach(add)
  }

  return sports
    .map((sport) => ({
      sport,
      scheduleUrl: `${SITE}/sports/${sport}/schedule`,
      games: pickGames([...(bySport.get(sport)?.values() ?? [])]),
    }))
    .filter((s) => s.games.length > 0)
}
