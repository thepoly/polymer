import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import EventSubmitForm from '@/components/Features/EventSubmitForm';
import type { Metadata } from 'next';
import { getSeo } from '@/lib/getSeo';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeo()

  return {
    title: seo.pages.featuresSubmitEventTitle,
    description: seo.pages.featuresSubmitEventDescription,
    alternates: { canonical: '/features/submit-event' },
  }
}

export default function SubmitEventPage() {
  return (
    <main className="min-h-screen bg-bg-main transition-colors duration-300 flex flex-col">
      <Header />
      <div className="flex-1">
        <EventSubmitForm />
      </div>
      <Footer />
    </main>
  );
}
