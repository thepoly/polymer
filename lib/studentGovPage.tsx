import React from 'react'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import StudentGovSplitTimeline, {
  type StreamMarkers,
  type TimelineMonth,
} from '@/components/News/StudentGovSplitTimeline'
import StudentGovShelf, { type ShelfVolume } from '@/components/News/StudentGovShelf'
import type { PanelPhoto } from '@/components/News/StudentGovMonthPanel'
import { STUDENT_GOV, type StudentGovBody, type TimelineItem } from '@/components/News/studentGov'
import {
  electedLine,
  leaderChangeLine,
  leaderLine,
  ordinal,
  resolveTerms,
  spineFoot,
  termFullName,
  termHref,
  termIndexOf,
  termSegment,
  termShortName,
  termYearLabel,
  troyDayKey,
  type StudentGovTerm,
} from '@/components/News/studentGovTerms'
import {
  monthKeyLabel,
  monthKeyOf,
  normalizeTimelinePages,
  panelPhotoSizes,
  photoFrames,
  type TimelinePageConfig,
  type TimelinePhoto,
} from '@/components/News/timelinePage'
import { getArticlesById, getStudentGovTimeline } from '@/lib/studentGovTimeline'
import { getStoredTerms } from '@/lib/studentGovTerms'
import { spineDetailsFor } from '@/components/News/shelfDetails'
import { getArticleUrl } from '@/utils/getArticleUrl'
import { focalObjectPosition } from '@/utils/focalPoint'
import type { Article as ComponentArticle } from '@/components/FrontPage/types'
import type { Media } from '@/payload-types'

// Every entry a body has had; the page then shows one term at a time
const TIMELINE_LIMIT = 1000

/**
 * Spine size (px), from the term's article count (updates don't count) on a
 * fixed scale: the minimum with no articles, growing evenly to the maximum
 * at FULL_SPINE_AT articles and staying there. Fixed rather than relative to
 * the busiest term, so a busy term never shrinks the others and no two
 * books differ by more than these ranges.
 */
const SPINE_HEIGHT = [240, 290] as const
// Narrow and tall; 38px still fits the widest foot ("PU 136", 34px)
const SPINE_WIDTH = [38, 60] as const
const FULL_SPINE_AT = 30
/**
 * Past terms cycle mostly through whites with red lettering and bright reds,
 * with blush and rose pinks, a pale grey and a single oxblood for depth,
 * ordered so neighbours always differ in tone or hue; the term in session is
 * RPI red, so the newest past term beside it is white. `ink` sets the
 * lettering where it's tinted; otherwise it's near-black or near-white to suit
 * the colour.
 */
// In order of use: the newest past term gets the first. Fourteen past terms
// use the first fourteen; the rest come in once there are more terms.
const SPINE_COLORS: { color: string; ink?: string }[] = [
  { color: '#f7f4f0', ink: '#c8102e' }, // white, red lettering
  { color: '#e8112d' }, // bright scarlet
  { color: '#fbfaf7', ink: '#d6001c' }, // paper white, RPI red lettering
  { color: '#f0384d' }, // bright coral red
  { color: '#f4c9cf', ink: '#8a0b20' }, // blush pink, deep red lettering
  { color: '#c8102e' }, // tangy red
  { color: '#fdf8f3', ink: '#a50f2d' }, // cream white, cherry lettering
  { color: '#7a0c1f', ink: '#fbe9e6' }, // oxblood, blush lettering
  { color: '#e9e7e4', ink: '#b5002c' }, // pale grey, crimson lettering
  { color: '#e4002b' }, // vivid red
  { color: '#f2eee9', ink: '#c8102e' }, // soft white, red lettering
  { color: '#ec6f80', ink: '#5c0a18' }, // bright rose, deep maroon lettering
  { color: '#d00d2f' }, // tangy red (RPI red, a touch less orange)
  { color: '#f9f1ee', ink: '#b5002c' }, // rosy white, crimson lettering
  { color: '#b5002c' }, // crimson
  { color: '#fbe9e6', ink: '#a50f2d' }, // blush white, cherry lettering
  { color: '#d8354b' }, // coral red
  { color: '#d9d6d2', ink: '#3a3533' }, // light grey
  { color: '#cc1434' }, // tangy red, cooler
  { color: '#ffffff', ink: '#d6001c' }, // pure white, RPI red lettering
  { color: '#c0244e' }, // raspberry
]
const CURRENT_SPINE = { color: '#d6001c' }
const spine = (s: { color: string; ink?: string }) => ({ color: s.color, ink: s.ink ?? null })

