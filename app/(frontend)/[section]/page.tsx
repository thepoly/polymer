import React from 'react';
import { getPayload } from 'payload';
import config from '@/payload.config';
import Header from '@/components/Header';
import FrontPage from '@/components/FrontPage';
import { Article as PayloadArticle } from '@/payload-types';
import { Article as ComponentArticle } from '@/components/FrontPage/types';
import { formatArticle } from '@/utils/formatArticle';
import { notFound } from 'next/navigation';

export const revalidate = 60;

type Args = {
  params: Promise<{
    section: string;
  }>;
};

export default async function SectionPage({ params }: Args) {
  const { section } = await params;
  const contentSections = ['news', 'sports', 'features', 'editorial', 'opinion'];
  const placeholderSections = ['about', 'archives', 'checkmate', 'contact', 'submit'];
  const isContentSection = contentSections.includes(section);
  const isPlaceholderSection = placeholderSections.includes(section);

  if (!isContentSection && !isPlaceholderSection) {
    notFound();
  }

  const renderPlaceholder = (message: string) => (
    <main className="min-h-screen bg-bg-main transition-colors duration-300">
      <Header />
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl font-serif font-bold mb-4 capitalize text-accent">
          {section}
        </h1>
        <p className="text-text-muted font-serif">{message}</p>
      </div>
    </main>
  );

  if (isPlaceholderSection) {
    return renderPlaceholder('This section does not have published articles yet.');
  }

  const payload = await getPayload({ config });

  // Fetch articles for this section
  const articlesResponse = await payload.find({
    collection: 'articles',
    where: {
      section: {
        equals: section as PayloadArticle['section'], 
      },
      _status: {
        equals: 'published',
      }
    },
    sort: '-publishedDate',
    limit: 10, 
    depth: 2,
  });

  const articles = articlesResponse.docs;

  // If no articles, show a placeholder
  if (articles.length === 0) {
    return renderPlaceholder('No articles found in this section yet.');
  }

  // Map to ComponentArticle
  const formattedArticles = articles.map(formatArticle).filter(Boolean) as ComponentArticle[];

  // Distribute articles into the FrontPage slots
  const lead = formattedArticles[0];
  const list = formattedArticles.slice(1, 4); 
  const special = formattedArticles[4] || formattedArticles[0]; 

  let sidebarArticles: ComponentArticle[] = [];

  if (section === 'opinion') {
     sidebarArticles = formattedArticles.slice(5, 9);
  } else {
     const opinionResponse = await payload.find({
        collection: 'articles',
        where: {
            section: { equals: 'opinion' }
        },
        sort: '-publishedDate',
        limit: 4,
     });
     sidebarArticles = opinionResponse.docs.map(formatArticle).filter(Boolean) as ComponentArticle[];
  }

  const topStories = {
    lead: lead!,
    list: list,
  };

  const commonProps = {
      topStories,
      studentSenate: special!,
      opinion: sidebarArticles
  };

  const SectionHeaderBlock = () => (
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 pt-8 pb-4">
        <h1 className={`text-5xl font-serif font-bold capitalize text-accent border-b-4 border-border-main inline-block pr-6 mb-2 transition-colors`}>
            {section}
        </h1>
      </div>
  );

  return (
    <main className={`min-h-screen bg-bg-main section-${section} transition-colors duration-300`}>
      <Header />
      <SectionHeaderBlock />
      <FrontPage {...commonProps} />
    </main>
  );
}
