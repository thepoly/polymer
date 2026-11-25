import { describe, expect, it } from 'vitest'
import { departmentOf } from '@/lib/featuresDepartments'

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
    // "Highlight" isn't a People word, so a club highlight is campus life
    expect(departmentOf('CLUB HIGHLIGHT')).toBe('campus')
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
    // The kickers still unsorted since 2020 in production (November 2026)
    for (const k of ['Features', 'COVID-19', 'Administration', 'Health', 'Technology', 'Sports', 'ROTC', 'RPI HISTORY', 'Academics']) {
      expect(departmentOf(k)).toBeNull()
    }
    expect(departmentOf('Sports Highlight')).toBeNull()
    expect(departmentOf('Research')).toBeNull()
    expect(departmentOf('')).toBeNull()
    expect(departmentOf(null)).toBeNull()
  })
})
