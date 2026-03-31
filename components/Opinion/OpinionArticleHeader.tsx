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
  const hasFeaturedImage = Boolean(featuredImage?.url);
  const writeInPhotographer = featuredImage
    ? ((featuredImage as unknown as Record<string, unknown>).writeInPhotographer as string | null | undefined)
    : null;

  return (
    <div
      className="flex flex-col items-center mb-8 gap-4"
      style={{ paddingTop: '18px' }}
    >
      {/* Kicker + Opinion Type */}
      <div className="flex flex-col items-center gap-1 mb-1">
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
      <div className="w-8 border-t border-rule-strong mb-1" />

      {/* Title */}
      <div className="flex flex-col gap-4 max-w-[680px] w-full mx-auto">
        <h1 data-ie-field="title" className="font-copy font-light text-[39px] md:text-[40px] lg:text-[48px] text-text-main leading-[1.1] text-center">
          {article.title}
        </h1>
      </div>

      {/* Date */}
      {article.publishedDate && (
        <div className="font-meta text-[15px] font-medium tracking-[0.06em] text-text-muted mb-1">
          {new Date(article.publishedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      )}

      {/* Featured Image + Caption + Credit */}
      {featuredImage?.url && (() => {
        const photographer = featuredImage.photographer && typeof featuredImage.photographer === 'object' ? featuredImage.photographer as User : null;
        return (
          <div className="flex flex-col gap-1 max-w-[680px] w-full mx-auto">
            <div className="relative aspect-[3/2] w-screen max-w-none bg-gray-100 dark:bg-zinc-800 overflow-hidden left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] md:left-auto md:right-auto md:ml-0 md:mr-0 md:w-full">
              <Image
                src={(featuredImage as Media & { sizes?: { gallery?: { url?: string } } }).sizes?.gallery?.url || featuredImage.url}
                alt={featuredImage.alt || article.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 680px"
                priority
              />
            </div>
            {(imageCaption || photographer || writeInPhotographer) && (
              <div className="flex justify-between items-baseline gap-4 mt-1">
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

      <div className={`w-full max-w-[680px] mx-auto px-4 ${hasFeaturedImage ? '' : '-mt-1'}`}>
        <ArticleByline article={article} showDate={false} />
      </div>
    </div>
  );
};
