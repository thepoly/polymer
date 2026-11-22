import type { GameResult, GameTeam } from '@/components/FrontPage/types'
import type { School } from '@/payload-types'

type SchoolSummary = Pick<School, 'name' | 'shortName' | 'url' | 'athleticsUrl'>
type GameRow = {
  opponent?: SchoolSummary | number | null
  homeAway?: GameResult['homeAway'] | null
  date?: string | null
  rpiScore?: number | null
  opponentScore?: number | null
  status?: string | null
}
export type ArticleGameFields = Omit<GameRow, 'date' | 'status'> & {
  section: string
  games?: GameRow[] | null
  gameStatus?: string | null
}

export function schoolTeam(school: SchoolSummary, shortName = school.name): GameTeam {
  return { name: school.name, shortName: school.shortName || shortName, logo: school.url || null, url: school.athleticsUrl || null }
}

export function getGames(article: ArticleGameFields): GameResult[] {
  if (article.section !== 'sports') return []
  const rows: GameRow[] = article.games?.length ? article.games : [{ ...article, date: null, status: article.gameStatus }]
  return rows.slice(0, 2).flatMap((row) => {
    if (!row.opponent || typeof row.opponent !== 'object') return []
    return [{
      opponent: schoolTeam(row.opponent),
      homeAway: row.homeAway || 'home',
      date: row.date ?? null,
      rpiScore: row.rpiScore ?? null,
      opponentScore: row.opponentScore ?? null,
      status: row.status?.trim() || (row.rpiScore != null && row.opponentScore != null ? 'Final' : 'Scheduled'),
    }]
  })
}
