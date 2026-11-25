// Which stories the Features page shows, and where: a pure plan built from a
// list of stories and the editor's pins, so it can be tested without Payload
// or React. components/Features/FeaturesFront renders it; the Features Layout
// editor (components/Dashboard/FeaturesLayoutEditor) uses the same windows to
// tell editors when a pin has gone stale.
//
// Features publishes about 16 stories a year, almost none over breaks, so
// every window is measured from the newest Features story (the anchor), not
// from today: the page doesn't empty itself over the summer, and it never
// leads with a story from years ago. See docs/features-section.md.
import type { FeaturesDepartmentKey } from './featuresDepartments'

/** A section shows stories from this many days before the newest Features story */
export const SECTION_WINDOW_DAYS = 365
/** A pin holds while its story is within this many days of the newest Features story */
export const PIN_STALE_DAYS = 42

export const SECTION_ORDER = ['campus', 'arts', 'people'] as const
export type SectionKey = (typeof SECTION_ORDER)[number]
export type SectionLayout = 'photo-right' | 'photo-left' | 'cards'
export const SECTION_LAYOUT: Record<SectionKey, SectionLayout> = { campus: 'cards', arts: 'cards', people: 'photo-left' }
/** The most stories each section shows, its lead included */
export const SECTION_LIMITS: Record<SectionKey, number> = { campus: 3, arts: 3, people: 3 }
/** Latest, under the cover: the newest stories from every section, its lead included */
export const LATEST_LIMIT = 4
/** A section with fewer stories than this in its window is left out */
export const MIN_SECTION_STORIES = 2
/** The reel leads with a photo story that has at least this many photos */
export const REEL_MIN_PHOTOS = 3
/** Photo stories listed under the reel */
export const REEL_REST = 2

export type FrontStory = {
  id: number
  /** ISO date; a story without one is treated as the oldest */
  publishedAt: string | null
  hasPhoto: boolean
  dept: FeaturesDepartmentKey | null
  /** Photos in the story's body, for photo stories; unknown counts as none */
  photoCount?: number
}

export type FrontPins = {
  cover: number | null
  leads: Partial<Record<SectionKey, number | null>>
  reel: number | null
}

export type FrontSection = {
  key: SectionKey
  layout: SectionLayout
  /** The story beside the photo; null for cards */
  lead: number | null
  /** Every story in the section, in order, the lead first */
  ids: number[]
}

export type FrontPlan = {
  cover: number | null
  reel: { hero: number | null; rest: number[] }
  /** The newest stories after the cover, from any section; null when there are too few */
  latest: { lead: number | null; ids: number[] } | null
  sections: FrontSection[]
}

const DAY_MS = 24 * 60 * 60 * 1000
const time = (s: FrontStory) => (s.publishedAt ? Date.parse(s.publishedAt) || 0 : 0)
const newestFirst = (a: FrontStory, b: FrontStory) => time(b) - time(a)

/** The newest Features story's date: every window is measured from it */
export function anchorOf(stories: FrontStory[]): number {
  return stories.reduce((max, s) => Math.max(max, time(s)), 0)
}

/** Whether a story published at `publishedAt` is within `days` of the anchor */
export function isWithin(publishedAt: string | null, anchor: number, days: number): boolean {
  if (!publishedAt) return false
  const t = Date.parse(publishedAt)
  return Number.isFinite(t) && anchor - t <= days * DAY_MS
}

/** The cover: the pinned story while it's fresh and has a photo, else the newest story with a photo */
export function pickCover(stories: FrontStory[], pins: Pick<FrontPins, 'cover'>): number | null {
  const anchor = anchorOf(stories)
  const pinned = pins.cover != null ? stories.find((s) => s.id === pins.cover) : undefined
  if (pinned && pinned.hasPhoto && isWithin(pinned.publishedAt, anchor, PIN_STALE_DAYS)) return pinned.id
  return [...stories].sort(newestFirst).find((s) => s.hasPhoto)?.id ?? null
}

/**
 * The page's plan, in the order stories are claimed (each appears once):
 * cover, then the photo reel, then Latest (the newest stories from any
 * section, so the cover and Latest open the page with the five newest), then
 * Campus Life, Arts & Culture and People.
 */
