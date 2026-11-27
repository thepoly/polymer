import { MAX_PHOTO_ZOOM, MIN_PHOTO_ZOOM, type PhotoPosition, type PhotoScreen } from '@/components/GetInvolved/photoPositions'

/*
 * A pitch box's photo, placed per screen size: the Features pitch ("Have a
 * suggestion?") and the Opinion guest-writer box. The editor picks a photo
 * and, for each screen (phone, tablet, computer), a focus point and a zoom,
 * as on the Get Involved page. A screen with no position follows the photo's
 * focal point, not zoomed.
 *
 * Shared by the pages (components/PhotoPitch), their layout editors
 * (components/admin/PitchPositionsEditor) and their layout readers, so it
 * must stay free of server-only imports.
 */

export type PitchPositions = Record<PhotoScreen, PhotoPosition | null>
export const NO_PITCH_POSITIONS: PitchPositions = { mobile: null, tablet: null, desktop: null }

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function positionOf(raw: unknown): PhotoPosition | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  if (!finite(p.x) || !finite(p.y)) return null
  return { x: clamp(p.x, 0, 100), y: clamp(p.y, 0, 100), zoom: finite(p.zoom) ? clamp(p.zoom, MIN_PHOTO_ZOOM, MAX_PHOTO_ZOOM) : 1 }
}

/** Any saved value as positions: each screen's in range, or null */
export function pitchPositionsOf(raw: unknown): PitchPositions {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...NO_PITCH_POSITIONS }
  const o = raw as Record<string, unknown>
  return { mobile: positionOf(o.mobile), tablet: positionOf(o.tablet), desktop: positionOf(o.desktop) }
}

/** Rejects a new write that isn't null or three in-range positions (each null or { x, y, zoom }) */
export function validatePitchPositions(raw: unknown): true | string {
  if (raw == null) return true
  if (typeof raw !== 'object' || Array.isArray(raw)) return 'Pitch photo positions must be an object.'
  for (const [screen, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!['mobile', 'tablet', 'desktop'].includes(screen)) return `Unknown screen "${screen}" in pitch photo positions.`
    if (value === null) continue
    const p = value as Record<string, unknown>
    if (!value || typeof value !== 'object' || !finite(p.x) || !finite(p.y) || !finite(p.zoom)) return 'Each pitch photo position needs x, y and zoom.'
    if (p.x < 0 || p.x > 100 || p.y < 0 || p.y > 100 || p.zoom < MIN_PHOTO_ZOOM || p.zoom > MAX_PHOTO_ZOOM) return 'A pitch photo position is out of range.'
  }
  return true
}

const SUFFIX: Record<PhotoScreen, string> = { mobile: 'm', tablet: 't', desktop: 'd' }

/**
 * The CSS variables the pitch photo reads (PITCH_POSITION_CLASSES): each
 * screen's position, or `aim` (the photo's focal point, as an
 * object-position) not zoomed where none is set. Shared with the editors'
 * previews, which set them on the framed page.
 */
export function pitchPositionVars(positions: PitchPositions, aim = '50% 50%'): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const screen of Object.keys(SUFFIX) as PhotoScreen[]) {
    const p = positions[screen]
    vars[`--pitch-pos-${SUFFIX[screen]}`] = p ? `${p.x}% ${p.y}%` : aim
    vars[`--pitch-zoom-${SUFFIX[screen]}`] = String(p?.zoom ?? 1)
  }
  return vars
}

/** The photo's position on each screen, from the variables pitchPositionVars sets (as on Get Involved) */
export const PITCH_POSITION_CLASSES =
  '[object-position:var(--pitch-pos-m)] [transform-origin:var(--pitch-pos-m)] [scale:var(--pitch-zoom-m)] ' +
  'md:[object-position:var(--pitch-pos-t)] md:[transform-origin:var(--pitch-pos-t)] md:[scale:var(--pitch-zoom-t)] ' +
  'lg:[object-position:var(--pitch-pos-d)] lg:[transform-origin:var(--pitch-pos-d)] lg:[scale:var(--pitch-zoom-d)]'

/** The photo behind a pitch box, ready to draw */
export type PitchPhoto = {
  src: string
  width: number
  height: number
  /** "Name/The Polytechnic", or null */
  credit: string | null
  /** Each screen's position as CSS variables (pitchPositionVars) */
  vars: Record<string, string>
  /** The most it's zoomed on any screen, so it downloads a big enough file */
  maxZoom: number
}

type PitchMedia = {
  url?: string | null
  width?: number | null
  height?: number | null
  focalX?: number | null
  focalY?: number | null
  photographer?: unknown
  writeInPhotographer?: string | null
}

/** A media item's photographer, as a staff member or a write-in */
export function photographerOf(m: Pick<PitchMedia, 'photographer' | 'writeInPhotographer'>): string | null {
  const p = m.photographer
  if (p && typeof p === 'object' && 'firstName' in p) {
    const { firstName, lastName } = p as { firstName?: string; lastName?: string }
    const name = [firstName, lastName].filter(Boolean).join(' ')
    if (name) return name
  }
  return m.writeInPhotographer?.trim() || null
}

/**
 * A media item (with its photographer populated, for the credit) as a pitch
 * photo at `positions`; pass NO_PITCH_POSITIONS for a fallback photo, which
 * always sits at its focal point. Null when the item has no file or size.
 */
export function pitchPhotoOf(m: PitchMedia | null | undefined, positions: PitchPositions = NO_PITCH_POSITIONS): PitchPhoto | null {
  if (!m?.url || !m.width || !m.height) return null
  const name = photographerOf(m)
  return {
    src: m.url,
    width: m.width,
    height: m.height,
    credit: name ? `${name}/The Polytechnic` : null,
    vars: pitchPositionVars(positions, m.focalX != null && m.focalY != null ? `${m.focalX}% ${m.focalY}%` : undefined),
    maxZoom: Math.max(1, ...Object.values(positions).map((p) => p?.zoom ?? 1)),
  }
}
