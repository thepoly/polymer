import { describe, expect, it } from 'vitest'
import { departmentOf, semesterOf } from '@/lib/featuresDepartments'

describe('departmentOf', () => {
  it('sorts the kickers Features actually uses', () => {
    expect(departmentOf('Photo Short Story')).toBe('photo')
    expect(departmentOf('On-Campus Event')).toBe('campus')
    expect(departmentOf('Campus Event')).toBe('campus')
    expect(departmentOf('GM Week 2026')).toBe('campus')
    expect(departmentOf('EMPAC')).toBe('arts')
    expect(departmentOf('Food Review')).toBe('arts')
    expect(departmentOf('Downtown Troy')).toBe('arts')
    expect(departmentOf('Collar City Column')).toBe('arts')
    expect(departmentOf('Interview')).toBe('people')
    expect(departmentOf('Alumni')).toBe('people')
  })

  it('sorts the variants staff type, in any case or spelling', () => {
    // Every kind of review is Arts & Culture
    for (const k of ['ALBUM REVIEW', 'Movie Review', 'Restaurant Review', 'TV SERIES REVIEW', 'Game Review', 'Event Review']) {
      expect(departmentOf(k)).toBe('arts')
    }
    expect(departmentOf('Recommendations')).toBe('arts')
    expect(departmentOf("The Poly's Recommendations")).toBe('arts')
    expect(departmentOf('Lesser-Known Locales')).toBe('arts')
    expect(departmentOf('Words to Eat By')).toBe('arts')
    // "event" or "club" inside an Arts or People kicker doesn't make it Campus Life
    expect(departmentOf('Empac Event')).toBe('arts')
    expect(departmentOf('OFF-CAMPUS EVENT')).toBe('arts')
    expect(departmentOf('Club Spotlight')).toBe('people')
    expect(departmentOf('CLUB HIGHLIGHT')).toBe('people')
    expect(departmentOf('Student Spotlight')).toBe('people')
    expect(departmentOf('RCOS')).toBe('people')
    expect(departmentOf('Entrepeneurship')).toBe('people')
    expect(departmentOf('Club Event')).toBe('campus')
    expect(departmentOf('NRB EVENT')).toBe('campus')
    expect(departmentOf('on-campus event')).toBe('campus')
    expect(departmentOf('Student Life')).toBe('campus')
    expect(departmentOf('GM Week 2024')).toBe('campus')
  })

  it("doesn't match a short word inside a longer one", () => {
    expect(departmentOf('Party')).toBeNull()
    expect(departmentOf('Startup')).toBeNull()
  })

  it('leaves unknown or empty kickers out of every section', () => {
    expect(departmentOf('Features')).toBeNull()
    expect(departmentOf('Research')).toBeNull()
    expect(departmentOf('')).toBeNull()
    expect(departmentOf(null)).toBeNull()
  })
})

describe('semesterOf', () => {
  it('splits the year at August, in Troy time', () => {
    expect(semesterOf('2026-11-18T15:00:00Z')).toEqual({ key: '2026-2', label: 'Fall 2026' })
    expect(semesterOf('2026-04-10T15:00:00Z')).toEqual({ key: '2026-1', label: 'Spring 2026' })
    // Summer folds into the spring before it
    expect(semesterOf('2026-07-20T15:00:00Z')?.label).toBe('Spring 2026')
    // 1 a.m. UTC on Aug 1 is still July 31 in Troy
    expect(semesterOf('2026-08-01T01:00:00Z')?.label).toBe('Spring 2026')
  })

  it('sorts newest first as a string', () => {
    const keys = ['2025-2', '2026-1', '2026-2'].sort((a, b) => b.localeCompare(a))
    expect(keys).toEqual(['2026-2', '2026-1', '2025-2'])
  })

  it('returns null for a missing or bad date', () => {
    expect(semesterOf(null)).toBeNull()
    expect(semesterOf('not a date')).toBeNull()
  })
})
