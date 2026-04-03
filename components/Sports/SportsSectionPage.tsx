'use client';

import React from 'react';
import Image from 'next/image';
import TransitionLink from '@/components/TransitionLink';
import { Article } from '@/components/FrontPage/types';
import { getArticleUrl } from '@/utils/getArticleUrl';

const TEAM_LABELS: Record<string, string> = {
  'mens-basketball': "Men's Basketball",
  'womens-basketball': "Women's Basketball",
  'mens-hockey': "Men's Hockey",
  'womens-hockey': "Women's Hockey",
  'football': 'Football',
  'mens-soccer': "Men's Soccer",
  'womens-soccer': "Women's Soccer",
  'mens-lacrosse': "Men's Lacrosse",
  'womens-lacrosse': "Women's Lacrosse",
  'baseball': 'Baseball',
  'softball': 'Softball',
  'swimming-diving': 'Swimming & Diving',
  'track-field': 'Track & Field',
  'cross-country': 'Cross Country',
  'golf': 'Golf',
  'tennis': 'Tennis',
  'club-sports': 'Club Sports',
  'intramurals': 'Intramurals',
  'other': 'Other',
};

function formatAbsoluteDate(article: Article): string {
  const raw = article.publishedDate || article.createdAt;
  if (!raw) return '';
  const d = new Date(raw);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function SportsHeroCard({
  article,
  size,
}: {
  article: Article;
  size: 'hero' | 'sub';
}) {
  const teamLabel = article.team ? TEAM_LABELS[article.team] || article.team : null;
  const dateStr = formatAbsoluteDate(article);
  const isHero = size === 'hero';

  return (
    <TransitionLink href={getArticleUrl(article)} className="group relative block w-full h-full overflow-hidden">
      {article.image ? (
        <Image
          src={article.image}
          alt={article.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          sizes={isHero ? '(max-width: 768px) 100vw, 60vw' : '(max-width: 768px) 100vw, 30vw'}
        />
      ) : (
        <div className="absolute inset-0 bg-neutral-800" />
      )}

      {/* Bottom text box overlapping the image */}
      <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 text-text-main">
        <div className={isHero ? 'px-5 py-4' : 'px-4 py-3'}>
          {/* Team + date row */}
          <div className="flex items-center gap-2 mb-1">
            {teamLabel && (
              <span className="font-meta text-[11px] font-bold uppercase tracking-[0.08em] text-accent dark:text-[#d96b76]">
                {teamLabel}
              </span>
            )}
            {teamLabel && dateStr && (
              <span className="font-meta text-[10px] text-text-muted">|</span>
            )}
            {dateStr && (
              <span className="font-meta text-[10px] uppercase tracking-[0.04em] text-text-muted">
                {dateStr}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className={`font-copy font-bold leading-[1.15] tracking-[-0.01em] ${isHero ? 'text-[22px] md:text-[28px]' : 'text-[16px] md:text-[19px]'}`}>
            {article.title}
          </h3>

          {/* Author — bottom left */}
          {article.author && (
            <p className={`font-meta font-medium uppercase tracking-[0.04em] text-text-muted ${isHero ? 'text-[11px] mt-2' : 'text-[10px] mt-1.5'}`}>
              By {article.author}
            </p>
          )}
        </div>
      </div>
    </TransitionLink>
  );
}

export interface SportsSectionPageProps {
  title: string;
  articles: Article[];
  pinnedHero: Article[];
}

export default function SportsSectionPage({
  title,
  articles,
  pinnedHero,
}: SportsSectionPageProps) {
  // Build the 3 hero articles: pinned first, then auto-fill from pool
  const usedIds = new Set<string | number>();
  const heroArticles: Article[] = [];

  for (const a of pinnedHero) {
    if (heroArticles.length >= 3) break;
    heroArticles.push(a);
    usedIds.add(a.id);
  }
  for (const a of articles) {
    if (heroArticles.length >= 3) break;
    if (usedIds.has(a.id)) continue;
    if (!a.image) continue;
    heroArticles.push(a);
    usedIds.add(a.id);
  }

  const hero = heroArticles[0] || null;
  const bottomLeft = heroArticles[1] || null;
  const bottomRight = heroArticles[2] || null;

  return (
    <div className="w-full bg-bg-main text-text-main transition-colors duration-300">
      <div className="mx-auto max-w-[1280px] px-4 md:px-6 xl:px-[30px] pt-6 pb-14">
        {/* Section header */}
        <h1 className="font-meta text-[32px] md:text-[40px] font-bold uppercase tracking-[0.08em] text-accent dark:text-[#d96b76] mb-6">
          {title}
        </h1>

        {/* Main grid: left 2/3 hero images + right 1/3 placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left 2/3 — Hero image grid */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Hero — full width on top */}
            {hero && (
              <div className="relative aspect-[16/9] md:aspect-[2/1]">
                <SportsHeroCard article={hero} size="hero" />
              </div>
            )}

            {/* Two smaller side-by-side below */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bottomLeft && (
                <div className="relative aspect-[4/3]">
                  <SportsHeroCard article={bottomLeft} size="sub" />
                </div>
              )}
              {bottomRight && (
                <div className="relative aspect-[4/3]">
                  <SportsHeroCard article={bottomRight} size="sub" />
                </div>
              )}
            </div>
          </div>

          {/* Right 1/3 — Placeholder column */}
          <div className="hidden lg:flex lg:flex-col lg:items-center lg:justify-center border border-dashed border-neutral-300 dark:border-neutral-700 rounded-md min-h-[300px] lg:min-h-0">
            <p className="font-meta text-sm text-text-muted uppercase tracking-wider">
              Coming Soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
