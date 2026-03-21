export const revalidate = 60;
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FrontPage from "@/components/FrontPage";
import { getPayload } from "payload";
import config from "@/payload.config";
import { Article as ComponentArticle } from "@/components/FrontPage/types";
import { formatArticle } from "@/utils/formatArticle";

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: {
    title: 'The Polytechnic',
    description: "The Polytechnic is Rensselaer Polytechnic Institute's independent student newspaper, serving the RPI community since 1885.",
    type: 'website',
    url: '/',
  },
};

const dedupeArticles = (articles: (ComponentArticle | null | undefined)[], excludeIDs: Array<string | number> = []) => {
  const seen = new Set<string>(excludeIDs.map(String));
  const result: ComponentArticle[] = [];

  for (const article of articles) {
    if (!article) continue;
    const key = String(article.id);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(article);
  }

  return result;
};

const fillArticles = (
  preferred: (ComponentArticle | null | undefined)[],
  fallback: ComponentArticle[],
  count: number,
  excludeIDs: Array<string | number> = [],
) => dedupeArticles([...preferred, ...fallback], excludeIDs).slice(0, count);

const excludeUsedSectionArticles = (
  articles: ComponentArticle[],
  usedIDs: Array<string | number>,
  count: number,
) => {
  const usedSet = new Set(usedIDs.map(String));
  return articles.filter((article) => !usedSet.has(String(article.id))).slice(0, count);
};

const ARTICLE_CARD_SELECT = {
  title: true,
  slug: true,
  subdeck: true,
  featuredImage: true,
  section: true,
  kicker: true,
  publishedDate: true,
  createdAt: true,
  authors: true,
} as const;

type LayoutArticleRelation = number | { id: number } | null | undefined;

type HomepageLayout = {
  mainArticle?: LayoutArticleRelation;
  top1?: LayoutArticleRelation;
  top2?: LayoutArticleRelation;
  top3?: LayoutArticleRelation;
  top4?: LayoutArticleRelation;
  op1?: LayoutArticleRelation;
  op2?: LayoutArticleRelation;
  op3?: LayoutArticleRelation;
  op4?: LayoutArticleRelation;
  special?: LayoutArticleRelation;
};

const getRelationId = (value: LayoutArticleRelation) =>
  typeof value === "number" ? value : value && typeof value.id === "number" ? value.id : null;

const getLayoutArticleIds = (layout: HomepageLayout) =>
  [
    layout.mainArticle,
    layout.top1,
    layout.top2,
    layout.top3,
    layout.top4,
    layout.op1,
    layout.op2,
    layout.op3,
    layout.op4,
    layout.special,
  ]
    .map(getRelationId)
    .filter((value): value is number => typeof value === "number");

