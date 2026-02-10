import React from 'react';
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
  return (
    <div className="w-full bg-white font-serif text-gray-900">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            
            {/* --- LEFT MAIN CONTENT (COL-9) --- */}
            <div className="lg:col-span-9 flex flex-col pr-0 lg:pr-6">
                
                <SectionHeader title="Top Stories" />

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pb-4">
                    
                    {/* LEAD STORY */}
                    <div className="md:col-span-7 lg:col-span-8">
                        <LeadArticle article={topStories.lead} />
                    </div>

                    {/* SECONDARY STORIES LIST */}
                    <div className="md:col-span-5 lg:col-span-4 flex flex-col justify-between">
                        {topStories.list.map((story, index) => (
                            <div key={story.id} className={`${index !== topStories.list.length - 1 ? 'border-b border-gray-200 pb-4 mb-4' : ''}`}>
                                <CompactArticle article={story} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* SENATE SECTION */}
                <SenateCard article={studentSenate} />

            </div>

            {/* --- RIGHT SIDEBAR (COL-3) --- */}
            <div className="lg:col-span-3 mt-10 lg:mt-0 flex flex-col relative">
                
                {/* Vertical Divider */}
                <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-px bg-gray-300"></div>

                <div className="lg:pl-6 h-full">
                    <SectionHeader title="Opinion" />
                    
                    {/* Opinion Items */}
                    <div className="flex flex-col gap-6">
                        {opinion.map((op, index) => (
                            <div key={op.id} className={index !== opinion.length - 1 ? 'border-b border-gray-200 pb-5' : ''}>
                                <OpinionCard article={op} hasImage={index === 0} />
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
