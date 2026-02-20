import React from 'react';
import Link from 'next/link';
import { Article } from './types';
import { Byline } from './Byline';
import { getArticleUrl } from '@/utils/getArticleUrl';

export const CompactArticle = ({ article }: { article: Article }) => (
    <Link href={getArticleUrl(article)} className="flex flex-col group cursor-pointer h-full justify-start">
        <h3 className="font-serif font-bold text-text-main mb-1 text-[16px] md:text-[18px] leading-tight group-hover:text-text-muted transition-colors">
            {article.title}
        </h3>
        <p className="font-serif text-text-muted text-[13px] md:text-[14px] leading-[1.4] mb-2 transition-colors">
            {article.excerpt}
        </p>
        <Byline author={article.author} date={article.date} />
    </Link>
);
