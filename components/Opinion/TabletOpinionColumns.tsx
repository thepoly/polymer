"use client";

import React, { useLayoutEffect, useRef, useSyncExternalStore } from "react";

/**
 * Opinion's top on tablets: the stories, the op-ed box and Opinion's Choice
 * set in two columns that end on one line, with no two photos side by side
 * and the two boxes never side by side either (one rule of the page's design:
 * each row across has at most one picture and at most one box).
 *
 * The children are the pieces, each marked:
 * - `data-tc-item`: a piece. Stories keep their order (newest first); the
 *   first always opens the left column.
 * - `data-tc-fn` (with `data-tc-item`): a box (the op-ed box, Opinion's
 *   Choice). It may go anywhere but the top of a column.
 * - `data-balance-flex="wide,tall"` inside a piece (or on it): its photo, or
 *   the op-ed box, which may change height between width ÷ wide and
 *   width ÷ tall; the height arrives as `--balance-h` (as in BalanceColumns).
 * A story with an `<img>` in it is a picture: its photo (the flexible box)
 * may not sit beside another story's photo. A box is only a box, even with a
 * photo behind it (the op-ed box): it may sit beside a story's photo.
 *
 * Every arrangement is tried (each story to the left or right, keeping their
 * order; each box at each place), the photos stretched or shrunk to square
 * the columns off, and the best kept. Two things weigh most, equally: photos
 * or boxes side by side, and columns ending more than FOOT px apart. Then the
 * difference at the foot, stories read out of order, boxes stacked on each
 * other, and photos changed. The pieces are then placed absolutely.
 *
 * `when` is the media query the columns apply under; elsewhere the pieces
 * stack as they are. On a first page load this runs from an inline script
 * right after the pieces, before the browser paints them; after that
 * (client navigation, resizes, web fonts arriving) from the effect.
 */

/**
 * The whole routine, also sent to the browser as text (`toString`) for the
 * inline script, so it must stand alone: no imports, and plain loops rather
 * than syntax a compiler would swap for a helper (spread, destructuring,
 * for...of).
 */
