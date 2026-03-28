import React from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import SearchInput from '@/components/SearchInput';
import NotFoundAnalytics from '@/components/analytics/NotFoundAnalytics';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-bg-main transition-colors duration-300">
      <NotFoundAnalytics />
      <Header compact />
      <div className="mx-auto max-w-[1280px] px-4 md:px-6 pt-3 pb-16">
        <div className="mb-14 pt-16 text-center">
          <div className="overflow-hidden mb-6">
            <h1 className="font-meta font-bold leading-[0.82] tracking-[0.02em] text-accent text-[72px] sm:text-[96px] md:text-[120px]">
              404
            </h1>
          </div>
          <p className="font-meta text-[14px] md:text-[15px] text-accent tracking-[0.04em]">
            The page you&apos;re looking for doesn&apos;t exist. Try searching for what you need below, or read <Link href="/" className="underline hover:opacity-70 transition-opacity">today&apos;s paper</Link>.
          </p>
        </div>
        <SearchInput autoFocus forceRainbow />
      </div>
    </main>
  );
}
