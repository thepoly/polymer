import React from 'react'
import type { Metadata } from 'next'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import StudentGovTimeline from '@/components/News/StudentGovTimeline'
import StudentGovSplitTimeline, { type TimelineMonth } from '@/components/News/StudentGovSplitTimeline'
import type { PanelPhoto } from '@/components/News/StudentGovMonthPanel'
import { STUDENT_GOV, type StudentGovBody, type TimelineItem } from '@/components/News/studentGov'
import {
  monthKeyLabel,
  monthKeyOf,
  normalizeTimelinePages,
  panelPhotoSizes,
  photoFrames,
  schoolYearLabel,
  schoolYearOf,
  type TimelinePageConfig,
  type TimelinePhoto,
} from '@/components/News/timelinePage'
import { getStudentGovTimeline } from '@/lib/studentGovTimeline'
import { focalObjectPosition } from '@/utils/focalPoint'
import type { Media, User } from '@/payload-types'

// Every entry a body has had; the page then shows one school year at a time
const TIMELINE_LIMIT = 1000

// Bodies on the split-screen design. The other keeps the plain timeline
// until the design is settled, then gets added here.
const SPLIT_LAYOUT_BODIES: StudentGovBody[] = ['senate']

export function studentGovMetadata(body: StudentGovBody): Metadata {
  const meta = STUDENT_GOV[body]
  return {
    title: `${meta.title} Timeline`,
    description: `Articles and updates on RPI's ${meta.title} from The Polytechnic, newest first.`,
    alternates: { canonical: meta.href },
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

function creditFor(media: Media): string | null {
  const p = media.photographer
  if (p && typeof p === 'object') {
    const name = [(p as User).firstName, (p as User).lastName].filter(Boolean).join(' ')
    if (name) return `${name}/The Polytechnic`
  }
  return media.writeInPhotographer || null
}

/** Photos chosen in the page editor, by media id */
async function getChosenPhotos(payload: Payload, page: TimelinePageConfig): Promise<Map<number, Media>> {
  const ids = [page.photos.default, ...Object.values(page.photos.months)]
    .filter((p): p is TimelinePhoto => p !== null)
    .map((p) => p.media)
  if (ids.length === 0) return new Map()
  const res = await payload.find({
    collection: 'media',
    where: { id: { in: [...new Set(ids)] } },
    limit: ids.length,
    depth: 1,
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
    credit: creditFor(m),
    ...frames,
    sizes: panelPhotoSizes(m.width && m.height ? m.width / m.height : null, frames.desktop.zoom, frames.mobile.zoom),
  }
}

function articlePhoto(item: TimelineItem): PanelPhoto | null {
  if (item.kind !== 'article') return null
  const { article } = item
  const src = article.imageFull || article.image
  if (!src) return null
  const credit = article.imagePhotographer
    ? article.imagePhotographerId != null
      ? `${article.imagePhotographer}/The Polytechnic`
      : article.imagePhotographer
    : null
  const frame = { position: article.imageFocus ?? '50% 50%', zoom: 1 }
  return {
    src,
    alt: article.imageCaption || article.imageTitle || `Photo from “${article.title}”`,
    credit,
    desktop: frame,
    mobile: frame,
    sizes: panelPhotoSizes(article.imageAspect, 1, 1),
  }
}

/**
 * Newest-first items grouped by month. A month's panel photo is, in order:
 * the photo chosen for it in the editor, the default photo, its newest
 * article photo, the next newer month's photo, or the first photo found.
 */
function groupByMonth(items: TimelineItem[], page: TimelinePageConfig, media: Map<number, Media>): TimelineMonth[] {
  const months: TimelineMonth[] = []
  for (const item of items) {
    const key = monthKeyOf(item.date)
    let month = months[months.length - 1]
    if (!month || month.key !== key) {
      month = {
        key,
        label: monthKeyLabel(key, 'long'),
        short: monthKeyLabel(key, 'short'),
        year: key.slice(0, 4),
        articles: 0,
        updates: 0,
        photo: null,
        items: [],
      }
      months.push(month)
    }
    month.items.push(item)
    if (item.kind === 'article') month.articles += 1
    else month.updates += 1
  }

  const defaultPhoto = chosenPhoto(page.photos.default, media)
  for (const month of months) {
    month.photo =
      chosenPhoto(page.photos.months[month.key] ?? null, media) ??
      defaultPhoto ??
      month.items.map(articlePhoto).find((p) => p !== null) ??
      null
  }
  const fallback = months.find((m) => m.photo)?.photo ?? null
  let previous: PanelPhoto | null = null
  for (const month of months) {
    month.photo = month.photo ?? previous ?? fallback
    previous = month.photo
  }
  return months
}

/** Shared page body for /news/senate and /news/executive-board */
export async function StudentGovTimelinePage({ body, year }: { body: StudentGovBody; year?: string }) {
  const payload = await getPayload({ config })
  const page = await getPageConfig(payload, body)
  const items = await getStudentGovTimeline(payload, body, TIMELINE_LIMIT, new Set(page.hidden))

  if (!SPLIT_LAYOUT_BODIES.includes(body)) {
    return (
      <main className="min-h-screen bg-bg-main transition-colors duration-300">
        <Header />
        <StudentGovTimeline body={body} items={items} />
        <Footer />
      </main>
    )
  }

  // One school year (August 1 to July 31) per page, the current one by default
  const href = STUDENT_GOV[body].href
  const currentYear = schoolYearOf(new Date())
  const years = [...new Set([currentYear, ...items.map((item) => schoolYearOf(item.date))])].sort((a, b) => b - a)
  const requested = Number(year)
  const selected = years.includes(requested) ? requested : currentYear
  const yearLink = (y: number) => ({ href: y === currentYear ? href : `${href}?year=${y}`, label: schoolYearLabel(y) })

  const media = await getChosenPhotos(payload, page)
  const months = groupByMonth(
    items.filter((item) => schoolYearOf(item.date) === selected),
    page,
    media,
  )

  return (
    <main className="min-h-screen bg-bg-main transition-colors duration-300">
      <Header />
      <StudentGovSplitTimeline
        body={body}
        months={months}
        entries={page.entries}
        yearLabel={schoolYearLabel(selected)}
        current={selected === currentYear ? null : yearLink(currentYear)}
        olderYears={years.filter((y) => y < selected).map(yearLink)}
      />
      {/* The photo panel runs right down to the footer's rule */}
      <Footer flush />
    </main>
  )
}
