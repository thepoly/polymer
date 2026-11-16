import type { Payload } from 'payload'
import { formatArticle } from '@/utils/formatArticle'
import type { Article as ComponentArticle } from '@/components/FrontPage/types'
import { ARTICLE_SELECT } from '@/lib/studentGovTimeline'
import { NEWS_TOPICS, TOPIC_CARDS, topicOf, type NewsTopicKey } from '@/components/News/newsTopics'

/**
 * Newest published news stories for each topic row on /news, from the whole
 * archive (no date window), so a topic that's quiet lately still fills.
 * Returns a few more than a row shows, so the page can skip stories already
 * placed higher up and still have six.
 */
export async function getNewsTopicArticles(
  payload: Payload,
): Promise<Record<NewsTopicKey, ComponentArticle[]>> {
  const out = Object.fromEntries(NEWS_TOPICS.map((t) => [t.key, [] as ComponentArticle[]])) as Record<
    NewsTopicKey,
    ComponentArticle[]
  >
  // Enough that stories above the row can be skipped and six still remain
  const perTopic = TOPIC_CARDS + 12
  const kickers = NEWS_TOPICS.flatMap((t) => t.kickers as readonly string[])
  const res = await payload.find({
    collection: 'articles',
    where: {
      and: [
        { section: { equals: 'news' } },
        { _status: { equals: 'published' } },
        // `like` narrows the query; the exact match is checked below
        { or: kickers.map((k) => ({ kicker: { like: k } })) },
      ],
    },
    sort: '-publishedDate',
    limit: 400,
    depth: 1,
    select: ARTICLE_SELECT,
  })
  for (const doc of res.docs) {
    const topic = topicOf(doc.kicker)
    if (!topic || out[topic].length >= perTopic) continue
    const article = formatArticle(doc)
    if (article) out[topic].push(article)
  }
  return out
}
