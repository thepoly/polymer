import React from 'react';
import Footer from '@/components/Footer';
import { ArticleContent, ArticleDivider, ArticleRecommendations, ArticleStaffBios } from '@/components/Article';
import { OpinionArticleHeader } from '@/components/Opinion/OpinionArticleHeader';
import OpinionHeader from '@/components/Opinion/OpinionHeader';
import OpinionScrollBar from '@/components/Opinion/OpinionScrollBar';
import { Article } from '@/payload-types';

export const OpinionLayout = ({ article, content }: { article: Article, content?: Article['content'] }) => {
  return (
    <main className="min-h-screen bg-bg-main pb-20 pt-[58px] transition-colors duration-300">
      <OpinionHeader />
      <OpinionScrollBar title={article.title} />
      <article className="container mx-auto px-4 md:px-6 mt-8 md:mt-12">
        <OpinionArticleHeader article={article} />
        <div className="max-w-[600px] mx-auto">
          <ArticleContent content={content || article.content} />
          <ArticleDivider maxWidthClassName="max-w-full" />
          <ArticleStaffBios article={article} maxWidthClassName="max-w-full" />
        </div>
      </article>
      <ArticleRecommendations currentArticle={article} />
      <Footer />
    </main>
  );
};
