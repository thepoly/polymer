import React from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import type { Article } from "./types";
import { getArticleUrl } from "@/utils/getArticleUrl";
import { getSlotNumber } from "@/lib/homepageSlots";

/**
 * Cancer: broadsheet two-column homepage.
 *
 *   ┌───────────────────────────────┬──────────────┐
 *   │ lead: text      │ lead photo  │ right-0..4   │  opinion list
 *   ├─────────────────┴─────────────┤ (author over │  (text only)
 *   │ left-0: text    │ photo       │  italic hed) │
 *   ├───────────────────────────────┼──────────────┤
 *   │ left-1 ...                    │ bottom-0..2  │  photo features
 *   └───────────────────────────────┴──────────────┘
 */

const sectionLabel = (article: Article): string => article.kicker || article.section;

const authorText = (article: Article): string | null =>
  article.authorLinks?.length ? article.authorLinks.map((a) => a.name).join(" and ") : article.author;

const linkClass = (article: Article, extra = "") =>
  `group block min-w-0 cursor-pointer${article.isFollytechnic ? " follytechnic" : ""}${extra ? ` ${extra}` : ""}`;

function Label({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <div
      className={`font-meta font-bold uppercase text-sm md:text-[15px] tracking-[0.04em] leading-none ${
        muted ? "text-text-muted" : "text-accent dark:text-white"
      }`}
    >
      {children}
    </div>
  );
}

function Author({ article, className = "" }: { article: Article; className?: string }) {
  const text = authorText(article);
  if (!text) return null;
  return <p className={`font-ui text-[13px] md:text-[14px] text-text-muted ${className}`}>{text}</p>;
}

function Photo({
  article,
  aspect,
  sizes,
  full,
  priority,
}: {
  article: Article;
  aspect: string;
  sizes: string;
  full?: boolean;
  priority?: boolean;
}) {
  const src = full ? article.imageFull || article.image : article.image || article.imageFull;
  if (!src) return null;
  return (
    <div className={`relative w-full overflow-hidden ${aspect}`}>
      <Image
        src={src}
        alt={article.imageTitle || ""}
        fill
        priority={priority}
        className="object-cover"
        style={article.imageFocus ? { objectPosition: article.imageFocus } : undefined}
        sizes={sizes}
      />
    </div>
  );
}

function LeadStory({ article, showSubdeck }: { article: Article; showSubdeck: boolean }) {
  const hasImage = Boolean(article.image || article.imageFull);
  return (
    <TransitionLink href={getArticleUrl(article)} className={linkClass(article)}>
      <Label muted>{sectionLabel(article)}</Label>
      <div className={`mt-5 grid grid-cols-1 gap-6 ${hasImage ? "md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-8" : ""}`}>
        {hasImage && (
          <div className="md:order-2">
            <Photo article={article} aspect="aspect-[9/7]" sizes="(max-width: 768px) 100vw, 560px" full priority />
          </div>
        )}
        <div className="md:order-1">
          <h1
            data-marauders-title
            className="font-copy font-normal text-text-main leading-[1.08] tracking-[-0.015em] text-[32px] md:text-[34px] xl:text-[40px] [overflow-wrap:anywhere] group-hover:underline decoration-1 underline-offset-4"
          >
            {article.richTitle || article.title}
          </h1>
          {showSubdeck && article.excerpt && (
            <p className="mt-5 font-copy text-text-main text-[16px] md:text-[17px] leading-[1.55]">{article.excerpt}</p>
          )}
          <Author article={article} className="mt-5" />
        </div>
      </div>
    </TransitionLink>
  );
}

function StoryRow({ article, slot, showSubdeck }: { article: Article; slot: number | null; showSubdeck: boolean }) {
  const hasImage = Boolean(article.image || article.imageFull);
  return (
    <div className="border-t border-rule pt-8 pb-10" data-homepage-layout="cancer" data-homepage-slot={slot ?? undefined}>
      <Label>{sectionLabel(article)}</Label>
      <TransitionLink
        href={getArticleUrl(article)}
        className={linkClass(article, `mt-6 grid grid-cols-1 gap-5 ${hasImage ? "md:grid-cols-2 md:gap-8" : ""}`)}
      >
        {hasImage && (
          <div className="md:order-2">
            <Photo article={article} aspect="aspect-[3/2]" sizes="(max-width: 768px) 100vw, 540px" />
          </div>
        )}
        <div className="md:order-1">
          <h2 className="font-copy font-normal text-text-main leading-[1.12] tracking-[-0.01em] text-[24px] md:text-[28px] [overflow-wrap:anywhere] group-hover:underline decoration-1 underline-offset-4">
            {article.richTitle || article.title}
          </h2>
          {showSubdeck && article.excerpt && (
            <p className="mt-3 font-copy text-text-main text-[16px] md:text-[17px] leading-[1.55]">{article.excerpt}</p>
          )}
          <Author article={article} className="mt-3" />
        </div>
      </TransitionLink>
    </div>
  );
}

