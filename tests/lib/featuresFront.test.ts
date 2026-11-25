import { describe, expect, it } from 'vitest'
import {
  LATEST_LIMIT,
  PIN_STALE_DAYS,
  SECTION_LIMITS,
  normalizeFeaturesLayout,
  planFeaturesFront,
  type FrontPins,
  type FrontStory,
} from '@/lib/featuresFront'

const ANCHOR = Date.parse('2026-11-20T12:00:00Z')
const daysAgo = (n: number) => new Date(ANCHOR - n * 24 * 60 * 60 * 1000).toISOString()
const NO_PINS: FrontPins = { cover: null, leads: {}, reel: null }

let nextId = 1
const story = (dept: FrontStory['dept'], age: number, extra: Partial<FrontStory> = {}): FrontStory => ({
  id: nextId++,
  publishedAt: daysAgo(age),
  hasPhoto: true,
  dept,
  ...extra,
})

/** A full term's worth: a few stories in every section, and three photo stories */
function term(offset = 0): FrontStory[] {
  return [
    story('campus', offset + 0),
    story('campus', offset + 3),
    story('campus', offset + 6),
    story('campus', offset + 9),
    story('campus', offset + 12),
    story('arts', offset + 2),
    story('arts', offset + 5),
    story('arts', offset + 8),
    story('arts', offset + 11),
    story('people', offset + 4),
    story('people', offset + 7),
    story('people', offset + 10),
    story('photo', offset + 1, { photoCount: 12 }),
    story('photo', offset + 14, { photoCount: 8 }),
    story('photo', offset + 20, { photoCount: 2 }),
  ]
}

const allIds = (plan: ReturnType<typeof planFeaturesFront>) => [
  plan.cover,
  plan.reel.hero,
  ...plan.reel.rest,
  ...(plan.latest?.ids ?? []),
  ...plan.sections.flatMap((s) => s.ids),
].filter((id): id is number => id != null)

