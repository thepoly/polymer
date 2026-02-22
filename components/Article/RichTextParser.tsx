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

export const SerializeLexical = ({ nodes }: { nodes: LexicalNode[] }) => {
  return (
    <Fragment>
      {nodes?.map((node, index) => {
        if (node.type === 'text') {
          let text = <span key={index} dangerouslySetInnerHTML={{ __html: escapeHTML(node.text) }} />;
          const format = node.format || 0;
          if (format & 1) text = <strong key={index}>{text}</strong>;
          if (format & 2) text = <em key={index}>{text}</em>;
          if (format & 8) text = <u key={index}>{text}</u>;
          if (format & 4) text = <s key={index}>{text}</s>; // Strikethrough
          if (format & 32) text = <code key={index}>{text}</code>;
          return text;
        }

        if (!node) {
          return null;
        }

        const serializedChildren = node.children ? (
          <SerializeLexical nodes={node.children} />
        ) : null;

        switch (node.type) {
          case 'heading':
            const Tag = node.tag as React.ElementType;
            return <Tag key={index} className="font-serif font-bold text-text-main my-4 leading-tight transition-colors">{serializedChildren}</Tag>;
          
          case 'paragraph':
            return (
              <p key={index} className="font-serif text-xl leading-relaxed text-text-muted mb-6 transition-colors">
                {serializedChildren}
              </p>
            );

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
                <div className="relative aspect-[3/2] w-full bg-gray-100 dark:bg-zinc-800 overflow-hidden rounded-sm transition-colors">
                  <Image
                    src={media.url}
                    alt={media.alt || ''}
                    fill
                    className="object-cover"
                  />
                </div>
                {media.alt && (
                  <span className="text-sm text-text-muted font-sans italic transition-colors">
                    {media.alt}
                  </span>
                )}
              </div>
            );

          case 'list':
            const ListTag = node.tag === 'ol' ? 'ol' : 'ul';
            return (
              <ListTag key={index} className="font-serif text-xl text-text-muted mb-6 pl-8 list-disc transition-colors">
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
              <blockquote key={index} className="border-l-4 border-accent pl-4 italic text-xl text-text-muted my-6 transition-colors">
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
