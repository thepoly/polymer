"use client";

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { LeadArticle } from "@/components/FrontPage/LeadArticle";
import { ArticleCard } from "@/components/FrontPage/ArticleCard";
import { Article } from "@/components/FrontPage/types";
import { Byline } from "@/components/FrontPage/Byline";
import { getArticleUrl } from "@/utils/getArticleUrl";

/* ─── Helpers ─────────────────────────────────────────────────────── */

const tc = (article: Article, size: string) =>
  `font-display font-bold leading-[1.12] tracking-[-0.015em] text-text-main transition-colors group-hover:text-accent ${size} ${
    article.section === "news"
      ? "font-display-news uppercase"
      : article.section === "features"
        ? "font-normal italic"
        : article.section === "sports"
          ? "italic tracking-[0.015em]"
          : article.section === "opinion"
            ? "font-light"
            : ""
  }`;

const normalizeKicker = (rawKicker?: string | null): string | null => {
  const normalized = rawKicker?.trim().replace(/\s+/g, " ");
  if (!normalized) return null;
  // Ignore punctuation-only or placeholder-like values so the mobile header row
  // doesn't render broken glyphs.
  if (!/[A-Za-z0-9]/.test(normalized)) return null;
  return normalized;
};

/**
 * Distribute articles into columns, balancing "weight" so columns
 * end up roughly the same visual height. Image articles are heavier.
 */
function distributeToColumns(articles: Article[], numCols: number): Article[][] {
  const cols: Article[][] = Array.from({ length: numCols }, () => []);
  const weights = new Array(numCols).fill(0);

  for (const article of articles) {
    // Find lightest column
    let minIdx = 0;
    for (let i = 1; i < numCols; i++) {
      if (weights[i] < weights[minIdx]) minIdx = i;
    }
    cols[minIdx].push(article);
    // Image articles weigh ~3x a text-only headline
    weights[minIdx] += article.image ? 3 : 1;
  }
  return cols;
}

/* ─── Article Card (used in columns) ─────────────────────────────── */

