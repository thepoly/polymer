'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Article } from './types';
import { Byline } from './Byline';
import { getArticleUrl } from '@/utils/getArticleUrl';
import { SectionHeader } from './SectionHeader';

interface HorizontalSectionProps {
  title: string;
  articles: Article[];
}

export const HorizontalSection = ({ title, articles }: HorizontalSectionProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  const pages: Article[][] = [];
  for (let i = 0; i < articles.length; i += 4) {
    pages.push(articles.slice(i, i + 4));
  }

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
      const newPage = Math.round(scrollLeft / clientWidth);
      if (newPage !== currentPage) setCurrentPage(newPage);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [articles, pages.length]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const clientWidth = scrollRef.current.clientWidth;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -clientWidth : clientWidth,
        behavior: 'smooth',
      });
    }
  };

  if (!articles || articles.length === 0) return null;

  return (
    <div className="w-full bg-bg-main font-serif text-text-main transition-colors duration-300 border-t border-border-main">
      {/* Section header — identical pattern to top of page */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between py-3 border-b border-border-main">
          <div className="flex items-center gap-4">
            <SectionHeader title={title} />
            {pages.length > 1 && (
              <div className="hidden md:flex gap-1.5 items-center">
                {pages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (scrollRef.current) {
                        scrollRef.current.scrollTo({
                          left: i * scrollRef.current.clientWidth,
                          behavior: 'smooth',
                        });
                      }
                    }}
                    className={`h-[3px] rounded-full transition-all duration-300 ${
                      i === currentPage
                        ? 'w-4 bg-text-main'
                        : 'w-[3px] bg-text-muted opacity-30'
                    }`}
                    aria-label={`Go to page ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {pages.length > 1 && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                className={`w-7 h-7 flex items-center justify-center focus:outline-none transition-opacity ${
                  canScrollLeft ? 'text-text-main hover:text-accent' : 'opacity-20 cursor-default text-text-muted'
                }`}
                aria-label="Previous"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                className={`w-7 h-7 flex items-center justify-center focus:outline-none transition-opacity ${
                  canScrollRight ? 'text-text-main hover:text-accent' : 'opacity-20 cursor-default text-text-muted'
                }`}
                aria-label="Next"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scroll container */}
      <div className="max-w-[1280px] mx-auto overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style dangerouslySetInnerHTML={{ __html: `div::-webkit-scrollbar { display: none; }` }} />

          {pages.map((pageArticles, pageIndex) => {
            const lead = pageArticles[0];
            const side = pageArticles.slice(1);

            return (
              <div
                key={pageIndex}
                className="w-full flex-shrink-0 snap-center px-4 md:px-6 box-border"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 items-start pt-5 pb-6">

                  {/* Lead — left 7 cols */}
                  <div className={`${side.length > 0 ? 'md:col-span-7 md:pr-7 md:border-r md:border-border-main' : 'md:col-span-12 max-w-2xl'}`}>
                    <Link href={getArticleUrl(lead)} className="group block">
                      {lead.image && (
                        <div className="relative w-full mb-3 overflow-hidden bg-gray-100 dark:bg-zinc-800">
                          <div className="aspect-[3/2] relative">
                            <Image
                              src={lead.image}
                              alt={lead.title}
                              fill
                              className="object-cover group-hover:scale-[1.015] transition-transform duration-500"
                              sizes="(max-width: 768px) 100vw, 700px"
                            />
                          </div>
                        </div>
                      )}
                      <h3
                        className={`font-serif font-bold text-text-main group-hover:text-text-muted transition-colors leading-tight mb-2 ${
                          lead.image ? 'text-2xl md:text-3xl' : 'text-3xl md:text-4xl lg:text-[42px]'
                        }`}
                      >
                        {lead.title}
                      </h3>
                      {lead.excerpt && (
                        <p className="font-serif text-text-main text-[14px] md:text-[15px] leading-snug mb-3 transition-colors">
                          {lead.excerpt}
                        </p>
                      )}
                      <Byline author={lead.author} date={lead.date} />
                    </Link>
                  </div>

                  {/* Sidebar — right 5 cols, NYT-style stacked compact list */}
                  {side.length > 0 && (
                    <div className="md:col-span-5 md:pl-7 mt-5 md:mt-0 flex flex-col divide-y divide-border-main">
                      {side.map((article) => (
                        <div key={article.id} className="py-3 first:pt-0 last:pb-0">
                          <Link href={getArticleUrl(article)} className="group flex gap-3 items-start">
                            {article.image && (
                              <div className="w-[72px] h-[54px] relative overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0">
                                <Image
                                  src={article.image}
                                  alt={article.title}
                                  fill
                                  className="object-cover group-hover:scale-[1.015] transition-transform duration-500"
                                  sizes="80px"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-serif font-bold text-text-main text-[15px] leading-snug mb-1.5 group-hover:text-text-muted transition-colors line-clamp-3">
                                {article.title}
                              </h3>
                              {!article.image && article.excerpt && (
                                <p className="font-serif text-text-main text-[13px] leading-snug mb-1.5 line-clamp-2 opacity-70">
                                  {article.excerpt}
                                </p>
                              )}
                              <Byline author={article.author} date={article.date} />
                            </div>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};