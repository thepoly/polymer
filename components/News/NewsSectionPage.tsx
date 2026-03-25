"use client";

import React from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import RainbowDivider, { AnimatedLine } from "@/components/Opinion/RainbowDivider";
import type { Article as ComponentArticle } from "@/components/FrontPage/types";
import { newsGroups } from "./newsGroups";

/* ── Article card — optionally shows image ── */

function NewsCard({ article, withImage = false, priority = false }: { article: ComponentArticle; withImage?: boolean; priority?: boolean }) {
  return (
    <TransitionLink
      href={getArticleUrl(article)}
      className="group block mb-8"
    >
      {withImage && article.image && (
        <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden mb-3 md:left-0 md:right-0 md:ml-0 md:mr-0 md:w-full" style={{ aspectRatio: "3/2" }}>
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
            priority={priority}
          />
        </div>
      )}
      {/* Kicker */}
      {article.kicker && (
        <span className="font-meta text-[15px] font-medium uppercase tracking-[0.08em] text-accent dark:text-[#d96b76] block mb-1.5">
          {article.kicker}
        </span>
      )}
      {/* Title */}
      <h3 className="font-copy font-medium leading-[1.12] text-[28px] text-text-main transition-colors">
        {article.title}
      </h3>
      {/* Byline */}
      <div className="mt-2 font-meta text-[13px] font-medium uppercase tracking-[0.04em]">
        {article.author && (
          <span><span className="text-text-muted">BY </span><span className="text-accent dark:text-white">{article.author}</span></span>
        )}
        {article.author && article.date && (
          <span className="text-text-muted mx-1.5">&bull;</span>
        )}
        {article.date && (
          <span className="text-text-muted">{article.date}</span>
        )}
      </div>
      {/* Subdeck */}
      {article.excerpt && (
        <p className="mt-0.5 font-meta text-[15px] font-medium leading-[1.5] text-text-main line-clamp-4">
          {article.excerpt}
        </p>
      )}
    </TransitionLink>
  );
}

/* ── Main Page ── */

