import type { Payload } from 'payload'
import { formatArticle } from '@/utils/formatArticle'
import type { Article as ComponentArticle } from '@/components/FrontPage/types'
import { STUDENT_GOV, matchesKicker, type StudentGovBody, type TimelineItem } from '@/components/News/studentGov'
import { entryKey } from '@/components/News/timelinePage'
import { dropDuplicateStories } from '@/components/News/studentGovTerms'

export const ARTICLE_SELECT = {
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
 * news articles whose kicker matches the body in any capitalisation, the
 * articles added from the archive finder (`included`, any kicker or
 * section), and the body's updates (collection `student-gov-updates`).
 */
export async function getStudentGovTimeline(
  payload: Payload,
  body: StudentGovBody,
  limit: number,
  {
    hidden = new Set(),
    included = [],
  }: {
    /** `entryKey`s hidden in the page editor; left out of the result */
    hidden?: ReadonlySet<string>
    /** Article ids added from the archive in the page editor */
    included?: readonly number[]
  } = {},
): Promise<TimelineItem[]> {
  const meta = STUDENT_GOV[body]
  // Fetch enough to still fill `limit` after dropping hidden entries and
  // kickers that only contain the word ("School Board", "Faculty Senate")
  const fetchLimit = Math.max(limit, 50) + hidden.size
  const [articles, extra, updates] = await Promise.all([
    payload.find({
      collection: 'articles',
      where: {
        and: [
          { section: { equals: 'news' } },
          { _status: { equals: 'published' } },
          { or: meta.kickerQuery.map((word) => ({ kicker: { like: word } })) },
        ],
      },
      sort: '-publishedDate',
      limit: fetchLimit,
      depth: 1,
      select: ARTICLE_SELECT,
    }),
    included.length > 0
      ? payload.find({
          collection: 'articles',
          where: { and: [{ id: { in: [...included] } }, { _status: { equals: 'published' } }] },
          limit: included.length,
          depth: 1,
          select: ARTICLE_SELECT,
        })
      : Promise.resolve({ docs: [] }),
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
  const seen = new Set<number>()
  for (const doc of [...articles.docs.filter((d) => matchesKicker(body, d.kicker)), ...extra.docs]) {
    if (seen.has(doc.id)) continue
    seen.add(doc.id)
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

  // One copy of each story (the archive has duplicates), chosen before hidden
  // entries drop out so the page matches the dashboard editor
  const unique = dropDuplicateStories(items, (item) =>
    item.kind === 'article'
      ? { id: Number(item.id), title: item.article.title, date: item.date, hasImage: Boolean(item.article.image) }
      : null,
  )

  return unique
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
