import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SubmitForm from '@/components/SubmitForm';
import type { Metadata } from 'next';
import { getSeo } from '@/lib/getSeo';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeo()

  return {
    title: seo.pages.submitTitle,
    description: seo.pages.submitDescription,
    alternates: { canonical: '/submit' },
  }
}

export default function SubmitPage() {
  return (
    <main className="min-h-screen bg-bg-main transition-colors duration-300 flex flex-col">
      <Header />
      <div className="flex-1">
        <SubmitForm />
      </div>
      <Footer />
    </main>
  );
}
