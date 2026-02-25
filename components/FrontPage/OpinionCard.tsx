import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Article } from './types';
import { getArticleUrl } from '@/utils/getArticleUrl';

export const OpinionCard = ({ article, hasImage }: { article: Article, hasImage?: boolean }) => (
    <Link href={getArticleUrl(article)} className="flex flex-col cursor-pointer group">
        {hasImage && article.image && (
             <div className="aspect-[16/9] w-full overflow-hidden bg-gray-100 dark:bg-zinc-800 mb-3 relative">
                <Image 
                    src={article.image} 
                    alt={article.title} 
                    fill
                    className="object-cover"
                />
            </div>
        )}
        <h3 className={`font-serif font-bold text-text-main mb-1 leading-tight ${hasImage ? 'text-lg' : 'text-[17px]'} group-hover:text-text-muted transition-colors`}>
            {article.title}
        </h3>
        <p className="font-serif text-text-muted text-[14px] leading-snug mb-1 transition-colors">
            {article.excerpt}
        </p>
    </Link>
);
