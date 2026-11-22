import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameResult } from '@/components/FrontPage/types'
import { linkArticleGames } from '@/lib/schedule'
import { fetchSidearm } from '@/lib/sidearm'

vi.mock('@/lib/sidearm', () => ({ fetchSidearm: vi.fn() }))

const game: GameResult = {
  opponent: { name: 'Union College', shortName: 'Union', logo: null, url: null },
  homeAway: 'home',
  rpiScore: 4,
  opponentScore: 0,
  status: 'Final',
  date: '2026-10-16T12:00:00Z',
}

const event = {
  id: 1,
  date: '2026-10-16T19:00:00',
  location_indicator: 'H',
  sport: { global_sport_shortname: 'mhockey' },
  opponent: { title: 'Union' },
  result: {
    status: 'W',
    team_score: '4',
    opponent_score: '0',
    recap: { url: '/news/hockey-recap' },
    boxscore: { url: '/sports/mens-ice-hockey/stats/boxscore/1' },
  },
}

function respond(...events: unknown[]) {
  vi.mocked(fetchSidearm).mockResolvedValueOnce(Response.json([{ events }]))
}

describe('scoreboard game links', () => {
  beforeEach(() => vi.mocked(fetchSidearm).mockReset())

  it('finds a dated game in its own month and prefers the same recap link as the score strip', async () => {
    respond(event)
    const [linked] = await linkArticleGames([game], 'mens-ice-hockey')
    expect(linked.link).toBe('https://rpiathletics.com/news/hockey-recap')
    expect(fetchSidearm).toHaveBeenCalledWith(expect.stringContaining('date=10/15/2026'))
  })

  it('uses the box score when the recap is missing and can use the lead date override', async () => {
    respond({ ...event, result: { ...event.result, recap: null } })
    const [linked] = await linkArticleGames([{ ...game, date: null }], 'mens-ice-hockey', '2026-10-16')
    expect(linked.link).toBe('https://rpiathletics.com/sports/mens-ice-hockey/stats/boxscore/1')
  })

  it('rejects date, sport, opponent and score mismatches and leaves an undated game alone', async () => {
    respond(
      { ...event, date: '2026-10-15T19:00:00' },
      { ...event, sport: { global_sport_shortname: 'whockey' } },
      { ...event, opponent: { title: 'Yale' } },
      { ...event, result: { ...event.result, opponent_score: '2' } },
    )
    const undated = { ...game, date: null }
    expect(await linkArticleGames([game, undated], 'mens-ice-hockey')).toEqual([game, undated])
  })

  it('leaves ambiguous games unlinked and makes only one request for two games in the same month', async () => {
    respond(event, { ...event, id: 2, date: '2026-10-16T21:15:00' })
    expect(await linkArticleGames([game, { ...game, date: '2026-10-17' }], 'mens-ice-hockey')).toEqual([
      game, { ...game, date: '2026-10-17' },
    ])
    expect(fetchSidearm).toHaveBeenCalledTimes(1)
  })
})
