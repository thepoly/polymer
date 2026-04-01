import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArchiveTimeMachinePage from '@/components/Archive/ArchiveTimeMachinePage';
import { getArchiveArticlesForDate, getArchivePublicationCounts, getArchivePublicationDates, getTodayArchiveDateKey } from '@/lib/archive';
import { resolveArchiveDateQuery } from '@/lib/archiveDateQuery';
import { getSeo } from '@/lib/getSeo';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeo()

  return {
    title: seo.pages.archiveTitle,
    description: seo.pages.archiveDescription,
    alternates: { canonical: '/archive' },
    openGraph: {
      title: `${seo.pages.archiveTitle} — ${seo.siteIdentity.siteName}`,
      description: seo.pages.archiveDescription,
      type: 'website',
      url: '/archive',
    },
  }
}

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
