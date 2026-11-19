import React from 'react'
import { describe, expect, it } from 'vitest'
import NewsPage from '@/components/News/NewsPage'
import type { Article } from '@/components/FrontPage/types'
import type { StudentGovBoxContent } from '@/components/News/StudentGovColumn'

const story = (id: number) => ({ id, title: `Story ${id}`, slug: `story-${id}`, image: '/photo.jpg', section: 'news' }) as Article

function placements(props: Partial<Parameters<typeof NewsPage>[0]>) {
  const found = new Map<string, Record<string, unknown>>()
  function walk(node: React.ReactNode) {
    React.Children.forEach(node, child => {
      if (!React.isValidElement<{ children?: React.ReactNode }>(child)) return
      if (typeof child.type === 'function') found.set(child.type.name, child.props)
      walk(child.props.children)
    })
  }
  walk(NewsPage({ title: 'News', articles: Array.from({ length: 12 }, (_, i) => story(i + 1)), ...props }))
  return found
}

describe('News story placement', () => {
  const boxes: StudentGovBoxContent[] = [{ body: 'senate', kind: 'article', article: story(1), session: null }]

  it('does not reuse a box pin as the automatic lead, secondary pin, or featured pin', () => {
    const found = placements({ studentGovBoxes: boxes, secondaryPins: [story(1)], featuredPins: [story(1)] })
    expect((found.get('NewsLead')?.article as Article).id).toBe(2)
    const secondary = found.get('NewsSecondary')?.articles as Article[]
    const featured = found.get('NewsFeatured')?.articles as Article[]
    expect([...secondary, ...featured].some(a => a.id === 1 || a.id === 2)).toBe(false)
    expect(new Set([...secondary, ...featured].map(a => a.id)).size).toBe(secondary.length + featured.length)
  })

  it('does not duplicate the only available story to fill an automatic lead', () => {
    const found = placements({ articles: [story(1)], studentGovBoxes: boxes })
    expect(found.has('NewsLead')).toBe(false)
  })

  it('preserves intentional manually chosen topic stories already shown above', () => {
    const topics = { administration: [story(1)], academia: [], infrastructure: [], interview: [] }
    const found = placements({ studentGovBoxes: boxes, topics, topicPins: { administration: [story(1)] } })
    expect((found.get('OverlayCard')?.article as Article).id).toBe(1)
  })
})
