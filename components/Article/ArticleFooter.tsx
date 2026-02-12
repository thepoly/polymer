import React from 'react';

export const ArticleFooter: React.FC = () => {
  return (
    <div className="max-w-[680px] mx-auto mt-12 pt-8 border-t border-gray-200">
      <p className="font-serif text-gray-500 italic text-sm text-center">
        Have a correction or a tip? Email us at <a href="mailto:edop@poly.rpi.edu" className="text-[#D6001C] hover:underline">edop@poly.rpi.edu</a>.
      </p>
    </div>
  );
};
