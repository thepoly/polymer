import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArticleContent, ArticleDivider, ArticleRecommendations, ArticleStaffBios } from '@/components/Article';
import { OpinionArticleHeader } from '@/components/Opinion/OpinionArticleHeader';
import { Article } from '@/payload-types';

export const OpinionLayout = ({ article, content }: { article: Article, content?: Article['content'] }) => {
  return (
    <main className="min-h-screen bg-bg-main transition-colors duration-300">
      <Header mobileTight />
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
