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
        <p className="font-meta mb-2 text-[11px] md:text-[12px] font-[440] italic capitalize tracking-[0.04em] text-accent dark:text-[#d96b76]">
          {article.section}
        </p>
        <h3 className={`font-copy mb-1 text-[24px] md:text-[26px] font-bold leading-[1.04] text-text-main transition-colors ${article.section === "news" ? "!text-[1.2em]" : ""} ${article.section === "features" ? "font-light italic text-[25px] md:text-[27px]" : ""}`}>
            {article.title}
        </h3>
        <Byline author={article.author} date={article.date} />
        {hasImage && article.excerpt && (
            <p className="font-meta mb-1 text-[12px] font-normal leading-[1.38] text-text-main transition-colors">
                {article.excerpt}
            </p>
        )}
    </Link>
);
