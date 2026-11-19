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

const nameClassName = 'text-[15px] font-bold tracking-[0.04em] text-accent';
const headshotClassName = 'relative block h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800';

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
  // Write-in contributors sign off too, after the staff, as in the byline.
  // They have no profile page or bio: just the name, and a photo if given.
  const writeIns = (article.writeInAuthors || []).filter((writeIn) => writeIn.name?.trim());

  if (authors.length === 0 && writeIns.length === 0) return null;

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
                  className={headshotClassName}
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
                      className={`${nameClassName} transition-colors hover:text-accent/70`}
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
        {writeIns.map((writeIn, i) => {
          const photo = writeIn.photo && typeof writeIn.photo === 'object' ? writeIn.photo : null;
          return (
            <div key={writeIn.id ?? `write-in-${i}`} className="flex items-start gap-4">
              {photo?.url && (
                <div className={headshotClassName}>
                  <Image src={photo.url} alt={writeIn.name} fill className="object-cover" />
                </div>
              )}
              <div className="min-w-0 pt-1">
                <p className={`font-meta leading-[1.55] ${nameClassName}`}>{writeIn.name}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-rule-strong" />
    </section>
  );
};
