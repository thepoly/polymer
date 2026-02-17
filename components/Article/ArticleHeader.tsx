import React from 'react';
import Image from 'next/image';
import { Article, Media, User } from '@/payload-types';

type Props = {
  article: Article;
};

export const ArticleHeader: React.FC<Props> = ({ article }) => {
  const featuredImage = article.featuredImage as Media | null;

  return (
    <div className="flex flex-col gap-6 mb-8">
      <div className="flex flex-col gap-4 max-w-[680px] w-full mx-auto">
        {article.kicker && (
            <span className="text-[#D6001C] font-bold font-serif uppercase text-lg tracking-wider">
                {article.kicker}
            </span>
        )}
        <h1 className="font-serif font-bold text-2xl md:text-3xl lg:text-4xl text-gray-900 leading-[1.1]">
          {article.title}
        </h1>
        {article.subdeck && (
            <h2 className="font-serif text-xl md:text-2xl text-gray-700 leading-snug">
                {article.subdeck}
            </h2>
        )}
      </div>

      {featuredImage?.url && (
        <div 
          id={`media-${featuredImage.id}`}
          className="relative aspect-[3/2] w-full bg-gray-100 overflow-hidden rounded-sm max-w-4xl mx-auto scroll-mt-20"
        >
          <Image
            src={featuredImage.url}
            alt={featuredImage.alt || article.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 font-serif text-gray-600 text-sm md:text-base max-w-[680px] w-full mx-auto">
        <div className="flex items-center gap-3">
            {/* Author Headshots */}
            <div className="flex -space-x-2">
                {article.authors?.map((author) => {
                    const user = author as User;
                    const headshot = user.headshot as Media | null;
                    if (!headshot?.url) return null;
                    return (
                        <div key={user.id} className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-100 border-2 border-white">
                            <Image
                                src={headshot.url}
                                alt={`${user.firstName} ${user.lastName}`}
                                fill
                                className="object-cover"
                            />
                        </div>
                    );
                })}
            </div>

            {/* Author Names */}
            <div className="font-bold text-gray-900">
                By {article.authors && article.authors.length > 0 ? (
                    article.authors.map((author, index) => {
                        const user = author as User;
                        return (
                            <React.Fragment key={user.id}>
                                {index > 0 && index === article.authors!.length - 1 ? ' and ' : index > 0 ? ', ' : ''}
                                {user.firstName} {user.lastName}
                            </React.Fragment>
                        );
                    })
                ) : (
                    'The Poly Staff'
                )}
            </div>
        </div>
        <div className="mt-2 sm:mt-0">
            {article.publishedDate ? new Date(article.publishedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
        </div>
      </div>
    </div>
  );
};
