import React from 'react';
import Header from '@/components/Header';

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-gray-200">
      <Header />
      <main className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-10">
        {children}
      </main>
    </div>
  );
}
