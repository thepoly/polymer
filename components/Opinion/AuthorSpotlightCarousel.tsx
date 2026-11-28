"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import TransitionLink from "@/components/TransitionLink";
import { BYLINE_META_CLASS } from "@/components/FrontPage/Byline";
import {
  SPOTLIGHT_EASE,
  SPOTLIGHT_HEIGHT,
  SpotlightAvatar,
  useReducedMotion,
  type SpotlightAuthor,
} from "./spotlight";
import "./author-spotlight.css";

export type { SpotlightAuthor } from "./spotlight";

/** How long each author stays before the next (also the ring's length) */
const DWELL_MS = 5000;
const STRIP_HEIGHT = 40;
const SLIDES_HEIGHT = SPOTLIGHT_HEIGHT - STRIP_HEIGHT;
/** One slide's trip across the full width (a short crossfade instead for reduced motion) */
const SLIDE_MS = 600;
const FADE_MS = 200;
const SWIPE_MIN_PX = 40;
/** A two-finger trackpad swipe ends (momentum included) once its wheel events stop for this long */
const WHEEL_IDLE_MS = 200;
/**
 * A new swipe can start before the last one's momentum has died away, so the
 * events never stop. It shows as the movement picking up again once it had
 * begun to slow (by WHEEL_RISE and to at least WHEEL_RISE_MIN px an event),
 * or turning round; WHEEL_MIN_GAP_MS keeps one swipe from counting twice.
 */
const WHEEL_RISE = 1.5;
const WHEEL_RISE_MIN = 6;
const WHEEL_MIN_GAP_MS = 250;

/**
 * The latest piece from each of the section's columnists, one at a time. The
 * headline leads, set like the Opinion cards' headlines; the author follows as
 * a byline with a small headshot. A strip of the authors' faces underneath is
 * the page indicator and the way to jump between them.
 *
 * Rotates every five seconds unless the reader prefers reduced motion;
 * hovering or focusing inside stops it, and the current face's ring resumes
 * where it stopped. There is no pause button, on purpose. Swipe (a finger, or
 * two on a trackpad while hovering), ←/→ and the faces change author by hand. Each change is a full slide: the piece on show
 * leaves across the whole width as the next comes in from the side the reader
 * moved toward.
 */
