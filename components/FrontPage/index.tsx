import React from "react";
import Link from "next/link";
import { LeadArticle } from "./LeadArticle";
import { FeatureBand } from "./FeatureBand";
import { OpinionCard } from "./OpinionCard";
import { Byline } from "./Byline";
import { Article } from "./types";
import { getArticleUrl } from "@/utils/getArticleUrl";

interface FrontPageBodyProps {
  topStories: {
    lead: Article;
    list: Article[];
  };
  specialFeature?: Article | null;
  opinion: Article[];
}

function FrontPageStoryList({ articles }: { articles: Article[] }) {
  return (
    <div className="flex flex-col divide-y divide-border-main">
      {articles.map((article, index) => (
        <Link
          key={`${article.id}-${index}`}
          href={getArticleUrl(article)}
          className="group py-4 first:pt-0 last:pb-0"
        >
          <p className="font-ui mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
            {article.section}
          </p>
          <h3
            className="font-display text-[19px] font-bold leading-[1.04] tracking-[-0.015em] text-text-main transition-colors group-hover:text-accent"
          >
            {article.title}
          </h3>
          {index === 0 && article.excerpt && (
            <p className="font-copy mt-2 line-clamp-3 text-[13px] leading-[1.38] text-text-muted">
              {article.excerpt}
            </p>
          )}
          <Byline author={article.author} date={article.date} />
        </Link>
      ))}
    </div>
  );
}

export default function FrontPage({
  topStories,
  specialFeature,
  opinion,
}: FrontPageBodyProps) {
  const hasOpinionRail = opinion.length > 0;

  return (
    <div className="w-full bg-bg-main text-text-main transition-colors duration-300">
      <div className="mx-auto max-w-[1280px] px-4 pb-14 md:px-6 xl:px-[30px]">
        <section className="border-b border-border-main py-6 md:py-7">
          <div className="grid gap-8 xl:grid-cols-12 xl:gap-7">
            <div className={hasOpinionRail ? "xl:col-span-6" : "xl:col-span-8"}>
              <LeadArticle article={topStories.lead} />
            </div>

            <div
              className={
                hasOpinionRail
                  ? "xl:col-span-3 xl:border-l xl:border-border-main xl:pl-6"
                  : "xl:col-span-4 xl:border-l xl:border-border-main xl:pl-6"
              }
            >
              <FrontPageStoryList articles={topStories.list} />
            </div>

            {hasOpinionRail ? (
              <aside className="xl:col-span-3 xl:border-l xl:border-border-main xl:pl-6">
                <div className="mb-4 border-b border-border-main pb-3">
                  <Link href="/opinion" className="group inline-block">
                    <h2 className="font-display text-[18px] font-bold leading-none tracking-[-0.02em] transition-colors group-hover:text-accent">
                      Opinion
                    </h2>
                  </Link>
                </div>
                <div className="flex flex-col divide-y divide-border-main">
                  {opinion.slice(0, 4).map((article, index) => (
                    <div key={`${article.id}-${index}`} className="py-4 first:pt-0 last:pb-0">
                      <OpinionCard article={article} hasImage={index === 0} />
                    </div>
                  ))}
                </div>
              </aside>
            ) : null}
          </div>
        </section>

        {specialFeature ? (
          <section className="border-b border-border-main py-8 md:py-10">
            <FeatureBand article={specialFeature} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
