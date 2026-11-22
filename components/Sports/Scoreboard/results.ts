import type { GameResult, GameTeam } from '@/components/FrontPage/types'
import { troyDay } from '@/lib/troyTime'

export const RPI_FALLBACK: GameTeam = {
  name: 'Rensselaer Polytechnic Institute', shortName: 'RPI', logo: null, url: 'https://rpiathletics.com',
}

export function gameSides(game: GameResult, rpiTeam: GameTeam) {
  const finished = game.rpiScore !== null && game.opponentScore !== null
  const difference = finished ? Number(game.rpiScore) - Number(game.opponentScore) : 0
  const rpi = { team: rpiTeam, score: game.rpiScore, result: Math.sign(difference), rpi: true }
  const opponent = { team: game.opponent, score: game.opponentScore, result: -rpi.result, rpi: false }
  return game.homeAway === 'away' ? [rpi, opponent] : [opponent, rpi]
}
export type ScoreSideData = ReturnType<typeof gameSides>[number]

export function scoreDigits(game: GameResult) {
  return String(Math.max(game.rpiScore ?? 0, game.opponentScore ?? 0)).length
}

// Game dates are editorial calendar days. Publication timestamps belong to Troy.
export function gameDay(date?: string | null, published?: string | null) {
  const day = date?.slice(0, 10) || (published && troyDay(new Date(published)))
  if (!day) return null
  const value = new Date(day + 'T12:00:00Z')
  return Number.isNaN(value.getTime()) ? null : value
}

export function dateLabel(date: Date | null, options: Intl.DateTimeFormatOptions) {
  return date?.toLocaleDateString('en-US', { ...options, timeZone: 'UTC' }) ?? ''
}

export function seriesSummary(games: GameResult[]) {
  const [first, last] = games.map((game) => gameDay(game.date))
  const weekend = first && last && [first, last].every(d => [5, 6, 0].includes(d.getUTCDay()))
    && Math.abs(+first - +last) <= 2 * 86400000
  let wins = 0, losses = 0, ties = 0
  for (const { rpiScore, opponentScore } of games) {
    if (rpiScore === null || opponentScore === null) continue
    if (rpiScore > opponentScore) wins++
    else if (rpiScore < opponentScore) losses++
    else ties++
  }
  const record = wins + losses + ties ? [wins, losses, ...(ties ? [ties] : [])].join('–') : ''
  return { weekend, record }
}

export function scoreSentence(game: GameResult, sides: ScoreSideData[], day: Date | null) {
  const ordered = sides[1].result > 0 ? [sides[1], sides[0]] : sides
  const heading = [game.status, dateLabel(day, { month: 'long', day: 'numeric' }), game.homeAway].filter(Boolean).join(', ')
  return heading + '. ' + ordered.map(({ team, score }) => team.shortName + ' ' + (score ?? 'score pending')).join(', ') + '.'
}
