"use client";
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import posthog from 'posthog-js';
import { LexicalNode } from '@/components/Article/RichTextParser';
import type { StaffPortfolioPhoto } from '@/lib/staffProfile';

export interface StaffProfileUser {
  id: number;
  firstName: string;
  lastName: string;
  slug?: string | null;
  headshot?: {
    url?: string | null;
  } | null;
  bio?: {
    root?: {
      children?: LexicalNode[];
    };
  } | null;
  positions?:
    | {
        jobTitle?: {
          title?: string | null;
        } | null;
        startDate: string;
        endDate?: string | null;
      }[]
    | null;
}

export interface StaffProfileArticle {
  id: number;
  slug?: string | null;
  title: string;
  section: string;
  publishedDate?: string | null;
}

export interface StaffProfilePhoto {
  id: number;
  url?: string | null;
  alt?: string | null;
  width?: number | null;
  thumbnailURL?: string | null;
  height?: number | null;
  sizes?: {
    card?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
    };
    gallery?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
    };
  } | null;
}

interface StaffProfileProps {
  user: StaffProfileUser;
  articles?: StaffProfileArticle[];
  photos?: StaffProfilePhoto[];
  photoToArticleMap?: Record<number, string>;
  initialPortfolioHasMore?: boolean;
  initialPortfolioNextPage?: number | null;
}

const INITIAL_ARTICLE_COUNT = 8;

type PortfolioPhoto = Required<Pick<StaffProfilePhoto, 'id'>> & StaffProfilePhoto;

const distributePortfolioPhotos = (images: PortfolioPhoto[], colCount: number): PortfolioPhoto[][] => {
  const columns: PortfolioPhoto[][] = Array.from({ length: colCount }, () => []);
  const heights = new Array(colCount).fill(0);

  for (const image of images) {
    const aspect = (image.height || 800) / (image.width || 1200);
    const shortest = heights.indexOf(Math.min(...heights));
    columns[shortest].push(image);
    heights[shortest] += aspect;
  }

  return columns;
};

