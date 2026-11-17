import type { Metadata } from 'next';
import { getSeo } from '@/lib/getSeo';
import { renderOpinionList, type OpinionSearchParams } from '@/lib/opinionListPage';
import { opinionPageNumber } from '@/lib/opinionPagination';
export const revalidate = 60;
export async function generateMetadata({ searchParams }: { searchParams: OpinionSearchParams }): Promise<Metadata> {
  const seo = await getSeo();
  const page = opinionPageNumber((await searchParams).page);
  return {
    title: seo.pages.opinionEditorialsTitle + (page > 1 ? ' - Page ' + page : ''),
    description: seo.pages.opinionEditorialsDescription,
    alternates: { canonical: '/opinion/editorials' + (page > 1 ? '?page=' + page : '') },
  };
}
export default function Page({ searchParams }: { searchParams: OpinionSearchParams }) {
  return renderOpinionList('editorials', searchParams);
}