/**
 * Title for a timeline page. `segment` is the term's part of the URL ("56",
 * "2025-26"); the name comes from it directly, so no lookup is needed.
 */
export function studentGovMetadata(body: StudentGovBody, segment?: string): Metadata {
  const meta = STUDENT_GOV[body]
  if (!segment) {
    return {
      title: `${meta.title} Timeline`,
      description: `Articles and updates on RPI's ${meta.title} from The Polytechnic, newest first.`,
      alternates: { canonical: meta.href },
    }
  }
  const year = /^(\d{4})-\d{2}$/.exec(segment)
  const name =
    body === 'senate' && /^\d+$/.test(segment)
      ? `${ordinal(Number(segment))} Senate`
      : year
        ? `${meta.title} ${termYearLabel(Number(year[1]))}`
        : meta.title
  return {
    title: `${name} Timeline`,
    description: `Articles and updates on the ${name} from The Polytechnic.`,
    alternates: { canonical: `${meta.href}/${segment}` },
  }
}

async function getPageConfig(payload: Payload, body: StudentGovBody): Promise<TimelinePageConfig> {
  try {
    const res = await payload.find({ collection: 'news-page-layout', limit: 1, depth: 0, select: { layout: true } })
    const layout = res.docs[0]?.layout as { timelinePages?: unknown } | null | undefined
    return normalizeTimelinePages(layout?.timelinePages)[body]
  } catch {
    return normalizeTimelinePages(null)[body]
  }
}

/** The term's photo and the default photo chosen in the page editor, by media id */
async function getChosenPhotos(
  payload: Payload,
  page: TimelinePageConfig,
  termSlug: string,
): Promise<Map<number, Media>> {
  const ids = [page.photos.terms[termSlug] ?? null, page.photos.default]
    .filter((p): p is TimelinePhoto => p !== null)
    .map((p) => p.media)
  if (ids.length === 0) return new Map()
  const res = await payload.find({
    collection: 'media',
    where: { id: { in: [...new Set(ids)] } },
    limit: ids.length,
    depth: 0,
  })
  return new Map(res.docs.map((m) => [m.id, m]))
}

function chosenPhoto(photo: TimelinePhoto | null, media: Map<number, Media>): PanelPhoto | null {
  if (!photo) return null
  const m = media.get(photo.media)
  if (!m?.url) return null
  const frames = photoFrames(photo, focalObjectPosition(m))
  return {
    src: m.url,
    alt: m.alt || m.title || 'Rensselaer campus',
    ...frames,
    sizes: panelPhotoSizes(m.width && m.height ? m.width / m.height : null, frames.desktop.zoom, frames.mobile.zoom),
  }
}

/**
 * The photo panel's one photo for a term: the term's own (page editor), else
 * the default, else none (plain red). Only photos chosen by hand: article
 * photos are never used, so a page with nothing set is plain red throughout.
 */
function termPanelPhoto(page: TimelinePageConfig, termSlug: string, media: Map<number, Media>): PanelPhoto | null {
  return chosenPhoto(page.photos.terms[termSlug] ?? null, media) ?? chosenPhoto(page.photos.default, media)
}