export default function AuthorSpotlightCarousel({
  authors,
  pinnedAuthors,
}: {
  authors: SpotlightAuthor[];
  pinnedAuthors?: SpotlightAuthor[];
}) {
  const displayAuthors = pinnedAuthors && pinnedAuthors.length > 0 ? pinnedAuthors : authors;
  const count = displayAuthors.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // Screen readers hear a change the reader made, not the rotation
  const [announce, setAnnounce] = useState(false);
  const reducedMotion = useReducedMotion();
  const safeIndex = count === 0 ? 0 : Math.min(activeIndex, count - 1);
  const rotating = !reducedMotion && count > 1;
  const paused = !rotating || hovered || focused;

  // Time already spent on the current author, carried across pauses
  const progress = useRef({ index: -1, elapsed: 0 });
  const swipe = useRef<{ x: number; y: number; swiped: boolean } | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  // The author on screen before this render, and which way the next one comes from
  const shownIndex = useRef(0);
  const direction = useRef<1 | -1>(1);

  // The slide itself, run with the Web Animations API once React has swapped
  // which slide is active: the new one travels in from `direction`'s side as
  // the old one leaves by the other. Only these two move; a change mid-slide
  // cancels the one in flight and starts from the current pair.
  useLayoutEffect(() => {
    const from = shownIndex.current;
    shownIndex.current = safeIndex;
    if (from === safeIndex) return;
    const incoming = slideRefs.current[safeIndex];
    const outgoing = slideRefs.current[from];
    if (!incoming || !outgoing || typeof incoming.animate !== "function") return;
    for (const slide of slideRefs.current) slide?.getAnimations().forEach((animation) => animation.cancel());
    if (reducedMotion) {
      const fade = { duration: FADE_MS, easing: "ease-out" };
      incoming.animate([{ opacity: 0 }, { opacity: 1 }], fade);
      outgoing.animate([{ opacity: 1, visibility: "visible" }, { opacity: 0, visibility: "visible" }], fade);
      return;
    }
    const slide = { duration: SLIDE_MS, easing: SPOTLIGHT_EASE };
    const side = direction.current;
    incoming.animate([{ transform: `translateX(${side * 100}%)` }, { transform: "translateX(0)" }], slide);
    // Kept visible for the trip; its own style hides it once the animation ends
    outgoing.animate(
      [{ transform: "translateX(0)", visibility: "visible" }, { transform: `translateX(${-side * 100}%)`, visibility: "visible" }],
      slide,
    );
  }, [safeIndex, reducedMotion]);

  useEffect(() => {
    if (paused) return;
    const base = progress.current.index === safeIndex ? progress.current.elapsed : 0;
    const startedAt = performance.now();
    const timer = setTimeout(() => {
      direction.current = 1;
      setAnnounce(false);
      setActiveIndex((safeIndex + 1) % count);
    }, Math.max(0, DWELL_MS - base));
    return () => {
      clearTimeout(timer);
      progress.current = { index: safeIndex, elapsed: base + performance.now() - startedAt };
    };
  }, [paused, safeIndex, count]);

  /** One author on by hand, from `side` (1: the next, in from the right) */
  const step = useCallback((side: 1 | -1) => {
    if (count < 2) return;
    direction.current = side;
    progress.current = { index: -1, elapsed: 0 };
    setAnnounce(true);
    setActiveIndex((index) => (((Math.min(index, count - 1) + side) % count) + count) % count);
  }, [count]);

  // A two-finger trackpad swipe sideways while hovering: horizontal wheel
  // events. Their movement adds up until SWIPE_MIN_PX, then the author changes
  // once; the rest of that swipe (its momentum too) is ignored until either
  // the events stop for WHEEL_IDLE_MS or a new swipe starts on top of the
  // momentum (see WHEEL_RISE). Mostly vertical movement still scrolls the
  // page. A native, non-passive listener, so a sideways swipe can be claimed
  // here instead of going back a page in the browser's history.
  const regionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const region = regionRef.current;
    if (!region || count < 2) return;
    let travel = 0;
    let used = false;
    // Since the step: which way it went, the last event's size, and whether
    // the movement has started to slow (momentum) yet
    let usedSide = 0;
    let last = 0;
    let slowing = false;
    let steppedAt = 0;
    let idle: ReturnType<typeof setTimeout> | undefined;
    const reset = () => { travel = 0; used = false; usedSide = 0; last = 0; slowing = false; };
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      clearTimeout(idle);
      idle = setTimeout(reset, WHEEL_IDLE_MS);
      const size = Math.abs(event.deltaX);
      const side = event.deltaX > 0 ? 1 : -1;
      if (used) {
        const settled = performance.now() - steppedAt >= WHEEL_MIN_GAP_MS;
        const picksUp = slowing && size >= WHEEL_RISE_MIN && size > last * WHEEL_RISE;
        const turns = side !== usedSide && size >= WHEEL_RISE_MIN;
        if (settled && (picksUp || turns)) reset();
        else {
          if (size < last) slowing = true;
          last = size;
          return;
        }
      }
      travel += event.deltaX;
      last = size;
      if (Math.abs(travel) >= SWIPE_MIN_PX) {
        used = true;
        usedSide = travel > 0 ? 1 : -1;
        slowing = false;
        steppedAt = performance.now();
        step(usedSide as 1 | -1);
      }
    };
    region.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      region.removeEventListener("wheel", onWheel);
      clearTimeout(idle);
    };
  }, [count, step]);

  if (count === 0) return null;

  const active = displayAuthors[safeIndex];
  /** `side`: where the new author comes in from (1 = the right) */
  const goTo = (index: number, side: 1 | -1) => {
    direction.current = side;
    progress.current = { index: -1, elapsed: 0 };
    setAnnounce(true);
    setActiveIndex(((index % count) + count) % count);
  };

  return (
    <div
      ref={regionRef}
      className="relative my-4 border-y border-rule py-4"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}
      onKeyDown={(event) => {
        if (count < 2) return;
        if (event.key === "ArrowRight") { event.preventDefault(); goTo(safeIndex + 1, 1); }
        if (event.key === "ArrowLeft") { event.preventDefault(); goTo(safeIndex - 1, -1); }
      }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Opinion author spotlight"
    >
      {/* Computers: a fixed height (SLIDES_HEIGHT), so BalanceColumns can
          square off column 2. Phones: the slides share one grid cell, so the
          carousel is as tall as its tallest author's slide and no taller (no
          empty band round a short headline), and still doesn't jump between
          authors. */}
      <div
        className="relative grid overflow-hidden md:block md:h-[var(--slides-h)]"
        style={{ "--slides-h": `${SLIDES_HEIGHT}px`, touchAction: "pan-y" } as React.CSSProperties}
        onPointerDown={(event) => { swipe.current = { x: event.clientX, y: event.clientY, swiped: false }; }}
        onPointerUp={(event) => {
          const start = swipe.current;
          if (!start || count < 2) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
            start.swiped = true;
            goTo(safeIndex + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
          }
        }}
        // A swipe that ends on the link mustn't open the story
        onClickCapture={(event) => {
          if (swipe.current?.swiped) { event.preventDefault(); event.stopPropagation(); }
          swipe.current = null;
        }}
        onDragStart={(event) => event.preventDefault()}
      >
        {/* Every slide stays mounted, so the next headshot is already loaded */}
        {displayAuthors.map((author, i) => {
          const isActive = i === safeIndex;
          return (
            <div
              key={author.id}
              ref={(element) => { slideRefs.current[i] = element; }}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={!isActive}
              className="[grid-area:1/1] md:absolute md:inset-0"
              // Only the shown author is visible (and in the accessibility
              // tree); the slide animation shows the leaving one on its way out
              style={{ visibility: isActive ? "visible" : "hidden" }}
            >
              <TransitionLink
                href={author.latestArticle.url}
                tabIndex={isActive ? undefined : -1}
                className="group flex h-full flex-col items-center justify-center px-4 text-center"
              >
                {/* The columnist on top: their headshot, then name and major on
                    one line (a major typed out in full, where the field asks
                    for "ECSE '28", ends in an ellipsis rather than wrapping) */}
                <SpotlightAvatar name={author.name} headshot={author.headshot} focus={author.headshotFocus} size={60} />
                <span className={`mt-1.5 block max-w-full truncate font-meta text-[15px] font-normal leading-snug tracking-[0.01em] ${BYLINE_META_CLASS}`}>
                  <span className="font-semibold text-text-main">{author.name}</span>
                  {author.detail && <> · {author.detail}</>}
                </span>
                {/* Then their latest piece, still the largest type here: set as
                    the Opinion cards' headlines are, up to three lines (60 + 6 +
                    21 + 6 + 94 = 187px of the slide's 200) */}
                <span className="mt-1.5 line-clamp-3 text-balance font-copy text-[25px] font-medium leading-[1.12] text-text-main transition-colors group-hover:text-accent sm:text-[28px]">
                  {author.latestArticle.richTitle || author.latestArticle.title}
                </span>
              </TransitionLink>
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <div className="flex items-center justify-center" style={{ height: STRIP_HEIGHT }}>
          <FaceStrip
            authors={displayAuthors}
            activeIndex={safeIndex}
            rotating={rotating}
            paused={paused}
            onSelect={(i) => { if (i !== safeIndex) goTo(i, i > safeIndex ? 1 : -1); }}
          />
        </div>
      )}

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announce ? `${active.name}, ${safeIndex + 1} of ${count}` : ""}
      </p>
    </div>
  );
}

