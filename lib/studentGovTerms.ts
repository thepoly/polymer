import type { Payload } from 'payload'
import type { StudentGovBody } from '@/components/News/studentGov'
import { normalizeTerm, type StudentGovTerm } from '@/components/News/studentGovTerms'

/** Every stored term for a body (or both), oldest first */
export async function getStoredTerms(payload: Payload, body?: StudentGovBody): Promise<StudentGovTerm[]> {
  try {
    const res = await payload.find({
      collection: 'student-gov-terms',
      where: body ? { body: { equals: body } } : undefined,
      sort: 'startsOn',
      limit: 500,
      depth: 0,
    })
    return res.docs
      .map((doc) => normalizeTerm(doc as unknown as Record<string, unknown>))
      .filter((t): t is StudentGovTerm => t !== null)
  } catch {
    // Table may not exist yet (before the migration runs)
    return []
  }
}
