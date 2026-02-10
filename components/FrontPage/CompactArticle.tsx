import React from 'react';
import { Article } from './types';
import { Byline } from './Byline';

export const CompactArticle = ({ article }: { article: Article }) => (
    <div className="flex flex-col group cursor-pointer h-full justify-start">
        <h3 className="font-serif font-bold text-gray-900 mb-1 text-[16px] md:text-[18px] leading-tight">
            {article.title}
        </h3>
        <p className="font-serif text-gray-700 text-[13px] md:text-[14px] leading-[1.4] mb-2">
            {article.excerpt}
        </p>
        <Byline author={article.author} date={article.date} />
    </div>
);
