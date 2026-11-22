// The Sports Layout document's `layout` JSON. The layout editor writes it and
// the /sports pages read it, so its shape, its slot counts and the rule for
// filling empty slots are defined once, here.
import { STANDINGS_SPORTS, type StandingsOverride } from './standingsSchedule'

/** Slots in the Headlines column */
export const HEADLINE_COUNT = 3
/** Cards in the More Headlines row */
export const FEATURED_COUNT = 7

/** Day the lead's game was played, tied to the article it was entered for */
export type ScoreboardDate = { articleId: number; date: string }

/**
 * Editors' framing of each More Headlines photo, by article id, as
 * object-position percentages. A card without one uses the photo's focal point.
 */
export type FeaturedFocus = Record<string, { x: number; y: number }>

export type SportsLayout = {
  /** Lead story */
  lead: number | null
  /** Scoreboard above the lead, built from the lead story's game result */
  showScoreboard: boolean
  /** Shown under the scoreboard, and only while that article is the lead */
  scoreboardDate: ScoreboardDate | null
  /** Lead title box overlaps the photo on desktop; off puts a plain title below it */
  leadTitleOverlay: boolean
  /** RPI scores banner at the top; off brings back the plain "Sports | Contact" header */
  showScoreStrip: boolean
  /** Wide card under the lead */
  belowLead: number | null
  /** Second wide card (text left, photo right), used when no scoreboard shows */
  belowLead2: number | null
  /** HEADLINE_COUNT slots in the right column */
  headlines: (number | null)[]
  /** FEATURED_COUNT cards in the More Headlines row */
  featured: (number | null)[]
  featuredFocus: FeaturedFocus
  /** Editor overrides of the automatic standings pick (see ./standingsSchedule) */
  standingsOverrides: StandingsOverride[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const articleId = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null

const slots = (value: unknown, count: number): (number | null)[] =>
  Array.from({ length: count }, (_, i) => articleId(Array.isArray(value) ? value[i] : null))

// Every switch is on unless an editor turned it off
const flag = (value: unknown): boolean => (typeof value === 'boolean' ? value : true)

const percent = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null

function scoreboardDate(value: unknown): ScoreboardDate | null {
  if (!isRecord(value)) return null
  const id = articleId(value.articleId)
  const date = value.date
  return id !== null && typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? { articleId: id, date } : null
}

function featuredFocus(value: unknown): FeaturedFocus {
  if (!isRecord(value)) return {}
  const focus: FeaturedFocus = {}
  for (const [id, point] of Object.entries(value)) {
    if (!isRecord(point)) continue
    const x = percent(point.x)
    const y = percent(point.y)
    if (x !== null && y !== null) focus[id] = { x, y }
  }
  return focus
}

function standingsOverrides(value: unknown): StandingsOverride[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (o): o is StandingsOverride =>
      isRecord(o) &&
      STANDINGS_SPORTS.some((s) => s.sport === o.sport) &&
      (o.mode === 'show' || o.mode === 'hide') &&
      typeof o.until === 'string' &&
      !Number.isNaN(Date.parse(o.until)),
  )
}

/**
 * The stored JSON as a complete layout. Anything missing or malformed falls
 * back to its default (an empty slot, a switch left on), so a layout saved by
 * an older editor, or one that was never saved, still renders.
 */
export function parseSportsLayout(raw: unknown): SportsLayout {
  const layout = isRecord(raw) ? raw : {}
  return {
    lead: articleId(layout.lead),
    showScoreboard: flag(layout.showScoreboard),
    scoreboardDate: scoreboardDate(layout.scoreboardDate),
    leadTitleOverlay: flag(layout.leadTitleOverlay),
    showScoreStrip: flag(layout.showScoreStrip),
    belowLead: articleId(layout.belowLead),
    belowLead2: articleId(layout.belowLead2),
    headlines: slots(layout.headlines, HEADLINE_COUNT),
    featured: slots(layout.featured, FEATURED_COUNT),
    featuredFocus: featuredFocus(layout.featuredFocus),
    standingsOverrides: standingsOverrides(layout.standingsOverrides),
  }
}

/**
 * The story an empty slot fills with: the newest one not placed anywhere yet,
 * preferring one with a photo since every slot shows one. `articles` is newest
 * first.
 */
export function autoFill<T extends { id: number | string }>(
  articles: T[],
  used: ReadonlySet<number | string>,
  hasPhoto: (article: T) => boolean,
): T | null {
  return articles.find((a) => !used.has(a.id) && hasPhoto(a)) ?? articles.find((a) => !used.has(a.id)) ?? null
}
