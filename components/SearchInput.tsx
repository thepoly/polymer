"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Article } from "@/components/FrontPage/types";
import { Byline } from "@/components/FrontPage/Byline";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import { useTheme } from "@/components/ThemeProvider";
import { DEFAULT_SEARCH_PAGE_SIZE, sanitizeSearchQuery } from "@/utils/search";

const WAVE_LAMBDA = 600; // px, wavelength

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
  if (!res.ok) throw new Error("Search request failed");
  return res.json() as Promise<SearchResponse>;
}

export default function SearchInput({ defaultValue, autoFocus = false }: { defaultValue?: string, autoFocus?: boolean }) {
  const { isDarkMode } = useTheme();
  const logoSrc = isDarkMode ? "/logo-dark-mobile.svg" : "/logo-light-mobile.svg";
  const [query, setQuery] = useState(defaultValue || "");
  const [articles, setArticles] = useState<Article[]>([]);
  const [displayCount, setDisplayCount] = useState(0);
  const displayCountRef = useRef(0);
  const [searched, setSearched] = useState(!!defaultValue);
  const hasSearchedOnceRef = useRef(!!defaultValue);
  const [hasSearchedOnce, setHasSearchedOnce] = useState(!!defaultValue);
  const [isLoading, setIsLoading] = useState(false);
  const [archiveSubtitle, setArchiveSubtitle] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Spell check
  const [spellSuggestion, setSpellSuggestion] = useState<string | null>(null);

  const [stage, setStage] = useState(0);
  // 0: blank
  // 1: "Search..." typing out
  // 2: line extends + logo fades in
  // 3: cursor starts blinking, input is live

  const showTypingOverlay = query.length === 0 && stage >= 1 && stage < 3;
  const showWave = isLoading && stage >= 2;

  const updateCursor = useCallback(() => {
    const input = inputRef.current;
    const cursor = cursorRef.current;
    const measure = measureRef.current;
    if (!input || !cursor || !measure) return;
    measure.style.font = getComputedStyle(input).font;
    const pos = input.selectionStart ?? query.length;
    measure.textContent = query.slice(0, pos);
    const textWidth = measure.offsetWidth;
    cursor.style.left = query.length > 0 ? `${12 + textWidth + 2}px` : `${12}px`;
  }, [query]);

  useEffect(() => {
    updateCursor();
  }, [query, stage, updateCursor]);

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
      setSpellSuggestion(null);
      setTotalResults(0);
      setTotalPages(0);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setSearched(false);
    setSpellSuggestion(null);
    setDisplayCount(0);
    displayCountRef.current = 0;

    try {
      const data = await fetchSearchResults(q, pageIndex + 1, controller.signal);

      setArticles(data.articles);
      setTotalResults(data.totalResults);
      setTotalPages(data.totalPages);
      if (data.page - 1 !== pageIndex) setPage(Math.max(0, data.page - 1));
      animateCount(data.totalResults);
      setSearched(true);
      if (!hasSearchedOnceRef.current) {
        hasSearchedOnceRef.current = true;
        setHasSearchedOnce(true);
      }
      setIsLoading(false);

      // Spell check if 0 results
      if (data.totalResults === 0) {
        try {
          const spellRes = await fetch(
            `/api/search/spellcheck?q=${encodeURIComponent(q)}`,
            { signal: controller.signal },
          );
          if (!spellRes.ok) return;
          const data = (await spellRes.json()) as { suggestion: string | null };
          if (!data.suggestion || data.suggestion.toLowerCase() === q.toLowerCase()) return;

          // Re-search with corrected query
          const suggestedData = await fetchSearchResults(data.suggestion, 1, controller.signal);

          if (suggestedData.totalResults > 0) {
            setSpellSuggestion(data.suggestion);
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
      setIsLoading(false);
    }
  }, [animateCount]);

  useEffect(() => {
    const timer = setTimeout(() => fetchResults(query, page), 250);
    return () => clearTimeout(timer);
  }, [query, page, fetchResults]);

  useEffect(() => {
    setPage(0);
  }, [query]);

  // Animation sequence
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setStage(1), 0));
    timers.push(setTimeout(() => setStage(2), 550));
    timers.push(setTimeout(() => setStage(3), 900));
    return () => timers.forEach(clearTimeout);
  }, []);

  // Fetch archive subtitle on mount
  useEffect(() => {
    fetch("/api/search/archive-date")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: { subtitle: string }) => setArchiveSubtitle(data.subtitle))
      .catch(() => setArchiveSubtitle(null));
  }, []);

  const rainbowQueryChars = Array.from(query);

  return (
    <div className="relative w-full">
      <style>{`
        @keyframes typeSearch {
          0% { width: 0; }
          100% { width: 8.5ch; }
        }
        @keyframes textFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .search-caret {
          caret-color: transparent;
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

      <div className="relative flex items-center">
        {/* Bottom line / loading wave */}
        <div className="absolute bottom-0 left-0 right-0 h-[8px] overflow-hidden">
          {/* Rainbow wave */}
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
              <linearGradient id="wave-rainbow-input" x1="0" y1="0" x2="1" y2="0">
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
              stroke="url(#wave-rainbow-input)"
              strokeWidth="2"
              fill="none"
            />
          </svg>

          {/* Static accent bar */}
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

        {showWave && query.length > 0 && (
          <div className="absolute inset-0 z-10 flex items-center py-2 pl-3 pr-36 font-meta text-xl md:text-3xl font-bold pointer-events-none whitespace-pre text-left">
            {rainbowQueryChars.map((char, index) => (
              <span
                key={`${char}-${index}`}
                style={{
                  animation: "rainbowLetterFlash 0.42s linear infinite",
                  animationDelay: `${index * 0.045}s`,
                }}
              >
                {char}
              </span>
            ))}
          </div>
        )}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onSelect={() => updateCursor()}
          autoFocus={autoFocus}
          placeholder={stage >= 3 ? "Search..." : ""}
          className={`search-caret w-full bg-transparent py-2 pl-3 pr-36 font-meta text-xl md:text-3xl font-bold placeholder:text-text-muted/60 dark:placeholder:text-white/85 outline-none ${showWave && query.length > 0 ? "text-transparent" : "text-text-main"}`}
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
            className="absolute pointer-events-none"
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

      {hasSearchedOnce && (
        <p
          className="mt-3 font-meta text-[12px] text-text-muted"
          style={{ animation: "textFadeIn 0.3s ease-out forwards" }}
        >
          {isLoading ? (
            <>
                Searching... <span className="text-accent font-bold">{displayCount}</span> result{displayCount !== 1 ? "s" : ""} found so far.{" "}
              </>
            ) : searched ? (
              spellSuggestion ? (
                <>
                We found <span className="text-accent font-bold">{totalResults}</span> result{totalResults !== 1 ? "s" : ""} for{" "}
                <span className="text-red-500 font-bold">&lsquo;{spellSuggestion}&rsquo;</span>.{" "}
              </>
            ) : (
              <>
                We found <span className="text-accent font-bold">{totalResults}</span> result{totalResults !== 1 ? "s" : ""} that matched your query.{" "}
              </>
            )
          ) : null}
          Our search algorithm uses title, subtitle, kicker, author, and body matching.{archiveSubtitle ? ` ${archiveSubtitle}.` : " You are currently searching our online database, containing articles published after 2009."} You can access older articles in <a href="https://digitalassets.archives.rpi.edu/do/235be3d2-f018-48af-a413-b50e16dd6dc7" target="_blank" rel="noopener noreferrer" className="underline hover:text-accent">our archive at the Richard G. Folsom Library</a>.
        </p>
      )}

      {searched && articles.length > 0 && (() => {
        return (
          <div className="mt-8">
            <div className="flex flex-col divide-y divide-rule">
              {articles.map((article) => (
                <div key={article.id} className="py-4 first:pt-0">
                  <TransitionLink
                    href={article.externalUrl ?? getArticleUrl(article)}
                    className="flex flex-col group cursor-pointer"
                  >
                    <h3 className={`font-display font-bold text-text-main mb-1 text-[16px] md:text-[18px] leading-tight group-hover:text-accent transition-colors ${article.section === "news" ? "font-display-news uppercase" : ""} ${article.section === "features" ? "font-normal italic" : ""} ${article.section === "sports" ? "italic tracking-[0.015em]" : ""}`}>
                      {article.title}
                    </h3>
                    <p className="font-copy text-text-main text-[13px] md:text-[14px] leading-[1.4] mb-2 transition-colors">
                      {article.excerpt}
                    </p>
                    <Byline author={article.author} date={article.date} />
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
  );
}
