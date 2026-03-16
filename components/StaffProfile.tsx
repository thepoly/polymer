"use client";
import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Media, User, Article } from '@/payload-types';
import { SerializeLexical } from '@/components/Article/RichTextParser';

interface StaffProfileProps {
  user: User;
  articles?: Article[];
  photos?: Media[];
  photoToArticleMap?: Record<number, string>;
}

export function StaffProfile({ user, articles = [], photos = [], photoToArticleMap = {} }: StaffProfileProps) {
  const headshot = user.headshot as Media | null;
  const bio = user.bio as any;
  const [showAllArticles, setShowAllArticles] = useState(false);

  const INITIAL_ARTICLE_COUNT = 8;
  const displayedArticles = showAllArticles ? articles : articles.slice(0, INITIAL_ARTICLE_COUNT);
  const hasMoreArticles = articles.length > INITIAL_ARTICLE_COUNT;

  return (
    <div className="flex flex-col gap-16 text-text-main transition-colors duration-300">
      <div className="flex flex-col md:flex-row gap-12 items-start">
        {/* Left Column: Photo & Basic Info */}
        <div className="w-full md:w-1/3 flex-shrink-0">
          <div className="relative w-full aspect-[3/4] mb-6 rounded-sm overflow-hidden bg-gray-100 dark:bg-zinc-800 shadow-sm transition-colors">
            {headshot?.url ? (
              <Image
                src={headshot.url}
                alt={`${user.firstName} ${user.lastName}`}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-zinc-800 text-text-muted transition-colors">
                <span className="text-6xl font-display">
                  {user.firstName[0]}{user.lastName[0]}
                </span>
              </div>
            )}
          </div>
          
          <div className="text-center md:text-left">
              <h1 className="font-display text-3xl font-bold mb-3 tracking-tight">
                  {user.firstName} {user.lastName}
              </h1>
              
              {user.positions?.map((pos, i) => {
                  const title = typeof pos.jobTitle === 'object' && pos.jobTitle ? pos.jobTitle.title : '';
                  if (!title) return null;
                  return (
                      <div key={i} className="mb-3">
                          <span className="font-meta text-accent font-bold uppercase tracking-[0.1em] text-[11px] block mb-0.5 transition-colors">
                              {title}
                          </span>
                          <span className="text-text-muted text-[11px] block uppercase tracking-tight transition-colors">
                              {new Date(pos.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} 
                              {' - '}
                              {pos.endDate ? new Date(pos.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Present'}
                          </span>
                      </div>
                  );
              })}
          </div>
        </div>

        {/* Right Column: Bio & Articles */}
        <div className="w-full md:w-2/3">
          {/* Biography Section */}
          <section className="mb-12">
            <h2 className="font-meta text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-6 border-b border-rule pb-2 transition-colors">Biography</h2>
            {bio && bio.root && bio.root.children ? (
              <div className="prose prose-sm max-w-none font-sans text-text-muted leading-relaxed transition-colors">
                 <SerializeLexical nodes={bio.root.children} />
              </div>
            ) : (
                <p className="text-text-muted italic text-sm transition-colors">No biography available.</p>
            )}
          </section>

          {/* Articles Section */}
          {articles.length > 0 && (
            <section>
              <h2 className="font-meta text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-6 border-b border-rule pb-2 transition-colors">Recent Articles</h2>
              <div className="space-y-6">
                {displayedArticles.map((article) => (
                  <div key={article.id} className="group">
                    <Link href={`/${article.section}/${new Date(article.publishedDate!).getFullYear()}/${(new Date(article.publishedDate!).getMonth() + 1).toString().padStart(2, '0')}/${article.slug}`} className="block">
                      <h3 className="text-lg font-bold group-hover:text-accent transition-colors leading-tight mb-1">
                        {article.title}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-text-muted transition-colors">
                      <span className="font-meta font-bold text-accent">{article.section}</span>
                      <span>•</span>
                      <span>{new Date(article.publishedDate!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                ))}
              </div>
              {hasMoreArticles && !showAllArticles && (
                <button 
                  onClick={() => setShowAllArticles(true)}
                  className="font-meta mt-8 text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted hover:text-text-main transition-colors py-2.5 px-0"
                >
                  See More Articles
                </button>
              )}
            </section>
          )}
        </div>
      </div>

      {/* Full Width Photos Section (Below everything else) */}
      {photos.length > 0 && (
        <section className="w-full">
          <h2 className="font-meta text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-8 border-b border-rule pb-2 transition-colors">Photo Portfolio</h2>
          <div className="columns-2 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            {photos.map((photo, index) => {
              const articleUrl = photoToArticleMap[photo.id];
              // Alternating aspect ratios for a fun masonry feel if dimensions aren't perfect
              const aspectRatios = ['aspect-[4/3]', 'aspect-[3/4]', 'aspect-square', 'aspect-[16/9]'];
              const aspectRatioClass = (photo.width && photo.height) ? '' : aspectRatios[index % aspectRatios.length];
              
              const content = (
                <div className={`relative bg-gray-100 dark:bg-zinc-800 overflow-hidden group mb-4 transition-colors ${aspectRatioClass}`}>
                  {photo.url && (
                    <Image
                      src={photo.url}
                      alt={photo.alt || 'Photo credit'}
                      width={photo.width || 800}
                      height={photo.height || 600}
                      className={`w-full ${photo.width && photo.height ? 'h-auto' : 'h-full'} object-cover`}
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  )}
                </div>
              );

              return articleUrl ? (
                <Link key={photo.id} href={articleUrl} className="block break-inside-avoid">
                  {content}
                </Link>
              ) : (
                <div key={photo.id} className="break-inside-avoid">{content}</div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
