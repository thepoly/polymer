"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import NewsTopicScrollArrow from "./NewsTopicScrollArrow";

/** How long the outgoing set takes to leave (see globals.css), plus a little */
const OUT_MS = 760 + 40;

type MouseDrag = { pointerId: number; x: number; y: number; scrollLeft: number; moved: boolean };

/**
 * Topic headers above a row of cards on /news. Clicking a header swaps the
 * cards in one continuous swipe: the whole current set slides off one side
 * and the new set follows right behind it from the other, coming from the
 * side of the header that was clicked (a header to the right brings its
 * cards in from the right). A red bar under the headers slides to the one
 * selected.
 *
 * The panels are rendered on the server and passed in, one per tab, in tab
 * order. Inactive panels stay laid out but invisible, so their photos load
 * before they're needed and the swap never shows empty frames. Styles:
 * `[data-topic-panel]` in globals.css.
 *
 * Keyboard: the headers are a tablist; arrow keys, Home and End move
 * between them.
 */
export default function NewsTopicTabs({
  tabs,
  initial = 0,
  children,
}: {
  tabs: { key: string; label: string }[];
  /** Tab selected on load */
  initial?: number;
  /** One panel per tab, same order */
  children: React.ReactNode[];
}) {
  const [active, setActive] = useState(initial);
  const [leaving, setLeaving] = useState<number | null>(null);
  // 1: the new set comes in from the right; -1: from the left
  const [dir, setDir] = useState(1);
  // No animation until the reader picks a tab
  const [animated, setAnimated] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const headerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);
  const [scrollControl, setScrollControl] = useState({ visible: false, back: false });
  const [dragging, setDragging] = useState(false);
  const mouseDrag = useRef<MouseDrag | null>(null);
  const suppressClick = useRef(false);
  const leaveTimer = useRef(0);

  const clearMouseDrag = useCallback(() => {
    const drag = mouseDrag.current;
    mouseDrag.current = null;
    if (!drag) return;
    const list = listRef.current;
    if (list?.hasPointerCapture(drag.pointerId)) list.releasePointerCapture(drag.pointerId);
    if (drag.moved) setDragging(false);
  }, []);

  const measureScroll = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const max = list.scrollWidth - list.clientWidth;
    const visible = !window.matchMedia("(min-width: 768px)").matches &&
      max > 1;
    setScrollControl((previous) => {
      const back = visible && list.scrollLeft > max / 2;
      return previous.visible === visible && previous.back === back ? previous : { visible, back };
    });
  }, []);

  // The red bar follows the selected header
  const measure = useCallback(() => {
    const tab = tabRefs.current[active];
    if (tab) setBar({ left: tab.offsetLeft, width: tab.offsetWidth });
  }, [active]);
  useLayoutEffect(measure, [measure]);
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const observer = new ResizeObserver(() => {
      clearMouseDrag();
      measure();
      measureScroll();
    });
    observer.observe(list);
    for (const tab of tabRefs.current) if (tab) observer.observe(tab);
    return () => observer.disconnect();
  }, [clearMouseDrag, measure, measureScroll]);
  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

  useEffect(() => {
    const header = headerRef.current;
    // Native swipes and vertical scrolling stay with the browser; the site
    // drawer must not claim a rightward swipe that starts on these headers.
    const ownTouch = (event: TouchEvent) => {
      clearMouseDrag();
      event.stopPropagation();
    };
    const visibility = () => { if (document.hidden) clearMouseDrag(); };
    header?.addEventListener("touchstart", ownTouch, { passive: true });
    window.addEventListener("blur", clearMouseDrag);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      header?.removeEventListener("touchstart", ownTouch);
      window.removeEventListener("blur", clearMouseDrag);
      document.removeEventListener("visibilitychange", visibility);
      clearMouseDrag();
    };
  }, [clearMouseDrag]);

  const startMouseDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick.current = false;
    if (event.pointerType !== "mouse" || !scrollControl.visible) return;
    clearMouseDrag();
    const list = event.currentTarget;
    list.scrollTo({ left: list.scrollLeft, behavior: "instant" });
    mouseDrag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, scrollLeft: list.scrollLeft, moved: false };
  };

  const moveMouseDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = mouseDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    if (!drag.moved) {
      const dy = event.clientY - drag.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) { clearMouseDrag(); return; }
      drag.moved = true;
      suppressClick.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    event.preventDefault();
    event.currentTarget.scrollTo({ left: drag.scrollLeft - dx, behavior: "instant" });
  };

  const scrollHeaders = () => {
    const list = listRef.current;
    if (!list) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollTo({ left: scrollControl.back ? 0 : list.scrollWidth - list.clientWidth, behavior: reduce ? "instant" : "smooth" });
  };

  const select = (index: number, focus = false) => {
    if (index === active) return;
    setDir(index > active ? 1 : -1);
    setLeaving(active);
    setActive(index);
    setAnimated(true);
    window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => setLeaving(null), OUT_MS);
    const tab = tabRefs.current[index];
    if (focus) tab?.focus({ preventScroll: true });
    // Keep the chosen header in view where the row scrolls (phones)
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const list = listRef.current;
    if (list && tab && scrollControl.visible) {
      const max = list.scrollWidth - list.clientWidth;
      const center = tab.offsetLeft + tab.offsetWidth / 2 - list.clientWidth / 2;
      // Center within the clear space beside the arrow, without adding
      // layout padding that would make the labels jump when it swaps sides.
      const target = center + (center > max / 2 ? -28 : 28);
      list.scrollTo({ left: Math.max(0, Math.min(max, target)), behavior: reduce ? "instant" : "smooth" });
    } else {
      tab?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduce ? "instant" : "smooth" });
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const last = tabs.length - 1;
    const next =
      e.key === "ArrowRight" ? (active === last ? 0 : active + 1)
      : e.key === "ArrowLeft" ? (active === 0 ? last : active - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    select(next, true);
  };

  const stateOf = (i: number) =>
    i === active ? (animated ? "in" : "shown") : i === leaving ? "out" : "idle";

  return (
    <section aria-label="News by topic" className="mt-10">
      <div ref={headerRef} className="relative">
        <div
          id="news-topic-tabs"
          ref={listRef}
          role="tablist"
          aria-label="Topics"
          onKeyDown={onKeyDown}
          onScroll={measureScroll}
          onPointerDown={startMouseDrag}
          onPointerMove={moveMouseDrag}
          onPointerUp={clearMouseDrag}
          onPointerCancel={clearMouseDrag}
          onLostPointerCapture={(event) => { if (event.target === event.currentTarget) clearMouseDrag(); }}
          onPointerLeave={(event) => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) clearMouseDrag(); }}
          onDragStart={(event) => { if (scrollControl.visible) event.preventDefault(); }}
          onClickCapture={(event) => {
            if (suppressClick.current && event.detail > 0) { event.preventDefault(); event.stopPropagation(); }
            suppressClick.current = false;
          }}
          // Centered; "safe" keeps the first header reachable when the row scrolls (phones)
          className={`relative flex gap-x-8 overflow-x-auto overflow-y-hidden [justify-content:safe_center] border-b border-[var(--rule-color)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${scrollControl.visible ? dragging ? "select-none cursor-grabbing [&_button]:cursor-grabbing" : "select-none cursor-grab [&_button]:cursor-grab" : ""}`}
        >
          {tabs.map((tab, i) => {
            const selected = i === active;
            return (
              <button
                key={tab.key}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`topic-tab-${tab.key}`}
                aria-selected={selected}
                aria-controls={`topic-panel-${tab.key}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => select(i)}
                className={`relative shrink-0 whitespace-nowrap pb-3 font-copy text-[clamp(20px,2vw,26px)] font-semibold leading-none tracking-[-0.01em] transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${
                  selected ? "text-text-main" : "text-text-muted hover:text-text-main"
                } ${
                  // Until the sliding bar is measured, the selected header draws its own
                  selected && !bar ? "after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-accent" : ""
                }`}
              >
                {tab.label}
              </button>
            );
          })}
          {bar && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 left-0 h-[3px] bg-accent transition-[transform,width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              style={{ width: bar.width, transform: `translateX(${bar.left}px)` }}
            />
          )}
        </div>
        {scrollControl.visible && (
          <NewsTopicScrollArrow back={scrollControl.back} onClick={scrollHeaders} />
        )}
      </div>

      <div className="relative mt-6 grid overflow-x-clip" style={{ "--topic-dir": dir } as React.CSSProperties}>
        {children.map((panel, i) => (
          <div
            key={tabs[i]?.key ?? i}
            role="tabpanel"
            id={`topic-panel-${tabs[i]?.key}`}
            aria-labelledby={`topic-tab-${tabs[i]?.key}`}
            data-topic-panel
            data-state={stateOf(i)}
            inert={i !== active}
          >
            {panel}
          </div>
        ))}
      </div>
    </section>
  );
}
