import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Copyright',
  description: 'Copyright notice for The Polytechnic.',
  alternates: { canonical: '/copyright' },
};

export default function CopyrightPage() {
  return (
    <main className="min-h-screen bg-bg-main transition-colors duration-300">
      <Header />
      <div className="mx-auto max-w-[680px] px-4 pb-20 pt-6 md:px-6 md:pt-8">
        <div className="mb-8 text-center">
          <h1 className="font-meta font-bold uppercase tracking-[0.02em] leading-[0.9] text-[36px] sm:text-[48px] md:text-[56px]">
            <span className="text-[#b7d7f5] dark:text-[#b7d7f5]">Copyright</span>
          </h1>
          <p className="font-copy text-xl leading-relaxed text-text-main dark:text-[#CCCCCC] mt-3 transition-colors">
            &copy; {new Date().getFullYear()} <i>The Rensselaer Polytechnic</i>
          </p>
        </div>
        <div className="space-y-5 font-copy text-xl leading-relaxed text-text-main dark:text-[#CCCCCC] transition-colors">
          <p>
            All original content on this site, including articles, photographs, graphics, and other
            materials produced by <i>Polytechnic</i> staff, is protected by United States copyright law.
            It may not be reproduced, distributed, or republished without prior written permission.
          </p>
          <p>
            Links to external websites are provided for readers&apos; convenience. The staff of the
            <i>Rensselaer Polytechnic</i> was not involved in producing that content and are not responsible
            for it.
          </p>
          <p>
            For reprint or permissions requests, contact us at{' '}
            <a
              href="mailto:eic@poly.rpi.edu"
              className="text-accent underline underline-offset-2 transition-colors"
            >
              eic@poly.rpi.edu
            </a>
            .
          </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
