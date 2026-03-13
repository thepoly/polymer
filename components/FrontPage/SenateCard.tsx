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
                <span className="font-ui text-accent font-bold uppercase text-[10px] tracking-[0.22em] transition-colors">Student Senate</span>
            </div>
            <h3 className="font-display font-bold text-[19px] md:text-[24px] text-text-main mb-3 leading-[1.06] tracking-[-0.018em] group-hover:text-accent transition-colors">
                {article.title}
            </h3>
            <p className="font-copy text-text-main text-[13px] leading-[1.4] mb-3 transition-colors">
                {article.excerpt}
            </p>
             <Byline author={article.author} date={article.date} />
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
