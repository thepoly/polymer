import { describe, expect, it } from 'vitest';
import { joinNames, joinNameText } from '@/utils/joinNames';

describe('joinNames', () => {
  it('joins with AP style and no serial comma', () => {
    expect(joinNameText([])).toBe('');
    expect(joinNameText(['A'])).toBe('A');
    expect(joinNameText(['A', 'B'])).toBe('A and B');
    expect(joinNameText(['A', 'B', 'C'])).toBe('A, B and C');
    expect(joinNameText(['A', 'B', 'C', 'D', 'E'])).toBe('A, B, C, D and E');
  });

  it('gives each item the separator that goes before it', () => {
    expect(joinNames([1, 2, 3])).toEqual([
      { item: 1, sep: '' },
      { item: 2, sep: ', ' },
      { item: 3, sep: ' and ' },
    ]);
  });
});
