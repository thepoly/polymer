import type { Metadata } from 'next';
import SearchOverlay from '@/components/SearchOverlay';
import { getSeo } from '@/lib/getSeo';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeo()

  return {
    title: seo.pages.searchTitle,
    description: seo.pages.searchDescription,
    robots: { index: false },
    alternates: { canonical: '/search' },
  }
}

// The search overlay on a solid background. Reads ?q= itself so it can pick up
// the overlay's results and scroll position (see SearchOverlay's handoff).
export default function SearchPage() {
  return (
    <main>
      <SearchOverlay variant="page" />
    </main>
  );
}
