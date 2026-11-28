import type { Media } from '@/payload-types'

/** Just the focal fields, so this works on anything media-shaped. */
type Focusable = Pick<Media, 'focalX' | 'focalY'>

const clampPercent = (value: number) => Math.max(0, Math.min(100, value))

/**
 * Translate an upload's focal point into a CSS `object-position`.
 *
 * Payload records a focal point on every upload as x/y percentages — editors
 * drag it in the admin, and it lands in `media.focalX` / `media.focalY`. It is
 * what tells a crop which part of the photo must survive, so anywhere we use
 * `object-cover` on a photograph of a person, this is what keeps their head in
 * frame instead of cropping evenly from both edges.
 *
 * Falls back to dead centre, matching the CSS default, when no point is
 * recorded. Note that Payload writes 50/50 for uploads whose point has never
 * been moved, so an untouched image is indistinguishable from a deliberately
 * centred one — both crop from the middle.
 */
export function focalObjectPosition(media: Focusable | null | undefined): string {
  const x = typeof media?.focalX === 'number' ? clampPercent(media.focalX) : 50
  const y = typeof media?.focalY === 'number' ? clampPercent(media.focalY) : 50
  return `${x}% ${y}%`
}

/**
 * `object-position` for a headshot cropped to a circle or square. A focal
 * point an editor has moved wins; an untouched one (50/50) crops a little
 * high, since a face sits in the upper part of a portrait and an even crop
 * of a tall photo cuts off the top of the head.
 */
export function headshotObjectPosition(media: Focusable | null | undefined): string {
  const untouched = (media?.focalX ?? 50) === 50 && (media?.focalY ?? 50) === 50
  return untouched ? '50% 30%' : focalObjectPosition(media)
}
