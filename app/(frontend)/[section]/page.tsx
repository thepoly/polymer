import React from 'react';
import { getPayload } from 'payload';
import config from '@/payload.config';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SectionPage from '@/components/SectionPage';
import OpinionSectionPage from '@/components/Opinion/OpinionSectionPage';
import { Article as PayloadArticle } from '@/payload-types';
import { Article as ComponentArticle } from '@/components/FrontPage/types';
import type { QuoteData } from '@/components/Opinion/InlineQuote';
import { formatArticle } from '@/utils/formatArticle';
import { getArticleUrl } from '@/utils/getArticleUrl';
import { opinionGroups } from '@/components/Opinion/opinionGroups';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const revalidate = 60;

type Args = {
  params: Promise<{
    section: string;
  }>;
};

const sectionDescriptions: Record<string, string> = {
  news: 'The latest news from Rensselaer Polytechnic Institute and the Troy community.',
  sports: 'Coverage of RPI varsity athletics, club sports, and intramurals.',
  features: 'In-depth features, profiles, and longform journalism from the RPI community.',
  opinion: 'Editorials, columns, and letters to the editor from The Polytechnic.',
};

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { section } = await params;
  const title = section.charAt(0).toUpperCase() + section.slice(1);
  const description = sectionDescriptions[section] || `${title} articles from The Polytechnic.`;

  return {
    title,
    description,
    alternates: { canonical: `/${section}` },
    openGraph: {
      title: `${title} — The Polytechnic`,
      description,
      type: 'website',
      url: `/${section}`,
    },
  };
}

export default async function SectionPageRoute({ params }: Args) {
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
        <h1 className="font-meta text-4xl font-bold mb-4 uppercase tracking-[0.08em] text-[#d6001c]">
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
  const isOpinion = section === 'opinion';

  const articlesResponse = await payload.find({
    collection: 'articles',
    where: {
      section: {
        equals: section as PayloadArticle['section'],
      },
      _status: {
        equals: 'published',
      },
    },
    sort: '-publishedDate',
    limit: 30,
    depth: isOpinion ? 2 : 1,
    select: {
      title: true,
      slug: true,
      subdeck: true,
      featuredImage: true,
      section: true,
      kicker: true,
      publishedDate: true,
      createdAt: true,
      authors: true,
      ...(isOpinion && { opinionType: true }),
    },
  });

  const articles = articlesResponse.docs;

  if (articles.length === 0) {
    return renderPlaceholder('No articles found in this section yet.');
  }

  const formattedArticles = articles.map((a) => formatArticle(a)).filter(Boolean) as ComponentArticle[];
  const sectionTitle = section.charAt(0).toUpperCase() + section.slice(1);

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
      },
    ],
  };

  // Fetch opinion page layout if this is the opinion section
  let editorsChoiceArticles: ComponentArticle[] = [];
  let editorsChoiceLabel = "Opinion\u2019s Choice";
  let quotes: QuoteData[] = [];

  if (isOpinion) {
    let layout: Record<string, unknown> | undefined;
    try {
      const layoutResponse = await payload.find({
        collection: 'opinion-page-layout',
        limit: 1,
        depth: 1,
        select: {
          editorsChoiceLabel: true,
          editorsChoice1: true,
          editorsChoice2: true,
          editorsChoice3: true,
          quotes: true,
        },
      });
      layout = layoutResponse.docs[0] as Record<string, unknown> | undefined;
    } catch {
      // Table may not exist yet if migration hasn't run
    }
    if (layout) {
      if (layout.editorsChoiceLabel) editorsChoiceLabel = layout.editorsChoiceLabel;

      // Resolve editor's choice article relationships
      const choiceSlots = [layout.editorsChoice1, layout.editorsChoice2, layout.editorsChoice3];
      const choiceIds = choiceSlots
        .map((slot) => (typeof slot === 'number' ? slot : slot && typeof slot === 'object' && 'id' in slot ? slot.id : null))
        .filter((id): id is number => id !== null);

      if (choiceIds.length > 0) {
        const choiceResponse = await payload.find({
          collection: 'articles',
          where: {
            and: [
              { id: { in: choiceIds } },
              { _status: { equals: 'published' } },
            ],
          },
          limit: 3,
          depth: 1,
          select: {
            title: true,
            slug: true,
            subdeck: true,
            featuredImage: true,
            section: true,
            kicker: true,
            publishedDate: true,
            createdAt: true,
            authors: true,
          },
        });

        // Preserve the order from the layout slots
        const choiceMap = new Map(
          choiceResponse.docs.map((a) => [a.id, formatArticle(a)])
        );
        editorsChoiceArticles = choiceIds
          .map((id) => choiceMap.get(id))
          .filter((a): a is ComponentArticle => a !== null && a !== undefined);
      }

      // Resolve quote article relationships
      if (layout.quotes && Array.isArray(layout.quotes)) {
        quotes = layout.quotes
          .filter((q): q is { text: string; article: PayloadArticle | number; id?: string | null } => Boolean(q.text && q.article))
          .map((q) => {
            const article = typeof q.article === 'number' ? null : q.article as PayloadArticle;
            return {
              text: q.text,
              articleTitle: article?.title || '',
              articleUrl: article
                ? getArticleUrl({ section: article.section, slug: article.slug, publishedDate: article.publishedDate, createdAt: article.createdAt })
                : '#',
            };
          })
          .filter((q) => q.articleTitle);
      }
    }
  }

  // Fetch grouped opinion articles for bottom sections
  const groupedArticles: Record<string, ComponentArticle[]> = {};
  if (isOpinion) {
    const groupEntries = Object.entries(opinionGroups);
    const groupResults = await Promise.all(
      groupEntries.map(([, group]) =>
        payload.find({
          collection: 'articles',
          where: {
            and: [
              { section: { equals: 'opinion' } },
              { _status: { equals: 'published' } },
              { opinionType: { in: group.types as unknown as string[] } },
            ],
          },
          sort: '-publishedDate',
          limit: 5,
          depth: 1,
          select: {
            title: true,
            slug: true,
            subdeck: true,
            featuredImage: true,
            section: true,
            kicker: true,
            publishedDate: true,
            createdAt: true,
            authors: true,
            opinionType: true,
          },
        })
      )
    );
    groupEntries.forEach(([key], i) => {
      groupedArticles[key] = groupResults[i].docs
        .map((a) => formatArticle(a))
        .filter((a): a is ComponentArticle => a !== null);
    });
  }

  return (
    <main className={`min-h-screen bg-bg-main section-${section} transition-colors duration-300`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }}
      />
      <Header />
      {isOpinion ? (
        <OpinionSectionPage
          title={sectionTitle}
          articles={formattedArticles}
          rawArticles={articles}
          editorsChoiceArticles={editorsChoiceArticles}
          editorsChoiceLabel={editorsChoiceLabel}
          quotes={quotes}
          groupedArticles={groupedArticles}
        />
      ) : (
        <SectionPage title={sectionTitle} articles={formattedArticles} />
      )}
      <Footer />
    </main>
  );
}
