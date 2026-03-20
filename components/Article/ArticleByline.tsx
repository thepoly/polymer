import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Article, Media, User } from '@/payload-types';

type Props = {
  article: Article;
  maxWidthClassName?: string;
  showDate?: boolean;
};

export const ArticleByline: React.FC<Props> = ({ 
  article, 
  maxWidthClassName = 'max-w-[680px]',
  showDate = true
}) => {
  return (
    <div className={`flex flex-col gap-3 py-4 border-b border-rule-strong ${maxWidthClassName} w-full mx-auto transition-colors`}>
      <div className="flex items-start gap-3">
        {/* Author Headshots */}
        <div className="flex -space-x-2">
          {article.authors?.map((author) => {
            const user = author as User;
            const headshot = user.headshot as Media | null;
            if (!headshot?.url) return null;
            return (
              <Link 
                href={`/staff/${user.slug || user.id}`} 
                key={user.id} 
                className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 border-2 border-bg-main transition-colors hover:border-accent z-10 hover:z-20"
              >
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

        {/* Author Names + Titles */}
        {article.authors && article.authors.length > 0 ? (() => {
          const enriched = article.authors!.map((author) => {
            const user = author as User;
            const pos = user.positions?.find((p) => !(p as Record<string, unknown>).endDate) ?? user.positions?.[0];
            const jobTitle = (pos as Record<string, unknown> | undefined)?.jobTitle;
            const title = typeof jobTitle === 'object' && jobTitle
              ? ((jobTitle as Record<string, unknown>).title as string | undefined) ?? null
              : null;
            return { user, title };
          });
          const hasTitles = enriched.some((a) => a.title);

          if (hasTitles) {
            return (
              <div className="flex flex-row flex-wrap items-stretch gap-y-1">
                {enriched.map(({ user, title }, index) => (
                  <React.Fragment key={user.id}>
                    {index > 0 && (
                      <div className="w-px bg-rule-strong mx-4 self-stretch" />
                    )}
                    <div>
                      <div className="font-meta text-[14px] md:text-[15px] font-[440] tracking-[0.08em] text-accent transition-colors">
                        <Link href={`/staff/${user.slug || user.id}`} className="hover:text-accent/70 transition-colors">
                          {user.firstName} {user.lastName}
                        </Link>
                      </div>
                      {title && (
                        <p className="font-meta text-[11px] md:text-[12px] font-normal italic text-text-main mt-0.5 transition-colors">
                          {title}
                        </p>
                      )}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            );
          }

          return (
            <div className="font-meta text-[14px] md:text-[15px] font-[440] tracking-[0.08em] text-accent transition-colors">
              {enriched.map(({ user }, index) => (
                <React.Fragment key={user.id}>
                  {index > 0 && index === enriched.length - 1 ? ' & ' : index > 0 ? ', ' : ''}
                  <Link href={`/staff/${user.slug || user.id}`} className="hover:text-accent/70 transition-colors">
                    {user.firstName} {user.lastName}
                  </Link>
                </React.Fragment>
              ))}
            </div>
          );
        })() : (
          <div className="font-meta text-[14px] md:text-[15px] font-[440] tracking-[0.08em] text-accent transition-colors">
            The Poly Staff
          </div>
        )}
      </div>
      {showDate && (
        <div className="font-meta text-[11px] font-medium tracking-[0.06em] text-text-muted">
          {article.publishedDate ? new Date(article.publishedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
        </div>
      )}
    </div>
  );
};
