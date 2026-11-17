import type { Payload } from 'payload'
import type { StudentGovBody } from '@/components/News/studentGov'
import { normalizeTerm, type StudentGovTerm } from '@/components/News/studentGovTerms'
import { collectPages } from './collectPages'

/** Every stored term for a body (or both), oldest first */
export async function getStoredTerms(payload: Payload, body?: StudentGovBody): Promise<StudentGovTerm[]> {
  try {
    const docs = await collectPages((page) => payload.find({
      collection: 'student-gov-terms',
      where: body ? { body: { equals: body } } : undefined,
      sort: ['startsOn', 'id'],
      limit: 500,
      page,
      depth: 0,
    }))
    return docs
      .map((doc) => normalizeTerm(doc as unknown as Record<string, unknown>))
      .filter((t): t is StudentGovTerm => t !== null)
  } catch {
    // Table may not exist yet (before the migration runs)
    return []
  }
}
