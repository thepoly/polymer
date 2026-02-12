import React, { Fragment } from 'react';
import Link from 'next/link';
import escapeHTML from 'escape-html';

type Node = {
  type: string;
  value?: any;
  children?: Node[];
  url?: string;
  [key: string]: any;
};

export const SerializeLexical = ({ nodes }: { nodes: Node[] }) => {
  return (
    <Fragment>
      {nodes?.map((node, index) => {
        if (node.type === 'text') {
          let text = <span key={index} dangerouslySetInnerHTML={{ __html: escapeHTML(node.text) }} />;
          if (node.format & 1) text = <strong key={index}>{text}</strong>;
          if (node.format & 2) text = <em key={index}>{text}</em>;
          if (node.format & 8) text = <u key={index}>{text}</u>;
          if (node.format & 4) text = <s key={index}>{text}</s>; // Strikethrough
          if (node.format & 32) text = <code key={index}>{text}</code>;
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
              <p key={index} className="font-serif text-lg leading-relaxed text-gray-800 mb-6">
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
              <ListTag key={index} className="font-serif text-lg text-gray-800 mb-6 pl-8 list-disc">
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