function arrange(root: HTMLElement | null) {
  if (!root) return;
  const items: HTMLElement[] = [];
  for (let i = 0; i < root.children.length; i++) {
    const child = root.children[i] as HTMLElement;
    if (child.hasAttribute("data-tc-item")) items.push(child);
  }
  const boxOf = (item: HTMLElement): HTMLElement | null =>
    item.hasAttribute("data-balance-flex") ? item : item.querySelector<HTMLElement>("[data-balance-flex]");

  // Back to the plain stack
  root.style.removeProperty("position");
  root.style.removeProperty("height");
  for (let i = 0; i < items.length; i++) {
    const s = items[i].style;
    s.removeProperty("position");
    s.removeProperty("top");
    s.removeProperty("left");
    s.removeProperty("width");
    const box = boxOf(items[i]);
    if (box) box.style.removeProperty("--balance-h");
  }
  const when = root.getAttribute("data-tc-when");
  const width = root.getBoundingClientRect().width;
  if (items.length === 0 || width === 0 || (when && !window.matchMedia(when).matches)) return;

  const gapX = parseFloat(root.getAttribute("data-tc-gap-x") || "24");
  const gapY = parseFloat(root.getAttribute("data-tc-gap-y") || "32");
  // Pictures (and boxes) closer than this across the gutter count as side by side
  const CLEAR = 16;
  // Columns ending further apart than this count as unequal
  const FOOT = 40;
  const colW = (width - gapX) / 2;

  // Measure every piece at the column's width
  for (let i = 0; i < items.length; i++) items[i].style.width = colW + "px";
  const n = items.length;
  const h: number[] = []; // height with its box at p0
  const off: number[] = []; // box's top within the piece (-1: no box)
  const p0: number[] = [];
  const lo: number[] = [];
  const hi: number[] = [];
  const picture: boolean[] = [];
  const fn: boolean[] = [];
  const stories: number[] = [];
  const boxes: number[] = [];
  for (let i = 0; i < n; i++) {
    const rect = items[i].getBoundingClientRect();
    const box = boxOf(items[i]);
    let height = rect.height;
    off.push(-1);
    p0.push(0);
    lo.push(0);
    hi.push(0);
    if (box) {
      const b = box.getBoundingClientRect();
      const ratios = (box.getAttribute("data-balance-flex") || "").split(",");
      const wide = parseFloat(ratios[0]);
      const tall = parseFloat(ratios[1]);
      if (b.width > 0 && wide > 0 && tall > 0) {
        lo[i] = b.width / wide;
        hi[i] = b.width / tall;
        p0[i] = Math.max(lo[i], Math.min(hi[i], b.height));
        off[i] = b.top - rect.top;
        height += p0[i] - b.height;
      }
    }
    h.push(height);
    fn.push(items[i].hasAttribute("data-tc-fn"));
    picture.push(!fn[i] && items[i].querySelector("img") !== null);
    if (fn[i]) boxes.push(i);
    else stories.push(i);
  }
  if (stories.length === 0) return;

  const p: number[] = p0.slice();
  const tops: number[] = new Array(n);
  const sizeOf = (i: number) => h[i] - p0[i] + p[i];
  const heightOf = (col: number[]) => {
    let y = 0;
    for (let k = 0; k < col.length; k++) y += sizeOf(col[k]) + (k > 0 ? gapY : 0);
    return y;
  };
  // Change a column's flexible boxes by `delta` in all, evenly where they
  // can take it; returns how much they took
  const flex = (col: number[], delta: number) => {
    let open: number[] = [];
    for (let k = 0; k < col.length; k++) if (off[col[k]] >= 0) open.push(col[k]);
    let left = delta;
    while (open.length > 0 && Math.abs(left) > 0.5) {
      const share = left / open.length;
      const still: number[] = [];
      for (let k = 0; k < open.length; k++) {
        const i = open[k];
        const target = Math.max(lo[i], Math.min(hi[i], p[i] + share));
        left -= target - p[i];
        p[i] = target;
        if (Math.abs(target - lo[i]) > 0.01 && Math.abs(target - hi[i]) > 0.01) still.push(i);
      }
      if (still.length === open.length) break;
      open = still;
    }
    return delta - left;
  };
  // Overlap (plus clearance) of two pieces' spans, by their tops and the part that counts
  const span = (i: number, top: number, whole: boolean) =>
    !whole && off[i] >= 0 ? [top + off[i], top + off[i] + p[i]] : [top, top + sizeOf(i)];

  let best: number[][] | null = null;
  let bestP: number[] = [];
  let bestScore = Infinity;
  let bestHeight = 0;
  const score = (cols: number[][]) => {
    for (let i = 0; i < n; i++) p[i] = p0[i];
    const a = heightOf(cols[0]);
    const b = heightOf(cols[1]);
    const short = a <= b ? 0 : 1;
    let gap = Math.abs(a - b);
    gap -= flex(cols[short], gap);
    gap -= -flex(cols[1 - short], -gap);
    let penalty = 0;
    for (let c = 0; c < 2; c++) {
      let y = 0;
      for (let k = 0; k < cols[c].length; k++) {
        const i = cols[c][k];
        tops[i] = y;
        y += sizeOf(i) + gapY;
        // Boxes stacked on each other
        if (k > 0 && fn[i] && fn[cols[c][k - 1]]) penalty += 60;
      }
    }
    // Pictures beside pictures, boxes beside boxes
    for (let x = 0; x < cols[0].length; x++) {
      const i = cols[0][x];
      for (let z = 0; z < cols[1].length; z++) {
        const j = cols[1][z];
        const kinds = [picture[i] && picture[j], fn[i] && fn[j]];
        for (let q = 0; q < 2; q++) {
          if (!kinds[q]) continue;
          const si = span(i, tops[i], q === 1);
          const sj = span(j, tops[j], q === 1);
          const overlap = Math.min(si[1], sj[1]) + CLEAR - Math.max(si[0], sj[0]);
          if (overlap > 0) penalty += 10000 + overlap * 10;
        }
      }
    }
    // Stories read out of order (one starting above an older one's top)
    for (let x = 0; x < stories.length; x++) {
      for (let z = x + 1; z < stories.length; z++) {
        if (tops[stories[z]] < tops[stories[x]] - 1) penalty += 20;
      }
    }
    let changed = 0;
    for (let i = 0; i < n; i++) changed += Math.abs(p[i] - p0[i]);
    // Columns ending far apart weigh as much as pictures side by side
    if (gap > FOOT) penalty += 10000 + (gap - FOOT) * 10;
    const total = penalty + gap + changed * 0.15;
    if (total < bestScore) {
      bestScore = total;
      best = [cols[0].slice(), cols[1].slice()];
      bestP = p.slice();
      bestHeight = Math.max(heightOf(cols[0]), heightOf(cols[1]));
    }
  };
  // Each box at each place but the top of a column, then score
  const place = (cols: number[][], bi: number) => {
    if (bi === boxes.length) {
      score(cols);
      return;
    }
    for (let c = 0; c < 2; c++) {
      for (let k = 1; k <= cols[c].length; k++) {
        const next = [cols[0].slice(), cols[1].slice()];
        next[c].splice(k, 0, boxes[bi]);
        place(next, bi + 1);
      }
    }
  };
  // Every split of the first ten stories (the newest on the left); any more
  // go to whichever column is shorter
  const K = Math.min(stories.length, 10);
  for (let mask = 0; mask < 1 << K; mask += 2) {
    const cols: number[][] = [[], []];
    for (let s = 0; s < K; s++) cols[(mask >> s) & 1].push(stories[s]);
    for (let i = 0; i < n; i++) p[i] = p0[i];
    for (let s = K; s < stories.length; s++) cols[heightOf(cols[0]) <= heightOf(cols[1]) ? 0 : 1].push(stories[s]);
    place(cols, 0);
  }
  if (!best) return;

  const chosen: number[][] = best;
  for (let i = 0; i < n; i++) p[i] = bestP[i];
  root.style.position = "relative";
  root.style.height = bestHeight + "px";
  for (let c = 0; c < 2; c++) {
    let y = 0;
    for (let k = 0; k < chosen[c].length; k++) {
      const i = chosen[c][k];
      const s = items[i].style;
      s.position = "absolute";
      s.top = y + "px";
      s.left = c === 0 ? "0px" : colW + gapX + "px";
      if (off[i] >= 0) boxOf(items[i])!.style.setProperty("--balance-h", p[i].toFixed(2) + "px");
      y += sizeOf(i) + gapY;
    }
  }
}

