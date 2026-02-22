import React from 'react';

export const SectionHeader = ({ title, className = "" }: { title: string, className?: string }) => (
  <div className={`mb-3 ${className}`}>
    <h2 className="font-serif font-bold uppercase text-accent text-sm md:text-[15px] tracking-wider transition-colors">
      {title}
    </h2>
  </div>
);
