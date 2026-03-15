import React from 'react';
import Link from 'next/link';
import { OpinionArticle } from './types';
import { OpinionPageArticleCard } from './OpinionPageArticleCard';

export const OpinionArticleGrid = ({
  articles,
  activeCategory,
}: {
  articles: OpinionArticle[];
  activeCategory: string;
}) => {
  if (articles.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">
          No articles found in this category.
        </p>
      </div>
    );
  }

  // Split articles into rows: 1 lead, 3 medium, 5 compact, then repeat
  const leadArticle = articles[0];
  const threeRow = articles.slice(1, 4);
  const fiveRow = articles.slice(4, 9);
  const remaining = articles.slice(9);

  return (
    <div>
      {/* ===== LEAD ARTICLE (1 up) ===== */}
      <div className="pb-8">
        <OpinionPageArticleCard article={leadArticle} variant="lead" />
      </div>

      {/* Faint divider */}
      <div className="border-t border-gray-200" />

      {/* ===== THREE ROW ===== */}
      {threeRow.length > 0 && (
        <div className="py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0">
            {threeRow.map((article, idx) => (
              <div
                key={article.id}
                className={`px-0 sm:px-5 ${
                  idx === 0 ? 'sm:pl-0' : ''
                } ${
                  idx === threeRow.length - 1 ? 'sm:pr-0' : ''
                } ${
                  idx < threeRow.length - 1 ? 'sm:border-r border-gray-200' : ''
                } ${
                  idx > 0 ? 'mt-6 sm:mt-0' : ''
                }`}
              >
                <OpinionPageArticleCard article={article} variant="medium" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Faint divider */}
      {fiveRow.length > 0 && <div className="border-t border-gray-200" />}

      {/* ===== FIVE ROW ===== */}
      {fiveRow.length > 0 && (
        <div className="py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-0">
            {fiveRow.map((article, idx) => (
              <div
                key={article.id}
                className={`px-0 lg:px-4 ${
                  idx === 0 ? 'lg:pl-0' : ''
                } ${
                  idx === fiveRow.length - 1 ? 'lg:pr-0' : ''
                } ${
                  idx < fiveRow.length - 1 ? 'lg:border-r border-gray-200' : ''
                } ${
                  idx > 0 ? 'mt-6 lg:mt-0' : ''
                }`}
              >
                <OpinionPageArticleCard article={article} variant="compact" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== REMAINING ARTICLES (repeat pattern) ===== */}
      {remaining.length > 0 && (
        <>
          <div className="border-t border-gray-200" />
          <div className="py-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0">
              {remaining.map((article, idx) => (
                <div
                  key={article.id}
                  className={`px-0 sm:px-5 ${
                    idx === 0 ? 'sm:pl-0' : ''
                  } ${
                    (idx + 1) % 3 === 0 || idx === remaining.length - 1 ? 'sm:pr-0' : ''
                  } ${
                    (idx + 1) % 3 !== 0 && idx < remaining.length - 1 ? 'sm:border-r border-gray-200' : ''
                  } ${
                    idx >= 3 ? 'mt-8 sm:mt-6 lg:mt-8 pt-6 lg:pt-8 border-t border-gray-200 sm:border-t-0 lg:border-t' : ''
                  } ${
                    idx > 0 && idx < 3 ? 'mt-6 sm:mt-0' : ''
                  }`}
                >
                  <OpinionPageArticleCard article={article} variant="medium" />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Sidebar boxes */}
      <div className="border-t border-gray-200 pt-8 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              What should The Polytechnic write about?
            </h3>
            <p className="text-[14px] text-gray-600 mb-4">
              Help us prioritize topics for future opinion pieces.
            </p>
            <button className="w-full bg-[#D6001C] text-white font-bold py-2.5 px-4 hover:bg-[#a00014] transition-colors text-[14px]">
              Submit a Suggestion
            </button>
          </div>
          <div className="border-l-4 border-[#D6001C] pl-5 flex items-center">
            <p className="text-[15px] text-gray-700">
              Interested in submitting an op-ed?{' '}
              <Link href="#" className="text-[#D6001C] font-semibold hover:underline">
                Learn More
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
