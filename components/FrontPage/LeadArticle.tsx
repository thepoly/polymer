import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Article } from './types';
import { Byline } from './Byline';
import { getArticleUrl } from '@/utils/getArticleUrl';

export const LeadArticle = ({ article }: { article: Article }) => (
    <Link href={getArticleUrl(article)} className="flex flex-col group cursor-pointer h-full">
        <div className="w-full relative mb-3">
            <div className="aspect-[16/9] w-full overflow-hidden bg-gray-100 relative"> 
                {article.image && (
                    <Image 
                        src={article.image} 
                        alt={article.title}
                        fill
                        className="object-cover"
                    />
                )}
            </div>
        </div>
        <div className="flex flex-col justify-between flex-grow">
            <div>
                <h3 className="font-serif font-black text-gray-900 mb-2 text-2xl md:text-3xl leading-[1.05] group-hover:text-gray-600 transition-colors">
                    {article.title}
                </h3>
                <p className="font-serif text-gray-800 text-[15px] leading-snug mb-2">
                    {article.excerpt}
                </p>
            </div>
            <Byline author={article.author} date={article.date} />
        </div>
    </Link>
);
