import type { Metadata } from 'next';
import ArchivePage, { generateMetadata as generateArchiveMetadata } from '../archive/page';

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await generateArchiveMetadata()

  return {
    ...metadata,
    alternates: { canonical: '/archives' },
    openGraph: {
      ...metadata.openGraph,
      url: '/archives',
    },
  }
}

// Next.js (especially Turbopack) requires literal values for route configs
export const revalidate = 60;

export default ArchivePage;
