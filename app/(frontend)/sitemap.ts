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

  // Published articles
  const articles = await payload.find({
    collection: 'articles',
    where: { _status: { equals: 'published' } },
    sort: '-publishedDate',
    limit: 5000,
    select: {
      slug: true,
      section: true,
      publishedDate: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const articlePages: MetadataRoute.Sitemap = articles.docs
    .filter((doc) => doc.slug && doc.section)
    .map((doc) => ({
      url: `${siteUrl}${getArticleUrl(doc)}`,
      lastModified: new Date(doc.updatedAt),
      changeFrequency: 'yearly' as const,
      priority: 0.7,
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