// Runs at once, then again when web fonts have arrived and when the page has
// loaded (text in a fallback font wraps differently)
const INLINE_SCRIPT = `(function(){var root=document.currentScript.parentElement;var run=${arrange.toString()};var again=function(){if(root.isConnected)run(root)};run(root);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(again);window.addEventListener("load",again,{once:true})})()`;

const noSubscription = () => () => {};

export default function TabletOpinionColumns({
  when,
  gapX = 24,
  gapY = 32,
  className,
  children,
}: {
  /** Media query the two columns apply under */
  when: string;
  /** Gutter between the columns (px) */
  gapX?: number;
  /** Space between pieces in a column (px) */
  gapY?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // True on the server and while hydrating: the inline script does the first run
  const fromServer = useSyncExternalStore(noSubscription, () => false, () => true);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    arrange(root);
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => arrange(root));
    };
    // Width changes rewrap everything; height changes are this routine's own
    let width = root.getBoundingClientRect().width;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0].contentRect.width;
      if (Math.abs(next - width) < 0.5) return;
      width = next;
      schedule();
    });
    observer.observe(root);
    const query = window.matchMedia(when);
    query.addEventListener("change", schedule);
    let alive = true;
    document.fonts?.ready.then(() => {
      if (alive) schedule();
    });
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      query.removeEventListener("change", schedule);
    };
  }, [when, gapX, gapY]);

  return (
    <div
      ref={ref}
      data-tc-when={when}
      data-tc-gap-x={gapX}
      data-tc-gap-y={gapY}
      className={className}
      suppressHydrationWarning
    >
      {children}
      {fromServer && <script dangerouslySetInnerHTML={{ __html: INLINE_SCRIPT }} />}
    </div>
  );
}
