'use client'

import { useEffect, useRef, useState } from 'react'
import type { GameResult, GameTeam } from '@/components/FrontPage/types'
import { dateLabel, gameDay, gameSides, scoreDigits, scoreSentence } from './results'
import { ScoreSide } from './ScoreSide'
import { GameStatus } from './GameStatus'

export function ScoreboardBar({ game, rpiTeam, lead, sport, dateOverride, published }: {
  game: GameResult
  rpiTeam: GameTeam
  lead: boolean
  sport?: string | null
  dateOverride?: string | null
  published?: string | null
}) {
  const sides = gameSides(game, rpiTeam)
  const [left, right] = sides
  const day = gameDay(dateOverride || game.date, published)
  const date = dateLabel(day, { weekday: lead ? undefined : 'short', month: 'short', day: 'numeric' })
  const size = lead ? 'singleLead' : 'singleArticle'
  const digits = scoreDigits(game)
  const board = useRef<HTMLDivElement>(null)
  const [hideNames, setHideNames] = useState(false)

  // A desktop lead may be narrower than an article. Measure the available
  // space on each side, including long school names and loaded web fonts.
  useEffect(() => {
    const root = board.current
    if (!root) return
    const measure = () => {
      const fits = [...root.querySelectorAll<HTMLElement>('[data-score-side]')].every(side => {
        const name = side.querySelector<HTMLElement>('[data-team-name]')
        const logo = side.querySelector('[data-team-logo]')
        const score = side.lastElementChild
        if (!name || !logo || !score) return true
        const gap = parseFloat(getComputedStyle(side).columnGap) || 0
        const others = logo.getBoundingClientRect().width + score.getBoundingClientRect().width
        return name.scrollWidth + others + gap * 2 <= side.clientWidth
      })
      setHideNames(!fits)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    document.fonts.ready.then(measure)
    return () => observer.disconnect()
  }, [game, rpiTeam])

  return (
    <div role="group" aria-label={/^final\b/i.test(game.status) ? 'Final score' : 'Game scoreboard'}>
      <p className="sr-only">{scoreSentence(game, sides, day)}</p>
      <div ref={board} className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center ${lead ? 'mb-3 gap-3 pb-3 sm:gap-8 sm:pb-4' : 'gap-2.5 min-[360px]:gap-3 sm:gap-6'}`}>
        <ScoreSide side={left} left size={size} digits={digits} hideName={hideNames} />
        <div className="grid grid-rows-[1fr_auto_1fr] justify-items-center gap-0.5 text-center font-meta uppercase">
          <div className="flex flex-col items-center justify-end gap-0.5">
            {lead && sport && <span aria-hidden="true" className="max-w-24 text-[11px] leading-tight tracking-[0.1em] text-text-muted sm:max-w-none sm:text-xs lg:text-[13px]">{sport}</span>}
            <GameStatus game={game} className={`max-w-32 text-balance break-words font-semibold leading-tight tracking-[0.08em] ${lead ? 'text-sm sm:text-lg lg:text-[22px]' : 'text-xs sm:text-[13px]'}`} />
          </div>
          <span data-score-arrow aria-hidden="true" className={`h-[1em] text-center leading-none ${lead ? 'text-xs sm:text-sm' : 'text-[10px]'}`}>{left.result > 0 ? '◀' : right.result > 0 ? '▶' : null}</span>
          <span aria-hidden="true" className={`tracking-[0.1em] text-text-muted ${lead ? 'text-[11px] sm:text-xs lg:text-[13px]' : 'text-[10px] sm:text-[11px]'}`}>
            {date}{!lead && <span className="max-sm:hidden">{date && ' · '}{game.homeAway}</span>}
          </span>
        </div>
        <ScoreSide side={right} left={false} size={size} digits={digits} hideName={hideNames} />
      </div>
    </div>
  )
}
