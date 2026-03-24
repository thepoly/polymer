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
}: {
  authors: SpotlightAuthor[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = authors.length;

  const advance = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % count);
  }, [count]);

  useEffect(() => {
    if (paused || count <= 1) return;
    intervalRef.current = setInterval(advance, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, advance, count]);

  if (count === 0) return null;

  const active = authors[activeIndex];

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
        <p className="mt-1 font-copy text-[16px] italic leading-[1.35] text-text-muted transition-colors line-clamp-2 max-w-[220px]">
          {active.latestArticle.title}
        </p>
      </TransitionLink>

      {/* Dot indicators */}
      {count > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {authors.map((_, i) => (
            <button
              key={authors[i].id}
              onClick={() => setActiveIndex(i)}
              className={`rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? "w-2 h-2 bg-accent"
                  : "w-1.5 h-1.5 bg-text-muted/30 hover:bg-text-muted/60"
              }`}
              aria-label={`Show ${authors[i].name}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
