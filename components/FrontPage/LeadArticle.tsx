import React from 'react';
import Image from 'next/image';
import TransitionLink from '@/components/TransitionLink';
import { Article } from './types';
import { Byline } from './Byline';
import { getArticleUrl } from '@/utils/getArticleUrl';

export const LeadArticle = ({
    article,
    compact = false,
    imageFirstOnMobile = false,
    hideKicker = false,
}: {
    article: Article;
    compact?: boolean;
    imageFirstOnMobile?: boolean;
    hideKicker?: boolean;
}) => (
    <TransitionLink href={getArticleUrl(article)} className="flex h-full flex-col group cursor-pointer min-w-0">
        <div
            data-header-anchor="text"
            className={imageFirstOnMobile && article.image ? "order-2 mt-4 md:order-1 md:mt-0" : ""}
        >
            {!hideKicker && (
                <p className="font-meta mb-1 text-[13px] md:text-[12px] font-[600] md:font-[440] italic capitalize tracking-[0.04em] text-accent">
                    {article.section}
                </p>
            )}
            <h3
                className={`font-display mb-2 md:mb-3 font-bold leading-[1.04] tracking-[-0.018em] text-text-main transition-colors group-hover:text-accent [overflow-wrap:anywhere] break-words ${article.section === "news" ? "font-display-news uppercase" : ""} ${article.section === "features" ? "font-normal italic" : ""} ${article.section === "sports" ? "italic tracking-[0.015em]" : ""} ${article.section === "opinion" ? "font-light" : ""} ${
                    compact ? "text-[29px] md:text-[29px] xl:text-[31px]" : "text-[32px] md:text-[33px] xl:text-[36px]"
                } ${article.section === "features" ? (compact ? "text-[30px] md:text-[30px] xl:text-[32px]" : "text-[33px] md:text-[34px] xl:text-[37px]") : ""}`}
            >
                {article.title}
            </h3>
            {article.excerpt && (
                <p
                    className={`font-meta font-normal text-text-main transition-colors ${
                        compact ? "max-w-[36rem] text-[13px] leading-[1.42] md:text-[14px]" : "max-w-[40rem] text-[14px] leading-[1.45] md:text-[15px]"
                    } [overflow-wrap:anywhere] break-words`}
                >
                    {article.excerpt}
                </p>
            )}
            <Byline author={article.author} date={article.date} split />
        </div>
        {article.image && (
            <div
                data-header-anchor="image"
                className={`relative mt-4 w-full overflow-hidden left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen lg:static lg:ml-0 lg:mr-0 lg:w-full ${
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
