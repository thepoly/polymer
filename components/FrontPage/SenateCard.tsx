import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Article } from './types';
import { Byline } from './Byline';

export const SenateCard = ({ article }: { article: Article }) => (
    <Link href={`/article/${article.slug}`} className="flex flex-col md:flex-row gap-6 cursor-pointer group mt-5 border-t border-gray-300 pt-5">
        <div className="flex-1 flex flex-col justify-center">
             <div className="mb-2">
                <span className="text-[#D6001C] font-bold font-serif uppercase text-xs tracking-wider">Student Senate</span>
            </div>
            <h3 className="font-serif font-bold text-xl md:text-2xl text-gray-900 mb-3 leading-tight group-hover:underline decoration-2 underline-offset-2 decoration-gray-900">
                {article.title}
            </h3>
            <p className="font-serif text-gray-800 text-[15px] leading-snug mb-3">
                {article.excerpt}
            </p>
             <Byline author={article.author} date={article.date} />
        </div>
        <div className="w-full md:w-[350px] shrink-0">
            <div className="aspect-[16/9] w-full overflow-hidden bg-gray-100 relative">
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
