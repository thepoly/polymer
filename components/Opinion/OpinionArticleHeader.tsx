import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Article, Media, User } from '@/payload-types';
import { opinionTypeLabels } from './opinionTypeLabels';

type Props = {
  article: Article;
};

export const OpinionArticleHeader: React.FC<Props> = ({ article }) => {
  const featuredImage = article.featuredImage as Media | null;
  const opinionType = (article as Record<string, unknown>).opinionType as string | undefined;
  const imageCaption = (article as Record<string, unknown>).imageCaption as string | undefined;
  const typeLabel = opinionTypeLabels[opinionType || 'opinion'] || 'Op-Ed';

  return (
    <div className="flex flex-col items-center mb-8">
      {/* Kicker + Opinion Type */}
      <div className="flex flex-col items-center gap-1 mb-4">
        <span className="font-meta text-accent font-bold uppercase text-sm tracking-widest">
          Opinion
        </span>
        {opinionType && opinionType !== 'opinion' && (
          <span className="font-meta font-bold uppercase text-sm tracking-wide text-text-main">
            {typeLabel}
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="w-8 border-t border-rule-strong mb-6" />

      {/* Title */}
      <h1 className="font-copy font-medium text-[28px] md:text-[40px] lg:text-[48px] text-text-main leading-[1.1] text-center max-w-[600px] mx-auto px-4 mb-4">
        {article.title}
      </h1>

      {/* Date */}
      <div className="font-meta text-text-main text-[15px] mb-8">
        {article.publishedDate
          ? new Date(article.publishedDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : ''}
      </div>

      {/* Featured Image + Caption + Credit */}
      {featuredImage?.url && (() => {
        const photographer = featuredImage.photographer && typeof featuredImage.photographer === 'object' ? featuredImage.photographer as User : null;
        return (
          <div className="w-full max-w-[780px] mx-auto mb-8">
            <div className="relative w-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
              <Image
                src={featuredImage.url}
                alt={featuredImage.alt || article.title}
                width={featuredImage.width || 1200}
                height={featuredImage.height || 800}
                className="w-full h-auto"
                priority
              />
            </div>
            {(imageCaption || photographer) && (
              <div className="flex justify-between items-baseline gap-4 mt-2">
                {imageCaption && (
                  <span className="font-meta text-xs text-text-muted italic transition-colors">
                    {imageCaption}
                  </span>
                )}
                {photographer && (
                  <span className="font-meta text-[11px] text-text-muted transition-colors shrink-0">
                    Photo Credit: <Link href={`/staff/${photographer.slug || photographer.id}`} className="hover:text-accent transition-colors">{photographer.firstName} {photographer.lastName}</Link>
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Author byline */}
      <div className="max-w-[600px] w-full mx-auto">
        <hr className="border-rule-strong mb-4" />
        <div className="font-meta font-bold text-text-muted text-[15px]">
          By {article.authors && article.authors.length > 0 ? (
            article.authors.map((author, index) => {
              const user = author as User;
              return (
                <React.Fragment key={user.id}>
                  {index > 0 && index === article.authors!.length - 1 ? ' and ' : index > 0 ? ', ' : ''}
                  <Link href={`/staff/${user.slug || user.id}`} className="hover:text-accent transition-colors">
                    {user.firstName} {user.lastName}
                  </Link>
                </React.Fragment>
              );
            })
          ) : (
            'The Poly Staff'
          )}
        </div>
        <hr className="border-rule-strong mt-4" />
      </div>
    </div>
  );
};
