import type { Payload } from 'payload'
import { describe, expect, it } from 'vitest'
import type { Article as ComponentArticle } from '@/components/FrontPage/types'
import { normalizeFeaturesLayout } from '@/lib/featuresLayout'
import { loadFeaturesPage } from '@/lib/featuresPage'

const NOW = new Date('2026-11-22T17:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString()

const story = (id: number, age: number, kicker = 'On Campus'): ComponentArticle => ({
  id,
  slug: `story-${id}`,
  title: `Story ${id}`,
  excerpt: '',
  author: null,
  date: null,
  image: `/img/${id}.webp`,
  imageFull: `/img/${id}.webp`,
  section: 'features',
  kicker,
  publishedDate: daysAgo(age),
})

const lexical = (text: string) => ({
  root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text }] }] },
})

/** A Payload stand-in that answers the few queries the loader makes */
function fakePayload({
  layout,
  updatedAt = daysAgo(1),
  pinnedDocs = [],
  metaDocs = [],
}: {
  layout?: unknown
  updatedAt?: string
  pinnedDocs?: Record<string, unknown>[]
  metaDocs?: Record<string, unknown>[]
}) {
  return {
    find: async (args: { collection: string; select?: Record<string, boolean> }) => {
      if (args.collection === 'features-page-layout') return { docs: layout ? [{ layout, updatedAt }] : [] }
      if (args.select?.plainContent) return { docs: metaDocs }
      if (args.select?.title) return { docs: pinnedDocs }
      return { docs: [] }
    },
  } as unknown as Payload
}

describe('normalizeFeaturesLayout', () => {
  it('carries an old three-column layout over', () => {
    const layout = normalizeFeaturesLayout({
      featured: [1, 2, 3],
      wideArticle: [4],
      spotlightSubs: [5, null],
      onCampus: [9, 9, 9],
      photoSpotlight: [{ url: '/a.webp' }, { nope: true }],
    })
    expect(layout).toMatchObject({
      version: 2,
      cover: [1],
      second: [2],
      strips: [3, 4],
      photoStories: [5, null, null],
      lens: [{ url: '/a.webp' }],
    })
  })

  it('pads and cleans a saved layout', () => {
    const layout = normalizeFeaturesLayout({ version: 2, cover: ['x'], strips: [7], photoStoryImages: ['/p.webp'] })
    expect(layout.cover).toEqual([null])
    expect(layout.strips).toEqual([7, null])
    expect(layout.photoStoryImages).toEqual(['/p.webp', null, null])
    expect(layout.lens).toEqual([])
  })
})

describe('loadFeaturesPage', () => {
  const articles = [story(1, 1), story(2, 3, 'Photo Short Story'), story(3, 5), story(4, 8), story(5, 12, 'Photo Short Story')]

  it('fills empty slots from the newest stories and keeps Photo Stories to photo-led ones', async () => {
    const page = await loadFeaturesPage(
      fakePayload({ metaDocs: [{ id: 2, kicker: 'Photo Short Story' }, { id: 5, kicker: 'Photo Short Story' }] }),
      articles,
      NOW,
    )
    expect(page.cover?.id).toBe(1)
    expect(page.second?.id).toBe(2)
    expect(page.strips.map((a) => a.id)).toEqual([3, 4])
    expect(page.photoStories.map((a) => a.id)).toEqual([5])
    expect(page.archive).toEqual([])
  })

  it('keeps a recent pin and drops one far older than the newest story', async () => {
    const pinned = (id: number, age: number) => ({
      id,
      slug: `pinned-${id}`,
      title: lexical(`Pinned ${id}`),
      section: 'features',
      publishedDate: daysAgo(age),
    })
    const page = await loadFeaturesPage(
      fakePayload({
        layout: { version: 2, cover: [100], second: [200] },
        pinnedDocs: [pinned(100, 20), pinned(200, 90)],
      }),
      articles,
      NOW,
    )
    expect(page.cover?.id).toBe(100)
    // The stale pin gives way to the newest story
    expect(page.second?.id).toBe(1)
  })

  it('rotates through fresh Lens picks by day', async () => {
    const lens = [{ url: '/a.webp', addedAt: daysAgo(3) }, { url: '/b.webp', addedAt: daysAgo(3) }]
    const today = await loadFeaturesPage(fakePayload({ layout: { version: 2, lens } }), articles, NOW)
    const tomorrow = await loadFeaturesPage(
      fakePayload({ layout: { version: 2, lens } }),
      articles,
      new Date(NOW.getTime() + 24 * 60 * 60 * 1000),
    )
    expect(today.lens?.picked).toBe(true)
    expect(today.lens?.photo.url).not.toBe(tomorrow.lens?.photo.url)
  })

  it('keeps stale Lens picks only when there is nothing newer to show', async () => {
    const lens = [{ url: '/old.webp', addedAt: daysAgo(120) }]
    const page = await loadFeaturesPage(fakePayload({ layout: { version: 2, lens } }), articles, NOW)
    expect(page.lens).toEqual({ photo: lens[0], picked: true })
  })
})
