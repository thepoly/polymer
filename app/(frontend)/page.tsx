export const revalidate = 60;
import type { Metadata } from "next";
import Header from "@/components/Header";
import ArticleStaticHeader from "@/components/Article/ArticleStaticHeader";
import Footer from "@/components/Footer";
import FrontPage, { SectionBlock } from "@/components/FrontPage";
import { GeminiHomepage } from "@/components/FrontPage/GeminiHomepage";
import { GridLayout, type GridRow } from "@/components/FrontPage/GridLayout";
import { DynamicSectionHeader } from "@/components/FrontPage/DynamicSectionHeader";
import { type LiveArticleStripEntry } from "@/components/LiveStrip";
import { formatRelativeTime } from "@/components/LiveArticle/relativeTime";
import { getPayload } from "payload";
import config from "@/payload.config";
import { Article as ComponentArticle } from "@/components/FrontPage/types";
import { formatArticle } from "@/utils/formatArticle";
import { getSeo } from "@/lib/getSeo";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeo()

  return {
    description: seo.siteIdentity.defaultDescription,
    alternates: { canonical: '/' },
    openGraph: {
      title: seo.siteIdentity.siteName,
      description: seo.siteIdentity.defaultDescription,
      type: 'website',
      url: '/',
    },
  }
}

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


const ARTICLE_CARD_SELECT = {
  title: true,
  slug: true,
  subdeck: true,
  featuredImage: true,
  imageCaption: true,
  section: true,
  kicker: true,
  publishedDate: true,
  createdAt: true,
  authors: true,
  writeInAuthors: true,
  isFollytechnic: true,
} as const;

type LayoutArticleRelation = number | { id: number } | null | undefined;

type SectionLayoutConfig = {
  skeleton: string;
  pinnedArticles: number[];
};

