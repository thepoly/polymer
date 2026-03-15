import React from 'react';
import { SerializeLexical, LexicalNode } from '@/components/Article/RichTextParser';

type Props = {
  content?: {
    root: {
      children: LexicalNode[];
    };
  } | null;
};

export const ArticleContent: React.FC<Props> = ({ content }) => {
  if (!content?.root?.children) {
    return null;
  }

  return (
    <div className="mx-auto mb-20 max-w-[680px] px-4 text-black md:px-0 [&_blockquote]:!text-black [&_h1]:!text-black [&_h2]:!text-black [&_h3]:!text-black [&_h4]:!text-black [&_h5]:!text-black [&_h6]:!text-black [&_li]:!text-black [&_ol]:!text-black [&_p]:!text-black [&_span]:!text-black [&_strong]:!text-black [&_ul]:!text-black">
      <SerializeLexical nodes={content.root.children} />
    </div>
  );
};
