"use client";

import { useCallback, useEffect, useRef } from "react";
import type { DragEvent, MouseEvent, PointerEvent, RefObject } from "react";

const DRAG_THRESHOLD = 6;
const VELOCITY_WINDOW_MS = 100;
const COAST_DECAY_MS = 420;
const MAX_SPEED = 3.5; // Pixels per millisecond

type Sample = { x: number; time: number };
type Drag = {
  pointerId: number;
  x: number;
  y: number;
  scrollLeft: number;
  moved: boolean;
  samples: Sample[];
};

/** Horizontal touch gestures and optional mouse dragging with a longer coast.
 * The viewport must allow `pan-y pinch-zoom` so vertical scrolling and zoom
 * stay with the browser. Trackpad scrolling keeps the device's own momentum.
 */
export function useMomentumScroll(ref: RefObject<HTMLDivElement | null>, { mouseDrag = false } = {}) {
  const dragRef = useRef<Drag | null>(null);
  const frameRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  const stopMomentum = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  useEffect(() => {
    const viewport = ref.current;
    // Keep row swipes away from the document's mobile menu gesture. Attach
    // directly here, before the event reaches document-level React listeners.
    const ownTouch = (event: TouchEvent) => event.stopPropagation();
    viewport?.addEventListener("touchstart", ownTouch, { passive: true });
    return () => {
      stopMomentum();
      viewport?.removeEventListener("touchstart", ownTouch);
    };
  }, [ref, stopMomentum]);

  const coast = (viewport: HTMLDivElement, speed: number) => {
    if (Math.abs(speed) < 0.1 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let velocity = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, speed));
    let position = viewport.scrollLeft;
    let previousTime = performance.now();
    const tick = (time: number) => {
      const elapsed = Math.min(64, Math.max(0, time - previousTime));
      previousTime = time;
      if (elapsed === 0) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }
      const decay = Math.exp(-elapsed / COAST_DECAY_MS);
      position += velocity * COAST_DECAY_MS * (1 - decay);
      viewport.scrollTo({ left: position, behavior: "instant" });
      velocity *= decay;
      // Stop at either edge, or when the remaining motion is imperceptible.
      if (position <= 0 || position >= viewport.scrollWidth - viewport.clientWidth || Math.abs(velocity) < 0.03) {
        frameRef.current = null;
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  const release = (viewport: HTMLDivElement) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag && viewport.hasPointerCapture(drag.pointerId)) viewport.releasePointerCapture(drag.pointerId);
    return drag;
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const wasCoasting = frameRef.current !== null;
    stopMomentum();
    release(event.currentTarget);
    // Catching a moving row should not also open the link under the finger.
    suppressClickRef.current = wasCoasting;
    if (!event.isPrimary || event.button !== 0) return;
    if (event.pointerType !== "touch" && !(mouseDrag && event.pointerType === "mouse")) return;
    // Also interrupt any smooth arrow scroll before grabbing the row.
    event.currentTarget.scrollTo({ left: event.currentTarget.scrollLeft, behavior: "instant" });
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: event.currentTarget.scrollLeft,
      moved: false,
      samples: [{ x: event.clientX, time: event.timeStamp }],
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = event.clientX - drag.x;
    if (!drag.moved) {
      if (Math.max(Math.abs(distance), Math.abs(event.clientY - drag.y)) < DRAG_THRESHOLD) return;
      if (Math.abs(event.clientY - drag.y) > Math.abs(distance)) {
        release(event.currentTarget);
        return;
      }
      drag.moved = true;
      suppressClickRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    event.currentTarget.scrollTo({ left: drag.scrollLeft - distance, behavior: "instant" });
    drag.samples.push({ x: event.clientX, time: event.timeStamp });
    drag.samples = drag.samples.filter(sample => event.timeStamp - sample.time <= VELOCITY_WINDOW_MS);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    const drag = release(event.currentTarget);
    if (!drag?.moved) return;
    const first = drag.samples[0];
    const last = drag.samples[drag.samples.length - 1];
    const elapsed = last.time - first.time;
    // Holding still before release deliberately brings the row to a stop.
    if (event.timeStamp - last.time <= VELOCITY_WINDOW_MS && elapsed > 0) {
      coast(event.currentTarget, (first.x - last.x) / elapsed);
    }
  };

  const cancelDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) release(event.currentTarget);
  };

  return {
    stopMomentum,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: cancelDrag,
      onLostPointerCapture: (event: PointerEvent<HTMLDivElement>) => {
        // Touch starts with implicit capture on the link/image under the
        // finger. Its bubbled loss during transfer must not cancel our drag.
        if (event.target === event.currentTarget) cancelDrag(event);
      },
      onPointerLeave: (event: PointerEvent<HTMLDivElement>) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) cancelDrag(event);
      },
      onWheel: stopMomentum,
      onKeyDown: stopMomentum,
      onFocusCapture: stopMomentum,
      onDragStart: (event: DragEvent<HTMLDivElement>) => event.preventDefault(),
      onClickCapture: (event: MouseEvent<HTMLDivElement>) => {
        if (suppressClickRef.current && event.detail > 0) {
          event.preventDefault();
          event.stopPropagation();
        }
        suppressClickRef.current = false;
      },
    },
  };
}