describe('planFeaturesFront', () => {
  it('fills every part of the page from the newest stories', () => {
    const stories = term()
    const plan = planFeaturesFront(stories, NO_PINS)
    expect(plan.cover).toBe(stories[0].id)
    expect(plan.reel.hero).toBe(stories[12].id)
    expect(plan.sections.map((s) => [s.key, s.layout])).toEqual([
      ['campus', 'cards'],
      ['arts', 'cards'],
      ['people', 'photo-left'],
    ])
    for (const s of plan.sections) expect(s.ids.length).toBeLessThanOrEqual(SECTION_LIMITS[s.key])
  })

  it('fills Latest with the newest stories after the cover, from any section', () => {
    const stories = term()
    const plan = planFeaturesFront(stories, NO_PINS)
    // Ages 2 (arts), 3 (campus), 4 (people), 5 (arts): the cover is 0 and the reel took 1
    expect(plan.latest?.ids).toEqual([stories[5].id, stories[1].id, stories[9].id, stories[6].id])
    expect(plan.latest?.ids).toHaveLength(LATEST_LIMIT)
    expect(plan.latest?.lead).toBe(stories[5].id)
  })

  it("leads Latest with its newest story that has a photo", () => {
    const stories = term()
    const plain = story('campus', 0.5, { hasPhoto: false })
    const plan = planFeaturesFront([...stories, plain], NO_PINS)
    expect(plan.latest?.ids[0]).not.toBe(plain.id)
    expect(plan.latest?.ids).toContain(plain.id)
  })

  it("keeps a section's pinned lead out of Latest", () => {
    const stories = term()
    const peoplePin = stories[9] // People, age 4: Latest would take it otherwise
    const plan = planFeaturesFront(stories, { ...NO_PINS, leads: { people: peoplePin.id } })
    expect(plan.latest?.ids).not.toContain(peoplePin.id)
    expect(plan.sections.find((s) => s.key === 'people')!.lead).toBe(peoplePin.id)
  })

  it('never shows a story twice across the cover, reel and sections', () => {
    const plan = planFeaturesFront(term(), NO_PINS)
    const ids = allIds(plan)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('drops a stale cover pin for the newest story with a photo', () => {
    const stories = term()
    const old = story('campus', PIN_STALE_DAYS + 1)
    const plan = planFeaturesFront([...stories, old], { ...NO_PINS, cover: old.id })
    expect(plan.cover).toBe(stories[0].id)
  })

  it('keeps a fresh cover pin', () => {
    const stories = term()
    const plan = planFeaturesFront(stories, { ...NO_PINS, cover: stories[3].id })
    expect(plan.cover).toBe(stories[3].id)
  })

  it('ignores a pin to a missing story or a story without a photo', () => {
    const stories = term()
    const noPhoto = story('campus', 1, { hasPhoto: false })
    expect(planFeaturesFront([...stories, noPhoto], { ...NO_PINS, cover: 999999 }).cover).toBe(stories[0].id)
    expect(planFeaturesFront([...stories, noPhoto], { ...NO_PINS, cover: noPhoto.id }).cover).toBe(stories[0].id)
  })

  it('never shows a story from more than a year before the newest one', () => {
    const stories = term()
    const ancient = story('people', 400)
    const plan = planFeaturesFront([...stories, ancient], { ...NO_PINS, leads: { people: ancient.id } })
    expect(allIds(plan)).not.toContain(ancient.id)
  })

  it('leaves out a section with one story, without moving the others', () => {
    const stories = term().filter((s) => s.dept !== 'arts')
    const lonely = story('arts', 2)
    const plan = planFeaturesFront([...stories, lonely], NO_PINS)
    expect(plan.sections.map((s) => s.key)).not.toContain('arts')
    expect(plan.sections.map((s) => [s.key, s.layout])).toEqual([
      ['campus', 'cards'],
      ['people', 'photo-left'],
    ])
  })

  it('still fills the page over the summer, measuring from the newest story', () => {
    // Nothing published for 90 days: the windows don't care what day it is
    const stories = term(90)
    const plan = planFeaturesFront(stories, NO_PINS)
    expect(plan.cover).not.toBeNull()
    expect(plan.reel.hero).not.toBeNull()
    expect(plan.sections).toHaveLength(3)
  })

  it("puts a section's fresh pin ahead of its newest story", () => {
    const stories = term()
    const peoplePin = stories[11] // the oldest People story
    const plan = planFeaturesFront(stories, { ...NO_PINS, leads: { people: peoplePin.id } })
    const people = plan.sections.find((s) => s.key === 'people')!
    expect(people.lead).toBe(peoplePin.id)
    expect(people.ids[0]).toBe(peoplePin.id)
  })

  it("drops a section's pin once it's stale", () => {
    const stories = term()
    const stale = story('people', PIN_STALE_DAYS + 5)
    const plan = planFeaturesFront([...stories, stale], { ...NO_PINS, leads: { people: stale.id } })
    // Latest took the newest People story (age 4); the section leads with the next
    expect(plan.sections.find((s) => s.key === 'people')!.lead).toBe(stories[10].id)
  })

  it('falls back to cards when a photo section has no story with a photo', () => {
    const stories = term().filter((s) => s.dept !== 'people')
    // Older than Latest reaches, so they stay with People
    const plain = [story('people', 20, { hasPhoto: false }), story('people', 22, { hasPhoto: false })]
    const people = planFeaturesFront([...stories, ...plain], NO_PINS).sections.find((s) => s.key === 'people')!
    expect(people.layout).toBe('cards')
    expect(people.lead).toBeNull()
  })

  it('leads the reel with a photo story that has enough photos, and lists the next ones', () => {
    const stories = term()
    const fewPhotos = story('photo', 0, { photoCount: 1 })
    const plan = planFeaturesFront([...stories, fewPhotos], NO_PINS)
    expect(plan.reel.hero).toBe(stories[12].id)
    expect(plan.reel.rest).toContain(fewPhotos.id)
  })

  it('honours a reel pin with enough photos, and ignores one with too few', () => {
    const stories = term()
    expect(planFeaturesFront(stories, { ...NO_PINS, reel: stories[13].id }).reel.hero).toBe(stories[13].id)
    expect(planFeaturesFront(stories, { ...NO_PINS, reel: stories[14].id }).reel.hero).toBe(stories[12].id)
  })

  it('handles an empty archive', () => {
    expect(planFeaturesFront([], NO_PINS)).toEqual({ cover: null, reel: { hero: null, rest: [] }, latest: null, sections: [] })
  })
})

describe('normalizeFeaturesLayout', () => {
  it('reads a v3 layout as it is', () => {
    const v3 = { version: 3, cover: 12, leads: { campus: 3, arts: null, people: 7 }, reel: 40 }
    expect(normalizeFeaturesLayout(v3)).toEqual(v3)
  })

  it('keeps only the cover from an older layout', () => {
    const old = {
      featured: [12, null, null],
      rightArticles: [4, 5, null],
      photoBand: { mediaId: 9, focusX: 50, focusY: 50 },
      photoSpotlight: [{ url: '/x.jpg' }],
      onCampus: [1, 2, 3],
    }
    expect(normalizeFeaturesLayout(old)).toEqual({ version: 3, cover: 12, leads: { campus: null, arts: null, people: null }, reel: null })
  })

  it('reads garbage as no pins', () => {
    const empty = { version: 3, cover: null, leads: { campus: null, arts: null, people: null }, reel: null }
    for (const raw of [null, undefined, 'layout', 42, [1, 2], { featured: 'x' }, { version: 3, leads: 'x', cover: '12' }]) {
      expect(normalizeFeaturesLayout(raw)).toEqual(empty)
    }
  })
})
