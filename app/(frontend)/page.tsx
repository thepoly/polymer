export const revalidate = 0;
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FrontPage from "@/components/FrontPage";
import { getPayload } from "payload";
import config from "@/payload.config";
import { Article as PayloadArticle, Media } from "@/payload-types";
import { Article as ComponentArticle } from "@/components/FrontPage/types";

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

const prioritizeUnusedSectionArticles = (
  articles: ComponentArticle[],
  usedIDs: Array<string | number>,
  count: number,
) => {
  const usedSet = new Set(usedIDs.map(String));
  const unused = articles.filter((article) => !usedSet.has(String(article.id)));
  const used = articles.filter((article) => usedSet.has(String(article.id)));
  return [...unused, ...used].slice(0, count);
};

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
    kicker: article.kicker || null,
    publishedDate: article.publishedDate,
    createdAt: article.createdAt,
  };
};

export default async function Home() {
  const payload = await getPayload({ config });
  
  const layoutResponse = await payload.find({
    collection: 'layout',
    limit: 1,
    depth: 2,
  });

  const layout = layoutResponse.docs[0];

  if (!layout) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center h-[50vh]">
            <p className="text-text-muted font-copy">Please configure the layout in the admin panel.</p>
        </div>
      </main>
    );
  }

  const mainArticle = formatArticle(layout.mainArticle);

  if (!mainArticle) {
    return (
        <main className="min-h-screen bg-white">
          <Header />
          <div className="flex items-center justify-center h-[50vh]">
              <p className="text-text-muted font-copy">Please assign a main article in the layout configuration.</p>
          </div>
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
      depth: 2,
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
      formatArticle(layout.top1),
      formatArticle(layout.top2),
      formatArticle(layout.top3),
      formatArticle(layout.top4),
    ],
    recentPool,
    4,
    [mainArticle.id],
  );

  const topStories = {
    lead: mainArticle,
    list: topStoryList,
  };

  const heroUsedIds = [
    mainArticle.id,
    ...topStoryList.map((article) => article.id),
  ];

  const homepageUsedIds = [
    ...heroUsedIds,
  ];

  const newsArticles = prioritizeUnusedSectionArticles(newsArticlesRaw, homepageUsedIds, 9);
  const featuresArticles = prioritizeUnusedSectionArticles(featuresArticlesRaw, homepageUsedIds, 9);
  const sportsArticles = prioritizeUnusedSectionArticles(sportsArticlesRaw, homepageUsedIds, 9);
  const opinionArticles = prioritizeUnusedSectionArticles(opinionArticlesRaw, homepageUsedIds, 9);
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

  
