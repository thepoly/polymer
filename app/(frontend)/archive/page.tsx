import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArchiveTimeMachinePage from '@/components/Archive/ArchiveTimeMachinePage';
import { getArchiveArticlesForDate, getArchivePublicationCounts, getArchivePublicationDates, getTodayArchiveDateKey } from '@/lib/archive';
import { resolveArchiveDateQuery } from '@/lib/archiveDateQuery';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Archive',
  description: 'Browse The Polytechnic by publication date with the archive time machine.',
  alternates: { canonical: '/archive' },
  openGraph: {
    title: 'Archive — The Polytechnic',
    description: 'Browse The Polytechnic by publication date with the archive time machine.',
    type: 'website',
    url: '/archive',
  },
};

export default async function ArchivePage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string; source?: string }>;
}) {
  const availableDates = await getArchivePublicationDates();
  const publicationCounts = await getArchivePublicationCounts();
  const todayKey = getTodayArchiveDateKey();
  const params = await searchParams;
  const requestedDate = typeof params?.date === 'string' ? params.date : '';
  const requestedSource = typeof params?.source === 'string' ? params.source : '';
  const defaultInitialDate = [...availableDates].reverse().find((date) => date <= todayKey)
    ?? availableDates[availableDates.length - 1]
    ?? '';
  const resolvedDateQuery = requestedDate
    ? resolveArchiveDateQuery(availableDates, requestedDate)
    : null;
  const initialDate = resolvedDateQuery?.status === 'ok'
    ? resolvedDateQuery.date
    : resolvedDateQuery?.status === 'pre-archive'
      ? availableDates[0] ?? defaultInitialDate
      : defaultInitialDate;
  const initialArticles = initialDate ? await getArchiveArticlesForDate(initialDate) : [];

  return (
    <main className="min-h-screen bg-bg-main transition-colors duration-300">
      <Header />
      <ArchiveTimeMachinePage
        availableDates={availableDates}
        publicationCounts={publicationCounts}
        initialDate={initialDate}
        initialArticles={initialArticles}
        initialQuery={requestedDate}
        initialQuerySource={requestedSource}
        initialQueryStatus={resolvedDateQuery?.status ?? null}
      />
      <Footer />
    </main>
  );
}
