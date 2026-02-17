
import React from 'react';
import Header from '@/components/Header';
import { ArticleHeader, ArticleContent, ArticleFooter } from '@/components/Article';
import { Article } from '@/payload-types';

export const StandardLayout = ({ article, content }: { article: Article, content?: Article['content'] }) => {
  return (
    <main className="min-h-screen bg-white pb-20">
      <Header />
      <article className="container mx-auto px-4 md:px-6 mt-8 md:mt-12">
        <ArticleHeader article={article} />
        <ArticleContent content={content || article.content} />
        <ArticleFooter />
      </article>
    </main>
  );
};
