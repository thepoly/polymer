import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Article } from './types';
import { getArticleUrl } from '@/utils/getArticleUrl';

export const OpinionCard = ({ article, hasImage }: { article: Article, hasImage?: boolean }) => (
    <Link href={getArticleUrl(article)} className="flex flex-col cursor-pointer group">
        {hasImage && article.image && (
             <div className="aspect-[16/9] w-full overflow-hidden bg-gray-100 mb-3 relative">
                <Image 
                    src={article.image} 
                    alt={article.title} 
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
            </div>
        )}
        <h3 className={`font-serif font-bold text-gray-900 mb-1 leading-tight ${hasImage ? 'text-lg' : 'text-[17px]'} group-hover:underline decoration-2 underline-offset-2 decoration-gray-900`}>
            {article.title}
        </h3>
        <p className="font-serif text-gray-600 text-[14px] leading-snug mb-1">
            {article.excerpt}
        </p>
    </Link>
);
