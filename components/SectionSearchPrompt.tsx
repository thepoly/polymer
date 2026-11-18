"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import TransitionLink from "@/components/TransitionLink";

// The header search's underline wave (components/SearchOverlay.tsx), same numbers.
const WAVE_LAMBDA = 600; // px, wavelength
const WAVE_PERSIST_MS = 250;

// Sine wave approximation via cubic bezier. Each half-period uses control points
// at 0.3642*half and 0.6358*half for a natural-looking curve.
const WAVE_PATH = (() => {
  const cy = 4, A = 2.5, half = WAVE_LAMBDA / 2;
  const cp = Math.round(0.3642 * half);
  let d = `M 0,${cy}`;
  for (let n = 0; n < 10; n++) {
    const x = n * WAVE_LAMBDA;
    d += ` C ${x + cp},${cy - A} ${x + half - cp},${cy - A} ${x + half},${cy}`;
    d += ` C ${x + half + cp},${cy + A} ${x + WAVE_LAMBDA - cp},${cy + A} ${x + WAVE_LAMBDA},${cy}`;
  }
  return d;
})();

/**
 * The foot of a section page (/news, /features): "Missed something?",
 * centred. A search box limited to the section (it goes to the site search
 * as /search?q=…&section=<section>) on a red underline, a link to the
 * section's archive, and its contact email. The section pages have no
 * header row for these any more.
 *
 * Like the header search, the underline turns into a travelling rainbow wave
 * while you type, and stays rainbow once the search is submitted. Works
 * without scripts: the search is a plain form and the underline stays red.
 */
export default function SectionSearchPrompt({
  section,
  name,
  archiveHref,
  contactHref,
}: {
  /** The section's slug, as the search filter expects it ("news") */
  section: string;
  /** How the section is named in the copy ("News") */
  name: string;
  /** Every past story in the section */
  archiveHref: string;
  contactHref?: string;
}) {
  const headingId = `${section}-search-prompt`;
  const inputId = `${section}-search-prompt-q`;
  const gradientId = `${section}-search-wave-rainbow`;
  const [isTyping, setIsTyping] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showWave = isTyping || isSubmitting;

  const clearTypingTimer = useCallback(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, []);

  const bumpWave = useCallback(() => {
    clearTypingTimer();
    setIsTyping(true);
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      typingTimerRef.current = null;
    }, WAVE_PERSIST_MS);
  }, [clearTypingTimer]);

  useEffect(() => {
    const stopWave = () => {
      clearTypingTimer();
      setIsTyping(false);
    };
    const handleVisibilityChange = () => {
      if (document.hidden) stopWave();
    };
    // Coming back to the page from the search results via the back button.
    const handlePageShow = () => setIsSubmitting(false);

    window.addEventListener("blur", stopWave);
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearTypingTimer();
      window.removeEventListener("blur", stopWave);
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [clearTypingTimer]);

  return (
    <section aria-labelledby={headingId} className="mx-auto mt-12 max-w-[460px] text-center lg:mt-16">
      <style>{`
        @keyframes sectionSearchWaveTravel {
          from { transform: translateX(-${WAVE_LAMBDA}px); }
          to   { transform: translateX(0px); }
        }
        @keyframes sectionSearchRainbowHue {
          from { filter: hue-rotate(0deg); }
          to   { filter: hue-rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .section-search-wave { display: none; }
          .section-search-bar { opacity: 1 !important; }
        }
      `}</style>

      <h2
        id={headingId}
        className="font-copy text-[clamp(26px,2.6vw,32px)] font-semibold leading-tight tracking-[-0.01em] text-text-main"
      >
        Missed something<span className="text-accent">?</span>
      </h2>

      <form
        role="search"
        action="/search"
        method="get"
        onSubmit={() => setIsSubmitting(true)}
        className="relative mt-5 flex h-12 items-center"
      >
        {/* Underline: a red bar that crossfades with the rainbow wave. */}
        <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 right-0 h-[8px] overflow-hidden">
          <svg
            className="section-search-wave absolute bottom-0 left-0"
            width={WAVE_LAMBDA * 10}
            height="8"
            style={{
              animation: `sectionSearchWaveTravel ${WAVE_LAMBDA / 1200}s linear infinite, sectionSearchRainbowHue 3s linear infinite`,
              opacity: showWave ? 1 : 0,
              transition: "opacity 0.8s ease-out",
              willChange: "transform, filter",
            }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#ff4040" stopOpacity="0.8" />
                <stop offset="16%"  stopColor="#ff9900" stopOpacity="0.8" />
                <stop offset="33%"  stopColor="#ffee00" stopOpacity="0.8" />
                <stop offset="50%"  stopColor="#44dd44" stopOpacity="0.8" />
                <stop offset="66%"  stopColor="#4488ff" stopOpacity="0.8" />
                <stop offset="83%"  stopColor="#cc44ff" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ff4040" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <path d={WAVE_PATH} stroke={`url(#${gradientId})`} strokeWidth="2" fill="none" />
          </svg>

          <div
            className="section-search-bar absolute bottom-0 left-0 right-0 h-[2px] bg-accent"
            style={{ opacity: showWave ? 0 : 1, transition: "opacity 0.8s ease-out" }}
          />
        </div>

        <input type="hidden" name="section" value={section} />
        <label htmlFor={inputId} className="sr-only">
          Search past {name}
        </label>
        <input
          id={inputId}
          type="search"
          name="q"
          required
          placeholder={`Search past ${name}`}
          onChange={bumpWave}
          className="h-full min-w-0 flex-1 bg-transparent text-left font-meta text-[18px] text-text-main placeholder:text-text-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        <button
          type="submit"
          aria-label="Search"
          className="-mr-2.5 grid h-11 w-11 shrink-0 cursor-pointer place-items-center text-text-main transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-main"
        >
          <ArrowRight aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6">
        <TransitionLink
          href={archiveHref}
          className="group inline-flex min-h-11 items-center gap-1.5 font-meta text-[15px] font-medium text-accent underline-offset-4 hover:underline"
        >
          Browse back issues
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2} />
        </TransitionLink>
        {contactHref && (
          <a
            href={contactHref}
            className="group inline-flex min-h-11 items-center gap-1.5 font-meta text-[15px] font-medium text-accent underline-offset-4 hover:underline"
          >
            Contact {name}
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2} />
          </a>
        )}
      </div>
    </section>
  );
}
