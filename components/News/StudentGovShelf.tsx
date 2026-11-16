"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
// Not re-exported from "next/navigation"; it's the type router.prefetch takes
import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import TransitionLink from "@/components/TransitionLink";
import type { StudentGovBody } from "./studentGov";
import { POLY_P } from "./polyP";
import type { SpineDetails } from "./shelfDetails";
import { scrollByWheel, streamWheel, wheelDeltaY } from "./wheelScroll";

/** One term on the shelf, with what the headline above it says */
export type ShelfVolume = {
  /** Term slug ("senate-56") */
  key: string;
  /** Vertical text: "56th Senate" / "2025–26" */
  spineText: string;
  /** Foot of the spine, one entry per line: ["25–26"] / ["PU 136"] / ["PU 134", "PU 135"] / ["2 PUs"] / [] */
  foot: string[];
  /** The headline: "56th Student Senate" / "2025–26 Executive Board" */
  title: string;
  /** For screen readers: "56th Student Senate, 2025–26" */
  ariaName: string;
  /** "2025–26" */
  year: string;
  /** "Grand Marshal …" / "President of the Union …", or null when no leader is entered */
  leader: string | null;
  /** The term's timeline page */
  href: string;
  /** In session */
  isCurrent: boolean;
  /** The term on this page */
  isViewed: boolean;
  /** Spine size (px), from how many articles the term has */
  height: number;
  width: number;
  /** Spine colour ("#9cb59a") */
  color: string;
  /** Lettering colour when it's tinted; null for plain near-black or near-white to suit the spine */
  ink: string | null;
  /** Hand-picked wear and binding details (most books have none) */
  details: SpineDetails;
};

/** "2022–23 · Grand Marshal …" */
function metaLine(v: ShelfVolume): string {
  return [v.year, v.leader].filter(Boolean).join(" · ");
}

/** How long the pointer rests on a book before the headline turns to it */
const HOVER_REST_MS = 120;
/** Room kept beside a book the arrow keys scroll into view */
const REVEAL_MARGIN_PX = 8;

// A book rises with the slightest spring and settles back without one
const RISE = "duration-[420ms] ease-[cubic-bezier(0.34,1.3,0.64,1)]";
const FALL = "duration-[280ms] ease-out";

/** A soft sheen: lighter at the head, a touch darker at the foot. One gradient, no image */
const SHEEN =
  "linear-gradient(to bottom, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 32%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.06) 100%)";

// The books' details (see shelfDetails.ts). Flat colour and hard 1px edges,
// nothing that glows or blurs.
/** A faint cloth weave: hairlines a few pixels apart, both ways */
const CLOTH =
  "repeating-linear-gradient(0deg, rgba(0,0,0,0.022) 0 1px, transparent 1px 2px), repeating-linear-gradient(90deg, rgba(0,0,0,0.022) 0 1px, transparent 1px 2px)";
/** The head of the spine bleached a little warmer and paler, with a soft edge */
const SUN_FADE =
  "linear-gradient(to bottom, rgba(255,244,232,0.28) 0%, rgba(255,244,232,0.2) 9%, rgba(255,244,232,0) 24%)";
/** Headband stitches: red and cream, fine enough to read as one band */
const HEADBAND = "repeating-linear-gradient(90deg, #9e0b26 0 1px, #efe4cf 1px 2px)";
/** The cloth boards showing past a short dust jacket: linen under a dark jacket, oxblood under a light one */
const boardFor = (luma: number) => (luma > 0.6 ? "#6e0f22" : "#e9e0d0");
/** A leaning book's tilt */
const LEAN_DEG = 1.5;

/** A pair of raised bands: a ridge, lit from above, catches light and casts a line */
function RaisedBands() {
  return (
    <span aria-hidden="true" className="flex w-full flex-none flex-col gap-[4px]">
      {[0, 1].map((n) => (
        <span
          key={n}
          className="h-[3px] w-full border-y border-t-white/30 border-b-black/20 bg-black/[0.05]"
        />
      ))}
    </span>
  );
}

