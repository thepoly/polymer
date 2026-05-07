import React from 'react';
import type { Article } from '@/payload-types';

type Props = {
  article: Article;
  className?: string;
};

const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export const LegacyArchiveLink: React.FC<Props> = ({ article, className = '' }) => {
  const url = article.legacyHtmlUrl;
  if (!url) return null;

  const dateStr = article.publishedDate || article.createdAt;
  const monthYear = dateStr ? MONTH_YEAR_FORMATTER.format(new Date(dateStr)) : '';

  return (
    <div className={`max-w-[680px] mx-auto mt-8 mb-4 ${className}`}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-2 rounded-full border border-rule px-4 py-2 font-meta text-sm text-text-main transition-colors hover:border-text-main"
      >
        <span>
          View this article as it originally appeared on poly.rpi.edu
          {monthYear ? ` in ${monthYear}` : ''}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:-translate-y-[1px] group-hover:translate-x-[1px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 3.5h-3v9.5h9.5v-3" />
          <path d="M9.5 3h3.5v3.5" />
          <path d="M7.5 8.5l5.5-5.5" />
        </svg>
      </a>
    </div>
  );
};
