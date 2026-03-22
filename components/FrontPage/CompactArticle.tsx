import React from 'react';
import Link from 'next/link';
import { Article } from './types';
import { Byline } from './Byline';
import { getArticleUrl } from '@/utils/getArticleUrl';

export const CompactArticle = ({ article }: { article: Article }) => (
    <Link href={getArticleUrl(article)} className="flex flex-col group cursor-pointer h-full justify-start">
        <h3 className={`font-display font-bold text-text-main mb-1 text-[16px] md:text-[18px] leading-tight group-hover:text-accent transition-colors ${article.section === "news" ? "font-meta !font-[600] !text-[1.2em]" : ""} ${article.section === "features" ? "font-light italic text-[17px] md:text-[19px]" : ""} ${article.section === "sports" ? "font-[560] italic tracking-[0.015em]" : ""}`}>
            {article.title}
        </h3>
        <Byline author={article.author} date={article.date} />
        <p className="font-meta text-text-main text-[13px] md:text-[14px] font-normal leading-[1.4] mb-2 transition-colors">
            {article.excerpt}
        </p>
    </Link>
);
