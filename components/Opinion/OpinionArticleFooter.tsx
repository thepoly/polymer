import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { deriveSlug } from '@/utils/deriveSlug';
import { Article, Media } from '@/payload-types';
import { opinionTypeLabels } from './opinionTypeLabels';

function pickRandom<T>(arr: T[], n: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

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

  const picks = pickRandom(pool, 6);

  if (picks.length === 0) return null;

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 md:px-6 mt-6 mb-8">
      <h2 className="text-[17px] font-bold mb-6">More in Opinion</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-8">
        {picks.map((article) => {
          const dateStr = article.publishedDate || article.createdAt;
          const date = new Date(dateStr);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const slug = article.slug || deriveSlug(article.title);
          const url = `/opinion/${year}/${month}/${slug}`;
          const image = article.featuredImage as Media | null;
          const label = opinionTypeLabels[article.opinionType || 'opinion'] || 'Op-Ed';

          return (
            <Link key={article.id} href={url} className="group flex flex-col">
              {image?.url ? (
                <div className="relative aspect-[3/2] w-full overflow-hidden bg-gray-100 mb-2">
                  <Image
                    src={image.url}
                    alt={image.alt || article.title}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="relative aspect-[3/2] w-full bg-gray-200 mb-2" />
              )}
              <span className="text-[11px] text-gray-500 mb-1">{label}</span>
              <h3 className="text-[15px] font-semibold leading-snug text-gray-900 group-hover:text-gray-600 transition-colors">
                {article.title}
              </h3>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
