"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { scrollByWheel, streamWheel, wheelDeltaY } from "./wheelScroll";
import { swipeArrived } from "./pageSwipe";

/**
 * Frame for the split timeline page. On desktop (≥860px) it fills the window
 * below the site header exactly, so the photo panel shows in full and the
 * stream scrolls inside its own column (`[data-timeline-scroller]`). Scrolling
 * down over the stream scrolls the stream; once it's at its end, the next
 * swipe or wheel turn carries the page down to the footer (the one that
 * reached the end, momentum and all, stops there). Scrolling back up brings the page back
 * first, until the frame is in place again, then the stream. Phones scroll
 * normally.
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

  // A new timeline (one per term) has rendered: a swipe from the other body
  // can capture it now, before it's painted
  useLayoutEffect(() => {
    swipeArrived();
  }, []);

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

  // Wheel and trackpad over the stream. Down: the stream scrolls; once it's
  // at its end, the page carries on down to the footer. Up while the page is
  // scrolled down: the page comes back first, so the stream never scrolls with
  // its top cut off under the header.
  //
  // The page is moved here, not left to the browser. A browser keeps a whole
  // swipe on whatever it started on, and on a trackpad a swipe's momentum
  // runs on after the fingers lift, so swipe after swipe stays on the stream
  // even once it has nothing left to scroll. Moving the page by hand works
  // inside such a swipe too. The browser's own scroll is cancelled where it
  // can be, so the page is never moved twice; where it can't be (mid-swipe),
  // it only ever goes to the stream, which is already at its end.
  //
  // Sideways movement needs care too. A browser hands a whole trackpad swipe
  // to whatever can scroll the way its first tiny movement goes, and swipes
  // start with a little drift. If that drift is sideways, nothing in the
  // stream can take it (nothing there scrolls sideways), so the swipe goes to
  // the page, and the rest of it scrolls the page down to the footer. So a
  // mostly sideways event is always stopped.
  useEffect(() => {
    const scroller = ref.current?.querySelector<HTMLElement>("[data-timeline-scroller]");
    if (!scroller) return;
    const desktop = window.matchMedia("(min-width: 860px)");
    const onWheel = (e: WheelEvent) => {
      // Phones and narrow windows scroll the page; ctrl + wheel zooms
      if (!desktop.matches || e.ctrlKey || e.defaultPrevented || (e.deltaX === 0 && e.deltaY === 0)) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) {
        e.preventDefault();
        return;
      }
      const dy = wheelDeltaY(e);
      const { atEnd: streamAtEnd, hold } = streamWheel(scroller, dy, e.timeStamp);
      // Still the swipe that ran the stream down to its end: stop there
      if (hold) {
        if (e.cancelable) e.preventDefault();
        return;
      }
      const pageMax = document.documentElement.scrollHeight - window.innerHeight;
      const toPage = (dy < 0 && window.scrollY > 0) || (dy > 0 && streamAtEnd && window.scrollY < pageMax - 1);
      if (!toPage) return;
      if (e.cancelable) e.preventDefault();
      scrollByWheel(window, dy);
    };
    scroller.addEventListener("wheel", onWheel, { passive: false });
    return () => scroller.removeEventListener("wheel", onWheel);
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
