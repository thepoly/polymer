import React, { cache } from 'react';
import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { getArticleLayout, ArticleLayouts } from '@/components/Article/Layouts';
import { LexicalNode } from '@/components/Article/RichTextParser';
import OpinionHeader from '@/components/Opinion/OpinionHeader';
import { OpinionArticleHeader } from '@/components/Opinion/OpinionArticleHeader';
import OpinionScrollBar from '@/components/Opinion/OpinionScrollBar';
import { OpinionArticleFooter } from '@/components/Opinion/OpinionArticleFooter';
import { ArticleContent, ArticleFooter } from '@/components/Article';
import { deriveSlug } from '@/utils/deriveSlug';
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

const getArticle = cache(async (slug: string) => {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: 'articles',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
  });
  return result.docs[0] as Article | undefined;
});

function safeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
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
  const { section, slug } = await params;
  const payload = await getPayload({ config });

  let article = await getArticle(slug);

  // Fallback: try matching by derived slug (for articles without saved slugs)
  if (!article) {
    const allInSection = await payload.find({
      collection: 'articles',
      where: { section: { equals: section } },
      limit: 200,
    });

    const match = allInSection.docs.find((doc) => deriveSlug(doc.title) === slug);

    if (match) {
      await payload.update({
        collection: 'articles',
        id: match.id,
        data: { slug },
      });
      article = match as Article;
    }
  }

  if (!article) {
    notFound();
  }

  const layoutType = getArticleLayout(article);
  const LayoutComponent = ArticleLayouts[layoutType];

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
            children: (article.content.root.children as unknown as LexicalNode[]).slice(1),
          },
        };
      }
    }
  }

  // Opinion articles get their own custom layout
  if (section === 'opinion' && layoutType !== 'photofeature') {
    return (
      <main className="min-h-screen bg-white pb-20 pt-[58px] font-[family-name:var(--font-raleway)]">
        <OpinionHeader />
        <OpinionScrollBar title={article.title} />
        <article className="container mx-auto px-4 md:px-6 mt-8 md:mt-12">
          <OpinionArticleHeader article={article} />
          <div className="max-w-[600px] mx-auto [--foreground-muted:#000000] [--color-text-muted:#000000]">
            <ArticleContent content={article.content} />
            <ArticleFooter />
          </div>
        </article>
        <OpinionArticleFooter currentArticleId={article.id} />
      </main>
    );
  }

  const authors = (article.authors || [])
    .map((a) => (typeof a === 'number' ? null : a))
    .filter(Boolean) as User[];
  const image = article.featuredImage as Media | null;
  const articleUrl = getArticleUrl(article);

  const sectionTitle = article.section.charAt(0).toUpperCase() + article.section.slice(1);

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: '/' },
      { '@type': 'ListItem', position: 2, name: sectionTitle, item: `/${article.section}` },
      { '@type': 'ListItem', position: 3, name: article.title },
    ],
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    ...(article.subdeck && { description: article.subdeck }),
    ...(image?.url && { image: [image.url] }),
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
