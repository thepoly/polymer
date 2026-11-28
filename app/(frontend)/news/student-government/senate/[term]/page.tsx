import type { Metadata } from 'next'
import { StudentGovTimelinePage, studentGovMetadata } from '@/lib/studentGovPage'

export const revalidate = 60

type Props = { params: Promise<{ term: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return studentGovMetadata('senate', (await params).term)
}

/** A past Senate by number: /news/student-government/senate/56 */
export default async function SenateTermPage({ params }: Props) {
  return <StudentGovTimelinePage body="senate" segment={(await params).term} />
}
