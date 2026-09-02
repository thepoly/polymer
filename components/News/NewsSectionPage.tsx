"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import type { Article as ComponentArticle } from "@/components/FrontPage/types";
import { Byline } from "@/components/FrontPage/Byline";
import { AnimatedLine } from "@/components/Opinion/RainbowDivider";
import { newsCategories } from "./newsCategories";

/* ── Layout constants — shared with the Features page ── */

const PAGE_SIDE_PADDING = "clamp(16px, 3vw, 30px)";
const COLUMN_GAP = "clamp(16px, 2vw, 24px)";
const SECTION_RULE_GAP = "clamp(18px, 3vw, 24px)";
const SECTION_RULE_INSET = 7;
const LOWER_SECTION_EXTRA_TOP_SPACE = 8;

const NEWS_CONTACT_MAILTO =
  "mailto:news@poly.rpi.edu,eic@poly.rpi.edu?subject=News%2C%20Request%2FComment";

/* ── Article card — optionally shows image ── */

function NewsCard({
  article,
  withImage = false,
  priority = false,
  large = false,
  showExcerpt = false,
  hideDate = false,
}: {
  article: ComponentArticle;
  withImage?: boolean;
  priority?: boolean;
  large?: boolean;
  showExcerpt?: boolean;
  hideDate?: boolean;
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
                ? "(max-width: 640px) 100vw, 50vw"
                : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
        style={{ fontSize: large ? 34 : 20 }}
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
        <p className="mt-0.5 font-meta text-[15px] font-medium leading-[1.5] text-text-main line-clamp-4">
          {article.excerpt}
        </p>
      )}
    </TransitionLink>
  );
}

/* ── Category heading with the accent rule above it (Row 1) ── */

function ColumnHeading({ title }: { title: string }) {
  return (
    <div
      style={{
        borderTop: "2px solid var(--accent-color)",
        paddingTop: 4,
        marginBottom: 16,
      }}
    >
      <h2
        className="font-meta uppercase text-accent dark:text-white"
        style={{
          fontSize: 17,
          letterSpacing: "0.08em",
          fontWeight: 500,
          margin: "0 0 2px",
        }}
      >
        {title}
      </h2>
    </div>
  );
}

/* ── Mobile section header ── */

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
  largeFirst = false,
  showExcerptFirst = false,
  hideDates = false,
  priorityFirst = false,
}: {
  articles: ComponentArticle[];
  largeFirst?: boolean;
  showExcerptFirst?: boolean;
  hideDates?: boolean;
  priorityFirst?: boolean;
}) {
  return (
    <div className="flex flex-col">
      {articles.map((article, i) => (
        <div key={article.id} className={i > 0 ? "mt-10" : ""}>
          <NewsCard
            article={article}
            withImage={Boolean(article.image)}
            large={largeFirst && i === 0}
            showExcerpt={showExcerptFirst && i === 0}
            hideDate={hideDates}
            priority={priorityFirst && i === 0}
          />
        </div>
      ))}
    </div>
  );
}

/* ── News tip callout (sits where Features puts its event CTA) ── */

