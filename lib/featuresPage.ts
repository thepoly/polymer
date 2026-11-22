// Everything /features shows: the editors' layout resolved into stories, The
// Lens photo of the day, and the archive row. Editors pin what they want and
// leave the rest empty; empty slots fill from the newest stories. Features
// publishes two or three stories a month during term and nothing over the
// summer, so the rules below keep the page from going stale when nobody has
// touched the layout in a while. A missing table leaves the page on automatic.
import type { Payload } from 'payload'
import type { Article as ComponentArticle } from '@/components/FrontPage/types'
import { formatArticle } from '@/utils/formatArticle'
import { getArticleUrl } from '@/utils/getArticleUrl'
import { troyDay } from './troyTime'
import { FEATURES_SLOT_COUNTS, normalizeFeaturesLayout, type FeaturesLayout, type LensPhoto } from './featuresLayout'

/** A pinned story gives way once it is this much older than the newest story */
export const PIN_STALE_DAYS = 42
/** The Lens falls back to recent photos once every pick is this old */
export const LENS_STALE_DAYS = 60
/** Stories in the archive row */
const ARCHIVE_COUNT = 12
/** Words a minute, for "8 min read" */
const WORDS_PER_MINUTE = 230

const DAY_MS = 24 * 60 * 60 * 1000

export type FeaturesStory = ComponentArticle & {
  /** Minutes to read the text, when it has much text */
  readMinutes?: number | null
  /** Photos in the story (lead photo, inline photos, galleries) */
  photoCount?: number
  /** A photo-led story: "Photo" in the kicker, a photo feature, or a gallery */
  isPhotoStory?: boolean
  /** The photo an editor chose for its card, else its lead photo */
  cardImage?: string | null
}

export type FeaturesLens = {
  photo: LensPhoto
  /** False when the editors' picks are empty or stale and this is a recent photo instead */
  picked: boolean
}

export type FeaturesPageData = {
  cover: FeaturesStory | null
  second: FeaturesStory | null
  strips: FeaturesStory[]
  photoStories: FeaturesStory[]
  archive: FeaturesStory[]
  lens: FeaturesLens | null
}

const CARD_SELECT = {
  title: true,
  slug: true,
  subdeck: true,
  featuredImage: true,
  section: true,
  kicker: true,
  publishedDate: true,
  createdAt: true,
  authors: true,
  writeInAuthors: true,
  isFollytechnic: true,
} as const

const dateOf = (a: ComponentArticle) => {
  const iso = a.publishedDate || a.isoDate || a.createdAt
  const t = iso ? new Date(iso).getTime() : NaN
  return Number.isNaN(t) ? 0 : t
}

/** Counts photos in a Lexical body: inline uploads and gallery / carousel images */
function countPhotos(content: unknown): { photos: number; gallery: boolean } {
  let photos = 0
  let gallery = false
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    const n = node as Record<string, unknown>
    if (n.type === 'upload') photos += 1
    const fields = (n.fields ?? n) as Record<string, unknown>
    if ((fields.blockType === 'photo_gallery' || fields.blockType === 'carousel') && Array.isArray(fields.images)) {
      gallery = true
      photos += fields.images.length
    }
    if (Array.isArray(n.children)) n.children.forEach(walk)
    if (n.root) walk(n.root)
  }
  walk(content)
  return { photos, gallery }
}

