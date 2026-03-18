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
    <div className="mx-auto mb-20 max-w-[680px] px-4 text-text-main dark:text-[#CCCCCC] md:px-0 [&_blockquote]:!text-text-main dark:[&_blockquote]:!text-[#CCCCCC] [&_h1]:!text-text-main dark:[&_h1]:!text-[#CCCCCC] [&_h2]:!text-text-main dark:[&_h2]:!text-[#CCCCCC] [&_h3]:!text-text-main dark:[&_h3]:!text-[#CCCCCC] [&_h4]:!text-text-main dark:[&_h4]:!text-[#CCCCCC] [&_h5]:!text-text-main dark:[&_h5]:!text-[#CCCCCC] [&_h6]:!text-text-main dark:[&_h6]:!text-[#CCCCCC] [&_li]:!text-text-main dark:[&_li]:!text-[#CCCCCC] [&_ol]:!text-text-main dark:[&_ol]:!text-[#CCCCCC] [&_p]:!text-text-main dark:[&_p]:!text-[#CCCCCC] [&_span]:!text-text-main dark:[&_span]:!text-[#CCCCCC] [&_strong]:!text-text-main dark:[&_strong]:!text-[#CCCCCC] [&_ul]:!text-text-main dark:[&_ul]:!text-[#CCCCCC]">
      <SerializeLexical nodes={content.root.children} />
    </div>
  );
};
