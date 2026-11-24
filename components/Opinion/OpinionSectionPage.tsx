"use client";
import { fillOpinionSlots } from '@/lib/opinionLayout';

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
import { Byline } from "@/components/FrontPage/Byline";
import { shortDate } from "@/utils/articleDates";

/**
 * "Nov 14, 2026" on every card: an opinion piece answers a moment, and the page
 * keeps pieces for months, so readers need to know when each was written.
 * Editor's Choice and the author carousel are curated picks and stay undated.
 */
const opinionDate = (article: ComponentArticle) => shortDate(article.publishedDate || article.isoDate);

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
            alt={article.imageTitle || ""}
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
        {article.richTitle || article.title}
      </h3>
      {/* Byline: muted "By", names in ink (red is the type label above) */}
      <Byline authors={article.authorLinks} date={opinionDate(article)} size="md" margin="mt-2" />
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
  spotlightAuthors,
  pinnedCol1,
  pinnedCol2,
  pinnedCol3,
  col1Images = [true, false, false, false, false],
  col2Images = [false, false, true, false],
  col3Images = [false, false, false, true],
  editorsChoiceArticles,
  editorsChoiceLabel,
  groupedArticles,
  pinnedSpotlightAuthors,
}: {
  title: string;
  articles: ComponentArticle[];
  spotlightAuthors: SpotlightAuthor[];
  pinnedCol1: (ComponentArticle | null)[];
  pinnedCol2: (ComponentArticle | null)[];
  pinnedCol3: (ComponentArticle | null)[];
  col1Images?: boolean[];
  col2Images?: boolean[];
  col3Images?: boolean[];
  editorsChoiceArticles: ComponentArticle[];
  editorsChoiceLabel: string;
  groupedArticles: Record<string, ComponentArticle[]>;
  pinnedSpotlightAuthors?: SpotlightAuthor[];
}) {
  const [col1, col2, col3] = useMemo(() => {
    const pad = (pins: (ComponentArticle | null)[], count: number) =>
      Array.from({ length: Math.max(count, pins.length) }, (_, i) => pins[i] || null);
    return fillOpinionSlots([
      pad(pinnedCol1, Math.max(5, col1Images.length)),
      pad(pinnedCol2, Math.max(4, col2Images.length)),
      pad(pinnedCol3, Math.max(4, col3Images.length)),
    ], articles, editorsChoiceArticles);
  }, [pinnedCol1, pinnedCol2, pinnedCol3, col1Images.length, col2Images.length, col3Images.length, articles, editorsChoiceArticles]);

  const hasSpotlightAuthors =
    spotlightAuthors.length > 0 ||
    Boolean(pinnedSpotlightAuthors && pinnedSpotlightAuthors.length > 0);

  const mobileOrderedArticles = [col1, col2, col3].flatMap((column, columnIndex) =>
    column.flatMap((article, slot) => article ? [{ article, withImage: [col1Images, col2Images, col3Images][columnIndex][slot] ?? false }] : []),
  );

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-5 pb-8 md:px-6 xl:px-[30px]">
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
        {mobileOrderedArticles.slice(0, 2).map(({ article, withImage }, index) => (
          <OpinionCard
            key={`mobile-top-${article.id}`}
            article={article}
            withImage={withImage}
            priority={index === 0 && withImage}
          />
        ))}

        {hasSpotlightAuthors && (
          <div className="mb-10">
            <AuthorSpotlightCarousel authors={spotlightAuthors} pinnedAuthors={pinnedSpotlightAuthors} />
          </div>
        )}

        {mobileOrderedArticles.slice(2, 5).map(({ article, withImage }) => (
          <OpinionCard key={`mobile-middle-${article.id}`} article={article} withImage={withImage} />
        ))}

        {editorsChoiceArticles.length > 0 && (
          <div className="mb-6">
            <EditorsChoice
              articles={editorsChoiceArticles}
              label={editorsChoiceLabel}
            />
          </div>
        )}

        {mobileOrderedArticles.slice(5).map(({ article, withImage }) => (
          <OpinionCard key={`mobile-rest-${article.id}`} article={article} withImage={withImage} />
        ))}
      </div>

      {/* 3-column grid — inline styles to guarantee layout */}
      <div
        className="hidden lg:grid lg:grid-cols-3"
        style={{
          columnGap: 24,
        }}
      >
        {/* ── Col 1: first 3 slots, CTA, remaining slots ── */}
        <div className="lg:border-r lg:border-rule lg:pr-6">
          {col1.slice(0, 3).map((article, i) => (
            article && <OpinionCard key={`col1-${article.id}`} article={article} withImage={col1Images[i] ?? false} priority={i === 0 && (col1Images[0] ?? true)} />
          ))}

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

          {col1.slice(3).map((article, i) => (
            article && <OpinionCard key={`col1-after-${article.id}`} article={article} withImage={col1Images[i + 3] ?? false} />
          ))}
        </div>

        {/* ── Col 2: first slot, carousel, remaining slots ── */}
        <div className="lg:border-r lg:border-rule lg:pr-6">
          {col2[0] && <OpinionCard article={col2[0]} withImage={col2Images[0] ?? false} />}

          {hasSpotlightAuthors && (
            <div className="hidden lg:block">
              <AuthorSpotlightCarousel authors={spotlightAuthors} pinnedAuthors={pinnedSpotlightAuthors} />
            </div>
          )}

          {col2.slice(1).map((article, i) => (
            article && <OpinionCard key={`col2-${article.id}`} article={article} withImage={col2Images[i + 1] ?? false} />
          ))}
        </div>

        {/* ── Col 3: editors choice, then all slots ── */}
        <div>
          {editorsChoiceArticles.length > 0 && (
            <div className="mb-3">
              <EditorsChoice
                articles={editorsChoiceArticles}
                label={editorsChoiceLabel}
              />
            </div>
          )}

          {col3.map((article, i) => (
            article && <OpinionCard key={`col3-${article.id}`} article={article} withImage={col3Images[i] ?? false} />
          ))}
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
                          alt={article.imageTitle || ""}
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
                      {article.richTitle || article.title}
                    </h3>
                    <Byline authors={article.authorLinks} date={opinionDate(article)} size="md" margin="mt-2" />
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
