import React from 'react';
import Link from 'next/link';
import { Article } from './types';
import { Byline } from './Byline';
import { getArticleUrl } from '@/utils/getArticleUrl';

export const CompactArticle = ({ article }: { article: Article }) => (
    <Link href={getArticleUrl(article)} className="flex flex-col group cursor-pointer h-full justify-start">
        <h3 className="font-serif font-bold text-gray-900 mb-1 text-[16px] md:text-[18px] leading-tight group-hover:underline decoration-2 underline-offset-2 decoration-gray-900">
            {article.title}
        </h3>
        <p className="font-serif text-gray-700 text-[13px] md:text-[14px] leading-[1.4] mb-2">
            {article.excerpt}
        </p>
        <Byline author={article.author} date={article.date} />
    </Link>
);
