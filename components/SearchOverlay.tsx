"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Article } from "@/components/FrontPage/types";
import { Byline } from "@/components/FrontPage/Byline";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import { useTheme } from "@/components/ThemeProvider";
import {
  DEFAULT_SEARCH_PAGE_SIZE,
  MAX_SEARCH_QUERY_LENGTH,
  sanitizeSearchQuery,
} from "@/utils/search";
import { parseArchiveDateQuery } from "@/lib/archiveDateQuery";
import posthog from "posthog-js";

const OVERLAY_TRANSITION_MS = 420;
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

type SearchResponse = {
  articles: Article[];
  page: number;
  pageSize: number;
  query: string;
  totalPages: number;
  totalResults: number;
};

type SearchRequestError = Error & {
  status?: number;
  retryAfterSeconds?: number;
};

type SpellCorrectionState = {
  originalQuery: string;
  originalResults: number;
  suggestedQuery: string;
  suggestedResults: number;
};

export function SearchBarTrigger({
  onClick,
  className = "",
  compact = false,
}: {
  onClick: () => void;
  className?: string;
  compact?: boolean;
}) {
  const { isDarkMode } = useTheme();
  const logoSrc = isDarkMode ? "/logo-dark-mobile.svg" : "/logo-light-mobile.svg";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative block text-left ${className}`}
    >
      <div className={`relative flex items-center ${compact ? "min-w-[180px]" : "min-w-[220px]"}`}>
        <div className="absolute bottom-0 left-0 right-0 h-[8px] overflow-hidden">
          <div className="absolute bottom-0 left-0 right-0 h-[2px] origin-left bg-accent transition-opacity duration-200 group-hover:opacity-100" />
        </div>
        <div
          className={`w-full bg-transparent py-2 pl-3 font-meta font-bold text-text-main transition-colors group-hover:text-accent ${
            compact ? "pr-20 text-base" : "pr-28 text-xl"
          }`}
        >
          Search...
        </div>
        <Image
          src={logoSrc}
          alt="The Polytechnic"
          width={compact ? 72 : 110}
          height={compact ? 20 : 28}
          className={`pointer-events-none absolute right-2 top-1/2 h-auto -translate-y-[38%] opacity-50 ${
            compact ? "w-[72px]" : "w-[110px]"
          }`}
        />
      </div>
    </button>
  );
}

export function SearchOverlayTrigger({
  onClick,
  className = "",
  alwaysShowBorder = false,
}: {
  onClick: () => void;
  className?: string;
  alwaysShowBorder?: boolean;
}) {
  return (
    <button
      type="button"
      className={`group relative flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-rule px-3 text-text-main transition-colors ${className}`}
      data-marauders-origin="search"
      onClick={onClick}
    >
      <span
        className={`pointer-events-none absolute inset-0 overflow-hidden rounded-full p-[1px] transition-opacity duration-300 ${alwaysShowBorder ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        style={{
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      >
        <span className="absolute left-1/2 top-1/2 aspect-square w-[300%] -translate-x-1/2 -translate-y-1/2 animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg,#ef4444,#f59e0b,#10b981,#3b82f6,#8b5cf6,#ef4444)]" />
      </span>

      <Search className="relative z-10 h-3.5 w-3.5 shrink-0" />
      <span className="relative z-10 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.1em]">Search</span>
    </button>
  );
}

function formatRetryCountdown(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

async function fetchSearchResults(
  q: string,
  page: number,
  signal: AbortSignal,
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q,
    page: String(page),
    pageSize: String(DEFAULT_SEARCH_PAGE_SIZE),
  });
  const res = await fetch(`/api/search?${params.toString()}`, { signal });
  if (!res.ok) {
    let errorMessage = "Search request failed";
    try {
      const body = (await res.json()) as { error?: string };
      if (typeof body.error === "string" && body.error.trim()) {
        errorMessage = body.error.trim();
      }
    } catch {
      // Keep fallback message.
    }

    const retryAfterRaw = res.headers.get("Retry-After") ?? res.headers.get("retry-after");
    const retryAfterParsed = retryAfterRaw ? Number.parseInt(retryAfterRaw, 10) : NaN;

    const error = new Error(errorMessage) as SearchRequestError;
    error.status = res.status;
    if (Number.isFinite(retryAfterParsed) && retryAfterParsed > 0) {
      error.retryAfterSeconds = retryAfterParsed;
    }
    throw error;
  }
  return res.json() as Promise<SearchResponse>;
}

export default function SearchOverlay({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const logoSrc = isDarkMode ? "/logo-dark-mobile.svg" : "/logo-light-mobile.svg";
  const [query, setQuery] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [displayCount, setDisplayCount] = useState(0);
  const displayCountRef = useRef(0);
  const [searched, setSearched] = useState(false);
  const hasSearchedOnceRef = useRef(false);
  const [hasSearchedOnce, setHasSearchedOnce] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [archiveSubtitle, setArchiveSubtitle] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const waveTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Spell check
  const [spellCorrection, setSpellCorrection] = useState<SpellCorrectionState | null>(null);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);
  const [rateLimitSecondsRemaining, setRateLimitSecondsRemaining] = useState(0);
  const [isWaveTypingActive, setIsWaveTypingActive] = useState(false);
  const [characterLimitStage, setCharacterLimitStage] = useState<"idle" | "hiding" | "showing">("idle");
  const characterLimitHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const characterLimitResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [stage, setStage] = useState(0);
  // 0: blank (overlay fading in)
  // 1: "Search..." typing out
  // 2: line extends + logo fades in + X drops in
  // 3: cursor starts blinking, input is live

  const showTypingOverlay = query.length === 0 && stage >= 1 && stage < 3;
  const showWave = (isWaveTypingActive || isLoading) && stage >= 2;

  const clearWaveTypingTimer = useCallback(() => {
    if (waveTypingTimerRef.current) {
      clearTimeout(waveTypingTimerRef.current);
      waveTypingTimerRef.current = null;
    }
  }, []);

  const clearCharacterLimitTimers = useCallback(() => {
    if (characterLimitHideTimerRef.current) {
      clearTimeout(characterLimitHideTimerRef.current);
      characterLimitHideTimerRef.current = null;
    }
    if (characterLimitResetTimerRef.current) {
      clearTimeout(characterLimitResetTimerRef.current);
      characterLimitResetTimerRef.current = null;
    }
  }, []);

  const triggerCharacterLimitNotice = useCallback(() => {
    clearCharacterLimitTimers();
    setCharacterLimitStage("hiding");
    characterLimitHideTimerRef.current = setTimeout(() => {
      setCharacterLimitStage("showing");
    }, 120);
    characterLimitResetTimerRef.current = setTimeout(() => {
      setCharacterLimitStage("idle");
      characterLimitHideTimerRef.current = null;
      characterLimitResetTimerRef.current = null;
    }, 2120);
  }, [clearCharacterLimitTimers]);

  const bumpTypingWave = useCallback(() => {
    clearWaveTypingTimer();
    setIsWaveTypingActive(true);
    waveTypingTimerRef.current = setTimeout(() => {
      setIsWaveTypingActive(false);
      waveTypingTimerRef.current = null;
    }, WAVE_PERSIST_MS);
  }, [clearWaveTypingTimer]);

  const handleQueryChange = (nextQuery: string) => {
    bumpTypingWave();
    const normalized = nextQuery
      .normalize("NFKC")
      .replace(/[\u0000-\u001F\u007F]+/g, " ");
    if (normalized.length > MAX_SEARCH_QUERY_LENGTH) {
      triggerCharacterLimitNotice();
    }
    setQuery(normalized.slice(0, MAX_SEARCH_QUERY_LENGTH));
    setPage(0);
  };

  const updateCursor = useCallback(() => {
    const input = inputRef.current;
    const cursor = cursorRef.current;
    const measure = measureRef.current;
    if (!input || !cursor || !measure) return;
    const computed = getComputedStyle(input);
    measure.style.font = computed.font;
    const pos = input.selectionStart ?? query.length;
    measure.textContent = query.slice(0, pos);
    const textWidth = measure.offsetWidth;
    const paddingLeft = Number.parseFloat(computed.paddingLeft) || 12;
    const paddingRight = Number.parseFloat(computed.paddingRight) || 0;
    const rawLeft = paddingLeft + textWidth - input.scrollLeft + 2;
    const minLeft = paddingLeft;
    const maxLeft = Math.max(minLeft, input.clientWidth - paddingRight - 1);
    const clampedLeft = Math.min(maxLeft, Math.max(minLeft, rawLeft));
    cursor.style.left = `${clampedLeft}px`;
  }, [query]);

  useEffect(() => {
    updateCursor();
  }, [query, stage, updateCursor]);

  const closingRef = useRef(false);
  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setIsClosing(true);
    setIsVisible(false);
    closeTimerRef.current = setTimeout(onClose, OVERLAY_TRANSITION_MS);
  }, [onClose]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsVisible(true);
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // Smooth count-up: accumulate the real total, then animate toward it
  const targetCountRef = useRef(0);
  const countRunningRef = useRef(false);

  const startCountAnimation = useCallback(() => {
    if (countRunningRef.current) return;
    countRunningRef.current = true;
    const step = () => {
      const from = displayCountRef.current;
      const target = targetCountRef.current;
      if (from >= target) { countRunningRef.current = false; return; }
      const remaining = target - from;
      const increment = Math.max(1, Math.ceil(remaining * 0.08));
      const next = Math.min(from + increment, target);
      displayCountRef.current = next;
      setDisplayCount(next);
      animFrameRef.current = requestAnimationFrame(step);
    };
    animFrameRef.current = requestAnimationFrame(step);
  }, []);

  const animateCount = useCallback((target: number) => {
    targetCountRef.current = target;
    startCountAnimation();
  }, [startCountAnimation]);

  const fetchResults = useCallback(async (rawQuery: string, pageIndex: number) => {
    abortRef.current?.abort();
    const q = sanitizeSearchQuery(rawQuery);

    if (!q) {
      setArticles([]);
      setSearched(false);
      setIsLoading(false);
      setDisplayCount(0);
      displayCountRef.current = 0;
      setSpellCorrection(null);
      setRateLimitError(null);
      setRateLimitUntil(null);
      setRateLimitSecondsRemaining(0);
      setTotalResults(0);
      setTotalPages(0);
      return;
    }

    if (parseArchiveDateQuery(q)) {
      router.push(`/archive?date=${encodeURIComponent(q)}&source=search-overlay`);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setSearched(false);
    setSpellCorrection(null);
    setDisplayCount(0);
    displayCountRef.current = 0;

    try {
      const primaryData = await fetchSearchResults(q, pageIndex + 1, controller.signal);

      setArticles(primaryData.articles);
      setTotalResults(primaryData.totalResults);
      setTotalPages(primaryData.totalPages);
      if (primaryData.page - 1 !== pageIndex) setPage(Math.max(0, primaryData.page - 1));
      animateCount(primaryData.totalResults);
      posthog.capture("search_performed", {
        query: q,
        total_results: primaryData.totalResults,
        page: pageIndex + 1,
        source: "overlay",
      });
      setRateLimitError(null);
      setRateLimitUntil(null);
      setRateLimitSecondsRemaining(0);
      setSearched(true);
      if (!hasSearchedOnceRef.current) {
        hasSearchedOnceRef.current = true;
        setHasSearchedOnce(true);
      }
      setIsLoading(false);

      // Spellcheck fallback only applies when the original query has zero results.
      if (pageIndex === 0 && primaryData.totalResults === 0) {
        try {
          const spellRes = await fetch(
            `/api/search/spellcheck?q=${encodeURIComponent(q)}`,
            { signal: controller.signal },
          );
          if (!spellRes.ok) return;
          const spellcheckData = (await spellRes.json()) as { suggestion: string | null };
          if (!spellcheckData.suggestion || spellcheckData.suggestion.toLowerCase() === q.toLowerCase()) return;

          // Re-search with corrected query
          const suggestedData = await fetchSearchResults(spellcheckData.suggestion, 1, controller.signal);

          setSpellCorrection({
            originalQuery: q,
            originalResults: primaryData.totalResults,
            suggestedQuery: spellcheckData.suggestion,
            suggestedResults: suggestedData.totalResults,
          });

          if (suggestedData.totalResults > 0) {
            setArticles(suggestedData.articles);
            setTotalResults(suggestedData.totalResults);
            setTotalPages(suggestedData.totalPages);
            animateCount(suggestedData.totalResults);
            setPage(0);
          }
        } catch {}
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;

      const requestError = e as SearchRequestError;
      if (requestError.status === 429) {
        const retryAfter = Math.max(1, requestError.retryAfterSeconds ?? 10);
        setRateLimitError(requestError.message || "Too many search requests. Try again shortly.");
        setRateLimitUntil(Date.now() + retryAfter * 1000);
        setRateLimitSecondsRemaining(retryAfter);
      } else {
        setRateLimitError("Search failed. Please try again.");
        setRateLimitUntil(null);
        setRateLimitSecondsRemaining(0);
      }
      setIsLoading(false);
    }
  }, [animateCount, router]);

  useEffect(() => {
    if (rateLimitUntil && rateLimitUntil > Date.now()) return;
    const timer = setTimeout(() => fetchResults(query, page), 250);
    return () => clearTimeout(timer);
  }, [query, page, fetchResults, rateLimitUntil]);

  useEffect(() => {
    if (!rateLimitUntil) return;

    const tick = () => {
      const next = Math.max(0, Math.ceil((rateLimitUntil - Date.now()) / 1000));
      setRateLimitSecondsRemaining(next);
      if (next === 0) {
        setRateLimitUntil(null);
        setRateLimitError(null);
      }
    };

    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [rateLimitUntil]);

  useEffect(() => {
    return () => {
      clearWaveTypingTimer();
    };
  }, [clearWaveTypingTimer]);

  useEffect(() => {
    const stopTypingWave = () => {
      clearWaveTypingTimer();
      setIsWaveTypingActive(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopTypingWave();
      }
    };

    window.addEventListener("blur", stopTypingWave);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("blur", stopTypingWave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [clearWaveTypingTimer]);

  // Animation sequence — starts immediately, no dead time
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => { if (!closingRef.current) setStage(1); }, 0));
    timers.push(setTimeout(() => { if (!closingRef.current) setStage(2); }, 550));
    timers.push(setTimeout(() => {
      if (closingRef.current) return;
      setStage(3);
    }, 900));
    return () => timers.forEach(clearTimeout);
  }, []);

  // Fetch archive subtitle on mount
  useEffect(() => {
    fetch("/api/search/archive-date")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: { subtitle: string }) => setArchiveSubtitle(data.subtitle))
      .catch(() => setArchiveSubtitle(null));
  }, []);

  // Lock body scroll and handle Esc
  useEffect(() => {
    document.body.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKey, true);

    return () => {
      abortRef.current?.abort();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      clearWaveTypingTimer();
      clearCharacterLimitTimers();
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKey, true);
    };
  }, [clearCharacterLimitTimers, clearWaveTypingTimer, handleClose]);

  const displayArticles = articles;

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-bg-main/88 backdrop-blur-sm transition-opacity ease-out"
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest("input, a, button, [data-search-area]")) handleClose();
      }}
      style={{
        opacity: isVisible ? 1 : 0,
        transitionDuration: `${OVERLAY_TRANSITION_MS}ms`,
      }}
    >
      <style>{`
        @keyframes typeSearch {
          0% { width: 0; }
          100% { width: 8.5ch; }
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes textFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .search-caret {
          caret-color: transparent;
        }
        @media (max-width: 767px) {
          .search-caret {
            caret-color: currentColor;
          }
        }
        @keyframes caretPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes waveTravel {
          from { transform: translateX(-${WAVE_LAMBDA}px); }
          to   { transform: translateX(0px); }
        }
        @keyframes rainbowHue {
          from { filter: hue-rotate(0deg); }
          to   { filter: hue-rotate(360deg); }
        }
        @keyframes rainbowLetterFlash {
          0% { color: #f4a6a6; }
          16% { color: #f6c7a1; }
          33% { color: #f5ecaa; }
          50% { color: #b9e7b0; }
          66% { color: #a9cfff; }
          83% { color: #d8b4f8; }
          100% { color: #f4a6a6; }
        }
        @keyframes logoColorOscillate {
          0% { filter: hue-rotate(0deg) saturate(1.15) brightness(1.02); }
          25% { filter: hue-rotate(45deg) saturate(1.12) brightness(1.04); }
          50% { filter: hue-rotate(90deg) saturate(1.1) brightness(1.05); }
          75% { filter: hue-rotate(45deg) saturate(1.12) brightness(1.04); }
          100% { filter: hue-rotate(0deg) saturate(1.15) brightness(1.02); }
        }
      `}</style>

      <div
        className="relative mx-auto max-w-[1280px] px-4 pb-16 pt-3 transition-[opacity,transform] ease-out md:px-6 md:pt-6 xl:px-[30px]"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : isClosing ? "translateY(0)" : "translateY(8px)",
          transitionDuration: `${OVERLAY_TRANSITION_MS}ms`,
        }}
      >
        {/* X button */}
        <button
          onClick={handleClose}
          className="fixed top-[calc(var(--safe-area-top)-0.15rem)] right-3 z-20 flex h-7 w-7 items-center justify-center text-text-muted/70 transition-colors hover:text-accent md:absolute md:top-[0.45rem] md:right-6 md:h-10 md:w-10 xl:right-[30px]"
          style={{
            opacity: stage >= 2 ? 1 : 0,
            transform: stage >= 2 ? "translateY(0)" : "translateY(-20px)",
            transition: "opacity 0.3s ease-out, transform 0.3s ease-out",
          }}
          aria-label="Close search"
        >
          <X className="h-3.5 w-3.5 md:h-5 md:w-5" />
        </button>

        <div data-search-area className="relative flex items-center">
          {/* Bottom line / loading wave */}
          <div className="absolute bottom-0 left-0 right-0 h-[8px] overflow-hidden">
            {/* Rainbow wave — always rendered after stage 2, opacity-crossfades with static bar */}
            <svg
              className="absolute bottom-0 left-0"
              width={WAVE_LAMBDA * 10}
              height="8"
              style={{
                animation: stage >= 2
                  ? `waveTravel ${WAVE_LAMBDA / 1200}s linear infinite, rainbowHue 3s linear infinite`
                  : "none",
                opacity: showWave ? 1 : 0,
                transition: "opacity 0.8s ease-out",
                willChange: "transform, filter",
              }}
            >
              <defs>
                <linearGradient id="wave-rainbow" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor="#ff4040" stopOpacity="0.8" />
                  <stop offset="16%"  stopColor="#ff9900" stopOpacity="0.8" />
                  <stop offset="33%"  stopColor="#ffee00" stopOpacity="0.8" />
                  <stop offset="50%"  stopColor="#44dd44" stopOpacity="0.8" />
                  <stop offset="66%"  stopColor="#4488ff" stopOpacity="0.8" />
                  <stop offset="83%"  stopColor="#cc44ff" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ff4040" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              <path
                d={WAVE_PATH}
                stroke="url(#wave-rainbow)"
                strokeWidth="2"
                fill="none"
              />
            </svg>

            {/* Static accent bar — crossfades in when wave stops */}
            <div
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent origin-left"
              style={{
                transform: stage >= 2 ? "scaleX(1)" : "scaleX(0)",
                opacity: showWave ? 0 : 1,
                transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.8s ease-out",
              }}
            />
          </div>

          {/* Typing overlay */}
          {showTypingOverlay && (
            <div className="absolute inset-0 z-10 flex items-center py-2 pl-3 pr-36 font-meta text-xl md:text-3xl font-bold pointer-events-none">
              <span
                className={`inline-block overflow-hidden whitespace-nowrap ${isDarkMode ? "text-white/85" : "text-text-muted/60"}`}
                style={{ animation: "typeSearch 0.5s steps(9) forwards", width: 0 }}
              >
                Search...
              </span>
            </div>
          )}

          {/* Rainbow text overlay intentionally disabled for now. */}

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onSelect={() => updateCursor()}
            onKeyUp={() => updateCursor()}
            onClick={() => updateCursor()}
            onFocus={() => updateCursor()}
            onScroll={() => updateCursor()}
            placeholder={stage >= 3 ? "Search..." : ""}
            className="search-caret w-full bg-transparent py-2 pl-3 pr-36 font-meta text-xl md:text-3xl font-bold placeholder:text-text-muted/60 dark:placeholder:text-white/85 outline-none text-text-main"
          />

          {/* Hidden span to measure text width */}
          <span
            ref={measureRef}
            className="absolute invisible whitespace-pre font-meta text-xl md:text-3xl font-bold"
            aria-hidden="true"
          />

          {/* Custom thin cursor */}
          {stage >= 3 && (
            <div
              ref={cursorRef}
              className="absolute pointer-events-none hidden md:block"
              style={{
                left: 12,
                top: "50%",
                transform: "translateY(-48%)",
                width: 1,
                height: "1.35em",
                background: "var(--foreground)",
                animation: "caretPulse 1.1s step-end infinite",
              }}
            />
          )}

          {/* Logo */}
          <Image
            src={logoSrc}
            alt="The Polytechnic"
            width={160}
            height={42}
            className="absolute right-2 top-1/2 -translate-y-1/3 pointer-events-none w-[80px] md:w-[160px] h-auto"
            style={{
              opacity: stage >= 2 ? 0.5 : 0,
              transition: "opacity 0.3s ease-out",
              animation: showWave ? "logoColorOscillate 1.2s ease-in-out infinite" : "none",
            }}
          />
        </div>

        <div className="relative mt-2">
          <div
            className={`transition-all duration-180 ${
              characterLimitStage === "idle"
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-1 pointer-events-none"
            }`}
          >
            {rateLimitError && rateLimitSecondsRemaining > 0 && (
              <p className="font-meta text-[12px] text-red-500" role="alert">
                {rateLimitError} Restores in{" "}
                <span className="font-bold">{formatRetryCountdown(rateLimitSecondsRemaining)}</span>.
              </p>
            )}

            {hasSearchedOnce && (
              <p
                className={`${rateLimitError && rateLimitSecondsRemaining > 0 ? "mt-2" : "mt-1"} font-meta text-[12px] text-text-muted`}
                style={{ animation: "textFadeIn 0.3s ease-out forwards" }}
              >
                {isLoading ? (
                  <>
                    Searching... <span className="text-accent font-bold">{displayCount}</span> result{displayCount !== 1 ? "s" : ""} found so far.{" "}
                  </>
                ) : searched ? (
                  spellCorrection ? (
                    spellCorrection.suggestedResults > 0 ? (
                      <>
                        We found <span className="text-accent font-bold">{spellCorrection.originalResults}</span> result{spellCorrection.originalResults !== 1 ? "s" : ""} for{" "}
                        <span className="text-red-500 font-bold">&lsquo;{spellCorrection.originalQuery}&rsquo;</span>. However, we did find{" "}
                        <span className="text-accent font-bold">{spellCorrection.suggestedResults}</span> result{spellCorrection.suggestedResults !== 1 ? "s" : ""} that matched{" "}
                        <span className="text-red-500 font-bold">&lsquo;{spellCorrection.suggestedQuery}&rsquo;</span>, if that&apos;s what you meant.{" "}
                      </>
                    ) : (
                      <>
                        We found <span className="text-accent font-bold">{spellCorrection.originalResults}</span> result{spellCorrection.originalResults !== 1 ? "s" : ""} for{" "}
                        <span className="text-red-500 font-bold">&lsquo;{spellCorrection.originalQuery}&rsquo;</span>. We didn&apos;t find any results for{" "}
                        <span className="text-red-500 font-bold">&lsquo;{spellCorrection.suggestedQuery}&rsquo;</span> either.{" "}
                      </>
                    )
                  ) : (
                    <>
                      We found <span className="text-accent font-bold">{totalResults}</span> result{totalResults !== 1 ? "s" : ""} that matched your query.{" "}
                    </>
                  )
                ) : null}
                <span className="hidden md:inline">
                  Our search algorithm uses title, subtitle, kicker, author, and body matching.{archiveSubtitle ? ` ${archiveSubtitle}.` : " You are currently searching our online database, containing articles published after 2009."} You can access older articles in <a href="https://digitalassets.archives.rpi.edu/do/235be3d2-f018-48af-a413-b50e16dd6dc7" target="_blank" rel="noopener noreferrer" className="underline hover:text-accent">our archive at the Richard G. Folsom Library</a>.
                </span>
              </p>
            )}
          </div>

          <p
            className={`pointer-events-none absolute left-0 top-0 font-meta text-[12px] font-semibold text-red-500 transition-all duration-180 ${
              characterLimitStage === "showing"
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-1"
            }`}
            role="status"
            aria-live="polite"
          >
            {MAX_SEARCH_QUERY_LENGTH} character limit.
          </p>
        </div>

        {searched && displayArticles.length > 0 && (() => {
        return (
          <div className="mt-8">
            <div className="flex flex-col divide-y divide-rule">
                {displayArticles.map((article) => (
                  <div key={article.id} className="py-4 first:pt-0">
                    <TransitionLink
                      href={article.externalUrl ?? getArticleUrl(article)}
                      data-analytics-context="search-overlay"
                      onClick={() => { posthog.capture("search_result_clicked", { query, article_title: article.title, article_section: article.section, source: "overlay" }); handleClose(); }}
                      className="flex flex-col group cursor-pointer"
                    >
                      <h3 className={`font-bold leading-[1.12] tracking-[-0.01em] text-text-main transition-colors mb-1 [overflow-wrap:anywhere] break-words font-copy ${article.section === "opinion" ? "font-light" : ""} text-[22px] md:text-[24px] ${article.section === "news" ? "!text-[1.2em]" : ""} ${article.section === "features" ? "font-light italic text-[23px] md:text-[25px]" : ""}`}>
                        {article.title}
                      </h3>
                      <Byline author={article.author} date={article.date} />
                      <p className="font-meta font-normal text-black dark:text-white text-[13px] leading-[1.38] mb-2 transition-colors [overflow-wrap:anywhere] break-words">
                        {article.excerpt}
                      </p>
                    </TransitionLink>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-6 flex items-center gap-4 font-meta text-[12px] text-text-muted">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="disabled:opacity-30 hover:text-accent transition-colors"
                  >
                    ← Prev
                  </button>
                  <span>Page {page + 1} of {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page === totalPages - 1}
                    className="disabled:opacity-30 hover:text-accent transition-colors"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
