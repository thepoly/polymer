import { StudentGovTimelinePage, studentGovMetadata } from '@/lib/studentGovPage'

export const revalidate = 60

export const metadata = studentGovMetadata('eboard')

/** The Executive Board in session */
export default function ExecutiveBoardTimelinePage() {
  return <StudentGovTimelinePage body="eboard" />
}
