'use client'

import { useCallback } from 'react'
import { PREVIEW_SCREENS, PinnedPhotoPreview, swapPhotos } from '@/components/admin/PinnedPhotoPreview'
import type { PhotoPosition } from '@/components/GetInvolved/photoPositions'
import { pitchPositionVars, type PitchPositions } from '@/lib/pitchPhoto'

/*
 * Where a pitch box's photo sits on phones, tablets and computers, for the
 * Features and Opinion layout editors: the real section page framed at each
 * size, scrolled to the box (components/PhotoPitch, found by `data-pitch`).
 * Drag a preview to move the photo, zoom to crop tighter; Reset goes back to
 * the photo's focal point. Unsaved changes are pushed into the frames (CSS
 * variables and the photo itself), and the editor's Activate saves them with
 * the layout.
 */

/** The picked pitch photo: its file, size and focal point (where it sits until placed) */
export type PitchPhotoInfo = { url: string; title?: string; width: number; height: number; focalX: number; focalY: number }

export type PitchMediaInfo = {
  url?: string | null
  alt?: string | null
  width?: number | null
  height?: number | null
  focalX?: number | null
  focalY?: number | null
}

export const pitchInfoOf = (m: PitchMediaInfo, title?: string): PitchPhotoInfo | null =>
  m.url && m.width && m.height
    ? { url: m.url, title: title ?? (m.alt || undefined), width: m.width, height: m.height, focalX: m.focalX ?? 50, focalY: m.focalY ?? 50 }
    : null

/** Brings the pitch box showing at this screen size into the middle of the framed page */
function scrollToPitch(win: Window) {
  const box = [...win.document.querySelectorAll<HTMLElement>('[data-pitch]')].find((el) => el.getClientRects().length > 0)
  if (!box) return
  const rect = box.getBoundingClientRect()
  win.scrollTo({ top: Math.max(0, rect.top + win.scrollY - (win.innerHeight - rect.height) / 2) })
}

export function PitchPositionsEditor({
  photo,
  positions,
  onChange,
  page,
  pageName,
  heading = 'Pitch photo position',
  labelClassName,
}: {
  photo: PitchPhotoInfo
  positions: PitchPositions
  onChange: (next: PitchPositions) => void
  /** The section page to frame, e.g. "/features" */
  page: string
  /** For the frames' titles: "Features" */
  pageName: string
  heading?: string
  /** The editor's own slot-label class, so the heading matches its other slots */
  labelClassName: string
}) {
  const aim = `${photo.focalX}% ${photo.focalY}%`
  const vars = JSON.stringify(pitchPositionVars(positions, aim))
  const apply = useCallback(
    (doc: Document) => {
      doc.querySelectorAll<HTMLElement>('[data-pitch]').forEach((box) => {
        for (const [name, value] of Object.entries(JSON.parse(vars) as Record<string, string>)) box.style.setProperty(name, value)
        swapPhotos(box, photo.url)
      })
    },
    [vars, photo.url],
  )
  const focal: PhotoPosition = { x: photo.focalX, y: photo.focalY, zoom: 1 }
  return (
    <div style={{ marginTop: 16 }}>
      <div className={labelClassName}>{heading}</div>
      <p style={{ fontSize: '0.78rem', lineHeight: 1.5, opacity: 0.75, margin: '4px 0 12px', maxWidth: 720 }}>
        Drag a preview to move the photo, and zoom in to crop tighter. Phone, tablet and computer are set separately; one
        you haven&rsquo;t moved uses the photo&rsquo;s focal point. The previews are the real page: the photo stays put
        while the page scrolls, so scroll inside one to see how it moves. Press Activate to save.
      </p>
      <div className="gip-screens">
        {PREVIEW_SCREENS.map((screen) => (
          <PinnedPhotoPreview
            key={screen.key}
            screen={screen}
            position={positions[screen.key] ?? focal}
            photo={photo}
            src={page}
            title={`${screen.label} preview of the ${pageName} page`}
            apply={apply}
            home={scrollToPitch}
            homeLabel="Show the box"
            onChange={(next) => onChange({ ...positions, [screen.key]: next })}
            onReset={() => onChange({ ...positions, [screen.key]: null })}
            resetDisabled={positions[screen.key] === null}
          />
        ))}
      </div>
    </div>
  )
}
