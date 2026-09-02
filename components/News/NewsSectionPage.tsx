"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import type { Article as ComponentArticle } from "@/components/FrontPage/types";
import { Byline } from "@/components/FrontPage/Byline";
import { AnimatedLine } from "@/components/Opinion/RainbowDivider";
import {
  BOTTOM_SLOTS,
  COLUMN_COUNT,
  COLUMN_SLOTS,
  DEFAULT_NEWS_LAYOUT_CONTENT,
  TOP_ROW_SLOTS,
  type NewsLayoutContent,
} from "./newsLayout";

/* ── Layout constants — shared with the Features page ── */

const PAGE_SIDE_PADDING = "clamp(16px, 3vw, 30px)";
const COLUMN_GAP = "clamp(16px, 2vw, 24px)";
const SECTION_RULE_GAP = "clamp(18px, 3vw, 24px)";
const SECTION_RULE_INSET = 7;

const NEWS_CONTACT_MAILTO =
  "mailto:news@poly.rpi.edu,eic@poly.rpi.edu?subject=News%2C%20Request%2FComment";

/* ── Article card ── */

function NewsCard({
  article,
  withImage = false,
  priority = false,
  large = false,
  showExcerpt = false,
  hideDate = false,
  compact = false,
}: {
  article: ComponentArticle;
  withImage?: boolean;
  priority?: boolean;
  large?: boolean;
  showExcerpt?: boolean;
  hideDate?: boolean;
  compact?: boolean;
}) {
  return (
    <TransitionLink href={getArticleUrl(article)} className="group block mb-5">
      {withImage && article.image && (
        <div
          className="relative overflow-hidden mb-3 -mx-4 w-auto sm:mx-0 sm:w-full"
          style={{ aspectRatio: large ? "16/9" : "3/2" }}
        >
          <Image
            src={article.image}
            alt={article.imageTitle || ""}
            fill
            className="object-cover"
            sizes={
              large
                ? "(max-width: 640px) 100vw, 55vw"
                : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            }
            priority={priority}
          />
        </div>
      )}
      {article.kicker && (
        <span className="font-meta text-[15px] font-medium uppercase tracking-[0.08em] text-accent dark:text-[#d96b76] block mb-1.5">
          {article.kicker}
        </span>
      )}
      <h3
        className="font-copy font-medium leading-[1.12] text-text-main transition-colors group-hover:text-accent"
        style={{ fontSize: large ? 38 : compact ? 19 : 20 }}
      >
        {article.richTitle || article.title}
      </h3>
      <Byline
        author={article.author}
        date={hideDate ? null : article.date}
        variant="features"
        className="mt-2 text-[13px]"
      />
      {showExcerpt && article.excerpt && (
        <p className="mt-1 font-meta text-[15px] font-medium leading-[1.5] text-text-main line-clamp-4">
          {article.excerpt}
        </p>
      )}
    </TransitionLink>
  );
}

/* ── Headings ── */

function AccentHeading({ title }: { title: string }) {
  return (
    <div style={{ borderTop: "2px solid var(--accent-color)", paddingTop: 4, marginBottom: 16 }}>
      <h2
        className="font-meta uppercase text-accent dark:text-white"
        style={{ fontSize: 17, letterSpacing: "0.08em", fontWeight: 500, margin: "0 0 2px" }}
      >
        {title}
      </h2>
    </div>
  );
}

function ColumnHeading({ title }: { title: string }) {
  return (
    <h2
      className="font-meta uppercase tracking-[0.04em] text-text-main text-center"
      style={{ fontSize: 24, fontWeight: 500, marginTop: 0, marginBottom: 16 }}
    >
      {title}
    </h2>
  );
}

function MobileSectionHeader({ title, href }: { title: string; href?: string }) {
  const heading = href ? (
    <TransitionLink
      href={href}
      className="font-meta text-[20px] font-bold tracking-[0.04em] text-accent dark:text-white uppercase leading-[1] hover:opacity-75 transition-opacity"
    >
      {title}
    </TransitionLink>
  ) : (
    <span className="font-meta text-[20px] font-bold tracking-[0.04em] text-accent dark:text-white uppercase leading-[1]">
      {title}
    </span>
  );

  return (
    <div className="mb-3">
      <div className="relative -left-2 w-[calc(100%+0.5rem)] border-t border-black dark:border-white" />
      <h2 className="mt-4">{heading}</h2>
    </div>
  );
}

function MobileNewsList({
  articles,
  imageFlags,
  hideDates = false,
}: {
  articles: ComponentArticle[];
  imageFlags?: boolean[];
  hideDates?: boolean;
}) {
  return (
    <div className="flex flex-col">
      {articles.map((article, i) => (
        <div key={article.id} className={i > 0 ? "mt-10" : ""}>
          <NewsCard
            article={article}
            withImage={imageFlags ? Boolean(imageFlags[i]) : Boolean(article.image)}
            hideDate={hideDates}
          />
        </div>
      ))}
    </div>
  );
}

/* ── News tip callout ── */

