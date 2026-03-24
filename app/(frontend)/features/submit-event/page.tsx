import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import EventSubmitForm from '@/components/Features/EventSubmitForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Submit an Event',
  description: 'Submit an event to be featured by The Polytechnic.',
  alternates: { canonical: '/features/submit-event' },
};

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
