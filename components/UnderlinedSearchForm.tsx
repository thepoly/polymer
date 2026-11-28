"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

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

/** Shared section-footer and drawer search field, with the same underline/wave. */
export default function UnderlinedSearchForm({
  label,
  section,
  inputId: providedInputId,
  className = "",
  onSubmit,
}: {
  label: string;
  section?: string;
  inputId?: string;
  className?: string;
  onSubmit?: () => void;
}) {
  const generatedId = useId();
  const inputId = providedInputId || `underlined-search-${generatedId}`;
  const gradientId = `${inputId}-rainbow`;
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
    <>
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

      <form
        role="search"
        aria-label={label}
        action="/search"
        method="get"
        onSubmit={() => { setIsSubmitting(true); onSubmit?.(); }}
        className={`relative flex h-12 items-center ${className}`}
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

        {section && <input type="hidden" name="section" value={section} />}
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
        <input
          id={inputId}
          type="search"
          name="q"
          required
          placeholder={label}
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
    </>
  );
}
