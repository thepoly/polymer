import type { Metadata } from 'next'
import { StudentGovTimelinePage, studentGovMetadata } from '@/lib/studentGovPage'

export const revalidate = 60

type Props = { params: Promise<{ term: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return studentGovMetadata('eboard', (await params).term)
}

/** A past Executive Board by year: /news/student-government/e-board/2025-26 */
export default async function ExecutiveBoardTermPage({ params }: Props) {
  return <StudentGovTimelinePage body="eboard" segment={(await params).term} />
}