/** Room the face strip has, and the most a face may take of it */
const STRIP_WIDTH = 320;
const FACE_TARGET_MAX = 40;
const FACE_MAX = 28;

/**
 * The authors themselves as the page indicator: a small headshot each, all in
 * full colour (the others aren't dimmed or greyed, 2026-11-28). The current
 * one carries a ring that fills over its
 * five seconds (whole when nothing rotates). Faces shrink to fit when eleven
 * or more share the row.
 */
function FaceStrip({
  authors,
  activeIndex,
  rotating,
  paused,
  onSelect,
}: {
  authors: SpotlightAuthor[];
  activeIndex: number;
  rotating: boolean;
  paused: boolean;
  onSelect: (index: number) => void;
}) {
  const target = Math.min(FACE_TARGET_MAX, Math.floor(STRIP_WIDTH / authors.length));
  const face = Math.min(FACE_MAX, target - 10);
  const ring = face + 8;
  return (
    <div className="flex items-center" role="group" aria-label="Choose an author">
      {authors.map((author, i) => {
        const isActive = i === activeIndex;
        return (
          <button
            key={author.id}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`Show ${author.name}`}
            aria-current={isActive ? "true" : undefined}
            className="group/face relative flex h-10 items-center justify-center outline-none"
            style={{ width: target }}
          >
            <span className="relative block rounded-full group-focus-visible/face:ring-2 group-focus-visible/face:ring-accent">
              <SpotlightAvatar name={author.name} headshot={author.headshot} focus={author.headshotFocus} size={face} />
              {isActive && (
                <svg
                  aria-hidden="true"
                  className="pointer-events-none absolute text-text-main"
                  style={{ left: -4, top: -4, width: ring, height: ring }}
                  viewBox="0 0 36 36"
                >
                  <circle cx="18" cy="18" r="17" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1.5" />
                  <circle
                    key={`ring-${activeIndex}`}
                    cx="18"
                    cy="18"
                    r="17"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    pathLength={100}
                    strokeDasharray="100"
                    transform="rotate(-90 18 18)"
                    className={rotating ? "spotlight-ring" : undefined}
                    style={rotating ? { animationDuration: `${DWELL_MS}ms`, animationPlayState: paused ? "paused" : "running" } : { strokeDashoffset: 0 }}
                  />
                </svg>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
