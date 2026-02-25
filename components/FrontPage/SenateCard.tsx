import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Article } from './types';
import { Byline } from './Byline';
import { getArticleUrl } from '@/utils/getArticleUrl';

export const SenateCard = ({ article }: { article: Article }) => (
    <Link href={getArticleUrl(article)} className="flex flex-col md:flex-row gap-6 cursor-pointer group mt-5 border-t border-border-main pt-5 transition-colors">
        <div className="flex-1 flex flex-col justify-center">
             <div className="mb-2">
                <span className="text-accent font-bold font-serif uppercase text-xs tracking-wider transition-colors">Student Senate</span>
            </div>
            <h3 className="font-serif font-bold text-xl md:text-2xl text-text-main mb-3 leading-tight group-hover:underline decoration-2 underline-offset-2 decoration-text-main transition-colors">
                {article.title}
            </h3>
            <p className="font-serif text-text-muted text-[15px] leading-snug mb-3 transition-colors">
                {article.excerpt}
            </p>
             <Byline author={article.author} date={article.date} />
        </div>
        <div className="w-full md:w-[350px] shrink-0">
            <div className="aspect-[16/9] w-full overflow-hidden bg-gray-100 dark:bg-zinc-800 relative transition-colors">
                {article.image && (
                    <Image 
                        src={article.image} 
                        alt={article.title} 
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                )}
            </div>
        </div>
    </Link>
);
