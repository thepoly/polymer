import React from 'react';
import Image from 'next/image';
import { Article } from './types';
import { Byline } from './Byline';

export const LeadArticle = ({ article }: { article: Article }) => (
    <div className="flex flex-col group cursor-pointer h-full">
        <div className="w-full relative mb-3">
            <div className="aspect-[16/9] w-full overflow-hidden bg-gray-100 relative"> 
                {article.image && (
                    <Image 
                        src={article.image} 
                        alt={article.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                )}
            </div>
        </div>
        <div className="flex flex-col justify-between flex-grow">
            <div>
                <h3 className="font-serif font-black text-gray-900 mb-2 text-2xl md:text-3xl leading-[1.05]">
                    {article.title}
                </h3>
                <p className="font-serif text-gray-800 text-[15px] leading-snug mb-2">
                    {article.excerpt}
                </p>
            </div>
            <Byline author={article.author} date={article.date} />
        </div>
    </div>
);
