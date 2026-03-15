import React, { Suspense } from 'react';
import { getPayload } from 'payload';
import config from '@/payload.config';
import OpinionHeader from '@/components/Opinion/OpinionHeader';
import { OpinionSubnav } from '@/components/Opinion/OpinionSubnav';
import { OpinionArticleGrid } from '@/components/Opinion/OpinionArticleGrid';
import { OpinionArticle, ColumnistAuthor } from '@/components/Opinion/types';
import { getArticleUrl } from '@/utils/getArticleUrl';
import { Article as PayloadArticle, Media } from '@/payload-types';

export const revalidate = 60;

type Props = {
  searchParams: Promise<{ category?: string }>;
};

const formatOpinionArticle = (article: PayloadArticle): OpinionArticle | null => {
  if (!article || typeof article === 'number') return null;

  const authors = article.authors
    ?.map((author) => {
      if (typeof author === 'number') return null;
      return `${author.firstName} ${author.lastName}`;
    })
    .filter(Boolean)
    .join(' AND ') || null;

  const date = article.publishedDate ? new Date(article.publishedDate) : null;
  let dateString: string | null = null;

  if (date) {
    const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60)
      dateString = `${diffMins} MINUTE${diffMins !== 1 ? 'S' : ''} AGO`;
    else if (diffHours < 24)
      dateString = `${diffHours} HOUR${diffHours !== 1 ? 'S' : ''} AGO`;
    else if (diffDays < 7)
      dateString = `${diffDays} DAY${diffDays !== 1 ? 'S' : ''} AGO`;
  }

  // Get first author's headshot for columnist info
  let authorHeadshot: string | null = null;
  let authorId: number | null = null;

  if (article.authors && article.authors.length > 0) {
    const firstAuthor = article.authors[0];
    if (typeof firstAuthor !== 'number') {
      authorId = firstAuthor.id;
      if (firstAuthor.headshot && typeof firstAuthor.headshot === 'object') {
        authorHeadshot = (firstAuthor.headshot as Media).url || null;
      }
    }
  }

  return {
    id: article.id,
    slug: article.slug || article.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
    title: article.title,
    excerpt: article.subdeck || '',
    author: authors,
    authorId,
    authorHeadshot,
    date: dateString,
    publishedDate: article.publishedDate,
    createdAt: article.createdAt,
    image: (article.featuredImage as Media)?.url || null,
    section: article.section,
    opinionType: article.opinionType || null,
  };
};

export default async function OpinionPage({ searchParams }: Props) {
  const { category } = await searchParams;
  const payload = await getPayload({ config });

  // Fetch all published opinion articles
  const result = await payload.find({
    collection: 'articles',
    where: {
      section: {
        equals: 'opinion',
      },
    },
    sort: '-publishedDate',
    limit: 100,
    depth: 2,
  });

  const articles = result.docs
    .map(formatOpinionArticle)
    .filter((a): a is OpinionArticle => a !== null);

  // Derive columnists from articles with opinionType === 'column'
  const columnistArticles = articles.filter(
    (a) => a.opinionType === 'column'
  );
  const columnistMap = new Map<number, ColumnistAuthor>();

  columnistArticles.forEach((article) => {
    const originalArticle = result.docs.find((doc) => doc.id === article.id);
    if (originalArticle && originalArticle.authors) {
      originalArticle.authors.forEach((author) => {
        if (typeof author === 'number') return;

        if (!columnistMap.has(author.id)) {
          columnistMap.set(author.id, {
            id: author.id,
            firstName: author.firstName,
            lastName: author.lastName,
            headshot: (author.headshot as Media)?.url || null,
            latestArticleUrl: getArticleUrl({
              section: originalArticle.section,
              slug: originalArticle.slug || '#',
              publishedDate: originalArticle.publishedDate,
              createdAt: originalArticle.createdAt,
            }),
          });
        }
      });
    }
  });

  const columnists = Array.from(columnistMap.values()).sort((a, b) =>
    `${a.firstName} ${a.lastName}`.localeCompare(
      `${b.firstName} ${b.lastName}`
    )
  );

  // Filter articles by category
  const filtered =
    category && category !== 'all'
      ? articles.filter((a) => a.opinionType === category)
      : articles;

  return (
    <main className="min-h-screen bg-white pt-[58px]">
      <OpinionHeader />

      {/* Opinion masthead */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 mt-6 md:mt-8 mb-2">
        <h1 className="text-4xl md:text-5xl font-normal tracking-tight text-gray-900">
          Opinion
        </h1>
      </div>

      {/* Subheader nav with dropdowns */}
      <Suspense
        fallback={<div className="h-[49px] border-b border-black bg-white" />}
      >
        <OpinionSubnav activeCategory={category || 'all'} columnists={columnists} />
      </Suspense>

      {/* Article grid */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-12">
        <OpinionArticleGrid articles={filtered} activeCategory={category || 'all'} />
      </div>
    </main>
  );
}
