import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
            <span className="font-meta text-accent font-[440] italic text-[15px] md:text-[16px] tracking-[0.06em] transition-colors">
                {article.kicker}
            </span>
        )}
        <h1 className={`font-display font-bold text-[28px] md:text-[34px] lg:text-[42px] text-text-main leading-[1.05] tracking-[-0.02em] transition-colors ${article.section === "news" ? "font-display-news uppercase" : ""} ${article.section === "features" ? "font-normal italic" : ""} ${article.section === "sports" ? "italic tracking-[0.015em]" : ""}`}>
          {article.title}
        </h1>
        {article.subdeck && (
            <h2 className="font-meta text-xl md:text-2xl font-normal text-text-muted leading-snug transition-colors">
                {article.subdeck}
            </h2>
        )}
      </div>

      {featuredImage?.url && (
        <div
          id={`media-${featuredImage.id}`}
          className="relative aspect-[3/2] w-screen max-w-none bg-gray-100 dark:bg-zinc-800 overflow-hidden scroll-mt-20 left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] md:left-auto md:right-auto md:ml-auto md:mr-auto md:w-full md:max-w-[680px]"
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

      <div className="flex flex-col gap-3 py-4 border-b border-rule-strong max-w-[680px] w-full mx-auto transition-colors">
        <div className="flex items-center gap-3">
            {/* Author Headshots */}
            <div className="flex -space-x-2">
                {article.authors?.map((author) => {
                    const user = author as User;
                    const headshot = user.headshot as Media | null;
                    if (!headshot?.url) return null;
                    return (
                        <Link href={`/staff/${user.slug || user.id}`} key={user.id} className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 border-2 border-bg-main transition-colors hover:border-accent z-10 hover:z-20">
                            <Image
                                src={headshot.url}
                                alt={`${user.firstName} ${user.lastName}`}
                                fill
                                className="object-cover"
                            />
                        </Link>
                    );
                })}
            </div>

            {/* Author Names */}
            <div className="font-meta text-[14px] md:text-[15px] font-[440] tracking-[0.08em] text-accent transition-colors">
                {article.authors && article.authors.length > 0 ? (
                    article.authors.map((author, index) => {
                        const user = author as User;
                        return (
                            <React.Fragment key={user.id}>
                                {index > 0 && index === article.authors!.length - 1 ? ' & ' : index > 0 ? ', ' : ''}
                                <Link href={`/staff/${user.slug || user.id}`} className="hover:text-accent/70 transition-colors">
                                    {user.firstName} {user.lastName}
                                </Link>
                            </React.Fragment>
                        );
                    })
                ) : (
                    'The Poly Staff'
                )}
            </div>
        </div>
        <div className="font-meta text-[11px] font-medium tracking-[0.06em] text-text-muted">
            {article.publishedDate ? new Date(article.publishedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
        </div>
      </div>
    </div>
  );
};
