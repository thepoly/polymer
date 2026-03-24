import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Article, Media, User } from '@/payload-types';
import { opinionTypeLabels } from './opinionTypeLabels';
import { ArticleByline } from '@/components/Article';

type Props = {
  article: Article;
};

export const OpinionArticleHeader: React.FC<Props> = ({ article }) => {
  const featuredImage = article.featuredImage as Media | null;
  const opinionType = (article as unknown as Record<string, unknown>).opinionType as string | undefined;
  const imageCaption = (article as unknown as Record<string, unknown>).imageCaption as string | undefined;
  const typeLabel = opinionTypeLabels[opinionType || 'opinion'] || 'Op-Ed';
  const writeInPhotographer = featuredImage
    ? ((featuredImage as unknown as Record<string, unknown>).writeInPhotographer as string | null | undefined)
    : null;

  return (
    <div className="flex flex-col items-center mb-8" style={{ paddingTop: '40px' }}>
      {/* Kicker + Opinion Type */}
      <div className="flex flex-col items-center gap-1 mb-4">
        <span className="font-meta text-accent font-bold uppercase text-[16px] tracking-widest">
          Opinion
        </span>
        {opinionType && opinionType !== 'opinion' && (
          <span className="font-meta font-bold uppercase text-[16px] tracking-wide text-text-main">
            {typeLabel}
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="w-8 border-t border-rule-strong mb-6" />

      {/* Title */}
      <h1 data-ie-field="title" className="font-copy font-light text-[39px] md:text-[40px] lg:text-[48px] text-text-main leading-[1.1] text-center max-w-[600px] mx-auto px-4 mb-4">
        {article.title}
      </h1>

      {/* Date */}
      {article.publishedDate && (
        <div className="font-meta text-[15px] font-medium tracking-[0.06em] text-text-muted mb-6">
          {new Date(article.publishedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      )}

      {/* Featured Image + Caption + Credit */}
      {featuredImage?.url && (() => {
        const photographer = featuredImage.photographer && typeof featuredImage.photographer === 'object' ? featuredImage.photographer as User : null;
        return (
          <div className="w-full max-w-[780px] mx-auto mb-8">
            <div className="relative w-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
              <Image
                src={(featuredImage as Media & { sizes?: { gallery?: { url?: string } } }).sizes?.gallery?.url || featuredImage.url}
                alt={featuredImage.alt || article.title}
                width={featuredImage.width || 1200}
                height={featuredImage.height || 800}
                className="w-full h-auto"
                sizes="(max-width: 768px) 100vw, 680px"
                priority
              />
            </div>
            {(imageCaption || photographer || writeInPhotographer) && (
              <div className="flex justify-between items-baseline gap-4 mt-2">
                {imageCaption && (
                  <span data-ie-field="imageCaption" className="font-meta text-xs text-text-muted italic transition-colors">
                    {imageCaption}
                  </span>
                )}
                {photographer && (
                  <span className="font-meta text-[11px] text-text-muted transition-colors shrink-0">
                    Photo Credit: <Link href={`/staff/${photographer.slug || photographer.id}`} className="hover:text-accent transition-colors">{photographer.firstName} {photographer.lastName}</Link>
                  </span>
                )}
                {!photographer && writeInPhotographer && (
                  <span className="font-meta text-[11px] text-text-muted transition-colors shrink-0">
                    Photo Credit: {writeInPhotographer}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })()}

      <div className="w-full max-w-[680px] mx-auto px-4">
        <ArticleByline article={article} showDate={false} />
      </div>
    </div>
  );
};
