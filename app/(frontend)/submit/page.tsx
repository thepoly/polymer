import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SubmitForm from '@/components/SubmitForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Submit',
  description: 'Submit an article, letter to the editor, or opinion piece to The Polytechnic.',
  alternates: { canonical: '/submit' },
};

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
