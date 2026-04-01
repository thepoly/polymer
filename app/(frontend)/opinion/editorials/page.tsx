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
import { getSeo } from '@/lib/getSeo';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeo()

  return {
    title: seo.pages.opinionEditorialsTitle,
    description: seo.pages.opinionEditorialsDescription,
    alternates: { canonical: '/opinion/editorials' },
  }
}

export default async function EditorialsPage() {
  const payload = await getPayload({ config });
  const group = opinionGroups.editorials;

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
      <OpinionListPage title="Editorials" articles={articles} />
      <Footer />
    </main>
  );
}
