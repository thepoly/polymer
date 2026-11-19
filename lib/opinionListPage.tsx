import React from 'react';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import OpinionListPage from '@/components/Opinion/OpinionListPage';
import { opinionGroups, type OpinionGroupKey } from '@/components/Opinion/opinionGroups';
import { formatArticle } from '@/utils/formatArticle';
import { opinionCardSelect } from './opinionArticles';
import { OPINION_PAGE_SIZE, opinionPageNumber } from './opinionPagination';

export type OpinionSearchParams = Promise<{ page?: string | string[] }>;
export async function renderOpinionList(key: OpinionGroupKey, searchParams: OpinionSearchParams) {
  const page = opinionPageNumber((await searchParams).page);
  const group = opinionGroups[key];
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: 'articles',
    where: { and: [
      { section: { equals: 'opinion' } }, { _status: { equals: 'published' } },
      { opinionType: { in: [...group.types] } },
    ] },
    sort: ['-publishedDate', '-id'], page, limit: OPINION_PAGE_SIZE, depth: 1,
    select: opinionCardSelect,
  });
  if (page > Math.max(1, result.totalPages)) notFound();
  return <main className="min-h-screen bg-bg-main transition-colors duration-300">
    <Header />
    <OpinionListPage title={group.label} articles={result.docs.map((a) => formatArticle(a, { absoluteDate: true })).filter((a) => a !== null)}
      page={page} totalDocs={result.totalDocs} totalPages={result.totalPages} basePath={`/opinion/${group.slug}`} />
    <Footer />
  </main>;
}
