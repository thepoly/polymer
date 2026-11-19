import React from 'react';
import { getPayload } from 'payload';
import config from '@/payload.config';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SectionPage from '@/components/SectionPage';
import OpinionSectionPage from '@/components/Opinion/OpinionSectionPage';
import NewsPage from '@/components/News/NewsPage';
import {
  DEFAULT_LEAD_TEXT_POSITION,
  isLeadTextPosition,
  normalizeFeatured,
  normalizeLeadFrame,
  normalizeSecondary,
  normalizeTopicCards,
  normalizeTopicPicks,
  type LeadFrame,
  type LeadTextPosition,
  type NewsLayout,
} from '@/components/News/newsLayout';
import {
  DEFAULT_STUDENT_GOV_LAYOUT,
  STUDENT_GOV_BOX_MAX,
  normalizeStudentGovLayout,
  type StudentGovBody,
  type StudentGovLayout,
} from '@/components/News/studentGov';
import type { StudentGovBoxContent, StudentGovSession } from '@/components/News/StudentGovColumn';
import { normalizeTimelinePages } from '@/components/News/timelinePage';
import { getArticlesById, getStudentGovTimeline } from '@/lib/studentGovTimeline';
import { getNewsTopicArticles } from '@/lib/newsTopics';
import { NEWS_TOPICS, type NewsTopicKey } from '@/components/News/newsTopics';
import { getStoredTerms } from '@/lib/studentGovTerms';
import { ordinal, resolveTerms, termYearLabel, troyDayKey, updateTermHref } from '@/components/News/studentGovTerms';
import FeaturesSectionPage, { type SpotlightPhoto } from '@/components/Features/FeaturesSectionPage';
import SportsSectionPage from '@/components/Sports/SportsSectionPage';
import { SPORTS_GAME_SELECT, loadSportsPage } from '@/lib/sportsPage';
import { Article as PayloadArticle, Media } from '@/payload-types';
import { Article as ComponentArticle } from '@/components/FrontPage/types';
import type { SpotlightAuthor } from '@/components/Opinion/AuthorSpotlightCarousel';
import { formatArticle } from '@/utils/formatArticle';
import { normalizeOpinionLayout, readOpinionLayoutDocument, OPINION_LAYOUT_NAME } from '@/lib/opinionLayout';
import { buildOpinionSpotlights, opinionCardSelect } from '@/lib/opinionArticles';
import { opinionGroups } from '@/components/Opinion/opinionGroups';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSectionSeoDescription, getSeo } from '@/lib/getSeo';

export const revalidate = 60;

// Slots the news layout can place (columns + "More in News"). The page prefers
// recent stories but backfills to this many so no column comes up empty.
const NEWS_LAYOUT_CAPACITY = 26;

type Args = {
  params: Promise<{
    section: string;
  }>;
};

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { section } = await params;
  const seo = await getSeo();
  const title = section.charAt(0).toUpperCase() + section.slice(1);
  const description = getSectionSeoDescription(seo, section);

  return {
    title,
    description,
    alternates: { canonical: `/${section}` },
    openGraph: {
      title: `${title} — ${seo.siteIdentity.siteName}`,
      description,
      type: 'website',
      url: `/${section}`,
    },
  };
}