function ColumnCard({
  article,
  size = "text-[18px] md:text-[20px]",
}: {
  article: Article;
  size?: string;
}) {
  return (
    <TransitionLink href={getArticleUrl(article)} className="group block">
      <h3 className={tc(article, size)}>{article.title}</h3>
      {article.excerpt && (
        <p className="font-meta mt-1.5 text-[13px] leading-[1.42] text-text-muted line-clamp-3">
          {article.excerpt}
        </p>
      )}
      <Byline author={article.author} date={article.date} />
      {article.image && (
        <div className="relative mt-3 overflow-hidden">
          <div className="relative w-full aspect-[3/2]">
            <Image
              src={article.image}
              alt={article.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 420px"
            />
          </div>
        </div>
      )}
    </TransitionLink>
  );
}

/* ─── Main Layout ─────────────────────────────────────────────────── */

export default function SectionPage({
  title,
  articles,
}: {
  title: string;
  articles: Article[];
}) {
  const kickerRowRef = useRef<HTMLDivElement>(null);
  const kickerMeasureRef = useRef<HTMLDivElement>(null);

  const commonKickers = useMemo(
    () =>
      Array.from(
        articles.slice(0, 10).reduce((map, article, index) => {
          const kicker = normalizeKicker(article.kicker);
          if (!kicker) return map;

          const existing = map.get(kicker);
          if (existing) {
            existing.count += 1;
          } else {
            map.set(kicker, { kicker, count: 1, firstIndex: index });
          }

          return map;
        }, new Map<string, { kicker: string; count: number; firstIndex: number }>()).values(),
      )
        .sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return a.firstIndex - b.firstIndex;
        })
        .slice(0, 4)
        .map((entry) => entry.kicker),
    [articles],
  );
  const [visibleKickers, setVisibleKickers] = useState<string[]>([]);

  useLayoutEffect(() => {
    const updateVisibleKickers = () => {
      const row = kickerRowRef.current;
      const measure = kickerMeasureRef.current;

      if (!row || !measure) return;

      const itemNodes = Array.from(measure.querySelectorAll<HTMLElement>("[data-kicker-item]"));
      const rowWidth = row.clientWidth;
      const gap = 8;
      let usedWidth = 0;
      const nextVisible: string[] = [];

      itemNodes.forEach((node, index) => {
        const itemWidth = node.offsetWidth;
        const nextWidth = nextVisible.length === 0 ? itemWidth : usedWidth + gap + itemWidth;

        if (nextWidth <= rowWidth) {
          nextVisible.push(commonKickers[index]);
          usedWidth = nextWidth;
        }
      });

      setVisibleKickers(nextVisible);
    };

    updateVisibleKickers();

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => updateVisibleKickers())
      : null;

    if (resizeObserver && kickerRowRef.current) {
      resizeObserver.observe(kickerRowRef.current);
    }

    window.addEventListener("resize", updateVisibleKickers);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateVisibleKickers);
    };
  }, [commonKickers]);

  // Put the best image+excerpt article first
  const idx = articles.findIndex((a) => a.image && a.excerpt);
  const ordered = idx > 0
    ? [articles[idx], ...articles.slice(0, idx), ...articles.slice(idx + 1)]
    : [...articles];

  // Lead article goes into column 1, rest distributed across 3 columns
  const lead = ordered[0];
  const rest = ordered.slice(1);
  const [col1Rest, col2, col3] = distributeToColumns(rest, 3);
  const col1 = [lead, ...col1Rest];

  if (articles.length === 0) return null;

  return (
    <div className="mx-auto max-w-[1280px] overflow-x-clip px-4 pb-14 pt-5 md:px-6 md:py-6 xl:px-[30px]">
      <div className="relative overflow-hidden mb-4 mt-8 md:hidden">
        <h1 className="font-meta font-bold uppercase tracking-[0.02em] leading-[0.82] text-[#D6001C] dark:text-white text-[52px] transition-colors">
          {title}
        </h1>
        {commonKickers.length > 0 && (
          <>
            <div
              ref={kickerRowRef}
              className={`font-meta mt-2 flex flex-nowrap items-center gap-2 overflow-hidden text-[13px] font-medium uppercase tracking-[0.08em] text-text-muted transition-colors ${
                visibleKickers.length === 0 ? "h-0" : ""
              }`}
            >
              {visibleKickers.map((kicker, index) => (
                <React.Fragment key={kicker}>
                  {index > 0 && <span className="shrink-0 whitespace-nowrap text-text-muted">•</span>}
                  <TransitionLink
                    href={`/search?q=${encodeURIComponent(kicker)}`}
                    className="shrink-0 whitespace-nowrap text-text-main underline decoration-text-muted/70 underline-offset-[0.22em] transition-colors hover:text-accent hover:decoration-accent"
                  >
                    {kicker}
                  </TransitionLink>
                </React.Fragment>
              ))}
            </div>
            <div
              ref={kickerMeasureRef}
              className="pointer-events-none fixed -left-[9999px] top-0 flex flex-nowrap gap-2 opacity-0"
              aria-hidden="true"
            >
              {commonKickers.map((kicker, index) => (
                <span key={kicker} data-kicker-item className="shrink-0 whitespace-nowrap font-meta text-[13px] font-medium uppercase tracking-[0.08em]">
                  {index > 0 ? "• " : ""}
                  {kicker}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="pt-6 flex flex-col md:hidden">
        <LeadArticle article={lead} compact={false} imageFirstOnMobile hideKicker />
        {rest.map((article) => (
          <div key={article.id} className="mt-10">
            <ArticleCard article={article} />
          </div>
        ))}
      </div>

      {/* Section title */}
      <div className="hidden overflow-hidden mb-4 -mt-2 md:block">
        <h1 className="font-meta font-bold uppercase tracking-[0.02em] leading-[0.82] text-[#D6001C] dark:text-white whitespace-nowrap text-[36px] sm:text-[48px] md:text-[56px] lg:text-[65px] transition-colors">
          {title}
        </h1>
      </div>

      {/* 3-column masonry layout */}
      <div className="hidden gap-x-5 gap-y-6 md:grid md:grid-cols-2 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,4fr)]">
        {/* Column 1 — lead + overflow */}
        <div className="flex flex-col divide-y divide-rule">
          {col1.map((a, i) => (
            <div key={a.id} className={i === 0 ? "pb-5" : "pt-5 pb-5"}>
              <ColumnCard
                article={a}
                size={i === 0 ? "text-[22px] md:text-[26px]" : "text-[18px] md:text-[20px]"}
              />
            </div>
          ))}
        </div>

        {/* Column 2 */}
        <div className="flex flex-col divide-y divide-rule">
          {col2.map((a, i) => (
            <div key={a.id} className={i === 0 ? "pb-5" : "pt-5 pb-5"}>
              <ColumnCard article={a} />
            </div>
          ))}
        </div>

        {/* Column 3 */}
        <div className="flex flex-col divide-y divide-rule">
          {col3.map((a, i) => (
            <div key={a.id} className={i === 0 ? "pb-5" : "pt-5 pb-5"}>
              <ColumnCard article={a} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
