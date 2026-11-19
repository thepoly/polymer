import { BAR_SLIDE_EASING, BAR_SLIDE_MS, type BarSpot } from "./slidingBar";

/** Carry a section underline along the landing-page rule and off its left edge. */
export function slideSectionBarOut(nav: HTMLElement, from: BarSpot, onComplete: () => void) {
  const rule = nav.closest<HTMLElement>("[data-section-rule]");
  if (!rule || nav.clientWidth === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    onComplete();
    return;
  }
  const ruleBox = rule.getBoundingClientRect();
  const navBox = nav.getBoundingClientRect();
  const left = navBox.left - ruleBox.left + from.left;
  const clip = document.createElement("span");
  clip.dataset.sectionBarExit = "";
  clip.setAttribute("aria-hidden", "true");
  Object.assign(clip.style, {
    position: "absolute", left: "0", right: "0", top: `${navBox.bottom - ruleBox.top}px`,
    height: "4px", overflow: "hidden", pointerEvents: "none", zIndex: "20",
  });
  const bar = document.createElement("span");
  bar.dataset.exitingSectionBar = "";
  Object.assign(bar.style, {
    position: "absolute", top: "0", left: `${left}px`, width: `${from.width}px`, height: "100%",
    backgroundColor: "var(--accent-color)",
  });
  clip.append(bar);
  rule.append(clip);
  const timing = { duration: BAR_SLIDE_MS, easing: BAR_SLIDE_EASING, fill: "forwards" as const };
  const motion = bar.animate([
    { transform: "translateX(0)" },
    { transform: `translateX(${-left - from.width}px)` },
  ], timing);
  const overlay = nav.querySelector<HTMLElement>("[data-slide-ink]");
  const ink = (spot: BarSpot) => `inset(0px ${nav.clientWidth - spot.left - spot.width}px 0px ${spot.left}px)`;
  nav.dataset.sliding = "";
  const inkMotion = overlay?.animate([
    { clipPath: ink(from) },
    { clipPath: ink({ left: ruleBox.left - navBox.left - from.width, width: from.width }) },
  ], timing);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    motion.cancel();
    inkMotion?.cancel();
    clip.remove();
    delete nav.dataset.sliding;
    window.removeEventListener("resize", onResize);
  };
  const onResize = () => {
    onComplete();
    cleanup();
  };
  window.addEventListener("resize", onResize);
  Promise.all([motion.finished, inkMotion?.finished]).then(() => {
    onComplete();
    cleanup();
  }, cleanup);
  return cleanup;
}
