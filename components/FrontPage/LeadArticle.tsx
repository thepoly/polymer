import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Article } from './types';
import { Byline } from './Byline';
import { getArticleUrl } from '@/utils/getArticleUrl';

export const LeadArticle = ({
    article,
    compact = false,
}: {
    article: Article;
    compact?: boolean;
}) => (
    <Link href={getArticleUrl(article)} className="flex h-full flex-col group cursor-pointer">
        <div>
            <p className="font-meta mb-2 text-[11px] md:text-[12px] font-[440] italic capitalize tracking-[0.04em] text-accent">
                {article.section}
            </p>
            <h3
                className={`font-display mb-3 font-bold leading-[1.04] tracking-[-0.018em] text-text-main transition-colors group-hover:text-accent ${article.section === "news" ? "font-display-news uppercase" : ""} ${article.section === "features" ? "font-normal italic" : ""} ${article.section === "sports" ? "italic tracking-[0.015em]" : ""} ${
                    compact ? "text-[24px] md:text-[29px] xl:text-[31px]" : "text-[27px] md:text-[33px] xl:text-[36px]"
                } ${article.section === "features" ? (compact ? "text-[25px] md:text-[30px] xl:text-[32px]" : "text-[28px] md:text-[34px] xl:text-[37px]") : ""}`}
            >
                {article.title}
            </h3>
            {article.excerpt && (
                <p
                    className={`font-meta font-normal text-text-main transition-colors ${
                        compact ? "max-w-[36rem] text-[13px] leading-[1.42] md:text-[14px]" : "max-w-[40rem] text-[14px] leading-[1.45] md:text-[15px]"
                    }`}
                >
                    {article.excerpt}
                </p>
            )}
            <Byline author={article.author} date={article.date} split />
        </div>
        {article.image && (
            <div className="relative mt-4 w-full overflow-hidden">
                <div
                    className={`relative w-full ${
                        compact ? "aspect-[16/10] xl:aspect-[17/10]" : "aspect-[3/2] xl:aspect-[8/5]"
                    }`}
                >
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
    </Link>
);
