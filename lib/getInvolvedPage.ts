import { getPayload } from 'payload'
import configPromise from '@payload-config'
import type { Media } from '@/payload-types'
import { resolveCredit } from '@/components/Article/PhotoCaption'
import type { PhotoSource } from '@/components/PhotoWindow'
import {
  DEFAULT_PHOTO_POSITIONS,
  MAX_PHOTO_ZOOM,
  MIN_PHOTO_ZOOM,
  type PhotoPosition,
  type PhotoPositions,
} from '@/components/GetInvolved/photoPositions'
// PLACEHOLDER from the local dev media, used until an editor picks a photo in
// the Get Involved Page global.
import placeholderPhoto from '@/components/GetInvolved/photos/hero.webp'

export type GetInvolvedPhoto = PhotoSource & { alt: string; credit: string | null }

const PLACEHOLDER: GetInvolvedPhoto = {
  src: placeholderPhoto.src,
  width: placeholderPhoto.width,
  height: placeholderPhoto.height,
  blurDataURL: placeholderPhoto.blurDataURL,
  alt: 'Looking out over Troy from a glass walkway on campus',
  credit: null,
}

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}

function readPosition(raw: unknown, fallback: PhotoPosition): PhotoPosition {
  const group = (raw ?? {}) as { focusX?: unknown; focusY?: unknown; zoom?: unknown }
  return {
    x: clamp(group.focusX ?? fallback.x, 0, 100, fallback.x),
    y: clamp(group.focusY ?? fallback.y, 0, 100, fallback.y),
    zoom: clamp(group.zoom ?? fallback.zoom, MIN_PHOTO_ZOOM, MAX_PHOTO_ZOOM, fallback.zoom),
  }
}

function readPhoto(media: Media | number | null | undefined): GetInvolvedPhoto {
  if (!media || typeof media !== 'object' || !media.url || !media.width || !media.height) return PLACEHOLDER
  const { staff, writeIn } = resolveCredit({ image: media })
  const credit = staff.length
    ? `${staff.map((u) => `${u.firstName} ${u.lastName}`).join(', ')}/The Polytechnic`
    : writeIn
  return { src: media.url, width: media.width, height: media.height, alt: media.alt || '', credit }
}

/**
 * The Get involved page's pinned photo and where it sits on each screen size.
 * Falls back to the placeholder and the default positions when nothing is set,
 * or when the global can't be read (for example before its migration has run).
 */
export async function getInvolvedPage(): Promise<{ photo: GetInvolvedPhoto; positions: PhotoPositions }> {
  try {
    const payload = await getPayload({ config: configPromise })
    const page = await payload.findGlobal({ slug: 'get-involved-page', depth: 2 })
    return {
      photo: readPhoto(page.photo),
      positions: {
        mobile: readPosition(page.mobile, DEFAULT_PHOTO_POSITIONS.mobile),
        tablet: readPosition(page.tablet, DEFAULT_PHOTO_POSITIONS.tablet),
        desktop: readPosition(page.desktop, DEFAULT_PHOTO_POSITIONS.desktop),
      },
    }
  } catch (error) {
    console.error('[get-involved] could not read the Get Involved Page global; using defaults', error)
    return { photo: PLACEHOLDER, positions: DEFAULT_PHOTO_POSITIONS }
  }
}
