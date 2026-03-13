import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Article } from "./types";
import { Byline } from "./Byline";
import { getArticleUrl } from "@/utils/getArticleUrl";

interface HorizontalSectionProps {
  title: string;
  articles: Article[];
}

const promoteVisualLead = (articles: Article[]) => {
  const richLeadIndex = articles.findIndex((article) => article.image && article.excerpt);
  const imageLeadIndex = articles.findIndex((article) => article.image);
  const targetIndex = richLeadIndex >= 0 ? richLeadIndex : imageLeadIndex;

  if (targetIndex <= 0) return articles;

  const lead = articles[targetIndex];
  return [lead, ...articles.slice(0, targetIndex), ...articles.slice(targetIndex + 1)];
};

const StoryKicker = ({ section }: { section: string }) => (
  <p className="font-ui mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
    {section}
  </p>
);

const SectionHeading = ({ title }: { title: string }) => (
  <div className="mb-5 border-b border-border-main pb-3">
    <Link href={`/${title.toLowerCase()}`} className="group inline-block">
      <h2 className="font-display text-[20px] font-bold leading-none tracking-[-0.018em] transition-colors group-hover:text-accent md:text-[22px]">
        {title}
      </h2>
    </Link>
  </div>
);

const LeadStory = ({
  article,
  titleClassName,
}: {
  article: Article;
  titleClassName: string;
}) => (
  <Link href={getArticleUrl(article)} className="group block">
    {article.image ? (
      <div className="relative mb-4 overflow-hidden">
        <div className="relative aspect-[16/10]">
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 760px"
          />
        </div>
      </div>
    ) : null}

    <StoryKicker section={article.section} />
    <h3
      className={`font-display font-bold leading-[0.97] tracking-[-0.02em] text-text-main transition-colors group-hover:text-accent ${titleClassName}`}
    >
      {article.title}
    </h3>
    {article.excerpt ? (
      <p className="font-copy mt-3 max-w-2xl text-[13px] leading-[1.4] text-text-muted">
        {article.excerpt}
      </p>
    ) : null}
    <Byline author={article.author} date={article.date} />
  </Link>
);

const TextStory = ({
  article,
  titleClassName,
  showExcerpt = false,
}: {
  article: Article;
  titleClassName: string;
  showExcerpt?: boolean;
}) => (
  <Link href={getArticleUrl(article)} className="group block">
    <StoryKicker section={article.section} />
    <h3
      className={`font-display font-bold leading-[1.04] tracking-[-0.015em] text-text-main transition-colors group-hover:text-accent ${titleClassName}`}
    >
      {article.title}
    </h3>
    {showExcerpt && article.excerpt ? (
      <p className="font-copy mt-2 line-clamp-3 text-[12px] leading-[1.38] text-text-muted">
        {article.excerpt}
      </p>
    ) : null}
    <Byline author={article.author} date={article.date} />
  </Link>
);

const ThumbStory = ({
  article,
  titleClassName,
  showExcerpt = false,
  thumbWidth = 112,
}: {
  article: Article;
  titleClassName: string;
  showExcerpt?: boolean;
  thumbWidth?: number;
}) => (
  <Link
    href={getArticleUrl(article)}
    className={`group grid gap-4 ${article.image ? `sm:grid-cols-[minmax(0,1fr)_${thumbWidth}px]` : ""}`}
  >
    <div>
      <StoryKicker section={article.section} />
      <h3
        className={`font-display font-bold leading-[1.04] tracking-[-0.015em] text-text-main transition-colors group-hover:text-accent ${titleClassName}`}
      >
        {article.title}
      </h3>
      {showExcerpt && article.excerpt ? (
        <p className="font-copy mt-2 line-clamp-3 text-[12px] leading-[1.38] text-text-muted">
          {article.excerpt}
        </p>
      ) : null}
      <Byline author={article.author} date={article.date} />
    </div>

    {article.image ? (
      <div className="relative mt-1 overflow-hidden">
        <div className="relative aspect-[4/3]">
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover"
            sizes={`${thumbWidth}px`}
          />
        </div>
      </div>
    ) : null}
  </Link>
);

