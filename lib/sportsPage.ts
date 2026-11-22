// Everything /sports shows besides its newest stories: the editors' layout and
// pinned stories, conference standings, RPI's schedule, and the schools whose
// names and logos go with them. A missing table or an unreachable source
// leaves its part of the page out; nothing here fails the page.
import type { Payload } from 'payload'
import { RPI_SCHOOL_NAME } from '@/collections/Schools'
import type { Article as ComponentArticle, GameTeam } from '@/components/FrontPage/types'
import type { SportsSectionPageProps } from '@/components/Sports/SportsSectionPage'
import type { StandingsTeam } from '@/components/Sports/SportsStandings'
import { schoolTeam } from '@/utils/getGames'
import { formatArticle } from '@/utils/formatArticle'
import { getSportsSchedule, type SportSchedule } from './schedule'
import { parseSportsLayout, type SportsLayout } from './sportsLayout'
import { getSportsStandings } from './standings'

/** Sport + game-result fields sports stories carry (opponent populates at depth 1) */
export const SPORTS_GAME_SELECT = {
  sport: true,
  games: true,
  opponent: true,
  homeAway: true,
  rpiScore: true,
  opponentScore: true,
  gameStatus: true,
} as const

export type SportsPageData = Omit<SportsSectionPageProps, 'title' | 'articles'>

type School = {
  name: string
  shortName?: string | null
  url?: string | null
  athleticsUrl?: string | null
}

/** The editors' layout; the defaults when none is saved or the table isn't there yet */
export async function loadSportsLayout(payload: Payload): Promise<SportsLayout> {
  try {
    const response = await payload.find({
      collection: 'sports-page-layout',
      limit: 1,
      depth: 0,
      select: { layout: true },
    })
    return parseSportsLayout(response.docs[0]?.layout)
  } catch {
    return parseSportsLayout(null)
  }
}

/**
 * Looks up the stories editors pinned. A pin that is no longer published
 * resolves to null, which leaves its slot to fill automatically.
 */
async function loadPinned(payload: Payload, layout: SportsLayout) {
  const ids = [
    ...new Set(
      [layout.lead, layout.belowLead, layout.belowLead2, ...layout.headlines, ...layout.featured].filter(
        (id): id is number => id !== null,
      ),
    ),
  ]
  const pinned = new Map<number, ComponentArticle | null>()
  if (ids.length > 0) {
    try {
      const response = await payload.find({
        collection: 'articles',
        where: { and: [{ id: { in: ids } }, { _status: { equals: 'published' } }] },
        limit: ids.length,
        depth: 1,
        select: {
          title: true,
          slug: true,
          subdeck: true,
          featuredImage: true,
          section: true,
          kicker: true,
          publishedDate: true,
          createdAt: true,
          authors: true,
          writeInAuthors: true,
          isFollytechnic: true,
          ...SPORTS_GAME_SELECT,
        },
      })
      for (const article of response.docs) pinned.set(article.id, formatArticle(article))
    } catch {
      // Slots fill automatically
    }
  }
  return (id: number | null): ComponentArticle | null => (id !== null ? pinned.get(id) ?? null : null)
}

/**
 * RPI's own record, the standings teams (which the conferences list by short
 * name) and the schedule's opponents (which RPI Athletics lists by full name),
 * in one query.
 */
async function loadSchools(payload: Payload, teamNames: string[], opponentNames: string[]): Promise<School[]> {
  try {
    const response = await payload.find({
      collection: 'schools',
      where: {
        or: [
          { name: { in: [RPI_SCHOOL_NAME, ...teamNames, ...opponentNames] } },
          ...(teamNames.length > 0 ? [{ shortName: { in: teamNames } }] : []),
        ],
      },
      pagination: false,
      depth: 0,
      // url is derived from filename, so both are needed
      select: { name: true, shortName: true, url: true, filename: true, athleticsUrl: true },
    })
    return response.docs
  } catch {
    // Schools table may not exist yet: no logos, and RPI Athletics' own names
    return []
  }
}

export async function loadRpiTeam(payload: Payload): Promise<GameTeam | null> {
  const [rpi] = await loadSchools(payload, [], [])
  return rpi ? schoolTeam(rpi, 'RPI') : null
}

export async function loadSportsPage(payload: Payload): Promise<SportsPageData> {
  const layout = await loadSportsLayout(payload)
  const pin = await loadPinned(payload, layout)

  // Standings for the sports the calendar (and any editor override) picks,
  // and the score strip: RPI's recent finals and next game in each of those
  // sports, in the card's order. Which sports those are is only known once
  // the tables are in, so the schedule starts loading alongside them and is
  // handed the answer when it arrives; a slow feed then costs one wait
  // instead of two in a row. When editors switch the strip off, RPI
  // Athletics isn't contacted at all, and a failure falls back to the plain
  // header rather than an error page.
  const standingsLoading = getSportsStandings({ overrides: layout.standingsOverrides })
  const [standings, schedule] = await Promise.all([
    standingsLoading,
    layout.showScoreStrip
      ? getSportsSchedule(standingsLoading.then((tables) => tables.map((t) => t.sport))).catch((err: Error) => {
          console.warn(`[schedule] ${err.message}`)
          return [] as SportSchedule[]
        })
      : Promise.resolve([] as SportSchedule[]),
  ])

  const teamNames = [...new Set(standings.flatMap((s) => s.rows.map((r) => r.team)))]
  const opponentNames = [...new Set(schedule.flatMap((s) => s.games.map((g) => g.opponent.name)))]
  const schools = await loadSchools(payload, teamNames, opponentNames)

  // RPI's own school record supplies its side of the scoreboard
  const rpi = schools.find((s) => s.name === RPI_SCHOOL_NAME)
  const rpiTeam = rpi ? schoolTeam(rpi, 'RPI') : null

  // Logos + athletics links for every team in the tables, matched to Schools
  // by short name (falling back to full name)
  const standingsTeams: Record<string, StandingsTeam> = {}
  for (const school of schools) {
    const key = school.shortName && teamNames.includes(school.shortName) ? school.shortName : school.name
    if (teamNames.includes(key) && !standingsTeams[key]) {
      standingsTeams[key] = { logo: school.url || null, url: school.athleticsUrl || null }
    }
  }

  // Opponents take the short name and logo from Schools when there is one, so
  // editors' logo fixes carry over; otherwise RPI Athletics' own
  const schoolsByName = new Map(schools.map((s) => [s.name, s]))
  const scheduleWithSchools = schedule.map((s) => ({
    ...s,
    games: s.games.map((g) => {
      const school = schoolsByName.get(g.opponent.name)
      if (!school) return g
      return {
        ...g,
        opponent: {
          ...g.opponent,
          shortName: school.shortName || g.opponent.shortName,
          logo: school.url || g.opponent.logo,
        },
      }
    }),
  }))

  return {
    pinnedLead: pin(layout.lead),
    pinnedBelowLead: pin(layout.belowLead),
    pinnedBelowLead2: pin(layout.belowLead2),
    pinnedHeadlines: layout.headlines.map(pin),
    pinnedFeatured: layout.featured.map(pin),
    showScoreboard: layout.showScoreboard,
    scoreboardDate: layout.scoreboardDate,
    leadTitleOverlay: layout.leadTitleOverlay,
    featuredFocus: layout.featuredFocus,
    rpiTeam,
    standings,
    standingsTeams,
    schedule: scheduleWithSchools,
  }
}
