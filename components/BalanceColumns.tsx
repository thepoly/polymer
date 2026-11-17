"use client";

import React, { useLayoutEffect, useRef, useSyncExternalStore } from "react";

/**
 * Makes two side-by-side columns end on the same line, the way a print desk
 * squares off a page: add copy to the short column, set its type larger,
 * resize the art, and spread what's left through the spacing. Full guide:
 * docs/fit-text.md.
 *
 * Markers, anywhere inside the root:
 * - `data-balance-col`: a column (exactly two). A flex column; a grid item
 *   of the root so it stretches to the row's height.
 * - `data-balance-opt`: optional content, hidden until there's room. Shown
 *   in document order, each only if it fits whole. An option inside another
 *   option is only tried once the outer one is showing.
 *   `data-balance-opt="reach"` may also be shown when it doesn't fit, making
 *   its column the longer one, if the other column can then be brought down
 *   to meet it more closely than the options that fit could manage (step 4a).
 * - `data-balance-scale="min,max"`: on a column (or one element in it), the
 *   range its type may be scaled over, e.g. "0.9,1.45". The scale arrives as
 *   the CSS variable `--balance-scale`; text opts in by multiplying its font
 *   size by it (`calc(18px * var(--balance-scale, 1))`), fully or in part.
 * - `data-balance-flex="wide,tall"`: a box (the photo) that may change
 *   height, between width ÷ wide and width ÷ tall (e.g. "1.7778,1.3333" for
 *   16:9 to 4:3). The height arrives as the CSS variable `--balance-h`; the
 *   box decides how to use it (`height: var(--balance-h, …)`).
 * - `data-balance-fold="widest"`: on a flexible box near the top of the
 *   page, keeps the box short enough that the bottom of its nearest
 *   `data-balance-fold-end` (the whole lead story, say) is on the first
 *   screen as the page loads. It may go as wide as `widest` (e.g. "2" for
 *   2:1) to get there, and no wider: on a very short window the end stays
 *   below. This outranks squaring off: what the box can't take up, the rest
 *   of the column (options, type) has to.
 * - `data-balance-trim`: content the taller column can drop (summaries) when
 *   nothing else brings the columns together.
 * - `data-balance-art-first`: on a column, when it's the short one, its
 *   flexible boxes grow before its type does (step 2 comes after step 3 for
 *   its own boxes), so its type only grows when the art can't close the gap.
 *
 * Every one of those elements needs `suppressHydrationWarning`: they're
 * changed before React hydrates.
 *
 * Steps, each only if a gap remains:
 * 1. Show the short column's options that fit.
 * 2. Scale the short column's type up, to the largest step at which it's
 *    still no taller than the other column.
 * 3. Close what's left with the flexible boxes: grow the short column's,
 *    then shrink the tall column's.
 * 4. Scale the tall column's type down (if its range goes below 1), then
 *    the flexible boxes again.
 * 4a. If a gap remains and the short column has a "reach" option still
 *    hidden, steps 1 to 4 run again with the first one that doesn't fit
 *    shown anyway, so the other column is the short one and grows to meet
 *    it. Kept only if that leaves a smaller gap.
 * 5. If the gap is still more than `feather` px and the tall column has
 *    trims, drop them and start over.
 * 6. A gap of `feather` px or less is spread between the short column's
 *    children (`data-feather`, see globals.css). A bigger one stays at the
 *    bottom rather than opening a hole mid-column.
 *
 * Type moves in steps (lines rewrap, so heights jump); the flexible box is
 * what makes the columns meet exactly.
 *
 * `when` is the media query the columns sit side by side under; elsewhere
 * options stay hidden and nothing is resized.
 *
 * On a first page load this runs from an inline script right after the
 * columns, before the browser paints them, so nothing visibly moves. After
 * that (client navigation, resizes, web fonts arriving) it runs from here.
 */

