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
