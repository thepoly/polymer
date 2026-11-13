"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { monthSectionId } from "./studentGov";
import type { FrameStyle } from "./timelinePage";

export type PanelPhoto = {
  src: string;
  alt: string;
  /** "Name/The Polytechnic" or a write-in credit */
  credit: string | null;
  /** Framing on computers (≥860px) and phones, set in the page editor */
  desktop: FrameStyle;
  mobile: FrameStyle;
  /** How wide the photo is drawn (see panelPhotoSizes), for the download size */
  sizes: string;
};

/** Same file framed differently counts as a different photo */
const photoId = (p: PanelPhoto) =>
  [p.src, p.desktop.position, p.desktop.zoom, p.mobile.position, p.mobile.zoom].join("|");

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
  /** "2026" */
  year: string;
  articles: number;
  updates: number;
  photo: PanelPhoto | null;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Left half of the split timeline page: a sticky duotone photo with the body
 * name on top and the month in view at the bottom. Watches the month sections
 * in the list (`[data-timeline-month]`) and swaps the month label, counts,
 * active pill and photo as each one reaches the top third of the screen.
 */
export default function StudentGovMonthPanel({
  title,
  otherTitle,
  otherHref,
  months,
}: {
  title: string;
  otherTitle: string;
  otherHref: string;
  months: PanelMonth[];
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

    // The root is the top third of whatever scrolls the stream: the month
    // whose section covers it, or the lowest one when two do, is being read.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const key = (entry.target as HTMLElement).dataset.timelineMonth as string;
          if (entry.isIntersecting) visible.current.add(key);
          else visible.current.delete(key);
        }
        const current = [...order].reverse().find((k) => visible.current.has(k));
        // Above the list or past it: keep the last month shown
        if (current) setActiveKey(current);
      },
      { root: scroller, rootMargin: "0px 0px -66% 0px", threshold: 0 },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [desktop]);

  const jumpTo = useCallback(
    (key: string) => {
      const section = document.getElementById(monthSectionId(key));
      if (!section) return;
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      const scroller = desktop ? document.querySelector<HTMLElement>("[data-timeline-scroller]") : null;
      if (scroller) {
        // Scroll only the stream column, so the header stays put
        const offset = section.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
        scroller.scrollTo({ top: scroller.scrollTop + offset - 24, behavior });
      } else {
        section.scrollIntoView({ behavior, block: "start" });
      }
      setActiveKey(key);
    },
    [desktop],
  );

  const active = months.find((m) => m.key === activeKey) ?? months[0] ?? null;
  const activePhoto = active?.photo ?? null;
  const activeId = activePhoto ? photoId(activePhoto) : null;

  // Every distinct photo (and framing of it) is mounted once and crossfaded
  const photos = Array.from(
    new Map(months.filter((m) => m.photo).map((m) => [photoId(m.photo!), m.photo!])).values(),
  );

  return (
    // From lg the header's rule (square line caps) starts half a pixel before
    // the content column, so the panel does too. A translate, not a margin:
    // Chrome snaps margins to whole pixels but draws translates exactly.
    <aside className="relative h-[440px] w-full overflow-hidden bg-[#2a0a10] text-white min-[860px]:h-full min-[860px]:w-[38%] min-[860px]:max-w-[560px] min-[860px]:shrink-0 lg:-translate-x-[0.5px]">
      {photos.map((photo, i) => (
        <Image
          key={photoId(photo)}
          src={photo.src}
          alt={photoId(photo) === activeId ? photo.alt : ""}
          aria-hidden={photoId(photo) === activeId ? undefined : true}
          fill
          priority={i === 0}
          sizes={photo.sizes}
          className={`object-cover contrast-[1.15] grayscale transition-opacity duration-[400ms] ease-out motion-reduce:transition-none ${FRAME_CLASS} ${
            photoId(photo) === activeId ? "opacity-100" : "opacity-0"
          }`}
          style={frameVars(photo)}
        />
      ))}
      <div aria-hidden="true" className="absolute inset-0 bg-[#D6001C] opacity-[0.78] mix-blend-multiply" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.6)_0%,rgba(0,0,0,0.35)_30%,rgba(0,0,0,0)_50%,rgba(0,0,0,0)_55%,rgba(0,0,0,0.85)_100%)]"
      />

      <div className="relative flex h-full flex-col justify-between gap-6 p-6 min-[860px]:p-11">
        <div>
          <nav aria-label="Breadcrumb" className="font-meta text-[12px] font-semibold uppercase tracking-[0.12em]">
            <TransitionLink href="/news" className="hover:underline">
              News
            </TransitionLink>
            <span className="mx-2 opacity-70" aria-hidden="true">
              /
            </span>
            <span>Student Government</span>
          </nav>
          <h1 className="mt-3 font-meta text-[40px] font-light uppercase leading-[1] tracking-[0.02em] min-[860px]:text-[clamp(40px,4.2vw,60px)]">
            {title}
          </h1>
          <p className="mt-4 font-meta text-[14px] font-medium leading-[1.5]">
            <TransitionLink href={otherHref} className="transition-opacity hover:opacity-75">
              {otherTitle} timeline&nbsp;&rsaquo;
            </TransitionLink>
          </p>
        </div>

        {active && (
          <div>
            <p
              className="font-copy text-[132px] font-semibold leading-[0.78] tracking-[-0.02em] min-[860px]:text-[clamp(110px,22vh,200px)]"
            >
              {active.short}
            </p>
            <p className="mt-4 font-meta text-[13px] font-medium">
              <span className="font-bold">{active.year}</span>
              <span className="ml-3">
                {plural(active.articles, "article")} &middot; {plural(active.updates, "update")}
              </span>
            </p>
            {months.length > 1 && (
              <nav aria-label="Jump to month" className="mt-4 flex flex-wrap gap-2">
                {months.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => jumpTo(m.key)}
                    aria-current={m.key === active.key ? "true" : undefined}
                    className={`h-11 min-w-[56px] border px-4 font-meta text-[12px] font-bold uppercase tracking-[0.08em] transition-colors ${
                      m.key === active.key
                        ? "border-white bg-white text-[#1c1a1a]"
                        : "border-white/80 text-white hover:bg-white/15"
                    }`}
                  >
                    {m.short}
                  </button>
                ))}
              </nav>
            )}
            {activePhoto?.credit && (
              <p className="mt-4 font-meta text-[11px] font-medium opacity-90">Photo: {activePhoto.credit}</p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
