/**
 * The bar under the current choice in a row of links (the masthead's
 * sections, the Senate / Executive Board switch) sliding over to a new one.
 *
 * Markup, all positioned so offsets add up: the nav, each link in it
 * (`relative`), the bar inside the active link (`data-slide-bar`), and an
 * overlay with a copy of the links in the active colour (`data-slide-ink`),
 * laid out exactly like them and shown only while the nav has
 * `data-sliding`. The overlay is cut to the bar's span on the bar's timing,
 * so each letter takes the active colour exactly while the bar is under it.
 */

/** Where a bar sits, from the left edge of its nav */
export type BarSpot = { left: number; width: number };

export const BAR_SLIDE_MS = 420;
export const BAR_SLIDE_EASING = "cubic-bezier(0.65, 0, 0.35, 1)";

/**
 * Where the bar rests. Layout offsets, not the on-screen box: they leave out
 * the slide's own transform, so a measure taken mid-slide is still where the
 * bar rests. The bar sits in its link, and the link in the nav.
 */
export function measureBar(bar: HTMLElement): BarSpot {
  const link = bar.offsetParent as HTMLElement | null;
  return { left: (link?.offsetLeft ?? 0) + bar.offsetLeft, width: bar.offsetWidth };
}

/**
 * Slide the nav's bar from `from` to where it rests now, and the ink with
 * it. Does nothing for reduced motion, a hidden nav, or no move.
 */
export function slideBar(nav: HTMLElement, from: BarSpot, duration = BAR_SLIDE_MS) {
  const bar = nav.querySelector<HTMLElement>("[data-slide-bar]");
  const overlay = nav.querySelector<HTMLElement>("[data-slide-ink]");
  if (!bar || !overlay || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const here = measureBar(bar);
  if (here.width <= 0 || (from.left === here.left && from.width === here.width)) return;
  const timing = { duration, easing: BAR_SLIDE_EASING };
  // The bar: drawn where it was, then eased to where it rests
  bar.animate(
    [
      { transformOrigin: "left", transform: `translateX(${from.left - here.left}px) scaleX(${from.width / here.width})` },
      { transformOrigin: "left", transform: "translateX(0) scaleX(1)" },
    ],
    timing,
  );
  // Both edges of the ink's cut move in straight lines on the bar's easing,
  // so they stay with it all the way
  const navWidth = nav.clientWidth;
  const ink = (spot: BarSpot) => `inset(0px ${navWidth - spot.left - spot.width}px 0px ${spot.left}px)`;
  nav.dataset.sliding = "";
  overlay
    .animate([{ clipPath: ink(from) }, { clipPath: ink(here) }], timing)
    .finished.catch(() => {})
    .finally(() => {
      delete nav.dataset.sliding;
    });
}
