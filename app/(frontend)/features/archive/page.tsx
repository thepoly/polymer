import React from 'react';
import { getPayload } from 'payload';
import config from '@/payload.config';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FeaturesListPage from '@/components/Features/FeaturesListPage';
import { formatArticle } from '@/utils/formatArticle';
import type { Article as ComponentArticle } from '@/components/FrontPage/types';
import type { Metadata } from 'next';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'More in Features',
  description: 'All features articles from The Polytechnic.',
  alternates: { canonical: '/features/archive' },
};

export default async function FeaturesArchivePage() {
  const payload = await getPayload({ config });

  const response = await payload.find({
    collection: 'articles',
    where: {
      and: [
        { section: { equals: 'features' } },
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
      writeInAuthors: true,
    },
  });

  const articles = response.docs
    .map((a) => formatArticle(a))
    .filter((a): a is ComponentArticle => a !== null);

  return (
    <main className="min-h-screen bg-bg-main transition-colors duration-300">
      <Header />
      <FeaturesListPage title="More in Features" articles={articles} />
      <Footer />
    </main>
  );
}
