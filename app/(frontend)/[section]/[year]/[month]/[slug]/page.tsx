import React, { cache } from 'react';
import { notFound } from 'next/navigation';
import { extractTextFromLexical, renderLexicalHeadline } from '@/utils/formatArticle';
import { headers } from 'next/headers';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { getArticleLayout, ArticleLayouts } from '@/components/Article/Layouts';
import { LexicalNode } from '@/components/Article/RichTextParser';
import ArticleScrollBar from '@/components/ArticleScrollBar';
import ArticleAnalytics from '@/components/analytics/ArticleAnalytics';
import { InlineEditor } from '@/components/Article/InlineEditor';
import { calculateWordCount } from '@/utils/wordCount';
import { getArticleUrl } from '@/utils/getArticleUrl';
import { fillSeoTemplate, getSeo } from '@/lib/getSeo';
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
  bio?: {
    root?: {
      children?: LexicalNode[];
    };
  } | null;
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
  title?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  photographer?: PublicArticleUser | null;
  writeInPhotographer?: string | null;
};

const toPublicArticleUser = (user: User): PublicArticleUser => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  slug: user.slug,
  headshot: typeof user.headshot === 'object' && user.headshot ? { url: user.headshot.url } : null,
  bio: user.bio
    ? {
        root: {
          children: user.bio.root?.children as LexicalNode[] | undefined,
        },
      }
    : null,
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
    title: (media as unknown as Record<string, unknown>).title as string | null | undefined,
    alt: media.alt,
    width: media.width,
    height: media.height,
    photographer,
    writeInPhotographer: (media as unknown as Record<string, unknown>).writeInPhotographer as string | null | undefined,
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
      writeInAuthors: true,
      publishedDate: true,
      featuredImage: true,
      imageCaption: true,
      content: true,
      slug: true,
      updatedAt: true,
      createdAt: true,
      isFollytechnic: true,
      isPhotofeature: true,
      gradientOpacity: true,
    },
  });
  const article = result.docs[0] as Article | undefined;
  return article ? toPublicArticle(article) : undefined;
});

function matchesRequestedDate(article: Article, year: string, month: string): boolean {
  const dateValue = article.publishedDate || article.createdAt;
  if (!dateValue) return false;
  const date = new Date(dateValue);

  return date.getUTCFullYear().toString() === year && String(date.getUTCMonth() + 1).padStart(2, '0') === month;
}

const validSections = new Set(['news', 'sports', 'features', 'opinion']);

function safeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug, section, year, month } = await params;

  if (!validSections.has(section)) return {};

  const article = await getArticle(slug, section);

  if (!article || !matchesRequestedDate(article, year, month)) return {};

  const staffAuthorNames = (article.authors || [])
    .map((a) => (typeof a === 'number' ? null : `${a.firstName} ${a.lastName}`))
    .filter(Boolean) as string[];
  const writeInAuthorNames = (((article as unknown as Record<string, unknown>).writeInAuthors || []) as Array<{ name: string }>)
    .map((a) => a.name)
    .filter(Boolean);
  const authors = [...staffAuthorNames, ...writeInAuthorNames];

  const image = article.featuredImage as Media | null;
  const imageUrl = image?.url || undefined;
  const canonicalPath = `/${section}/${year}/${month}/${slug}`;

  const sectionName = section.charAt(0).toUpperCase() + section.slice(1);
  const seo = await getSeo();
  const description = article.subdeck || fillSeoTemplate(seo.templates.articleFallbackDescription, {
    title: extractTextFromLexical(article.title),
    section,
    sectionTitle: sectionName,
    siteName: seo.siteIdentity.siteName,
  });

  return {
    title: `${sectionName} | ${extractTextFromLexical(article.title)}`,
    description,
    authors: authors.map((name) => ({ name })),
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: typeof article.title === 'object' ? extractTextFromLexical(article.title) : article.title,
      description,
      type: 'article',
      url: canonicalPath,
      publishedTime: article.publishedDate || undefined,
      modifiedTime: article.updatedAt,
      section: section.charAt(0).toUpperCase() + section.slice(1),
      authors,
      ...(imageUrl && {
        images: [{ url: imageUrl, alt: image?.title || "" }],
      }),
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title: extractTextFromLexical(article.title),
      description,
      ...(imageUrl && { images: [imageUrl] }),
    },
  };
}

export default async function ArticlePage({ params }: Args) {
  const { slug, section, year, month } = await params;

  if (!validSections.has(section)) notFound();

  const article = await getArticle(slug, section);

  if (!article || !matchesRequestedDate(article, year, month)) {
    notFound();
  }

  // Determine the layout
  const layoutType = getArticleLayout(article);
  const LayoutComponent = ArticleLayouts[layoutType];

  const payload = await getPayload({ config });
  const { user: authUser } = await payload.auth({ headers: await headers() });
  const wordCount = calculateWordCount(article.content);
  const isStaff = !!authUser;
  const canEdit = authUser && Array.isArray(authUser.roles) && authUser.roles.some(role => ['admin', 'eic'].includes(role));

  const cleanContent = article.content;

  const staffAuthorsForJsonLd = (article.authors || []).filter((author): author is User => typeof author !== 'number');
  const writeInAuthorsForJsonLd = ((article as unknown as Record<string, unknown>).writeInAuthors || []) as Array<{ name: string }>;
  const image = article.featuredImage as Media | null;
  const articleUrl = getArticleUrl(article);
  const seo = await getSeo();

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
        name: extractTextFromLexical(article.title),
      },
    ],
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: extractTextFromLexical(article.title),
    ...(article.subdeck && { description: article.subdeck }),
    ...(image?.url && {
      image: [image.url],
    }),
    datePublished: article.publishedDate || article.createdAt,
    dateModified: article.updatedAt,
    author: [
      ...staffAuthorsForJsonLd.map((a) => ({
        '@type': 'Person',
        name: `${a.firstName} ${a.lastName}`,
        ...(a.slug && { url: `/staff/${a.slug}` }),
      })),
      ...writeInAuthorsForJsonLd.map((a) => ({
        '@type': 'Person',
        name: a.name,
      })),
    ],
    publisher: {
      '@type': 'Organization',
      name: seo.siteIdentity.siteName,
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
      <ArticleAnalytics
        articleId={article.id}
        pathname={`/${section}/${year}/${month}/${slug}`}
        publishedDate={article.publishedDate || article.createdAt}
        section={article.section}
        slug={article.slug}
        title={extractTextFromLexical(article.title)}
        wordCount={wordCount}
        isStaff={isStaff}
      />
      <ArticleScrollBar
        title={extractTextFromLexical(article.title)}
        richTitle={renderLexicalHeadline(article.title)}
        section={article.section}
      />
      <LayoutComponent article={article as unknown as Article} content={cleanContent} />
      {canEdit && <InlineEditor articleId={article.id} />}
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
      const year = date.getUTCFullYear().toString();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      
      return {
        section: doc.section,
        year,
        month,
        slug: doc.slug as string,
      };
    });
}
