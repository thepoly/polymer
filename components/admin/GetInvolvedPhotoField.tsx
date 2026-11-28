'use client'

import { useCallback, useEffect, useState } from 'react'
import { useField } from '@payloadcms/ui'
import placeholderPhoto from '@/components/GetInvolved/photos/hero.webp'
import {
  DEFAULT_PHOTO_POSITIONS,
  photoPositionVars,
  type PhotoPosition,
  type PhotoPositions,
  type PhotoScreen,
} from '@/components/GetInvolved/photoPositions'
import { PREVIEW_SCREENS, PinnedPhotoPreview, swapPhotos, type PreviewPhoto } from './PinnedPhotoPreview'

/*
 * Photo position editor for the Get Involved Page global, modelled on the
 * Senate / E-Board panel photo editor (TimelinePageEditor): drag a preview to
 * move the photo, zoom with the slider, reset to the default.
 *
 * Each preview is the real /get-involved page in a frame at that screen's
 * size, scaled down (PinnedPhotoPreview), so editors see exactly how the
 * pinned photo lines up behind every opening. Unsaved changes are pushed into
 * the frame by setting the page's CSS variables (and swapping the photo), so
 * nothing reloads while dragging. The values live in the hidden mobile /
 * tablet / desktop groups.
 */

const PLACEHOLDER: PreviewPhoto = { url: placeholderPhoto.src, width: placeholderPhoto.width, height: placeholderPhoto.height }

const num = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback)

/** One screen's focus point and zoom, read from and written to the hidden fields. */
function usePosition(screen: PhotoScreen) {
  const x = useField<number>({ path: `${screen}.focusX` })
  const y = useField<number>({ path: `${screen}.focusY` })
  const zoom = useField<number>({ path: `${screen}.zoom` })
  const d = DEFAULT_PHOTO_POSITIONS[screen]
  const value: PhotoPosition = { x: num(x.value, d.x), y: num(y.value, d.y), zoom: num(zoom.value, d.zoom) }
  const { setValue: setX } = x
  const { setValue: setY } = y
  const { setValue: setZoom } = zoom
  const set = useCallback(
    (next: PhotoPosition) => {
      setX(next.x)
      setY(next.y)
      setZoom(next.zoom)
    },
    [setX, setY, setZoom],
  )
  return [value, set] as const
}

export function GetInvolvedPhotoField() {
  const { value: photoValue } = useField<number | { id: number } | null>({ path: 'photo' })
  const photoId = photoValue && typeof photoValue === 'object' ? photoValue.id : photoValue
  // The picked photo's file and size, fetched by id; the placeholder until it
  // arrives, or when no photo is picked.
  const [fetched, setFetched] = useState<{ id: number; photo: PreviewPhoto } | null>(null)
  const photo = photoId && fetched?.id === photoId ? fetched.photo : PLACEHOLDER

  useEffect(() => {
    if (!photoId) return
    let cancelled = false
    fetch(`/api/media/${photoId}?depth=0`)
      .then((r) => (r.ok ? r.json() : null))
      .then((doc: { url?: string; width?: number; height?: number } | null) => {
        if (cancelled) return
        const next = doc?.url && doc.width && doc.height ? { url: doc.url, width: doc.width, height: doc.height } : PLACEHOLDER
        setFetched({ id: photoId, photo: next })
      })
      .catch(() => !cancelled && setFetched({ id: photoId, photo: PLACEHOLDER }))
    return () => {
      cancelled = true
    }
  }, [photoId])

  const [mobile, setMobile] = usePosition('mobile')
  const [tablet, setTablet] = usePosition('tablet')
  const [desktop, setDesktop] = usePosition('desktop')
  const positions: PhotoPositions = { mobile, tablet, desktop }
  const setters: Record<PhotoScreen, (next: PhotoPosition) => void> = { mobile: setMobile, tablet: setTablet, desktop: setDesktop }

  const vars = JSON.stringify(photoPositionVars(positions))
  const apply = useCallback(
    (doc: Document) => {
      const main = doc.querySelector<HTMLElement>('main[data-get-involved-page]')
      if (!main) return
      for (const [name, value] of Object.entries(JSON.parse(vars) as Record<string, string>)) main.style.setProperty(name, value)
      swapPhotos(main, photo.url)
    },
    [vars, photo.url],
  )
  const home = useCallback((win: Window) => win.scrollTo({ top: 0 }), [])

  return (
    <div className="gip-root field-type">
      <div className="gip-head">
        <span className="gip-title">Photo position</span>
        <p className="gip-help">
          Drag a preview to move the photo, and zoom in to crop tighter. Each screen size is set separately. The
          previews are the real page: scroll inside one to see the meeting box and buttons. Press Save to publish.
        </p>
      </div>
      <div className="gip-screens">
        {PREVIEW_SCREENS.map((screen) => {
          const position = positions[screen.key]
          const d = DEFAULT_PHOTO_POSITIONS[screen.key]
          return (
            <PinnedPhotoPreview
              key={screen.key}
              screen={screen}
              position={position}
              photo={photo}
              src="/get-involved"
              title={`${screen.label} preview of the Get involved page`}
              apply={apply}
              home={home}
              homeLabel="Back to top"
              onChange={setters[screen.key]}
              onReset={() => setters[screen.key](d)}
              resetDisabled={position.x === d.x && position.y === d.y && position.zoom === d.zoom}
            />
          )
        })}
      </div>
    </div>
  )
}

export default GetInvolvedPhotoField
