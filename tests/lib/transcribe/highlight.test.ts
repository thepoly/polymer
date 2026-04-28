import { describe, expect, it } from 'vitest'
import { findMatchRanges, tokenizeQuery } from '../../../lib/transcribe/highlight'

describe('tokenizeQuery', () => {
  it('splits whitespace-separated terms', () => {
    expect(tokenizeQuery('hello world')).toEqual(['hello', 'world'])
  })
  it('preserves double-quoted phrases', () => {
    expect(tokenizeQuery('"city council" budget')).toEqual(['city council', 'budget'])
  })
  it('preserves single-quoted phrases', () => {
    expect(tokenizeQuery("'rainy day' fund")).toEqual(['rainy day', 'fund'])
  })
  it('returns empty array for empty input', () => {
    expect(tokenizeQuery('   ')).toEqual([])
  })
})

describe('findMatchRanges', () => {
  it('returns empty for empty query or text', () => {
    expect(findMatchRanges('hello', '')).toEqual([])
    expect(findMatchRanges('', 'hello')).toEqual([])
  })

  it('finds a single term, case-insensitive', () => {
    expect(findMatchRanges('Hello world', 'hello')).toEqual([{ start: 0, end: 5 }])
  })

  it('honors case-sensitive flag', () => {
    expect(findMatchRanges('Hello world', 'hello', { caseSensitive: true })).toEqual([])
  })

  it('finds multiple terms and sorts ranges', () => {
    expect(findMatchRanges('cat dog cat', 'cat dog')).toEqual([
      { start: 0, end: 3 },
      { start: 4, end: 7 },
      { start: 8, end: 11 },
    ])
  })

  it('merges overlapping ranges from different terms', () => {
    // 'hello' matches [0, 5], 'hell' matches [0, 4] — should merge to [0, 5]
    expect(findMatchRanges('hello world', 'hello hell')).toEqual([
      { start: 0, end: 5 },
    ])
  })

  it('merges adjacent ranges', () => {
    // 'aab' at 0, 'aab' at 3 → adjacent → merged to [0, 6]
    expect(findMatchRanges('aabaab', 'aab')).toEqual([{ start: 0, end: 6 }])
  })

  it('escapes regex metacharacters in terms', () => {
    expect(findMatchRanges('a.b a.b', 'a.b')).toEqual([
      { start: 0, end: 3 },
      { start: 4, end: 7 },
    ])
  })
})