export default function NewsSectionPage({
  title,
  articles,
  pinnedArticle,
  groupedArticles,
}: {
  title: string;
  articles: ComponentArticle[];
  pinnedArticle: ComponentArticle | null;
  groupedArticles: Record<string, ComponentArticle[]>;
}) {
  const MAX_ITEMS_PER_COLUMN = 8;

  // Track shown article IDs to avoid repeats
  const shownIds = new Set<string | number>();

  // Reserve pinned article first — it always shows in col 2, nowhere else
  const col2Lead = pinnedArticle;
  if (col2Lead) shownIds.add(col2Lead.id);

  // Col 1: "Student Senate" and "Executive Board" kicker articles, ordered by date
  const col1 = articles.filter(
    (a) => !shownIds.has(a.id) && (a.kicker === "Student Senate" || a.kicker === "Executive Board")
  ).slice(0, MAX_ITEMS_PER_COLUMN);
  col1.forEach((a) => shownIds.add(a.id));

  // Col 2: "Campus Infrastructure" and "Press Release" below the pinned lead
  const col2Rest = articles.filter(
    (a) => !shownIds.has(a.id) && (a.kicker === "Campus Infrastructure" || a.kicker === "Press Release")
  ).slice(0, Math.max(0, MAX_ITEMS_PER_COLUMN - (col2Lead ? 1 : 0)));
  col2Rest.forEach((a) => shownIds.add(a.id));

  // Col 3: "Interview", "Town Hall", and "GM Week 2026"
  const col3 = articles.filter(
    (a) => !shownIds.has(a.id) && (a.kicker === "Interview" || a.kicker === "Town Hall" || a.kicker === "GM Week 2026")
  ).slice(0, MAX_ITEMS_PER_COLUMN);
  col3.forEach((a) => shownIds.add(a.id));

  const visibleBottomGroups = Object.entries(newsGroups).filter(
    ([key]) => (groupedArticles[key] || []).length > 0
  );

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-5 pb-8 md:px-[30px]">
      {/* Header */}
      <div className="mt-2 mb-6 md:mt-6 md:mb-10">
        {/* Desktop: single row */}
        <div className="hidden md:flex items-center gap-6">
          <h1 className="font-meta uppercase tracking-[0.04em] text-[#D6001C] dark:text-white transition-colors text-[60px]" style={{ fontWeight: 400, lineHeight: 1 }}>
            {title}
          </h1>
          <span style={{ width: 0, height: 50, flexShrink: 0, borderLeft: "1px solid var(--foreground)" }} />
          <a
            href="mailto:news@poly.rpi.edu,eic@poly.rpi.edu?subject=News%2C%20Request%2FComment"
            className="font-meta uppercase tracking-[0.04em] text-text-main hover:text-accent transition-colors text-[36px]"
            style={{ fontWeight: 300 }}
          >
            Contact
          </a>
        </div>
        {/* Mobile: title then link below, centered */}
        <div className="md:hidden text-center">
          <h1 className="font-meta uppercase tracking-[0.04em] text-[#D6001C] dark:text-white transition-colors text-[44px] sm:text-[52px]" style={{ fontWeight: 400, lineHeight: 1 }}>
            {title}
          </h1>
          <div className="mt-2 flex items-center justify-center gap-3 text-[24px] sm:text-[28px]">
            <a
              href="mailto:news@poly.rpi.edu,eic@poly.rpi.edu?subject=News%2C%20Request%2FComment"
              className="font-meta uppercase tracking-[0.04em] text-text-main hover:text-accent transition-colors"
              style={{ fontWeight: 300 }}
            >
              Contact
            </a>
          </div>
        </div>
      </div>

      {/* ── Mobile: single-column, desktop order ── */}
      <div className="flex flex-col md:hidden">
        {/* Col 2 lead (pinned) first */}
        {col2Lead && <NewsCard article={col2Lead} withImage priority />}
        {/* Col 1: Student Senate & Executive Board */}
        {col1.map((article, i) => (
          <NewsCard key={article.id} article={article} withImage={i === 0} priority={i === 0 && !col2Lead} />
        ))}
        {/* Col 2 rest: Campus Infrastructure & Press Release */}
        {col2Rest.map((article) => (
          <NewsCard key={article.id} article={article} />
        ))}
        {/* Col 3: Interview, Town Hall, GM Week 2026 */}
        {col3.map((article, i) => (
          <NewsCard key={article.id} article={article} withImage={i === 0} />
        ))}
      </div>

      {/* 3-column grid — desktop only */}
      <div className="hidden md:grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: "0 24px" }}>
        {/* ── Col 1: Student Senate & Executive Board ── */}
        <div style={{ borderRight: "1px solid var(--rule-color)", paddingRight: 24 }}>
          {col1.map((article, i) => (
            <NewsCard key={article.id} article={article} withImage={i === 0} priority={i === 0} />
          ))}
        </div>

        {/* ── Col 2: Pinned lead + Campus Infrastructure + Press Release ── */}
        <div style={{ borderRight: "1px solid var(--rule-color)", paddingRight: 24 }}>
          {col2Lead && <NewsCard article={col2Lead} withImage priority />}
          {col2Lead && col2Rest.length > 0 && (
            <div className="border-t border-rule mb-8" />
          )}
          {col2Rest.map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>

        {/* ── Col 3: Interview, Town Hall, GM Week 2026 ── */}
        <div>
          {col3.map((article, i) => (
            <NewsCard key={article.id} article={article} withImage={i === 0} />
          ))}
        </div>
      </div>

      {visibleBottomGroups.length > 0 && <RainbowDivider />}

      {/* ── Bottom sections: Interviews, Student Government, Other News ── */}
      {visibleBottomGroups
        .map(([key, group], index) => {
          const groupArticles = groupedArticles[key] || [];
          return (
          <div key={key} className="mt-14">
            {index > 0 && (
              <AnimatedLine
                id={`section-${index}`}
                delay={250 * index}
                duration={300}
                style={{ marginTop: 24, marginBottom: 8 }}
              />
            )}
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-meta uppercase tracking-[0.04em] text-text-main" style={{ fontSize: 28, fontWeight: 500 }}>
                {group.label}
              </h2>
              <TransitionLink
                href={group.kickers ? `/search?q=${encodeURIComponent(group.kickers[0])}` : `/news`}
                className="font-meta text-[14px] uppercase tracking-[0.08em] text-accent hover:underline transition-colors"
              >
                More &rarr;
              </TransitionLink>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 lg:gap-6">
              {groupArticles.slice(0, 5).map((article) => (
                <TransitionLink
                  key={article.id}
                  href={getArticleUrl(article)}
                  className="group block"
                >
                  {article.image && (
                    <div className="relative overflow-hidden mb-3" style={{ aspectRatio: "3/2" }}>
                      <Image
                        src={article.image}
                        alt={article.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 20vw"
                      />
                    </div>
                  )}
                  {article.kicker && (
                    <span className="font-meta text-[15px] font-medium uppercase tracking-[0.08em] text-text-main dark:text-[#d96b76] block mb-1.5">
                      {article.kicker}
                    </span>
                  )}
                  <h3 className="font-copy font-medium leading-[1.12] text-[28px] text-text-main transition-colors">
                    {article.title}
                  </h3>
                  {article.author && (
                    <div className="mt-2 font-meta text-[13px] font-medium uppercase tracking-[0.04em]">
                      <span className="text-text-muted">BY </span><span className="text-accent dark:text-white">{article.author}</span>
                    </div>
                  )}
                </TransitionLink>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
