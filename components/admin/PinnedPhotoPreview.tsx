'use client'

import { useEffect, useRef, useState } from 'react'
import { MAX_PHOTO_ZOOM, MIN_PHOTO_ZOOM, type PhotoPosition, type PhotoScreen } from '@/components/GetInvolved/photoPositions'
import './get-involved-photo-field.css'

/*
 * One screen's preview for placing a pinned photo (components/PhotoWindow):
 * the real page in a frame at that screen's size, scaled down, with an
 * overlay to drag the photo, a zoom slider and a reset. Modelled on the
 * Senate / E-Board panel photo editor (TimelinePageEditor), and shared by the
 * Get Involved photo field and the Features pitch photo.
 *
 * Unsaved changes are pushed into the framed page by `apply` (setting CSS
 * variables, swapping the photo), so nothing reloads while dragging. The
 * wheel scrolls the framed page.
 */

export type PreviewScreen = { key: PhotoScreen; label: string; note: string; width: number; height: number }

export const PREVIEW_SCREENS: PreviewScreen[] = [
  { key: 'mobile', label: 'Phone', note: 'Under 768px wide', width: 390, height: 844 },
  { key: 'tablet', label: 'iPad, upright', note: '768–1023px wide', width: 820, height: 1180 },
  { key: 'desktop', label: 'Computer', note: '1024px and wider, and iPads held sideways', width: 1440, height: 900 },
]

export type PreviewPhoto = { url: string; width: number; height: number }

const PREVIEW_HEIGHT = 380

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

/**
 * Swaps every photo under `root` for `url`, dropping srcset so the browser
 * doesn't pick its own file back.
 */
export function swapPhotos(root: ParentNode, url: string) {
  root.querySelectorAll('img').forEach((img) => {
    if (img.getAttribute('src') === url) return
    img.removeAttribute('srcset')
    img.removeAttribute('sizes')
    img.src = url
  })
}

export function PinnedPhotoPreview({
  screen,
  position,
  photo,
  src,
  title,
  apply,
  home,
  homeLabel,
  onChange,
  onReset,
  resetDisabled,
}: {
  screen: PreviewScreen
  position: PhotoPosition
  /** The photo being placed: its file (for the frame) and size (for dragging) */
  photo: PreviewPhoto
  /** The page to frame */
  src: string
  /** The frame's title, for the record (it's hidden from screen readers) */
  title: string
  /** Pushes the unsaved state into the framed page. Called on every change and each time the frame loads. */
  apply: (doc: Document) => void
  /** Brings the photo into view in the framed page; run when the frame loads and by the home button */
  home: (win: Window) => void
  homeLabel: string
  onChange: (next: PhotoPosition) => void
  onReset: () => void
  resetDisabled: boolean
}) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; start: PhotoPosition } | null>(null)
  const latest = useRef({ apply, home })
  const [grabbing, setGrabbing] = useState(false)
  const scale = PREVIEW_HEIGHT / screen.height

  // Push the unsaved state into the framed page: now, whenever it changes, and
  // again each time the frame (re)loads. The frame can finish loading before
  // this effect runs, so the load event alone isn't enough.
  useEffect(() => {
    latest.current = { apply, home }
    const doc = frameRef.current?.contentDocument
    if (doc) apply(doc)
  }, [apply, home])

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const onLoad = () => {
      const doc = frame.contentDocument
      const win = frame.contentWindow
      if (doc) latest.current.apply(doc)
      if (win) latest.current.home(win)
    }
    if (frame.contentDocument?.readyState === 'complete' && frame.contentWindow?.location.href !== 'about:blank') onLoad()
    frame.addEventListener('load', onLoad)
    return () => frame.removeEventListener('load', onLoad)
  }, [])

  // Scroll the framed page with the wheel. Not passive, so the admin page
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
          src={src}
          title={title}
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
          onClick={() => {
            const win = frameRef.current?.contentWindow
            if (win) home(win)
          }}
        >
          {homeLabel}
        </button>
        <button type="button" className="gip-btn" disabled={resetDisabled} onClick={onReset}>
          Reset
        </button>
      </div>
    </div>
  )
}
