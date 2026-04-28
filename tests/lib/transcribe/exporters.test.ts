import { describe, expect, it } from 'vitest'
import {
  buildPlainText,
  buildSrt,
  buildVtt,
  buildJson,
} from '../../../lib/transcribe/exporters'
import type { TranscriptData } from '../../../lib/transcribe/types'

const data: TranscriptData = {
  language: 'en',
  duration: 10,
  model: 't',
  speakers: [
    { id: 'SPEAKER_00', label: 'Mayor' },
    { id: 'SPEAKER_01', label: null },
  ],
  segments: [
    { id: 'seg_0001', speakerId: 'SPEAKER_00', start: 0, end: 2.5, text: 'Hello.', words: [] },
    { id: 'seg_0002', speakerId: 'SPEAKER_01', start: 2.5, end: 5, text: 'Hi.', words: [] },
  ],
}

describe('buildPlainText', () => {
  it('formats with speakers by default', () => {
    expect(buildPlainText(data)).toBe('Mayor: Hello.\n\nSPEAKER_01: Hi.\n')
  })
  it('omits speakers when asked', () => {
    expect(buildPlainText(data, false)).toBe('Hello.\n\nHi.\n')
  })
})

describe('buildSrt', () => {
  it('produces valid SRT cues', () => {
    const out = buildSrt(data)
    expect(out).toContain('1\n00:00:00,000 --> 00:00:02,500\nMayor: Hello.')
    expect(out).toContain('2\n00:00:02,500 --> 00:00:05,000\nSPEAKER_01: Hi.')
  })
})

describe('buildVtt', () => {
  it('produces WebVTT with speaker tags', () => {
    const out = buildVtt(data)
    expect(out.startsWith('WEBVTT')).toBe(true)
    expect(out).toContain('00:00:00.000 --> 00:00:02.500')
    expect(out).toContain('<v Mayor>Hello.')
    expect(out).toContain('<v SPEAKER_01>Hi.')
  })
})

describe('buildJson', () => {
  it('round-trips data as JSON', () => {
    expect(JSON.parse(buildJson(data))).toEqual(data)
  })
})
