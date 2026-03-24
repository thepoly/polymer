"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import { opinionTypeLabels } from "./opinionTypeLabels";
import AuthorSpotlightCarousel, {
  type SpotlightAuthor,
} from "./AuthorSpotlightCarousel";
import type { QuoteData } from "./InlineQuote";
import EditorsChoice from "./EditorsChoice";
import { opinionGroups } from "./opinionGroups";
import RainbowDivider, { AnimatedLine } from "./RainbowDivider";
import type { Article as ComponentArticle } from "@/components/FrontPage/types";
import type { Article as PayloadArticle, User, Media } from "@/payload-types";

function isPopulatedUser(author: number | User): author is User {
  return typeof author !== "number" && "firstName" in author;
}

/* ── Article card — optionally shows image ── */

function OpinionCard({ article, withImage = false, priority = false }: { article: ComponentArticle; withImage?: boolean; priority?: boolean }) {
  const typeLabel =
    opinionTypeLabels[article.opinionType || "opinion"] || "Opinion";

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
      {/* Opinion type — lighter weight, accent color, slightly bigger than byline */}
      <span className="font-meta text-[15px] font-medium uppercase tracking-[0.08em] text-accent block mb-1.5">
        {typeLabel}
      </span>
      {/* Title — largest, dominant */}
      <h3 className="font-copy font-medium leading-[1.12] text-[28px] text-text-main transition-colors">
        {article.title}
      </h3>
      {/* Byline — "BY" is muted, author name is accent */}
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
      {/* Subdeck — readable but smaller than title, generous bottom margin for spacing */}
      {article.excerpt && (
        <p className="mt-0.5 font-meta text-[15px] font-medium leading-[1.5] text-text-main line-clamp-4">
          {article.excerpt}
        </p>
      )}
    </TransitionLink>
  );
}

/* ── Main Page ── */

