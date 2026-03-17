import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { Article, Media } from '@/payload-types';
import { getArticleUrl } from '@/utils/getArticleUrl';
import { opinionTypeLabels } from './opinionTypeLabels';

type Props = {
  currentArticleId: number;
};

export const OpinionArticleFooter: React.FC<Props> = async ({ currentArticleId }) => {
  const payload = await getPayload({ config });

  const result = await payload.find({
    collection: 'articles',
    where: {
      and: [
        { section: { equals: 'opinion' } },
        { id: { not_equals: currentArticleId } },
      ],
    },
    sort: '-publishedDate',
    limit: 10,
  });

  const pool = result.docs as Article[];
  const picks = pool.slice(0, 6);

  if (picks.length === 0) return null;

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 md:px-6 mt-6 mb-8">
      <h2 className="font-meta text-[17px] font-bold text-text-main mb-6">More in Opinion</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-8">
        {picks.map((article) => {
          const url = getArticleUrl(article);
          const image = article.featuredImage as Media | null;
          const opinionType = (article as unknown as Record<string, unknown>).opinionType as string | undefined;
          const label = opinionTypeLabels[opinionType || 'opinion'] || 'Op-Ed';

          return (
            <Link key={article.id} href={url} className="group flex flex-col">
              {image?.url ? (
                <div className="relative aspect-[3/2] w-full overflow-hidden bg-gray-100 dark:bg-zinc-800 mb-2">
                  <Image
                    src={image.url}
                    alt={image.alt || article.title}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="relative aspect-[3/2] w-full bg-gray-200 dark:bg-zinc-700 mb-2" />
              )}
              <span className="font-meta text-[11px] text-text-muted mb-1">{label}</span>
              <h3 className="font-meta text-[15px] font-semibold leading-snug text-text-main group-hover:text-text-muted transition-colors">
                {article.title}
              </h3>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