export default async function Home() {
  const payload = await getPayload({ config });
  
  const layoutResponse = await payload.find({
    collection: 'layout',
    limit: 1,
    depth: 0,
    select: {
      mainArticle: true,
      top1: true,
      top2: true,
      top3: true,
      top4: true,
      op1: true,
      op2: true,
      op3: true,
      op4: true,
      special: true,
    },
  });

  const layout = layoutResponse.docs[0] as HomepageLayout | undefined;

  if (!layout) {
    return (
      <main className="min-h-screen flex flex-col bg-bg-main transition-colors duration-300">
        <Header />
        <div className="flex flex-col items-center justify-center flex-1 px-4 text-center">
          <h1 className="font-display text-[28px] md:text-[36px] font-bold text-text-main mb-3">We&apos;ll be right back</h1>
          <p className="font-copy text-[15px] md:text-[17px] text-text-muted max-w-md">The Polytechnic is currently under maintenance. Please check back shortly.</p>
        </div>
        <Footer />
      </main>
    );
  }

  const layoutArticleIds = getLayoutArticleIds(layout);
  const layoutArticles = layoutArticleIds.length > 0
    ? await payload.find({
        collection: "articles",
        where: {
          and: [
            { id: { in: layoutArticleIds } },
            { _status: { equals: "published" } },
          ],
        },
        sort: "-publishedDate",
        limit: layoutArticleIds.length,
        depth: 1,
        select: ARTICLE_CARD_SELECT,
      })
    : { docs: [] };

  const layoutArticleMap = new Map(
    layoutArticles.docs.map((article) => [article.id, formatArticle(article)]),
  );

  const getLayoutArticle = (value: LayoutArticleRelation) => {
    const relationId = getRelationId(value);
    return relationId ? layoutArticleMap.get(relationId) ?? null : null;
  };

  const mainArticle = getLayoutArticle(layout.mainArticle);

  if (!mainArticle) {
    return (
      <main className="min-h-screen flex flex-col bg-bg-main transition-colors duration-300">
        <Header />
        <div className="flex flex-col items-center justify-center flex-1 px-4 text-center">
          <h1 className="font-display text-[28px] md:text-[36px] font-bold text-text-main mb-3">We&apos;ll be right back</h1>
          <p className="font-copy text-[15px] md:text-[17px] text-text-muted max-w-md">The Polytechnic is currently under maintenance. Please check back shortly.</p>
        </div>
        <Footer />
      </main>
    );
  }

  const fetchRecent = async (section: 'news' | 'features' | 'sports' | 'opinion') => {
    const res = await payload.find({
      collection: 'articles',
      where: {
        _status: { equals: 'published' },
        section: { equals: section },
      },
      sort: '-publishedDate',
      limit: 20,
      depth: 1,
      select: ARTICLE_CARD_SELECT,
    });
    return res.docs.map((a) => formatArticle(a)).filter(Boolean) as ComponentArticle[];
  };

  const [newsArticlesRaw, featuresArticlesRaw, sportsArticlesRaw, opinionArticlesRaw] = await Promise.all([
    fetchRecent('news'),
    fetchRecent('features'),
    fetchRecent('sports'),
    fetchRecent('opinion'),
  ]);

  const recentPool = dedupeArticles([
    ...newsArticlesRaw,
    ...featuresArticlesRaw,
    ...sportsArticlesRaw,
    ...opinionArticlesRaw,
  ]);

  const topStoryList = fillArticles(
    [
      getLayoutArticle(layout.top1),
      getLayoutArticle(layout.top2),
      getLayoutArticle(layout.top3),
      getLayoutArticle(layout.top4),
    ],
    recentPool,
    4,
    [mainArticle.id],
  );

  const topStories = {
    lead: mainArticle,
    list: topStoryList,
  };

  const pinnedLayoutArticles = dedupeArticles([
    mainArticle,
    getLayoutArticle(layout.top1),
    getLayoutArticle(layout.top2),
    getLayoutArticle(layout.top3),
    getLayoutArticle(layout.top4),
    getLayoutArticle(layout.op1),
    getLayoutArticle(layout.op2),
    getLayoutArticle(layout.op3),
    getLayoutArticle(layout.op4),
    getLayoutArticle(layout.special),
  ]);

  const homepageUsedIds = [
    ...pinnedLayoutArticles.map((article) => article.id),
  ];

  const newsArticles = excludeUsedSectionArticles(newsArticlesRaw, homepageUsedIds, 9);
  const featuresArticles = excludeUsedSectionArticles(featuresArticlesRaw, homepageUsedIds, 9);
  const sportsArticles = excludeUsedSectionArticles(sportsArticlesRaw, homepageUsedIds, 9);
  const opinionArticles = excludeUsedSectionArticles(opinionArticlesRaw, homepageUsedIds, 9);
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'The Polytechnic',
    url: '/',
    description: "Rensselaer Polytechnic Institute's independent student newspaper, serving the RPI community since 1885.",
    foundingDate: '1885',
  };

  return (
    <main className="min-h-screen bg-bg-main transition-colors duration-300">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, '\\u003c') }}
      />
      <Header />
      <FrontPage
        topStories={topStories}
        sections={{
          news: newsArticles,
          features: featuresArticles,
          sports: sportsArticles,
          opinion: opinionArticles,
        }}
      />
      <Footer />
    </main>
  );
}

  
