import { StudentGovTimelinePage, studentGovMetadata } from '@/lib/studentGovPage'

export const revalidate = 60

export const metadata = studentGovMetadata('senate')

/** The Senate in session */
export default function SenateTimelinePage() {
  return <StudentGovTimelinePage body="senate" />
}
