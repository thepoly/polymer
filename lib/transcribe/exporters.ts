import type { TranscriptData, Speaker } from './types'

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0')
}

function fmtTimestamp(t: number, ms: ',' | '.' = ','): string {
  const total = Math.max(0, t)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = Math.floor(total % 60)
  const millis = Math.floor((total - Math.floor(total)) * 1000)
  return `${pad(h)}:${pad(m)}:${pad(s)}${ms}${pad(millis, 3)}`
}

function speakerLabel(speakers: Speaker[], id: string): string {
  return speakers.find((sp) => sp.id === id)?.label ?? id
}

export function buildPlainText(data: TranscriptData, includeSpeakers = true): string {
  return (
    data.segments
      .map((s) =>
        includeSpeakers
          ? `${speakerLabel(data.speakers, s.speakerId)}: ${s.text}`
          : s.text,
      )
      .join('\n\n') + '\n'
  )
}

export function buildSrt(data: TranscriptData): string {
  return data.segments
    .map(
      (s, i) =>
        `${i + 1}\n${fmtTimestamp(s.start, ',')} --> ${fmtTimestamp(s.end, ',')}\n${speakerLabel(
          data.speakers,
          s.speakerId,
        )}: ${s.text}\n`,
    )
    .join('\n')
}

export function buildVtt(data: TranscriptData): string {
  return (
    'WEBVTT\n\n' +
    data.segments
      .map(
        (s) =>
          `${fmtTimestamp(s.start, '.')} --> ${fmtTimestamp(s.end, '.')}\n<v ${speakerLabel(
            data.speakers,
            s.speakerId,
          )}>${s.text}\n`,
      )
      .join('\n')
  )
}

export function buildJson(data: TranscriptData): string {
  return JSON.stringify(data, null, 2)
}
