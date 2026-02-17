import React from 'react';
import { SerializeLexical, LexicalNode } from '@/components/Article/RichTextParser';

type Props = {
  content: {
    root: {
      children: LexicalNode[];
    };
  }; 
};

export const ArticleContent: React.FC<Props> = ({ content }) => {
  if (!content?.root?.children) {
    return null;
  }

  return (
    <div className="max-w-[680px] mx-auto px-4 md:px-0 mb-20">
      <SerializeLexical nodes={content.root.children} />
    </div>
  );
};
