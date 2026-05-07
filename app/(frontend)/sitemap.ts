import type { MetadataRoute } from 'next';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { getArticleUrl } from '@/utils/getArticleUrl';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://poly.rpi.edu';
  const payload = await getPayload({ config });

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1,
    },
    ...['news', 'sports', 'features', 'opinion'].map((section) => ({
      url: `${siteUrl}/${section}`,
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 0.8,
    })),
    {
      url: `${siteUrl}/staff`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ];

  // Published articles. Paginate so the sitemap covers all 12K+ legacy +
  // native rows (the corpus is well under Google's 50K-URL-per-sitemap
  // cap, but we still need to actually fetch them all rather than trust
  // a single 5000-row page).
  const PAGE_SIZE = 1000;
  const articleDocs: Array<{
    slug?: string | null;
    section?: string | null;
    publishedDate?: string | null;
    createdAt?: string;
    updatedAt?: string;
    legacySource?: string | null;
  }> = [];
  let page = 1;
  while (true) {
    const batch = await payload.find({
      collection: 'articles',
      where: { _status: { equals: 'published' } },
      sort: '-publishedDate',
      limit: PAGE_SIZE,
      page,
      select: {
        slug: true,
        section: true,
        publishedDate: true,
        createdAt: true,
        updatedAt: true,
        legacySource: true,
      },
    });
    articleDocs.push(...(batch.docs as typeof articleDocs));
    if (batch.docs.length < PAGE_SIZE) break;
    if (page >= 50) break; // Hard ceiling — guards against runaway loops.
    page += 1;
  }

  const articlePages: MetadataRoute.Sitemap = articleDocs
    .filter((doc) => doc.slug && doc.section && doc.updatedAt)
    .map((doc) => ({
      url: `${siteUrl}${getArticleUrl(doc as Parameters<typeof getArticleUrl>[0])}`,
      lastModified: new Date(doc.updatedAt as string),
      // Native rows change relatively often; legacy archive rows are frozen
      // and don't need crawler revisits beyond yearly.
      changeFrequency: doc.legacySource ? ('yearly' as const) : ('monthly' as const),
      // Native polymer articles are higher-priority than archived legacy.
      priority: doc.legacySource ? 0.5 : 0.7,
    }));

  // Staff profiles
  const users = await payload.find({
    collection: 'users',
    limit: 500,
    select: {
      slug: true,
      updatedAt: true,
    },
  });

  const staffPages: MetadataRoute.Sitemap = users.docs
    .filter((u) => u.slug)
    .map((u) => ({
      url: `${siteUrl}/staff/${u.slug}`,
      lastModified: new Date(u.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    }));

  return [...staticPages, ...articlePages, ...staffPages];
}
