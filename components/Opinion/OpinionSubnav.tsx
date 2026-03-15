'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { ColumnistAuthor } from './types';

const tabs = [
  { label: 'Columns', value: 'column', isDropdown: true },
  { label: 'Op-Eds', value: 'opinion', isDropdown: false },
  { label: 'Staff Editorials', value: 'staff-editorial', isDropdown: false },
  { label: 'Editorial Notebook', value: 'editorial-notebook', isDropdown: false },
  { label: 'Letters', value: 'letter-to-the-editor', isDropdown: false },
  { label: 'More', value: 'all-more', isDropdown: true },
];

const moreOptions = [
  { label: 'Endorsement', value: 'endorsement' },
  { label: 'Top Hat', value: 'top-hat' },
  { label: 'Candidate Profile', value: 'candidate-profile' },
  { label: "The Poly's Recommendations", value: 'polys-recommendations' },
  { label: 'Other', value: 'other' },
];

export const OpinionSubnav = ({
  activeCategory,
  columnists,
}: {
  activeCategory: string;
  columnists: ColumnistAuthor[];
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [columnistsOpen, setColumnistsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const columnistsDropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        columnistsDropdownRef.current &&
        !columnistsDropdownRef.current.contains(e.target as Node)
      ) {
        setColumnistsOpen(false);
      }
      if (
        moreDropdownRef.current &&
        !moreDropdownRef.current.contains(e.target as Node)
      ) {
        setMoreOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pushCategory = (category: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('category', category);
    router.push(`/opinion?${params.toString()}`);
    setColumnistsOpen(false);
    setMoreOpen(false);
  };

  const tabClass = (isActive: boolean) =>
    `text-[13px] font-medium uppercase tracking-wide whitespace-nowrap transition-colors flex items-center gap-1.5 ${
      isActive ? 'text-[#D6001C]' : 'text-black hover:text-[#D6001C]'
    }`;

  const divider = (
    <span className="text-gray-300 select-none" aria-hidden>|</span>
  );

  return (
    <nav className="bg-white">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6">
        <div className="py-2 flex items-center gap-4 overflow-x-auto border-t border-b border-black">
        {/* Columnists dropdown */}
        <div ref={columnistsDropdownRef} className="relative flex items-center gap-4">
          <button
            onClick={() => setColumnistsOpen(!columnistsOpen)}
            className={tabClass(activeCategory === 'column')}
          >
            Columns
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {columnistsOpen && (
            <div className="absolute top-full left-0 mt-3 bg-white border border-gray-200 shadow-lg z-50 min-w-[240px]">
              {columnists.length > 0 ? (
                columnists.map((columnist) => (
                  <button
                    key={columnist.id}
                    onClick={() => {
                      router.push(
                        `/opinion?category=column#columnist-${columnist.id}`
                      );
                      setColumnistsOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-[14px] text-black hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    {columnist.firstName} {columnist.lastName}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-[14px] text-gray-500">
                  No columnists yet
                </div>
              )}
            </div>
          )}
          {divider}
        </div>

        {/* Regular tabs with pipe dividers */}
        {tabs
          .filter((tab) => !tab.isDropdown)
          .map((tab, idx, arr) => (
            <React.Fragment key={tab.value}>
              <button
                onClick={() => pushCategory(tab.value)}
                className={tabClass(activeCategory === tab.value)}
              >
                {tab.label}
              </button>
              {idx < arr.length - 1 && divider}
            </React.Fragment>
          ))}

        {/* More dropdown */}
        {divider}
        <div ref={moreDropdownRef} className="relative">
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={tabClass(activeCategory === 'all-more')}
          >
            More
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {moreOpen && (
            <div className="absolute top-full right-0 mt-3 bg-white border border-gray-200 shadow-lg z-50 min-w-[200px]">
              {moreOptions.map((option) => (
                <button
                  key={option.label}
                  onClick={() => pushCategory(option.value)}
                  className="w-full text-left px-4 py-3 text-[14px] text-black hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </nav>
  );
};