/** Newest-first items grouped by month */
function groupByMonth(items: TimelineItem[]): TimelineMonth[] {
  const months: TimelineMonth[] = []
  for (const item of items) {
    const key = monthKeyOf(item.date)
    let month = months[months.length - 1]
    if (!month || month.key !== key) {
      month = {
        key,
        label: monthKeyLabel(key, 'long'),
        short: monthKeyLabel(key, 'short'),
        items: [],
      }
      months.push(month)
    }
    month.items.push(item)
  }
  return months
}

/** Markers at the term's boundaries and leader changes */
function streamMarkers(
  body: StudentGovBody,
  term: StudentGovTerm,
  next: StudentGovTerm | null,
  today: string,
  gmWeekStoryHref: string | null,
): StreamMarkers {
  // The GM Week that ended this term: the next term's election, once decided
  const gmWeek =
    next?.gmWeekOn && next.gmWeekOn <= today
      ? { day: next.gmWeekOn, text: electedLine(next), href: gmWeekStoryHref }
      : null
  const dividers: StreamMarkers['dividers'] = term.leaders
    .slice(1)
    .filter((l) => l.startedOn)
    .map((l) => ({ day: l.startedOn as string, text: leaderChangeLine(term, l) }))
  // Senate: "2026 Summer recess · No meetings", placed at June 1 once that day
  // has come (the line itself shows no day). Every term starts in April, so
  // each has exactly one. Chosen from the archive (2012–2026): the last spring
  // story is always by May 31 (usually early May, after finals; Commencement
  // is mid-May) and coverage resumes from late August; the one summer meeting
  // covered was in June 2020. The E-Board may keep meeting over the summer,
  // so none there.
  const recessDay = `${term.startYear}-06-01`
  if (body === 'senate' && recessDay <= today) {
    dividers.push({ day: recessDay, text: `${term.startYear} Summer recess · No meetings`, hideDay: true })
  }
  // Newest first, like the stream
  dividers.sort((a, b) => b.day.localeCompare(a.day))
  return { gmWeek, dividers }
}

/** The other body's same term (56th Senate ↔ 2025–26 E-Board), else its timeline */
function otherBodyHref(other: StudentGovBody, stored: StudentGovTerm[], term: StudentGovTerm, today: string): string {
  const started = stored
    .filter((t) => t.body === other && t.startsOn <= today)
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn))
  const match = started.find((t) => t.startYear === term.startYear && t.hasCoverage)
  return match ? termHref(match, match === started[started.length - 1]) : STUDENT_GOV[other].href
}

/**
 * Shared page body for the Senate and Executive Board timelines: one term
 * (`segment` from the URL, or the term in session), then that body's shelf
 * of every covered term.
 */