/**
 * The whole routine. It's also sent to the browser as text (`toString`) for
 * the inline script, so it must stand alone: no imports, no helpers from
 * this module, and plain loops rather than syntax a compiler would swap for
 * an imported helper (spread, destructuring, for...of).
 */
function balance(root: HTMLElement | null) {
  if (!root) return;
  const all = (el: Element, sel: string): HTMLElement[] => Array.prototype.slice.call(el.querySelectorAll(sel));
  const cols = all(root, "[data-balance-col]");
  const height = (el: Element) => el.getBoundingClientRect().height;
  // A column's scalable element: itself, or the one inside it
  const scaleOf = (col: HTMLElement) =>
    col.hasAttribute("data-balance-scale") ? col : col.querySelector<HTMLElement>("[data-balance-scale]");
  const resetFill = () => {
    const opts = all(root, "[data-balance-opt]");
    for (let i = 0; i < opts.length; i++) opts[i].removeAttribute("data-on");
    const boxes = all(root, "[data-balance-flex]");
    for (let i = 0; i < boxes.length; i++) boxes[i].style.removeProperty("--balance-h");
    for (let i = 0; i < cols.length; i++) {
      const scaled = scaleOf(cols[i]);
      if (scaled) scaled.style.removeProperty("--balance-scale");
    }
  };

  resetFill();
  for (let i = 0; i < cols.length; i++) {
    cols[i].removeAttribute("data-trimmed");
    cols[i].removeAttribute("data-feather");
  }
  const when = root.getAttribute("data-balance-when");
  // Not laid out yet, stacked in one column, or not two columns: leave as is
  if (cols.length !== 2 || root.getBoundingClientRect().width === 0 || (when && !window.matchMedia(when).matches)) {
    return;
  }

  const TOLERANCE = 1;
  // Space left under a fold-held box's end, so it doesn't sit on the window's edge
  const FOLD_MARGIN = 16;
  // Type scales in whole steps, so sizes don't drift by fractions between loads
  const STEP = 0.02;
  const feather = parseFloat(root.getAttribute("data-balance-feather") || "48");
  // Columns keep their own height while measured, instead of stretching
  root.setAttribute("data-balancing", "");

  // `reach`: the first "reach" option that doesn't fit stays shown anyway
  const fill = (col: HTMLElement, limit: number, reach: boolean) => {
    const opts = all(col, "[data-balance-opt]");
    let reached = false;
    for (let i = 0; i < opts.length; i++) {
      const outer = opts[i].parentElement ? opts[i].parentElement!.closest("[data-balance-opt]") : null;
      if (outer && !outer.hasAttribute("data-on")) continue;
      opts[i].setAttribute("data-on", "");
      if (height(col) <= limit + TOLERANCE) continue;
      if (reach && !reached && opts[i].getAttribute("data-balance-opt") === "reach") reached = true;
      else opts[i].removeAttribute("data-on");
    }
  };
  // Scale the column's type: up (`up`) to the largest step in (1, max], or
  // down to the largest step in [min, 1), at which the column is no taller
  // than `limit`. Scaling down stops at min even if that's still too tall.
  const scaleTo = (col: HTMLElement, limit: number, up: boolean) => {
    const el = scaleOf(col);
    if (!el) return;
    const range = (el.getAttribute("data-balance-scale") || "").split(",");
    const min = parseFloat(range[0]);
    const max = parseFloat(range[1]);
    const set = (steps: number) => el.style.setProperty("--balance-scale", (1 + steps * STEP).toFixed(3));
    const fits = (steps: number) => {
      set(steps);
      return height(col) <= limit + TOLERANCE;
    };
    if (up) {
      if (!(max > 1)) return;
      // Fitting only gets harder as type grows: binary search the last step that fits
      let lo = 0;
      let hi = Math.floor((max - 1) / STEP + 1e-9);
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (fits(mid)) lo = mid;
        else hi = mid - 1;
      }
      set(lo);
    } else {
      if (!(min < 1)) return;
      // Steps below 1, as negative counts: the first (nearest 1) that fits
      let lo = 1;
      const hi = Math.floor((1 - min) / STEP + 1e-9);
      if (hi < 1) return;
      let top = hi;
      while (lo < top) {
        const mid = Math.floor((lo + top) / 2);
        if (fits(-mid)) top = mid;
        else lo = mid + 1;
      }
      set(-lo);
    }
  };
  // A flexible box's height limits right now, [shortest, tallest, current],
  // or null if it has none. Measured each time: type set larger above or
  // below the box moves where the fold falls on it.
  const limitsOf = (box: HTMLElement): number[] | null => {
    const rect = box.getBoundingClientRect();
    const ratios = (box.getAttribute("data-balance-flex") || "").split(",");
    const wide = parseFloat(ratios[0]);
    const tall = parseFloat(ratios[1]);
    if (!rect.width || !(wide > 0) || !(tall > 0)) return null;
    let lo = rect.width / wide;
    let hi = rect.width / tall;
    const widest = parseFloat(box.getAttribute("data-balance-fold") || "");
    const top = rect.top + window.scrollY;
    // Only a box that starts on the first screen is held to it
    if (widest > 0 && top < window.innerHeight) {
      const end = box.closest("[data-balance-fold-end]") || box;
      const below = end.getBoundingClientRect().bottom - rect.bottom;
      const room = window.innerHeight - top - below - FOLD_MARGIN;
      hi = Math.max(rect.width / widest, Math.min(hi, room));
      lo = Math.min(lo, hi);
    }
    return [lo, hi, rect.height];
  };
  // Bring every flexible box within its limits before anything else (its
  // normal height may be taller than the fold allows)
  const clampBoxes = () => {
    const boxes = all(root, "[data-balance-flex]");
    for (let i = 0; i < boxes.length; i++) {
      const lim = limitsOf(boxes[i]);
      if (lim && (lim[2] > lim[1] + TOLERANCE || lim[2] < lim[0] - TOLERANCE)) {
        boxes[i].style.setProperty("--balance-h", Math.max(lim[0], Math.min(lim[1], lim[2])).toFixed(2) + "px");
      }
    }
  };
  // Grow (delta > 0) or shrink the column's flexible boxes, within their
  // limits. Several share the change evenly, so two photos in a column keep
  // the same shape; what one can't take passes to the others.
  const flexBy = (col: HTMLElement, delta: number) => {
    let open = all(col, "[data-balance-flex]");
    let left = delta;
    while (open.length > 0 && Math.abs(left) > TOLERANCE) {
      const share = left / open.length;
      const still: HTMLElement[] = [];
      for (let i = 0; i < open.length; i++) {
        const lim = limitsOf(open[i]);
        if (!lim) continue;
        const target = Math.max(lim[0], Math.min(lim[1], lim[2] + share));
        open[i].style.setProperty("--balance-h", target.toFixed(2) + "px");
        left -= target - lim[2];
        // A box that took its whole share can take more next round
        if (Math.abs(target - (lim[2] + share)) < 0.01) still.push(open[i]);
      }
      if (still.length === open.length) break;
      open = still;
    }
  };
  // Whichever column is shorter right now, and by how much
  const measure = () => {
    const first = height(cols[0]);
    const second = height(cols[1]);
    return first <= second
      ? { shortCol: cols[0], tallCol: cols[1], gap: second - first }
      : { shortCol: cols[1], tallCol: cols[0], gap: first - second };
  };
  // Close the current gap with the flexible boxes: the short column's grows, then the tall column's shrinks
  const flexClose = () => {
    let now = measure();
    if (now.gap > TOLERANCE) {
      flexBy(now.shortCol, now.gap);
      now = measure();
    }
    if (now.gap > TOLERANCE) {
      flexBy(now.tallCol, -now.gap);
      now = measure();
    }
    return now;
  };
  const run = (reach: boolean) => {
    clampBoxes();
    let now = measure();
    fill(now.shortCol, height(now.tallCol), reach);
    now = measure();
    // A column marked art-first grows its own flexible boxes before its type
    if (now.gap > TOLERANCE && now.shortCol.hasAttribute("data-balance-art-first")) {
      flexBy(now.shortCol, now.gap);
      now = measure();
    }
    if (now.gap > TOLERANCE) {
      scaleTo(now.shortCol, height(now.tallCol), true);
      now = flexClose();
    }
    if (now.gap > TOLERANCE) {
      scaleTo(now.tallCol, height(now.shortCol), false);
      now = flexClose();
    }
    return now;
  };

  let reach = false;
  let result = run(false);
  // Step 4a: try a "reach" option the short column couldn't fit whole
  if (result.gap > TOLERANCE && result.shortCol.querySelector('[data-balance-opt="reach"]:not([data-on])')) {
    resetFill();
    const reached = run(true);
    if (reached.gap < result.gap - TOLERANCE) {
      result = reached;
      reach = true;
    } else {
      resetFill();
      result = run(false);
    }
  }
  if (result.gap > feather && result.tallCol.querySelector("[data-balance-trim]")) {
    resetFill();
    result.tallCol.setAttribute("data-trimmed", "");
    result = run(reach);
  }
  if (result.gap > TOLERANCE && result.gap <= feather) result.shortCol.setAttribute("data-feather", "");
  root.removeAttribute("data-balancing");
}

