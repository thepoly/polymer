import type { GameResult, GameTeam } from '@/components/FrontPage/types'
import { dateLabel, gameDay, gameSides, scoreSentence, seriesSummary } from './results'
import { ScoreboardBar } from './ScoreboardBar'
import { ScoreSide } from './ScoreSide'

function SeriesBoards({ games, rpiTeam, lead, sport }: {
  games: GameResult[]
  rpiTeam: GameTeam
  lead: boolean
  sport?: string | null
}) {
  const { weekend, record } = seriesSummary(games)
  const label = weekend ? 'Weekend series' : 'Series'
  return (
    <div role="group" aria-label={weekend ? 'Weekend results' : 'Series results'} className={lead ? 'pb-3.5' : ''}>
      <p className="mb-2.5 text-center font-meta text-[11px] font-semibold uppercase tracking-[0.1em] text-text-main sm:text-xs">
        {lead && sport && <>{sport}<span className="px-1.5 text-text-muted">·</span></>}
        <span className={lead && sport ? 'text-text-muted' : ''}>{lead && weekend ? 'Weekend' : label}</span>
        {record && <span className="font-medium text-text-muted"><span className="px-1.5">·</span>{record}</span>}
      </p>
      <div className="grid grid-cols-2 divide-x divide-rule">
        {games.map((game, index) => {
          const day = gameDay(game.date)
          const sides = gameSides(game, rpiTeam)
          const [left, right] = sides
          const size = lead ? 'seriesLead' : 'seriesArticle'
          const compactScores = Math.max(game.rpiScore ?? 0, game.opponentScore ?? 0) >= 100
          return (
            <div key={index} className="min-w-0 px-1 sm:px-3">
              <p className="sr-only">{scoreSentence(game, sides, day)}</p>
              <div aria-hidden="true" className="flex flex-col items-center gap-1.5 text-center font-meta sm:gap-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.1em] sm:text-[11px]">
                  {day ? dateLabel(day, { weekday: 'short' }) : `Game ${index + 1}`}
                  <span className="text-text-muted">{day && ' · ' + dateLabel(day, { month: 'short', day: 'numeric' })}
                    <span className="max-sm:hidden"> · {game.homeAway}</span>
                  </span>
                </div>
                <div className="flex w-full items-center justify-center gap-1 max-[359px]:gap-0.5 sm:gap-2">
                  <ScoreSide side={left} left size={size} compactScores={compactScores} />
                  <span className="shrink-0 text-[9px] sm:text-[11px]">{left.result > 0 ? '◀' : right.result > 0 ? '▶' : null}</span>
                  <ScoreSide side={right} left={false} size={size} compactScores={compactScores} />
                </div>
                <span className="max-w-full break-words text-[10px] font-semibold uppercase tracking-[0.08em] sm:text-xs">{game.status}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function GameScores({ games, rpiTeam, lead = false, sport, dateOverride, published }: {
  games: GameResult[]
  rpiTeam: GameTeam
  lead?: boolean
  sport?: string | null
  dateOverride?: string | null
  published?: string | null
}) {
  if (!games.length) return null
  const scores = games.length === 1
    ? <ScoreboardBar game={games[0]} rpiTeam={rpiTeam} lead={lead} sport={sport} dateOverride={dateOverride} published={published} />
    : <SeriesBoards games={games} rpiTeam={rpiTeam} lead={lead} sport={sport} />
  return lead ? scores : <div className="mt-1.5 border-y border-rule py-3">{scores}</div>
}
