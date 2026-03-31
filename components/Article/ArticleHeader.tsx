import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Article, Media, User } from '@/payload-types';
import { ArticleByline } from './ArticleByline';

type Props = {
  article: Article;
};

export const ArticleHeader: React.FC<Props> = ({ article }) => {
  const featuredImage = article.featuredImage as Media | null;
  const writeInPhotographer = featuredImage
    ? ((featuredImage as unknown as Record<string, unknown>).writeInPhotographer as string | null | undefined)
    : null;
  const featuredImageWrapperClassName = 'relative aspect-[3/2] w-screen max-w-none bg-gray-100 dark:bg-zinc-800 overflow-hidden scroll-mt-20 left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] md:left-auto md:right-auto md:ml-0 md:mr-0 md:w-full';

  return (
    <div className="flex flex-col gap-10 mb-8" style={{ paddingTop: '40px' }}>
      <div className="flex flex-col gap-4 max-w-[680px] w-full mx-auto">
        {article.kicker && (
            <span data-ie-field="kicker" className="font-meta text-accent font-[600] uppercase text-[13px] md:text-[13px] tracking-[0.08em] transition-colors">
                {article.kicker}
            </span>
        )}
        <h1 data-ie-field="title" className={`font-bold text-[39px] md:text-[34px] lg:text-[42px] text-text-main leading-[1.05] tracking-[-0.02em] transition-colors font-copy ${article.section === "opinion" ? "font-light" : ""} ${article.section === "sports" ? "font-normal tracking-[0.015em]" : ""} ${article.section === "features" ? "font-light" : ""}`}>
          {article.title}
        </h1>
        {article.subdeck && (
            <h2 data-ie-field="subdeck" className="font-meta text-xl md:text-2xl font-normal text-text-muted leading-snug transition-colors">
                {article.subdeck}
            </h2>
        )}
      </div>

      {featuredImage?.url && (() => {
        const photographer = featuredImage.photographer && typeof featuredImage.photographer === 'object' ? featuredImage.photographer as User : null;
        const imageCaption = (article as unknown as Record<string, unknown>).imageCaption as string | undefined;
        return (
          <div className="flex flex-col gap-1 max-w-[680px] w-full mx-auto">
            <div
              id={`media-${featuredImage.id}`}
              className={featuredImageWrapperClassName}
            >
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
                  <span data-ie-field="imageCaption" className="font-meta text-[12px] text-text-muted italic transition-colors">
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
