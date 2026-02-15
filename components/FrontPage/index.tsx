'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import { SectionHeader } from './SectionHeader';
import { LeadArticle } from './LeadArticle';
import { CompactArticle } from './CompactArticle';
import { SenateCard } from './SenateCard';
import { OpinionCard } from './OpinionCard';
import { Article } from './types';

interface FrontPageBodyProps {
  topStories: {
    lead: Article;
    list: Article[];
  };
  studentSenate: Article;
  opinion: Article[];
}

const FrontPageBody = ({ topStories, studentSenate, opinion }: FrontPageBodyProps) => {
  const leadRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const leftContentRef = useRef<HTMLDivElement>(null);
  const opinionContainerRef = useRef<HTMLDivElement>(null);
  
  // Default to a wider lead (8-4) to start compressed
  const [split, setSplit] = useState<'9-3' | '8-4' | '7-5' | '6-6'>('8-4');
  const [visibleOpinions, setVisibleOpinions] = useState(opinion.length);
  const [visibleStories, setVisibleStories] = useState(topStories.list.length);

  useLayoutEffect(() => {
    const balance = () => {
      if (!leadRef.current || !listRef.current || !leftContentRef.current || !opinionContainerRef.current) return;

      const leadHeight = leadRef.current.offsetHeight;
      const listHeight = listRef.current.offsetHeight;
      const diff = listHeight - leadHeight;

      // 1. Column Compression Logic
      const tolerance = 60; 

      if (diff < -tolerance) {
         // List is too short. Widen the Lead to squish the list.
         if (split === '6-6') setSplit('7-5');
         else if (split === '7-5') setSplit('8-4');
         else if (split === '8-4') setSplit('9-3');
      } else if (diff > tolerance) {
         // List is too tall. Narrow the Lead to widen the list.
         if (split === '9-3') setSplit('8-4');
         else if (split === '8-4') setSplit('7-5');
         else if (split === '7-5') setSplit('6-6');
      }

      // 2. Hide Overflowing Top Stories
      const listWrappers = Array.from(listRef.current.children) as HTMLElement[];
      const heights = listWrappers.map(w => {
          // Structure: [Spacer, Content, Spacer, Line] -> Content is index 1
          const contentNode = w.children[1] as HTMLElement; 
          return contentNode ? contentNode.offsetHeight : 0;
      });

      let count = heights.length;
      const minGap = 32; 
      
      const calculateNeededHeight = (n: number) => {
          if (n === 0) return 0;
          const contentH = heights.slice(0, n).reduce((a, b) => a + b, 0);
          const gapsH = (n - 1) * minGap; 
          return contentH + gapsH;
      };

      while (count > 1) {
          const needed = calculateNeededHeight(count);
          const overflowThreshold = heights[count - 1] * 0.25; 
          
          if (needed > leadHeight + overflowThreshold) {
              count--;
          } else {
              break;
          }
      }

      if (count !== visibleStories) {
          setVisibleStories(count);
      }

      // 3. Hide Overflowing Opinions
      const leftHeight = leftContentRef.current.offsetHeight;
      const opWrappers = Array.from(opinionContainerRef.current.children) as HTMLElement[];
      
      let currentTotalHeight = 0;
      const opGap = 24; 
      let newVisibleCount = 0;

      for (let i = 0; i < opWrappers.length; i++) {
        const inner = opWrappers[i].firstElementChild as HTMLElement;
        if (!inner) break;
        
        const itemHeight = inner.offsetHeight;
        if (currentTotalHeight + itemHeight > leftHeight) {
          break;
        }
        currentTotalHeight += itemHeight + opGap;
        newVisibleCount = i + 1;
      }

      if (newVisibleCount !== visibleOpinions) {
        setVisibleOpinions(newVisibleCount);
      }
    };

    balance();
    window.addEventListener('resize', balance);
    const timer = setTimeout(balance, 150);
    
    return () => {
      window.removeEventListener('resize', balance);
      clearTimeout(timer);
    };
  }, [split, topStories, opinion, visibleOpinions, visibleStories]);

  const getGridConfig = () => {
    switch (split) {
      case '9-3': return { lead: 'lg:col-span-9', list: 'lg:col-span-3' };
      case '8-4': return { lead: 'lg:col-span-8', list: 'lg:col-span-4' };
      case '7-5': return { lead: 'lg:col-span-7', list: 'lg:col-span-5' };
      case '6-6': return { lead: 'lg:col-span-6', list: 'lg:col-span-6' };
      default: return { lead: 'lg:col-span-8', list: 'lg:col-span-4' };
    }
  };

  const config = getGridConfig();

  return (
    <div className="w-full bg-white font-serif text-gray-900">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            
            {/* --- LEFT MAIN CONTENT (COL-9) --- */}
            <div className="lg:col-span-9 flex flex-col pr-0 lg:pr-6">
                <div ref={leftContentRef} className="flex flex-col">
                    <SectionHeader title="Top Stories" />

                    {/* Increased gap from 5 (20px) to 10 (40px) */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-7">
                        
                        {/* LEAD STORY */}
                        <div className={`md:col-span-12 ${config.lead} transition-all duration-300 ease-in-out`}>
                            <div ref={leadRef}>
                                <LeadArticle article={topStories.lead} />
                            </div>
                        </div>

                        {/* SECONDARY STORIES LIST */}
                        <div className={`md:col-span-12 ${config.list} transition-all duration-300 ease-in-out`}>
                            <div 
                                ref={listRef} 
                                className="flex flex-col h-full"
                            >
                                {topStories.list.map((story, index) => {
                                    const isVisible = index < visibleStories;
                                    const isLastVisible = index === visibleStories - 1;
                                    
                                    return (
                                        <div 
                                            key={`${story.id}-${index}`} 
                                            className={`${isVisible ? 'flex-1 flex flex-col' : 'h-0 overflow-hidden'}`}
                                        >
                                            {/* Spacer Sandwich: Ensures exact 2x spacing (x - line - x) */}
                                            
                                            {/* Top Spacer: x */}
                                            <div className="flex-1 w-full" />

                                            {/* Article Content */}
                                            <div className="w-full">
                                                <CompactArticle article={story} />
                                            </div>

                                            {/* Bottom Spacer: x */}
                                            <div className="flex-1 w-full" />

                                            {/* Border Line */}
                                            {!isLastVisible && isVisible && (
                                                <div className="border-b border-gray-200 w-full" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* SENATE SECTION */}
                    <SenateCard article={studentSenate} />
                </div>
            </div>

            {/* --- RIGHT SIDEBAR (COL-3) --- */}
            <div className="lg:col-span-3 mt-10 lg:mt-0 flex flex-col relative">
                
                {/* Vertical Divider */}
                <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-px bg-gray-300"></div>

                <div className="lg:pl-6 h-full">
                    <SectionHeader title="Opinion" />
                    
                    {/* Opinion Items */}
                    <div ref={opinionContainerRef} className="flex flex-col gap-6">
                        {opinion.map((op, index) => (
                            <div 
                              key={`${op.id}-${index}`} 
                              style={{ 
                                height: index < visibleOpinions ? 'auto' : 0, 
                                overflow: 'hidden',
                                opacity: index < visibleOpinions ? 1 : 0,
                                pointerEvents: index < visibleOpinions ? 'auto' : 'none'
                              }}
                              className={index < visibleOpinions - 1 ? 'border-b border-gray-200 pb-5' : ''}
                            >
                                <div className="py-0.5"> 
                                  <OpinionCard article={op} hasImage={index === 0} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default FrontPageBody;