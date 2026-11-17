import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'
import { getStudentGovTimeline } from '@/lib/studentGovTimeline'
import { getNewsTopicArticles } from '@/lib/newsTopics'

const article = (id: number, kicker = 'Student Senate') => ({
  id, kicker, title: `Story ${id}`, slug: `story-${id}`, section: 'news', _status: 'published',
  publishedDate: new Date(Date.UTC(2026, 10, 17) - id * 86400000).toISOString(),
  createdAt: '2026-01-01T12:00:00.000Z', featuredImage: 1 as number | null,
})
type Story = ReturnType<typeof article>
type Query = {
  collection: string; page?: number; limit?: number; depth?: number;
  where?: { and?: { id?: { in: number[] }; or?: { kicker: { like: string } }[] }[] };
}

function archive(stories: Story[]) {
  const hydrated: number[] = []
  const find = vi.fn(async (q: Query) => {
    let docs = q.collection === 'articles' ? stories.filter(doc => doc._status === 'published') : []
    if (q.collection === 'articles') {
      expect(JSON.stringify(q.where)).toContain('published')
      const ids = q.where?.and?.find(c => c.id)?.id?.in
      const kickers = q.where?.and?.find(c => c.or)?.or?.map(c => c.kicker.like.toLowerCase())
      if (ids) docs = docs.filter(doc => ids.includes(doc.id))
      if (kickers) docs = docs.filter(doc => kickers.some(k => doc.kicker.toLowerCase().includes(k)))
    }
    const start = ((q.page ?? 1) - 1) * (q.limit ?? 10)
    const page = docs.slice(start, start + (q.limit ?? 10))
    if (q.depth === 1) hydrated.push(...page.map(doc => doc.id))
    return {
      docs: page.map(doc => ({ ...doc, featuredImage: q.depth === 1 && doc.featuredImage ? { url: '/photo.jpg' } : doc.featuredImage })),
      hasNextPage: start + page.length < docs.length,
    }
  })
  return { payload: { find } as unknown as Payload, find, hydrated }
}

describe('News archive pagination', () => {
  it('fills a docket beyond a full page of false-positive kickers, hydrating only its stories', async () => {
    const db = archive([
      ...Array.from({ length: 600 }, (_, i) => article(i + 1, 'Faculty Senate')),
      ...Array.from({ length: 3 }, (_, i) => article(i + 601)),
    ])
    expect((await getStudentGovTimeline(db.payload, 'senate', 3)).map(item => item.id)).toEqual([601, 602, 603])
    expect(db.hydrated).toEqual([601, 602, 603])
  })

  it('retains the full historical timeline beyond 1000 entries', async () => {
    const db = archive(Array.from({ length: 1101 }, (_, i) => article(i + 1)))
    const result = await getStudentGovTimeline(db.payload, 'senate', null)
    expect(result).toHaveLength(1101)
    expect(result.at(-1)?.id).toBe(1101)
  })

  it('chooses a duplicate before hiding it, without using a slot for that hidden copy', async () => {
    const first = { ...article(1), title: 'Duplicate', featuredImage: null }
    const photoCopy = { ...article(2), title: 'Duplicate', publishedDate: first.publishedDate }
    const db = archive([first, photoCopy, article(3)])
    expect((await getStudentGovTimeline(db.payload, 'senate', 3, { hidden: new Set(['article-2']) })).map(item => item.id))
      .toEqual([3])
  })

  it('fills a quiet topic even when 400 newer stories belong to another topic', async () => {
    const db = archive([
      ...Array.from({ length: 400 }, (_, i) => article(i + 1, 'Administration')),
      ...Array.from({ length: 6 }, (_, i) => article(i + 401, 'Interview')),
    ])
    const result = await getNewsTopicArticles(db.payload)
    expect(result.interview).toHaveLength(6)
    expect(result.administration).toHaveLength(18)
    expect(db.hydrated).toHaveLength(24)
  })

  it('does not hydrate draft articles, including manual additions', async () => {
    const db = archive([{ ...article(1), _status: 'draft' }, article(2)])
    expect((await getStudentGovTimeline(db.payload, 'senate', 3, { included: [1] })).map(item => item.id)).toEqual([2])
    expect(db.hydrated).toEqual([2])
  })
})
