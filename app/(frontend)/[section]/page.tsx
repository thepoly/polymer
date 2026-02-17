import React from 'react';
import { getPayload } from 'payload';
import config from '@/payload.config';
import Header from '@/components/Header';
import FrontPage from '@/components/FrontPage';
import { Article as PayloadArticle, Media } from '@/payload-types';
import { Article as ComponentArticle } from '@/components/FrontPage/types';
import { getSectionTheme } from '@/app/section-theme';

export const revalidate = 60;

const formatArticle = (article: PayloadArticle | number | null | undefined): ComponentArticle | null => {
  if (!article || typeof article === 'number') return null;

  const authors = article.authors
    ?.map((author) => {
      if (typeof author === 'number') return '';
      return `${author.firstName} ${author.lastName}`;
    })
    .filter(Boolean)
    .join(' AND ');

  const date = article.publishedDate ? new Date(article.publishedDate) : null;

  let dateString: string | null = null;
  if (date) {
    const now = new Date().getTime();
    const diffMs = now - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      dateString = `${diffMins} MINUTE${diffMins !== 1 ? 'S' : ''} AGO`;
    } else if (diffHours < 24) {
      dateString = `${diffHours} HOUR${diffHours !== 1 ? 'S' : ''} AGO`;
    } else if (diffDays < 7) {
      dateString = `${diffDays} DAY${diffDays !== 1 ? 'S' : ''} AGO`;
    }
  }

  return {
    id: article.id,
    slug: article.slug || '#',
    title: article.title,
    excerpt: article.subdeck || '',
    author: authors || null,
    date: dateString,
    image: (article.featuredImage as Media)?.url || null,
    section: article.section,
    publishedDate: article.publishedDate,
    createdAt: article.createdAt,
  };
};

type Args = {
  params: Promise<{
    section: string;
  }>;
};

export default async function SectionPage({ params }: Args) {
  const { section } = await params;
  
  // Validate section exists in our theme map or valid sections list
  const validSections = ['news', 'sports', 'features', 'editorial', 'opinion'];
  if (!validSections.includes(section)) {
     // Optional: You might want to allow other sections or just 404
     // notFound(); 
  }

  const theme = getSectionTheme(section);
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
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
            <h1 className={`text-4xl font-serif font-bold mb-4 capitalize ${theme.accentColor}`}>
                {section}
            </h1>
            <p className="text-gray-500 font-serif">No articles found in this section yet.</p>
        </div>
      </main>
    );
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
        <h1 className={`text-5xl font-serif font-bold capitalize ${theme.accentColor} border-b-4 border-black inline-block pr-6 mb-2`}>
            {section}
        </h1>
      </div>
  );

  // SECTION SPECIFIC RENDERERS
  // Currently they all share the same layout but are separated for future customization.

  if (section === 'news') {
      return (
        <main className={`min-h-screen bg-white section-${section}`}>
          <Header />
          <SectionHeaderBlock />
          <FrontPage {...commonProps} />
        </main>
      );
  }

  if (section === 'sports') {
      return (
        <main className={`min-h-screen bg-white section-${section}`}>
          <Header />
          <SectionHeaderBlock />
          <FrontPage {...commonProps} />
        </main>
      );
  }

  if (section === 'features') {
      return (
        <main className={`min-h-screen bg-white section-${section}`}>
          <Header />
          <SectionHeaderBlock />
          <FrontPage {...commonProps} />
        </main>
      );
  }

  if (section === 'editorial') {
      return (
        <main className={`min-h-screen bg-white section-${section}`}>
          <Header />
          <SectionHeaderBlock />
          <FrontPage {...commonProps} />
        </main>
      );
  }

  if (section === 'opinion') {
      return (
        <main className={`min-h-screen bg-white section-${section}`}>
          <Header />
          <SectionHeaderBlock />
          <FrontPage {...commonProps} />
        </main>
      );
  }

  // Default Fallback
  return (
    <main className={`min-h-screen bg-white section-${section}`}>
      <Header />
      <SectionHeaderBlock />
      <FrontPage {...commonProps} />
    </main>
  );
}