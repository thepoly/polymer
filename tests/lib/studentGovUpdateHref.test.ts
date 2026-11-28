import { describe, expect, it } from 'vitest'
import { normalizeTerm, updateTermHref } from '@/components/News/studentGovTerms'

const terms = [
  { body: 'senate', number: 57, startsOn: '2026-04-09T12:00:00Z' },
  { body: 'senate', number: 58, startsOn: '2027-04-08T12:00:00Z' },
].map(t => normalizeTerm(t)!)
const afterRollover = new Date('2027-04-08T12:00:00Z')

describe('docket update term links', () => {
  it('keeps outgoing updates linked after the first meeting rollover', () => {
    expect(updateTermHref(terms, '2027-04-07T23:00:00Z', 7, afterRollover))
      .toBe('/news/student-government/senate/57#update-7')
    expect(updateTermHref(terms, '2027-04-08T12:00:00Z', 8, afterRollover))
      .toBe('/news/student-government/senate#update-8')
  })

  it('uses the Troy calendar day rather than UTC midnight at the boundary', () => {
    expect(updateTermHref(terms, '2027-04-08T02:00:00Z', 7, afterRollover))
      .toBe('/news/student-government/senate/57#update-7')
  })

  it('does not link to nonexistent, unlisted, or not-yet-started term pages', () => {
    expect(updateTermHref(terms, '2010-04-01T12:00:00Z', 1, afterRollover)).toBeNull()
    expect(updateTermHref([{ ...terms[0], hasCoverage: false }, terms[1]], '2026-05-01T12:00:00Z', 1, afterRollover)).toBeNull()
    expect(updateTermHref(terms, '2027-04-08T12:00:00Z', 1, new Date('2027-04-01T12:00:00Z'))).toBeNull()
  })
})
