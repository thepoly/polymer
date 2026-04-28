import { describe, expect, it } from 'vitest'
import {
  mergeSegments,
  splitSegment,
  reassignSpeaker,
  nextSegmentId,
} from '../../../lib/transcribe/segments'
import type { TranscriptData } from '../../../lib/transcribe/types'

const sample: TranscriptData = {
  language: 'en',
  duration: 30,
  model: 'test',
  speakers: [
    { id: 'SPEAKER_00', label: null },
    { id: 'SPEAKER_01', label: null },
  ],
  segments: [
    {
      id: 'seg_0001',
      speakerId: 'SPEAKER_00',
      start: 0,
      end: 5,
      text: 'Hello there friend.',
      words: [
        { word: 'Hello', start: 0, end: 1 },
        { word: 'there', start: 1, end: 2 },
        { word: 'friend.', start: 2, end: 3 },
      ],
    },
    {
      id: 'seg_0002',
      speakerId: 'SPEAKER_01',
      start: 5,
      end: 10,
      text: 'How are you?',
      words: [
        { word: 'How', start: 5, end: 6 },
        { word: 'are', start: 6, end: 7 },
        { word: 'you?', start: 7, end: 8 },
      ],
    },
  ],
}

describe('nextSegmentId', () => {
  it('returns the next zero-padded id', () => {
    expect(nextSegmentId(sample.segments)).toBe('seg_0003')
  })

  it('handles empty segment list', () => {
    expect(nextSegmentId([])).toBe('seg_0001')
  })
})

describe('mergeSegments', () => {
  it('merges two adjacent segments', () => {
    const out = mergeSegments(sample, 'seg_0001', 'seg_0002')
    expect(out.segments).toHaveLength(1)
    expect(out.segments[0].id).toBe('seg_0001')
    expect(out.segments[0].text).toBe('Hello there friend. How are you?')
    expect(out.segments[0].start).toBe(0)
    expect(out.segments[0].end).toBe(10)
    expect(out.segments[0].words).toHaveLength(6)
    expect(out.segments[0].edited).toBe(true)
  })

  it('refuses to merge non-adjacent segments', () => {
    const three: TranscriptData = {
      ...sample,
      segments: [
        ...sample.segments,
        {
          id: 'seg_0003',
          speakerId: 'SPEAKER_00',
          start: 10,
          end: 15,
          text: 'Bye.',
          words: [],
        },
      ],
    }
    const out = mergeSegments(three, 'seg_0001', 'seg_0003')
    expect(out.segments).toHaveLength(3)
  })

  it('returns data unchanged when an id is missing', () => {
    const out = mergeSegments(sample, 'seg_0001', 'seg_9999')
    expect(out).toBe(sample)
  })
})

describe('splitSegment', () => {
  it('splits a segment at a middle word index', () => {
    const out = splitSegment(sample, 'seg_0001', 2)
    expect(out.segments).toHaveLength(3)
    expect(out.segments[0].id).toBe('seg_0001')
    expect(out.segments[0].text).toBe('Hello there')
    expect(out.segments[0].end).toBe(2)
    expect(out.segments[0].edited).toBe(true)
    expect(out.segments[1].id).toBe('seg_0003')
    expect(out.segments[1].text).toBe('friend.')
    expect(out.segments[1].start).toBe(2)
    expect(out.segments[1].edited).toBe(true)
  })

  it('refuses to split at the start or end', () => {
    expect(splitSegment(sample, 'seg_0001', 0).segments).toHaveLength(2)
    expect(splitSegment(sample, 'seg_0001', 3).segments).toHaveLength(2)
  })

  it('returns data unchanged for unknown segment id', () => {
    expect(splitSegment(sample, 'seg_9999', 1)).toBe(sample)
  })
})

describe('reassignSpeaker', () => {
  it('reassigns to existing speaker without growing speaker list', () => {
    const out = reassignSpeaker(sample, 'seg_0001', 'SPEAKER_01')
    expect(out.segments[0].speakerId).toBe('SPEAKER_01')
    expect(out.speakers).toHaveLength(2)
  })

  it('adds a new speaker when target id is unknown', () => {
    const out = reassignSpeaker(sample, 'seg_0001', 'SPEAKER_02')
    expect(out.speakers).toHaveLength(3)
    expect(out.speakers[2]).toEqual({ id: 'SPEAKER_02', label: null })
    expect(out.segments[0].speakerId).toBe('SPEAKER_02')
  })
})