export async function StudentGovTimelinePage({ body, segment }: { body: StudentGovBody; segment?: string }) {
  const payload = await getPayload({ config })
  const now = new Date()
  const today = troyDayKey(now)
  const page = await getPageConfig(payload, body)
  const [items, stored] = await Promise.all([
    getStudentGovTimeline(payload, body, TIMELINE_LIMIT, { hidden: new Set(page.hidden), included: page.included }),
    getStoredTerms(payload),
  ])

  // Terms oldest first; the newest that has started is in session
  const terms = resolveTerms(stored, body, items.map((item) => item.date), now)
  const currentIndex = terms.filter((t) => t.startsOn <= today).length - 1
  const current = terms[currentIndex]

  // Each entry goes in the term whose first meeting it follows; anything
  // before the oldest term is left off
  const termItems = terms.map((): TimelineItem[] => [])
  for (const item of items) {
    const i = termIndexOf(terms, item.date)
    if (i >= 0) termItems[i].push(item)
  }

  const shelfIndexes = terms.map((_, i) => i).filter((i) => i <= currentIndex && terms[i].hasCoverage).reverse()

  let viewedIndex = currentIndex
  if (segment !== undefined) {
    const found = shelfIndexes.find((i) => termSegment(terms[i]) === segment)
    if (found === undefined) notFound()
    if (found === currentIndex) redirect(STUDENT_GOV[body].href)
    viewedIndex = found
  }
  const term = terms[viewedIndex]
  const next = terms[viewedIndex + 1] ?? null
  const viewedItems = termItems[viewedIndex]

  // The election story linked from the GM Week marker, if it isn't already
  // on the timeline
  const gmWeekStoryId = next?.gmWeekStoryId ?? null
  let gmWeekStory: ComponentArticle | undefined
  if (gmWeekStoryId !== null) {
    const onTimeline = items.find((item) => item.kind === 'article' && Number(item.id) === gmWeekStoryId)
    gmWeekStory =
      onTimeline?.kind === 'article'
        ? onTimeline.article
        : (await getArticlesById(payload, [gmWeekStoryId])).get(gmWeekStoryId)
  }
  const gmWeekHref = gmWeekStory ? getArticleUrl(gmWeekStory) : null

  const media = await getChosenPhotos(payload, page, term.slug)
  const photo = termPanelPhoto(page, term.slug, media)
  const months = groupByMonth(viewedItems)

  const markers = streamMarkers(body, term, next, today, gmWeekHref)

  // Shelf: newest on the left, sized by each term's articles
  const volumes: ShelfVolume[] = shelfIndexes.map((i, n) => {
    const t = terms[i]
    const list = termItems[i]
    const articles = list.filter((item) => item.kind === 'article').length
    const scale = Math.min(1, articles / FULL_SPINE_AT)
    const isCurrent = i === currentIndex
    const short = termShortName(t)
    const year = termYearLabel(t.startYear)
    return {
      key: t.slug,
      spineText: body === 'senate' ? short : year,
      foot: spineFoot(t),
      title:
        body === 'senate'
          ? t.number !== null
            ? `${ordinal(t.number)} Student Senate`
            : `${year} Student Senate`
          : `${year} Executive Board`,
      ariaName:
        body === 'senate' && t.number !== null
          ? `${ordinal(t.number)} Student Senate, ${year}`
          : `Executive Board, ${year}`,
      year,
      leader: leaderLine(t),
      href: termHref(t, isCurrent),
      isCurrent,
      isViewed: i === viewedIndex,
      height: Math.round(SPINE_HEIGHT[0] + (SPINE_HEIGHT[1] - SPINE_HEIGHT[0]) * scale),
      width: Math.round(SPINE_WIDTH[0] + (SPINE_WIDTH[1] - SPINE_WIDTH[0]) * scale),
      ...spine(
        // The cycle starts at the first past term, after the one in session
        isCurrent ? CURRENT_SPINE : SPINE_COLORS[(n - (shelfIndexes[0] === currentIndex ? 1 : 0)) % SPINE_COLORS.length],
      ),
      // The term in session is always a new book, whatever the lists say
      details: isCurrent ? {} : spineDetailsFor(t),
    }
  })

  const other: StudentGovBody = body === 'senate' ? 'eboard' : 'senate'

  return (
    <main className="min-h-screen bg-bg-main transition-colors duration-300">
      <Header />
      {/* Keyed by term: opening another term from the shelf starts its
          stream at the top, with a fresh panel and shelf, rather than keeping
          this term's scroll position */}
      <StudentGovSplitTimeline
        key={term.slug}
        body={body}
        months={months}
        entries={page.entries}
        termLabel={body === 'senate' ? termFullName(term) : termYearLabel(term.startYear)}
        current={
          viewedIndex === currentIndex
            ? null
            : {
                href: STUDENT_GOV[body].href,
                name: body === 'senate' ? termShortName(current) : `${termShortName(current)} E-Board`,
              }
        }
        otherHref={otherBodyHref(other, stored, term, today)}
        markers={markers}
        photo={photo}
        shelf={
          volumes.length > 0 && (
            <StudentGovShelf
              body={body}
              volumes={volumes}
              tail={body === 'senate' ? '… earlier Senates in the print archive' : '… earlier boards in the print archive'}
            />
          )
        }
      />
      {/* The photo panel runs right down to the footer's rule */}
      <Footer flush />
    </main>
  )
}