export function planFeaturesFront(stories: FrontStory[], pins: FrontPins): FrontPlan {
  const anchor = anchorOf(stories)
  const sorted = [...stories].sort(newestFirst)
  const byId = new Map(stories.map((s) => [s.id, s]))
  const used = new Set<number>()
  const inWindow = (s: FrontStory) => isWithin(s.publishedAt, anchor, SECTION_WINDOW_DAYS)
  const fresh = (s: FrontStory) => isWithin(s.publishedAt, anchor, PIN_STALE_DAYS)

  // 1. Cover
  const cover = pickCover(stories, pins)
  if (cover != null) used.add(cover)

  // 2. Photo reel: the pinned photo story while it's in the window and has
  // enough photos, else the newest that does; then the next few photo stories
  const photoPool = sorted.filter((s) => s.dept === 'photo' && s.hasPhoto && !used.has(s.id) && inWindow(s))
  const enough = (s: FrontStory) => (s.photoCount ?? 0) >= REEL_MIN_PHOTOS
  const pinnedReel = pins.reel != null ? byId.get(pins.reel) : undefined
  const hero =
    (pinnedReel && photoPool.includes(pinnedReel) && enough(pinnedReel) ? pinnedReel : undefined) ?? photoPool.find(enough) ?? null
  if (hero) used.add(hero.id)
  const rest = hero ? photoPool.filter((s) => !used.has(s.id)).slice(0, REEL_REST) : []
  rest.forEach((s) => used.add(s.id))

  // 3. Latest: the newest stories left, from any section. Its lead is the
  // newest of them with a photo; without one, it's a row of cards. A section
  // lead an editor pinned (and that's still fresh) is kept for its section.
  const heldForSections = new Set(
    SECTION_ORDER.map((key) => (pins.leads[key] != null ? byId.get(pins.leads[key]!) : undefined))
      .filter((s): s is FrontStory => Boolean(s && s.dept && fresh(s) && inWindow(s)))
      .map((s) => s.id),
  )
  const latestPool = sorted.filter((s) => !used.has(s.id) && !heldForSections.has(s.id) && inWindow(s))
  let latest: FrontPlan['latest'] = null
  if (latestPool.length >= MIN_SECTION_STORIES) {
    const newest = latestPool.slice(0, LATEST_LIMIT)
    const lead = newest.find((s) => s.hasPhoto) ?? null
    const ids = lead ? [lead, ...newest.filter((s) => s !== lead)] : newest
    ids.forEach((s) => used.add(s.id))
    latest = { lead: lead?.id ?? null, ids: ids.map((s) => s.id) }
  }

  // 4. Sections, each from its own department within the window
  const sections: FrontSection[] = []
  for (const key of SECTION_ORDER) {
    const pool = sorted.filter((s) => s.dept === key && !used.has(s.id) && inWindow(s))
    if (pool.length < MIN_SECTION_STORIES) continue
    const limit = SECTION_LIMITS[key]
    const pinned = pins.leads[key] != null ? byId.get(pins.leads[key]!) : undefined
    const validPin = pinned && pool.includes(pinned) && fresh(pinned) ? pinned : undefined

    let layout = SECTION_LAYOUT[key]
    let lead: FrontStory | undefined
    if (layout !== 'cards') {
      lead = validPin?.hasPhoto ? validPin : pool.find((s) => s.hasPhoto)
      // No lead with a photo: the section falls back to a row of cards
      if (!lead) layout = 'cards'
    }

    let picked: FrontStory[]
    if (lead) {
      picked = [lead, ...pool.filter((s) => s !== lead).slice(0, limit - 1)]
    } else {
      // Cards: the pin first, then the newest, preferring stories with photos
      const first = validPin ? [validPin] : []
      const others = pool.filter((s) => s !== validPin)
      const ranked = [...others.filter((s) => s.hasPhoto), ...others.filter((s) => !s.hasPhoto)]
      const chosen = new Set(ranked.slice(0, limit - first.length))
      picked = [...first, ...others.filter((s) => chosen.has(s))]
    }
    picked.forEach((s) => used.add(s.id))
    sections.push({ key, layout, lead: lead?.id ?? null, ids: picked.map((s) => s.id) })
  }

  return { cover, reel: { hero: hero?.id ?? null, rest: rest.map((s) => s.id) }, latest, sections }
}

/* ───────────────────────────── The editor's layout ─────────────────────────────
 * Stored in features-page-layout.layout (a JSON field, so no migration). The
 * page reads only these pins; everything else fills itself. Older layouts
 * (On Campus, Featured, Latest, Photo Band, The Arts, Photo Spotlight) keep
 * only their first Featured slot, as the cover; the first save from the
 * editor rewrites them in this shape.
 */
export type FeaturesLayoutV3 = {
  version: 3
  cover: number | null
  leads: Record<SectionKey, number | null>
  reel: number | null
}

const idOf = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : null)

/** Any saved layout (v3, an older shape, or garbage) as a v3 layout */
export function normalizeFeaturesLayout(raw: unknown): FeaturesLayoutV3 {
  const empty: FeaturesLayoutV3 = { version: 3, cover: null, leads: { campus: null, arts: null, people: null }, reel: null }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return empty
  const o = raw as Record<string, unknown>
  if (o.version === 3) {
    const leads = o.leads && typeof o.leads === 'object' && !Array.isArray(o.leads) ? (o.leads as Record<string, unknown>) : {}
    return {
      version: 3,
      cover: idOf(o.cover),
      leads: { campus: idOf(leads.campus), arts: idOf(leads.arts), people: idOf(leads.people) },
      reel: idOf(o.reel),
    }
  }
  return { ...empty, cover: Array.isArray(o.featured) ? idOf(o.featured[0]) : null }
}

/** The pins the page plan takes, from a v3 layout */
export const pinsOf = (layout: FeaturesLayoutV3): FrontPins => ({ cover: layout.cover, leads: layout.leads, reel: layout.reel })
