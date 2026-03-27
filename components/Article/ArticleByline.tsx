import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Article, Media, User } from '@/payload-types';

type WriteInAuthor = {
  name: string;
  photo?: Media | number | null;
};

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
  const staffAuthors = (article.authors || []).filter((a): a is User => typeof a !== 'number');
  const writeInAuthors = ((article as unknown as Record<string, unknown>).writeInAuthors || []) as WriteInAuthor[];
  const hasAnyAuthor = staffAuthors.length > 0 || writeInAuthors.length > 0;

  return (
    <div className={`flex flex-col gap-3 py-4 border-b border-rule-strong ${maxWidthClassName} w-full mx-auto transition-colors`}>
      <div className="flex items-center gap-3">
        {/* Author Headshots — only render wrapper when at least one photo exists */}
        {(() => {
          const staffPhotos = staffAuthors.filter((user) => {
            const headshot = user.headshot as Media | null;
            return headshot?.url;
          });
          const writeInPhotos = writeInAuthors.filter((writeIn) => {
            const photo = writeIn.photo && typeof writeIn.photo !== 'number' ? writeIn.photo as Media : null;
            return photo?.url;
          });
          if (staffPhotos.length === 0 && writeInPhotos.length === 0) return null;
          return (
            <div className="flex -space-x-2">
              {staffPhotos.map((user) => {
                const headshot = user.headshot as Media;
                return (
                  <Link
                    href={`/staff/${user.slug || user.id}`}
                    key={user.id}
                    className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 border-2 border-bg-main transition-colors hover:border-accent z-10 hover:z-20"
                  >
                    <Image
                      src={headshot.url!}
                      alt={`${user.firstName} ${user.lastName}`}
                      fill
                      className="object-cover"
                    />
                  </Link>
                );
              })}
              {writeInPhotos.map((writeIn, i) => {
                const photo = writeIn.photo as Media;
                return (
                  <div
                    key={`write-in-${i}`}
                    className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 border-2 border-bg-main transition-colors z-10"
                  >
                    <Image
                      src={photo.url!}
                      alt={writeIn.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Author Names + Titles */}
        {hasAnyAuthor ? (() => {
          const enrichedStaff = staffAuthors.map((user) => {
            const pos = user.positions?.find((p) => !(p as Record<string, unknown>).endDate) ?? user.positions?.[0];
            const jobTitle = (pos as Record<string, unknown> | undefined)?.jobTitle;
            const title = typeof jobTitle === 'object' && jobTitle
              ? ((jobTitle as Record<string, unknown>).title as string | undefined) ?? null
              : null;
            return { user, title };
          });
          const hasTitles = enrichedStaff.some((a) => a.title);

          if (hasTitles) {
            return (
              <div className="flex flex-row flex-wrap items-stretch gap-y-1">
                {enrichedStaff.map(({ user, title }, index) => (
                  <React.Fragment key={user.id}>
                    {index > 0 && (
                      <div className="w-px bg-rule-strong mx-4 self-stretch" />
                    )}
                    <div>
                      <div className="font-meta text-[14px] md:text-[15px] font-[440] tracking-[0.08em] text-accent dark:text-white transition-colors">
                        <Link href={`/staff/${user.slug || user.id}`} className="hover:text-accent/70 dark:hover:text-white/75 transition-colors">
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
                {writeInAuthors.map((writeIn, i) => (
                  <React.Fragment key={`write-in-${i}`}>
                    <div className="w-px bg-rule-strong mx-4 self-stretch" />
                    <div>
                      <div className="font-meta text-[14px] md:text-[15px] font-[440] tracking-[0.08em] text-accent dark:text-white transition-colors">
                        {writeIn.name}
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            );
          }

          const allNames: React.ReactNode[] = [];
          enrichedStaff.forEach(({ user }) => {
            allNames.push(
              <React.Fragment key={user.id}>
                <Link href={`/staff/${user.slug || user.id}`} className="hover:text-accent/70 transition-colors">
                  {user.firstName} {user.lastName}
                </Link>
              </React.Fragment>
            );
          });
          writeInAuthors.forEach((writeIn, i) => {
            allNames.push(
              <React.Fragment key={`write-in-${i}`}>
                <span>{writeIn.name}</span>
              </React.Fragment>
            );
          });

          return (
            <div className="font-meta text-[14px] md:text-[15px] font-[440] tracking-[0.08em] text-accent dark:text-white transition-colors">
              {allNames.map((node, index) => (
                <React.Fragment key={index}>
                  {index > 0 && index === allNames.length - 1 ? ' & ' : index > 0 ? ', ' : ''}
                  {node}
                </React.Fragment>
              ))}
            </div>
          );
        })() : (
          <div className="font-meta text-[14px] md:text-[15px] font-[440] tracking-[0.08em] text-accent dark:text-white transition-colors">
            By <em>The Polytechnic</em> Editorial Board
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
