import React from 'react';
import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { getArticleLayout, ArticleLayouts } from '@/components/Article/Layouts';
import { LexicalNode } from '@/components/Article/RichTextParser';

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
  const { slug } = await params;
  const payload = await getPayload({ config });

  const result = await payload.find({
    collection: 'articles',
    where: {
      slug: {
        equals: slug,
      },
    },
    limit: 1,
  });

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