export default async function SectionPageRoute({ params }: Args) {
  const { section } = await params;

  const contentSections = ['news', 'sports', 'features', 'opinion'];
  const placeholderSections = ['about', 'checkmate', 'contact', 'submit'];
  const isContentSection = contentSections.includes(section);
  const isPlaceholderSection = placeholderSections.includes(section);

  if (!isContentSection && !isPlaceholderSection) {
    notFound();
  }

  const renderPlaceholder = (message: string) => (
    <main className="min-h-screen bg-bg-main transition-colors duration-300 flex flex-col">
      <Header />
      <div className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-16 md:px-[30px]">
        <h1
          className="font-meta uppercase tracking-[0.04em] text-[#D6001C] dark:text-white transition-colors text-[44px] sm:text-[52px] lg:text-[60px]"
          style={{ fontWeight: 400, lineHeight: 1 }}
        >
          {section}
        </h1>
        <div className="mt-8 border-y border-rule py-16 text-center">
          <p className="font-copy text-[22px] leading-[1.3] text-text-main">{message}</p>
        </div>
      </div>
      <Footer />
    </main>
  );

  if (isPlaceholderSection) {
    return renderPlaceholder('This section does not have published articles yet.');
  }

  const payload = await getPayload({ config });
  const isOpinion = section === 'opinion';
  const isNews = section === 'news';

  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

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
    limit: isNews ? 200 : isOpinion ? 63 : 30,
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
      ...(section === 'sports' && SPORTS_GAME_SELECT),
      writeInAuthors: true,
      isFollytechnic: true,
    },
  });

  const articles = articlesResponse.docs;

  if (articles.length === 0 && !isNews) {
    return renderPlaceholder('No articles found in this section yet.');
  }

  const allFormattedArticles = articles.map((a) => formatArticle(a)).filter(Boolean) as ComponentArticle[];

  // News prefers the last eight weeks, but backfills with older stories rather
  // than leaving the section page empty over breaks.
  let formattedArticles = allFormattedArticles;
  let hasOlderNewsArticles = false;
  if (isNews) {
    const recent = allFormattedArticles.filter((a) => {
      const iso = a.publishedDate || a.isoDate;
      return Boolean(iso) && new Date(iso as string) >= eightWeeksAgo;
    });
    formattedArticles =
      recent.length >= NEWS_LAYOUT_CAPACITY
        ? recent
        : allFormattedArticles.slice(0, Math.max(NEWS_LAYOUT_CAPACITY, recent.length));
    hasOlderNewsArticles = allFormattedArticles.length > formattedArticles.length;
  }

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
  let pinnedCol1: (ComponentArticle | null)[] = [];
  let pinnedCol2: (ComponentArticle | null)[] = [];
  let pinnedCol3: (ComponentArticle | null)[] = [];
  let col1Images: boolean[] = [true, false, false, false, false];
  let col2Images: boolean[] = [false, false, true, false];
  let col3Images: boolean[] = [false, false, false, true];
  let editorsChoiceArticles: ComponentArticle[] = [];
  let editorsChoiceLabel = "Opinion\u2019s Choice";
  let pinnedSpotlightAuthors: SpotlightAuthor[] = [];

  if (isOpinion) {
    let layoutJson = normalizeOpinionLayout(null);
    try {
      const layoutResponse = await payload.find({
        collection: 'opinion-page-layout',
        where: { name: { equals: OPINION_LAYOUT_NAME } },
        limit: 1,
        depth: 0,
        select: { layout: true, editorsChoice1: true, editorsChoice2: true, editorsChoice3: true, editorsChoiceLabel: true },
      });
      const doc = layoutResponse.docs[0] as Record<string, unknown> | undefined;
      layoutJson = readOpinionLayoutDocument(doc);
    } catch {
      // Table may not exist yet
    }

    if (layoutJson) {
      if (layoutJson.editorsChoiceLabel) editorsChoiceLabel = layoutJson.editorsChoiceLabel;
      if (layoutJson.column1Images) col1Images = layoutJson.column1Images;
      if (layoutJson.column2Images) col2Images = layoutJson.column2Images;
      if (layoutJson.column3Images) col3Images = layoutJson.column3Images;

      pinnedCol1 = layoutJson.column1.map(() => null);
      pinnedCol2 = layoutJson.column2.map(() => null);
      pinnedCol3 = layoutJson.column3.map(() => null);

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
              { section: { equals: 'opinion' } },
              { _status: { equals: 'published' } },
            ],
          },
          limit: allPinnedIds.size,
          depth: 1,
          select: {
            title: true, slug: true, subdeck: true, featuredImage: true,
            section: true, kicker: true, publishedDate: true, createdAt: true,
            authors: true, opinionType: true, writeInAuthors: true, isFollytechnic: true,
          },
        });
        const pinnedMap = new Map(
          pinnedResponse.docs.map((a) => [a.id, formatArticle(a)])
        );

        const resolveColumn = (ids: (number | null)[]): (ComponentArticle | null)[] =>
          ids.map((id) => (id ? pinnedMap.get(id) ?? null : null));

        pinnedCol1 = resolveColumn(layoutJson.column1);
        pinnedCol2 = resolveColumn(layoutJson.column2);
        pinnedCol3 = resolveColumn(layoutJson.column3);
        editorsChoiceArticles = resolveColumn(layoutJson.editorsChoice).filter((a): a is ComponentArticle => a !== null);
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

  // Fetch news pinned articles — they lead the section page's centre column
  let newsPinnedArticles: ComponentArticle[] = [];
  if (isNews) {
    try {
      const layoutResponse = await payload.find({
        collection: 'layout',
        limit: 1,
        depth: 0,
        select: { sectionLayouts: true },
      });
      const layoutDoc = layoutResponse.docs[0] as { sectionLayouts?: Record<string, { pinnedArticles?: number[] }> } | undefined;
      const pinnedIds = (layoutDoc?.sectionLayouts?.news?.pinnedArticles || []).filter(Boolean);

      if (pinnedIds.length > 0) {
        const pinnedResponse = await payload.find({
          collection: 'articles',
          where: {
            and: [
              { id: { in: pinnedIds } },
              { _status: { equals: 'published' } },
            ],
          },
          limit: pinnedIds.length,
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
            writeInAuthors: true,
            isFollytechnic: true,
          },
        });
        const pinnedMap = new Map(pinnedResponse.docs.map((a) => [a.id, formatArticle(a)]));
        // Keep the editor's pin order
        newsPinnedArticles = pinnedIds
          .map((id) => pinnedMap.get(id) ?? null)
          .filter((a): a is ComponentArticle => a !== null);
      }
    } catch {
      // Layout may not exist yet
    }
  }

  // News page layout (dashboard: News Layout): pinned lead + where its text sits
  let newsLead: ComponentArticle | null = null;
  let newsLeadTextPosition: LeadTextPosition = DEFAULT_LEAD_TEXT_POSITION;
  let newsLeadFrame: LeadFrame | null = null;
  // Stories pinned under the lead, by slot; null where nothing is pinned or the pin is unpublished
  let newsSecondaryPins: (ComponentArticle | null)[] = [];
  // Stories pinned in the Featured row, by slot
  let newsFeaturedPins: (ComponentArticle | null)[] = [];
  // Tabbed topic row under Featured
  let newsTopics: Record<NewsTopicKey, ComponentArticle[]> | null = null;
  let newsTopicCards = normalizeTopicCards(null);
  // Topic tabs the editor chose stories for, by slot; other tabs show the newest
  let newsTopicPins: Partial<Record<NewsTopicKey, (ComponentArticle | null)[]>> = {};
  let newsBulletsHeadlinesOnly = false;
  let newsSecondaryPhotos = true;
  let studentGovLayout: StudentGovLayout = DEFAULT_STUDENT_GOV_LAYOUT;
  let newsStudentGovBoxes: StudentGovBoxContent[] = [];
  // Entries hidden in the Senate / Executive Board page editors stay out of the boxes too
  let timelinePages = normalizeTimelinePages(null);
  if (isNews) {
    try {
      const layoutResponse = await payload.find({
        collection: 'news-page-layout',
        limit: 1,
        depth: 0,
        select: { layout: true },
      });
      const layoutJson = layoutResponse.docs[0]?.layout as Partial<NewsLayout> | null | undefined;

      if (layoutJson && isLeadTextPosition(layoutJson.leadTextPosition)) {
        newsLeadTextPosition = layoutJson.leadTextPosition;
      }
      newsLeadFrame = normalizeLeadFrame(layoutJson?.leadFrame);
      const secondaryIds = normalizeSecondary(layoutJson?.secondary);
      const featuredIds = normalizeFeatured(layoutJson?.featured);
      newsTopicCards = normalizeTopicCards(layoutJson?.topicCards);
      const topicPicks = normalizeTopicPicks(layoutJson?.topicPicks);
      const manualTopics = NEWS_TOPICS.filter((t) => topicPicks[t.key].manual).map((t) => t.key);
      newsBulletsHeadlinesOnly = layoutJson?.bulletsHeadlinesOnly === true;
      newsSecondaryPhotos = layoutJson?.secondaryPhotos !== false;
      const pinnedById = await getArticlesById(
        payload,
        [...secondaryIds, ...featuredIds, ...manualTopics.flatMap((key) => topicPicks[key].articles)].filter(
          (id): id is number => id !== null,
        ),
      );
      const pinnedOrNull = (id: number | null) => (id !== null ? pinnedById.get(id) ?? null : null);
      newsSecondaryPins = secondaryIds.map(pinnedOrNull);
      newsFeaturedPins = featuredIds.map(pinnedOrNull);
      newsTopicPins = Object.fromEntries(manualTopics.map((key) => [key, topicPicks[key].articles.map(pinnedOrNull)]));
      if (layoutJson?.lead) {
        const leadResponse = await payload.find({
          collection: 'articles',
          where: {
            and: [
              { id: { equals: layoutJson.lead } },
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
            writeInAuthors: true,
            isFollytechnic: true,
          },
        });
        // An unpublished pin leaves the lead to auto-fill
        newsLead = leadResponse.docs[0] ? formatArticle(leadResponse.docs[0]) : null;
      }
      studentGovLayout = normalizeStudentGovLayout(layoutJson?.studentGov);
      timelinePages = normalizeTimelinePages(layoutJson?.timelinePages);
    } catch {
      // Table may not exist yet
    }

    // Senate and Executive Board boxes: a pinned article, or the latest
    // timeline entries. A pin that's missing or unpublished falls back to
    // the timeline.
    try {
      const pinnedIds = studentGovLayout.order
        .map((body) => studentGovLayout[body])
        .filter((box) => box.mode === 'article' && box.article !== null)
        .map((box) => box.article as number);
      const [pinned, storedTerms] = await Promise.all([
        getArticlesById(payload, pinnedIds),
        getStoredTerms(payload),
      ]);
      const now = new Date();
      const today = troyDayKey(now);
      // The term in session: the newest that has started
      const sessionOf = (body: StudentGovBody, entryDates: string[]): StudentGovSession | null => {
        const term = resolveTerms(storedTerms, body, entryDates, now)
          .filter((t) => t.startsOn <= today)
          .at(-1);
        if (!term) return null;
        return {
          kicker: body === 'senate' && term.number !== null ? `The ${ordinal(term.number)}` : 'Rensselaer Union',
          year: termYearLabel(term.startYear),
        };
      };
      newsStudentGovBoxes = await Promise.all(
        studentGovLayout.order.map(async (body): Promise<StudentGovBoxContent> => {
          const box = studentGovLayout[body];
          const article = box.mode === 'article' && box.article !== null ? pinned.get(box.article) : undefined;
          // An explicit lead pin wins a conflicting box pin, which falls back
          // to its timeline just like a missing or unpublished pin.
          if (article && article.id !== newsLead?.id) return { body, kind: 'article', article, session: sessionOf(body, []) };
          const { hidden, included } = timelinePages[body];
          // One more than the editor's count: the page shows it when the column has room
          const timeline = (await getStudentGovTimeline(payload, body, STUDENT_GOV_BOX_MAX + (newsLead ? 1 : 0), { hidden: new Set(hidden), included }))
            .filter((item) => item.kind !== 'article' || item.article.id !== newsLead?.id)
            .slice(0, STUDENT_GOV_BOX_MAX);
          const terms = resolveTerms(storedTerms, body, timeline.map((item) => item.date), now);
          const items = timeline.map((item) => item.kind === 'update'
            ? { ...item, href: updateTermHref(terms, item.date, item.id, now) }
            : item);
          return { body, kind: 'timeline', items, min: box.count, session: sessionOf(body, items.map((item) => item.date)) };
        }),
      );
    } catch {
      // Leave the column empty rather than failing the page
    }

    try {
      newsTopics = await getNewsTopicArticles(payload);
    } catch {
      // Leave the topic row out rather than failing the page
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
          select: opinionCardSelect,
        })
      )
    );
    groupEntries.forEach(([key], i) => {
      groupedArticles[key] = groupResults[i].docs
        .map((a) => formatArticle(a))
        .filter((a): a is ComponentArticle => a !== null);
    });
  }

  // Fetch features page layout — 3-column Row 1 + Row 2. Layouts saved before
  // Upcoming Events and the Collar City Column were removed may still carry
  // `events` / `collarCity*` keys; they're ignored.
  let featuresPinnedOnCampus: ComponentArticle[] = [];
  let featuresPinnedFeatured: ComponentArticle[] = [];
  let featuresPinnedRight: ComponentArticle[] = [];
  let featuresOnCampusImages: boolean[] = [false, false, false];
  let featuresRightImages: boolean[] = [false, false, false];
  // Row 2
  let featuresPinnedTheArts: ComponentArticle[] = [];
  let featuresTheArtsImages: boolean[] = [false, false, false];
  let featuresPhotoSpotlight: SpotlightPhoto[] = [];
  let featuresPinnedSpotlightSubs: ComponentArticle[] = [];
  let featuresPinnedWide: ComponentArticle[] = [];

  if (section === 'features') {
    type FeaturesLayoutShape = {
      onCampus?: (number | null)[];
      onCampusImages?: boolean[];
      featured?: (number | null)[];
      rightArticles?: (number | null)[];
      rightImages?: boolean[];
      theArts?: (number | null)[];
      theArtsImages?: boolean[];
      photoSpotlight?: SpotlightPhoto[];
      spotlightSubs?: (number | null)[];
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
        if (layoutJson.onCampusImages) featuresOnCampusImages = layoutJson.onCampusImages;
        if (layoutJson.rightImages) featuresRightImages = layoutJson.rightImages;
        if (layoutJson.theArtsImages) featuresTheArtsImages = layoutJson.theArtsImages;
        featuresPhotoSpotlight = layoutJson.photoSpotlight || [];

        // Collect all pinned IDs to fetch in one batch (Row 1 + Row 2)
        const allPinnedIds = new Set<number>();
        for (const col of [layoutJson.onCampus, layoutJson.featured, layoutJson.rightArticles, layoutJson.theArts, layoutJson.spotlightSubs, layoutJson.wideArticle]) {
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
              authors: true, writeInAuthors: true, isFollytechnic: true,
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
          featuresPinnedWide = resolveColumn(layoutJson.wideArticle);
        }
      }
    } catch {
      // Table may not exist yet
    }
  }

  // Sports: editors' layout and pins, standings, schedule and schools
  const sportsPage = section === 'sports' ? await loadSportsPage(payload) : null;

  return (
    <main className={`min-h-screen bg-bg-main section-${section} transition-colors duration-300`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }}
      />
      <Header flushMobileBottom={Boolean(sportsPage?.schedule.length)} />
      {isOpinion ? (
        <OpinionSectionPage
          title={sectionTitle}
          articles={formattedArticles}
          spotlightAuthors={buildOpinionSpotlights(articles)}
          pinnedCol1={pinnedCol1}
          pinnedCol2={pinnedCol2}
          pinnedCol3={pinnedCol3}
          col1Images={col1Images}
          col2Images={col2Images}
          col3Images={col3Images}
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
          onCampusImages={featuresOnCampusImages}
          rightImages={featuresRightImages}
          pinnedTheArts={featuresPinnedTheArts}
          theArtsImages={featuresTheArtsImages}
          photoSpotlight={featuresPhotoSpotlight}
          pinnedSpotlightSubs={featuresPinnedSpotlightSubs}
          pinnedWide={featuresPinnedWide}
        />
      ) : sportsPage ? (
        <SportsSectionPage title={sectionTitle} articles={formattedArticles} {...sportsPage} />
      ) : isNews ? (
        <NewsPage
          title={sectionTitle}
          articles={formattedArticles}
          lead={newsLead}
          leadTextPosition={newsLeadTextPosition}
          leadFrame={newsLeadFrame}
          secondaryPins={newsSecondaryPins}
          secondaryPhotos={newsSecondaryPhotos}
          featuredPins={newsFeaturedPins}
          topics={newsTopics}
          topicCards={newsTopicCards}
          topicPins={newsTopicPins}
          bulletsHeadlinesOnly={newsBulletsHeadlinesOnly}
          studentGovBoxes={newsStudentGovBoxes}
          pinnedArticles={newsPinnedArticles}
          hasOlderArticles={hasOlderNewsArticles}
        />
      ) : (
        <SectionPage title={sectionTitle} articles={formattedArticles} />
      )}
      <Footer />
    </main>
  );
}
