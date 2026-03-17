import React from 'react';
import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { getArticleLayout, ArticleLayouts } from '@/components/Article/Layouts';
import { LexicalNode } from '@/components/Article/RichTextParser';
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

async function getArticle(slug: string) {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: 'articles',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
  });
  return result.docs[0] as Article | undefined;
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug, section, year, month } = await params;
  const article = await getArticle(slug);

  if (!article) return {};

  const authors = (article.authors || [])
    .map((a) => (typeof a === 'number' ? null : `${a.firstName} ${a.lastName}`))
    .filter(Boolean) as string[];

  const image = article.featuredImage as Media | null;
  const imageUrl = image?.url || undefined;
  const canonicalPath = `/${section}/${year}/${month}/${slug}`;

  return {
    title: article.title,
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
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
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

  const authors = (article.authors || [])
    .map((a) => (typeof a === 'number' ? null : a))
    .filter(Boolean) as User[];
  const image = article.featuredImage as Media | null;
  const articleUrl = getArticleUrl(article);

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LayoutComponent article={article} content={cleanContent} />
    </>
  );
}

export async function generateStaticParams() {
  const payload = await getPayload({ config });
  const articles = await payload.find({
    collection: 'articles',
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