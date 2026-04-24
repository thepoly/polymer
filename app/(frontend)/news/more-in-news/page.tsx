import React from 'react';
import { getPayload } from 'payload';
import config from '@/payload.config';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NewsListPage from '@/components/News/NewsListPage';
import { formatArticle } from '@/utils/formatArticle';
import type { Article as ComponentArticle } from '@/components/FrontPage/types';
import type { Metadata } from 'next';
import { getSeo } from '@/lib/getSeo';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeo()

  return {
    title: seo.pages.newsMoreTitle,
    description: seo.pages.newsMoreDescription,
    alternates: { canonical: '/news/more-in-news' },
  }
}

export default async function MoreInNewsPage() {
  const payload = await getPayload({ config });

  const response = await payload.find({
    collection: 'articles',
    where: {
      and: [
        { section: { equals: 'news' } },
        { _status: { equals: 'published' } },
      ],
    },
    sort: '-publishedDate',
    limit: 200,
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
    },
  });

  const articles = response.docs
    .map((a) => formatArticle(a))
    .filter((a): a is ComponentArticle => a !== null);

  return (
    <main className="min-h-screen bg-bg-main transition-colors duration-300">
      <Header />
      <NewsListPage title="More in News" articles={articles} />
      <Footer />
    </main>
  );
}
