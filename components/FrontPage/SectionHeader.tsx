import React from 'react';

export const SectionHeader = ({ title, className = "" }: { title: string, className?: string }) => (
  <div className={`mb-3 ${className}`}>
    <h2 className="font-meta font-bold capitalize text-accent text-sm md:text-[15px] tracking-[0.04em] transition-colors">
      {title}
    </h2>
  </div>
);
