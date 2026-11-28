import { describe, expect, it } from 'vitest'
import { canEditNews } from '@/lib/canEditNews'

describe('News layout access', () => {
  it.each([
    [null, false],
    [{ roles: ['writer'], section: 'news' }, false],
    [{ roles: ['editor'], section: 'sports' }, false],
    [{ roles: ['editor'] }, false],
    [{ roles: ['editor'], section: 'news' }, true],
    [{ roles: ['admin'], section: 'sports' }, true],
    [{ roles: ['eic'] }, true],
  ])('checks the role and section for %j', (user, allowed) => {
    expect(canEditNews(user)).toBe(allowed)
  })
})
