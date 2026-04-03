'use client';

import React from 'react';
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
  const imgHeight = isHero ? 360 : 240;

  return (
    <TransitionLink href={getArticleUrl(article)} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
      <div style={{ position: 'relative', width: '100%' }}>
        {article.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.image}
            alt={article.title}
            style={{ display: 'block', width: '100%', height: imgHeight, objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: '100%', height: imgHeight, background: '#262626' }} />
        )}

        {/* White text box overlapping the bottom of the image */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--color-bg-main, #fff)',
          padding: isHero ? '16px 20px' : '12px 16px',
          zIndex: 2,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {teamLabel && (
              <span className="font-meta" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-accent, #d6001c)' }}>
                {teamLabel}
              </span>
            )}
            {teamLabel && dateStr && (
              <span style={{ fontSize: 10, color: 'var(--color-text-muted, #888)' }}>|</span>
            )}
            {dateStr && (
              <span className="font-meta" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted, #888)' }}>
                {dateStr}
              </span>
            )}
          </div>

          <h3 className="font-copy" style={{
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
            fontSize: isHero ? 26 : 18,
            margin: 0,
          }}>
            {article.title}
          </h3>

          {article.author && (
            <p className="font-meta" style={{
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--color-text-muted, #888)',
              fontSize: isHero ? 11 : 10,
              marginTop: isHero ? 8 : 6,
              marginBottom: 0,
            }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
          {/* Left 2/3 — Hero image grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Hero — full width on top */}
            {hero && <SportsHeroCard article={hero} size="hero" />}

            {/* Two smaller side-by-side below */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {bottomLeft && <SportsHeroCard article={bottomLeft} size="sub" />}
              {bottomRight && <SportsHeroCard article={bottomRight} size="sub" />}
            </div>
          </div>

          {/* Right 1/3 — Placeholder column */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px dashed',
            borderColor: 'var(--color-border, #ccc)',
            borderRadius: '6px',
            minHeight: '300px',
          }}>
            <p className="font-meta text-sm text-text-muted uppercase tracking-wider">
              Coming Soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
