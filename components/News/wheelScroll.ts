/**
 * Scroll an element (or the page) by a wheel event's worth, for wheel events
 * the timeline handles itself instead of leaving to the browser.
 *
 * Mouse wheels move in big steps, so those are animated; trackpads send many
 * small steps that already read as smooth, so those are applied at once. A
 * new smooth scroll cancels the one still running, so quick wheel clicks
 * would otherwise each restart from wherever the last had got to and fall
 * short: each step here is added to where the previous one was heading.
 */

type Target = HTMLElement | Window;

/** Where each target's smooth scroll is heading, and when that was set */
const heading = new WeakMap<Target, { top: number; at: number }>();
/** How long a smooth scroll's destination is trusted (a wheel click's animation is shorter) */
const HEADING_MS = 450;

const scrollTopOf = (t: Target) => (t instanceof Window ? t.scrollY : t.scrollTop);
const maxScrollOf = (t: Target) =>
  t instanceof Window
    ? document.documentElement.scrollHeight - t.innerHeight
    : t.scrollHeight - t.clientHeight;

/** A wheel event's vertical movement in pixels, whatever unit it came in */
export function wheelDeltaY(e: WheelEvent): number {
  if (e.deltaMode === 1) return e.deltaY * 32;
  if (e.deltaMode === 2) return e.deltaY * window.innerHeight;
  return e.deltaY;
}

/** Wheel events further apart than this belong to separate gestures */
const GESTURE_GAP_MS = 180;

type StreamGesture = {
  /** When its last event came */
  at: number;
  /** Its running speed (px/ms, smoothed over its events), fastest so far, and direction */
  speed: number;
  peak: number;
  sign: number;
  /** It scrolled the stream down (so it may be what brought it to its end) */
  ranDown: boolean;
};
const streamGestures = new WeakMap<HTMLElement, StreamGesture>();

/**
 * Called for every vertical wheel event over the timeline stream (once per
 * event, by the frame's handler). Says whether the
 * stream is at its end and whether the page has to hold still: it does when
 * the event is part of the same gesture that scrolled the stream down to its
 * end, so a hard swipe, or its momentum, stops at the end of the stream
 * instead of running on into the footer. The next gesture carries on to the
 * page.
 *
 * A gesture ends with a pause between events. A trackpad swipe's momentum
 * comes as a stream of slowing events with no pause, and a new swipe made
 * once it has slowed shows as a clear jump in speed, which also starts a new
 * gesture.
 *
 * Timed by when the input happened (`e.timeStamp`), not when the page got to
 * it, and measured as speed, not size: when the page is busy, events wait and
 * the browser bundles several frames' movement into one, which is neither a
 * pause nor a new swipe.
 */
export function streamWheel(scroller: HTMLElement, dy: number, t: number): { atEnd: boolean; hold: boolean } {
  const sign = Math.sign(dy);
  const last = streamGestures.get(scroller);
  // A frame's worth at least, so back-to-back events don't read as a burst
  const speed = Math.abs(dy) / Math.max(16, last ? t - last.at : 16);
  // A new push: well above the gesture's running speed (not the last
  // event's: events come unevenly) once it has slowed to under half its
  // peak. Mid-swipe unevenness, at full speed, is never taken for one.
  const pushed =
    last !== undefined && last.speed < last.peak / 2 && speed > last.speed * 1.8 && speed - last.speed > 0.6;
  const sameGesture = last !== undefined && t - last.at < GESTURE_GAP_MS && sign === last.sign && !pushed;
  const atEnd = scroller.scrollTop >= scroller.scrollHeight - scroller.clientHeight - 1;
  const ranDown = (sameGesture && last.ranDown) || (dy > 0 && !atEnd);
  const running = sameGesture ? (last.speed + speed) / 2 : speed;
  streamGestures.set(scroller, {
    at: t,
    speed: running,
    peak: sameGesture ? Math.max(last.peak, running) : running,
    sign,
    ranDown,
  });
  return { atEnd, hold: dy > 0 && atEnd && sameGesture && last.ranDown };
}

export function scrollByWheel(target: Target, dy: number) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (Math.abs(dy) < 50 || reduce) {
    heading.delete(target);
    target.scrollBy({ top: dy });
    return;
  }
  const now = performance.now();
  const last = heading.get(target);
  const from = last && now - last.at < HEADING_MS ? last.top : scrollTopOf(target);
  const top = Math.max(0, Math.min(maxScrollOf(target), from + dy));
  heading.set(target, { top, at: now });
  target.scrollTo({ top, behavior: "smooth" });
}
