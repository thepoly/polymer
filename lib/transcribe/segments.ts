import type { Segment, TranscriptData } from './types'

const ID_PATTERN = /^seg_(\d+)$/

export function nextSegmentId(segments: Segment[]): string {
  let max = 0
  for (const s of segments) {
    const m = ID_PATTERN.exec(s.id)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `seg_${String(max + 1).padStart(4, '0')}`
}

export function mergeSegments(
  data: TranscriptData,
  idA: string,
  idB: string,
): TranscriptData {
  const idxA = data.segments.findIndex((s) => s.id === idA)
  const idxB = data.segments.findIndex((s) => s.id === idB)
  if (idxA < 0 || idxB < 0 || Math.abs(idxA - idxB) !== 1) return data
  const lo = Math.min(idxA, idxB)
  const hi = Math.max(idxA, idxB)
  const first = data.segments[lo]
  const second = data.segments[hi]
  const merged: Segment = {
    id: first.id,
    speakerId: first.speakerId,
    start: Math.min(first.start, second.start),
    end: Math.max(first.end, second.end),
    text: `${first.text} ${second.text}`.replace(/\s+/g, ' ').trim(),
    words: [...first.words, ...second.words],
    edited: true,
  }
  const segments = data.segments
    .filter((s) => s.id !== first.id && s.id !== second.id)
    .concat(merged)
    .sort((a, b) => a.start - b.start)
  return { ...data, segments }
}

export function splitSegment(
  data: TranscriptData,
  segmentId: string,
  wordIndex: number,
): TranscriptData {
  const idx = data.segments.findIndex((s) => s.id === segmentId)
  if (idx < 0) return data
  const seg = data.segments[idx]
  if (wordIndex <= 0 || wordIndex >= seg.words.length) return data

  const left = seg.words.slice(0, wordIndex)
  const right = seg.words.slice(wordIndex)
  if (left.length === 0 || right.length === 0) return data

  const a: Segment = {
    ...seg,
    end: left[left.length - 1].end,
    text: left.map((w) => w.word).join(' '),
    words: left,
    edited: true,
  }
  const b: Segment = {
    id: nextSegmentId(data.segments),
    speakerId: seg.speakerId,
    start: right[0].start,
    end: seg.end,
    text: right.map((w) => w.word).join(' '),
    words: right,
    edited: true,
  }
  const segments = [...data.segments]
  segments.splice(idx, 1, a, b)
  return { ...data, segments }
}

export function reassignSpeaker(
  data: TranscriptData,
  segmentId: string,
  newSpeakerId: string,
): TranscriptData {
  let speakers = data.speakers
  if (!speakers.some((sp) => sp.id === newSpeakerId)) {
    speakers = [...speakers, { id: newSpeakerId, label: null }]
  }
  return {
    ...data,
    speakers,
    segments: data.segments.map((s) =>
      s.id === segmentId ? { ...s, speakerId: newSpeakerId } : s,
    ),
  }
}
