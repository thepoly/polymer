import React from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
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
  if (articles.length === 0) return null;

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

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-5 md:px-6 md:py-6 xl:px-[30px]">
      {/* Section title */}
      <div className="overflow-hidden mb-4 -mt-2">
        <h1 className="font-meta font-bold uppercase tracking-[0.02em] leading-[0.82] text-accent/55 whitespace-nowrap text-[36px] sm:text-[48px] md:text-[56px] lg:text-[65px] transition-colors">
          {title}
        </h1>
      </div>

      {/* 3-column masonry layout */}
      <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,4fr)]">
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
