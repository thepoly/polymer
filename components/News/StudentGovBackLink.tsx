"use client";

import React, { useRef } from "react";
import TransitionLink from "@/components/TransitionLink";
import { POLY_P } from "./polyP";

/** The book: one of the shelf's white spines, with RPI-red lettering and charm */
const PAPER = "#fbfaf7";
const RED = "#d6001c";

/** The shelf books' soft sheen, turned for a book lying on its side */
const SHEEN =
  "linear-gradient(to bottom, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 40%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.07) 100%)";

/**
 * "Back to the term in session", at the top of a past term's stream: a white
 * book from the shelf lying on its side, "TO 57TH SENATE" on its spine in red
 * (set like the term label beside it), with the Poly P charm in red pinned in
 * the middle of the spine's width and hanging over its face, as on the shelf.
 * The name is the term in session, worked out on each request, so it moves on
 * by itself when a new term starts. On hover the book lifts, the charm gives
 * a small swing and the ‹ nudges left. Still for reduced motion.
 */
export default function StudentGovBackLink({ href, name }: { href: string; name: string }) {
  const charmRef = useRef<SVGGElement>(null);

  // A small swing that dies away, played on the charm when the pointer
  // arrives. Web Animations, so it needs no stylesheet.
  const swing = () => {
    const charm = charmRef.current;
    if (!charm?.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    charm.animate(
      [
        { transform: "rotate(0deg)" },
        { transform: "rotate(12deg)" },
        { transform: "rotate(-8deg)" },
        { transform: "rotate(4deg)" },
        { transform: "rotate(-2deg)" },
        { transform: "rotate(0deg)" },
      ],
      { duration: 1300, easing: "ease-out" },
    );
  };

  return (
    <TransitionLink
      href={href}
      onPointerEnter={swing}
      onFocus={swing}
      aria-label={`Back to the ${name}`}
      className="group inline-flex items-center gap-2.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      <span
        aria-hidden="true"
        className="font-meta text-[18px] leading-none text-accent transition-transform duration-300 group-hover:-translate-x-1 motion-reduce:transition-none"
      >
        &lsaquo;
      </span>
      {/* The book, lying on its side, spine to the reader. A hairline edge,
          as on the shelf's white books, so it shows on the white page. */}
      <span
        aria-hidden="true"
        className="relative inline-flex h-[40px] items-center rounded-[3px] pr-[38px] pl-[18px] shadow-[inset_0_0_0_1px_rgba(28,26,26,0.14)] transition-transform duration-300 ease-[cubic-bezier(0.34,1.3,0.64,1)] group-hover:-translate-y-0.5 motion-reduce:transition-none"
        style={{ backgroundColor: PAPER, backgroundImage: SHEEN }}
      >
        {/* Hinge lines near each end, where the covers meet the spine */}
        <span className="absolute inset-y-0 left-[6px] w-px bg-black/10" />
        <span className="absolute inset-y-0 right-[6px] w-px bg-black/10" />
        {/* Set like the term label beside it ("49TH SENATE · 2018–19") */}
        <span
          className="font-meta text-[12px] leading-none font-bold tracking-[0.14em] whitespace-nowrap uppercase"
          style={{ color: RED }}
        >
          To {name}
        </span>
        {/* The charm, as on the shelf: pinned in the middle of the spine's
            width (here, halfway up the book lying on its side) and hanging
            over its face, all in red, pin included, with the same soft
            shadow under the cord and P (not the pin). At 14px wide the pin
            (11, 3 in the viewBox) is 1.9px down, so top 18px puts it at the
            book's middle (20px) and the P ends at its bottom edge (40px). */}
        <svg viewBox="0 0 22 40" className="absolute top-[18px] right-[14px] w-[14px] overflow-visible">
          <defs>
            <filter id="poly-backlink-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1" stdDeviation="0.5" floodColor="#000" floodOpacity="0.22" />
            </filter>
          </defs>
          <g filter="url(#poly-backlink-shadow)">
            <g ref={charmRef} style={{ transformBox: "view-box", transformOrigin: "11px 3px" }}>
              <path d="M11 3V11.6" stroke={RED} strokeWidth="1" strokeLinecap="round" fill="none" />
              <circle cx="11" cy="13.1" r="1.5" stroke={RED} strokeWidth="0.9" fill="none" />
              <svg x="4.2" y="14.4" width="14" height="19.8" viewBox="0 0 80 113" fill={RED}>
                <path d={POLY_P} />
              </svg>
            </g>
          </g>
          <circle cx="11" cy="3" r="2.1" fill={RED} stroke="rgba(0,0,0,0.18)" strokeWidth="0.5" />
          <circle cx="10.3" cy="2.3" r="0.6" fill="rgba(255,255,255,0.55)" />
        </svg>
      </span>
    </TransitionLink>
  );
}
