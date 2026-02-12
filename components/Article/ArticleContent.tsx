import React from 'react';
import { SerializeLexical } from './RichTextParser';

type Props = {
  content: any; // Using any for the Lexical root structure
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
