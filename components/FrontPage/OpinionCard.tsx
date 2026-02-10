import React from 'react';
import Image from 'next/image';
import { Article } from './types';

export const OpinionCard = ({ article, hasImage }: { article: Article, hasImage?: boolean }) => (
    <div className="flex flex-col cursor-pointer group">
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
        <h3 className={`font-serif font-bold text-gray-900 mb-1 leading-tight ${hasImage ? 'text-lg' : 'text-[17px]'}`}>
            {article.title}
        </h3>
        <p className="font-serif text-gray-600 text-[14px] leading-snug mb-1">
            {article.excerpt}
        </p>
    </div>
);
