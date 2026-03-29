import React from 'react';
import Link from 'next/link';
import { Article } from './types';
import { Byline } from './Byline';
import { getArticleUrl } from '@/utils/getArticleUrl';

export const CompactArticle = ({ article }: { article: Article }) => (
    <Link href={getArticleUrl(article)} className={`flex flex-col group cursor-pointer h-full justify-start${article.isFollytechnic ? ' follytechnic' : ''}`}>
        <h3 className={`font-copy font-bold text-text-main mb-1 text-[16px] md:text-[18px] leading-tight transition-colors ${article.section === "news" ? "!text-[1.2em]" : ""} ${article.section === "sports" ? "font-normal tracking-[0.015em]" : ""} ${article.section === "features" ? "font-light text-[17px] md:text-[19px]" : ""}`}>
            {article.title}
        </h3>
        <Byline author={article.author} date={article.date} />
        <p className="font-meta text-text-main text-[13px] md:text-[14px] font-normal leading-[1.4] mb-2 transition-colors">
            {article.excerpt}
        </p>
    </Link>
);
