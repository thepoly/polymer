import React, { Fragment } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import escapeHTML from 'escape-html';
import { Media, User } from '@/payload-types';
import { PhotoGallery } from './PhotoGallery';
import { Carousel } from './Carousel';

export type LexicalNode = {
  type: string;
  value?: unknown;
  text?: string;
  children?: LexicalNode[];
  url?: string;
  fields?: {
    url?: string;
    newTab?: boolean;
    linkType?: string;
    [key: string]: unknown;
  };
  version: number;
  format?: number;
  tag?: string;
  [key: string]: unknown;
};

// Lexical stores alignment on element nodes (paragraphs, headings, etc.) via format:
// string: "center", "right", "justify", "left", "start", "end"
// number: 1=left, 2=center, 3=right, 4=justify, 5=start, 6=end
const getAlignStyle = (format: unknown): React.CSSProperties | undefined => {
  if (typeof format === 'string' && format) {
    return { textAlign: format as React.CSSProperties['textAlign'] };
  }
  const numMap: Record<number, React.CSSProperties['textAlign']> = {
    1: 'left', 2: 'center', 3: 'right', 4: 'justify', 5: 'start', 6: 'end',
  };
  if (typeof format === 'number' && numMap[format]) {
    return { textAlign: numMap[format] };
  }
  return undefined;
};

const ParagraphTracker = ({ children, isFirst, rootIndex, style }: { children: React.ReactNode; isFirst: boolean; rootIndex?: number; style?: React.CSSProperties }) => (
  <p
    className={`font-copy text-xl leading-relaxed text-text-main dark:text-[#CCCCCC] mb-6 transition-colors ${isFirst ? 'drop-cap' : ''}`}
    style={style}
    {...(rootIndex !== undefined ? { 'data-ie-field': 'paragraph', 'data-ie-index': rootIndex } : {})}
  >
    {children}
  </p>
);

const serialize = (nodes: LexicalNode[], pCount: number, isRoot: boolean): { children: React.ReactNode; pCount: number } => {
  let currentPCount = pCount;
  
  const children = nodes?.map((node, index) => {
    if (node.type === 'text') {
      let text: React.ReactNode = <span key={index} dangerouslySetInnerHTML={{ __html: escapeHTML(node.text || "") }} />;
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

    const { children: serializedChildren, pCount: nextPCount } = node.children 
      ? serialize(node.children, currentPCount, false) 
      : { children: null, pCount: currentPCount };
    
    // We only update the parent's pCount if we are NOT at the root level of a node that has children
    // but wait, paragraph incrementing should only happen when we actually encounter a paragraph.
    // So currentPCount should be updated by the recursive call if it encountered paragraphs.
    currentPCount = nextPCount;

    switch (node.type) {
      case 'heading': {
        const Tag = (node.tag || 'h1') as React.ElementType;
        const headingClasses: Record<string, string> = {
          h1: 'text-3xl md:text-4xl mb-6 mt-12',
          h2: 'text-2xl md:text-3xl mb-5 mt-10',
          h3: 'text-xl md:text-2xl mb-4 mt-8',
          h4: 'text-lg md:text-xl mb-3 mt-6',
          h5: 'text-base md:text-lg mb-2 mt-4',
          h6: 'text-sm md:text-base mb-1 mt-2',
        };
        const classes = headingClasses[Tag as string] || headingClasses.h1;
        return (
          <Tag
            key={index}
            className={`font-copy font-bold text-text-main leading-tight transition-colors ${classes}`}
            style={getAlignStyle(node.format)}
          >
            {serializedChildren}
          </Tag>
        );
      }

      case 'paragraph': {
        const isFirst = currentPCount === 0;
        currentPCount++;
        return (
          <ParagraphTracker key={index} isFirst={isFirst} rootIndex={isRoot ? index : undefined} style={getAlignStyle(node.format)}>
            {serializedChildren}
          </ParagraphTracker>
        );
      }

      case 'link': {
        const fields = node.fields as { url?: string; newTab?: boolean } | undefined;
        const href = fields?.url || node.url || '';

        if (!href) {
          return <Fragment key={index}>{serializedChildren}</Fragment>;
        }

        return (
          <Link
            key={index}
            href={href}
            className="text-accent hover:underline decoration-1 underline-offset-2 transition-colors"
          >
            {serializedChildren}
          </Link>
        );
      }

      case 'upload':
        const media = node.value as Media;
        if (!media || !media.url) return null;
        const fields = node.fields as Record<string, unknown> | undefined;
        const caption = fields?.caption as string | undefined;
        const creditUser = (fields?.credit as User | null | undefined) || (media.photographer && typeof media.photographer === 'object' ? media.photographer as User : null);
        const writeInPhotographer = (media as unknown as Record<string, unknown>).writeInPhotographer as string | null | undefined;
        return (
          <div
            key={index}
            id={`media-${media.id}`}
            className="my-10 flex flex-col gap-1 scroll-mt-20"
          >
            <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen max-w-none md:static md:ml-0 md:mr-0 md:w-full bg-gray-100 dark:bg-zinc-800 overflow-hidden transition-colors">
              <Image
                src={media.url}
                alt={media.title || ""}
                width={media.width || 1200}
                height={media.height || 800}
                sizes="(max-width: 768px) 100vw, 680px"
                loading="lazy"
                className="w-full h-auto"
              />
            </div>
            {(caption || creditUser) && (
              <p
                className="font-meta text-[12px] italic text-text-muted transition-colors"
                {...(isRoot ? { 'data-ie-field': 'upload-caption', 'data-ie-index': index } : {})}
              >
                {caption}
                {(creditUser || writeInPhotographer) && (
                  <span className="opacity-60">
                    {caption ? ' ' : ''}
                    {creditUser && typeof creditUser === 'object'
                      ? <Link href={`/staff/${creditUser.slug || creditUser.id}`} className="hover:opacity-80 transition-opacity">{creditUser.firstName} {creditUser.lastName}/The Polytechnic</Link>
                      : writeInPhotographer}
                  </span>
                )}
              </p>
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
          <blockquote key={index} className="border-l-4 border-accent pl-4 italic text-xl text-text-main dark:text-[#CCCCCC] my-6 transition-colors" style={getAlignStyle(node.format)}>
            {serializedChildren}
          </blockquote>
        );

      case 'block': {
        const blockFields = node.fields as { blockType: string; images?: { image: Media | number; caption?: string | null }[] } | undefined;
        if (!blockFields) return null;
        if (blockFields.blockType === 'photo_gallery') {
          return <PhotoGallery key={index} images={blockFields.images || []} />;
        }
        if (blockFields.blockType === 'carousel') {
          return <Carousel key={index} images={blockFields.images || []} />;
        }
        return null;
      }

      default:
        return <Fragment key={index}>{serializedChildren}</Fragment>;
    }
  });

  return { children, pCount: currentPCount };
};

export const SerializeLexical = ({ nodes }: { nodes: LexicalNode[] }) => {
  const { children } = serialize(nodes, 0, true);
  return <Fragment>{children}</Fragment>;
};
