import { permanentRedirect } from 'next/navigation'

/**
 * /news/student-government has no page of its own: the Senate and Executive
 * Board timelines live below it, and their boxes are on /news.
 */
export default function StudentGovernmentPage() {
  permanentRedirect('/news')
}
