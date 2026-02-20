import React from 'react';

export const ArticleFooter: React.FC = () => {
  return (
    <div className="max-w-[680px] mx-auto mt-12 pt-8 border-t border-border-main transition-colors duration-300">
      <p className="font-serif text-text-muted italic text-sm text-center">
        Have a correction or a tip? Email us at <a href="mailto:edop@poly.rpi.edu" className="text-accent hover:underline">edop@poly.rpi.edu</a>.
      </p>
    </div>
  );
};
