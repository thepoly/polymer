import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Article } from './types';
import { Byline } from './Byline';
import { getArticleUrl } from '@/utils/getArticleUrl';

export const LeadArticle = ({ article }: { article: Article }) => (
    <Link href={getArticleUrl(article)} className="flex flex-col group cursor-pointer h-full">
        {article.image && (
            <div className="relative mb-4 w-full overflow-hidden">
                <div className="relative aspect-[16/10] w-full">
                    <Image 
                        src={article.image} 
                        alt={article.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1280px) 100vw, 720px"
                    />
                </div>
            </div>
        )}
        <div className="flex flex-col justify-between flex-grow">
            <div>
                <p className="font-ui mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                    {article.section}
                </p>
                <h3 className="font-display mb-3 text-[26px] font-bold leading-[1] tracking-[-0.018em] text-text-main transition-colors group-hover:text-accent md:text-[32px]">
                    {article.title}
                </h3>
                {article.excerpt && (
                    <p className="font-copy max-w-[40rem] text-[13px] leading-[1.42] text-text-main transition-colors md:text-[14px]">
                        {article.excerpt}
                    </p>
                )}
            </div>
            <Byline author={article.author} date={article.date} />
        </div>
    </Link>
);
