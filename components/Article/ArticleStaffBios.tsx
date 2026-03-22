import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Article, Media, User } from '@/payload-types';

type Props = {
  article: Article;
  maxWidthClassName?: string;
};

const getAuthors = (article: Article): User[] =>
  (article.authors || []).flatMap((author) => (typeof author === 'number' ? [] : [author as User]));

export const ArticleStaffBios: React.FC<Props> = ({
  article,
  maxWidthClassName = 'max-w-[680px]',
}) => {
  const authors = getAuthors(article);

  if (authors.length === 0) return null;

  return (
    <section className={`${maxWidthClassName} mx-auto mt-6`}>
      <div className="flex flex-col gap-6">
        {authors.map((user) => {
          const headshot = user.headshot as Media | null;
          const href = `/staff/${user.slug || user.id}`;

          return (
            <div key={user.id} className="flex items-start gap-4">
              {headshot?.url && (
                <Link
                  href={href}
                  className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800"
                >
                  <Image
                    src={headshot.url}
                    alt={`${user.firstName} ${user.lastName}`}
                    fill
                    className="object-cover"
                  />
                </Link>
              )}

              <div className="min-w-0 pt-1">
                <p className="font-meta text-[14px] leading-[1.55] text-text-main">
                  <Link
                    href={href}
                    className="text-[15px] font-bold tracking-[0.04em] text-accent transition-colors hover:text-accent/70"
                  >
                    {user.firstName} {user.lastName}
                  </Link>
                  {' is a junior Computer Science and Games and Simulation Arts and Sciences dual major from Robbinsville, New Jersey. They enjoy crocheting. '}
                  <strong>GIVE ME YOUR STAFF BIOS</strong>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-rule-strong" />
    </section>
  );
};