const SparseSection = ({
  articles,
  reverseImage = false,
}: {
  articles: Article[];
  reverseImage?: boolean;
}) => {
  const lead = articles[0];
  const secondary = articles.slice(1, 3);

  if (!lead) return null;

  const textBlock = (
    <div>
      <StoryKicker section={lead.section} />
      <h3 className="font-display text-[19px] font-bold leading-[1.08] tracking-[-0.018em] text-text-main transition-colors group-hover:text-accent md:text-[22px]">
        {lead.title}
      </h3>
      {lead.excerpt ? (
        <p className="font-copy mt-3 max-w-2xl text-[13px] leading-[1.4] text-text-muted">
          {lead.excerpt}
        </p>
      ) : null}
      <Byline author={lead.author} date={lead.date} />
    </div>
  );

  return (
    <>
      <Link
        href={getArticleUrl(lead)}
        className={`group block ${lead.image ? "lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)] lg:items-start lg:gap-7" : ""}`}
      >
        {lead.image && reverseImage ? (
          <div className="relative mb-4 overflow-hidden lg:mb-0">
            <div className="relative aspect-[16/10]">
              <Image
                src={lead.image}
                alt={lead.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 360px"
              />
            </div>
          </div>
        ) : null}

        {textBlock}

        {lead.image && !reverseImage ? (
          <div className="relative mt-4 overflow-hidden lg:mt-0">
            <div className="relative aspect-[16/10]">
              <Image
                src={lead.image}
                alt={lead.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 360px"
              />
            </div>
          </div>
        ) : null}
      </Link>

      {secondary.length > 0 ? (
        <div className="mt-6 grid gap-5 border-t border-border-main pt-5 md:grid-cols-2">
          {secondary.map((article) => (
            <TextStory
              key={article.id}
              article={article}
              titleClassName="text-[19px]"
              showExcerpt
            />
          ))}
        </div>
      ) : null}
    </>
  );
};

const NewsSection = ({ articles }: { articles: Article[] }) => {
  const lead = articles[0];
  const secondary = articles.slice(1, 4);
  const tertiary = articles.slice(4, 8);

  if (!lead) return null;
  if (articles.length < 3) return <SparseSection articles={articles} />;

  return (
    <>
      <div className="grid gap-8 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <LeadStory article={lead} titleClassName="text-[20px] md:text-[24px]" />
        </div>

        <div className="xl:col-span-5 xl:border-l xl:border-border-main xl:pl-6">
          <div className="flex flex-col divide-y divide-border-main">
            {secondary.map((article, index) => (
              <div key={article.id} className="py-4 first:pt-0 last:pb-0">
                <ThumbStory
                  article={article}
                  titleClassName="text-[19px]"
                  showExcerpt={index === 0}
                  thumbWidth={120}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {tertiary.length > 0 ? (
        <div className="mt-7 grid gap-5 border-t border-border-main pt-6 md:grid-cols-2 xl:grid-cols-4">
          {tertiary.map((article) => (
            <div key={article.id}>
              <LeadStory article={article} titleClassName="text-[19px]" />
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
};

const FeaturesSection = ({ articles }: { articles: Article[] }) => {
  const lead = articles[0];
  const secondary = articles.slice(1, 3);
  const tertiary = articles.slice(3, 6);

  if (!lead) return null;
  if (articles.length < 3) return <SparseSection articles={articles} reverseImage />;

  return (
    <>
      <div className="grid gap-8 xl:grid-cols-12">
        <div className="xl:col-span-4 xl:border-r xl:border-border-main xl:pr-6">
          <div className="flex flex-col divide-y divide-border-main">
            {secondary.map((article, index) => (
              <div key={article.id} className="py-4 first:pt-0 last:pb-0">
                <TextStory
                  article={article}
                  titleClassName="text-[19px]"
                  showExcerpt={index === 0}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-8">
          <LeadStory article={lead} titleClassName="text-[21px] md:text-[26px]" />
        </div>
      </div>

      {tertiary.length > 0 ? (
        <div className="mt-7 grid gap-5 border-t border-border-main pt-6 md:grid-cols-2 xl:grid-cols-3">
          {tertiary.map((article, index) => (
            <div key={article.id}>
              <ThumbStory
                article={article}
                titleClassName="text-[19px]"
                showExcerpt={index === 0}
                thumbWidth={116}
              />
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
};

const SportsSection = ({ articles }: { articles: Article[] }) => {
  const lead = articles[0];
  const secondary = articles.slice(1, 3);
  const tertiary = articles.slice(3, 6);

  if (!lead) return null;
  if (articles.length < 3) return <SparseSection articles={articles} />;

  return (
    <>
      <div className="grid gap-8 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <Link
            href={getArticleUrl(lead)}
            className={`group block ${lead.image ? "lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-6" : ""}`}
          >
            <div>
              <StoryKicker section={lead.section} />
              <h3 className="font-display text-[20px] font-bold leading-[1.08] tracking-[-0.018em] text-text-main transition-colors group-hover:text-accent md:text-[24px]">
                {lead.title}
              </h3>
              {lead.excerpt ? (
                <p className="font-copy mt-3 max-w-2xl text-[13px] leading-[1.4] text-text-muted">
                  {lead.excerpt}
                </p>
              ) : null}
              <Byline author={lead.author} date={lead.date} />
            </div>

            {lead.image ? (
              <div className="relative mt-4 overflow-hidden lg:mt-0">
                <div className="relative aspect-[16/10]">
                  <Image
                    src={lead.image}
                    alt={lead.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 280px"
                  />
                </div>
              </div>
            ) : null}
          </Link>
        </div>

        <div className="xl:col-span-4 xl:border-l xl:border-border-main xl:pl-6">
          <div className="flex flex-col divide-y divide-border-main">
            {secondary.map((article) => (
              <div key={article.id} className="py-4 first:pt-0 last:pb-0">
                <TextStory article={article} titleClassName="text-[19px]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {tertiary.length > 0 ? (
        <div className="mt-7 grid gap-5 border-t border-border-main pt-6 md:grid-cols-3">
          {tertiary.map((article) => (
            <TextStory key={article.id} article={article} titleClassName="text-[19px]" />
          ))}
        </div>
      ) : null}
    </>
  );
};

const OpinionSection = ({ articles }: { articles: Article[] }) => {
  const lead = articles[0];
  const secondary = articles.slice(1, 4);
  const tertiary = articles.slice(4, 7);

  if (!lead) return null;
  if (articles.length < 3) return <SparseSection articles={articles} reverseImage />;

  return (
    <>
      <div className="grid gap-8 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <LeadStory article={lead} titleClassName="text-[20px] md:text-[24px]" />
        </div>

        <div className="xl:col-span-5 xl:border-l xl:border-border-main xl:pl-6">
          <div className="flex flex-col divide-y divide-border-main">
            {secondary.map((article) => (
              <div key={article.id} className="py-4 first:pt-0 last:pb-0">
                <TextStory article={article} titleClassName="text-[19px]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {tertiary.length > 0 ? (
        <div className="mt-7 grid gap-5 border-t border-border-main pt-6 md:grid-cols-3">
          {tertiary.map((article) => (
            <TextStory key={article.id} article={article} titleClassName="text-[19px]" />
          ))}
        </div>
      ) : null}
    </>
  );
};

export const HorizontalSection = ({ title, articles }: HorizontalSectionProps) => {
  if (!articles || articles.length === 0) return null;

  const section = title.toLowerCase();
  const orderedArticles = promoteVisualLead(articles);

  let content: React.ReactNode;

  switch (section) {
    case "features":
      content = <FeaturesSection articles={orderedArticles} />;
      break;
    case "sports":
      content = <SportsSection articles={orderedArticles} />;
      break;
    case "opinion":
    case "editorial":
      content = <OpinionSection articles={orderedArticles} />;
      break;
    case "news":
    default:
      content = <NewsSection articles={orderedArticles} />;
      break;
  }

  return (
    <section className="border-t border-border-main py-8 text-text-main transition-colors duration-300 md:py-10">
      <div className="mx-auto max-w-[1280px] px-4 md:px-6 xl:px-[30px]">
        <SectionHeading title={title} />
        {content}
      </div>
    </section>
  );
};
