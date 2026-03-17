"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { Article } from "@/components/FrontPage/types";
import { Byline } from "@/components/FrontPage/Byline";
import { getArticleUrl } from "@/utils/getArticleUrl";
import { useTheme } from "@/components/ThemeProvider";

const OVERLAY_TRANSITION_MS = 420;

export default function SearchOverlay({ onClose }: { onClose: () => void }) {
  const { isDarkMode } = useTheme();
  const logoSrc = isDarkMode ? "/logo-dark.svg" : "/logo-light.svg";
  const [query, setQuery] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [searched, setSearched] = useState(false);
  const [hasSearchedOnce, setHasSearchedOnce] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [stage, setStage] = useState(0);
  // 0: blank (overlay fading in)
  // 1: "Search..." typing out
  // 2: line extends + logo fades in + X drops in
  // 3: cursor starts blinking, input is live

  const showTypingOverlay = query.length === 0 && stage >= 1 && stage < 3;

  const updateCursor = useCallback(() => {
    const input = inputRef.current;
    const cursor = cursorRef.current;
    const measure = measureRef.current;
    if (!input || !cursor || !measure) return;
    measure.style.font = getComputedStyle(input).font;
    const pos = input.selectionStart ?? query.length;
    measure.textContent = query.slice(0, pos);
    const textWidth = measure.offsetWidth;
    if (query.length > 0) {
      cursor.style.left = `${12 + textWidth + 2}px`;
    } else {
      cursor.style.left = `${12}px`;
    }
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

  const fetchResults = useCallback(async (q: string) => {
    abortRef.current?.abort();

    if (!q.trim()) {
      setArticles([]);
      setSearched(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, {
        signal: controller.signal,
      });
      if (!res.ok) return;
      const data = await res.json();
      setArticles(data.articles);
      setSearched(true);
      if (!hasSearchedOnce) setHasSearchedOnce(true);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  }, [hasSearchedOnce]);

  useEffect(() => {
    const timer = setTimeout(() => fetchResults(query), 250);
    return () => clearTimeout(timer);
  }, [query, fetchResults]);

  // Animation sequence — starts immediately, no dead time
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    // 0→1: start typing immediately
    timers.push(setTimeout(() => {
      if (!closingRef.current) setStage(1);
    }, 0));
    // 1→2: after typing finishes (~500ms), line + logo + X
    timers.push(setTimeout(() => {
      if (!closingRef.current) setStage(2);
    }, 550));
    // 2→3: after line extends (~300ms), cursor blinks and input is live
    timers.push(setTimeout(() => {
      if (closingRef.current) return;
      setStage(3);
    }, 900));

    return () => timers.forEach(clearTimeout);
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
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKey, true);
    };
  }, [handleClose]);

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-bg-main/95 backdrop-blur-sm transition-opacity ease-out"
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
        @keyframes caretPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>

      <div
        className="mx-auto max-w-[1280px] px-4 pb-16 pt-6 transition-[opacity,transform] ease-out md:px-6 xl:px-[30px]"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : isClosing ? "translateY(0)" : "translateY(8px)",
          transitionDuration: `${OVERLAY_TRANSITION_MS}ms`,
        }}
      >
        {/* X button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-rule-strong/70 text-text-muted transition-colors hover:border-accent hover:text-accent"
            style={{
              opacity: stage >= 2 ? 1 : 0,
              transform: stage >= 2 ? "translateY(0)" : "translateY(-20px)",
              transition: "opacity 0.3s ease-out, transform 0.3s ease-out",
            }}
            aria-label="Close search"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div data-search-area className="relative flex items-center">
          {/* Animated line */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent origin-left"
            style={{
              transform: stage >= 2 ? "scaleX(1)" : "scaleX(0)",
              transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />

          {/* Typing overlay */}
          {showTypingOverlay && (
            <div className="absolute inset-0 z-10 flex items-center py-2 pl-3 pr-36 font-display text-xl md:text-3xl font-bold pointer-events-none">
              <span
                className={`inline-block overflow-hidden whitespace-nowrap ${isDarkMode ? "text-white/85" : "text-text-muted/60"}`}
                style={{ animation: "typeSearch 0.5s steps(9) forwards", width: 0 }}
              >
                Search...
              </span>
            </div>
          )}

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onSelect={() => updateCursor()}
            placeholder={stage >= 3 ? "Search..." : ""}
            className="search-caret w-full bg-transparent py-2 pl-3 pr-36 font-display text-xl md:text-3xl font-bold text-text-main placeholder:text-text-muted/60 dark:placeholder:text-white/85 outline-none"
          />

          {/* Hidden span to measure text width */}
          <span
            ref={measureRef}
            className="absolute invisible whitespace-pre font-display text-xl md:text-3xl font-bold"
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
            }}
          />
        </div>

        {hasSearchedOnce && (
          <p
            className="mt-3 font-meta text-[12px] text-text-muted"
            style={{ animation: "textFadeIn 0.3s ease-out forwards" }}
          >
            {searched && (
              <>
                We found <span className="text-accent font-bold">{articles.length}</span> result{articles.length !== 1 ? "s" : ""} that matched your query.{" "}
              </>
            )}
            Our search algorithm uses title, subtitle, and kicker matching. You are currently searching our online database, containing articles published after 2009. You can access older articles in <a href="https://digitalassets.archives.rpi.edu/do/235be3d2-f018-48af-a413-b50e16dd6dc7" target="_blank" rel="noopener noreferrer" className="underline hover:text-accent">our archive at the Richard G. Folsom Library</a>.
          </p>
        )}

        {searched && articles.length > 0 && (
          <div className="mt-8">
            <div className="flex flex-col divide-y divide-rule">
              {articles.map((article) => (
                <div key={article.id} className="py-4 first:pt-0">
                  <Link
                    href={getArticleUrl(article)}
                    onClick={handleClose}
                    className="flex flex-col group cursor-pointer"
                  >
                    <h3 className={`font-display font-bold text-text-main mb-1 text-[16px] md:text-[18px] leading-tight group-hover:text-accent transition-colors ${article.section === "news" ? "font-display-news uppercase" : ""} ${article.section === "features" ? "font-normal italic" : ""} ${article.section === "sports" ? "italic tracking-[0.015em]" : ""}`}>
                      {article.title}
                    </h3>
                    <p className="font-copy text-text-main text-[13px] md:text-[14px] leading-[1.4] mb-2 transition-colors">
                      {article.excerpt}
                    </p>
                    <Byline author={article.author} date={article.date} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
