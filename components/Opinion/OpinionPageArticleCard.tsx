import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { OpinionArticle } from './types';
import { getArticleUrl } from '@/utils/getArticleUrl';

const opinionTypeLabels: Record<string, string> = {
  opinion: 'Op-Ed',
  column: 'Column',
  'staff-editorial': 'Staff Editorial',
  'editorial-notebook': 'Editorial Notebook',
  endorsement: 'Endorsement',
  'top-hat': 'Top Hat',
  'candidate-profile': 'Candidate Profile',
  'letter-to-the-editor': 'Letter to the Editor',
  'polys-recommendations': "The Poly's Recommendations",
  other: 'Other',
};

export const OpinionPageArticleCard = ({
  article,
  variant = 'compact',
}: {
  article: OpinionArticle;
  variant?: 'lead' | 'medium' | 'compact';
}) => {
  const url = getArticleUrl(article);
  const typeLabel = opinionTypeLabels[article.opinionType || 'opinion'] || 'Opinion';

  // Lead variant: text on left, large image on right (NYT hero style)
  if (variant === 'lead') {
    return (
      <Link href={url} className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 cursor-pointer group">
        {/* Left: text content */}
        <div className="flex flex-col justify-center order-2 md:order-1">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">
            {typeLabel}
          </span>
          <h2 className="font-bold text-gray-900 text-2xl md:text-[28px] leading-tight mb-3 group-hover:text-gray-600 transition-colors">
            {article.title}
          </h2>
          {article.excerpt && (
            <p className="text-gray-600 text-[16px] leading-relaxed mb-3">
              {article.excerpt}
            </p>
          )}
          {article.author && (
            <p className="text-[13px] text-gray-500">
              By {article.author}
            </p>
          )}
        </div>
        {/* Right: image */}
        {article.image && (
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100 order-1 md:order-2">
            <Image
              src={article.image}
              alt={article.title}
              fill
              className="object-cover group-hover:brightness-95 transition-all"
            />
          </div>
        )}
      </Link>
    );
  }

  // Medium variant: image on top, text below (NYT 3-column row)
  if (variant === 'medium') {
    return (
      <Link href={url} className="flex flex-col cursor-pointer group">
        {article.image && (
          <div className="relative aspect-[3/2] w-full overflow-hidden bg-gray-100 mb-3">
            <Image
              src={article.image}
              alt={article.title}
              fill
              className="object-cover group-hover:brightness-95 transition-all"
            />
          </div>
        )}
        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
          {typeLabel}
        </span>
        <h3 className="font-bold text-gray-900 text-[17px] leading-snug mb-1.5 group-hover:text-gray-600 transition-colors">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="text-gray-600 text-[14px] leading-snug mb-2 line-clamp-3">
            {article.excerpt}
          </p>
        )}
        {article.author && (
          <p className="text-[12px] text-gray-500">
            By {article.author}
          </p>
        )}
      </Link>
    );
  }

  // Compact variant: small text-only card (NYT 5-column row)
  return (
    <Link href={url} className="flex flex-col cursor-pointer group">
      {article.image && (
        <div className="relative aspect-[3/2] w-full overflow-hidden bg-gray-100 mb-2">
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover group-hover:brightness-95 transition-all"
          />
        </div>
      )}
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
        {typeLabel}
      </span>
      <h3 className="font-bold text-gray-900 text-[15px] leading-snug mb-1 group-hover:text-gray-600 transition-colors line-clamp-3">
        {article.title}
      </h3>
      {article.author && (
        <p className="text-[11px] text-gray-500">
          By {article.author}
        </p>
      )}
    </Link>
  );
};
