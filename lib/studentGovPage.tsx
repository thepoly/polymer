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
import StudentGovTermList, { type TermRow } from '@/components/News/StudentGovTermList'
import type { PanelPhoto } from '@/components/News/StudentGovMonthPanel'
import { STUDENT_GOV, type StudentGovBody, type TimelineItem } from '@/components/News/studentGov'
import {
  electedLine,
  leaderChangeLine,
  leaderNames,
  ordinal,
  resolveTerms,
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
import { getArticleUrl } from '@/utils/getArticleUrl'
import { focalObjectPosition } from '@/utils/focalPoint'
import type { Article as ComponentArticle } from '@/components/FrontPage/types'
import type { Media } from '@/payload-types'

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
 * (`segment` from the URL, or the term in session), then a list of that
 * body's covered terms.
 */
export async function StudentGovTimelinePage({ body, segment }: { body: StudentGovBody; segment?: string }) {
  const payload = await getPayload({ config })
  const now = new Date()
  const today = troyDayKey(now)
  const page = await getPageConfig(payload, body)
  const [items, stored] = await Promise.all([
    getStudentGovTimeline(payload, body, null, { hidden: new Set(page.hidden), included: page.included }),
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

  // Terms that have started and are covered, newest first: the ones with pages
  const listedIndexes = terms.map((_, i) => i).filter((i) => i <= currentIndex && terms[i].hasCoverage).reverse()

  let viewedIndex = currentIndex
  if (segment !== undefined) {
    const found = listedIndexes.find((i) => termSegment(terms[i]) === segment)
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

  // Terms list: newest first
  const termRows: TermRow[] = listedIndexes.map((i) => {
    const t = terms[i]
    const list = termItems[i]
    const articles = list.filter((item) => item.kind === 'article').length
    const isCurrent = i === currentIndex
    return {
      key: t.slug,
      // "57th Senate" (years beside it) / "2026–27"
      name: termShortName(t),
      years: body === 'senate' && t.number !== null ? termYearLabel(t.startYear) : null,
      leaders: leaderNames(t),
      articles,
      updates: list.length - articles,
      href: termHref(t, isCurrent),
      isCurrent,
      isViewed: i === viewedIndex,
    }
  })

  const other: StudentGovBody = body === 'senate' ? 'eboard' : 'senate'
  const otherHref = otherBodyHref(other, stored, term, today)

  return (
    <main className="min-h-screen bg-bg-main transition-colors duration-300">
      <Header />
      {/* Keyed by term: opening another term from the list starts its
          stream at the top, with a fresh panel and list, rather than keeping
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
        otherHref={otherHref}
        markers={markers}
        photo={photo}
        panelTint={page.panelTint}
        terms={termRows.length > 0 && <StudentGovTermList body={body} rows={termRows} otherHref={otherHref} />}
      />
      {/* The photo panel runs right down to the footer's rule */}
      <Footer flush />
    </main>
  )
}
