import React from 'react';
import Image from 'next/image';
import { Article, Media, User } from '@/payload-types';

type Props = {
  article: Article;
};

export const ArticleHeader: React.FC<Props> = ({ article }) => {
  const featuredImage = article.featuredImage as Media | null;
  const authors = article.authors?.map(author => {
      const user = author as User;
      return `${user.firstName} ${user.lastName}`;
  }).join(' AND ');

  return (
    <div className="flex flex-col gap-6 mb-8 max-w-4xl mx-auto">
      <div className="flex flex-col gap-4">
        {article.kicker && (
            <span className="text-[#D6001C] font-bold font-serif uppercase text-sm tracking-wider">
                {article.kicker}
            </span>
        )}
        <h1 className="font-serif font-black text-4xl md:text-5xl lg:text-6xl text-gray-900 leading-[1.1]">
          {article.title}
        </h1>
        {article.subdeck && (
            <h2 className="font-serif text-xl md:text-2xl text-gray-700 leading-snug">
                {article.subdeck}
            </h2>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-b border-gray-200 py-4 font-serif text-gray-600 text-sm md:text-base">
        <div className="font-bold text-gray-900">
             By {authors || 'The Poly Staff'}
        </div>
        <div>
            {article.publishedDate ? new Date(article.publishedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
        </div>
      </div>

      {featuredImage?.url && (
        <div className="relative aspect-[3/2] w-full bg-gray-100 overflow-hidden rounded-sm">
          <Image
            src={featuredImage.url}
            alt={featuredImage.alt || article.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}
    </div>
  );
};
