"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import { opinionTypeLabels } from "./opinionTypeLabels";
import AuthorSpotlightCarousel, {
  type SpotlightAuthor,
} from "./AuthorSpotlightCarousel";
import EditorsChoice from "./EditorsChoice";
import { opinionGroups } from "./opinionGroups";
import RainbowDivider, { AnimatedLine } from "./RainbowDivider";
import type { Article as ComponentArticle } from "@/components/FrontPage/types";
import type { Article as PayloadArticle, User, Media } from "@/payload-types";
import { Byline } from "@/components/FrontPage/Byline";

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
        <div className="relative overflow-hidden mb-3 -mx-4 w-auto sm:mx-0 sm:w-full" style={{ aspectRatio: "3/2" }}>
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
          />
        </div>
      )}
      {/* Opinion type — lighter weight, accent color, slightly bigger than byline */}
      <span className="font-meta text-[15px] font-medium uppercase tracking-[0.08em] text-accent dark:text-[#d96b76] block mb-1.5">
        {typeLabel}
      </span>
      {/* Title — largest, dominant */}
      <h3 className="font-copy font-medium leading-[1.12] text-[25px] sm:text-[28px] text-text-main transition-colors">
        {article.title}
      </h3>
      {/* Byline — "BY" is muted, author name is accent */}
      <Byline author={article.author} date={article.date} className="mt-2 text-[13px]" />
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
  pinnedCol1,
  pinnedCol2,
  pinnedCol3,
  editorsChoiceArticles,
  editorsChoiceLabel,
  groupedArticles,
  pinnedSpotlightAuthors,
}: {
  title: string;
  articles: ComponentArticle[];
  rawArticles: PayloadArticle[];
  pinnedCol1: ComponentArticle[];
  pinnedCol2: ComponentArticle[];
  pinnedCol3: ComponentArticle[];
  editorsChoiceArticles: ComponentArticle[];
  editorsChoiceLabel: string;
  groupedArticles: Record<string, ComponentArticle[]>;
  pinnedSpotlightAuthors?: SpotlightAuthor[];
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

    return real;
  }, [rawArticles]);

  // Build a set of all pinned/EC IDs so we can exclude them from auto-fill
  const pinnedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of [...pinnedCol1, ...pinnedCol2, ...pinnedCol3, ...editorsChoiceArticles]) {
      ids.add(String(a.id));
    }
    return ids;
  }, [pinnedCol1, pinnedCol2, pinnedCol3, editorsChoiceArticles]);

  // Auto-fill pool: articles not already pinned
  const autoFillPool = useMemo(() =>
    articles.filter((a) => !pinnedIds.has(String(a.id))),
    [articles, pinnedIds]
  );

  // Fill each column: pinned first, then auto-fill to reach slot count
  const { col1, col2, col3 } = useMemo(() => {
    const fillColumn = (pinned: ComponentArticle[], slotCount: number, ref: { idx: number }): ComponentArticle[] => {
      const result: ComponentArticle[] = [...pinned];
      while (result.length < slotCount && ref.idx < autoFillPool.length) {
        result.push(autoFillPool[ref.idx++]);
      }
      return result;
    };
    const ref = { idx: 0 };
    return {
      col1: fillColumn(pinnedCol1, 5, ref),
      col2: fillColumn(pinnedCol2, 4, ref),
      col3: fillColumn(pinnedCol3, 4, ref),
    };
  }, [pinnedCol1, pinnedCol2, pinnedCol3, autoFillPool]);

  const hasSpotlightAuthors =
    spotlightAuthors.length > 0 ||
    Boolean(pinnedSpotlightAuthors && pinnedSpotlightAuthors.length > 0);

  const mobileOrderedArticles = [
    col1[0],
    col1[1],
    col1[2],
    col1[3],
    col1[4],
    col2[0],
    col2[1],
    col2[2],
    col2[3],
    col3[0],
    col3[1],
    col3[2],
    col3[3],
  ].filter((article): article is ComponentArticle => Boolean(article));

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-5 pb-8 md:px-[30px]">
      {/* Header */}
      <div className="mt-6 mb-8 flex flex-col items-center gap-4 text-center sm:mb-10 lg:flex-row lg:items-center lg:gap-6 lg:text-left">
        <h1 className="font-meta uppercase tracking-[0.04em] text-[#D6001C] dark:text-white transition-colors text-[44px] sm:text-[52px] lg:text-[60px]" style={{ fontWeight: 400, lineHeight: 1 }}>
          {title}
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[24px] sm:text-[28px] lg:justify-start lg:text-[36px]">
          <span className="hidden h-10 w-px shrink-0 bg-[var(--foreground-muted)] lg:block" />
          <TransitionLink href="/submit" className="font-meta uppercase tracking-[0.04em] text-text-main hover:text-accent transition-colors" style={{ fontWeight: 300 }}>
            Submit
          </TransitionLink>
          <span className="font-meta text-text-muted lg:hidden" aria-hidden="true">
            &middot;
          </span>
          <span className="hidden h-10 w-px shrink-0 bg-[var(--foreground-muted)] lg:block" />
          <a href="mailto:edop@poly.rpi.edu" className="font-meta uppercase tracking-[0.04em] text-text-main hover:text-accent transition-colors" style={{ fontWeight: 300 }}>
            Contact
          </a>
        </div>
      </div>

      <div className="lg:hidden">
        {mobileOrderedArticles.slice(0, 2).map((article, index) => (
          <OpinionCard
            key={`mobile-top-${article.id}`}
            article={article}
            withImage={index === 0}
            priority={index === 0}
          />
        ))}

        {hasSpotlightAuthors && (
          <div className="mb-10">
            <AuthorSpotlightCarousel authors={spotlightAuthors} pinnedAuthors={pinnedSpotlightAuthors} />
          </div>
        )}

        {mobileOrderedArticles.slice(2, 5).map((article) => (
          <OpinionCard key={`mobile-middle-${article.id}`} article={article} />
        ))}

        {editorsChoiceArticles.length > 0 && (
          <div className="mb-6">
            <EditorsChoice
              articles={editorsChoiceArticles}
              label={editorsChoiceLabel}
            />
          </div>
        )}

        {mobileOrderedArticles.slice(5).map((article) => (
          <OpinionCard key={`mobile-rest-${article.id}`} article={article} />
        ))}
      </div>

      {/* 3-column grid — inline styles to guarantee layout */}
      <div
        className="hidden lg:grid lg:grid-cols-3"
        style={{
          columnGap: 24,
        }}
      >
        {/* ── Col 1: image, text, text, CTA, text, text ── */}
        <div className="lg:border-r lg:border-rule lg:pr-6">
          {col1[0] && <OpinionCard article={col1[0]} withImage priority />}
          {col1[1] && <OpinionCard article={col1[1]} />}
          {col1[2] && <OpinionCard article={col1[2]} />}

          {/* Guest writer CTA */}
          <div className="py-3.5 border-y border-rule" style={{ marginBottom: 30 }}>
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
        <div className="lg:border-r lg:border-rule lg:pr-6">
          {col2[0] && <OpinionCard article={col2[0]} />}

          {hasSpotlightAuthors && (
            <div className="hidden lg:block">
              <AuthorSpotlightCarousel authors={spotlightAuthors} pinnedAuthors={pinnedSpotlightAuthors} />
            </div>
          )}

          {col2[1] && <OpinionCard article={col2[1]} />}
          {col2[2] && <OpinionCard article={col2[2]} withImage />}
          {col2[3] && <OpinionCard article={col2[3]} />}
        </div>

        {/* ── Col 3: editors choice, text, text, text, image ── */}
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
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
              <h2 className="font-meta uppercase tracking-[0.04em] text-text-main text-[24px] sm:text-[28px]" style={{ fontWeight: 500 }}>
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
                      <div className="relative overflow-hidden mb-3 -mx-4 w-auto sm:mx-0 sm:w-full" style={{ aspectRatio: "3/2" }}>
                        <Image
                          src={article.image}
                          alt={article.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
                        />
                      </div>
                    )}
                    <span className="font-meta text-[15px] font-medium uppercase tracking-[0.08em] text-text-main dark:text-[#d96b76] block mb-1.5">
                      {typeLabel}
                    </span>
                    <h3 className="font-copy font-medium leading-[1.12] text-[28px] text-text-main transition-colors">
                      {article.title}
                    </h3>
                    <Byline author={article.author} className="mt-2 text-[13px]" />
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
