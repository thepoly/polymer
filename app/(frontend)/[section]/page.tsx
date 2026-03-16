import React from 'react';
import { getPayload } from 'payload';
import config from '@/payload.config';
import Header from '@/components/Header';
import { HorizontalSection } from '@/components/FrontPage/HorizontalSection';
import Footer from '@/components/Footer';
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
  const contentSections = ['news', 'sports', 'features', 'opinion'];
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
        <h1 className="font-meta text-4xl font-bold mb-4 uppercase tracking-[0.08em] text-accent">
          {section}
        </h1>
        <p className="text-text-muted font-copy">{message}</p>
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

  const sectionTitle = section.charAt(0).toUpperCase() + section.slice(1);

  return (
    <main className={`min-h-screen bg-bg-main section-${section} transition-colors duration-300`}>
      <Header />
      <HorizontalSection title={sectionTitle} articles={formattedArticles} />
      <Footer />
    </main>
  );
}