function TipCallout() {
  return (
    <div className="py-8 border-y border-rule text-center" style={{ marginBottom: 30 }}>
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

/* ── Empty state — masthead, heading and links still render around it ── */

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

type Bucket = { label: string | null; items: ComponentArticle[] };

export default function NewsSectionPage({
  title,
  articles,
  pinnedArticles = [],
  hasOlderArticles = false,
}: {
  title: string;
  articles: ComponentArticle[];
  pinnedArticles?: ComponentArticle[];
  hasOlderArticles?: boolean;
}) {
  const buckets = useMemo(() => {
    const pinnedIds = new Set(pinnedArticles.map((a) => String(a.id)));

    // Pins lead the page; everything else backs the columns in date order.
    const pool: ComponentArticle[] = [
      ...pinnedArticles.slice(4),
      ...articles.filter((a) => !pinnedIds.has(String(a.id))),
    ];

    const takeNext = (count: number): ComponentArticle[] => pool.splice(0, count);

    // A category column takes its own kickers first, then tops up from the pool so
    // it is never left half-empty. With no matches at all it drops its heading and
    // simply carries more news, rather than labelling unrelated stories.
    const takeCategory = (key: keyof typeof newsCategories, count: number): Bucket => {
      const { label, kickers } = newsCategories[key];
      const items: ComponentArticle[] = [];

      for (let i = 0; i < pool.length && items.length < count; i += 1) {
        if (pool[i].kicker && (kickers as readonly string[]).includes(pool[i].kicker as string)) {
          items.push(pool.splice(i, 1)[0]);
          i -= 1;
        }
      }

      const matched = items.length > 0;
      items.push(...takeNext(count - items.length));

      return { label: matched ? label : null, items };
    };

    // Middle column leads with the curated pins, topped up from the pool.
    const lead = [...pinnedArticles.slice(0, 4)];
    if (lead.length < 4) lead.push(...takeNext(4 - lead.length));

    const studentGov = takeCategory("studentGov", 3);
    const campusInfrastructure = takeCategory("campusInfrastructure", 5);
    const interviews = takeCategory("interviews", 3);
    const pressReleases = takeCategory("pressReleases", 3);
    const otherNews = takeNext(3);
    const more = takeNext(5);

    return {
      lead,
      studentGov,
      campusInfrastructure,
      interviews,
      pressReleases,
      otherNews,
      more,
    };
  }, [articles, pinnedArticles]);

  const {
    lead,
    studentGov,
    campusInfrastructure,
    interviews,
    pressReleases,
    otherNews,
    more,
  } = buckets;

  const hasArticles = articles.length > 0 || pinnedArticles.length > 0;
  const hasLowerRow =
    interviews.items.length > 0 || otherNews.length > 0 || pressReleases.items.length > 0;

  const sectionColumnStyle = {
    borderRight: "1px solid var(--rule-color)",
    paddingRight: COLUMN_GAP,
  } as const;

  const getSectionBreakRuleStyle = (insetLeft = 0, insetRight = 0) =>
    ({
      borderTop: "1px solid var(--text-main, #1a1a1a)",
      marginTop: `calc(${SECTION_RULE_GAP} + ${LOWER_SECTION_EXTRA_TOP_SPACE}px)`,
      marginLeft: insetLeft,
      marginRight: insetRight,
    }) as const;

  const getSectionHeadingWrapStyle = (insetLeft = 0, insetRight = 0) =>
    ({
      marginLeft: insetLeft,
      marginRight: insetRight,
      paddingTop: SECTION_RULE_GAP,
    }) as const;

  const lowerHeadingClass = "font-meta uppercase tracking-[0.04em] text-text-main text-center";
  const lowerHeadingStyle = {
    fontSize: 28,
    fontWeight: 500,
    marginTop: 0,
    marginBottom: 16,
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
            {lead.length > 0 && (
              <MobileNewsList articles={lead} largeFirst showExcerptFirst priorityFirst />
            )}

            {studentGov.items.length > 0 && (
              <div className="mt-12">
                {studentGov.label && <MobileSectionHeader title={studentGov.label} />}
                <MobileNewsList articles={studentGov.items} hideDates />
              </div>
            )}

            {campusInfrastructure.items.length > 0 && (
              <div className="mt-12">
                {campusInfrastructure.label && (
                  <MobileSectionHeader title={campusInfrastructure.label} />
                )}
                <MobileNewsList articles={campusInfrastructure.items} />
              </div>
            )}

            {interviews.items.length > 0 && (
              <div className="mt-12">
                {interviews.label && <MobileSectionHeader title={interviews.label} />}
                <MobileNewsList articles={interviews.items} hideDates />
              </div>
            )}

            {otherNews.length > 0 && (
              <div className="mt-12">
                <MobileSectionHeader title={newsCategories.otherNews.label} />
                <MobileNewsList articles={otherNews} />
              </div>
            )}

            {pressReleases.items.length > 0 && (
              <div className="mt-12">
                {pressReleases.label && <MobileSectionHeader title={pressReleases.label} />}
                <MobileNewsList articles={pressReleases.items} />
              </div>
            )}

            {(more.length > 0 || hasOlderArticles) && (
              <div className="mt-12">
                <MobileSectionHeader title="More in News" href="/news/more-in-news" />
                <MobileNewsList articles={more} />
              </div>
            )}
          </div>

          {/* Single grid — vertical rules run continuously, horizontal rule breaks at intersections */}
          <div
            className="hidden lg:grid"
            style={{
              gridTemplateColumns: "240px 1fr 320px",
              gap: `0 ${COLUMN_GAP}`,
            }}
          >
            {/* ══ Row 1 ══ */}

            {/* ── Left column: Student Government ── */}
            <div style={sectionColumnStyle}>
              {studentGov.label && <ColumnHeading title={studentGov.label} />}
              {studentGov.items[0] && (
                <NewsCard
                  article={studentGov.items[0]}
                  withImage={Boolean(studentGov.items[0].image)}
                  priority
                  hideDate
                />
              )}
              {studentGov.items[1] && (
                <NewsCard
                  article={studentGov.items[1]}
                  withImage={Boolean(studentGov.items[1].image)}
                  hideDate
                />
              )}

              <TipCallout />

              {studentGov.items[2] && (
                <NewsCard
                  article={studentGov.items[2]}
                  withImage={Boolean(studentGov.items[2].image)}
                  hideDate
                />
              )}
            </div>

            {/* ── Middle column: lead story ── */}
            <div style={sectionColumnStyle}>
              {lead[0] && <NewsCard article={lead[0]} withImage large priority showExcerpt />}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0 20px",
                }}
              >
                {lead[1] && <NewsCard article={lead[1]} withImage />}
                {lead[2] && <NewsCard article={lead[2]} withImage />}
              </div>

              {/* Wide article: text left, image right */}
              {lead[3] && (
                <TransitionLink
                  href={getArticleUrl(lead[3])}
                  className="group"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 24,
                    alignItems: "start",
                    marginTop: 8,
                  }}
                >
                  <div>
                    {lead[3].kicker && (
                      <span className="font-meta text-[15px] font-medium uppercase tracking-[0.08em] text-accent dark:text-[#d96b76] block mb-1.5">
                        {lead[3].kicker}
                      </span>
                    )}
                    <h2
                      className="font-copy font-medium leading-[1.12] text-text-main transition-colors group-hover:text-accent"
                      style={{ fontSize: 28 }}
                    >
                      {lead[3].richTitle || lead[3].title}
                    </h2>
                    <Byline
                      author={lead[3].author}
                      date={lead[3].date}
                      variant="features"
                      className="mt-2 text-[13px]"
                    />
                    {lead[3].excerpt && (
                      <p className="mt-2 font-meta text-[15px] font-medium leading-[1.5] text-text-muted line-clamp-3">
                        {lead[3].excerpt}
                      </p>
                    )}
                  </div>
                  {lead[3].image && (
                    <div className="relative overflow-hidden" style={{ aspectRatio: "3/2" }}>
                      <Image
                        src={lead[3].image}
                        alt={lead[3].imageTitle || ""}
                        fill
                        className="object-cover"
                        sizes="40vw"
                      />
                    </div>
                  )}
                </TransitionLink>
              )}
            </div>

            {/* ── Right column: Campus Infrastructure ── */}
            <div>
              {campusInfrastructure.label && (
                <ColumnHeading title={campusInfrastructure.label} />
              )}
              {campusInfrastructure.items.map((article, i) => (
                <NewsCard
                  key={article.id}
                  article={article}
                  withImage={i === 0 && Boolean(article.image)}
                />
              ))}
            </div>

            {/* ══ Row 2 — borderTop per cell draws the horizontal rule with gaps at the vertical intersections ══ */}

            {hasLowerRow && (
              <>
                {/* ── Left column: Interviews ── */}
                <div style={sectionColumnStyle}>
                  <div style={getSectionBreakRuleStyle(0, SECTION_RULE_INSET)} />
                  {interviews.items.length > 0 && (
                    <>
                      {interviews.label && (
                        <div style={getSectionHeadingWrapStyle(0, SECTION_RULE_INSET)}>
                          <h2 className={lowerHeadingClass} style={lowerHeadingStyle}>
                            {interviews.label}
                          </h2>
                        </div>
                      )}
                      <div style={interviews.label ? undefined : { paddingTop: SECTION_RULE_GAP }}>
                        {interviews.items.map((article) => (
                          <NewsCard
                            key={article.id}
                            article={article}
                            withImage={Boolean(article.image)}
                            hideDate
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* ── Middle column: Other News ── */}
                <div style={sectionColumnStyle}>
                  <div style={getSectionBreakRuleStyle(SECTION_RULE_INSET, SECTION_RULE_INSET)} />
                  {otherNews.length > 0 && (
                    <div style={{ paddingTop: SECTION_RULE_GAP }}>
                      <h2 className={lowerHeadingClass} style={lowerHeadingStyle}>
                        {newsCategories.otherNews.label}
                      </h2>
                      {otherNews[0] && <NewsCard article={otherNews[0]} withImage large showExcerpt />}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "0 20px",
                        }}
                      >
                        {otherNews[1] && <NewsCard article={otherNews[1]} withImage />}
                        {otherNews[2] && <NewsCard article={otherNews[2]} withImage />}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Right column: Press Releases ── */}
                <div>
                  <div style={getSectionBreakRuleStyle(SECTION_RULE_INSET, 0)} />
                  {pressReleases.items.length > 0 && (
                    <>
                      {pressReleases.label && (
                        <div style={getSectionHeadingWrapStyle(SECTION_RULE_INSET, 0)}>
                          <h2 className={lowerHeadingClass} style={lowerHeadingStyle}>
                            {pressReleases.label}
                          </h2>
                        </div>
                      )}
                      <div
                        style={pressReleases.label ? undefined : { paddingTop: SECTION_RULE_GAP }}
                      >
                        {pressReleases.items.map((article) => (
                          <NewsCard
                            key={article.id}
                            article={article}
                            withImage={Boolean(article.image)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── More in News ── */}
          {(more.length > 0 || hasOlderArticles) && (
            <div className="mt-14 hidden lg:block">
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
                  More in News
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
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: 24,
                }}
              >
                {more.map((article) => (
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
                    <h3 className="font-copy font-medium leading-[1.12] text-[28px] text-text-main transition-colors group-hover:text-accent">
                      {article.richTitle || article.title}
                    </h3>
                    <Byline author={article.author} variant="features" className="mt-2 text-[13px]" />
                  </TransitionLink>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
