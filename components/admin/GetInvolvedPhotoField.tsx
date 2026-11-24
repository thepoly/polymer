'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useField } from '@payloadcms/ui'
import placeholderPhoto from '@/components/GetInvolved/photos/hero.webp'
import {
  DEFAULT_PHOTO_POSITIONS,
  MAX_PHOTO_ZOOM,
  MIN_PHOTO_ZOOM,
  photoPositionVars,
  type PhotoPosition,
  type PhotoPositions,
  type PhotoScreen,
} from '@/components/GetInvolved/photoPositions'
import './get-involved-photo-field.css'

/*
 * Photo position editor for the Get Involved Page global, modelled on the
 * Senate / E-Board panel photo editor (TimelinePageEditor): drag a preview to
 * move the photo, zoom with the slider, reset to the default.
 *
 * Each preview is the real /get-involved page in a frame at that screen's
 * size, scaled down, so editors see exactly how the pinned photo lines up
 * behind every opening. Unsaved changes are pushed into the frame by setting
 * the page's CSS variables (and swapping the photo), so nothing reloads while
 * dragging. The values live in the hidden mobile / tablet / desktop groups.
 */

type Photo = { url: string; width: number; height: number }

const PLACEHOLDER: Photo = { url: placeholderPhoto.src, width: placeholderPhoto.width, height: placeholderPhoto.height }

const SCREENS: { key: PhotoScreen; label: string; note: string; width: number; height: number }[] = [
  { key: 'mobile', label: 'Phone', note: 'Under 768px wide', width: 390, height: 844 },
  { key: 'tablet', label: 'iPad, upright', note: '768–1023px wide', width: 820, height: 1180 },
  { key: 'desktop', label: 'Computer', note: '1024px and wider, and iPads held sideways', width: 1440, height: 900 },
]

const PREVIEW_HEIGHT = 380

const num = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback)
const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * Where the photo should sit after being pulled by (dx, dy) page pixels. Same
 * model as TimelinePageEditor's pannedFrame: the photo is drawn cover-fit at
 * `zoom` and the zoom pivots on the object-position point, so its left edge
 * lands at x% · (screen width − drawn width). An axis with no spare photo
 * (on a phone at 1x, the vertical one) can't move.
 */
function pannedPosition(
  start: PhotoPosition,
  dx: number,
  dy: number,
  screen: { width: number; height: number },
  natural: { width: number; height: number },
): PhotoPosition {
  const cover = Math.max(screen.width / natural.width, screen.height / natural.height) * start.zoom
  const spareX = screen.width - natural.width * cover
  const spareY = screen.height - natural.height * cover
  const move = (pct: number, delta: number, spare: number) =>
    spare < -0.5 ? round1(Math.min(100, Math.max(0, pct + (delta / spare) * 100))) : pct
  return { ...start, x: move(start.x, dx, spareX), y: move(start.y, dy, spareY) }
}

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

