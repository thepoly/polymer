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
      className="relative py-4 border-y border-rule my-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {count > 1 && (
        <>
          <button
            onClick={retreat}
            className="absolute left-2 top-1/2 z-10 flex h-14 w-14 -translate-y-1/2 items-center justify-center text-[56px] leading-none text-[#9a9a9a] transition-colors hover:text-accent"
            style={{ background: "none", border: "none", cursor: "pointer" }}
            aria-label="Previous author"
          >
            &#8249;
          </button>
          <button
            onClick={advance}
            className="absolute right-2 top-1/2 z-10 flex h-14 w-14 -translate-y-1/2 items-center justify-center text-[56px] leading-none text-[#9a9a9a] transition-colors hover:text-accent"
            style={{ background: "none", border: "none", cursor: "pointer" }}
            aria-label="Next author"
          >
            &#8250;
          </button>
        </>
      )}

      <TransitionLink
        href={active.latestArticle.url}
        className="group flex flex-col items-center justify-center text-center"
        style={{ height: 210 }}
      >
        {/* Large headshot */}
        <div className="relative h-[124px] w-[124px] overflow-hidden rounded-full border-2 border-rule mb-2">
          {active.headshot ? (
            <Image
              src={active.headshot}
              alt={active.name}
              fill
              className="object-cover"
              sizes="124px"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-accent/10 font-meta text-[32px] font-bold text-accent">
              {active.name.charAt(0)}
            </span>
          )}
        </div>

        {/* Name */}
        <p className="font-meta text-[19px] font-bold tracking-[0.04em] text-text-main">
          {active.name}
        </p>

        {/* Latest article */}
        <p className="mt-0.5 font-copy text-[19px] leading-[1.3] text-text-muted transition-colors group-hover:text-accent line-clamp-2 max-w-[240px]">
          {active.latestArticle.title}
        </p>
      </TransitionLink>

      {/* Navigation: arrows + dots */}
      {count > 1 && (
        <div className="flex items-center justify-center mt-2">
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
        </div>
      )}
    </div>
  );
}
