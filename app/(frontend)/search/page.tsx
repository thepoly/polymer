import React from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import SearchInput from '@/components/SearchInput';

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search articles from The Polytechnic, RPI\'s student newspaper.',
  robots: { index: false },
  alternates: { canonical: '/search' },
};

type Args = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: Args) {
  const { q } = await searchParams;
  const query = q?.trim() || '';

  return (
    <main className="min-h-screen bg-bg-main transition-colors duration-300">
      <Header compact />
      <div className="mx-auto max-w-[1280px] px-4 md:px-6 pt-3 pb-16">
        <SearchInput defaultValue={query} />
      </div>
    </main>
  );
}
