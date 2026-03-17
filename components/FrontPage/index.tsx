import React from "react";
import Link from "next/link";
import { LeadArticle } from "./LeadArticle";
import { ArticleCard } from "./ArticleCard";
import { ArticleListItem } from "./ArticleListItem";
import { Article } from "./types";

interface FrontPageProps {
  topStories: {
    lead: Article;
    list: Article[];
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
  const additionalImageStories = withImages.slice(1, 1 + MAX_ADDITIONAL_IMAGES);
  const supportingStories = withoutImages.slice(0, MAX_SUPPORTING);
  const listStories = withoutImages.slice(MAX_SUPPORTING);

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

function SectionBlock({
  title,
  articles,
}: {
  title: string;
  articles: Article[];
}) {
  if (articles.length === 0) return null;

  const { featureStory, supportingStories, additionalImageStories, listStories } = arrangeSectionStories(articles);
  const sectionSlug = title.toLowerCase();
  const hasBlocks = Boolean(featureStory) || supportingStories.length > 0;
  const hasVisualLead = Boolean(featureStory?.image);
  const hasListRail = listStories.length > 0;
  const textOnlyBlocks = featureStory?.image
    ? supportingStories
    : [featureStory, ...supportingStories].filter((article): article is Article => Boolean(article));
  const textColumns = chunkIntoColumns(textOnlyBlocks, 2);

  return (
    <section className="border-t border-rule-strong pt-5">
      <div className="mb-5">
        <Link href={`/${sectionSlug}`} className="group inline-block">
          <h2 className="font-meta text-[13px] font-bold uppercase tracking-[0.08em] text-accent transition-colors group-hover:text-accent/70 md:text-[14px]">
            {title}
          </h2>
        </Link>
      </div>

      <div
        className={`grid gap-6 ${
          hasBlocks && listStories.length > 0
            ? "lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)] lg:items-start"
            : ""
        }`}
      >
        {hasBlocks ? (
          <div>
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

      <div className="mt-4 flex justify-end">
        <Link
          href={`/${sectionSlug}`}
          className="font-meta text-[11px] font-bold uppercase tracking-[0.06em] text-accent transition-colors hover:text-accent/70"
        >
          More {title} &rarr;
        </Link>
      </div>
    </section>
  );
}

export default function FrontPage({
  topStories,
  sections,
}: FrontPageProps) {
  const heroStories = arrangeHeroStories(topStories.list);
  const heroImageCount = [...heroStories.left, ...heroStories.right].filter(
    (article) => article.image,
  ).length;
  const leadIsCompact = heroImageCount >= 2;

  return (
    <div className="w-full bg-bg-main text-text-main transition-colors duration-300">
      <div className="mx-auto max-w-[1280px] px-4 pb-14 md:px-6 xl:px-[30px]">
        <section className="py-6 md:py-7">
          <div
            className={`grid gap-7 ${
              leadIsCompact
                ? "lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]"
                : "lg:grid-cols-[minmax(0,0.97fr)_minmax(0,1.03fr)]"
            }`}
          >
            <div>
              <LeadArticle article={topStories.lead} compact={leadIsCompact} />
            </div>
            <div className="grid grid-cols-2 gap-4 items-start">
              <div className="flex flex-col gap-5">
                {heroStories.left.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                  />
                ))}
              </div>
              <div className="flex flex-col gap-5">
                {heroStories.right.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-4 flex flex-col gap-3">
          <SectionBlock title="News" articles={sections.news} />
          <SectionBlock title="Features" articles={sections.features} />
          <SectionBlock title="Opinion" articles={sections.opinion} />
          <SectionBlock title="Sports" articles={sections.sports} />
        </div>
      </div>
    </div>
  );
}
