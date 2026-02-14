import React from 'react';
import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@/payload.config';
import Header from '@/components/Header';
import { ArticleHeader, ArticleContent, ArticleFooter } from '@/components/Article';

export const revalidate = 60;

type Args = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ArticlePage({ params }: Args) {
  const { slug } = await params;
  const payload = await getPayload({ config });

  const result = await payload.find({
    collection: 'articles',
    where: {
      slug: {
        equals: slug,
      },
    },
    limit: 1,
  });

  const article = result.docs[0];

  if (!article) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-white pb-20">
      <Header />
      <article className="container mx-auto px-4 md:px-6 mt-8 md:mt-12">
        <ArticleHeader article={article} />
        <ArticleContent content={article.content} />
        <ArticleFooter />
      </article>
    </main>
  );
}

export async function generateStaticParams() {
  const payload = await getPayload({ config });
  const articles = await payload.find({
    collection: 'articles',
    limit: 1000,
    select: {
      slug: true,
    },
  });

  return articles.docs
    .filter((doc) => doc.slug)
    .map((doc) => ({
      slug: doc.slug as string,
    }));
}
