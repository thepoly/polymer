import React from 'react';
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

export const revalidate = 60;

type Args = {
  params: Promise<{
    section: string;
    year: string;
    month: string;
    slug: string;
  }>;
};

export default async function ArticlePage({ params }: Args) {
  const { section, slug } = await params;
  const payload = await getPayload({ config });

  // Try finding by slug first
  let result = await payload.find({
    collection: 'articles',
    where: {
      slug: {
        equals: slug,
      },
    },
    limit: 1,
  });

  // If no result, try matching by title (for articles without saved slugs)
  if (result.docs.length === 0) {
    const allInSection = await payload.find({
      collection: 'articles',
      where: {
        section: { equals: section },
      },
      limit: 200,
    });

    const match = allInSection.docs.find((doc) => {
      return deriveSlug(doc.title) === slug;
    });

    if (match) {
      // Save the slug so future lookups work directly
      await payload.update({
        collection: 'articles',
        id: match.id,
        data: { slug },
      });
      result = { ...result, docs: [match] };
    }
  }

  const article = result.docs[0];

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

  // Opinion articles get their own custom layout
  if (section === 'opinion' && layoutType !== 'photofeature') {
    return (
      <main className="min-h-screen bg-white pb-20 pt-[58px] font-[family-name:var(--font-raleway)]">
        <OpinionHeader />
        <OpinionScrollBar title={article.title} />
        <article className="container mx-auto px-4 md:px-6 mt-8 md:mt-12">
          <OpinionArticleHeader article={article} />
          <div className="max-w-[600px] mx-auto">
            <ArticleContent content={article.content} />
            <ArticleFooter />
          </div>
        </article>
        <OpinionArticleFooter />
      </main>
    );
  }

  return <LayoutComponent article={article} content={cleanContent} />;
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
