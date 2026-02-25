import React from 'react';
import { SerializeLexical, LexicalNode } from './RichTextParser';

type Props = {
  content: {
    root: {
      children: LexicalNode[];
    };
  } | null | undefined; 
};

export const ArticleContent: React.FC<Props> = ({ content }) => {
  if (!content?.root?.children) {
    return null;
  }

  return (
    <div className="max-w-[680px] mx-auto">
      <SerializeLexical nodes={content.root.children} />
    </div>
  );
};
