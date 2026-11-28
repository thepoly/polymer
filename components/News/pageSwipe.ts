/**
 * Moving between the Senate and Executive Board timelines: the switches'
 * bars slide over and the page slides across with them, like a carousel.
 *
 * Nothing moves on the click: the old page stays as it is while the new one
 * loads. Copies are taken then of each block marked `data-swipe-chunk` that's
 * on screen (the photo panel and the stream). When the new page renders,
 * before it's first painted, the switches' bars start sliding
 * (slidingBar.ts), and in each block the copy of the old one slides fully out
 * one side while the new one follows right behind it, towards the body
 * you've moved to (the Executive Board is to the right of the Senate). Both
 * move by the block's full width, on the bars' timing, so the page moves
 * exactly when the bars do. Each block clips its sides, so neither shows
 * outside it. The site header and the rules just change.
 *
 * Parts of a block marked `data-swipe-keep` (the panel's breadcrumb and
 * switch; the Terms list's switch and rule) stay put while the rest moves.
 *
 * Waiting rather than sliding the old page out at once: the new page can
 * take a moment to arrive, and an old page already gone with nothing yet in
 * its place reads as broken. The switch fetches the new page as soon as it's
 * pointed at, so the wait is usually short.
 *
 * Plain Web Animations rather than a View Transition: a View Transition
 * holds the old page frozen until the new one has rendered, which on a slow
 * connection leaves a page that ignores clicks.
 *
 * If the Terms list (`data-swipe-anchor`) is on screen when either switch is
 * chosen, the new page opens with its Terms list at the same spot, so you
 * stay at the foot of the stream rather than being sent back to its top, and
 * the bottom of the new stream is what slides in.
 *
 * Reduced motion: nothing slides, and the bars don't either.
 */
import { BAR_SLIDE_EASING, BAR_SLIDE_MS, measureBar, type BarSpot } from "@/components/slidingBar";

/** A move whose page hasn't arrived after this long is dropped */
const STALE_MS = 10000;

/** The move under way: its direction and when it began */
let pending: { direction: 1 | -1; at: number } | null = null;
/** Where each switch's bar was when the move began, by switch id */
let pendingBars: Map<string, BarSpot> | null = null;
/** How far down the window the anchor was when the move began */
let pendingAnchor: { top: number; at: number } | null = null;
/** A copy of each block on screen when the move began, and where it was, by block id */
let pendingChunks: Map<string, { ghost: HTMLElement; box: DOMRect }> | null = null;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const onScreen = (box: DOMRect) =>
  box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < window.innerHeight && box.right > 0 && box.left < window.innerWidth;

/** Note where the anchor sits if it's on screen; true if it is */
function captureAnchor(): boolean {
  pendingAnchor = null;
  const box = document.querySelector<HTMLElement>("[data-swipe-anchor]")?.getBoundingClientRect();
  if (!box || box.height === 0 || box.bottom <= 0 || box.top >= window.innerHeight) return false;
  pendingAnchor = { top: box.top, at: performance.now() };
  return true;
}

/**
 * Scroll the new page so its anchor sits where the old one did: the stream
 * on desktop (where it scrolls on its own), else the window
 */
function restoreAnchor() {
  const spot = pendingAnchor;
  pendingAnchor = null;
  if (!spot || performance.now() - spot.at > STALE_MS) return;
  const anchor = document.querySelector<HTMLElement>("[data-swipe-anchor]");
  if (!anchor) return;
  const delta = anchor.getBoundingClientRect().top - spot.top;
  if (Math.abs(delta) < 1) return;
  const scroller = anchor.closest<HTMLElement>("[data-timeline-scroller]");
  if (scroller && scroller.scrollHeight > scroller.clientHeight) {
    scroller.scrollTo({ top: scroller.scrollTop + delta, behavior: "instant" });
  } else {
    window.scrollTo({ top: window.scrollY + delta, behavior: "instant" });
  }
}

/**
 * Markers the copy of a block mustn't carry, so nothing on the new page
 * mistakes it for the page itself (the month panel watches the stream's
 * months, for one)
 */
const MARKERS = [
  "data-swipe-anchor",
  "data-swipe-chunk",
  "data-swipe-keep",
  "data-slide-nav",
  "data-slide-bar",
  "data-slide-ink",
  "data-timeline-month",
  "data-timeline-scroller",
];

/** What a block holds: its one child, not counting a copy still sliding out */
const chunkInner = (chunk: HTMLElement) => chunk.querySelector<HTMLElement>(":scope > :not([data-swipe-ghost])");

/**
 * Copy what each block on screen holds, and note where it is, to slide out
 * once the new page is here. The copy is only for show: no ids or markers,
 * hidden from assistive tech, and inert. What stays put (`data-swipe-keep`)
 * is blanked in it, holding its space, since the new page's own stays on
 * screen throughout.
 */
