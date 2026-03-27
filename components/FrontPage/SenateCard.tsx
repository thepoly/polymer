import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Article } from './types';
import { Byline } from './Byline';
import { getArticleUrl } from '@/utils/getArticleUrl';

export const SenateCard = ({ article }: { article: Article }) => (
    <Link href={getArticleUrl(article)} className="flex flex-col md:flex-row gap-6 cursor-pointer group transition-colors">
        <div className="flex-1 flex flex-col justify-center">
             <div className="mb-2">
                <span className="font-meta text-accent dark:text-[#d96b76] font-[440] italic capitalize text-[11px] md:text-[12px] tracking-[0.04em] transition-colors">Student Senate</span>
            </div>
            <h3 className={`font-copy font-bold text-[24px] md:text-[30px] text-text-main mb-3 leading-[1.06] tracking-[-0.018em] transition-colors ${article.section === "news" ? "!text-[1.2em]" : ""} ${article.section === "features" ? "font-light italic text-[25px] md:text-[31px]" : ""}`}>
                {article.title}
            </h3>
             <Byline author={article.author} date={article.date} />
            <p className="font-meta text-text-main text-[13px] font-normal leading-[1.4] mb-3 transition-colors">
                {article.excerpt}
            </p>
        </div>
        {article.image ? (
            <div className="w-full md:w-[350px] shrink-0">
                <div className="aspect-[16/9] w-full overflow-hidden bg-gray-100 dark:bg-zinc-800 relative transition-colors">
                    <Image 
                        src={article.image} 
                        alt={article.title} 
                        fill
                        className="object-cover"
                    />
                </div>
            </div>
        ) : null}
    </Link>
);
