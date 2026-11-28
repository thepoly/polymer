import { describe, expect, it } from 'vitest'
import {
  PIN_STALE_DAYS,
  SECTION_LIMITS,
  TOP_LEFT,
  TOP_RIGHT,
  TOP_RIGHT_TABLET,
  NO_PITCH_POSITIONS,
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

/**
 * A full term, newest first by age in days: enough that the top takes its
 * seven and every section below still fills. Keyed by section and age.
 */
function term(offset = 0) {
  const s = {
    campus0: story('campus', offset + 0),
    photo1: story('photo', offset + 1, { photoCount: 12 }),
    arts2: story('arts', offset + 2),
    campus3: story('campus', offset + 3),
    people4: story('people', offset + 4),
    arts5: story('arts', offset + 5),
    campus6: story('campus', offset + 6),
    people7: story('people', offset + 7),
    arts8: story('arts', offset + 8),
    campus9: story('campus', offset + 9),
    people10: story('people', offset + 10),
    arts11: story('arts', offset + 11),
    campus12: story('campus', offset + 12),
    people13: story('people', offset + 13),
    arts14: story('arts', offset + 14),
    campus15: story('campus', offset + 15),
    people16: story('people', offset + 16),
    arts17: story('arts', offset + 17),
    people19: story('people', offset + 19),
    photo21: story('photo', offset + 21, { photoCount: 8 }),
    photo23: story('photo', offset + 23, { photoCount: 2 }),
  }
  return { s, all: Object.values(s) }
}

const allIds = (plan: ReturnType<typeof planFeaturesFront>) =>
  [plan.cover, plan.reel.hero, ...plan.reel.rest, ...plan.top.left, ...plan.top.right, ...plan.sections.flatMap((x) => x.ids)].filter(
    (id): id is number => id != null,
  )

describe('planFeaturesFront', () => {
  it('fills every part of the page from the newest stories', () => {
    const { s, all } = term()
    const plan = planFeaturesFront(all, NO_PINS)
    expect(plan.cover).toBe(s.campus0.id)
    expect(plan.reel.hero).toBe(s.photo1.id)
    expect(plan.sections.map((x) => [x.key, x.layout])).toEqual([
      ['campus', 'cards'],
      ['arts', 'photo-right'],
      ['people', 'cards'],
    ])
    for (const x of plan.sections) expect(x.ids.length).toBeLessThanOrEqual(SECTION_LIMITS[x.key])
  })

  it('fills the top beside the cover with the newest stories from any section', () => {
    const { s, all } = term()
    const plan = planFeaturesFront(all, NO_PINS)
    expect(plan.top.left).toEqual([s.arts2.id, s.campus3.id])
    expect(plan.top.right).toEqual([s.people4.id, s.arts5.id, s.campus6.id, s.people7.id])
    expect(plan.top.left).toHaveLength(TOP_LEFT)
    expect(plan.top.right).toHaveLength(TOP_RIGHT)
  })

  it('puts only stories with photos in the top-left, and the others on the right', () => {
    const { s, all } = term()
    const plain = story('campus', 0.5, { hasPhoto: false })
    const plan = planFeaturesFront([...all, plain], NO_PINS)
    expect(plan.top.left).toEqual([s.arts2.id, s.campus3.id])
    expect(plan.top.right[0]).toBe(plain.id)
  })

  it('keeps only the first two right-column stories on tablets, giving the others to their sections', () => {
    const { s, all } = term()
    const tablet = planFeaturesFront(all, NO_PINS, { topRight: TOP_RIGHT_TABLET })
    expect(tablet.top.right).toEqual([s.people4.id, s.arts5.id])
    expect(tablet.sections.find((x) => x.key === 'campus')!.ids[0]).toBe(s.campus6.id)
    expect(tablet.sections.find((x) => x.key === 'people')!.ids[0]).toBe(s.people7.id)
  })

  it("gives the right column's stories to their sections on phones (topRight: 0)", () => {
    const { s, all } = term()
    const phone = planFeaturesFront(all, NO_PINS, { topRight: 0 })
    const ids = (key: string) => phone.sections.find((x) => x.key === key)!.ids
    expect(phone.top).toEqual({ left: [s.arts2.id, s.campus3.id], right: [] })
    expect(phone.cover).toBe(s.campus0.id)
    expect(phone.reel.hero).toBe(s.photo1.id)
    expect(ids('campus')[0]).toBe(s.campus6.id)
    expect(ids('people').slice(0, 2)).toEqual([s.people4.id, s.people7.id])
    expect(ids('arts')).toContain(s.arts5.id)
    const all2 = allIds(phone)
    expect(new Set(all2).size).toBe(all2.length)
  })

  it('never shows a story twice across the cover, reel, top and sections', () => {
    const ids = allIds(planFeaturesFront(term().all, NO_PINS))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('drops a stale cover pin for the newest story with a photo', () => {
    const { s, all } = term()
    const old = story('campus', PIN_STALE_DAYS + 1)
    expect(planFeaturesFront([...all, old], { ...NO_PINS, cover: old.id }).cover).toBe(s.campus0.id)
  })

  it('keeps a fresh cover pin', () => {
    const { s, all } = term()
    expect(planFeaturesFront(all, { ...NO_PINS, cover: s.campus9.id }).cover).toBe(s.campus9.id)
  })

  it('ignores a pin to a missing story or a story without a photo', () => {
    const { s, all } = term()
    const noPhoto = story('campus', 1, { hasPhoto: false })
    expect(planFeaturesFront([...all, noPhoto], { ...NO_PINS, cover: 999999 }).cover).toBe(s.campus0.id)
    expect(planFeaturesFront([...all, noPhoto], { ...NO_PINS, cover: noPhoto.id }).cover).toBe(s.campus0.id)
  })

  it('never shows a story from more than a year before the newest one', () => {
    const { all } = term()
    const ancient = story('people', 400)
    const plan = planFeaturesFront([...all, ancient], { ...NO_PINS, leads: { people: ancient.id } })
    expect(allIds(plan)).not.toContain(ancient.id)
  })

  it('leaves out a section with one story, without moving the others', () => {
    const { all } = term()
    const noArts = all.filter((x) => x.dept !== 'arts')
    const lonely = story('arts', 30)
    // Without Arts the top takes more Campus Life, so give Campus Life enough to stay
    const moreCampus = [story('campus', 24), story('campus', 26)]
    const plan = planFeaturesFront([...noArts, ...moreCampus, lonely], NO_PINS)
    expect(plan.sections.map((x) => [x.key, x.layout])).toEqual([
      ['campus', 'cards'],
      ['people', 'cards'],
    ])
  })

  it('still fills the page over the summer, measuring from the newest story', () => {
    // Nothing published for 90 days: the windows don't care what day it is
    const plan = planFeaturesFront(term(90).all, NO_PINS)
    expect(plan.cover).not.toBeNull()
    expect(plan.reel.hero).not.toBeNull()
    expect(plan.top.left).toHaveLength(TOP_LEFT)
    expect(plan.sections).toHaveLength(3)
  })

  it("puts a section's fresh pin ahead of its newest story", () => {
    const { s, all } = term()
    const plan = planFeaturesFront(all, { ...NO_PINS, leads: { people: s.people19.id } })
    const people = plan.sections.find((x) => x.key === 'people')!
    expect(people.ids[0]).toBe(s.people19.id)
  })

  it("makes a photo section's fresh pin its lead", () => {
    const { s, all } = term()
    const arts = planFeaturesFront(all, { ...NO_PINS, leads: { arts: s.arts17.id } }).sections.find((x) => x.key === 'arts')!
    expect(arts.layout).toBe('photo-right')
    expect(arts.lead).toBe(s.arts17.id)
    expect(arts.ids[0]).toBe(s.arts17.id)
  })

  it("keeps a section's pinned lead out of the top", () => {
    const { s, all } = term()
    // People 4 is the newest People story: the top would take it otherwise
    const plan = planFeaturesFront(all, { ...NO_PINS, leads: { people: s.people4.id } })
    expect([...plan.top.left, ...plan.top.right]).not.toContain(s.people4.id)
    expect(plan.sections.find((x) => x.key === 'people')!.ids[0]).toBe(s.people4.id)
  })

  it("drops a section's pin once it's stale", () => {
    const { s, all } = term()
    const stale = story('people', PIN_STALE_DAYS + 5)
    const plan = planFeaturesFront([...all, stale], { ...NO_PINS, leads: { people: stale.id } })
    // The top took People 4 and 7; the row starts with the next
    expect(plan.sections.find((x) => x.key === 'people')!.ids[0]).toBe(s.people10.id)
  })

  it('falls back to cards when a photo section has no story with a photo', () => {
    const { all } = term()
    const noArts = all.filter((x) => x.dept !== 'arts')
    const plain = [story('arts', 30, { hasPhoto: false }), story('arts', 32, { hasPhoto: false })]
    const arts = planFeaturesFront([...noArts, ...plain], NO_PINS).sections.find((x) => x.key === 'arts')!
    expect(arts.layout).toBe('cards')
    expect(arts.lead).toBeNull()
  })

  it('leads the reel with a photo story that has enough photos, and lists the next ones', () => {
    const { s, all } = term()
    const fewPhotos = story('photo', 0, { photoCount: 1 })
    const plan = planFeaturesFront([...all, fewPhotos], NO_PINS)
    expect(plan.reel.hero).toBe(s.photo1.id)
    expect(plan.reel.rest).toContain(fewPhotos.id)
  })

  it('honours a reel pin with enough photos, and ignores one with too few', () => {
    const { s, all } = term()
    expect(planFeaturesFront(all, { ...NO_PINS, reel: s.photo21.id }).reel.hero).toBe(s.photo21.id)
    expect(planFeaturesFront(all, { ...NO_PINS, reel: s.photo23.id }).reel.hero).toBe(s.photo1.id)
  })

  it('leaves the top empty when there is no cover, so no story is claimed and hidden', () => {
    const plain = [story('campus', 0, { hasPhoto: false }), story('campus', 1, { hasPhoto: false }), story('people', 2, { hasPhoto: false }), story('people', 3, { hasPhoto: false })]
    const plan = planFeaturesFront(plain, NO_PINS)
    expect(plan.cover).toBeNull()
    expect(plan.top).toEqual({ left: [], right: [] })
    expect(plan.sections.flatMap((x) => x.ids).sort()).toEqual(plain.map((s) => s.id).sort())
  })

  it('handles an empty archive', () => {
    expect(planFeaturesFront([], NO_PINS)).toEqual({ cover: null, reel: { hero: null, rest: [] }, top: { left: [], right: [] }, sections: [] })
  })
})

describe('normalizeFeaturesLayout', () => {
  it('reads a v3 layout as it is', () => {
    const v3 = {
      version: 3,
      cover: 12,
      leads: { campus: 3, arts: null, people: 7 },
      reel: 40,
      pitch: 25,
      pitchPositions: { mobile: { x: 30, y: 80, zoom: 1.5 }, tablet: null, desktop: { x: 50, y: 40, zoom: 1 } },
    }
    expect(normalizeFeaturesLayout(v3)).toEqual(v3)
  })

  it('reads a layout saved before pitch positions as following the focal point', () => {
    const before = { version: 3, cover: 12, leads: {}, reel: null, pitch: 25 }
    expect(normalizeFeaturesLayout(before).pitchPositions).toEqual({ mobile: null, tablet: null, desktop: null })
  })

  it('clamps pitch positions and drops broken ones', () => {
    const raw = { version: 3, pitchPositions: { mobile: { x: 140, y: -5, zoom: 9 }, tablet: { x: 'a', y: 2 }, desktop: { x: 10, y: 20 } } }
    expect(normalizeFeaturesLayout(raw).pitchPositions).toEqual({
      mobile: { x: 100, y: 0, zoom: 2.5 },
      tablet: null,
      desktop: { x: 10, y: 20, zoom: 1 },
    })
  })

  it('keeps only the cover from an older layout', () => {
    const old = {
      featured: [12, null, null],
      rightArticles: [4, 5, null],
      photoBand: { mediaId: 9, focusX: 50, focusY: 50 },
      photoSpotlight: [{ url: '/x.jpg' }],
      onCampus: [1, 2, 3],
    }
    expect(normalizeFeaturesLayout(old)).toEqual({ version: 3, cover: 12, leads: { campus: null, arts: null, people: null }, reel: null, pitch: null, pitchPositions: NO_PITCH_POSITIONS })
  })

  it('reads garbage as no pins', () => {
    const empty = { version: 3, cover: null, leads: { campus: null, arts: null, people: null }, reel: null, pitch: null, pitchPositions: NO_PITCH_POSITIONS }
    for (const raw of [null, undefined, 'layout', 42, [1, 2], { featured: 'x' }, { version: 3, leads: 'x', cover: '12' }]) {
      expect(normalizeFeaturesLayout(raw)).toEqual(empty)
    }
  })
})
