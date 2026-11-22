import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Article } from '@/payload-types'
import { getGames } from '@/utils/getGames'
import { loadRpiTeam } from '@/lib/sportsPage'
import { LinkedGameScores } from '@/components/Sports/Scoreboard/GameScores'
import { RPI_FALLBACK } from '@/components/Sports/Scoreboard/results'

export async function articleScoreBand(article: Article) {
  const games = getGames(article)
  if (!games.length) return null
  const payload = await getPayload({ config })
  const team = await loadRpiTeam(payload)
  return <LinkedGameScores games={games} rpiTeam={team ?? RPI_FALLBACK} sportValue={article.sport} published={article.publishedDate || article.createdAt} />
}
