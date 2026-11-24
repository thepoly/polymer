import { getGames, type ArticleGameFields } from './getGames';
import { Media } from '@/payload-types';
import { Article as ComponentArticle } from '@/components/FrontPage/types';
import React from 'react';
import { focalObjectPosition } from './focalPoint';
import { joinNameText } from './joinNames';
import { getArticleAuthors } from './articleAuthors';
import { longDate, recentAge } from './articleDates';

type PublicAuthorLike = {
  id?: number | string;
  firstName: string;
  lastName: string;
  slug?: string | null;
};

type PublicMediaLike = Pick<Media, 'url' | 'alt'> & Partial<Pick<Media, 'focalX' | 'focalY' | 'width' | 'height'>> & {
  title?: string | null;
  photographer?: number | { id: number | string; firstName: string; lastName: string; slug?: string | null } | null;
  writeInPhotographer?: string | null;
  sizes?: {
    card?: {
      url?: string | null;
    } | null;
  } | null;
};

type WriteInAuthor = {
  name: string;
  photo?: unknown;
};

type FormatArticleInput = ArticleGameFields & {
  id: number | string;
  slug?: string | null;
  title: unknown;
  subdeck?: string | null;
  featuredImage?: number | PublicMediaLike | null;
  imageCaption?: string | null;
  section: string;
  kicker?: string | null;
  opinionType?: string | null;
  publishedDate?: string | null;
  createdAt?: string;
  authors?: Array<number | PublicAuthorLike> | null;
  writeInAuthors?: WriteInAuthor[] | null;
  _status?: string | null;
  isFollytechnic?: boolean | null;
  sport?: string | null;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export function extractTextFromLexical(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.root) return extractTextFromLexical(node.root);
  if (Array.isArray(node.children)) {
    return node.children.map(extractTextFromLexical).join('');
  }
  if (node.type === 'text') return node.text || '';
  return '';
}

export function renderLexicalHeadline(node: any): React.ReactNode {
  if (!node) return null;
  if (typeof node === 'string') return node;
  if (node.root) return renderLexicalHeadline(node.root);
  if (Array.isArray(node.children)) {
    return React.createElement(React.Fragment, null, ...node.children.map((child: any, i: number) => React.createElement(React.Fragment, { key: i }, renderLexicalHeadline(child))));
  }
  if (node.type === 'text') {
    let el: React.ReactNode = node.text;
    if (typeof node.format === 'number') {
      if (node.format & 1) el = React.createElement('strong', { key: 'b' }, el);
      if (node.format & 2) el = React.createElement('em', { key: 'i' }, el);
    }
    return el;
  }
  return null;
}

export const formatArticle = (
  article: FormatArticleInput | number | null | undefined,
  { absoluteDate = false }: { absoluteDate?: boolean } = {},
): ComponentArticle | null => {
  if (!article || typeof article === 'number') return null;
  if (article._status && article._status !== 'published') return null;
  if (!article.slug) return null;

  const authorList = getArticleAuthors(article);
  const authors = joinNameText(authorList.map((a) => a.name));

  // A week of "3 hours ago" on cards, then nothing (utils/articleDates.ts)
  const dateString = absoluteDate ? longDate(article.publishedDate) : recentAge(article.publishedDate);

  const featuredImage = article.featuredImage as PublicMediaLike | null;
  let imagePhotographer: string | null = null;
  let imagePhotographerId: string | number | null = null;

  if (featuredImage) {
    if (featuredImage.photographer && typeof featuredImage.photographer === 'object') {
      const p = featuredImage.photographer;
      imagePhotographer = `${p.firstName} ${p.lastName}`;
      imagePhotographerId = p.slug || p.id;
    } else if (featuredImage.writeInPhotographer) {
      imagePhotographer = featuredImage.writeInPhotographer;
    }
  }

  return {
    id: article.id,
    slug: article.slug || '#',
    title: extractTextFromLexical(article.title),
    richTitle: renderLexicalHeadline(article.title),
    excerpt: article.subdeck || '',
    // Plain text, "A, B and C". Bylines render authorLinks; this is for
    // places that only take a string
    author: authors || 'The Polytechnic',
    date: dateString,
    isoDate: article.publishedDate || article.createdAt || null,
    // The original upload: next/image resizes it per `sizes`, so cards stay
    // light while never starting from Payload's pre-compressed copies
    image: featuredImage?.url || null,
    imageFull: featuredImage?.url || null,
    imageFocus: featuredImage ? focalObjectPosition(featuredImage) : null,
    imageAspect:
      featuredImage?.width && featuredImage?.height ? featuredImage.width / featuredImage.height : null,
    imageCaption: article.imageCaption || null,
    imagePhotographer,
    imagePhotographerId,
    imageTitle: featuredImage?.title || null,
    section: article.section,
    kicker: article.kicker || null,
    opinionType: article.opinionType || null,
    publishedDate: article.publishedDate,
    createdAt: article.createdAt,
    isFollytechnic: article.isFollytechnic || false,
    // Each author with a staff profile link (write-ins have no profile)
    authorLinks: authorList.map((a) => ({ name: a.name, href: a.href })),
    sport: article.sport || null,
    games: getGames(article),
  };
};
