import ArchivePage, { metadata as archiveMetadata, revalidate as archiveRevalidate } from '../archive/page';

export const metadata = {
  ...archiveMetadata,
  alternates: { canonical: '/archives' },
  openGraph: {
    ...archiveMetadata.openGraph,
    url: '/archives',
  },
};

export const revalidate = archiveRevalidate;

export default ArchivePage;
