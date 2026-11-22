"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { panelTintStyles, type FrameStyle } from "./timelinePage";
import { STUDENT_GOV, type StudentGovBody } from "./studentGov";
import StudentGovBodySwitch from "./StudentGovBodySwitch";

export type PanelPhoto = {
  src: string;
  alt: string;
  /** Framing on computers (≥860px) and phones, set in the page editor */
  desktop: FrameStyle;
  mobile: FrameStyle;
  /** How wide the photo is drawn (see panelPhotoSizes), for the download size */
  sizes: string;
};

/** CSS variables the panel photo reads its framing from */
const frameVars = (photo: PanelPhoto) =>
  ({
    "--pos-d": photo.desktop.position,
    "--zoom-d": photo.desktop.zoom,
    "--pos-m": photo.mobile.position,
    "--zoom-m": photo.mobile.zoom,
  }) as React.CSSProperties;

// Phones use the -m framing, computers the -d one; zoom scales toward the kept point
const FRAME_CLASS =
  "[object-position:var(--pos-m)] [transform-origin:var(--pos-m)] [transform:scale(var(--zoom-m))] min-[860px]:[object-position:var(--pos-d)] min-[860px]:[transform-origin:var(--pos-d)] min-[860px]:[transform:scale(var(--zoom-d))]";

export type PanelMonth = {
  /** "2026-11"; also the section id suffix (`month-2026-11`) */
  key: string;
  /** "Nov" */
  short: string;
};

/** How long a month must stay in view before the panel's label switches to it */
const SETTLE_MS = 150;

/**
 * Left half of the split timeline page: the term's duotone photo (one for the
 * whole term) with the body name on top and the month in view at the bottom.
 * Watches the month sections in the list (`[data-timeline-month]`) and swaps
 * the month label as each one reaches the top third of the screen.
 * Older months are reached by scrolling the stream.
 */
export default function StudentGovMonthPanel({
  title,
  termLabel,
  body,
  otherHref,
  months,
  photo,
  panelTint,
}: {
  title: string;
  /** "57th Senate · 2026–27" / "2026–27" */
  termLabel: string;
  body: StudentGovBody;
  /** The other body's same term (or its timeline), for the switch */
  otherHref: string;
  months: PanelMonth[];
  /** The term's photo, or null for plain red */
  photo: PanelPhoto | null;
  panelTint: number;
}) {
  const [activeKey, setActiveKey] = useState<string | null>(months[0]?.key ?? null);
  const visible = useRef(new Set<string>());

  // On desktop the stream scrolls in its own column; on phones the page scrolls
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 860px)");
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-timeline-month]"));
    if (sections.length === 0) return;
    const order = sections.map((s) => s.dataset.timelineMonth as string);
    const scroller = desktop ? document.querySelector<HTMLElement>("[data-timeline-scroller]") : null;
    visible.current.clear();
    let timer = 0;
    let first = true;

    // The root is the top third of whatever scrolls the stream: the month
    // whose section covers it, or the lowest one when two do, is being read.
    // The label only changes once a month has stayed there for SETTLE_MS, so
    // a fast scroll past several months swaps it once, not once per month.
    // The first reading counts at once: a page that opens partway down the
    // stream (switching bodies at the Terms list) shows its month straight
    // away, not the newest one first.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const key = (entry.target as HTMLElement).dataset.timelineMonth as string;
          if (entry.isIntersecting) visible.current.add(key);
          else visible.current.delete(key);
        }
        let current = [...order].reverse().find((k) => visible.current.has(k));
        const wasFirst = first;
        first = false;
        // Opening past the last month (at the Terms list): the lowest one
        // already scrolled by, as if it had been scrolled to
        if (!current && wasFirst) {
          const past = new Set(
            entries
              .filter((e) => e.rootBounds && e.boundingClientRect.bottom <= e.rootBounds.top)
              .map((e) => (e.target as HTMLElement).dataset.timelineMonth as string),
          );
          current = [...order].reverse().find((k) => past.has(k));
        }
        // Above the list or past it: keep the last month shown
        if (!current) return;
        window.clearTimeout(timer);
        if (wasFirst) {
          setActiveKey(current);
          return;
        }
        timer = window.setTimeout(() => setActiveKey(current), SETTLE_MS);
      },
      { root: scroller, rootMargin: "0px 0px -66% 0px", threshold: 0 },
    );
    sections.forEach((s) => observer.observe(s));
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [desktop]);

  const active = months.find((m) => m.key === activeKey) ?? months[0] ?? null;
  const tint = panelTintStyles(panelTint);

  return (
    // From lg the header's rule (square line caps) starts half a pixel before
    // the content column, so the panel does too. A translate, not a margin:
    // Chrome snaps margins to whole pixels but draws translates exactly.
    //
    // Moving between bodies, the panel slides as one (data-swipe-chunk,
    // pageSwipe.ts): the old body's photo, title, term and month go out one
    // side and this one's follow right behind, while the switch
    // (data-swipe-keep) stays put and its underline slides over.
    <aside
      data-swipe-chunk="panel"
      className="relative h-[440px] w-full overflow-hidden text-white min-[860px]:h-full min-[860px]:w-[38%] min-[860px]:max-w-[560px] min-[860px]:shrink-0 lg:-translate-x-[0.5px]"
      style={{ backgroundColor: tint.backgroundColor }}
    >
      <div className="relative h-full">
        {photo && (
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            priority
            sizes={photo.sizes}
            className={`object-cover ${FRAME_CLASS}`}
            style={{ ...frameVars(photo), filter: tint.filter }}
          />
        )}
        <div aria-hidden="true" className="absolute inset-0 bg-[#D6001C] mix-blend-multiply" style={{ opacity: tint.opacity }} />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.6)_0%,rgba(0,0,0,0.35)_30%,rgba(0,0,0,0)_50%,rgba(0,0,0,0)_55%,rgba(0,0,0,0.85)_100%)]"
        />

        <div className="relative flex h-full flex-col justify-between gap-6 p-6 min-[860px]:p-11 lg:pt-6">
          <div>
            <div data-swipe-keep>
              <StudentGovBodySwitch
                id="panel"
                body={body}
                otherHref={otherHref}
                labels={{ senate: STUDENT_GOV.senate.label, eboard: STUDENT_GOV.eboard.label }}
                tone="panel"
              />
            </div>
            <h1 className="mt-5 font-meta text-[40px] font-light uppercase leading-[1] tracking-[0.02em] min-[860px]:text-[clamp(40px,4.2vw,60px)]">
              {title}
            </h1>
            <p className="mt-2 font-meta text-[15px] font-semibold uppercase tracking-[0.08em]">{termLabel}</p>
          </div>

          {active && (
            // The tight leading lets the tails of p, y and g (Apr, May, Aug, Sep)
            // hang below the box, into the panel's padding
            <p className="w-fit font-copy text-[132px] font-semibold leading-[0.78] tracking-[-0.02em] min-[860px]:text-[clamp(110px,22vh,200px)]">
              {active.short}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
