"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/** How long the outgoing set takes to leave (see globals.css), plus a little */
const OUT_MS = 760 + 40;

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
  const listRef = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);
  const leaveTimer = useRef(0);

  // The red bar follows the selected header
  const measure = useCallback(() => {
    const tab = tabRefs.current[active];
    if (tab) setBar({ left: tab.offsetLeft, width: tab.offsetWidth });
  }, [active]);
  useLayoutEffect(measure, [measure]);
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [measure]);
  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

  const select = (index: number, focus = false) => {
    if (index === active) return;
    setDir(index > active ? 1 : -1);
    setLeaving(active);
    setActive(index);
    setAnimated(true);
    window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => setLeaving(null), OUT_MS);
    if (focus) tabRefs.current[index]?.focus();
    // Keep the chosen header in view where the row scrolls (phones)
    tabRefs.current[index]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
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
      <div
        ref={listRef}
        role="tablist"
        aria-label="Topics"
        onKeyDown={onKeyDown}
        // Centered; "safe" keeps the first header reachable when the row scrolls (phones)
        className="relative flex gap-x-8 overflow-x-auto [justify-content:safe_center] border-b border-[var(--rule-color)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                selected && !bar ? "after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:bg-accent" : ""
              }`}
            >
              {tab.label}
            </button>
          );
        })}
        {bar && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-px left-0 h-[3px] bg-accent transition-[transform,width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ width: bar.width, transform: `translateX(${bar.left}px)` }}
          />
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
