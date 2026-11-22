'use client'

import { useEffect, useRef, useState } from 'react'
import type { GameResult, GameTeam } from '@/components/FrontPage/types'
import { dateLabel, gameDay, gameSides, scoreSentence } from './results'
import { ScoreSide } from './ScoreSide'

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
        if (!name || !side.querySelector('[data-team-logo]')) return true
        const gap = parseFloat(getComputedStyle(side).columnGap) || 0
        const others = [...side.children].filter(el => el !== name).reduce((w, el) => w + el.getBoundingClientRect().width, 0)
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
        <ScoreSide side={left} left size={size} hideName={hideNames} />
        <div aria-hidden="true" className={`flex flex-col items-center text-center font-meta uppercase ${lead ? 'gap-1' : 'gap-1.5'}`}>
          {lead && sport && <span className="max-w-24 text-[11px] leading-tight tracking-[0.1em] text-text-muted sm:max-w-none sm:text-xs lg:text-[13px]">{sport}</span>}
          <div className={`flex items-center ${lead ? 'gap-2 text-xs sm:gap-3 sm:text-base' : 'gap-1.5 text-[10px] sm:gap-2'}`}>
            <span className={left.result > 0 ? '' : 'invisible'}>◀</span>
            <span className={`max-w-32 text-balance break-words font-semibold leading-tight tracking-[0.08em] ${lead ? 'text-sm sm:text-lg lg:text-[22px]' : 'text-xs sm:text-[13px]'}`}>{game.status}</span>
            <span className={right.result > 0 ? '' : 'invisible'}>▶</span>
          </div>
          <span className={`tracking-[0.1em] text-text-muted ${lead ? 'text-[11px] sm:text-xs lg:text-[13px]' : 'text-[10px] sm:text-[11px]'}`}>
            {date}{!lead && <span className="max-sm:hidden">{date && ' · '}{game.homeAway}</span>}
          </span>
        </div>
        <ScoreSide side={right} left={false} size={size} hideName={hideNames} />
      </div>
    </div>
  )
}
