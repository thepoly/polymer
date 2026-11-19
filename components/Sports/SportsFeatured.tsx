"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import type { Article as ComponentArticle } from "@/components/FrontPage/types";
import SportsHeading from "./SportsHeading";
import SportsByline from "./SportsByline";
import { cardPosition, shortDate, sportName } from "./sportsFormat";
import type { FeaturedFocus } from "@/lib/sportsLayout";
import { useMomentumScroll } from "./useMomentumScroll";

const GAP = 16;
// Carousel card widths: one and a peek on phones, then 2.25, 3 and 4 across
const CAROUSEL_WIDTH =
  "w-[78%] sm:w-[calc((100%-16px)/2.25)] md:w-[calc((100%-32px)/3)] lg:w-[calc((100%-48px)/4)]";

/**
 * A story as a 4:5 photo card: the headline and byline on a dark shade rising
 * from the foot. `compact` sets smaller type for dense grids.
 */
export function StoryCard({
  article,
  position,
  className = "",
  compact = false,
}: {
  article: ComponentArticle;
  position: string;
  className?: string;
  compact?: boolean;
}) {
  const image = article.imageFull || article.image;
  const sport = sportName(article);
  const date = shortDate(article, true);
  return (
    <article
      className={`group/card relative aspect-[4/5] shrink-0 overflow-hidden rounded-[3px] bg-[#111] shadow-[0_14px_28px_-16px_rgba(0,0,0,0.55)] transition-[translate,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_22px_38px_-16px_rgba(0,0,0,0.6)] ${className}`}
    >
      {image && (
        <Image
          src={image}
          alt={article.title}
          fill
          // A landscape photo covering a 4:5 card is drawn about 1.9x the
          // card's width, so these ask for that much, not the card's width
          sizes={
            compact
              ? "(max-width: 768px) 95vw, (max-width: 1280px) 50vw, 440px"
              : "(max-width: 640px) 150vw, (max-width: 768px) 85vw, (max-width: 1024px) 60vw, 560px"
          }
          className="object-cover transition-transform duration-700 ease-out group-hover/card:scale-[1.04]"
          style={{ objectPosition: position }}
        />
      )}
      {/* The shade the text sits on: deep at the foot, gone by mid-card */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.78) 30%, rgba(0,0,0,0.25) 58%, rgba(0,0,0,0) 76%)",
        }}
      />
      <div className={`absolute inset-x-0 bottom-0 ${compact ? "p-4" : "p-5"}`}>
        <span aria-hidden="true" className="mb-3 block h-[2px] w-6 bg-accent transition-[width] duration-300 ease-out group-hover/card:w-12" />
        {sport && (
          <div className="mb-1.5 font-meta text-[11px] font-semibold uppercase tracking-[0.1em] text-white/70">{sport}</div>
        )}
        <h3
          className={`font-copy font-light leading-[1.14] text-white ${compact ? "text-[17px] lg:text-[18px]" : "text-[21px] sm:text-[22px]"}`}
        >
          {/* Stretched over the card so the whole card opens the story */}
          <TransitionLink href={getArticleUrl(article)} className="line-clamp-4 after:absolute after:inset-0">
            {article.richTitle ?? article.title}
          </TransitionLink>
        </h3>
        <div className={`font-meta uppercase leading-[1.5] tracking-[0.06em] text-white/75 ${compact ? "mt-2 text-[10px]" : "mt-3 text-[11px]"}`}>
          {/* In white for the dark card */}
          <SportsByline
            article={article}
            linkClassName="whitespace-nowrap text-white transition-colors hover:text-accent"
            nameClassName="whitespace-nowrap text-white"
          />
          {date && (
            <>
              <span aria-hidden="true" className="mx-1.5 text-white/40">·</span>
              <span className="whitespace-nowrap">{date}</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

/** Closes the row, pointing to every sports story */
function EndCard({ slide }: { slide: number }) {
  return (
    <div
      // A slide like the cards, so tabbing to its link brings it into view
      data-slide={slide}
      className={`flex aspect-[4/5] shrink-0 flex-col items-center justify-center px-6 text-center ${CAROUSEL_WIDTH}`}
    >
      <span aria-hidden="true" className="mb-5 block h-[2px] w-8 bg-accent" />
      <p className="font-meta text-[26px] uppercase leading-[1.05] tracking-[0.04em] text-text-main">Want to see more?</p>
      <Link
        href="/sports/all"
        className="mt-6 border border-text-main px-5 py-3 font-meta text-[12px] font-semibold uppercase tracking-[0.08em] text-text-main transition-colors hover:border-accent hover:bg-accent hover:text-white"
      >
        View all in Sports
      </Link>
    </div>
  );
}

/**
 * Round frosted-glass arrow floating over the cards: a translucent tint with
 * the photo blurred behind it. Fades away at its end of the row.
 */
function ArrowButton({ direction, hidden, onClick }: { direction: "prev" | "next"; hidden: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={direction === "prev" ? "Previous headlines" : "Next headlines"}
      onClick={onClick}
      disabled={hidden}
      className={`absolute z-10 hidden h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/75 text-[#111] shadow-[0_8px_24px_-6px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl backdrop-saturate-150 transition-[opacity,scale,background-color] duration-300 ease-out hover:scale-105 hover:bg-white/90 active:scale-95 disabled:pointer-events-none disabled:opacity-0 dark:border-white/15 dark:bg-black/40 dark:text-white dark:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] dark:hover:bg-black/55 lg:flex ${
        direction === "prev" ? "left-4" : "right-4"
      }`}
      // Vertically centred on the cards, inside the room kept for their shadow
      style={{ top: "calc((100% - 40px) / 2)" }}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {direction === "prev" ? <path d="M19 12H5M11 6l-6 6 6 6" /> : <path d="M5 12h14M13 6l6 6-6 6" />}
      </svg>
    </button>
  );
}

/**
 * Featured photo cards scroll naturally by touch or trackpad, and can be
 * dragged with a mouse. Desktop arrows move a full set at a time.
 */
export default function SportsFeatured({ articles, focus }: { articles: ComponentArticle[]; focus: FeaturedFocus }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const { handlers, stopMomentum } = useMomentumScroll(viewportRef, { mouseDrag: true });
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const updateEdges = () => {
      const atStart = viewport.scrollLeft <= 1;
      const atEnd = viewport.scrollLeft >= viewport.scrollWidth - viewport.clientWidth - 1;
      setEdges((previous) => {
        if (previous.atStart === atStart && previous.atEnd === atEnd) return previous;
        return { atStart, atEnd };
      });
    };
    const observer = new ResizeObserver(updateEdges);
    observer.observe(viewport);
    viewport.addEventListener("scroll", updateEdges, { passive: true });
    updateEdges();
    return () => {
      observer.disconnect();
      viewport.removeEventListener("scroll", updateEdges);
    };
  }, [articles.length]);

  const move = (direction: 1 | -1) => {
    stopMomentum();
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const first = track?.firstElementChild;
    if (!viewport || !track || !first) return;
    const step = first.getBoundingClientRect().width + GAP;
    // Fractional widths and a pixel of rounding allowance keep desktop at four.
    const perSet = Math.max(1, Math.floor((track.getBoundingClientRect().width + GAP + 1) / step));
    viewport.scrollBy({
      left: direction * perSet * step,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  };

  return (
    <section aria-labelledby="sports-featured-heading" className="mt-6">
      <SportsHeading id="sports-featured-heading">More Headlines</SportsHeading>

      {/* Padding keeps card lift and shadows visible. The arrows stay outside
          the scrolling viewport so they remain fixed over the row. */}
      <div className="relative -mt-2 -mb-12">
        <div
          ref={viewportRef}
          className="overflow-x-auto overflow-y-hidden pt-2 pb-12 touch-pan-y touch-pinch-zoom [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:cursor-grab lg:select-none lg:active:cursor-grabbing lg:[&_a]:cursor-inherit"
          {...handlers}
        >
          <div ref={trackRef} className="flex" style={{ gap: GAP }}>
            {articles.map((article, i) => (
              <div key={article.id} data-slide={i} className={`shrink-0 ${CAROUSEL_WIDTH}`}>
                <StoryCard article={article} position={cardPosition(article, focus)} className="w-full" />
              </div>
            ))}
            <EndCard slide={articles.length} />
          </div>
        </div>
        <ArrowButton direction="prev" hidden={edges.atStart} onClick={() => move(-1)} />
        <ArrowButton direction="next" hidden={edges.atEnd} onClick={() => move(1)} />
      </div>
    </section>
  );
}
