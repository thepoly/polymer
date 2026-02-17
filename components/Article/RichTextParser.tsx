import React, { Fragment } from 'react';
import Link from 'next/link';
import escapeHTML from 'escape-html';

export type LexicalNode = {
  type: string;
  value?: unknown;
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
            return <Tag key={index} className="font-serif font-bold text-gray-900 my-4 leading-tight">{serializedChildren}</Tag>;
          
          case 'paragraph':
            return (
              <p key={index} className="font-serif text-xl leading-relaxed text-gray-800 mb-6">
                {serializedChildren}
              </p>
            );

          case 'link':
            return (
              <Link key={index} href={escapeHTML(node.url)} className="text-[#D6001C] hover:underline decoration-1 underline-offset-2">
                {serializedChildren}
              </Link>
            );

          case 'list':
            const ListTag = node.tag === 'ol' ? 'ol' : 'ul';
            return (
              <ListTag key={index} className="font-serif text-xl text-gray-800 mb-6 pl-8 list-disc">
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
              <blockquote key={index} className="border-l-4 border-[#D6001C] pl-4 italic text-xl text-gray-700 my-6">
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
