import React from 'react';
import Footer from '@/components/Footer';
import { ArticleRecommendations } from '@/components/Article';
import { ArticleHeader, ArticleContent, ArticleDivider, ArticleStaffBios } from '@/components/Article/Photofeature';
import { ArticleHeader as StandardArticleHeader, ArticleDivider as StandardDivider, ArticleStaffBios as StandardStaffBios } from '@/components/Article';
import ArticleStaticHeader from '@/components/Article/ArticleStaticHeader';
import { Article } from '@/payload-types';

export const PhotofeatureLayout = ({ article, content }: { article: Article, content: Article['content'] }) => {
  const isFollytechnic = (article as unknown as Record<string, unknown>).isFollytechnic as boolean | null | undefined;
  return (
    <main className={`min-h-screen overflow-x-hidden bg-bg-main transition-colors duration-300${isFollytechnic ? ' follytechnic' : ''}`}>

      {/* Mobile: standard layout header */}
      <div className="sm:hidden">
        <div className="pt-[56px]">
          <ArticleStaticHeader />
          <article className="container mx-auto px-4 mt-8">
            <StandardArticleHeader article={article} />
            <ArticleContent content={content} />
            <StandardDivider />
            <StandardStaffBios article={article} />
          </article>
        </div>
      </div>

      {/* Desktop (sm+): full-screen photofeature layout */}
      <div className="hidden sm:block">
        <ArticleHeader article={article} />
        <article className="container mx-auto px-4 md:px-6">
          <ArticleContent content={content} />
          <ArticleDivider className="mt-0" />
          <ArticleStaffBios article={article} />
        </article>
      </div>

      <ArticleRecommendations currentArticle={article} />
      <Footer />
    </main>
  );
};
