import React from 'react';
import { getPayload, type Where } from 'payload';
import config from '@/payload.config';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SportsAllStories, { type SportTab } from '@/components/Sports/SportsAllStories';
import { formatArticle } from '@/utils/formatArticle';
import { SPORTS, type SportValue } from '@/lib/sports';
import { loadSportsLayout } from '@/lib/sportsPage';
import { troyMonth } from '@/lib/troyTime';
import type { Article as ComponentArticle } from '@/components/FrontPage/types';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const revalidate = 60;

const PER_PAGE = 24;
// Far past any real archive; bigger numbers would overflow the query offset
const MAX_PAGE = 1000;

export const metadata: Metadata = {
  title: 'Sports Stories',
  description: 'Every sports story from The Polytechnic, newest first.',
  alternates: { canonical: '/sports/all' },
};

type Args = { searchParams: Promise<{ sport?: string; page?: string }> };

const isSport = (value: string | undefined): value is SportValue => SPORTS.some((s) => s.value === value);

export default async function SportsAllStoriesPage({ searchParams }: Args) {
  const params = await searchParams;
  const activeSport = isSport(params.sport) ? params.sport : null;
  // Whole, finite page numbers only ("Infinity" or "abc" mean page 1)
  const parsedPage = Math.floor(Number(params.page));
  const requestedPage = Number.isFinite(parsedPage) && parsedPage > 1 ? parsedPage : 1;
  if (requestedPage > MAX_PAGE) notFound();
  const payload = await getPayload({ config });

  const published: Where[] = [{ section: { equals: 'sports' } }, { _status: { equals: 'published' } }];

  // Tabs: each sport with stories, most stories first (just the sport column)
  const sportsResponse = await payload.find({
    collection: 'articles',
    where: { and: published },
    pagination: false,
    depth: 0,
    select: { sport: true },
  });
  const counts = new Map<SportValue, number>();
  for (const doc of sportsResponse.docs) {
    const sport = doc.sport as SportValue | null | undefined;
    if (sport) counts.set(sport, (counts.get(sport) ?? 0) + 1);
  }
  const tabs: SportTab[] = [...counts.entries()]
    .map(([sport, count]) => ({ sport, count }))
    // Ties keep the sports list's order
    .sort((a, b) => b.count - a.count || SPORTS.findIndex((s) => s.value === a.sport) - SPORTS.findIndex((s) => s.value === b.sport));

  const response = await payload.find({
    collection: 'articles',
    where: { and: [...published, ...(activeSport ? [{ sport: { equals: activeSport } }] : [])] },
    sort: '-publishedDate',
    limit: PER_PAGE,
    page: requestedPage,
    depth: 1,
    select: {
      title: true,
      slug: true,
      subdeck: true,
      featuredImage: true,
      section: true,
      kicker: true,
      publishedDate: true,
      createdAt: true,
      authors: true,
      writeInAuthors: true,
      sport: true,
    },
  });
  // A page past the end is a 404, not an empty "Page 50 of 3"
  if (requestedPage > 1 && requestedPage > response.totalPages) notFound();
  const articles = response.docs
    .map((a) => formatArticle(a))
    .filter((a): a is ComponentArticle => a !== null);

  // Stories editors reframed for the featured row keep that framing here;
  // the rest use each photo's focal point
  const { featuredFocus: focus } = await loadSportsLayout(payload);

  return (
    <main className="min-h-screen bg-bg-main section-sports transition-colors duration-300">
      <Header />
      <SportsAllStories
        articles={articles}
        tabs={tabs}
        activeSport={activeSport}
        page={response.page ?? requestedPage}
        totalPages={response.totalPages}
        currentMonth={troyMonth(new Date())}
        focus={focus}
      />
      <Footer />
    </main>
  );
}
