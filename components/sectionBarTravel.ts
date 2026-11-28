import { BAR_SLIDE_EASING, BAR_SLIDE_MS, type BarSpot } from "./slidingBar";

/** Move a fixed-width section underline between its label and the rule's left edge. */
function travelSectionBar(nav: HTMLElement, spot: BarSpot, entering: boolean, onComplete: () => void) {
  const rule = nav.closest<HTMLElement>("[data-section-rule]");
  if (!rule || nav.clientWidth === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    onComplete();
    return;
  }
  const ruleBox = rule.getBoundingClientRect();
  const navBox = nav.getBoundingClientRect();
  const outside = { left: ruleBox.left - navBox.left - spot.width, width: spot.width };
  const from = entering ? outside : spot;
  const to = entering ? spot : outside;
  const left = navBox.left - ruleBox.left + from.left;
  const clip = document.createElement("span");
  clip.dataset[entering ? "sectionBarEntry" : "sectionBarExit"] = "";
  clip.setAttribute("aria-hidden", "true");
  // The same box as the header's bar (HeaderClient): 5px tall from 1px above
  // the nav's foot, centred on the 1px rule
  Object.assign(clip.style, {
    position: "absolute", left: "0", right: "0", top: `${navBox.bottom - ruleBox.top - 1}px`,
    height: "5px", overflow: "hidden", pointerEvents: "none", zIndex: "20",
  });
  const bar = document.createElement("span");
  bar.dataset[entering ? "enteringSectionBar" : "exitingSectionBar"] = "";
  Object.assign(bar.style, {
    position: "absolute", top: "0", left: `${left}px`, width: `${from.width}px`, height: "100%",
    backgroundColor: "var(--accent-color)",
  });
  clip.append(bar);
  rule.append(clip);
  const liveBar = entering ? nav.querySelector<HTMLElement>("[data-slide-bar]") : null;
  const visibility = liveBar?.style.visibility ?? "";
  if (liveBar) liveBar.style.visibility = "hidden";
  const timing = { duration: BAR_SLIDE_MS, easing: BAR_SLIDE_EASING, fill: "forwards" as const };
  const motion = bar.animate([
    { transform: "translateX(0)" },
    { transform: `translateX(${to.left - from.left}px)` },
  ], timing);
  const overlay = nav.querySelector<HTMLElement>("[data-slide-ink]");
  const ink = (spot: BarSpot) => `inset(0px ${nav.clientWidth - spot.left - spot.width}px 0px ${spot.left}px)`;
  nav.dataset.sliding = "";
  const inkMotion = overlay?.animate([
    { clipPath: ink(from) },
    { clipPath: ink(to) },
  ], timing);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    motion.cancel();
    inkMotion?.cancel();
    clip.remove();
    if (liveBar) liveBar.style.visibility = visibility;
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

/** Carry a section underline along the landing-page rule and off its left edge. */
export function slideSectionBarOut(nav: HTMLElement, from: BarSpot, onComplete: () => void) {
  return travelSectionBar(nav, from, false, onComplete);
}

/** Bring a selected section's underline in from outside the rule's left edge. */
export function slideSectionBarIn(nav: HTMLElement, onComplete: () => void) {
  const bar = nav.querySelector<HTMLElement>("[data-slide-bar]");
  if (!bar) {
    onComplete();
    return;
  }
  const navBox = nav.getBoundingClientRect();
  const box = bar.getBoundingClientRect();
  return travelSectionBar(nav, { left: box.left - navBox.left, width: box.width }, true, onComplete);
}
