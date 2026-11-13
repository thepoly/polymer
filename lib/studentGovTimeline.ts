import type { Payload } from 'payload'
import { formatArticle } from '@/utils/formatArticle'
import type { Article as ComponentArticle } from '@/components/FrontPage/types'
import { STUDENT_GOV, type StudentGovBody, type TimelineItem } from '@/components/News/studentGov'
import { entryKey } from '@/components/News/timelinePage'

const ARTICLE_SELECT = {
  title: true,
  slug: true,
  subdeck: true,
  featuredImage: true,
  section: true,
  kicker: true,
  publishedDate: true,
  createdAt: true,
  authors: true,
  writeInAuthors: true,
  isFollytechnic: true,
} as const

/**
 * Newest-first timeline for the Student Senate or Executive Board: published
 * news articles carrying the body's kicker, mixed with its updates
 * (collection `student-gov-updates`).
 */
export async function getStudentGovTimeline(
  payload: Payload,
  body: StudentGovBody,
  limit: number,
  /** `entryKey`s hidden in the page editor; left out of the result */
  hidden: ReadonlySet<string> = new Set(),
): Promise<TimelineItem[]> {
  // Fetch enough to still fill `limit` after dropping hidden entries
  const fetchLimit = limit + hidden.size
  const [articles, updates] = await Promise.all([
    payload.find({
      collection: 'articles',
      where: {
        and: [
          { section: { equals: 'news' } },
          { kicker: { equals: STUDENT_GOV[body].kicker } },
          { _status: { equals: 'published' } },
        ],
      },
      sort: '-publishedDate',
      limit: fetchLimit,
      depth: 1,
      select: ARTICLE_SELECT,
    }),
    payload
      .find({
        collection: 'student-gov-updates',
        where: { body: { equals: body } },
        sort: '-date',
        limit: fetchLimit,
        depth: 0,
      })
      // Table may not exist yet (before the migration runs)
      .catch(() => ({ docs: [] as { id: number; title: string; blurb: string; date: string }[] })),
  ])

  const items: TimelineItem[] = []
  for (const doc of articles.docs) {
    const article = formatArticle(doc)
    if (!article) continue
    items.push({
      kind: 'article',
      id: doc.id,
      date: doc.publishedDate || doc.createdAt,
      article,
    })
  }
  for (const doc of updates.docs) {
    items.push({ kind: 'update', id: doc.id, date: doc.date, title: doc.title, blurb: doc.blurb })
  }

  return items
    .filter((item) => !hidden.has(entryKey(item.kind, item.id)))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)
}

/** Published articles by id (for pinned boxes), keyed by id */
export async function getArticlesById(
  payload: Payload,
  ids: number[],
): Promise<Map<number, ComponentArticle>> {
  if (ids.length === 0) return new Map()
  const response = await payload.find({
    collection: 'articles',
    where: {
      and: [{ id: { in: ids } }, { _status: { equals: 'published' } }],
    },
    limit: ids.length,
    depth: 1,
    select: ARTICLE_SELECT,
  })
  const map = new Map<number, ComponentArticle>()
  for (const doc of response.docs) {
    const article = formatArticle(doc)
    if (article) map.set(doc.id, article)
  }
  return map
}
