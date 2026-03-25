import ArchivePage, { metadata as archiveMetadata } from '../archive/page';

export const metadata = {
  ...archiveMetadata,
  alternates: { canonical: '/archives' },
  openGraph: {
    ...archiveMetadata.openGraph,
    url: '/archives',
  },
};

// Next.js (especially Turbopack) requires literal values for route configs
export const revalidate = 60;

export default ArchivePage;
