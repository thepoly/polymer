import React from 'react';
import { getPayload } from 'payload';
import config from '@/payload.config';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FeaturesListPage, { type ArchiveFilter } from '@/components/Features/FeaturesListPage';
import { formatArticle } from '@/utils/formatArticle';
import type { Article as ComponentArticle } from '@/components/FrontPage/types';
import type { Metadata } from 'next';
import { getSeo } from '@/lib/getSeo';
import { FEATURES_DEPARTMENTS, departmentOf } from '@/lib/featuresDepartments';

/*
 * The Features archive: every Features story, newest first, with a filter for
 * each section of the Features page (All, Campus Life, Arts & Culture,
 * People, Photo Short Stories). A filter is a link, `?section=<key>`, so the
 * Features page's "All N …" links open the archive with theirs already on,
 * and a filtered list can be shared. Stories are sorted into sections by
 * kicker, as `departmentOf` sorts them.
 */

export const revalidate = 60;

type Props = { searchParams?: Promise<{ section?: string }> };

const departmentFor = async (searchParams: Props['searchParams']) => {
  const key = (await searchParams)?.section;
  return FEATURES_DEPARTMENTS.find((d) => d.key === key) ?? null;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const seo = await getSeo()
  const department = await departmentFor(searchParams)
  if (department) {
    return {
      title: `${department.name} | Features`,
      description: seo.pages.featuresArchiveDescription,
      alternates: { canonical: `/features/archive?section=${department.key}` },
    }
  }

  return {
    title: seo.pages.featuresArchiveTitle,
    description: seo.pages.featuresArchiveDescription,
    alternates: { canonical: '/features/archive' },
  }
}

export default async function FeaturesArchivePage({ searchParams }: Props) {
  const payload = await getPayload({ config });
  const department = await departmentFor(searchParams);

  const response = await payload.find({
    collection: 'articles',
    where: {
      and: [
        { section: { equals: 'features' } },
        { _status: { equals: 'published' } },
      ],
    },
    sort: '-publishedDate',
    limit: 200,
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

  // How many stories each filter would show; a section with none gets no filter
  const counts = new Map<string, number>();
  for (const a of response.docs) {
    const key = departmentOf(a.kicker);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const filters: ArchiveFilter[] = [
    { key: 'all', label: 'All', count: response.docs.length, href: '/features/archive', active: !department },
    ...FEATURES_DEPARTMENTS.filter((d) => counts.has(d.key) || d.key === department?.key).map((d) => ({
      key: d.key,
      label: d.name,
      count: counts.get(d.key) ?? 0,
      href: `/features/archive?section=${d.key}`,
      active: d.key === department?.key,
    })),
  ];

  const articles = response.docs
    .filter((a) => !department || departmentOf(a.kicker) === department.key)
    // An archive: every story gets its publish date, like the Opinion lists
    .map((a) => formatArticle(a, { absoluteDate: true }))
    .filter((a): a is ComponentArticle => a !== null);

  return (
    <main className="min-h-screen bg-bg-main transition-colors duration-300">
      <Header />
      {/* Keyed by filter, so switching filters starts again at the first page */}
      <FeaturesListPage key={department?.key ?? 'all'} title="Features Archive" filters={filters} articles={articles} />
      <Footer />
    </main>
  );
}
