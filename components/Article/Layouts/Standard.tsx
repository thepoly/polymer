
import React from 'react';
import Footer from '@/components/Footer';
import { ArticleHeader, ArticleContent, ArticleDivider, ArticleRecommendations, ArticleStaffBios } from '@/components/Article';
import ArticleStaticHeader from '@/components/Article/ArticleStaticHeader';
import { Article } from '@/payload-types';

export const StandardLayout = ({ article, content }: { article: Article, content?: Article['content'] }) => {
  const isFollytechnic = (article as unknown as Record<string, unknown>).isFollytechnic as boolean | null | undefined;
  return (
    <main className={`min-h-screen overflow-x-hidden bg-bg-main pt-[56px] transition-colors duration-300${isFollytechnic ? ' follytechnic' : ''}`}>
      <ArticleStaticHeader alwaysVisible />
      <article className="container mx-auto px-4 md:px-6 mt-8 md:mt-12">
        <ArticleHeader article={article} />
        <ArticleContent content={content || article.content} />
        <ArticleDivider />
        <ArticleStaffBios article={article} />
      </article>
      <ArticleRecommendations currentArticle={article} />
      <Footer />
    </main>
  );
};
