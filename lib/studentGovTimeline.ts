import type { Payload } from 'payload'
import { extractTextFromLexical, formatArticle } from '@/utils/formatArticle'
import { collectPages } from './collectPages'
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

/** Rank and deduplicate before loading images and authors for visible stories. */
export const ARTICLE_CANDIDATE_SELECT = {
  title: true, slug: true, kicker: true, featuredImage: true, publishedDate: true, createdAt: true,
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
  limit: number | null,
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
  // Scan lightweight candidates to EOF: neither false-positive kickers nor
  // duplicate archive copies may consume a visible slot or erase older terms.
  const [articles, extra, updates] = await Promise.all([
    collectPages((page) => payload.find({
      collection: 'articles',
      where: {
        and: [
          { section: { equals: 'news' } },
          { _status: { equals: 'published' } },
          { or: meta.kickerQuery.map((word) => ({ kicker: { like: word } })) },
        ],
      },
      sort: ['-publishedDate', '-id'],
      limit: 500,
      page,
      depth: 0,
      select: ARTICLE_CANDIDATE_SELECT,
    }), (doc) => matchesKicker(body, doc.kicker)),
    included.length > 0
      ? collectPages((page) => payload.find({
          collection: 'articles',
          where: { and: [{ id: { in: [...included] } }, { _status: { equals: 'published' } }] },
          limit: 500,
          page,
          sort: 'id',
          depth: 0,
          select: ARTICLE_CANDIDATE_SELECT,
        }))
      : Promise.resolve([]),
    collectPages((page) => payload.find({
        collection: 'student-gov-updates',
        where: { body: { equals: body } },
        sort: ['-date', '-id'],
        limit: 500,
        page,
        depth: 0,
        select: { title: true, blurb: true, date: true },
      }))
      // Table may not exist yet (before the migration runs)
      .catch(() => []),
  ])

  const seen = new Set<number>()
  const candidates = [...articles, ...extra].filter((doc) => {
    if (seen.has(doc.id) || !doc.slug) return false
    seen.add(doc.id)
    return true
  })
  const stories = dropDuplicateStories(candidates, (doc) => ({
    id: doc.id, title: extractTextFromLexical(doc.title),
    date: doc.publishedDate || doc.createdAt, hasImage: Boolean(doc.featuredImage),
  }))
  const ranked = [
    ...stories.map(doc => ({ kind: 'article' as const, id: doc.id, date: doc.publishedDate || doc.createdAt })),
    ...updates.map(doc => ({ kind: 'update' as const, ...doc })),
  ].filter((item) => !hidden.has(entryKey(item.kind, item.id)))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit ?? undefined)
  const hydrated = await getArticlesById(payload, ranked.filter(item => item.kind === 'article').map(item => item.id))
  return ranked.flatMap((item): TimelineItem[] => {
    if (item.kind === 'update') return [item]
    const article = hydrated.get(item.id)
    return article ? [{ ...item, article }] : []
  })
}

/** Published articles by id (for pinned boxes), keyed by id */
export async function getArticlesById(
  payload: Payload,
  ids: number[],
): Promise<Map<number, ComponentArticle>> {
  if (ids.length === 0) return new Map()
  const response = await collectPages((page) => payload.find({
    collection: 'articles',
    where: {
      and: [{ id: { in: ids } }, { _status: { equals: 'published' } }],
    },
    limit: 500,
    page,
    sort: 'id',
    depth: 1,
    select: ARTICLE_SELECT,
  }))
  const map = new Map<number, ComponentArticle>()
  for (const doc of response) {
    const article = formatArticle(doc)
    if (article) map.set(doc.id, article)
  }
  return map
}
