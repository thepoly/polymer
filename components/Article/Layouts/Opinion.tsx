import React from 'react';
import Header from '@/components/Header';
import { ArticleContent, ArticleFooter } from '@/components/Article';
import { OpinionArticleHeader } from '@/components/Opinion/OpinionArticleHeader';
import { OpinionArticleFooter } from '@/components/Opinion/OpinionArticleFooter';
import { Article } from '@/payload-types';

export const OpinionLayout = ({ article, content }: { article: Article, content?: Article['content'] }) => {
  return (
    <main className="min-h-screen bg-bg-main pb-20 transition-colors duration-300">
      <Header />
      <article className="container mx-auto px-4 md:px-6 mt-8 md:mt-12">
        <OpinionArticleHeader article={article} />
        <div className="max-w-[600px] mx-auto">
          <ArticleContent content={content || article.content} />
          <ArticleFooter />
        </div>
      </article>
      <OpinionArticleFooter currentArticleId={article.id} />
    </main>
  );
};
