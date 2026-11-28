
import { SUMMARY_CLASS } from "@/components/summaryClass";
import React from "react";
import { OPINION_PAGE_SIZE } from "@/lib/opinionPagination";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import type { Article } from "@/components/FrontPage/types";
import { Byline } from "@/components/FrontPage/Byline";



export default function OpinionListPage({
  title,
  articles, page, totalDocs, totalPages, basePath,
}: {
  title: string;
  articles: Article[];
  page: number; totalDocs: number; totalPages: number; basePath: string;
}) {
  const start = (page - 1) * OPINION_PAGE_SIZE + 1;
  const end = Math.min(page * OPINION_PAGE_SIZE, totalDocs);
  const pageUrl = (p: number) => p === 1 ? basePath : basePath + '?page=' + p;

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-[30px] pt-5 pb-16">
      <div className="flex flex-wrap gap-4 items-baseline justify-between mt-6 mb-8">
        <h1
          className="font-meta uppercase tracking-[0.04em] text-text-main"
          style={{ fontSize: 40, fontWeight: 400, lineHeight: 1 }}
        >
          {title}
        </h1>
        <TransitionLink
          href="/opinion"
          className="font-meta text-[14px] uppercase tracking-[0.08em] text-accent hover:underline transition-colors"
        >
          &larr; Back to Opinion
        </TransitionLink>
      </div>

      {totalDocs === 0 && <p>No published articles in this category yet.</p>}
      {/* Article list */}
      <div className="flex flex-col">
        {articles.map((article) => (
          <TransitionLink
            key={article.id}
            href={getArticleUrl(article)}
            className="group flex gap-5 py-5 border-b border-rule"
          >
            {article.image && (
              <div
                className="relative overflow-hidden shrink-0 w-20 sm:w-[180px] aspect-[3/2] self-start"
              >
                <Image
                  src={article.image}
                  alt={article.imageTitle || ""}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 80px, 180px"
                />
              </div>
            )}
            <div className="flex min-w-0 flex-col justify-center break-words">
              <h2 className="font-copy font-medium leading-[1.15] text-[22px] text-text-main transition-colors">
                {article.richTitle || article.title}
              </h2>
              <Byline authors={article.authorLinks} date={article.date} size="md" />
              {article.excerpt && (
                <p className={`mt-1 ${SUMMARY_CLASS} text-[14px] leading-[1.5] line-clamp-2`}>
                  {article.excerpt}
                </p>
              )}
            </div>
          </TransitionLink>
        ))}
      </div>

      {/* Bottom controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8">
          <span className="font-meta text-[13px] uppercase tracking-[0.08em] text-text-muted">
            {start}–{end} of {totalDocs}
          </span>
          <nav aria-label="Opinion archive pages" className="flex items-center gap-3">
            {page > 1 && <TransitionLink href={pageUrl(page - 1)} rel="prev">&larr; Prev</TransitionLink>}
            <span aria-current="page">{page} / {totalPages}</span>
            {page < totalPages && <TransitionLink href={pageUrl(page + 1)} rel="next">Next &rarr;</TransitionLink>}
          </nav>
        </div>
      )}
      {totalPages <= 1 && articles.length > 0 && (
        <div className="mt-8">
          <span className="font-meta text-[13px] uppercase tracking-[0.08em] text-text-muted">
            {articles.length} article{articles.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
