import { getPayload } from 'payload'
import configPromise from '@/payload.config'

/**
 * Current edition helper.
 *
 * An "edition" corresponds to a publishing week (Sunday–Saturday, local time).
 * The volume stays constant (CXLIII at time of writing) and the issue number
 * increments by 1 for every PAST week in which at least one article was
 * published. The current week's issue number is computed as
 *   baseIssue + (# weeks strictly before the current week that have >=1 published article)
 *
 * Anchor: the week containing 2026-04-23 is Volume CXLIII, Issue 9.
 *
 * TODO(volume-rollover): this helper keeps the volume locked to CXLIII. When
 * The Polytechnic rolls over to Volume CXLIV, decide the policy (calendar year?
 * academic year?) and add a rollover rule here. Until then, callers always get
 * CXLIII and an ever-incrementing issue number.
 */

export const CURRENT_VOLUME = 143
const ANCHOR_DATE = new Date('2026-04-23T00:00:00') // Thursday
const ANCHOR_ISSUE = 9

/** Returns the Sunday 00:00:00 (local) that starts the week containing `d`. */
function weekStart(d: Date): Date {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  s.setDate(s.getDate() - s.getDay()) // Sunday
  s.setHours(0, 0, 0, 0)
  return s
}

function weekEnd(d: Date): Date {
  const s = weekStart(d)
  const e = new Date(s)
  e.setDate(e.getDate() + 7)
  return e
}

const ANCHOR_WEEK_START = weekStart(ANCHOR_DATE)

export type Edition = {
  volume: number
  /** issue number (1-indexed) */
  issue: number
  /** Roman numeral representation for convenience */
  volumeRoman: string
}

const NUMERALS: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
]

function toRoman(n: number): string {
  let out = ''
  let v = n
  for (const [val, sym] of NUMERALS) {
    while (v >= val) { out += sym; v -= val }
  }
  return out
}

/**
 * Count published weeks in the open interval (fromStart, untilStart), i.e.
 * weeks strictly after the anchor week and strictly before the current week.
 * Direction handling: if fromStart > untilStart, returns a negative count
 * (we subtract weeks from the anchor instead).
 */
async function countPublishedWeeksBetween(fromStart: Date, untilStart: Date): Promise<number> {
  if (fromStart.getTime() === untilStart.getTime()) return 0
  const forward = fromStart.getTime() < untilStart.getTime()
  const lo = forward ? fromStart : untilStart
  const hi = forward ? untilStart : fromStart

  const payload = await getPayload({ config: configPromise })
  // Fetch distinct weeks in the range in which anything was published.
  // We do this with a coarse find() limited to publishedDate — cheap and
  // correct even on production data volumes (<=~1k articles/year).
  const res = await payload.find({
    collection: 'articles',
    where: {
      and: [
        { _status: { equals: 'published' } },
        { publishedDate: { greater_than_equal: lo.toISOString() } },
        { publishedDate: { less_than: hi.toISOString() } },
      ],
    },
    depth: 0,
    limit: 1000,
    select: { publishedDate: true },
    pagination: false,
  })

  const weeks = new Set<number>()
  for (const doc of res.docs) {
    const pd = (doc as { publishedDate?: string | Date | null }).publishedDate
    if (!pd) continue
    const ws = weekStart(new Date(pd))
    // Only count whole weeks strictly inside (lo, hi) — we want the count of
    // published weeks between but not including lo's week or hi's week.
    if (ws.getTime() > lo.getTime() && ws.getTime() < hi.getTime()) {
      weeks.add(ws.getTime())
    }
  }
  return forward ? weeks.size : -weeks.size
}

/**
 * Compute the edition (volume + issue) as of `now`.
 * Defaults to `new Date()`.
 */
export async function getCurrentEdition(now: Date = new Date()): Promise<Edition> {
  const currentWeekStart = weekStart(now)
  // Delta = #published weeks strictly between the anchor week and the current week
  const delta = await countPublishedWeeksBetween(ANCHOR_WEEK_START, currentWeekStart)

  // Also count whether the anchor week itself counts (it does — the anchor is
  // defined as issue 9, so no adjustment needed). And whether the CURRENT week
  // has published articles — it does NOT bump the issue until the following
  // week.
  const issue = Math.max(1, ANCHOR_ISSUE + delta)

  return {
    volume: CURRENT_VOLUME,
    issue,
    volumeRoman: toRoman(CURRENT_VOLUME),
  }
}

/** Returns the week window [start, end) around `d`, both local. Exported for tests/admin UI. */
export function getWeekBounds(d: Date = new Date()): { start: Date; end: Date } {
  return { start: weekStart(d), end: weekEnd(d) }
}
