"use client";

import React, { useState } from "react";
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import type { Article } from "@/components/FrontPage/types";

const PAGE_SIZE = 10;

export default function FeaturesListPage({
  title,
  articles,
}: {
  title: string;
  articles: Article[];
}) {
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(articles.length / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, articles.length);
  const visible = articles.slice(start - 1, end);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 30px 64px" }}>
      <div className="flex items-baseline justify-between mt-6 mb-8">
        <h1
          className="font-meta uppercase tracking-[0.04em] text-text-main"
          style={{ fontSize: 40, fontWeight: 400, lineHeight: 1 }}
        >
          {title}
        </h1>
        <TransitionLink
          href="/features"
          className="font-meta text-[14px] uppercase tracking-[0.08em] text-accent hover:underline transition-colors"
        >
          &larr; Back to Features
        </TransitionLink>
      </div>

      {/* Article list */}
      <div className="flex flex-col">
        {visible.map((article) => (
          <TransitionLink
            key={article.id}
            href={getArticleUrl(article)}
            className="group flex gap-5 py-5 border-b border-rule"
          >
            {article.image && (
              <div
                className="relative overflow-hidden shrink-0"
                style={{ width: 180, aspectRatio: "3/2" }}
              >
                <Image
                  src={article.image}
                  alt={article.title}
                  fill
                  className="object-cover"
                  sizes="180px"
                />
              </div>
            )}
            <div className="flex flex-col justify-center">
              <h2 className="font-copy font-medium leading-[1.15] text-[22px] text-text-main transition-colors group-hover:text-accent">
                {article.title}
              </h2>
              {article.author && (
                <p className="mt-1 font-meta text-[13px] font-medium uppercase tracking-[0.04em]">
                  <span className="text-text-muted">BY </span>
                  <span className="text-accent">{article.author}</span>
                  {article.date && (
                    <>
                      <span className="text-text-muted mx-1.5">&bull;</span>
                      <span className="text-text-muted">{article.date}</span>
                    </>
                  )}
                </p>
              )}
              {article.excerpt && (
                <p className="mt-1 font-meta text-[14px] leading-[1.5] text-text-muted line-clamp-2">
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
            {start}–{end} of {articles.length}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={page === 1}
              className="font-meta text-[13px] uppercase tracking-[0.04em] px-3 py-1.5 rounded transition-colors disabled:opacity-30 text-text-main hover:text-accent"
            >
              &larr; Prev
            </button>
            <span className="font-meta text-[13px] text-text-muted">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={page === totalPages}
              className="font-meta text-[13px] uppercase tracking-[0.04em] px-3 py-1.5 rounded transition-colors disabled:opacity-30 text-text-main hover:text-accent"
            >
              Next &rarr;
            </button>
          </div>
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
