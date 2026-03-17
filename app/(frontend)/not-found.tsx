import React from 'react';
import Header from '@/components/Header';
import SearchInput from '@/components/SearchInput';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-bg-main transition-colors duration-300">
      <Header compact />
      <div className="mx-auto max-w-[1280px] px-4 md:px-6 pt-3 pb-16">
        <div className="mb-8 pt-4">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-text-main">
            404
          </h1>
          <p className="mt-2 font-copy text-base text-text-muted">
            The page you&apos;re looking for doesn&apos;t exist. Try searching for what you need below.
          </p>
        </div>
        <SearchInput />
      </div>
    </main>
  );
}
