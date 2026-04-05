import { Media } from '@/payload-types';
import { Article as ComponentArticle } from '@/components/FrontPage/types';
import React from 'react';

type PublicAuthorLike = {
  firstName: string;
  lastName: string;
};

type PublicMediaLike = Pick<Media, 'url' | 'alt'> & {
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

type FormatArticleInput = {
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

  const staffNames = (article.authors || [])
    .map((author) => {
      if (typeof author === 'number') return '';
      return `${author.firstName} ${author.lastName}`;
    })
    .filter(Boolean);

  const writeInNames = (article.writeInAuthors || [])
    .map((a) => a.name)
    .filter(Boolean);

  const authors = [...staffNames, ...writeInNames].join(' AND ');

  const date = article.publishedDate ? new Date(article.publishedDate) : null;

  let dateString: string | null = null;
  if (date) {
    const now = new Date().getTime();
    const diffMs = now - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (absoluteDate) {
      dateString = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } else if (diffDays >= 7) {
      // Hide date if older than 7 days
      dateString = null;
    } else if (diffMins < 60) {
      dateString = `${diffMins} MINUTE${diffMins !== 1 ? 'S' : ''} AGO`;
    } else if (diffHours < 24) {
      dateString = `${diffHours} HOUR${diffHours !== 1 ? 'S' : ''} AGO`;
    } else {
      dateString = `${diffDays} DAY${diffDays !== 1 ? 'S' : ''} AGO`;
    }
  }

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
    author: authors ? authors.toUpperCase() : 'THE POLY',
    date: dateString,
    image: featuredImage?.sizes?.card?.url || featuredImage?.url || null,
    imageFull: featuredImage?.url || null,
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
  };
};