// Runs at once, then again when web fonts have arrived and when the page has
// loaded: text measured in a fallback font wraps differently, and React may
// not have hydrated yet to redo it.
const INLINE_SCRIPT = `(function(){var root=document.currentScript.parentElement;var run=${balance.toString()};var again=function(){if(root.isConnected)run(root)};run(root);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(again);window.addEventListener("load",again,{once:true})})()`;

const noSubscription = () => () => {};

export default function BalanceColumns({
  when,
  feather = 48,
  className,
  children,
}: {
  /** Media query the columns sit side by side under, e.g. "(min-width: 1024px)" */
  when?: string;
  /** Largest leftover gap (px) to spread through the short column's spacing */
  feather?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // True on the server and while hydrating, false for a client-side render,
  // where React doesn't run inline scripts and the effect below does the work
  const fromServer = useSyncExternalStore(
    noSubscription,
    () => false,
    () => true,
  );

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    balance(root);

    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => balance(root));
    };
    // Width changes rewrap everything. Height changes are ignored: they're
    // usually this component's own doing.
    let width = root.getBoundingClientRect().width;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0].contentRect.width;
      if (Math.abs(next - width) < 0.5) return;
      width = next;
      schedule();
    });
    observer.observe(root);
    const query = when ? window.matchMedia(when) : null;
    query?.addEventListener("change", schedule);
    // A box held to the fold also follows the window's height. Only with a
    // mouse: on touch screens the height changes as the browser's toolbars
    // slide in and out while scrolling, and the photo would jump with them.
    const followsHeight = root.querySelector("[data-balance-fold]") !== null;
    let windowHeight = window.innerHeight;
    const onWindowResize = () => {
      if (window.innerHeight === windowHeight) return;
      windowHeight = window.innerHeight;
      if (window.matchMedia("(pointer: fine)").matches) schedule();
    };
    if (followsHeight) window.addEventListener("resize", onWindowResize);
    let alive = true;
    document.fonts?.ready.then(() => {
      if (alive) schedule();
    });
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      query?.removeEventListener("change", schedule);
      if (followsHeight) window.removeEventListener("resize", onWindowResize);
    };
  }, [when, feather]);

  return (
    <div
      ref={ref}
      data-balance-root
      data-balance-when={when}
      data-balance-feather={feather}
      className={className}
      suppressHydrationWarning
    >
      {children}
      {fromServer && <script dangerouslySetInnerHTML={{ __html: INLINE_SCRIPT }} />}
    </div>
  );
}