// The charm's swing: a damped pendulum, about 1.4 swings a second, that
// settles within about a second and a half. Kept slight: a brisk swipe
// tips it a few degrees, never more than SWING_MAX.
const SWING_OMEGA = 2 * Math.PI * 1.4; // rad/s
const SWING_DAMPING = 0.22; // fraction of critical damping
const SWING_KICK = 0.9; // deg/s of swing per px the shelf moves
const SWING_MAX = 12; // deg

/**
 * The Poly P as a charm hanging on the spine of the term on the page: a
 * pin near the top of the spine, a short cord, a ring and the P, in front of
 * the spine above its title. When the shelf slides, the charm lags behind
 * like anything hanging would, then swings back and settles. Red on light
 * spines, near-white on red ones. Still for reduced motion.
 *
 * The swing runs outside React: each frame sets the hanging group's
 * transform directly, and the loop stops once it's at rest.
 */
function PolyCharm({ rowRef, color }: { rowRef: React.RefObject<HTMLDivElement | null>; color: string }) {
  const swingRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const row = rowRef.current;
    const swing = swingRef.current;
    if (!row || !swing || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let angle = 0; // deg; positive = clockwise
    let velocity = 0; // deg/s
    let lastX = row.scrollLeft;
    let lastT = 0;
    let frame = 0;

    const step = (t: number) => {
      const dt = lastT ? Math.min(0.032, (t - lastT) / 1000) : 1 / 60;
      lastT = t;
      const accel = -SWING_OMEGA * SWING_OMEGA * angle - 2 * SWING_DAMPING * SWING_OMEGA * velocity;
      velocity += accel * dt;
      angle = Math.max(-SWING_MAX, Math.min(SWING_MAX, angle + velocity * dt));
      if (Math.abs(angle) < 0.05 && Math.abs(velocity) < 0.5) {
        angle = 0;
        velocity = 0;
        swing.style.transform = "";
        frame = 0;
        lastT = 0;
        return;
      }
      swing.style.transform = `rotate(${angle.toFixed(2)}deg)`;
      frame = requestAnimationFrame(step);
    };

    // The shelf scrolling right moves the books left: the charm's foot lags
    // to the right, which is an anticlockwise (negative) swing
    const onScroll = () => {
      const x = row.scrollLeft;
      velocity -= (x - lastX) * SWING_KICK;
      lastX = x;
      if (!frame) frame = requestAnimationFrame(step);
    };
    row.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      row.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [rowRef]);

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 22 40"
      className="pointer-events-none absolute top-[5px] left-1/2 w-[22px] -translate-x-1/2 overflow-visible"
    >
      {/* A soft shadow under the hanging cord and P only; the pin sits flat on
          the spine. One charm per page, so a fixed id is safe. */}
      <defs>
        <filter id="poly-charm-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.5" floodColor="#000" floodOpacity="0.28" />
        </filter>
      </defs>
      {/* Hangs from the pin at (11, 3) */}
      <g filter="url(#poly-charm-shadow)">
        <g ref={swingRef} style={{ transformBox: "view-box", transformOrigin: "11px 3px" }}>
          <path d="M11 3V11.6" stroke={color} strokeWidth="1" strokeLinecap="round" fill="none" />
          <circle cx="11" cy="13.1" r="1.5" stroke={color} strokeWidth="0.9" fill="none" />
          {/* The P, 14px wide, hung by the middle of its top */}
          <svg x="4.2" y="14.4" width="14" height="19.8" viewBox="0 0 80 113" fill={color}>
            <path d={POLY_P} />
          </svg>
        </g>
      </g>
      {/* The pin, in the charm's own colour so pin, cord and P read as one
          piece, with a faint rim and glint */}
      <circle cx="11" cy="3" r="2.1" fill={color} stroke="rgba(0,0,0,0.18)" strokeWidth="0.5" />
      <circle cx="10.3" cy="2.3" r="0.6" fill="rgba(255,255,255,0.55)" />
    </svg>
  );
}

