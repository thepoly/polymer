import React, { Fragment } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import escapeHTML from 'escape-html';
import { Media } from '@/payload-types';

export type LexicalNode = {
  type: string;
  value?: any;
  text?: string;
  children?: LexicalNode[];
  url?: string;
  version: number;
  format?: number;
  tag?: string;
  [key: string]: unknown;
};

let paragraphCount = 0;

const ParagraphTracker = ({ children, isFirst }: { children: React.ReactNode; isFirst: boolean }) => (
  <p className={`font-copy text-xl leading-relaxed text-text-main dark:text-[#CCCCCC] mb-6 transition-colors ${isFirst ? 'drop-cap' : ''}`}>
    {children}
  </p>
);

export const SerializeLexical = ({ nodes, isRoot = true }: { nodes: LexicalNode[]; isRoot?: boolean }) => {
  if (isRoot) {
    paragraphCount = 0;
  }

  return (
    <Fragment>
      {nodes?.map((node, index) => {
        if (node.type === 'text') {
          let text = <span key={index} dangerouslySetInnerHTML={{ __html: escapeHTML(node.text) }} />;
          const format = node.format || 0;
          if (format & 1) text = <strong key={index}>{text}</strong>;
          if (format & 2) text = <em key={index}>{text}</em>;
          if (format & 8) text = <u key={index}>{text}</u>;
          if (format & 4) text = <s key={index}>{text}</s>;
          if (format & 32) text = <code key={index}>{text}</code>;
          return text;
        }

        if (!node) {
          return null;
        }

        const serializedChildren = node.children ? (
          <SerializeLexical nodes={node.children} isRoot={false} />
        ) : null;

        switch (node.type) {
          case 'heading':
            const Tag = node.tag as React.ElementType;
            return <Tag key={index} className="font-display font-bold text-text-main my-4 leading-tight transition-colors">{serializedChildren}</Tag>;

          case 'paragraph': {
            const isFirst = paragraphCount === 0;
            paragraphCount++;
            return (
              <ParagraphTracker key={index} isFirst={isFirst}>
                {serializedChildren}
              </ParagraphTracker>
            );
          }

          case 'link':
            return (
              <Link key={index} href={escapeHTML(node.url)} className="text-accent hover:underline decoration-1 underline-offset-2 transition-colors">
                {serializedChildren}
              </Link>
            );

          case 'upload':
            const media = node.value as Media;
            if (!media || !media.url) return null;
            return (
              <div
                key={index}
                id={`media-${media.id}`}
                className="my-10 flex flex-col gap-2 scroll-mt-20"
              >
                <div className="relative aspect-[3/2] w-full bg-gray-100 dark:bg-zinc-800 overflow-hidden transition-colors">
                  <Image
                    src={media.url}
                    alt={media.alt || ''}
                    fill
                    className="object-cover"
                  />
                </div>
                {media.alt && (
                  <span className="font-meta text-[12px] text-text-muted italic transition-colors">
                    {media.alt}
                  </span>
                )}
              </div>
            );

          case 'list':
            const ListTag = node.tag === 'ol' ? 'ol' : 'ul';
            return (
              <ListTag key={index} className="font-copy text-xl text-text-main dark:text-[#CCCCCC] mb-6 pl-8 list-disc transition-colors">
                {serializedChildren}
              </ListTag>
            );

          case 'listitem':
            return (
              <li key={index} className="mb-2">
                {serializedChildren}
              </li>
            );

          case 'quote':
            return (
              <blockquote key={index} className="border-l-4 border-accent pl-4 italic text-xl text-text-main dark:text-[#CCCCCC] my-6 transition-colors">
                {serializedChildren}
              </blockquote>
            );

          default:
            return <Fragment key={index}>{serializedChildren}</Fragment>;
        }
      })}
    </Fragment>
  );
};
