import React from 'react';
import { getPayload } from 'payload';
import config from '@/payload.config';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SectionPage from '@/components/SectionPage';
import OpinionSectionPage from '@/components/Opinion/OpinionSectionPage';
import NewsSectionPage from '@/components/News/NewsSectionPage';
import FeaturesSectionPage, { type FeaturesEvent, type SpotlightPhoto } from '@/components/Features/FeaturesSectionPage';
import { Article as PayloadArticle, Media } from '@/payload-types';
import { Article as ComponentArticle } from '@/components/FrontPage/types';
import type { SpotlightAuthor } from '@/components/Opinion/AuthorSpotlightCarousel';
import { formatArticle } from '@/utils/formatArticle';
import { opinionGroups } from '@/components/Opinion/opinionGroups';
import { notFound, redirect } from 'next/navigation';
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

  if (section === 'archives') {
    redirect('https://digitalassets.archives.rpi.edu/do/235be3d2-f018-48af-a413-b50e16dd6dc7');
  }

  const contentSections = ['news', 'sports', 'features', 'opinion'];
  const placeholderSections = ['about', 'checkmate', 'contact', 'submit'];
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
  const isNews = section === 'news';

  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const articlesResponse = await payload.find({
    collection: 'articles',
    where: {
      section: {
        equals: section as PayloadArticle['section'],
      },
      _status: {
        equals: 'published',
      },
      ...(isNews && {
        publishedDate: {
          greater_than_equal: fourWeeksAgo.toISOString(),
        },
      }),
    },
    sort: '-publishedDate',
    limit: isNews ? 200 : 30,
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
      updatedAt: true,
      authors: true,
      ...(isOpinion && { opinionType: true }),
      writeInAuthors: true,
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

  // Fetch opinion page layout — pinned articles per column + editors choice
  let pinnedCol1: ComponentArticle[] = [];
  let pinnedCol2: ComponentArticle[] = [];
  let pinnedCol3: ComponentArticle[] = [];
  let editorsChoiceArticles: ComponentArticle[] = [];
  let editorsChoiceLabel = "Opinion\u2019s Choice";
  let pinnedSpotlightAuthors: SpotlightAuthor[] = [];

  if (isOpinion) {
    type LayoutShape = {
      column1?: (number | null)[];
      column2?: (number | null)[];
      column3?: (number | null)[];
      editorsChoice?: (number | null)[];
      editorsChoiceLabel?: string;
      spotlight?: Array<{ userId: number; articleTitle?: string | null; articleUrl?: string | null }>;
    };

    let layoutJson: LayoutShape | undefined;
    try {
      const layoutResponse = await payload.find({
        collection: 'opinion-page-layout',
        limit: 1,
        depth: 0,
        select: { layout: true },
      });
      const doc = layoutResponse.docs[0] as Record<string, unknown> | undefined;
      if (doc?.layout && typeof doc.layout === 'object') {
        layoutJson = doc.layout as LayoutShape;
      }
    } catch {
      // Table may not exist yet
    }

    if (layoutJson) {
      if (layoutJson.editorsChoiceLabel) editorsChoiceLabel = layoutJson.editorsChoiceLabel;

      // Collect all pinned IDs to fetch in one batch
      const allPinnedIds = new Set<number>();
      for (const col of [layoutJson.column1, layoutJson.column2, layoutJson.column3, layoutJson.editorsChoice]) {
        if (col) for (const id of col) { if (id) allPinnedIds.add(id); }
      }

      if (allPinnedIds.size > 0) {
        const pinnedResponse = await payload.find({
          collection: 'articles',
          where: {
            and: [
              { id: { in: Array.from(allPinnedIds) } },
              { _status: { equals: 'published' } },
            ],
          },
          limit: allPinnedIds.size,
          depth: 1,
          select: {
            title: true, slug: true, subdeck: true, featuredImage: true,
            section: true, kicker: true, publishedDate: true, createdAt: true,
            authors: true, opinionType: true, writeInAuthors: true,
          },
        });
        const pinnedMap = new Map(
          pinnedResponse.docs.map((a) => [a.id, formatArticle(a)])
        );

        const resolveColumn = (ids: (number | null)[] | undefined): ComponentArticle[] =>
          (ids || []).map((id) => (id ? pinnedMap.get(id) ?? null : null)).filter((a): a is ComponentArticle => a !== null);

        pinnedCol1 = resolveColumn(layoutJson.column1);
        pinnedCol2 = resolveColumn(layoutJson.column2);
        pinnedCol3 = resolveColumn(layoutJson.column3);
        editorsChoiceArticles = resolveColumn(layoutJson.editorsChoice);
      }

      // Build pinned spotlight authors
      if (layoutJson.spotlight && layoutJson.spotlight.length > 0) {
        try {
          const userIds = layoutJson.spotlight.map((e) => e.userId).filter(Boolean);
          const userResponse = await payload.find({
            collection: 'users',
            where: { id: { in: userIds } },
            limit: userIds.length,
            depth: 1,
            select: { firstName: true, lastName: true, headshot: true },
          });
          const userMap = new Map(userResponse.docs.map((u) => [u.id, u]));
          pinnedSpotlightAuthors = layoutJson.spotlight
            .map((entry) => {
              const user = userMap.get(entry.userId);
              if (!user) return null;
              const headshot =
                user.headshot && typeof user.headshot !== 'number'
                  ? (user.headshot as Media).url || null
                  : null;
              return {
                id: user.id,
                name: `${user.firstName} ${user.lastName}`,
                headshot,
                latestArticle: {
                  title: entry.articleTitle || '',
                  url: entry.articleUrl || '/opinion',
                },
              } satisfies SpotlightAuthor;
            })
            .filter((a): a is SpotlightAuthor => a !== null);
        } catch {
          // silently skip if spotlight fetch fails
        }
      }
    }
  }

  // Fetch news pinned article and grouped articles for bottom sections
  let newsPinnedArticle: ComponentArticle | null = null;
  const newsGroupedArticles: Record<string, ComponentArticle[]> = {};
  if (isNews) {
    // Fetch pinned article from layout's sectionLayouts
    try {
      const layoutResponse = await payload.find({
        collection: 'layout',
        limit: 1,
        depth: 0,
        select: { sectionLayouts: true },
      });
      const layoutDoc = layoutResponse.docs[0] as { sectionLayouts?: Record<string, { pinnedArticles?: number[] }> } | undefined;
      const newsConfig = layoutDoc?.sectionLayouts?.news;
      const pinnedIds = newsConfig?.pinnedArticles || [];

      if (pinnedIds.length > 0) {
        const pinnedResponse = await payload.find({
          collection: 'articles',
          where: {
            and: [
              { id: { equals: pinnedIds[0] } },
              { _status: { equals: 'published' } },
            ],
          },
          limit: 1,
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
        if (pinnedResponse.docs[0]) {
          newsPinnedArticle = formatArticle(pinnedResponse.docs[0]);
        }
      }
    } catch {
      // Layout may not exist yet
    }

    // Build grouped articles for bottom sections, excluding anything shown in columns
    // Replicate the same column logic as NewsSectionPage to know what's already shown
    const columnShownIds = new Set<string | number>();
    if (newsPinnedArticle) columnShownIds.add(newsPinnedArticle.id);
    for (const a of formattedArticles) {
      if (a.kicker === 'Student Senate' || a.kicker === 'Executive Board' ||
          a.kicker === 'Campus Infrastructure' || a.kicker === 'Press Release' ||
          a.kicker === 'Interview' || a.kicker === 'Town Hall' || a.kicker === 'GM Week 2026') {
        columnShownIds.add(a.id);
      }
    }

    // Interviews group — exclude articles already in columns
    newsGroupedArticles.interviews = formattedArticles.filter(
      (a) => !columnShownIds.has(a.id) && a.kicker === 'Interview'
    ).slice(0, 5);

    // Student Government group — exclude articles already in columns
    newsGroupedArticles.studentGov = formattedArticles.filter(
      (a) => !columnShownIds.has(a.id) && (a.kicker === 'Student Senate' || a.kicker === 'Executive Board')
    ).slice(0, 5);

    // Other: articles not shown in columns or other bottom groups
    const bottomShownIds = new Set<string | number>([
      ...columnShownIds,
      ...newsGroupedArticles.interviews.map((a) => a.id),
      ...newsGroupedArticles.studentGov.map((a) => a.id),
    ]);
    newsGroupedArticles.other = formattedArticles.filter(
      (a) => !bottomShownIds.has(a.id)
    ).slice(0, 5);
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

  // Fetch features page layout — 3-column with events + Row 2
  let featuresPinnedOnCampus: ComponentArticle[] = [];
  let featuresPinnedFeatured: ComponentArticle[] = [];
  let featuresPinnedRight: ComponentArticle[] = [];
  let featuresEvents: FeaturesEvent[] = [];
  let featuresOnCampusImages: boolean[] = [false, false, false];
  let featuresRightImages: boolean[] = [false, false, false];
  // Row 2
  let featuresPinnedTheArts: ComponentArticle[] = [];
  let featuresTheArtsImages: boolean[] = [false, false, false];
  let featuresPhotoSpotlight: SpotlightPhoto[] = [];
  let featuresPinnedSpotlightSubs: ComponentArticle[] = [];
  let featuresPinnedCollarCity: ComponentArticle[] = [];
  let featuresCollarCityImages: boolean[] = [false, false, false];
  let featuresPinnedWide: ComponentArticle[] = [];

  if (section === 'features') {
    type FeaturesLayoutShape = {
      onCampus?: (number | null)[];
      onCampusImages?: boolean[];
      featured?: (number | null)[];
      rightArticles?: (number | null)[];
      rightImages?: boolean[];
      events?: FeaturesEvent[];
      theArts?: (number | null)[];
      theArtsImages?: boolean[];
      photoSpotlight?: SpotlightPhoto[];
      spotlightSubs?: (number | null)[];
      collarCity?: (number | null)[];
      collarCityImages?: boolean[];
      wideArticle?: (number | null)[];
    };

    try {
      const layoutResponse = await payload.find({
        collection: 'features-page-layout',
        limit: 1,
        depth: 0,
        select: { layout: true },
      });
      const doc = layoutResponse.docs[0] as Record<string, unknown> | undefined;
      const layoutJson = doc?.layout as FeaturesLayoutShape | undefined;

      if (layoutJson) {
        featuresEvents = layoutJson.events || [];
        if (layoutJson.onCampusImages) featuresOnCampusImages = layoutJson.onCampusImages;
        if (layoutJson.rightImages) featuresRightImages = layoutJson.rightImages;
        if (layoutJson.theArtsImages) featuresTheArtsImages = layoutJson.theArtsImages;
        featuresPhotoSpotlight = layoutJson.photoSpotlight || [];
        if (layoutJson.collarCityImages) featuresCollarCityImages = layoutJson.collarCityImages;

        // Collect all pinned IDs to fetch in one batch (Row 1 + Row 2)
        const allPinnedIds = new Set<number>();
        for (const col of [layoutJson.onCampus, layoutJson.featured, layoutJson.rightArticles, layoutJson.theArts, layoutJson.spotlightSubs, layoutJson.collarCity, layoutJson.wideArticle]) {
          if (col) for (const id of col) { if (id) allPinnedIds.add(id); }
        }

        if (allPinnedIds.size > 0) {
          const pinnedResponse = await payload.find({
            collection: 'articles',
            where: {
              and: [
                { id: { in: Array.from(allPinnedIds) } },
                { _status: { equals: 'published' } },
              ],
            },
            limit: allPinnedIds.size,
            depth: 1,
            select: {
              title: true, slug: true, subdeck: true, featuredImage: true,
              section: true, kicker: true, publishedDate: true, createdAt: true,
              authors: true, writeInAuthors: true,
            },
          });
          const pinnedMap = new Map(
            pinnedResponse.docs.map((a) => [a.id, formatArticle(a)]),
          );

          const resolveColumn = (ids: (number | null)[] | undefined): ComponentArticle[] =>
            (ids || []).map((id) => (id ? pinnedMap.get(id) ?? null : null)).filter((a): a is ComponentArticle => a !== null);

          featuresPinnedOnCampus = resolveColumn(layoutJson.onCampus);
          featuresPinnedFeatured = resolveColumn(layoutJson.featured);
          featuresPinnedRight = resolveColumn(layoutJson.rightArticles);
          featuresPinnedTheArts = resolveColumn(layoutJson.theArts);
          featuresPinnedSpotlightSubs = resolveColumn(layoutJson.spotlightSubs);
          featuresPinnedCollarCity = resolveColumn(layoutJson.collarCity);
          featuresPinnedWide = resolveColumn(layoutJson.wideArticle);
        }
      }
    } catch {
      // Table may not exist yet
    }
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
          pinnedCol1={pinnedCol1}
          pinnedCol2={pinnedCol2}
          pinnedCol3={pinnedCol3}
          editorsChoiceArticles={editorsChoiceArticles}
          editorsChoiceLabel={editorsChoiceLabel}
          groupedArticles={groupedArticles}
          pinnedSpotlightAuthors={pinnedSpotlightAuthors}
        />
      ) : section === 'features' ? (
        <FeaturesSectionPage
          title={sectionTitle}
          articles={formattedArticles}
          pinnedOnCampus={featuresPinnedOnCampus}
          pinnedFeatured={featuresPinnedFeatured}
          pinnedRight={featuresPinnedRight}
          events={featuresEvents}
          onCampusImages={featuresOnCampusImages}
          rightImages={featuresRightImages}
          pinnedTheArts={featuresPinnedTheArts}
          theArtsImages={featuresTheArtsImages}
          photoSpotlight={featuresPhotoSpotlight}
          pinnedSpotlightSubs={featuresPinnedSpotlightSubs}
          pinnedCollarCity={featuresPinnedCollarCity}
          collarCityImages={featuresCollarCityImages}
          pinnedWide={featuresPinnedWide}
        />
      ) : isNews ? (
        <NewsSectionPage
          title={sectionTitle}
          articles={formattedArticles}
          pinnedArticle={newsPinnedArticle}
          groupedArticles={newsGroupedArticles}
        />
      ) : (
        <SectionPage title={sectionTitle} articles={formattedArticles} />
      )}
      <Footer />
    </main>
  );
}
