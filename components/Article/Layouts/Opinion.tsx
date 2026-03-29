import React from 'react';
import Footer from '@/components/Footer';
import { ArticleContent, ArticleDivider, ArticleRecommendations, ArticleStaffBios } from '@/components/Article';
import { OpinionArticleHeader } from '@/components/Opinion/OpinionArticleHeader';
import ArticleStaticHeader from '@/components/Article/ArticleStaticHeader';
import { Article } from '@/payload-types';

export const OpinionLayout = ({ article, content }: { article: Article, content?: Article['content'] }) => {
  const isFollytechnic = (article as unknown as Record<string, unknown>).isFollytechnic as boolean | null | undefined;
  return (
    <main className={`min-h-screen bg-bg-main pt-[56px] transition-colors duration-300${isFollytechnic ? ' follytechnic' : ''}`}>
      <ArticleStaticHeader />
      <article className="container mx-auto px-4 md:px-6 mt-8 md:mt-12">
        <OpinionArticleHeader article={article} />
        <ArticleContent content={content || article.content} />
        <ArticleDivider />
        <ArticleStaffBios article={article} />
      </article>
      <ArticleRecommendations currentArticle={article} />
      <Footer />
    </main>
  );
};
