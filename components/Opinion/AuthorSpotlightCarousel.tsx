"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";

export interface SpotlightAuthor {
  id: number;
  name: string;
  headshot: string | null;
  latestArticle: { title: string; url: string };
}

export default function AuthorSpotlightCarousel({
  authors,
  pinnedAuthors,
}: {
  authors: SpotlightAuthor[];
  pinnedAuthors?: SpotlightAuthor[];
}) {
  const displayAuthors = pinnedAuthors && pinnedAuthors.length > 0 ? pinnedAuthors : authors;
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = displayAuthors.length;

  // Derive a safe index — if the list shrinks, clamp without a cascading render
  const safeIndex = count === 0 ? 0 : Math.min(activeIndex, count - 1);

  const restartInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  const advance = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % count);
    restartInterval();
  }, [count, restartInterval]);

  const retreat = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + count) % count);
    restartInterval();
  }, [count, restartInterval]);

  useEffect(() => {
    if (paused || count <= 1) return;
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % count);
    }, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, count]);

  if (count === 0) return null;

  const active = displayAuthors[safeIndex];

  return (
    <div
      className="py-6 border-y border-rule my-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <TransitionLink
        href={active.latestArticle.url}
        className="group flex flex-col items-center justify-center text-center"
        style={{ height: 200 }}
      >
        {/* Large headshot */}
        <div className="relative h-[100px] w-[100px] overflow-hidden rounded-full border-2 border-rule mb-3">
          {active.headshot ? (
            <Image
              src={active.headshot}
              alt={active.name}
              fill
              className="object-cover"
              sizes="100px"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-accent/10 font-meta text-[32px] font-bold text-accent">
              {active.name.charAt(0)}
            </span>
          )}
        </div>

        {/* Name */}
        <p className="font-meta text-[16px] font-bold tracking-[0.04em] text-text-main">
          {active.name}
        </p>

        {/* Latest article */}
        <p className="mt-1 font-copy text-[16px] leading-[1.35] text-text-muted transition-colors group-hover:text-accent line-clamp-2 max-w-[220px]">
          {active.latestArticle.title}
        </p>
      </TransitionLink>

      {/* Navigation: arrows + dots */}
      {count > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={retreat}
            style={{ fontSize: 18, lineHeight: 1, padding: "0 4px", color: "#aaa", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
            aria-label="Previous author"
          >
            &#8249;
          </button>
          <div className="flex gap-1.5 items-center">
            {displayAuthors.map((_, i) => (
              <button
                key={displayAuthors[i].id}
                onClick={() => setActiveIndex(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === safeIndex
                    ? "w-2 h-2 bg-accent"
                    : "w-1.5 h-1.5 bg-text-muted/30 hover:bg-text-muted/60"
                }`}
                aria-label={`Show ${displayAuthors[i].name}`}
              />
            ))}
          </div>
          <button
            onClick={advance}
            style={{ fontSize: 18, lineHeight: 1, padding: "0 4px", color: "#aaa", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
            aria-label="Next author"
          >
            &#8250;
          </button>
        </div>
      )}
    </div>
  );
}