/** Reading time, photo count and photo-story flag for each story */
async function loadStoryMeta(payload: Payload, ids: (string | number)[]) {
  const meta = new Map<string, Pick<FeaturesStory, 'readMinutes' | 'photoCount' | 'isPhotoStory'>>()
  if (ids.length === 0) return meta
  try {
    const response = await payload.find({
      collection: 'articles',
      where: { id: { in: ids } },
      limit: ids.length,
      depth: 0,
      select: { content: true, plainContent: true, isPhotofeature: true, kicker: true, featuredImage: true },
    })
    for (const doc of response.docs) {
      const words = typeof doc.plainContent === 'string' ? doc.plainContent.split(/\s+/).filter(Boolean).length : 0
      const { photos, gallery } = countPhotos(doc.content)
      const plain = typeof doc.plainContent === 'string' ? doc.plainContent : ''
      meta.set(String(doc.id), {
        // Under two minutes isn't worth saying
        readMinutes: words >= WORDS_PER_MINUTE * 2 ? Math.round(words / WORDS_PER_MINUTE) : null,
        photoCount: photos + (doc.featuredImage ? 1 : 0),
        isPhotoStory:
          /photo/i.test(doc.kicker ?? '') || Boolean(doc.isPhotofeature) || plain.includes('#photofeature#') || gallery,
      })
    }
  } catch {
    // Without the extra details the cards simply leave them out
  }
  return meta
}

/** Stories the editors pinned; one that is no longer published resolves to nothing */
async function loadPinned(payload: Payload, layout: FeaturesLayout) {
  const ids = [
    ...new Set(
      [...layout.cover, ...layout.second, ...layout.strips, ...layout.photoStories].filter(
        (id): id is number => id !== null,
      ),
    ),
  ]
  const pinned = new Map<string, ComponentArticle>()
  if (ids.length === 0) return pinned
  try {
    const response = await payload.find({
      collection: 'articles',
      where: { and: [{ id: { in: ids } }, { _status: { equals: 'published' } }] },
      limit: ids.length,
      depth: 1,
      select: CARD_SELECT,
    })
    for (const doc of response.docs) {
      const article = formatArticle(doc)
      if (article) pinned.set(String(doc.id), article)
    }
  } catch {
    // Pins are skipped; their slots fill automatically
  }
  return pinned
}

async function loadLayout(payload: Payload): Promise<{ layout: FeaturesLayout; savedAt: string | null }> {
  try {
    const response = await payload.find({
      collection: 'features-page-layout',
      limit: 1,
      depth: 0,
      select: { layout: true, updatedAt: true },
    })
    const doc = response.docs[0]
    return { layout: normalizeFeaturesLayout(doc?.layout), savedAt: doc?.updatedAt ?? null }
  } catch {
    return { layout: normalizeFeaturesLayout(null), savedAt: null }
  }
}

/** Days since 1970 in Troy, so The Lens turns over at local midnight */
const troyDayNumber = (now: Date) => Math.floor(new Date(`${troyDay(now)}T00:00:00Z`).getTime() / DAY_MS)

/**
 * Recent credited photos from any section: the lead photos of the newest
 * stories whose photo has a named photographer. Used when the editors'
 * picks are empty or all older than LENS_STALE_DAYS.
 */
async function loadRecentPhotos(payload: Payload): Promise<LensPhoto[]> {
  try {
    const response = await payload.find({
      collection: 'articles',
      where: { and: [{ _status: { equals: 'published' } }, { featuredImage: { exists: true } }] },
      sort: '-publishedDate',
      limit: 24,
      depth: 2,
      select: CARD_SELECT,
    })
    return response.docs
      .map((doc) => formatArticle(doc))
      .filter((a): a is ComponentArticle => Boolean(a?.imageFull && a.imagePhotographer))
      .slice(0, 10)
      .map((a) => ({
        url: a.imageFull as string,
        caption: a.imageCaption || undefined,
        articleTitle: a.title,
        articleUrl: getArticleUrl(a),
        photographerName: a.imagePhotographer || undefined,
        photographerUrl: a.imagePhotographerId ? `/staff/${a.imagePhotographerId}` : undefined,
      }))
  } catch {
    return []
  }
}