function captureChunks() {
  pendingChunks = new Map();
  document.querySelectorAll<HTMLElement>("[data-swipe-chunk]").forEach((chunk) => {
    const id = chunk.dataset.swipeChunk;
    const inner = chunkInner(chunk);
    if (!id || !inner || !onScreen(chunk.getBoundingClientRect())) return;
    const ghost = inner.cloneNode(true) as HTMLElement;
    ghost.querySelectorAll<HTMLElement>("[data-swipe-keep]").forEach((el) => (el.style.visibility = "hidden"));
    for (const el of [ghost, ...ghost.querySelectorAll("*")]) {
      el.removeAttribute("id");
      for (const m of MARKERS) el.removeAttribute(m);
    }
    // Shown at once, from the images already loaded, not lazily once in view
    ghost.querySelectorAll("img").forEach((img) => {
      img.loading = "eager";
      img.decoding = "sync";
    });
    ghost.setAttribute("aria-hidden", "true");
    ghost.inert = true;
    ghost.dataset.swipeGhost = "";
    pendingChunks?.set(id, { ghost, box: inner.getBoundingClientRect() });
  });
}

/**
 * In each block, slide the copy of the old one out and the new one in right
 * behind it, each by the block's full width. What stays put is moved back by
 * the same amount on the same timing, so it doesn't move on screen at all.
 */
function slideChunks(direction: 1 | -1, timing: KeyframeAnimationOptions) {
  const copies = pendingChunks;
  pendingChunks = null;
  copies?.forEach(({ ghost, box: was }, id) => {
    const chunk = document.querySelector<HTMLElement>(`[data-swipe-chunk="${CSS.escape(id)}"]`);
    const inner = chunk && chunkInner(chunk);
    const box = chunk?.getBoundingClientRect();
    if (!chunk || !box || !inner || !onScreen(box)) return;
    // Put before the new one, so it paints underneath (what stays put sits in
    // the new one, and stays on top), then moved to exactly where the old one
    // was on screen: the stream's copy may sit far down a stream scrolled to
    // its foot
    Object.assign(ghost.style, { position: "absolute", top: "0", left: "0", width: `${was.width}px`, margin: "0", pointerEvents: "none" });
    chunk.prepend(ghost);
    const at = ghost.getBoundingClientRect();
    ghost.style.top = `${was.top - at.top}px`;
    ghost.style.left = `${was.left - at.left}px`;

    const shift = (x: number) => ({ transform: `translateX(${x}px)` });
    const width = box.width;
    ghost
      .animate([shift(0), shift(-direction * width)], { ...timing, fill: "forwards" })
      .finished.catch(() => {})
      .finally(() => ghost.remove());
    inner.animate([shift(direction * width), shift(0)], timing);
    inner.querySelectorAll<HTMLElement>("[data-swipe-keep]").forEach((el) => {
      el.animate([shift(-direction * width), shift(0)], timing);
    });
  });
}

/**
 * Go to `href`, the other body's timeline; the new page slides in towards
 * it: `direction` 1 moves right (Senate → Executive Board), -1 left.
 * `navigate` is told whether to keep the scroll position (the new page puts
 * the anchor back in place itself).
 */
export function swipeTo(href: string, direction: 1 | -1, navigate: (href: string, keepScroll: boolean) => void) {
  // A second click while the new page is still on its way
  if (pending && performance.now() - pending.at < STALE_MS) return;
  const keepScroll = captureAnchor();
  if (!reducedMotion()) {
    // Every switch on the page slides its bar over from here on the next one
    pendingBars = new Map();
    document.querySelectorAll<HTMLElement>("[data-slide-nav]").forEach((nav) => {
      const bar = nav.querySelector<HTMLElement>("[data-slide-bar]");
      if (bar && nav.dataset.slideNav && nav.getClientRects().length > 0) pendingBars?.set(nav.dataset.slideNav, measureBar(bar));
    });
    captureChunks();
    pending = { direction, at: performance.now() };
  }
  navigate(href, keepScroll);
}

/**
 * Called by the timeline as it renders (in a layout effect, so before it's
 * painted, and just after the switches have started their bars): if it's the
 * end of a move, put the anchor back in place, then slide the blocks across
 */
export function swipeArrived() {
  restoreAnchor();
  const move = pending;
  pending = null;
  if (!move || performance.now() - move.at > STALE_MS || reducedMotion()) {
    pendingChunks = null;
    return;
  }
  slideChunks(move.direction, { duration: BAR_SLIDE_MS, easing: BAR_SLIDE_EASING });
}

/** Where switch `id`'s bar was before this move, once; null if it didn't move here */
export function takeBarSpot(id: string): BarSpot | null {
  const spot = pendingBars?.get(id) ?? null;
  pendingBars?.delete(id);
  return spot;
}
