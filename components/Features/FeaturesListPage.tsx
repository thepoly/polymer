"use client";

import { SUMMARY_CLASS } from "@/components/summaryClass";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import TransitionLink from "@/components/TransitionLink";
import { getArticleUrl } from "@/utils/getArticleUrl";
import type { Article } from "@/components/FrontPage/types";
import { Byline } from "@/components/FrontPage/Byline";

const PAGE_SIZE = 10;

/** One filter above the list: a link to the archive narrowed to a section */
export type ArchiveFilter = { key: string; label: string; count: number; href: string; active: boolean };

const pill =
  "inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 font-meta text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2";
const pillOn = "border-text-main bg-text-main text-bg-main";
const pillOff = "border-rule-strong text-text-main hover:border-accent hover:text-accent";

export default function FeaturesListPage({
  title,
  articles,
  filters = [],
  capped = null,
}: {
  title: string;
  articles: Article[];
  /** Section filters, shown as a row of pills under the title */
  filters?: ArchiveFilter[];
  /** When the list stops short of the whole archive: how many it holds, and where to search the rest */
  capped?: { shown: number; searchHref: string } | null;
}) {
  const [page, setPage] = useState(1);
  // On phones the filters scroll sideways: bring the one that's on into view
  const filterRow = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const row = filterRow.current;
    const on = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (row && on) row.scrollLeft = on.offsetLeft - row.clientWidth / 2 + on.offsetWidth / 2;
  }, []);

  const totalPages = Math.ceil(articles.length / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, articles.length);
  const visible = articles.slice(start - 1, end);

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-16 pt-5 md:px-[30px]">
      <div className="mb-6 mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 md:mb-8 md:mt-6">
        <h1 className="font-meta text-[30px] uppercase leading-none tracking-[0.04em] text-text-main md:text-[40px]" style={{ fontWeight: 400 }}>
          {title}
        </h1>
        <TransitionLink
          href="/features"
          className="font-meta text-[14px] uppercase tracking-[0.08em] text-accent hover:underline transition-colors"
        >
          &larr; Back to Features
        </TransitionLink>
      </div>

      {filters.length > 1 && (
        <nav aria-label="Filter by section" className="-mt-2 mb-6">
          <ul ref={filterRow} className="scrollbar-hide relative -mx-1 flex gap-2 overflow-x-auto px-1 py-1 md:flex-wrap">
            {filters.map((f) => (
              <li key={f.key}>
                <Link
                  href={f.href}
                  scroll={false}
                  aria-current={f.active ? "page" : undefined}
                  className={`${pill} ${f.active ? pillOn : pillOff}`}
                >
                  {f.label}
                  <span className={f.active ? "opacity-70" : "text-text-muted"}>{f.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {capped && (
        <p className="-mt-2 mb-4 font-meta text-[13px] text-text-muted">
          Showing the {capped.shown} most recent.{" "}
          <TransitionLink href={capped.searchHref} className="text-accent underline-offset-4 hover:underline">
            Search for older stories
          </TransitionLink>
          .
        </p>
      )}

      {/* Article list */}
      <div className="flex flex-col">
        {visible.map((article) => (
          <TransitionLink
            key={article.id}
            href={getArticleUrl(article)}
            className="group flex gap-4 border-b border-rule py-4 md:gap-5 md:py-5"
          >
            {article.image && (
              <div className="relative aspect-[3/2] w-[112px] shrink-0 overflow-hidden md:w-[180px]">
                <Image
                  src={article.image}
                  alt={article.imageTitle || ""}
                  fill
                  className="object-cover"
                  sizes="(max-width: 767px) 112px, 180px"
                />
              </div>
            )}
            <div className="flex flex-col justify-center">
              <h2 className="font-copy text-[19px] font-medium leading-[1.15] text-text-main transition-colors group-hover:text-accent md:text-[22px]">
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
            {start}–{end} of {articles.length}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={page === 1}
              className="inline-flex min-h-11 items-center rounded px-4 font-meta text-[13px] uppercase tracking-[0.04em] text-text-main transition-colors hover:text-accent disabled:opacity-30"
            >
              &larr; Prev
            </button>
            <span className="font-meta text-[13px] text-text-muted">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={page === totalPages}
              className="inline-flex min-h-11 items-center rounded px-4 font-meta text-[13px] uppercase tracking-[0.04em] text-text-main transition-colors hover:text-accent disabled:opacity-30"
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
