/**
 * Moving between the Senate and Executive Board timelines: the page swipes
 * sideways, piece by piece, and the switches' bars slide over.
 *
 * Every piece of the page marked `data-swipe` that's on screen moves on its
 * own, staggered top to bottom, towards the body you're moving to (the
 * Executive Board is to the right of the Senate). On the click, the old
 * pieces slide out and fade while the new page loads; when it renders, its
 * pieces slide in from the other side before it's first painted. Everything
 * else (the header, the panel's photo, the rules) just changes, and the
 * switches' bars slide over on the new page (slidingBar.ts) meanwhile.
 *
 * Plain Web Animations rather than a View Transition: a View Transition
 * holds the old page frozen until the new one has rendered, which on a slow
 * connection leaves a page that ignores clicks. Here the old page answers the
 * click at once and the new one comes in whenever it's ready. The navigation
 * waits for the old pieces to finish leaving (OUT_TOTAL_MS), so they're never
 * cut off mid-move; the new page loads during that wait, since the switch
 * fetches it as soon as it's pointed at.
 *
 * Reduced motion: no swipe, and the bars don't slide either.
 */
import { measureBar, type BarSpot } from "@/components/slidingBar";

/** Most pieces moved on each side; any further down change with the page */
const MAX_PIECES = 32;

const OUT_MS = 200;
const OUT_STAGGER_MS = 10;
const OUT_MAX_DELAY_MS = 90;
/** When the last old piece is gone, and the navigation starts */
const OUT_TOTAL_MS = OUT_MS + OUT_MAX_DELAY_MS;
const OUT_DISTANCE = 40;
const OUT_EASING = "cubic-bezier(0.4, 0, 1, 1)";

const IN_MS = 480;
const IN_STAGGER_MS = 30;
const IN_MAX_DELAY_MS = 300;
const IN_DISTANCE = 72;
const IN_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

/** A swipe whose page hasn't arrived after this long is dropped */
const STALE_MS = 10000;

/** The move under way: its direction and when it began */
let pending: { direction: 1 | -1; at: number } | null = null;
/** Where each switch's bar was when the move began, by switch id */
let pendingBars: Map<string, BarSpot> | null = null;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The `data-swipe` pieces on screen, top to bottom (left to right on a line) */
function piecesOnScreen(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-swipe]"))
    .map((el) => ({ el, box: el.getBoundingClientRect() }))
    .filter(
      ({ box }) =>
        box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < window.innerHeight && box.right > 0 && box.left < window.innerWidth,
    )
    .sort((a, b) => a.box.top - b.box.top || a.box.left - b.box.left)
    .slice(0, MAX_PIECES)
    .map(({ el }) => el);
}

/**
 * Go to `href`, the other body's timeline, swiping the page towards it:
 * `direction` 1 moves right (Senate → Executive Board), -1 left.
 */
export function swipeTo(href: string, direction: 1 | -1, navigate: (href: string) => void) {
  if (reducedMotion()) {
    navigate(href);
    return;
  }
  // A second click while the page is already leaving
  if (pending && performance.now() - pending.at < OUT_TOTAL_MS) return;
  // Every switch on the page slides its bar over from here on the next one
  pendingBars = new Map();
  document.querySelectorAll<HTMLElement>("[data-slide-nav]").forEach((nav) => {
    const bar = nav.querySelector<HTMLElement>("[data-slide-bar]");
    if (bar && nav.dataset.slideNav && nav.getClientRects().length > 0) pendingBars?.set(nav.dataset.slideNav, measureBar(bar));
  });
  pending = { direction, at: performance.now() };

  piecesOnScreen().forEach((el, i) => {
    el.animate(
      [
        { opacity: 1, transform: "translateX(0)" },
        { opacity: 0, transform: `translateX(${-direction * OUT_DISTANCE}px)` },
      ],
      // Stays gone until the page changes
      { duration: OUT_MS, delay: Math.min(OUT_MAX_DELAY_MS, i * OUT_STAGGER_MS), easing: OUT_EASING, fill: "forwards" },
    );
  });
  window.setTimeout(() => navigate(href), OUT_TOTAL_MS);
}

/**
 * Called by the timeline as it renders (in a layout effect, so before it's
 * painted): if it's the end of a swipe, bring its pieces in
 */
export function swipeArrived() {
  const move = pending;
  pending = null;
  if (!move || performance.now() - move.at > STALE_MS || reducedMotion()) return;
  piecesOnScreen().forEach((el, i) => {
    el.animate(
      [
        { opacity: 0, transform: `translateX(${move.direction * IN_DISTANCE}px)` },
        { opacity: 1, transform: "translateX(0)" },
      ],
      // Hidden from the start, through its delay
      { duration: IN_MS, delay: Math.min(IN_MAX_DELAY_MS, i * IN_STAGGER_MS), easing: IN_EASING, fill: "backwards" },
    );
  });
}

/** Where switch `id`'s bar was before this move, once; null if it didn't move here */
export function takeBarSpot(id: string): BarSpot | null {
  const spot = pendingBars?.get(id) ?? null;
  pendingBars?.delete(id);
  return spot;
}
