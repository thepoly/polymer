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
    <div className="flex flex-col items-center gap-10 mb-8" style={{ paddingTop: '40px' }}>
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
      <div className="flex flex-col gap-4 max-w-[680px] w-full mx-auto">
        <h1 data-ie-field="title" className="font-copy font-light text-[39px] md:text-[40px] lg:text-[48px] text-text-main leading-[1.1] text-center">
          {article.title}
        </h1>

        {article.subdeck && (
          <h2 data-ie-field="subdeck" className="font-meta text-xl md:text-2xl font-normal text-text-muted leading-snug text-center">
            {article.subdeck}
          </h2>
        )}
      </div>

      {/* Featured Image + Caption + Credit */}
      {featuredImage?.url && (() => {
        const photographer = featuredImage.photographer && typeof featuredImage.photographer === 'object' ? featuredImage.photographer as User : null;
        return (
          <div className="flex flex-col gap-1 max-w-[680px] w-full mx-auto">
            <div className="relative w-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
              <Image
                src={(featuredImage as Media & { sizes?: { gallery?: { url?: string } } }).sizes?.gallery?.url || featuredImage.url}
                alt={featuredImage.alt || article.title}
                width={featuredImage.width || 1200}
                height={featuredImage.height || 800}
                className="w-full h-auto"
                sizes="(max-width: 768px) calc(100vw - 2rem), 680px"
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

      <div className="max-w-[680px] w-full mx-auto">
        <ArticleByline article={article} />
      </div>
    </div>
  );
};
