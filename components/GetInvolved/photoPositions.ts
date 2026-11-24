import type { CSSProperties } from 'react'

/*
 * Where the Get involved photo sits on each screen size: a focus point (x, y
 * as object-position percentages) and a zoom that pivots on it, exactly as the
 * page draws it (see PHOTO_POSITION_CLASSES in Peephole.tsx).
 *
 * Shared by the page, the Get Involved Page global's field defaults, and the
 * admin preview, so it must stay free of server-only imports.
 */
export type PhotoPosition = { x: number; y: number; zoom: number }
export type PhotoScreen = 'mobile' | 'tablet' | 'desktop'
export type PhotoPositions = Record<PhotoScreen, PhotoPosition>

export const MIN_PHOTO_ZOOM = 1
export const MAX_PHOTO_ZOOM = 2.5

/**
 * Phones zoom in around a low focus point by default: at 1x the photo can only
 * slide sideways there, and the heading card at the top of the screen would
 * show nothing but sky.
 */
export const DEFAULT_PHOTO_POSITIONS: PhotoPositions = {
  mobile: { x: 70, y: 85, zoom: 1.6 },
  tablet: { x: 70, y: 60, zoom: 1 },
  desktop: { x: 70, y: 60, zoom: 1 },
}

const SUFFIX: Record<PhotoScreen, string> = { mobile: 'm', tablet: 't', desktop: 'd' }

/** The CSS variables every photo opening reads, for an element that contains them all. */
export function photoPositionVars(positions: PhotoPositions): CSSProperties {
  const vars: Record<string, string> = {}
  for (const screen of Object.keys(SUFFIX) as PhotoScreen[]) {
    const p = positions[screen]
    vars[`--photo-pos-${SUFFIX[screen]}`] = `${p.x}% ${p.y}%`
    vars[`--photo-zoom-${SUFFIX[screen]}`] = String(p.zoom)
  }
  return vars as CSSProperties
}
