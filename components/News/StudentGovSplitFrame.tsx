"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * Frame for the split timeline page. On desktop (≥860px) it fills the window
 * below the site header exactly, so the photo panel shows in full and the
 * stream scrolls inside its own column (`[data-timeline-scroller]`). When the
 * stream reaches its end, scrolling carries on to the page and the footer;
 * scrolling over the photo panel moves the page. Phones scroll normally.
 *
 * The stream's scrollbar is hidden and replaced by a thin red line at its
 * right that fills from the top as the stream is scrolled.
 */
export default function StudentGovSplitFrame({ className, children }: { className: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  // Distance from the top of the page to the frame: the header's height
  const [top, setTop] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setTop(Math.round(el.getBoundingClientRect().top + window.scrollY));
    measure();
    // The header can change height (fonts loading, the window crossing a breakpoint)
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Scroll progress line
  useEffect(() => {
    const scroller = ref.current?.querySelector<HTMLElement>("[data-timeline-scroller]");
    const track = trackRef.current;
    const fill = fillRef.current;
    if (!scroller || !track || !fill) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = scroller.scrollHeight - scroller.clientHeight;
      // Nothing to scroll (a short stream): no red
      fill.style.transform = `scaleY(${max > 1 ? Math.min(1, scroller.scrollTop / max) : 0})`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    scroller.addEventListener("scroll", schedule, { passive: true });
    const observer = new ResizeObserver(schedule);
    observer.observe(scroller);
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", schedule);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      style={top !== null ? ({ "--split-top": `${top}px` } as React.CSSProperties) : undefined}
    >
      {children}
      {/*
        A red line that grows straight down from the right end of the header's
        rule (1px, starting 1px up so it meets the rule in a clean corner) as
        the stream scrolls. Nothing is drawn below the red. Desktop only. The
        rule's square cap ends half a pixel past the column, hence the
        half-pixel translate (Chrome would snap a half-pixel `right`).
      */}
      <div
        ref={trackRef}
        data-scroll-progress
        aria-hidden="true"
        className="pointer-events-none absolute -top-px bottom-0 right-0 hidden w-px min-[860px]:block lg:right-6 lg:translate-x-[0.5px] xl:right-[30px]"
      >
        <div
          ref={fillRef}
          className="h-full w-full origin-top bg-accent will-change-transform"
          style={{ transform: "scaleY(0)" }}
        />
      </div>
    </div>
  );
}
