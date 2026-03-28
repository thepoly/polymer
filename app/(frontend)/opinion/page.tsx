import React from 'react';
import { getPayload } from 'payload';
import config from '@/payload.config';
import OpinionHeader from '@/components/Opinion/OpinionHeader';
import { OpinionArticleGrid } from '@/components/Opinion/OpinionArticleGrid';
import { OpinionArticle } from '@/components/Opinion/types';
import { Article as PayloadArticle, Media } from '@/payload-types';

export const revalidate = 60;

const formatOpinionArticle = (article: PayloadArticle): OpinionArticle | null => {
  if (!article || typeof article === 'number') return null;

  const authors = article.authors
    ?.map((author) => {
      if (typeof author === 'number') return null;
      return `${author.firstName} ${author.lastName}`;
    })
    .filter(Boolean)
    .join(' AND ') || null;

  return {
    id: article.id,
    slug: article.slug || article.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
    title: article.title,
    excerpt: article.subdeck || '',
    author: authors,
    authorId: null,
    authorHeadshot: null,
    date: null,
    publishedDate: article.publishedDate,
    createdAt: article.createdAt,
    image: (article.featuredImage as Media)?.url || null,
    section: article.section,
    opinionType: article.opinionType || null,
  };
};

export default async function OpinionPage() {
  const payload = await getPayload({ config });

  const result = await payload.find({
    collection: 'articles',
    where: {
      section: { equals: 'opinion' },
    },
    sort: '-publishedDate',
    limit: 100,
    depth: 2,
  });

  const articles = result.docs
    .map(formatOpinionArticle)
    .filter((a): a is OpinionArticle => a !== null);

  return (
    <main className="min-h-screen bg-white pt-[58px]">
      <OpinionHeader />
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-8">
        <OpinionArticleGrid articles={articles} />
      </div>
    </main>
  );
}
