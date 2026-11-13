import { StudentGovTimelinePage, studentGovMetadata } from '@/lib/studentGovPage'

export const revalidate = 60

export const metadata = studentGovMetadata('senate')

export default async function SenateTimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string | string[] }>
}) {
  const { year } = await searchParams
  return <StudentGovTimelinePage body="senate" year={typeof year === 'string' ? year : undefined} />
}
