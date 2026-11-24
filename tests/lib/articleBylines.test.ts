import { describe, expect, it } from 'vitest';
import { getArticleAuthors, isStaffEditorial } from '@/utils/articleAuthors';
import { leadDate, longDate, recentAge, shortDate } from '@/utils/articleDates';

describe('getArticleAuthors', () => {
  it('lists staff in order, then write-ins, with profile links for staff only', () => {
    const authors = getArticleAuthors({
      authors: [
        { id: 1, firstName: 'Morgan', lastName: 'Patel', slug: 'morgan-patel' },
        2, // unpopulated: skipped
        { id: 3, firstName: ' Ethan ', lastName: 'Gallagher ', slug: null },
      ],
      writeInAuthors: [{ name: '  Guest Writer ' }, { name: '   ' }],
    });
    expect(authors.map((a) => [a.name, a.href])).toEqual([
      ['Morgan Patel', '/staff/morgan-patel'],
      ['Ethan Gallagher', '/staff/3'],
      ['Guest Writer', null],
    ]);
  });

  it('is empty when there are no authors', () => {
    expect(getArticleAuthors({})).toEqual([]);
  });
});

describe('isStaffEditorial', () => {
  it('is true only for staff editorials', () => {
    expect(isStaffEditorial({ opinionType: 'staff-editorial' })).toBe(true);
    expect(isStaffEditorial({ opinionType: 'column' })).toBe(false);
    expect(isStaffEditorial({})).toBe(false);
  });
});

describe('article dates', () => {
  const now = new Date('2026-11-23T17:00:00Z');
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
  const HOUR = 60 * 60 * 1000;

  it('shows a relative age for a week, then nothing', () => {
    expect(recentAge(ago(10 * 1000), now)).toBe('just now');
    expect(recentAge(ago(3 * HOUR), now)).toBe('3 hours ago');
    expect(recentAge(ago(6 * 24 * HOUR), now)).toBe('6 days ago');
    expect(recentAge(ago(7 * 24 * HOUR), now)).toBeNull();
    expect(recentAge(null, now)).toBeNull();
    expect(recentAge('not a date', now)).toBeNull();
  });

  it("formats publish dates in Troy's time zone", () => {
    // 9 pm Eastern on Oct 22 is already Oct 23 in UTC
    expect(longDate('2026-10-23T01:00:00Z')).toBe('October 22, 2026');
    expect(shortDate('2026-10-23T01:00:00Z')).toBe('Oct 22, 2026');
    expect(longDate(null)).toBeNull();
  });

  it('gives a lead story its publish date once the relative age is gone', () => {
    expect(leadDate({ date: '3 hours ago', publishedDate: '2026-10-23T01:00:00Z' })).toBe('3 hours ago');
    expect(leadDate({ date: null, publishedDate: '2026-10-23T01:00:00Z' })).toBe('October 22, 2026');
    expect(leadDate({})).toBeNull();
  });
});
