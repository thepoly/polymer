import React, { cache } from 'react';
import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { getArticleLayout, ArticleLayouts } from '@/components/Article/Layouts';
import { LexicalNode } from '@/components/Article/RichTextParser';
import ArticleScrollBar from '@/components/ArticleScrollBar';
import { getArticleUrl } from '@/utils/getArticleUrl';
import type { Metadata } from 'next';
import type { Article, Media, User } from '@/payload-types';

export const revalidate = 60;

type Args = {
  params: Promise<{
    section: string;
    year: string;
    month: string;
    slug: string;
  }>;
};

type PublicArticleUser = {
  id: number;
  firstName: string;
  lastName: string;
  slug?: string | null;
  headshot?: { url?: string | null } | null;
  positions?:
    | {
        startDate: string;
        endDate?: string | null;
        jobTitle?: {
          title?: string | null;
        } | null;
      }[]
    | null;
};

type PublicArticleMedia = {
  id: number;
  url?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  photographer?: PublicArticleUser | null;
};

type PublicArticle = Omit<Article, 'authors' | 'featuredImage'> & {
  authors: PublicArticleUser[];
  featuredImage?: PublicArticleMedia | null;
  imageCaption?: string | null;
  opinionType?: Article['opinionType'];
};

const toPublicArticleUser = (user: User): PublicArticleUser => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  slug: user.slug,
  headshot: typeof user.headshot === 'object' && user.headshot ? { url: user.headshot.url } : null,
  positions: user.positions?.map((position) => ({
    startDate: position.startDate,
    endDate: position.endDate,
    jobTitle: typeof position.jobTitle === 'object' && position.jobTitle ? { title: position.jobTitle.title } : null,
  })) || null,
});

const toPublicArticleMedia = (media: Article['featuredImage']): PublicArticleMedia | null => {
  if (!media || typeof media === 'number') return null;

  const photographer = media.photographer && typeof media.photographer === 'object'
    ? toPublicArticleUser(media.photographer as User)
    : null;

  return {
    id: media.id,
    url: media.url,
    alt: media.alt,
    width: media.width,
    height: media.height,
    photographer,
  };
};

const toPublicArticle = (article: Article): Article => ({
  ...article,
  authors: (article.authors || [])
    .filter((author): author is User => typeof author !== 'number')
    .map(toPublicArticleUser),
  featuredImage: toPublicArticleMedia(article.featuredImage),
  imageCaption: (article as unknown as Record<string, unknown>).imageCaption as string | null | undefined,
  opinionType: (article as unknown as Record<string, unknown>).opinionType as Article['opinionType'],
} as Article);

const getArticle = cache(async (slug: string, section?: string): Promise<Article | undefined> => {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: 'articles',
    where: {
      and: [
        { slug: { equals: slug } },
        { _status: { equals: 'published' } },
        ...(section ? [{ section: { equals: section as Article['section'] } }] : []),
      ],
    },
    limit: 1,
    depth: 2,
    select: {
      title: true,
      kicker: true,
      subdeck: true,
      section: true,
      opinionType: true,
      authors: true,
      publishedDate: true,
      featuredImage: true,
      imageCaption: true,
      content: true,
      slug: true,
      updatedAt: true,
      createdAt: true,
    },
  });
  const article = result.docs[0] as Article | undefined;
  return article ? toPublicArticle(article) : undefined;
});

function matchesRequestedDate(article: Article, year: string, month: string): boolean {
  const dateValue = article.publishedDate || article.createdAt;
  if (!dateValue) return false;
  const date = new Date(dateValue);

  return date.getFullYear().toString() === year && String(date.getMonth() + 1).padStart(2, '0') === month;
}

function safeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug, section, year, month } = await params;
  const article = await getArticle(slug, section);

  if (!article || !matchesRequestedDate(article, year, month)) return {};

  const authors = (article.authors || [])
    .map((a) => (typeof a === 'number' ? null : `${a.firstName} ${a.lastName}`))
    .filter(Boolean) as string[];

  const image = article.featuredImage as Media | null;
  const imageUrl = image?.url || undefined;
  const canonicalPath = `/${section}/${year}/${month}/${slug}`;

  const sectionName = section.charAt(0).toUpperCase() + section.slice(1);

  return {
    title: `${sectionName} | ${article.title}`,
    description: article.subdeck || `Read "${article.title}" in The Polytechnic's ${section} section.`,
    authors: authors.map((name) => ({ name })),
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: article.title,
      description: article.subdeck || undefined,
      type: 'article',
      url: canonicalPath,
      publishedTime: article.publishedDate || undefined,
      modifiedTime: article.updatedAt,
      section: section.charAt(0).toUpperCase() + section.slice(1),
      authors,
      ...(imageUrl && {
        images: [{ url: imageUrl, alt: image?.alt || article.title }],
      }),
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title: article.title,
      description: article.subdeck || undefined,
      ...(imageUrl && { images: [imageUrl] }),
    },
  };
}

export default async function ArticlePage({ params }: Args) {
  const { slug, section, year, month } = await params;
  const article = await getArticle(slug, section);

  if (!article || !matchesRequestedDate(article, year, month)) {
    notFound();
  }

  // Determine the layout
  const layoutType = getArticleLayout(article);
  const LayoutComponent = ArticleLayouts[layoutType];

  // Prepare content (clean up flags if necessary)
  let cleanContent = article.content;

  if (layoutType === 'photofeature') {
      const firstNode = article.content?.root?.children?.[0] as unknown as LexicalNode;
      if (article.content && firstNode?.type === 'paragraph' && firstNode.children && firstNode.children.length > 0) {
         const firstTextNode = firstNode.children[0];
         if (firstTextNode.type === 'text' && firstTextNode.text?.trim() === '#photofeature#') {
            cleanContent = {
                ...article.content,
                root: {
                    ...article.content.root,
                    children: (article.content.root.children as unknown as LexicalNode[]).slice(1)
                }
            };
         }
      }
  }

  const authors = (article.authors || []).filter((author): author is User => typeof author !== 'number');
  const image = article.featuredImage as Media | null;
  const articleUrl = getArticleUrl(article);

  const sectionTitle = article.section.charAt(0).toUpperCase() + article.section.slice(1);

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: '/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: sectionTitle,
        item: `/${article.section}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: article.title,
      },
    ],
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    ...(article.subdeck && { description: article.subdeck }),
    ...(image?.url && {
      image: [image.url],
    }),
    datePublished: article.publishedDate || article.createdAt,
    dateModified: article.updatedAt,
    author: authors.map((a) => ({
      '@type': 'Person',
      name: `${a.firstName} ${a.lastName}`,
      ...(a.slug && { url: `/staff/${a.slug}` }),
    })),
    publisher: {
      '@type': 'Organization',
      name: 'The Polytechnic',
      url: '/',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
    articleSection: article.section.charAt(0).toUpperCase() + article.section.slice(1),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <ArticleScrollBar title={article.title} section={article.section} />
      <LayoutComponent article={article as unknown as Article} content={cleanContent} />
    </>
  );
}

export async function generateStaticParams() {
  const payload = await getPayload({ config });
  const articles = await payload.find({
    collection: 'articles',
    where: {
      _status: { equals: 'published' },
    },
    limit: 1000,
    select: {
      slug: true,
      section: true,
      publishedDate: true,
      createdAt: true,
    },
  });

  return articles.docs
    .filter((doc) => doc.slug && doc.section)
    .map((doc) => {
      const dateStr = doc.publishedDate || doc.createdAt;
      const date = new Date(dateStr);
      const year = date.getFullYear().toString();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      
      return {
        section: doc.section,
        year,
        month,
        slug: doc.slug as string,
      };
    });
}
