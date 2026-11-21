import type { Payload } from 'payload'
import type { Article as ComponentArticle } from '@/components/FrontPage/types'
import { ARTICLE_CANDIDATE_SELECT, getArticlesById } from '@/lib/studentGovTimeline'
import { collectPages } from './collectPages'
import { NEWS_TOPICS, TOPIC_CARDS, topicOf, type NewsTopicKey } from '@/components/News/newsTopics'

/**
 * Newest published news stories for each topic row on /news, from the whole
 * archive (no date window), so a topic that's quiet lately still fills.
 * Returns a few more than a row shows, so the page can skip stories already
 * placed higher up and still fill the four tablet cards (three elsewhere).
 */
export async function getNewsTopicArticles(
  payload: Payload,
): Promise<Record<NewsTopicKey, ComponentArticle[]>> {
  const out = Object.fromEntries(NEWS_TOPICS.map((t) => [t.key, [] as ComponentArticle[]])) as Record<
    NewsTopicKey,
    ComponentArticle[]
  >
  // Enough that stories above the row can be skipped and four still remain
  const perTopic = TOPIC_CARDS + 12
  const sets = await Promise.all(NEWS_TOPICS.map((topic) => collectPages((page) => payload.find({
    collection: 'articles',
    where: {
      and: [
        { section: { equals: 'news' } },
        { _status: { equals: 'published' } },
        // `like` narrows the query; the exact match is checked below
        { or: topic.kickers.map((k) => ({ kicker: { like: k } })) },
      ],
    },
    sort: ['-publishedDate', '-id'],
    limit: 50,
    page,
    depth: 0,
    select: ARTICLE_CANDIDATE_SELECT,
  }), (doc) => Boolean(doc.slug) && topicOf(doc.kicker) === topic.key, perTopic)))
  const articles = await getArticlesById(payload, [...new Set(sets.flatMap(set => set.map(doc => doc.id)))])
  NEWS_TOPICS.forEach((topic, index) => {
    out[topic.key] = sets[index].flatMap(doc => {
      const article = articles.get(doc.id)
      return article ? [article] : []
    })
  })
  return out
}