const lexicalToPlainText = (nodes: LexicalNode[] | undefined): string => {
  if (!nodes || nodes.length === 0) return '';

  return nodes
    .map((node) => {
      if (node.type === 'text') {
        return node.text || '';
      }

      const childrenText = lexicalToPlainText(node.children);

      if (node.type === 'linebreak') return '\n';
      if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'quote') {
        return `${childrenText}\n`;
      }
      if (node.type === 'listitem') {
        return `${childrenText}\n`;
      }
      if (node.type === 'link') {
        return childrenText;
      }

      return childrenText;
    })
    .join('')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export function StaffProfile({
  user,
  articles = [],
  photos = [],
  photoToArticleMap = {},
  initialPortfolioHasMore = false,
  initialPortfolioNextPage = null,
}: StaffProfileProps) {
  const headshot = user.headshot || null;
  const bio = user.bio;
  const [showAllArticles, setShowAllArticles] = useState(false);
  const [loadedPhotos, setLoadedPhotos] = useState<StaffProfilePhoto[]>(photos);
  const [loadedPhotoToArticleMap, setLoadedPhotoToArticleMap] = useState<Record<number, string>>(photoToArticleMap);
  const [hasMorePhotos, setHasMorePhotos] = useState(initialPortfolioHasMore);
  const [nextPhotoPage, setNextPhotoPage] = useState<number | null>(initialPortfolioNextPage);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const portfolioSentinelRef = useRef<HTMLDivElement | null>(null);

  const displayedArticles = showAllArticles ? articles : articles.slice(0, INITIAL_ARTICLE_COUNT);
  const hasMoreArticles = articles.length > INITIAL_ARTICLE_COUNT;
  const populatedPhotos = loadedPhotos.filter((photo): photo is PortfolioPhoto =>
    Boolean(photo.thumbnailURL || photo.sizes?.card?.url || photo.sizes?.gallery?.url || photo.url),
  );
  const portfolioColumnCount = Math.min(populatedPhotos.length, 3);
  const portfolioGridClassName = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3' }[portfolioColumnCount];
  const portfolioColumns = portfolioColumnCount > 0
    ? distributePortfolioPhotos(populatedPhotos, portfolioColumnCount)
    : [];

  useEffect(() => {
    setLoadedPhotos(photos);
  }, [photos]);

  useEffect(() => {
    setLoadedPhotoToArticleMap(photoToArticleMap);
  }, [photoToArticleMap]);

  useEffect(() => {
    setHasMorePhotos(initialPortfolioHasMore);
  }, [initialPortfolioHasMore]);

  useEffect(() => {
    setNextPhotoPage(initialPortfolioNextPage);
  }, [initialPortfolioNextPage]);

  useEffect(() => {
    if (!hasMorePhotos || !nextPhotoPage || isLoadingPhotos || !portfolioSentinelRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (!entry?.isIntersecting) return;

      setIsLoadingPhotos(true);

      void fetch(`/api/staff/${user.slug || user.id}/portfolio?page=${nextPhotoPage}`, {
        cache: 'no-store',
      })
        .then(async (response) => {
          if (!response.ok) throw new Error(`Failed to load photo portfolio page ${nextPhotoPage}`);
          return response.json() as Promise<{
            photos: StaffPortfolioPhoto[];
            photoToArticleMap: Record<string, string>;
            hasMore: boolean;
            nextPage: number | null;
          }>;
        })
        .then((data) => {
          setLoadedPhotos((current) => [...current, ...data.photos]);
          setLoadedPhotoToArticleMap((current) => ({
            ...current,
            ...Object.fromEntries(
              Object.entries(data.photoToArticleMap).map(([photoId, href]) => [Number(photoId), href]),
            ),
          }));
          setHasMorePhotos(data.hasMore);
          setNextPhotoPage(data.nextPage);
          posthog.capture('staff_portfolio_batch_loaded', {
            batch_number: nextPhotoPage,
            batch_size: data.photos.length,
            has_more: data.hasMore,
            next_batch_number: data.nextPage,
            staff_id: user.id,
            staff_slug: user.slug || null,
          });
        })
        .catch(() => {
          setHasMorePhotos(false);
        })
        .finally(() => {
          setIsLoadingPhotos(false);
        });
    }, {
      rootMargin: '600px 0px',
    });

    observer.observe(portfolioSentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMorePhotos, isLoadingPhotos, nextPhotoPage, user.id, user.slug]);

  return (
    <div className="flex flex-col gap-16 text-text-main transition-colors duration-300">
      <div className="flex flex-col md:flex-row gap-12 items-start">
        {/* Left Column: Photo & Basic Info */}
        <div className="w-full md:w-[28%] flex-shrink-0">
          <div className="relative w-full max-w-[320px] mx-auto md:mx-0 aspect-[4/5] mb-4 md:mb-6 rounded-sm overflow-hidden bg-gray-100 dark:bg-zinc-800 shadow-sm transition-colors">
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
              <h1 className="font-meta text-3xl font-semibold mb-3 tracking-tight">
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
            {bio && bio.root && bio.root.children ? (
              <p className="font-meta text-[17px] md:text-[18px] !text-text-main leading-relaxed transition-colors">
                <span>
                  {user.firstName}
                </span>
                {' '}
                {lexicalToPlainText(bio.root.children)}
              </p>
            ) : (
                <p className="text-text-muted italic text-sm transition-colors">No biography available.</p>
            )}
          </section>

          {/* Articles Section */}
          {articles.length > 0 && (
            <section>
              <h2 className="font-meta text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-6 border-b border-rule pb-2 transition-colors">Recent Articles</h2>
              <div className="space-y-6">
                {displayedArticles.map((article) => {
                  const publishedDate = new Date(article.publishedDate!);
                  const year = publishedDate.getFullYear();
                  const month = (publishedDate.getMonth() + 1).toString().padStart(2, '0');
                  const headlineClassName = `font-copy font-bold leading-[1.12] tracking-[-0.01em] text-text-main transition-colors group-hover:text-accent mb-1 [overflow-wrap:anywhere] break-words ${article.section === "opinion" ? "font-light" : ""} ${(article.section === "news" || article.section === "features") ? "text-[23px] md:text-[25px]" : "text-[22px] md:text-[24px]"} ${article.section === "sports" ? "font-normal tracking-[0.015em]" : ""} ${article.section === "features" ? "font-light" : ""}`;

                  return (
                    <div key={article.id} className="group">
                      <Link href={`/${article.section}/${year}/${month}/${article.slug}`} className="block">
                        <h3 className={headlineClassName}>
                          {article.title}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-text-muted transition-colors">
                        <span className="font-meta font-bold text-accent">{article.section}</span>
                        <span>•</span>
                        <span>{publishedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                  );
                })}
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
      {loadedPhotos.length > 0 && (
        <section className="w-full">
          <h2 className="font-meta text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-8 border-b border-rule pb-2 transition-colors">Photo Portfolio</h2>
          {portfolioColumns.length > 0 ? (
            <div className={`grid grid-cols-1 gap-2 md:gap-3 ${portfolioGridClassName}`}>
              {portfolioColumns.map((column, columnIndex) => (
                <div key={columnIndex} className="flex flex-col gap-2 md:gap-3">
                  {column.map((photo) => {
                    const href = loadedPhotoToArticleMap[photo.id];
                    const imageNode = (
                      <Image
                        src={photo.thumbnailURL || photo.sizes?.card?.url || photo.sizes?.gallery?.url || photo.url!}
                        alt={photo.alt || 'Photo credit'}
                        width={photo.sizes?.card?.width || photo.sizes?.gallery?.width || photo.width || 1200}
                        height={photo.sizes?.card?.height || photo.sizes?.gallery?.height || photo.height || 800}
                        sizes={`(max-width: 768px) 100vw, ${Math.round(100 / portfolioColumnCount)}vw`}
                        quality={60}
                        loading="lazy"
                        className="w-full h-auto"
                      />
                    );

                    if (!href) {
                      return <div key={photo.id}>{imageNode}</div>;
                    }

                    return (
                      <Link key={photo.id} href={href} className="block">
                        {imageNode}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : null}
          {(hasMorePhotos || isLoadingPhotos) && <div ref={portfolioSentinelRef} className="h-8 w-full" aria-hidden="true" />}
        </section>
      )}
    </div>
  );
}
