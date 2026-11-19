"use client";

import { useLayoutEffect, useRef } from "react";
import { BAR_SLIDE_EASING, BAR_SLIDE_MS } from "@/components/slidingBar";

type PendingSwipe = { ghost: HTMLElement; direction: 1 | -1; height: number };

/** A local version of the Senate / E-Board full-width content swap. */
export function useStandingsSwipe(sport: string | undefined) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<PendingSwipe | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const prepareSwipe = (direction: 1 | -1) => {
    // A newer selection takes over cleanly, without retaining old copies.
    stopRef.current?.();
    pendingRef.current?.ghost.remove();
    pendingRef.current = null;
    const content = contentRef.current;
    if (!content || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ghost = content.cloneNode(true) as HTMLElement;
    ghost.removeAttribute("data-standings-content");
    for (const element of [ghost, ...ghost.querySelectorAll("[id]")]) element.removeAttribute("id");
    ghost.querySelectorAll("img").forEach(image => {
      image.loading = "eager";
      image.decoding = "sync";
    });
    ghost.setAttribute("aria-hidden", "true");
    ghost.inert = true;
    ghost.dataset.standingsGhost = "";
    pendingRef.current = { ghost, direction, height: content.getBoundingClientRect().height };
  };

  useLayoutEffect(() => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!pending) return;
    if (!viewport || !content || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      pending.ghost.remove();
      return;
    }
    const { ghost, direction, height: oldHeight } = pending;
    const width = viewport.getBoundingClientRect().width;
    const height = content.getBoundingClientRect().height;
    Object.assign(ghost.style, {
      position: "absolute", top: "0", left: "0", width: "100%", margin: "0", pointerEvents: "none",
    });
    viewport.prepend(ghost);
    viewport.style.height = `${height}px`;
    const timing = { duration: BAR_SLIDE_MS, easing: BAR_SLIDE_EASING };
    const shift = (x: number) => ({ transform: `translateX(${x}px)` });
    const outgoing = ghost.animate([shift(0), shift(-direction * width)], { ...timing, fill: "forwards" });
    const incoming = content.animate([shift(direction * width), shift(0)], timing);
    const sizing = viewport.animate([{ height: `${oldHeight}px` }, { height: `${height}px` }], timing);

    let cleaned = false;
    const observer = new ResizeObserver(() => {
      if (Math.abs(viewport.getBoundingClientRect().width - width) > 1) cleanup();
    });
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      observer.disconnect();
      outgoing.cancel();
      incoming.cancel();
      sizing.cancel();
      ghost.remove();
      viewport.style.height = "";
      if (stopRef.current === cleanup) stopRef.current = null;
    };
    stopRef.current = cleanup;
    observer.observe(viewport);
    Promise.all([outgoing.finished, incoming.finished, sizing.finished]).catch(() => {}).finally(cleanup);
    return cleanup;
  }, [sport]);

  return { viewportRef, contentRef, prepareSwipe };
}
