import { Suspense } from 'react'
import type { GameResult, GameTeam } from '@/components/FrontPage/types'
import { linkArticleGames } from '@/lib/schedule'
import { dateLabel, gameDay, gameSides, scoreSentence, seriesSummary } from './results'
import { GameStatus } from './GameStatus'
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
    <div role="group" aria-label={weekend ? 'Weekend results' : 'Series results'} className={lead ? 'pb-4 sm:pb-5' : ''}>
      <p className="mb-3 text-center font-meta text-[11px] font-semibold uppercase tracking-[0.1em] text-text-main sm:mb-3.5 sm:text-xs">
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
            <div key={index} className="@container min-w-0 px-1 sm:px-3">
              <p className="sr-only">{scoreSentence(game, sides, day)}</p>
              <div className="flex flex-col items-center gap-2 text-center font-meta sm:gap-2.5">
                <div aria-hidden="true" className="text-[10px] font-semibold uppercase tracking-[0.1em] sm:text-[11px]">
                  {day ? dateLabel(day, { weekday: 'short' }) : `Game ${index + 1}`}
                  <span className="text-text-muted">{day && ' · ' + dateLabel(day, { month: 'short', day: 'numeric' })}
                    <span className="max-sm:hidden"> · {game.homeAway}</span>
                  </span>
                </div>
                <div className="flex w-full items-center justify-center gap-0.5 min-[360px]:gap-1.5 sm:gap-3 sm:@max-[250px]:gap-2">
                  <ScoreSide side={left} left size={size} compactScores={compactScores} />
                  <span aria-hidden="true" className="shrink-0 text-[9px] sm:text-[11px]">{left.result > 0 ? '◀' : right.result > 0 ? '▶' : null}</span>
                  <ScoreSide side={right} left={false} size={size} compactScores={compactScores} />
                </div>
                <GameStatus game={game} className="max-w-full break-words text-[10px] font-semibold uppercase tracking-[0.08em] sm:text-xs" />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

type GameScoresProps = {
  games: GameResult[]
  rpiTeam: GameTeam
  lead?: boolean
  sport?: string | null
  dateOverride?: string | null
  published?: string | null
}

export function GameScores({ games, rpiTeam, lead = false, sport, dateOverride, published }: GameScoresProps) {
  if (!games.length) return null
  const scores = games.length === 1
    ? <ScoreboardBar game={games[0]} rpiTeam={rpiTeam} lead={lead} sport={sport} dateOverride={dateOverride} published={published} />
    : <SeriesBoards games={games} rpiTeam={rpiTeam} lead={lead} sport={sport} />
  return lead ? scores : <div className="mt-1.5 border-y border-rule py-3.5 sm:py-4">{scores}</div>
}

type LinkedGameScoresProps = GameScoresProps & { sportValue?: string | null }

async function ResolvedGameScores({ sportValue, ...props }: LinkedGameScoresProps) {
  const games = await linkArticleGames(props.games, sportValue, props.dateOverride).catch((error: Error) => {
    console.warn(`[schedule] Article score links: ${error.message}`)
    return props.games
  })
  return <GameScores {...props} games={games} />
}

export function LinkedGameScores(props: LinkedGameScoresProps) {
  return (
    <Suspense fallback={<GameScores {...props} />}>
      <ResolvedGameScores {...props} />
    </Suspense>
  )
}
