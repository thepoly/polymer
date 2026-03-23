import React from 'react';
import Image from 'next/image';
import TransitionLink from '@/components/TransitionLink';
import { Article } from './types';
import { Byline } from './Byline';
import { getArticleUrl } from '@/utils/getArticleUrl';

const getLeadDate = (article: Article): string | null => {
    if (article.date) return article.date;
    if (!article.publishedDate) return null;
    const diffDays = Math.floor((Date.now() - new Date(article.publishedDate).getTime()) / (1000 * 60 * 60 * 24));
    return `${diffDays} DAY${diffDays !== 1 ? 'S' : ''} AGO`;
};

export const LeadArticle = ({
    article,
    compact = false,
    imageFirstOnMobile = false,
    hideKicker = false,
    important = false,
}: {
    article: Article;
    compact?: boolean;
    imageFirstOnMobile?: boolean;
    hideKicker?: boolean;
    /** When true, headline is bolder and uppercase */
    important?: boolean;
}) => (
    <TransitionLink href={getArticleUrl(article)} className="flex h-full flex-col group cursor-pointer min-w-0">
        <div
            data-header-anchor="text"
            className={imageFirstOnMobile && article.image ? "order-2 mt-4 md:order-1 md:mt-0" : ""}
        >
            {!hideKicker && (
                <p className="font-meta mb-1 text-[12px] font-[600] uppercase tracking-[0.08em] text-accent">
                    {article.section}
                </p>
            )}
            <h3
                data-marauders-title
                className={`relative z-[30] font-display mb-0.5 md:mb-1 font-bold leading-[1.04] tracking-[-0.018em] text-text-main transition-colors group-hover:text-accent [overflow-wrap:anywhere] break-words ${article.section === "news" ? `font-meta !text-[1.6em] ${important ? "!font-[800] uppercase" : "!font-[600]"}` : ""} ${article.section === "features" ? "font-light italic" : ""} ${article.section === "sports" ? "font-[560] italic tracking-[0.015em]" : ""} ${article.section === "opinion" ? "font-light" : ""} ${
                    compact ? "text-[29px] md:text-[29px] xl:text-[31px]" : "text-[32px] md:text-[33px] xl:text-[36px]"
                } ${article.section === "features" ? (compact ? "text-[30px] md:text-[30px] xl:text-[32px]" : "text-[33px] md:text-[34px] xl:text-[37px]") : ""}`}
            >
                {article.title}
            </h3>
            <Byline author={article.author} date={getLeadDate(article)} split />
            {article.excerpt && (
                <p
                    data-marauders-obstacle="excerpt"
                    className={`font-meta font-normal text-black dark:text-white transition-colors mt-1.5 ${
                        compact ? "max-w-[36rem] text-[13px] leading-[1.42] md:text-[14px]" : "max-w-[40rem] text-[14px] leading-[1.45] md:text-[15px]"
                    } [overflow-wrap:anywhere] break-words`}
                >
                    {article.excerpt}
                </p>
            )}
        </div>
        {article.image && (
            <div
                data-header-anchor="image"
                data-marauders-obstacle="image"
                className={`relative mt-4 w-full overflow-hidden left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen md:static md:ml-0 md:mr-0 md:w-full ${
                    imageFirstOnMobile ? "order-1 md:order-2 mt-0 md:mt-4" : ""
                }`}
            >
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
                        priority
                        sizes="(max-width: 1280px) 100vw, 720px"
                    />
                </div>
            </div>
        )}
    </TransitionLink>
);