type HomepageLayout = {
  skeleton?: string | null;
  grid?: GridRow[] | null;
  sectionLayouts?: Record<string, SectionLayoutConfig> | null;
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
  // `liveArticles` is provided by the parallel-agent-authored `live-articles`
  // collection + layout field. We type it defensively here since its schema
  // is not yet merged into this worktree's generated payload-types.
  liveArticles?: Array<
    | string
    | number
    | {
        id: string | number;
        slug?: string | null;
        section?: string | null;
        publishedDate?: string | null;
        updatedAt?: string | null;
        updates?: Array<{ timestamp?: string | null }> | null;
      }
  > | null;
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

const getGridArticleIds = (grid: GridRow[]): number[] => {
  const ids: number[] = [];
  const walkCells = (cells: GridRow['cells']) => {
    for (const cell of cells) {
      if (cell.articleId) ids.push(cell.articleId);
      if (cell.children) walkCells(cell.children);
    }
  };
  for (const row of grid) {
    walkCells(row.cells);
  }
  return ids;
};

export default async function Home() {
  const payload = await getPayload({ config });
  const seo = await getSeo();

  const layoutResponse = await payload.find({
    collection: 'layout',
    limit: 1,
    // depth: 1 so the `liveArticles` hasMany relation comes back populated
    // from the parallel-agent-authored `live-articles` collection.
    depth: 1,
    select: {
      skeleton: true,
      grid: true,
      sectionLayouts: true,
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
      // liveArticles is not yet in this worktree's generated Payload types
      // (the backend agent is adding it in parallel). Cast to satisfy TS.
      ...({ liveArticles: true } as Record<string, true>),
    },
  });

  const layout = layoutResponse.docs[0] as HomepageLayout | undefined;

  // Defensive mapping: the `liveArticles` relationship may not yet exist in
  // this worktree's schema; only populated object entries contribute.
  type LiveMediaSize = { url?: string | null };
  type LiveMedia = {
    url?: string | null;
    sizes?: {
      card?: LiveMediaSize | null;
      gallery?: LiveMediaSize | null;
    } | null;
  };
  type LiveArticleRelationEntry =
    | string
    | number
    | {
        id: string | number;
        slug?: string | null;
        section?: string | null;
        publishedDate?: string | null;
        updatedAt?: string | null;
        updates?: Array<{ timestamp?: string | null }> | null;
        hero?: number | string | LiveMedia | null;
      };
  const rawLiveArticles = (layout?.liveArticles ?? []) as LiveArticleRelationEntry[];
  const liveStripEntries: LiveArticleStripEntry[] = rawLiveArticles
    .filter(
      (
        entry,
      ): entry is {
        id: string | number;
        slug: string;
        section: string;
        publishedDate?: string | null;
        updatedAt?: string | null;
        updates?: Array<{ timestamp?: string | null }> | null;
        hero?: number | string | LiveMedia | null;
      } =>
        typeof entry === "object" &&
        entry !== null &&
        typeof entry.slug === "string" &&
        typeof entry.section === "string",
    )
    .map((entry) => {
      const timestamps = (entry.updates ?? [])
        .map((u) => (u?.timestamp ? new Date(u.timestamp).getTime() : NaN))
        .filter((t) => !Number.isNaN(t));
      const lastUpdateMs = timestamps.length > 0 ? Math.max(...timestamps) : NaN;
      const fallbackMs = entry.publishedDate
        ? new Date(entry.publishedDate).getTime()
        : entry.updatedAt
          ? new Date(entry.updatedAt).getTime()
          : NaN;
      const latestMs = Number.isNaN(lastUpdateMs) ? fallbackMs : lastUpdateMs;
      const lastUpdatedLabel = Number.isNaN(latestMs)
        ? undefined
        : formatRelativeTime(new Date(latestMs));
      const hero =
        entry.hero && typeof entry.hero === "object"
          ? (entry.hero as LiveMedia)
          : null;
      const imageUrl =
        hero?.sizes?.card?.url || hero?.url || undefined;
      return {
        id: String(entry.id),
        slug: entry.slug,
        section: entry.section,
        lastUpdatedLabel,
        imageUrl: imageUrl ?? undefined,
      };
    });

  if (!layout) {
    return (
      <main className="min-h-screen flex flex-col bg-bg-main transition-colors duration-300 pt-[56px]">
        <ArticleStaticHeader alwaysVisible />
        <Header liveEntries={liveStripEntries} />
        <div className="flex flex-col items-center justify-center flex-1 px-4 text-center">
          <h1 className="font-display text-[28px] md:text-[36px] font-bold text-text-main mb-3">We&apos;ll be right back</h1>
          <p className="font-copy text-[15px] md:text-[17px] text-text-muted max-w-md">The Polytechnic is currently under maintenance. Please check back shortly.</p>
        </div>
        <Footer />
      </main>
    );
  }

  // Determine if we have a grid layout
  const hasGrid = layout.grid && Array.isArray(layout.grid) && layout.grid.length > 0;
  const gridRows = hasGrid ? layout.grid as GridRow[] : [];

  // Extract IDs from aries grid JSON (object format: { lead, left, right, bottom })
  const ariesGridIds: number[] = [];
  if (layout.grid && typeof layout.grid === 'object' && !Array.isArray(layout.grid) && 'lead' in layout.grid) {
    const g = layout.grid as { lead?: number | null; left?: (number | null)[]; right?: (number | null)[]; bottom?: (number | null)[] };
    if (g.lead) ariesGridIds.push(g.lead);
    for (const id of (g.left || [])) if (id) ariesGridIds.push(id);
    for (const id of (g.right || [])) if (id) ariesGridIds.push(id);
    for (const id of (g.bottom || [])) if (id) ariesGridIds.push(id);
  }

  // Collect section pinned article IDs
  const sectionPinnedIds: number[] = [];
  if (layout.sectionLayouts) {
    for (const sec of Object.values(layout.sectionLayouts)) {
      if (sec.pinnedArticles) {
        for (const id of sec.pinnedArticles) if (id) sectionPinnedIds.push(id);
      }
    }
  }

  // Collect all article IDs we need to fetch
  const gridArticleIds = hasGrid ? getGridArticleIds(gridRows) : [];
  const legacyArticleIds = getLayoutArticleIds(layout);
  const allLayoutIds = [...new Set([...gridArticleIds, ...legacyArticleIds, ...ariesGridIds, ...sectionPinnedIds])];

  // Fetch layout articles
  const layoutArticles = allLayoutIds.length > 0
    ? await payload.find({
        collection: "articles",
        where: {
          and: [
            { id: { in: allLayoutIds } },
            { _status: { equals: "published" } },
          ],
        },
        sort: "-publishedDate",
        limit: allLayoutIds.length,
        depth: 2,
        select: ARTICLE_CARD_SELECT,
      })
    : { docs: [] };

  const layoutArticleMap = new Map(
    layoutArticles.docs.map((article) => [article.id, formatArticle(article)]),
  );

  // Fetch section articles
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

  // IDs used in the hero area (exclude from section auto-fill, but section pins are fine)
  const heroUsedIds = [...new Set([...gridArticleIds, ...legacyArticleIds, ...ariesGridIds])];

  // Track all IDs shown so far (hero + earlier sections) to avoid repeats
  const pageUsedIds = new Set<string>(heroUsedIds.map(String));

  // Build section articles respecting:
  // 1. Pinned articles stay in their exact slot position
  // 2. Empty slots auto-fill from recent articles
  // 3. Taurus shape: slot 0 = feature (prefer image), slots 1+ = text-only preferred
  // 4. Articles already shown elsewhere on the page are excluded from auto-fill
  const buildSectionArticles = (
    section: string,
    recentArticles: ComponentArticle[],
  ): ComponentArticle[] => {
    const sectionConfig = layout.sectionLayouts?.[section];
    const skel = sectionConfig?.skeleton || 'taurus';
    const rawPins = sectionConfig?.pinnedArticles || [];
    const totalSlots = Math.max(9, rawPins.length);

    // Build the slot array: pinned articles in their positions, null for empty slots
    const slots: (ComponentArticle | null)[] = [];
    for (let i = 0; i < totalSlots; i++) {
      const pinnedId = rawPins[i];
      if (pinnedId) {
        const article = layoutArticleMap.get(pinnedId);
        slots.push(article ?? null);
      } else {
        slots.push(null);
      }
    }

    // Collect IDs already placed (pinned + elsewhere on page) for exclusion
    const excludeSet = new Set<string>([...pageUsedIds]);
    for (const slot of slots) {
      if (slot) excludeSet.add(String(slot.id));
    }

    // Available articles for auto-fill, excluding already-used
    const available = recentArticles.filter((a) => !excludeSet.has(String(a.id)));

    if (skel === 'taurus') {
      const withImages = available.filter((a) => a.image);
      const withoutImages = available.filter((a) => !a.image);
      let imgIdx = 0;
      let txtIdx = 0;

      for (let i = 0; i < totalSlots; i++) {
        if (slots[i]) continue; // pinned — skip
        if (i === 0) {
          // Feature slot: prefer article with image
          if (imgIdx < withImages.length) {
            slots[i] = withImages[imgIdx++];
          } else if (txtIdx < withoutImages.length) {
            slots[i] = withoutImages[txtIdx++];
          }
        } else {
          // Supporting/list slots: prefer text-only
          if (txtIdx < withoutImages.length) {
            slots[i] = withoutImages[txtIdx++];
          } else if (imgIdx < withImages.length) {
            slots[i] = withImages[imgIdx++];
          }
        }
      }
    } else {
      let availIdx = 0;
      for (let i = 0; i < totalSlots; i++) {
        if (slots[i]) continue;
        if (availIdx < available.length) {
          slots[i] = available[availIdx++];
        }
      }
    }

    // Collect all IDs used in this section into pageUsedIds
    const result: ComponentArticle[] = [];
    for (const slot of slots) {
      if (slot) {
        result.push(slot);
        pageUsedIds.add(String(slot.id));
      }
    }
    return result;
  };

  const newsArticles = buildSectionArticles('news', newsArticlesRaw);
  const featuresArticles = buildSectionArticles('features', featuresArticlesRaw);
  const sportsArticles = buildSectionArticles('sports', sportsArticlesRaw);
  const opinionArticles = buildSectionArticles('opinion', opinionArticlesRaw);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://poly.rpi.edu';

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: seo.siteIdentity.siteName,
    url: siteUrl,
  };

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: seo.siteIdentity.siteName,
    url: siteUrl,
    description: seo.siteIdentity.organizationDescription,
    foundingDate: '1885',
  };

  // Shared section blocks for all skeletons
  const sectionBlocks = (
    <div className="relative z-[0] md:mt-6 flex flex-col gap-0 lg:gap-6">
      {newsArticles.length > 0 && (
        <div>
          <DynamicSectionHeader title="News" href="/news" />
          <SectionBlock title="News" articles={newsArticles} />
        </div>
      )}
      {featuresArticles.length > 0 && (
        <div>
          <DynamicSectionHeader title="Features" href="/features" />
          <SectionBlock title="Features" articles={featuresArticles} />
        </div>
      )}
      {opinionArticles.length > 0 && (
        <div>
          <DynamicSectionHeader title="Opinion" href="/opinion" offsetX={2.5} offsetY={-2} />
          <SectionBlock title="Opinion" articles={opinionArticles} />
        </div>
      )}
      {sportsArticles.length > 0 && (
        <div>
          <DynamicSectionHeader title="Sports" href="/sports" offsetX={4.5} />
          <SectionBlock title="Sports" articles={sportsArticles} />
        </div>
      )}
    </div>
  );

  // --- Gemini skeleton: centered hero + cluster of 4 aux headlines ---
  if (
    layout.skeleton === 'gemini' &&
    layout.grid &&
    typeof layout.grid === 'object' &&
    !Array.isArray(layout.grid) &&
    'lead' in layout.grid
  ) {
    const g = layout.grid as {
      lead?: number | null;
      leadImportant?: boolean;
      left?: (number | null)[];
      right?: (number | null)[];
      bottom?: (number | null)[];
      showSubdeck?: Record<string, boolean>;
      leadPhotoPosition?: 'above' | 'below';
    };
    const lead = g.lead ? layoutArticleMap.get(g.lead) ?? null : null;
    if (lead) {
      const resolve = (ids: (number | null)[] | undefined): ComponentArticle[] =>
        (ids || [])
          .map((id) => (id ? layoutArticleMap.get(id) ?? null : null))
          .filter((a): a is ComponentArticle => Boolean(a));

      // Gemini slot shape:
      //   left[0..5]    -> left-column text-only stack (up to 6, all optional)
      //   right[0..4]   -> right-column feature stack (up to 5, all optional)
      //   bottom[0..1]  -> bottom row under left + center (2)
      const leftPinned = resolve((g.left || []).slice(0, 6));
      const rightPinned = resolve((g.right || []).slice(0, 5));
      const bottomPinned = resolve((g.bottom || []).slice(0, 2));

      const recentPool = dedupeArticles(
        [
          ...newsArticlesRaw,
          ...featuresArticlesRaw,
          ...sportsArticlesRaw,
          ...opinionArticlesRaw,
        ],
        [
          lead.id,
          ...leftPinned.map((a) => a.id),
          ...rightPinned.map((a) => a.id),
          ...bottomPinned.map((a) => a.id),
        ],
      );
      // Left stack: pinned only (all 6 slots are optional — no recent-pool fill).
      const leftStack: ComponentArticle[] = leftPinned.slice(0, 6);
      // Right features: pinned only (all 5 slots are optional — no recent-pool fill).
      const rightFeatures: ComponentArticle[] = rightPinned.slice(0, 5);
      const bottomRow: ComponentArticle[] = [
        ...bottomPinned,
        ...recentPool.slice(0, Math.max(0, 2 - bottomPinned.length)),
      ].slice(0, 2);

      const heroUsedForSections = new Set<string>([
        String(lead.id),
        ...leftStack.map((a) => String(a.id)),
        ...rightFeatures.map((a) => String(a.id)),
        ...bottomRow.map((a) => String(a.id)),
      ]);
      const dropGemHero = (arts: ComponentArticle[]) =>
        arts.filter((a) => !heroUsedForSections.has(String(a.id)));
      const gemSectionBlocks = (
        <div className="relative z-[0] md:mt-6 flex flex-col gap-0 lg:gap-6">
          {dropGemHero(newsArticles).length > 0 && (
            <SectionBlock title="News" articles={dropGemHero(newsArticles)} />
          )}
          {dropGemHero(featuresArticles).length > 0 && (
            <SectionBlock title="Features" articles={dropGemHero(featuresArticles)} />
          )}
          {dropGemHero(opinionArticles).length > 0 && (
            <SectionBlock title="Opinion" articles={dropGemHero(opinionArticles)} />
          )}
          {dropGemHero(sportsArticles).length > 0 && (
            <SectionBlock title="Sports" articles={dropGemHero(sportsArticles)} />
          )}
        </div>
      );

      return (
        <main className="min-h-screen bg-bg-main transition-colors duration-300 pt-[56px]">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, '\\u003c') }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, '\\u003c') }} />
          <ArticleStaticHeader alwaysVisible />
        <Header liveEntries={liveStripEntries} />
          <GeminiHomepage
            lead={lead}
            leftStack={leftStack}
            rightFeatures={rightFeatures}
            bottomRow={bottomRow}
            leadImportant={!!g.leadImportant}
            leadPhotoPosition={g.leadPhotoPosition === 'below' ? 'below' : 'above'}
            showSubdeckLead={g.showSubdeck?.lead !== false}
            showSubdeckLeft={Array.from({ length: 6 }, (_, i) => g.showSubdeck?.[`left-${i}`] !== false)}
            showSubdeckRight={Array.from({ length: 5 }, (_, i) => g.showSubdeck?.[`right-${i}`] !== false)}
            showSubdeckBottom={Array.from({ length: 2 }, (_, i) => g.showSubdeck?.[`bottom-${i}`] === true)}
            sectionBlocks={gemSectionBlocks}
          />
          <Footer />
        </main>
      );
    }
  }

  // --- Custom grid skeleton ---
  if (layout.skeleton === 'custom' && hasGrid && gridArticleIds.length > 0) {
    const gridArticleMap = new Map<number, ComponentArticle>();
    for (const [id, article] of layoutArticleMap) {
      if (article) gridArticleMap.set(id as number, article);
    }

    return (
      <main className="min-h-screen bg-bg-main transition-colors duration-300 pt-[56px]">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, '\\u003c') }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, '\\u003c') }} />
        <ArticleStaticHeader alwaysVisible />
        <Header liveEntries={liveStripEntries} />
        <div className="w-full bg-bg-main text-text-main transition-colors duration-300">
          <div className="mx-auto max-w-[1280px] px-4 pb-14 md:px-6 xl:px-[30px]">
            <div data-frontpage-top className="pt-5 md:pt-7">
              <GridLayout rows={gridRows} articleMap={gridArticleMap} />
            </div>
            {sectionBlocks}
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  // --- Aries skeleton OR legacy slot-based layout (fallback) ---
  const getLayoutArticle = (value: LayoutArticleRelation) => {
    const relationId = getRelationId(value);
    return relationId ? layoutArticleMap.get(relationId) ?? null : null;
  };

  const mainArticle = getLayoutArticle(layout.mainArticle);

  if (!mainArticle) {
    return (
      <main className="min-h-screen flex flex-col bg-bg-main transition-colors duration-300 pt-[56px]">
        <ArticleStaticHeader alwaysVisible />
        <Header liveEntries={liveStripEntries} />
        <div className="flex flex-col items-center justify-center flex-1 px-4 text-center">
          <h1 className="font-display text-[28px] md:text-[36px] font-bold text-text-main mb-3">We&apos;ll be right back</h1>
          <p className="font-copy text-[15px] md:text-[17px] text-text-muted max-w-md">The Polytechnic is currently under maintenance. Please check back shortly.</p>
        </div>
        <Footer />
      </main>
    );
  }

  const recentPool = dedupeArticles([
    ...newsArticlesRaw,
    ...featuresArticlesRaw,
    ...sportsArticlesRaw,
    ...opinionArticlesRaw,
  ]);

  // Check for aries grid JSON with left/right column data
  const ariesGrid = layout.skeleton === 'aries' && layout.grid && typeof layout.grid === 'object' && !Array.isArray(layout.grid) && 'lead' in layout.grid
    ? layout.grid as { lead?: number | null; leadImportant?: boolean; left?: (number | null)[]; right?: (number | null)[]; bottom?: (number | null)[] }
    : null;

  type TopStories = { lead: NonNullable<typeof mainArticle>; list: NonNullable<typeof mainArticle>[]; heroLeft?: NonNullable<typeof mainArticle>[]; heroRight?: NonNullable<typeof mainArticle>[]; bottomRow?: (NonNullable<typeof mainArticle> | null)[]; leadImportant?: boolean };
  let topStories: TopStories;

  if (ariesGrid) {
    // Aries mode: build left/right columns from grid JSON
    const resolveIds = (ids: (number | null)[] | undefined) =>
      (ids || []).map((id) => id ? layoutArticleMap.get(id) ?? null : null);
    const heroLeft = resolveIds(ariesGrid.left);
    const heroRight = resolveIds(ariesGrid.right);
    const bottomRow = resolveIds(ariesGrid.bottom);
    topStories = {
      lead: mainArticle,
      list: [...heroLeft, ...heroRight].filter((article): article is NonNullable<typeof mainArticle> => article !== null),
      heroLeft: fillArticles(
        heroLeft.filter((article): article is NonNullable<typeof mainArticle> => article !== null),
        recentPool,
        heroLeft.filter((article) => article !== null).length || 2,
        [mainArticle.id],
      ),
      heroRight: fillArticles(
        heroRight.filter((article): article is NonNullable<typeof mainArticle> => article !== null),
        recentPool,
        heroRight.filter((article) => article !== null).length || 2,
        [mainArticle.id, ...heroLeft.filter((article): article is NonNullable<typeof mainArticle> => article !== null).map(a => a.id)],
      ),
      ...(bottomRow.length > 0 ? { bottomRow } : {}),
      leadImportant: !!ariesGrid.leadImportant,
    };
  } else {
    // Legacy: 4 fixed hero slots
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
    topStories = { lead: mainArticle, list: topStoryList };
  }

  // Exclude all articles already shown in the hero from the section blocks.
  // heroUsedIds only covers pinned IDs; fillArticles may have auto-filled others.
  const heroArticleIds = new Set<string>([
    String(topStories.lead.id),
    ...(topStories.heroLeft || []).map((a) => String(a.id)),
    ...(topStories.heroRight || []).map((a) => String(a.id)),
    ...(topStories.list || []).map((a) => String(a.id)),
    ...(topStories.bottomRow || []).filter((a) => a !== null).map((a) => String(a.id)),
  ]);
  const dropHero = (arts: typeof newsArticles) => arts.filter((a) => !heroArticleIds.has(String(a.id)));

  return (
    <main className="min-h-screen bg-bg-main transition-colors duration-300 pt-[56px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, '\\u003c') }} />
      <ArticleStaticHeader alwaysVisible />
        <Header liveEntries={liveStripEntries} />
      <FrontPage
        topStories={topStories}
        layoutName={layout.skeleton === 'taurus' ? 'taurus' : 'aries'}
        sections={{
          news: dropHero(newsArticles),
          features: dropHero(featuresArticles),
          sports: dropHero(sportsArticles),
          opinion: dropHero(opinionArticles),
        }}
      />
      <Footer />
    </main>
  );
}