function OpinionItem({ article, slot }: { article: Article; slot: number | null }) {
  return (
    <div className="border-b border-rule py-5" data-homepage-layout="cancer" data-homepage-slot={slot ?? undefined}>
      <TransitionLink href={getArticleUrl(article)} className={linkClass(article)}>
        <Author article={article} className="mb-1" />
        <h3 className="font-copy italic font-normal text-text-main leading-[1.15] tracking-[-0.01em] text-[20px] md:text-[22px] [overflow-wrap:anywhere] group-hover:underline decoration-1 underline-offset-4">
          {article.richTitle || article.title}
        </h3>
      </TransitionLink>
    </div>
  );
}

function RailFeature({ article, slot, showSubdeck }: { article: Article; slot: number | null; showSubdeck: boolean }) {
  return (
    <div className="pt-9" data-homepage-layout="cancer" data-homepage-slot={slot ?? undefined}>
      <TransitionLink href={getArticleUrl(article)} className={linkClass(article)}>
        <Photo article={article} aspect="aspect-[4/3]" sizes="(max-width: 1024px) 100vw, 460px" />
        <h3 className="mt-4 font-copy font-light text-text-main leading-[1.15] tracking-[-0.01em] text-[24px] md:text-[26px] [overflow-wrap:anywhere] group-hover:underline decoration-1 underline-offset-4">
          {article.richTitle || article.title}
        </h3>
        {showSubdeck && article.excerpt && (
          <p className="mt-3 font-copy text-text-main text-[16px] md:text-[17px] leading-[1.55]">{article.excerpt}</p>
        )}
        <Author article={article} className="mt-3" />
      </TransitionLink>
    </div>
  );
}

export function CancerHomepage({
  lead,
  stories,
  opinion,
  railFeatures,
  showSubdeckLead = true,
  showSubdeckStories = [],
  showSubdeckRail = [],
  sectionBlocks,
}: {
  lead: Article;
  stories: Article[];
  opinion: Article[];
  railFeatures: Article[];
  showSubdeckLead?: boolean;
  showSubdeckStories?: boolean[];
  showSubdeckRail?: boolean[];
  sectionBlocks: React.ReactNode;
}) {
  return (
    <div className="homepage-zodiac w-full bg-bg-main text-text-main transition-colors duration-300">
      <div className="mx-auto max-w-[1280px] px-4 pb-14 md:px-6 xl:px-[30px]">
        <div
          data-frontpage-top
          className="grid grid-cols-1 pt-8 pb-6 md:pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(280px,29%)]"
        >
          <div className="min-w-0 lg:border-r lg:border-rule lg:pr-10">
            <div className="pb-10" data-homepage-layout="cancer" data-homepage-slot={getSlotNumber("cancer", "lead") ?? undefined}>
              <LeadStory article={lead} showSubdeck={showSubdeckLead} />
            </div>
            {stories.map((article, i) => (
              <StoryRow
                key={article.id}
                article={article}
                slot={getSlotNumber("cancer", `left-${i}`)}
                showSubdeck={showSubdeckStories[i] !== false}
              />
            ))}
          </div>

          <aside className="min-w-0 border-t border-rule pt-8 lg:border-t-0 lg:pt-0 lg:pl-10">
            {opinion.length > 0 && (
              <div className="border-b border-rule pb-4">
                <Label>
                  <TransitionLink href="/opinion" className="hover:underline">Opinion</TransitionLink>
                </Label>
                <div className="mt-3 [&>*:last-child]:border-b-0">
                  {opinion.map((article, i) => (
                    <OpinionItem key={article.id} article={article} slot={getSlotNumber("cancer", `right-${i}`)} />
                  ))}
                </div>
              </div>
            )}
            {railFeatures.map((article, i) => (
              <RailFeature
                key={article.id}
                article={article}
                slot={getSlotNumber("cancer", `bottom-${i}`)}
                showSubdeck={showSubdeckRail[i] !== false}
              />
            ))}
          </aside>
        </div>

        {sectionBlocks}
      </div>
    </div>
  );
}

export default CancerHomepage;
