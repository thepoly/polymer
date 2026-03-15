import React from 'react';
import { OpinionArticle } from './types';
import { OpinionPageArticleCard } from './OpinionPageArticleCard';

const editorialTypes = new Set(['staff-editorial', 'editorial-notebook', 'editors-notebook']);

function SectionRow({ title, articles }: { title: string; articles: OpinionArticle[] }) {
  if (articles.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900 shrink-0 whitespace-nowrap">
          {title}
        </h2>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-0">
        {articles.map((article, idx) => (
          <div
            key={article.id}
            className={`lg:px-4 ${idx === 0 ? 'lg:pl-0' : ''} ${
              idx === articles.length - 1 ? 'lg:pr-0' : ''
            } ${idx < articles.length - 1 ? 'lg:border-r border-gray-200' : ''}`}
          >
            <OpinionPageArticleCard article={article} variant="compact" />
          </div>
        ))}
      </div>
    </div>
  );
}

export const OpinionArticleGrid = ({ articles }: { articles: OpinionArticle[] }) => {
  if (articles.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">No articles found.</p>
      </div>
    );
  }

  const top3 = articles.slice(0, 3);
  const next5 = articles.slice(3, 8);
  const shownIds = new Set(articles.slice(0, 8).map((a) => a.id));
  const remaining = articles.filter((a) => !shownIds.has(a.id));

  const opinionSection = remaining
    .filter((a) => a.opinionType === 'opinion' || !a.opinionType)
    .slice(0, 5);
  const opinionIds = new Set(opinionSection.map((a) => a.id));

  const editorialSection = remaining
    .filter((a) => editorialTypes.has(a.opinionType || ''))
    .slice(0, 5);
  const editorialIds = new Set(editorialSection.map((a) => a.id));

  const moreSection = remaining
    .filter((a) => !opinionIds.has(a.id) && !editorialIds.has(a.id))
    .slice(0, 5);

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 shrink-0">Opinion</h1>
        <div className="flex-1 h-px bg-gray-300" />
      </div>

      {/* Top 3 with images */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-0 mb-8">
        {top3.map((article, idx) => (
          <div
            key={article.id}
            className={`lg:px-5 ${idx === 0 ? 'lg:pl-0' : ''} ${
              idx === top3.length - 1 ? 'lg:pr-0' : ''
            } ${idx < top3.length - 1 ? 'lg:border-r border-gray-200' : ''}`}
          >
            <OpinionPageArticleCard article={article} variant="medium" />
          </div>
        ))}
      </div>

      {/* Divider */}
      {next5.length > 0 && <div className="border-t border-gray-200 mb-8" />}

      {/* 5 smaller articles */}
      {next5.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-0 mb-8">
          {next5.map((article, idx) => (
            <div
              key={article.id}
              className={`lg:px-4 ${idx === 0 ? 'lg:pl-0' : ''} ${
                idx === next5.length - 1 ? 'lg:pr-0' : ''
              } ${idx < next5.length - 1 ? 'lg:border-r border-gray-200' : ''}`}
            >
              <OpinionPageArticleCard article={article} variant="compact" />
            </div>
          ))}
        </div>
      )}

      {/* Divider before section rows */}
      {(opinionSection.length > 0 || editorialSection.length > 0 || moreSection.length > 0) && (
        <div className="border-t border-gray-200 mb-8" />
      )}

      {/* Section rows */}
      <div className="flex flex-col gap-10">
        <SectionRow title="Opinion" articles={opinionSection} />
        <SectionRow title="Editorials" articles={editorialSection} />
        <SectionRow title="More in Opinion" articles={moreSection} />
      </div>
    </div>
  );
};
