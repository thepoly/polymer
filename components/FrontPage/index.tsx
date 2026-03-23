import React from "react";
import { LeadArticle } from "./LeadArticle";
import { ArticleCard } from "./ArticleCard";
import { ArticleListItem } from "./ArticleListItem";
import { Article } from "./types";

interface FrontPageProps {
  topStories: {
    lead: Article;
    list: Article[];
    /** When provided, override the default left/right split */
    heroLeft?: Article[];
    heroRight?: Article[];
    /** Optional row of up to 4 articles below the hero area */
    bottomRow?: Article[];
    /** When true, lead headline is bolder and uppercase */
    leadImportant?: boolean;
  };
  sections: {
    news: Article[];
    features: Article[];
    sports: Article[];
    opinion: Article[];
  };
}

interface HeroColumns {
  left: Article[];
  right: Article[];
}

interface ArrangedSectionStories {
  featureStory: Article | null;
  supportingStories: Article[];
  additionalImageStories: Article[];
  listStories: Article[];
}

const MAX_SECTION_STORIES = 9;
const MAX_SUPPORTING = 3;
const MAX_ADDITIONAL_IMAGES = 3;

const arrangeHeroStories = (articles: Article[]): HeroColumns => {
  const heroStories = articles.slice(0, 4);

  return {
    left: heroStories.slice(0, 2),
    right: heroStories.slice(2, 4),
  };
};

const arrangeSectionStories = (articles: Article[]): ArrangedSectionStories => {
  const sectionStories = articles.slice(0, MAX_SECTION_STORIES);

  if (sectionStories.length === 0) {
    return {
      featureStory: null,
      supportingStories: [],
      additionalImageStories: [],
      listStories: [],
    };
  }

  const withImages = sectionStories.filter((a) => a.image);
  const withoutImages = sectionStories.filter((a) => !a.image);

  if (withImages.length === 0) {
    // No images — all text layout
    return {
      featureStory: null,
      supportingStories: sectionStories,
      additionalImageStories: [],
      listStories: [],
    };
  }

  const featureStory = withImages[0];
  const supportingStories = withoutImages.slice(0, MAX_SUPPORTING);
  const remainingList = withoutImages.slice(MAX_SUPPORTING);
  const remainingImages = withImages.slice(1, 1 + MAX_ADDITIONAL_IMAGES);
  // Only show additional image cards when there are no list stories;
  // otherwise fold them into the list
  const additionalImageStories = remainingList.length > 0 ? [] : remainingImages;
  const listStories = remainingList.length > 0
    ? [...remainingImages, ...remainingList]
    : remainingList;

  return {
    featureStory,
    supportingStories,
    additionalImageStories,
    listStories,
  };
};

const chunkIntoColumns = (articles: Article[], columnCount: number) => {
  if (articles.length === 0) return [];

  const columns = Array.from({ length: Math.min(columnCount, articles.length) }, () => [] as Article[]);

  articles.forEach((article, index) => {
    columns[index % columns.length].push(article);
  });

  return columns;
};