export default function OpinionSectionPage({
  title,
  articles,
  rawArticles,
  editorsChoiceArticles,
  editorsChoiceLabel,
  groupedArticles,
}: {
  title: string;
  articles: ComponentArticle[];
  rawArticles: PayloadArticle[];
  editorsChoiceArticles: ComponentArticle[];
  editorsChoiceLabel: string;
  quotes: QuoteData[];
  groupedArticles: Record<string, ComponentArticle[]>;
}) {
  const spotlightAuthors = useMemo(() => {
    const authorMap = new Map<
      number,
      {
        user: User;
        count: number;
        latestArticle: { title: string; url: string };
      }
    >();

    for (const raw of rawArticles) {
      if (!raw.authors) continue;
      for (const author of raw.authors) {
        if (!isPopulatedUser(author)) continue;
        const existing = authorMap.get(author.id);
        if (existing) {
          existing.count += 1;
        } else {
          authorMap.set(author.id, {
            user: author,
            count: 1,
            latestArticle: {
              title: raw.title,
              url: getArticleUrl({
                section: raw.section,
                slug: raw.slug,
                publishedDate: raw.publishedDate,
                createdAt: raw.createdAt,
              }),
            },
          });
        }
      }
    }

    const real = Array.from(authorMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map<SpotlightAuthor>((entry) => {
        const { user } = entry;
        const headshot =
          user.headshot && typeof user.headshot !== "number"
            ? (user.headshot as Media).url || null
            : null;
        return {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          headshot,
          latestArticle: entry.latestArticle,
        };
      });

    // TODO: Remove placeholder authors — for preview only
    if (real.length < 4) {
      const placeholders: SpotlightAuthor[] = [
        { id: -1, name: "Maya Chen", headshot: null, latestArticle: { title: "Why Student Government Matters More Than You Think", url: "/opinion" } },
        { id: -2, name: "Derek Miller", headshot: null, latestArticle: { title: "A Republican Walks Into a Bar", url: "/opinion" } },
        { id: -3, name: "Priya Sharma", headshot: null, latestArticle: { title: "Grade Deflation Will Be Good For Us", url: "/opinion" } },
        { id: -4, name: "James O'Brien", headshot: null, latestArticle: { title: "The Ethics of Capping Grades", url: "/opinion" } },
        { id: -5, name: "Sofia Ruiz", headshot: null, latestArticle: { title: "What RPI Gets Wrong About Free Speech", url: "/opinion" } },
      ];
      return [...real, ...placeholders.slice(0, 6 - real.length)];
    }

    return real;
  }, [rawArticles]);

  const editorsChoiceIds = new Set(
    editorsChoiceArticles.map((a) => String(a.id))
  );
  const mainArticles = articles.filter(
    (a) => !editorsChoiceIds.has(String(a.id))
  );

  // Col1: image, text, text, CTA, text, text      → 5 articles (indices 0-4)
  // Col2: text, carousel, text, image, text       → 4 articles (indices 5-8)
  // Col3: most read, text, text, text, image      → 4 articles (indices 9-12)
  const col1 = mainArticles.slice(0, 5);
  const col2 = mainArticles.slice(5, 9);
  const col3 = mainArticles.slice(9, 13);

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
          <TransitionLink href="/submit" className="font-meta uppercase tracking-[0.04em] text-text-main hover:text-accent transition-colors text-[36px]" style={{ fontWeight: 300 }}>
            Submit
          </TransitionLink>
          <span style={{ width: 0, height: 50, flexShrink: 0, borderLeft: "1px solid var(--foreground)" }} />
          <TransitionLink href="/contact" className="font-meta uppercase tracking-[0.04em] text-text-main hover:text-accent transition-colors text-[36px]" style={{ fontWeight: 300 }}>
            Contact
          </TransitionLink>
        </div>
        {/* Mobile: title then links below, centered */}
        <div className="md:hidden text-center">
          <h1 className="font-meta uppercase tracking-[0.04em] text-[#D6001C] dark:text-white transition-colors text-[36px]" style={{ fontWeight: 400, lineHeight: 1 }}>
            {title}
          </h1>
          <div className="flex items-center justify-center gap-3 mt-2">
            <TransitionLink href="/submit" className="font-meta uppercase tracking-[0.04em] text-text-main hover:text-accent transition-colors text-[18px]" style={{ fontWeight: 300 }}>
              Submit
            </TransitionLink>
            <span className="text-text-muted">&bull;</span>
            <TransitionLink href="/contact" className="font-meta uppercase tracking-[0.04em] text-text-main hover:text-accent transition-colors text-[18px]" style={{ fontWeight: 300 }}>
              Contact
            </TransitionLink>
          </div>
        </div>
      </div>

      {/* ── Mobile: single-column, desktop order ── */}
      <div className="flex flex-col md:hidden">
        {/* Col 1 articles */}
        {col1[0] && <OpinionCard article={col1[0]} withImage priority />}
        {col1[1] && <OpinionCard article={col1[1]} />}
        {col1[2] && <OpinionCard article={col1[2]} />}
        {/* Guest writer CTA */}
        <div className="py-7 border-y border-rule mb-8">
          <p className="font-copy text-[19px] leading-[1.5] text-text-main">
            Interested in being a guest writer?{" "}
            <TransitionLink href="/submit" className="text-accent hover:underline transition-colors">
              Learn more.
            </TransitionLink>
          </p>
        </div>
        {col1[3] && <OpinionCard article={col1[3]} />}
        {col1[4] && <OpinionCard article={col1[4]} />}
        {/* Col 2 articles */}
        {col2[0] && <OpinionCard article={col2[0]} />}
        {spotlightAuthors.length > 0 && (
          <AuthorSpotlightCarousel authors={spotlightAuthors} />
        )}
        {col2[1] && <OpinionCard article={col2[1]} />}
        {col2[2] && <OpinionCard article={col2[2]} withImage />}
        {col2[3] && <OpinionCard article={col2[3]} />}
        {/* Col 3 articles */}
        {editorsChoiceArticles.length > 0 && (
          <div className="mb-3">
            <EditorsChoice articles={editorsChoiceArticles} label={editorsChoiceLabel} />
          </div>
        )}
        {col3[0] && <OpinionCard article={col3[0]} />}
        {col3[1] && <OpinionCard article={col3[1]} />}
        {col3[2] && <OpinionCard article={col3[2]} />}
        {col3[3] && <OpinionCard article={col3[3]} withImage />}
      </div>

      {/* 3-column grid — desktop only */}
      <div className="hidden md:grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: "0 24px", alignItems: "start" }}>
        {/* ── Col 1: image, text, text, CTA, text ── */}
        <div style={{ borderRight: "1px solid var(--rule-color)", paddingRight: 24 }}>
          {col1[0] && <OpinionCard article={col1[0]} withImage priority />}
          {col1[1] && <OpinionCard article={col1[1]} />}
          {col1[2] && <OpinionCard article={col1[2]} />}

          {/* Guest writer CTA */}
          <div className="py-7 border-y border-rule" style={{ marginBottom: 30 }}>
            <p className="font-copy text-[19px] leading-[1.5] text-text-main">
              Interested in being a guest writer?{" "}
              <TransitionLink
                href="/submit"
                className="text-accent hover:underline transition-colors"
              >
                Learn more.
              </TransitionLink>
            </p>
          </div>

          {col1[3] && <OpinionCard article={col1[3]} />}
          {col1[4] && <OpinionCard article={col1[4]} />}
        </div>

        {/* ── Col 2: text, carousel, text, image, text ── */}
        <div style={{ borderRight: "1px solid var(--rule-color)", paddingRight: 24 }}>
          {col2[0] && <OpinionCard article={col2[0]} />}

          {spotlightAuthors.length > 0 && (
            <AuthorSpotlightCarousel authors={spotlightAuthors} />
          )}

          {col2[1] && <OpinionCard article={col2[1]} />}
          {col2[2] && <OpinionCard article={col2[2]} withImage />}
          {col2[3] && <OpinionCard article={col2[3]} />}
        </div>

        {/* ── Col 3: most read, text, text, text, image ── */}
        <div>
          {editorsChoiceArticles.length > 0 && (
            <div className="mb-3">
              <EditorsChoice
                articles={editorsChoiceArticles}
                label={editorsChoiceLabel}
              />
            </div>
          )}

          {col3[0] && <OpinionCard article={col3[0]} />}
          {col3[1] && <OpinionCard article={col3[1]} />}
          {col3[2] && <OpinionCard article={col3[2]} />}
          {col3[3] && <OpinionCard article={col3[3]} withImage />}
        </div>
      </div>

      <RainbowDivider />

      {/* ── Bottom sections: Editorials, Other, More in Opinion ── */}
      {Object.entries(opinionGroups).map(([key, group], index) => {
        const groupArticles = groupedArticles[key] || [];
        if (groupArticles.length === 0) return null;
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
                href={`/opinion/${group.slug}`}
                className="font-meta text-[14px] uppercase tracking-[0.08em] text-accent hover:underline transition-colors"
              >
                More &rarr;
              </TransitionLink>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 lg:gap-6">
              {groupArticles.slice(0, 5).map((article) => {
                const typeLabel = opinionTypeLabels[article.opinionType || "opinion"] || "Opinion";
                return (
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
                    <span className="font-meta text-[15px] font-medium uppercase tracking-[0.08em] text-text-main block mb-1.5">
                      {typeLabel}
                    </span>
                    <h3 className="font-copy font-medium leading-[1.12] text-[28px] text-text-main transition-colors">
                      {article.title}
                    </h3>
                    {article.author && (
                      <div className="mt-2 font-meta text-[13px] font-medium uppercase tracking-[0.04em]">
                        <span className="text-text-muted">BY </span><span className="text-accent dark:text-white">{article.author}</span>
                      </div>
                    )}
                  </TransitionLink>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