function ScreenPreview({
  screen,
  positions,
  photo,
  onChange,
}: {
  screen: (typeof SCREENS)[number]
  positions: PhotoPositions
  photo: Photo
  onChange: (next: PhotoPosition) => void
}) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; start: PhotoPosition } | null>(null)
  const latest = useRef({ positions, photo })
  const [grabbing, setGrabbing] = useState(false)
  const scale = PREVIEW_HEIGHT / screen.height
  const position = positions[screen.key]
  const isDefault =
    position.x === DEFAULT_PHOTO_POSITIONS[screen.key].x &&
    position.y === DEFAULT_PHOTO_POSITIONS[screen.key].y &&
    position.zoom === DEFAULT_PHOTO_POSITIONS[screen.key].zoom

  // Push the unsaved positions and photo into the framed page: now, whenever
  // they change, and again each time the frame (re)loads. The frame can finish
  // loading before this component mounts, so the load event alone isn't enough.
  const applyToFrame = useCallback(() => {
    const main = frameRef.current?.contentDocument?.querySelector<HTMLElement>('main[data-get-involved-page]')
    if (!main) return
    const { positions: current, photo: currentPhoto } = latest.current
    for (const [name, value] of Object.entries(photoPositionVars(current))) main.style.setProperty(name, String(value))
    main.querySelectorAll('img').forEach((img) => {
      if (img.getAttribute('src') === currentPhoto.url) return
      img.removeAttribute('srcset')
      img.removeAttribute('sizes')
      img.src = currentPhoto.url
    })
  }, [])

  useEffect(() => {
    latest.current = { positions, photo }
    applyToFrame()
  }, [positions, photo, applyToFrame])

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    frame.addEventListener('load', applyToFrame)
    return () => frame.removeEventListener('load', applyToFrame)
  }, [applyToFrame])

  // Scroll the framed page with the wheel. Not passive, so the newsroom page
  // itself doesn't scroll at the same time.
  useEffect(() => {
    const overlay = overlayRef.current
    if (!overlay) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      frameRef.current?.contentWindow?.scrollBy({ top: e.deltaY / scale })
    }
    overlay.addEventListener('wheel', onWheel, { passive: false })
    return () => overlay.removeEventListener('wheel', onWheel)
  }, [scale])

  const endDrag = () => {
    drag.current = null
    setGrabbing(false)
  }

  const nudge = (dx: number, dy: number) =>
    onChange({ ...position, x: round1(Math.min(100, Math.max(0, position.x + dx))), y: round1(Math.min(100, Math.max(0, position.y + dy))) })

  return (
    <div className="gip-screen">
      <div className="gip-screen-head">
        <strong>{screen.label}</strong>
        <span>{screen.note}</span>
      </div>
      <div className="gip-preview" style={{ width: Math.round(screen.width * scale), height: PREVIEW_HEIGHT }}>
        <iframe
          ref={frameRef}
          src="/get-involved"
          title={`${screen.label} preview of the Get involved page`}
          tabIndex={-1}
          aria-hidden="true"
          style={{ width: screen.width, height: screen.height, transform: `scale(${scale})` }}
        />
        <div
          ref={overlayRef}
          className={`gip-overlay ${grabbing ? 'gip-grabbing' : ''}`}
          role="application"
          aria-roledescription="photo position"
          tabIndex={0}
          aria-label={`${screen.label} photo position: ${position.x}% across, ${position.y}% down, zoom ${Math.round(position.zoom * 100)}%. Arrow keys move the photo; hold Shift for bigger steps.`}
          title="Drag to move the photo. Scroll to see the rest of the page."
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            drag.current = { x: e.clientX, y: e.clientY, start: position }
            setGrabbing(true)
          }}
          onPointerMove={(e) => {
            const start = drag.current
            if (!start) return
            onChange(
              pannedPosition(
                start.start,
                (e.clientX - start.x) / scale,
                (e.clientY - start.y) / scale,
                { width: screen.width, height: screen.height },
                photo,
              ),
            )
          }}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 5 : 1
            const moves: Record<string, [number, number]> = {
              ArrowLeft: [step, 0],
              ArrowRight: [-step, 0],
              ArrowUp: [0, step],
              ArrowDown: [0, -step],
            }
            const move = moves[e.key]
            if (!move) return
            e.preventDefault()
            nudge(move[0], move[1])
          }}
        />
      </div>
      <label className="gip-zoom">
        <span>Zoom {Math.round(position.zoom * 100)}%</span>
        <input
          type="range"
          min={MIN_PHOTO_ZOOM}
          max={MAX_PHOTO_ZOOM}
          step={0.05}
          value={position.zoom}
          aria-label={`${screen.label} zoom`}
          onChange={(e) => onChange({ ...position, zoom: Number(e.target.value) })}
        />
      </label>
      <div className="gip-actions">
        <button
          type="button"
          className="gip-btn"
          onClick={() => frameRef.current?.contentWindow?.scrollTo({ top: 0 })}
        >
          Back to top
        </button>
        <button type="button" className="gip-btn" disabled={isDefault} onClick={() => onChange(DEFAULT_PHOTO_POSITIONS[screen.key])}>
          Reset
        </button>
      </div>
    </div>
  )
}

export function GetInvolvedPhotoField() {
  const { value: photoValue } = useField<number | { id: number } | null>({ path: 'photo' })
  const photoId = photoValue && typeof photoValue === 'object' ? photoValue.id : photoValue
  // The picked photo's file and size, fetched by id; the placeholder until it
  // arrives, or when no photo is picked.
  const [fetched, setFetched] = useState<{ id: number; photo: Photo } | null>(null)
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
        {SCREENS.map((screen) => (
          <ScreenPreview
            key={screen.key}
            screen={screen}
            positions={positions}
            photo={photo}
            onChange={setters[screen.key]}
          />
        ))}
      </div>
    </div>
  )
}

export default GetInvolvedPhotoField