async function resolveLens(
  payload: Payload,
  layout: FeaturesLayout,
  savedAt: string | null,
  now: Date,
): Promise<FeaturesLens | null> {
  const day = troyDayNumber(now)
  const fallbackAdded = savedAt ? new Date(savedAt).getTime() : 0
  const freshest = Math.max(
    0,
    ...layout.lens.map((p) => {
      const t = p.addedAt ? new Date(p.addedAt).getTime() : fallbackAdded
      return Number.isNaN(t) ? 0 : t
    }),
  )
  if (layout.lens.length > 0 && now.getTime() - freshest <= LENS_STALE_DAYS * DAY_MS) {
    return { photo: layout.lens[day % layout.lens.length], picked: true }
  }
  const recent = await loadRecentPhotos(payload)
  if (recent.length === 0) {
    // Stale picks still beat an empty box
    return layout.lens.length > 0 ? { photo: layout.lens[day % layout.lens.length], picked: true } : null
  }
  return { photo: recent[day % recent.length], picked: false }
}

/**
 * Resolves the layout against the newest Features stories (`articles`,
 * newest first).
 */
export async function loadFeaturesPage(
  payload: Payload,
  articles: ComponentArticle[],
  now: Date = new Date(),
): Promise<FeaturesPageData> {
  const { layout, savedAt } = await loadLayout(payload)
  const pinned = await loadPinned(payload, layout)

  const newest = articles.reduce((latest, a) => Math.max(latest, dateOf(a)), 0)
  // A pin far older than the newest story gives way to automatic filling, so
  // a layout nobody has opened since last semester doesn't keep old news up
  const livePin = (id: number | null): ComponentArticle | null => {
    if (id === null) return null
    const article = pinned.get(String(id))
    if (!article) return null
    if (newest && newest - dateOf(article) > PIN_STALE_DAYS * DAY_MS) return null
    return article
  }

  const used = new Set<string>()
  for (const id of [...layout.cover, ...layout.second, ...layout.strips, ...layout.photoStories]) {
    if (livePin(id)) used.add(String(id))
  }

  const meta = await loadStoryMeta(payload, [
    ...new Set([...articles.map((a) => a.id), ...[...pinned.values()].map((a) => a.id)]),
  ])
  const withMeta = (a: ComponentArticle, cardImage?: string | null): FeaturesStory => ({
    ...a,
    ...meta.get(String(a.id)),
    cardImage: cardImage || a.image,
  })

  // The newest unused story, preferring one with a photo since every slot shows one
  const take = (accept: (a: ComponentArticle) => boolean = () => true): ComponentArticle | null => {
    const next =
      articles.find((a) => !used.has(String(a.id)) && a.image && accept(a)) ??
      articles.find((a) => !used.has(String(a.id)) && accept(a))
    if (next) used.add(String(next.id))
    return next ?? null
  }
  const slot = (id: number | null) => livePin(id) ?? take()

  const cover = slot(layout.cover[0])
  const second = slot(layout.second[0])
  const strips = Array.from({ length: FEATURES_SLOT_COUNTS.strips }, (_, i) => slot(layout.strips[i])).filter(
    (a): a is ComponentArticle => a !== null,
  )

  // Photo Stories only auto-fill with photo-led stories, so the label is
  // always true; the row shows fewer, or none, rather than mislabel a story
  const isPhotoStory = (a: ComponentArticle) => Boolean(meta.get(String(a.id))?.isPhotoStory && a.image)
  const photoStories = Array.from({ length: FEATURES_SLOT_COUNTS.photoStories }, (_, i) => {
    const article = livePin(layout.photoStories[i]) ?? take(isPhotoStory)
    return article ? withMeta(article, livePin(layout.photoStories[i]) ? layout.photoStoryImages[i] : null) : null
  }).filter((a): a is FeaturesStory => a !== null)

  const archive: FeaturesStory[] = []
  while (archive.length < ARCHIVE_COUNT) {
    const next = take()
    if (!next) break
    archive.push(withMeta(next))
  }

  return {
    cover: cover ? withMeta(cover) : null,
    second: second ? withMeta(second) : null,
    strips: strips.map((a) => withMeta(a)),
    photoStories,
    archive,
    lens: await resolveLens(payload, layout, savedAt, now),
  }
}
