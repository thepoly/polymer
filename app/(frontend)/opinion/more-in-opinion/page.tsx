import React from 'react';
import { getPayload } from 'payload';
import config from '@/payload.config';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import OpinionListPage from '@/components/Opinion/OpinionListPage';
import { opinionGroups } from '@/components/Opinion/opinionGroups';
import { formatArticle } from '@/utils/formatArticle';
import type { Article as ComponentArticle } from '@/components/FrontPage/types';
import type { Metadata } from 'next';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'More in Opinion',
  description: 'General opinion pieces and letters to the editor from The Polytechnic.',
  alternates: { canonical: '/opinion/more-in-opinion' },
};

export default async function MoreInOpinionPage() {
  const payload = await getPayload({ config });
  const group = opinionGroups.more;

  const response = await payload.find({
    collection: 'articles',
    where: {
      and: [
        { section: { equals: 'opinion' } },
        { _status: { equals: 'published' } },
        { opinionType: { in: group.types as unknown as string[] } },
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
      opinionType: true,
    },
  });

  const articles = response.docs
    .map((a) => formatArticle(a))
    .filter((a): a is ComponentArticle => a !== null);

  return (
    <main className="min-h-screen bg-bg-main transition-colors duration-300">
      <Header />
      <OpinionListPage title="More in Opinion" articles={articles} />
      <Footer />
    </main>
  );
}
