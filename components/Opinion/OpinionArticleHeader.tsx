import React from 'react';
import Image from 'next/image';
import { Article, Media, User } from '@/payload-types';

const opinionTypeLabels: Record<string, string> = {
  opinion: 'Op-Ed',
  column: 'Column',
  'staff-editorial': 'Staff Editorial',
  'editorial-notebook': 'Editorial Notebook',
  endorsement: 'Endorsement',
  'top-hat': 'Top Hat',
  'candidate-profile': 'Candidate Profile',
  'letter-to-the-editor': 'Letter to the Editor',
  'polys-recommendations': "The Poly's Recommendations",
  other: 'Other',
};

type Props = {
  article: Article;
};

export const OpinionArticleHeader: React.FC<Props> = ({ article }) => {
  const featuredImage = article.featuredImage as Media | null;
  const typeLabel = opinionTypeLabels[article.opinionType || 'opinion'] || 'Op-Ed';

  return (
    <div className="flex flex-col items-center mb-8">
      {/* Kicker + Opinion Type */}
      <div className="flex flex-col items-center gap-1 mb-4">
        <span className="text-[#D6001C] font-bold uppercase text-sm tracking-widest">
          Opinion
        </span>
        <span className="font-bold uppercase text-sm tracking-wide text-gray-900">
          {typeLabel}
        </span>
      </div>

      {/* Faint divider line */}
      <div className="w-8 border-t border-gray-300 mb-6" />

      {/* Title */}
      <h1 className="font-medium text-[28px] md:text-[40px] lg:text-[48px] text-gray-900 leading-[1.1] text-center max-w-[600px] mx-auto px-4 mb-4">
        {article.title}
      </h1>

      {/* Date */}
      <div className="text-black text-[13px] mb-8">
        {article.publishedDate
          ? new Date(article.publishedDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : ''}
      </div>

      {/* Featured Image + Caption */}
      {featuredImage?.url && (
        <div className="w-full max-w-[780px] mx-auto mb-8">
          <div className="relative w-full bg-gray-100 overflow-hidden">
            <Image
              src={featuredImage.url}
              alt={featuredImage.alt || article.title}
              width={featuredImage.width || 1200}
              height={featuredImage.height || 800}
              className="w-full h-auto"
              priority
            />
          </div>
          <p className="text-xs text-gray-500 mt-2 text-left">
            {article.imageCaption || 'Illustration by The Polytechnic'}
          </p>
        </div>
      )}

      {/* Author byline */}
      <div className="max-w-[600px] w-full mx-auto">
        <hr className="border-gray-300 mb-4" />
        <div className="font-bold text-gray-700 text-[15px]">
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
        {article.authors && article.authors.length > 0 && (
          <p className="text-gray-500 text-[14px] mt-1">
            {article.authors.map((author, index) => {
              const user = author as User;
              const oneLiner = (user as any).oneLiner || `is a contributor to The Polytechnic`;
              return (
                <React.Fragment key={user.id}>
                  {index > 0 && '. '}
                  {user.firstName} {user.lastName} {oneLiner}
                </React.Fragment>
              );
            })}.
          </p>
        )}
        <hr className="border-gray-300 mt-4" />
      </div>
    </div>
  );
};
