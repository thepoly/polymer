import React from 'react';
import Image from 'next/image';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { SerializeLexical, type LexicalNode } from '@/components/Article/RichTextParser';
import { formatRelativeTime } from './relativeTime';

export type LiveUpdateAuthor = {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  avatar?: { url: string; alt?: string } | null;
};

export type LiveUpdateProps = {
  timestamp: string;
  heading?: string;
  author: LiveUpdateAuthor;
  body: SerializedEditorState;
};

const resolveAuthorName = (author: LiveUpdateAuthor): string => {
  if (author.name && author.name.trim()) return author.name.trim();
  const pieces = [author.firstName, author.lastName].filter(Boolean) as string[];
  if (pieces.length) return pieces.join(' ');
  return 'The Polytechnic';
};

const AvatarPlaceholder: React.FC<{ initials: string }> = ({ initials }) => (
  <div
    aria-hidden="true"
    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 font-meta text-[11px] font-semibold uppercase text-text-muted dark:bg-zinc-800"
  >
    {initials}
  </div>
);

export const LiveUpdate: React.FC<LiveUpdateProps> = ({ timestamp, heading, author, body }) => {
  const authorName = resolveAuthorName(author);
  const initials = authorName
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'TP';

  // The richtext renderer expects the root's children array. The contract says
  // `body` is a SerializedEditorState, so we read its root.children.
  const rootChildren = (body?.root?.children ?? []) as unknown as LexicalNode[];

  const absoluteTimestamp = (() => {
    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  })();

  return (
    <article className="flex gap-4 py-8">
      <div className="shrink-0 pt-[2px]">
        {author.avatar?.url ? (
          <Image
            src={author.avatar.url}
            alt={author.avatar.alt || authorName}
            width={32}
            height={32}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <AvatarPlaceholder initials={initials} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
          <time
            dateTime={timestamp}
            title={absoluteTimestamp}
            className="font-meta text-[12px] font-medium uppercase tracking-[0.08em] text-accent"
          >
            {formatRelativeTime(timestamp)}
          </time>
          <span
            className="font-meta text-[12px] font-bold uppercase tracking-[0.08em] text-text-main"
          >
            {authorName}
          </span>
        </div>

        {heading && (
          <h3 className="font-copy font-bold text-text-main text-[22px] md:text-[24px] leading-[1.2] mb-3 transition-colors">
            {heading}
          </h3>
        )}

        <div className="live-update-body">
          <SerializeLexical nodes={rootChildren} />
        </div>
      </div>
    </article>
  );
};

export default LiveUpdate;
