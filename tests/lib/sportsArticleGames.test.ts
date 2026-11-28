import { describe, expect, it } from 'vitest'
import { getGames } from '@/utils/getGames'
import { dateLabel, gameDay, gameSides, RPI_FALLBACK, scoreSentence, seriesSummary } from '@/components/Sports/Scoreboard/results'

const brown = { name: 'Brown University', shortName: 'Brown' }
const yale = { name: 'Yale University', shortName: 'Yale' }
const legacy = { section: 'sports', opponent: brown, rpiScore: 4, opponentScore: 0, gameStatus: 'Final' }
const games = getGames({ ...legacy, games: [
  { opponent: brown, date: '2026-11-20', rpiScore: 4, opponentScore: 0 },
  { opponent: yale, date: '2026-11-21', rpiScore: 2, opponentScore: 3, status: 'Final/OT' },
] })

describe('sports article games', () => {
  it('reads legacy shutouts, prefers ordered new rows and omits unpopulated opponents', () => {
    expect(getGames(legacy)[0]).toMatchObject({ rpiScore: 4, opponentScore: 0, date: null })
    expect(games.map(g => g.opponent.shortName)).toEqual(['Brown', 'Yale'])
    expect(getGames({ ...legacy, games: [{ opponent: 5 }] })).toEqual([])
    expect(getGames({ ...legacy, section: 'news' })).toEqual([])
    expect(getGames({ section: 'sports' })).toEqual([])
  })

  it('distinguishes a split weekend from games on different weekends', () => {
    expect(seriesSummary(games)).toEqual({ weekend: true, record: '1–1' })
    expect(seriesSummary([games[0], { ...games[1], date: '2026-11-28' }]).weekend).toBe(false)
    expect(seriesSummary([games[0], { ...games[1], date: null }]).weekend).toBeFalsy()
  })

  it('counts ties, skips pending games and treats zero as a score', () => {
    const [tie, pending] = getGames({ section: 'sports', games: [
      { opponent: brown, rpiScore: 0, opponentScore: 0 }, { opponent: yale, status: '7:00 PM' },
    ] })
    expect(seriesSummary([tie, pending]).record).toBe('0–0–1')
    for (const game of [tie, pending]) {
      expect(gameSides(game, RPI_FALLBACK).every(s => s.result === 0)).toBe(true)
    }
    expect(pending.status).toBe('7:00 PM')
    expect(seriesSummary([pending, pending]).record).toBe('')
  })

  it('puts away teams first visually and winners first in the spoken score', () => {
    for (const site of ['away', 'neutral', 'home'] as const) {
      const game = { ...games[1], homeAway: site }
      const sides = gameSides(game, RPI_FALLBACK)
      expect(sides[0].rpi).toBe(site === 'away')
      expect(scoreSentence(game, sides, gameDay(game.date))).toContain('Yale 3, RPI 2')
    }
  })

  it('preserves editorial calendar dates and uses Troy time for the publication fallback', () => {
    const midnight = '2026-11-21T00:00:00.000Z'
    expect(dateLabel(gameDay(midnight), { weekday: 'short' })).toBe('Sat')
    expect(dateLabel(gameDay(null, midnight), { weekday: 'short' })).toBe('Fri')
  })
})