/** How light a "#rrggbb" colour looks, 0 (black) to 1 (white) */
function lumaOf(hex: string): number {
  const n = parseInt(hex.replace("#", ""), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

/** Near-black lettering on light spines, near-white on dark ones */
function inkFor(hex: string): string {
  return lumaOf(hex) > 0.6 ? "#1c1a1a" : "#fbf7f4";
}

/**
 * "From the stacks": one book spine per covered term of one body, newest on
 * the left, standing on a shelf, under a header about the book in view.
 * Normally that's the term on the page (marked by the Poly P hanging on its spine): "57th Student
 * Senate / 2026–27 · Grand Marshal … (160th)"; previewing another term shows
 * the same for that one.
 *
 * Every book is a link to its term. With a mouse, resting on a book lifts it
 * off the shelf and previews it; a click opens it; leaving the shelf goes back
 * to the term on the page. On touch, the first tap previews and the second
 * opens. The arrow keys move along the shelf and Enter opens; tabbing out goes
 * back to the term on the page. The book on the page scrolls its stream back
 * to the top.
 */
export default function StudentGovShelf({
  body,
  volumes,
  tail,
}: {
  body: StudentGovBody;
  volumes: ShelfVolume[];
  /** "… earlier Senates in the print archive" */
  tail: string;
}) {
  const viewedIndex = Math.max(0, volumes.findIndex((v) => v.isViewed));
  // The book the headline is about
  const [picked, setPicked] = useState(viewedIndex);
  // The book lifted off the shelf: the picked one, until the mouse moves onto
  // another book (the headline only follows once the mouse rests there)
  const [raised, setRaised] = useState<number | null>(viewedIndex);
  const pick = (i: number) => {
    setPicked(i);
    setRaised(i);
  };
  // The book being opened: it comes right off the shelf while the next page loads
  const [opening, setOpening] = useState<number | null>(null);
  const books = useRef<(HTMLElement | null)[]>([]);
  const rowRef = useRef<HTMLDivElement>(null);
  const restTimer = useRef(0);

  // Fifteen years of books don't fit the stream column: start with the term
  // on the page in view (the newest term needs no scrolling, so its shelf
  // starts at the photo panel) without moving the page
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const book = books.current[viewedIndex];
    if (book) row.scrollLeft = book.offsetLeft - row.clientWidth / 2 + book.offsetWidth / 2;

    // A vertical swipe over the shelf must never slide it. Trackpad swipes
    // drift a little sideways, and when the stream has nothing left to
    // scroll the browser hands the whole gesture to this row. So every
    // mostly-vertical wheel event is cancelled here (a browser only lets a
    // gesture be cancelled from its first event, hence every one) and its
    // scroll passed on, as the stream frame does it: down scrolls the stream,
    // then the page towards the footer once the stream is at its end; up
    // brings the page back first. Clearly sideways swipes, and shift + wheel,
    // still slide the shelf.
    const desktop = window.matchMedia("(min-width: 860px)");
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.5) return;
      e.preventDefault();
      const dy = wheelDeltaY(e);
      const scroller = row.closest<HTMLElement>("[data-timeline-scroller]");
      if (!desktop.matches || !scroller) {
        scrollByWheel(window, dy);
        return;
      }
      // The swipe that ran the stream down to its end stops there; the next
      // one carries on to the page
      const { atEnd, hold } = streamWheel(scroller, dy, e.timeStamp);
      if (hold) return;
      scrollByWheel((dy < 0 && window.scrollY > 0) || (dy > 0 && atEnd) ? window : scroller, dy);
    };
    row.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      row.removeEventListener("wheel", onWheel);
      window.clearTimeout(restTimer.current);
    };
  }, [viewedIndex]);

  /** Scroll the row just enough that book `i` is fully in view */
  const reveal = (i: number) => {
    const row = rowRef.current;
    const book = books.current[i];
    if (!row || !book) return;
    const left = book.offsetLeft - parseFloat(getComputedStyle(row).paddingLeft);
    const right = book.offsetLeft + book.offsetWidth + REVEAL_MARGIN_PX - row.clientWidth;
    const to = row.scrollLeft > left ? left : row.scrollLeft < right ? right : null;
    if (to === null) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollTo({ left: to, behavior: reduce ? "auto" : "smooth" });
  };

  // Arrow keys move along the shelf (left = newer), Home/End jump to the ends
  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const to =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? Math.min(volumes.length - 1, i + 1)
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? Math.max(0, i - 1)
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? volumes.length - 1
              : null;
    if (to === null) return;
    e.preventDefault();
    pick(to);
    books.current[to]?.focus({ preventScroll: true });
    reveal(to);
  };

  // Term pages render on the server on every visit (the site layout reads
  // cookies), which takes a moment. So a term starts loading in full as soon
  // as its book is pointed at, focused or tapped once: by the click, it's
  // usually ready and the stream changes at once. A plain hover prefetch
  // would only fetch the layout of a dynamic page, not the page itself.
  const router = useRouter();
  const preloaded = useRef(new Set<string>());
  const preload = (i: number) => {
    const v = volumes[i];
    if (!v || v.isViewed || preloaded.current.has(v.href)) return;
    preloaded.current.add(v.href);
    try {
      router.prefetch(v.href, { kind: PrefetchKind.FULL });
    } catch {
      // A failed prefetch only means the click loads it instead
    }
  };

  // The book under the mouse: nudged up at once, and picked once the mouse
  // rests on it, so sweeping across the shelf doesn't flicker the headline.
  // Tracked here rather than with CSS :hover, which browsers don't update
  // while the books scroll under a still cursor (only once the scroll
  // settles), so a book would stay up after the cursor had left it.
  const [hovered, setHovered] = useState<number | null>(null);
  const hoveredRef = useRef<number | null>(null);
  // Last mouse position over the shelf, for working out what's under it mid-scroll
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const hoverBook = (i: number | null) => {
    if (hoveredRef.current === i) return;
    hoveredRef.current = i;
    setHovered(i);
    window.clearTimeout(restTimer.current);
    if (i === null) return;
    // On to another book: the one lifted before goes back down at once
    if (i !== raised) setRaised(null);
    preload(i);
    restTimer.current = window.setTimeout(() => pick(i), HOVER_REST_MS);
  };
  const onPointerEnter = (e: React.PointerEvent, i: number) => {
    if (e.pointerType !== "mouse") return;
    pointer.current = { x: e.clientX, y: e.clientY };
    hoverBook(i);
  };
  const onPointerLeave = (e: React.PointerEvent, i: number) => {
    if (e.pointerType === "mouse" && hoveredRef.current === i) hoverBook(null);
  };

  // While anything scrolls (the shelf sideways, the stream, the page), check
  // which book is now under the still cursor, once a frame
  const hoverBookRef = useRef(hoverBook);
  useEffect(() => {
    hoverBookRef.current = hoverBook;
  });
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const scroller = row.closest<HTMLElement>("[data-timeline-scroller]");
    let frame = 0;
    const check = () => {
      frame = 0;
      const p = pointer.current;
      if (!p) return;
      const book = document.elementFromPoint(p.x, p.y)?.closest<HTMLElement>("[data-book]");
      hoverBookRef.current(book && row.contains(book) ? Number(book.dataset.book) : null);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    const targets: (HTMLElement | Window)[] = [row, window, ...(scroller ? [scroller] : [])];
    targets.forEach((t) => t.addEventListener("scroll", onScroll, { passive: true }));
    return () => {
      cancelAnimationFrame(frame);
      targets.forEach((t) => t.removeEventListener("scroll", onScroll));
    };
  }, []);

  // Keyboard focus picks the book. Focus from a tap or click doesn't: on
  // touch, picking is the first tap's job and opening the second's.
  const onFocus = (e: React.FocusEvent<HTMLElement>, i: number) => {
    if (!e.currentTarget.matches(":focus-visible")) return;
    pick(i);
    preload(i);
  };

  /** Touch (no hover): a tap on a book not yet picked only picks it */
  const firstTap = (i: number) => i !== picked && !window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const onOpen = (e: React.MouseEvent, i: number) => {
    // A new tab or window: leave this shelf as it is
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    window.clearTimeout(restTimer.current);
    if (firstTap(i)) {
      e.preventDefault();
      pick(i);
      reveal(i);
      preload(i);
      return;
    }
    pick(i);
    setOpening(i);
  };

  // Done browsing (the mouse leaves the shelf, or focus leaves it): back to
  // the term on the page, unless a book is already being opened
  const endPreview = () => {
    window.clearTimeout(restTimer.current);
    if (opening === null) pick(viewedIndex);
  };
  const onSectionPointerLeave = (e: React.PointerEvent) => {
    // Touch fires pointerleave as each tap ends: a tapped preview stays
    if (e.pointerType !== "mouse") return;
    pointer.current = null;
    hoverBook(null);
    endPreview();
  };
  const onSectionPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") pointer.current = { x: e.clientX, y: e.clientY };
  };
  const onSectionBlur = (e: React.FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) endPreview();
  };

  // The book on the page: back to the top of its stream
  const onViewed = (i: number) => {
    window.clearTimeout(restTimer.current);
    const wasPicked = i === picked;
    pick(i);
    if (firstTap(i) && !wasPicked) return;
    const scroller = rowRef.current?.closest<HTMLElement>("[data-timeline-scroller]");
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    if (scroller && scroller.scrollHeight > scroller.clientHeight + 1) scroller.scrollTo({ top: 0, behavior });
    else window.scrollTo({ top: 0, behavior });
  };

  return (
    <section
      aria-label={body === "senate" ? "Every Student Senate, by term" : "Every Executive Board, by year"}
      // No bottom padding: the shelf is the last thing in the stream
      className="bg-white px-5 pt-10 dark:bg-bg-main sm:px-8 sm:pt-12"
      onPointerLeave={onSectionPointerLeave}
      onPointerMove={onSectionPointerMove}
      onBlur={onSectionBlur}
    >
      <div className="flex flex-col gap-4">
        <p className="-mb-1.5 font-meta text-[12px] font-bold uppercase tracking-[0.16em] text-accent">From the stacks</p>
        {/* Every book's header in one grid cell, only the picked one shown:
            the block is as tall as the tallest, so the books never move as
            the header changes, and the change can crossfade, sliding the way
            the shelf was browsed */}
        <div className="grid">
          {volumes.map((v, i) => {
            const shown = i === picked;
            const meta = metaLine(v);
            return (
              <div
                key={v.key}
                inert={!shown}
                className={`flex flex-col gap-2.5 transition-[opacity,translate] duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] [grid-area:1/1] motion-reduce:transition-none ${
                  shown ? "translate-x-0 opacity-100" : `pointer-events-none opacity-0 ${i < picked ? "-translate-x-3" : "translate-x-3"}`
                }`}
              >
                <h2 className="flex flex-wrap items-center gap-x-3 gap-y-2 font-copy text-[clamp(28px,5vw,40px)] font-semibold leading-[1.1] text-text-main">
                  <span>{v.title}</span>
                  {v.isCurrent && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent px-2.5 py-1 font-meta text-[10px] font-bold uppercase leading-none tracking-[0.14em] text-accent">
                      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
                      In session
                    </span>
                  )}
                </h2>
                <p className="font-meta text-[13px] leading-[1.5] text-text-muted">{meta}</p>
              </div>
            );
          })}
        </div>

        <div>
          <div>
            <div
              ref={rowRef}
              data-shelf-row
              role="group"
              aria-label={body === "senate" ? "Student Senates by term" : "Executive Boards by year"}
              // Scrolls sideways (trackpad, swipe, shift + wheel, arrow keys)
              // with no scrollbar; books settle into place at the left edge
              // when it stops. It runs past the section's padding: on phones
              // edge to edge, on desktop from the photo panel (the first book
              // stands 2px off it, like the gap between books) to the stream
              // column's right edge, beyond its padding (40px below lg, 24px
              // from lg). Room above for a lifted book.
              // Each width range has its own classes, none overlapping:
              // Tailwind emits min-[860px] rules before sm ones, so an sm
              // padding would otherwise win over the desktop one.
              className="relative flex snap-x snap-proximity items-end gap-[2px] overflow-x-auto overscroll-x-contain pt-9 [scrollbar-width:none] max-sm:-mx-5 max-sm:scroll-pl-5 max-sm:px-5 sm:max-[859px]:-mx-8 sm:max-[859px]:scroll-pl-8 sm:max-[859px]:px-8 min-[860px]:-ml-8 min-[860px]:scroll-pl-0.5 min-[860px]:pl-0.5 min-[860px]:max-lg:-mr-[72px] lg:-mr-14 [&::-webkit-scrollbar]:hidden"
            >
              {volumes.map((v, i) => {
                // Lifted: raised (picked, and the mouse hasn't moved on to
                // another book) and not the term on the page, which is
                // marked by the P hanging on its spine instead
                const lifted = i === raised && !v.isViewed;
                const isOpening = i === opening;
                const label = `${v.ariaName}${v.isCurrent ? ", in session" : ""}`;
                const d = v.details;
                // A leaning book stands far enough off the one before it that
                // its head just rests against that one: at its own top, or at
                // the other's if that's shorter
                const prev = volumes[i - 1];
                const lean =
                  d.lean && prev
                    ? {
                        marginLeft: Math.max(
                          0,
                          Math.round(Math.min(v.height, prev.height) * Math.tan((LEAN_DEG * Math.PI) / 180) - 2),
                        ),
                        transform: `rotate(-${LEAN_DEG}deg)`,
                        transformOrigin: "left bottom",
                      }
                    : null;
                const common = {
                  ref: (el: HTMLElement | null) => {
                    books.current[i] = el;
                  },
                  tabIndex: i === picked ? 0 : -1,
                  onKeyDown: (e: React.KeyboardEvent) => onKeyDown(e, i),
                  "data-book": i,
                  onPointerEnter: (e: React.PointerEvent) => onPointerEnter(e, i),
                  onPointerLeave: (e: React.PointerEvent) => onPointerLeave(e, i),
                  onFocus: (e: React.FocusEvent<HTMLElement>) => onFocus(e, i),
                  // The hit area stays put and only the book inside it moves,
                  // so a book rising from under the cursor doesn't drop back
                  className: `group relative flex-none snap-start cursor-pointer outline-none ${lifted || isOpening ? "z-[2]" : "z-[1]"}`,
                  style: { height: v.height, width: v.width, ...lean },
                };
                // Flat cloth in the term's colour; the title reads top to
                // bottom, as on an English-language spine, with the foot in
                // small capitals beneath it
                const ink = v.ink ?? inkFor(v.color);
                // A white or near-white book would vanish on the white page:
                // give it a hairline edge
                const pale = lumaOf(v.color) > 0.88;
                const book = (
                  <span
                    className={`absolute inset-0 flex flex-col items-center rounded-[4px] pt-4 pb-2.5 transition-transform group-focus-visible:outline-[3px] group-focus-visible:outline-offset-[3px] group-focus-visible:outline-[#1c1a1a] motion-reduce:transition-none dark:group-focus-visible:outline-white ${
                      isOpening
                        ? `-translate-y-6 ${RISE}`
                        : lifted
                          ? `-translate-y-4 ${RISE}`
                          : `${hovered === i ? "-translate-y-1.5" : "translate-y-0"} ${FALL}`
                    }`}
                    style={{
                      backgroundColor: v.color,
                      // Top layer first
                      backgroundImage: [d.sunFaded && SUN_FADE, SHEEN, d.cloth && CLOTH].filter(Boolean).join(", "),
                      color: ink,
                      boxShadow: pale ? "inset 0 0 0 1px rgba(28,26,26,0.14)" : undefined,
                    }}
                  >
                    {/* Headband and short jacket, kept inside the spine's rounded corners */}
                    {(d.headband || d.shortJacket) && (
                      <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[4px]">
                        {d.headband && (
                          <span className="absolute inset-x-0 top-0 h-[2px]" style={{ backgroundImage: HEADBAND }} />
                        )}
                        {d.shortJacket && (
                          <>
                            <span
                              className="absolute inset-x-0 top-0 h-[2px]"
                              style={{ backgroundColor: boardFor(lumaOf(v.color)) }}
                            />
                            <span
                              className="absolute inset-x-0 bottom-0 h-[2px]"
                              style={{ backgroundColor: boardFor(lumaOf(v.color)) }}
                            />
                          </>
                        )}
                      </span>
                    )}
                    {/* A soft shadow under a lifted book: opacity only, so it stays cheap */}
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-0 -z-10 rounded-[4px] shadow-[0_14px_22px_rgba(28,26,26,0.22)] transition-opacity ${
                        lifted || isOpening ? `opacity-100 ${RISE}` : `opacity-0 ${FALL}`
                      }`}
                    />
                    {/* The Poly P hanging on the spine of the term on the
                        page, swinging when the shelf moves */}
                    {v.isViewed && <PolyCharm rowRef={rowRef} color={lumaOf(v.color) > 0.6 ? "#d6001c" : "#fbf7f4"} />}
                    {d.raisedBands && <RaisedBands />}
                    <span aria-hidden="true" className="flex min-h-0 flex-1 items-center">
                      <span
                        className={`whitespace-nowrap font-copy text-[15px] font-semibold leading-none [writing-mode:vertical-rl] ${
                          d.oldstyleFigures ? "[font-variant-numeric:oldstyle-nums]" : ""
                        }`}
                      >
                        {v.spineText}
                      </span>
                    </span>
                    {d.raisedBands && (
                      <span className="mt-2 w-full">
                        <RaisedBands />
                      </span>
                    )}
                    {/* One line each; a term with two PUs stacks them, outgoing first */}
                    <span
                      aria-hidden="true"
                      className="mt-2 flex min-h-[1em] flex-col items-center gap-px whitespace-nowrap font-meta text-[8.5px] font-bold uppercase tracking-[0.12em] opacity-75"
                    >
                      {v.foot.map((line) => (
                        <span key={line}>{line}</span>
                      ))}
                    </span>
                  </span>
                );
                return v.isViewed ? (
                  <button
                    key={v.key}
                    {...common}
                    type="button"
                    onClick={() => onViewed(i)}
                    aria-current="page"
                    aria-label={`${label}, the term on this page. Back to the top`}
                  >
                    {book}
                  </button>
                ) : (
                  <TransitionLink
                    key={v.key}
                    {...common}
                    href={v.href}
                    onClick={(e) => onOpen(e, i)}
                    aria-label={`Open the ${label}`}
                  >
                    {book}
                  </TransitionLink>
                );
              })}
              <span className="flex-none self-end whitespace-nowrap pr-3 pb-[18px] pl-5 font-copy text-[17px] italic text-text-muted">
                {tail}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