function TipCallout() {
  return (
    <div className="py-6 border-y border-rule text-center">
      <p
        className="font-meta uppercase tracking-[0.04em] text-text-main"
        style={{ fontSize: 19, fontWeight: 500 }}
      >
        Something happening on campus we should{" "}
        <a href={NEWS_CONTACT_MAILTO} className="text-accent hover:underline transition-colors">
          cover
        </a>
        ?
      </p>
    </div>
  );
}

/* ── Empty state ── */

function EmptyState() {
  return (
    <div className="py-16 text-center border-y border-rule">
      <p className="font-copy text-[22px] leading-[1.3] text-text-main">
        No news stories are published right now.
      </p>
      <p className="mt-3 font-meta text-[15px] font-medium leading-[1.5] text-text-muted">
        Our reporters are working on the next issue. In the meantime, read the{" "}
        <TransitionLink href="/news/more-in-news" className="text-accent hover:underline">
          news archive
        </TransitionLink>{" "}
        or{" "}
        <a href={NEWS_CONTACT_MAILTO} className="text-accent hover:underline">
          send us a tip
        </a>
        .
      </p>
    </div>
  );
}

/* ── Main Page ── */

export default function NewsSectionPage({
  title,
  articles,
  layout = DEFAULT_NEWS_LAYOUT_CONTENT,
  hasOlderArticles = false,
}: {
  title: string;
  articles: ComponentArticle[];
  layout?: NewsLayoutContent;
  hasOlderArticles?: boolean;
}) {
  // Curated slots come first; every remaining slot fills from recent news so the
  // page is never half-empty, whatever the editor has (or has not) pinned.
  const filled = useMemo(() => {
    const curatedIds = new Set<string>();
    const note = (a: ComponentArticle | null) => {
      if (a) curatedIds.add(String(a.id));
    };
    note(layout.topStory);
    layout.topRow.forEach(note);
    layout.columns.forEach((col) => col.articles.forEach(note));
    layout.bottom.forEach(note);

    const pool = articles.filter((a) => !curatedIds.has(String(a.id)));
    const takeNext = (count: number): ComponentArticle[] => pool.splice(0, count);

    // Fill a region: curated entries in order, then the newest unused stories.
    const fill = (curated: ComponentArticle[], slots: number): ComponentArticle[] => {
      const result = curated.slice(0, slots);
      if (result.length < slots) result.push(...takeNext(slots - result.length));
      return result;
    };

    const topStory = layout.topStory ?? takeNext(1)[0] ?? null;
    const topRow = fill(layout.topRow, TOP_ROW_SLOTS);
    const columns = layout.columns.slice(0, COLUMN_COUNT).map((col) => ({
      label: col.label,
      images: col.images,
      articles: fill(col.articles, COLUMN_SLOTS),
    }));
    const bottom = fill(layout.bottom, BOTTOM_SLOTS);

    return { topStory, topRow, columns, bottom };
  }, [articles, layout]);

  const { topStory, topRow, columns, bottom } = filled;
  const hasArticles = Boolean(topStory) || topRow.length > 0 || columns.some((c) => c.articles.length > 0);
  const visibleColumns = columns.filter((c) => c.articles.length > 0);

  const sectionColumnStyle = {
    borderRight: "1px solid var(--rule-color)",
    paddingRight: COLUMN_GAP,
  } as const;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: `20px ${PAGE_SIDE_PADDING} 32px` }}>
      {/* Header */}
      <div className="mt-6 mb-8 flex flex-col items-center gap-4 text-center sm:mb-10 lg:flex-row lg:items-center lg:gap-6 lg:text-left">
        <h1
          className="font-meta uppercase tracking-[0.04em] text-[#D6001C] dark:text-white transition-colors text-[44px] sm:text-[52px] lg:text-[60px]"
          style={{ fontWeight: 400, lineHeight: 1 }}
        >
          {title}
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[24px] sm:text-[28px] lg:justify-start lg:text-[36px]">
          <span className="hidden h-10 w-px shrink-0 bg-[var(--foreground-muted)] lg:block" />
          <TransitionLink
            href="/news/more-in-news"
            className="font-meta uppercase tracking-[0.04em] text-text-main hover:text-accent transition-colors"
            style={{ fontWeight: 300 }}
          >
            Archive
          </TransitionLink>
          <span className="font-meta text-text-muted lg:hidden" aria-hidden="true">
            &middot;
          </span>
          <span className="hidden h-10 w-px shrink-0 bg-[var(--foreground-muted)] lg:block" />
          <a
            href={NEWS_CONTACT_MAILTO}
            className="font-meta uppercase tracking-[0.04em] text-text-main hover:text-accent transition-colors"
            style={{ fontWeight: 300 }}
          >
            Contact
          </a>
        </div>
      </div>

      {!hasArticles && <EmptyState />}

      {hasArticles && (
        <>
          {/* ── Mobile / tablet: stacked, desktop reading order ── */}
          <div className="lg:hidden">
            {topStory && <NewsCard article={topStory} withImage large showExcerpt priority />}

            {topRow.length > 0 && (
              <div className="mt-12">
                <MobileSectionHeader title={layout.topRowLabel} />
                <MobileNewsList articles={topRow} imageFlags={layout.topRowImages} hideDates />
              </div>
            )}

            {visibleColumns.map((column, i) => (
              <div className="mt-12" key={`m-col-${i}`}>
                <MobileSectionHeader title={column.label} />
                <MobileNewsList articles={column.articles} imageFlags={column.images} />
              </div>
            ))}

            <div className="mt-12">
              <TipCallout />
            </div>

            {(bottom.length > 0 || hasOlderArticles) && (
              <div className="mt-12">
                <MobileSectionHeader title={layout.bottomLabel} href="/news/more-in-news" />
                <MobileNewsList articles={bottom} />
              </div>
            )}
          </div>

          {/* ── Desktop ── */}
          <div className="hidden lg:block">
            {/* Top row: pinned Top Story on the left, a row of curated articles beside it */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 1fr)",
                gap: `0 ${COLUMN_GAP}`,
              }}
            >
              <div style={topRow.length > 0 ? sectionColumnStyle : undefined}>
                {topStory && <NewsCard article={topStory} withImage large priority showExcerpt />}
              </div>

              {topRow.length > 0 && (
                <div>
                  <AccentHeading title={layout.topRowLabel} />
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${Math.min(topRow.length, TOP_ROW_SLOTS)}, minmax(0, 1fr))`,
                      gap: `0 ${COLUMN_GAP}`,
                    }}
                  >
                    {topRow.map((article, i) => (
                      <NewsCard
                        key={article.id}
                        article={article}
                        withImage={Boolean(layout.topRowImages[i]) && Boolean(article.image)}
                        compact
                        hideDate
                      />
                    ))}
                  </div>
                  <div className="mt-2">
                    <TipCallout />
                  </div>
                </div>
              )}
            </div>

            {/* Rule under the top row */}
            {visibleColumns.length > 0 && (
              <div
                style={{
                  borderTop: "1px solid var(--text-main, #1a1a1a)",
                  marginTop: SECTION_RULE_GAP,
                  marginBottom: SECTION_RULE_GAP,
                }}
              />
            )}

            {/* Three renamable columns */}
            {visibleColumns.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(0, 1fr))`,
                  gap: `0 ${COLUMN_GAP}`,
                }}
              >
                {visibleColumns.map((column, i) => (
                  <div
                    key={`col-${i}`}
                    style={i < visibleColumns.length - 1 ? sectionColumnStyle : undefined}
                  >
                    <div
                      style={{
                        marginRight: i < visibleColumns.length - 1 ? SECTION_RULE_INSET : 0,
                        marginLeft: i > 0 ? SECTION_RULE_INSET : 0,
                      }}
                    >
                      <ColumnHeading title={column.label} />
                    </div>
                    {column.articles.map((article, j) => (
                      <NewsCard
                        key={article.id}
                        article={article}
                        withImage={Boolean(column.images[j]) && Boolean(article.image)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Bottom strip — the free drag area from the editor */}
            {(bottom.length > 0 || hasOlderArticles) && (
              <div className="mt-12">
                <AnimatedLine
                  id="news-more"
                  delay={0}
                  duration={300}
                  style={{ marginTop: SECTION_RULE_GAP, marginBottom: 8 }}
                />
                <div className="flex items-baseline justify-between mb-4">
                  <h2
                    className="font-meta uppercase tracking-[0.04em] text-text-main"
                    style={{ fontSize: 28, fontWeight: 500 }}
                  >
                    {layout.bottomLabel}
                  </h2>
                  <TransitionLink
                    href="/news/more-in-news"
                    className="font-meta text-[14px] uppercase tracking-[0.08em] text-accent hover:underline transition-colors"
                  >
                    More &rarr;
                  </TransitionLink>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${BOTTOM_SLOTS}, minmax(0, 1fr))`,
                    gap: 24,
                  }}
                >
                  {bottom.map((article) => (
                    <TransitionLink
                      key={article.id}
                      href={getArticleUrl(article)}
                      className="group block"
                    >
                      {article.image && (
                        <div className="relative overflow-hidden mb-3" style={{ aspectRatio: "3/2" }}>
                          <Image
                            src={article.image}
                            alt={article.imageTitle || ""}
                            fill
                            className="object-cover"
                            sizes="20vw"
                          />
                        </div>
                      )}
                      {article.kicker && (
                        <span className="font-meta text-[15px] font-medium uppercase tracking-[0.08em] text-accent dark:text-[#d96b76] block mb-1.5">
                          {article.kicker}
                        </span>
                      )}
                      <h3 className="font-copy font-medium leading-[1.12] text-[24px] text-text-main transition-colors group-hover:text-accent">
                        {article.richTitle || article.title}
                      </h3>
                      <Byline author={article.author} variant="features" className="mt-2 text-[13px]" />
                    </TransitionLink>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
