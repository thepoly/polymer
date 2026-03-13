import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Article } from './types';
import { Byline } from './Byline';
import { getArticleUrl } from '@/utils/getArticleUrl';

export const OpinionCard = ({ article, hasImage }: { article: Article, hasImage?: boolean }) => (
    <Link href={getArticleUrl(article)} className="flex flex-col cursor-pointer group">
        {hasImage && article.image && (
             <div className="relative mb-3 aspect-[16/10] w-full overflow-hidden">
                <Image 
                    src={article.image} 
                    alt={article.title} 
                    fill
                    className="object-cover"
                    sizes="(max-width: 1280px) 100vw, 320px"
                />
            </div>
        )}
        <p className="font-ui mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
            {article.section}
        </p>
        <h3 className="font-display mb-1 text-[19px] font-bold leading-[1.04] text-text-main transition-colors group-hover:text-accent">
            {article.title}
        </h3>
        {hasImage && article.excerpt && (
            <p className="font-copy mb-1 text-[12px] leading-[1.38] text-text-main transition-colors">
                {article.excerpt}
            </p>
        )}
        <Byline author={article.author} date={article.date} />
    </Link>
);
