import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { LexicalNode } from '@/components/Article/RichTextParser';
import { Article, Media, User } from '@/payload-types';

type Props = {
  article: Article;
  maxWidthClassName?: string;
};

const getAuthors = (article: Article): User[] =>
  (article.authors || []).flatMap((author) => (typeof author === 'number' ? [] : [author as User]));

const lexicalToPlainText = (nodes: LexicalNode[] | undefined): string => {
  if (!nodes || nodes.length === 0) return '';

  return nodes
    .map((node) => {
      if (node.type === 'text') {
        return node.text || '';
      }

      const childrenText = lexicalToPlainText(node.children);

      if (node.type === 'linebreak') return '\n';
      if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'quote') {
        return `${childrenText}\n`;
      }
      if (node.type === 'listitem') {
        return `${childrenText}\n`;
      }
      if (node.type === 'link') {
        return childrenText;
      }

      return childrenText;
    })
    .join('')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

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
          const bioText = lexicalToPlainText(user.bio?.root?.children as LexicalNode[] | undefined);
          const fullName = `${user.firstName} ${user.lastName}`;
          const cleanedBio = bioText.startsWith(fullName)
            ? bioText.slice(fullName.length).replace(/^[\s,]+/, '')
            : bioText.startsWith(user.firstName)
            ? bioText.slice(user.firstName.length).replace(/^[\s,]+/, '')
            : bioText;

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
                <div className="font-meta text-[14px] leading-[1.55] text-text-main">
                  <p className="mb-2">
                    <Link
                      href={href}
                      className="text-[15px] font-bold tracking-[0.04em] text-accent transition-colors hover:text-accent/70"
                    >
                      {user.firstName} {user.lastName}
                    </Link>
                    {cleanedBio.length > 0 && (
                      <>
                        {' '}
                        {cleanedBio}
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-rule-strong" />
    </section>
  );
};
