import React from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import SearchInput from '@/components/SearchInput';
import { sanitizeSearchQuery } from '@/utils/search';
import { getSeo } from '@/lib/getSeo';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeo()

  return {
    title: seo.pages.searchTitle,
    description: seo.pages.searchDescription,
    robots: { index: false },
    alternates: { canonical: '/search' },
  }
}

type Args = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: Args) {
  const { q } = await searchParams;
  const query = sanitizeSearchQuery(q);

  return (
    <main className="min-h-screen bg-bg-main transition-colors duration-300">
      <Header compact />
      <div className="mx-auto max-w-[1280px] px-4 md:px-6 pt-20 pb-16">
        <SearchInput defaultValue={query} />
      </div>
    </main>
  );
}
