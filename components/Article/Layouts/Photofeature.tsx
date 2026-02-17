
import React from 'react';
import { ArticleHeader, ArticleContent, ArticleFooter } from '@/components/Article/Photofeature';
import { Article } from '@/payload-types';

export const PhotofeatureLayout = ({ article, content }: { article: Article, content: Article['content'] }) => {
  return (
    <main className="min-h-screen bg-white pb-20">
      <ArticleHeader article={article} />
      <article className="container mx-auto px-4 md:px-6">
        <ArticleContent content={content} />
        <ArticleFooter />
      </article>
    </main>
  );
};