export function SectionBlock({
  title,
  articles,
}: {
  title: string;
  articles: Article[];
}) {
  if (articles.length === 0) return null;

  const { featureStory, supportingStories, additionalImageStories, listStories } = arrangeSectionStories(articles);
  const sectionSlug = title.toLowerCase();
  const allSectionArticles = [
    featureStory,
    ...supportingStories,
    ...additionalImageStories,
    ...listStories,
  ].filter((a): a is Article => Boolean(a));
  const hasBlocks = Boolean(featureStory) || supportingStories.length > 0;
  const hasVisualLead = Boolean(featureStory?.image);
  const hasListRail = listStories.length > 0;
  const textOnlyBlocks = featureStory?.image
    ? supportingStories
    : [featureStory, ...supportingStories].filter((article): article is Article => Boolean(article));
  const textColumns = chunkIntoColumns(textOnlyBlocks, 2);

  return (
    <section data-section={sectionSlug}>
      <div className="mb-5">
        <div className="border-t border-black dark:border-white -mx-4 md:-mx-6 xl:-mx-[30px]" />
        <h2 className="font-meta text-[36px] font-bold tracking-[0.04em] text-accent capitalize leading-[1] mt-4 md:mt-2">{title}</h2>
      </div>
      {/* Mobile: flat list with dividers */}
      <div className="flex flex-col md:hidden">
        {allSectionArticles.map((article, i) => (
          <div key={article.id} className={i > 0 ? "mt-12" : ""}>
            <ArticleCard
              article={article}
              showImage={Boolean(article.image)}
              imageAspectClassName="aspect-[3/2]"
            />
          </div>
        ))}
      </div>

      {/* Desktop: rich grid layout */}
      <div
        data-section-body
        className={`hidden md:grid gap-6 pt-0 ${
          hasBlocks && listStories.length > 0
            ? "lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)] lg:items-start"
            : ""
        }`}
      >
        {hasBlocks ? (
          <div data-header-scope="primary">
            {featureStory && hasVisualLead && supportingStories.length > 0 ? (
              <>
                <div
                  className={`grid gap-5 lg:items-start ${
                    hasListRail
                      ? "lg:grid-cols-[minmax(0,0.82fr)_minmax(0,0.68fr)]"
                      : "lg:grid-cols-[minmax(0,0.92fr)_minmax(0,0.78fr)]"
                  }`}
                >
                  <ArticleCard
                    article={featureStory}
                    showImage
                    imageAspectClassName="aspect-[3/2]"
                    excerptClassName="mt-2.5 line-clamp-4 text-[13px] leading-[1.45]"
                  />

                  <div className="flex flex-col gap-5">
                    {supportingStories.slice(0, 3).map((article) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        showImage={false}
                      />
                    ))}
                  </div>
                </div>
                {additionalImageStories.length > 0 && (
                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    {additionalImageStories.map((article) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        showImage
                        imageAspectClassName="aspect-[3/2]"
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-5">
                {hasVisualLead && featureStory ? (
                  <div className="lg:max-w-[60%]">
                    <ArticleCard
                      article={featureStory}
                      showImage
                      imageAspectClassName="aspect-[3/2]"
                    />
                  </div>
                ) : null}

                {textOnlyBlocks.length > 0 && (
                  <div
                    className={
                      textColumns.length > 1
                        ? "grid gap-5 sm:grid-cols-2"
                        : ""
                    }
                  >
                    {textColumns.map((column, columnIndex) => (
                      <div key={columnIndex} className="flex flex-col gap-5">
                        {column.map((article) => (
                          <ArticleCard
                            key={article.id}
                            article={article}
                            showImage={false}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        {listStories.length > 0 && (
          <ul>
            {listStories.map((article) => (
              <ArticleListItem key={article.id} article={article} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default function FrontPage({
  topStories,
  sections,
}: FrontPageProps) {
  const heroStories: HeroColumns = topStories.heroLeft && topStories.heroRight
    ? { left: topStories.heroLeft, right: topStories.heroRight }
    : arrangeHeroStories(topStories.list);
  const heroImageCount = [...heroStories.left, ...heroStories.right].filter(
    (article) => article.image,
  ).length;
  const leadIsCompact = heroImageCount >= 2;

  return (
    <div className="homepage-zodiac w-full bg-bg-main text-text-main transition-colors duration-300">
      <div className="mx-auto max-w-[1280px] px-4 pb-14 md:px-6 xl:px-[30px]">
        {/* Mobile: lead first, then a text article, then the rest */}
        <div className="pt-2 flex flex-col md:hidden" data-frontpage-top>
          <LeadArticle article={topStories.lead} compact={false} hideKicker />
          {(() => {
            const heroArticles = [...heroStories.left, ...heroStories.right];
            const bottomArticles = topStories.bottomRow || [];
            const all = [...heroArticles, ...bottomArticles];
            const textIdx = all.findIndex((a) => !a.image);
            const textFirst = textIdx >= 0 ? all[textIdx] : null;
            const rest = textFirst ? [...all.slice(0, textIdx), ...all.slice(textIdx + 1)] : all;
            const ordered = textFirst ? [textFirst, ...rest] : rest;
            return ordered.map((article) => (
              <div key={article.id} className="mt-10">
                <ArticleCard article={article} />
              </div>
            ));
          })()}
        </div>

        {/* Desktop: hero + bottom row as two flowing columns */}
        <div data-frontpage-top className="relative z-[1] hidden md:grid md:grid-cols-[1fr_1px_1fr] gap-x-5 pt-6 md:pt-7 pb-8 items-start">
          {/* Left column: lead + bottom-left articles */}
          <div className="flex flex-col gap-5">
            <LeadArticle article={topStories.lead} compact={leadIsCompact} important={topStories.leadImportant} />
            {topStories.bottomRow?.[0] && (
              <ArticleCard
                article={topStories.bottomRow[0]}
                showImage={false}
                contained
                showKicker
              />
            )}
            {(topStories.bottomRow?.[1] || topStories.bottomRow?.[2]) && (
              <div className="grid grid-cols-[1fr_1px_1fr] gap-x-5 items-start">
                {topStories.bottomRow[1] && (
                  <ArticleCard article={topStories.bottomRow[1]} showImage={false} contained showKicker />
                )}
                <div className="self-stretch bg-rule" />
                {topStories.bottomRow[2] && (
                  <ArticleCard article={topStories.bottomRow[2]} showImage={false} contained showKicker />
                )}
              </div>
            )}
            {topStories.bottomRow?.[3] && (
              <ArticleCard
                article={topStories.bottomRow[3]}
                showImage={false}
                contained
                showKicker
              />
            )}
          </div>
          {/* Column divider */}
          <div className="self-stretch bg-rule" />
          {/* Right column: hero columns + bottom-right articles */}
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-[1fr_1px_1fr] gap-x-5">
              <div className="flex flex-col">
                {heroStories.left.map((article, i) => (
                  <div key={article.id} className={i > 0 ? "pt-3" : "pb-3"}>
                    <ArticleCard article={article} showKicker />
                  </div>
                ))}
              </div>
              <div className="self-stretch bg-rule" />
              <div className="flex flex-col">
                {heroStories.right.map((article, i) => (
                  <div key={article.id} className={i > 0 ? "pt-3" : "pb-3"}>
                    <ArticleCard article={article} showKicker />
                  </div>
                ))}
              </div>
            </div>
            {topStories.bottomRow?.[4] && (
              <ArticleCard
                article={topStories.bottomRow[4]}
                contained
                showKicker
                imageRight
                imageAspectClassName="aspect-[4/3]"
              />
            )}
            {(topStories.bottomRow?.[5] || topStories.bottomRow?.[6]) && (
              <div className="grid grid-cols-[1fr_1px_1fr] gap-x-5 items-start">
                {topStories.bottomRow[5] && (
                  <ArticleCard article={topStories.bottomRow[5]} showImage={false} contained showKicker />
                )}
                <div className="self-stretch bg-rule" />
                {topStories.bottomRow[6] && (
                  <ArticleCard article={topStories.bottomRow[6]} showImage={false} contained showKicker />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="relative z-[0] mt-8 md:mt-4 flex flex-col gap-0">
          <div>
            {/* <DynamicSectionHeader title="News" href="/news" mobileOffsetY={1} /> */}
            <SectionBlock title="News" articles={sections.news} />
          </div>
          <div className="mt-8 md:mt-4">
            {/* <DynamicSectionHeader title="Features" href="/features" /> */}
            <SectionBlock title="Features" articles={sections.features} />
          </div>
          <div className="mt-8 md:mt-4">
            {/* <DynamicSectionHeader title="Opinion" href="/opinion" offsetX={2.5} offsetY={-2} /> */}
            <SectionBlock title="Opinion" articles={sections.opinion} />
          </div>
          <div className="mt-8 md:mt-4">
            {/* <DynamicSectionHeader title="Sports" href="/sports" offsetX={4.5} /> */}
            <SectionBlock title="Sports" articles={sections.sports} />
          </div>
        </div>
      </div>
    </div>
  );
}
