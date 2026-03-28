
import React from 'react';
import Footer from '@/components/Footer';
import { ArticleRecommendations } from '@/components/Article';
import { ArticleHeader, ArticleContent, ArticleDivider, ArticleStaffBios } from '@/components/Article/Photofeature';
import { Article } from '@/payload-types';

export const PhotofeatureLayout = ({ article, content }: { article: Article, content: Article['content'] }) => {
  return (
    <main className="min-h-screen overflow-x-hidden bg-bg-main transition-colors duration-300">
      <ArticleHeader article={article} />
      <article className="container mx-auto px-4 md:px-6">
        <ArticleContent content={content} />
        <ArticleDivider className="mt-0" />
        <ArticleStaffBios article={article} />
      </article>
      <ArticleRecommendations currentArticle={article} />
      <Footer />
    </main>
  );
};
