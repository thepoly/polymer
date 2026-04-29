'use client'
import { buildPlainText, buildSrt, buildVtt, buildJson } from '@/lib/transcribe/exporters'
import type { TranscriptData } from '@/lib/transcribe/types'

function download(filename: string, mime: string, body: string) {
  const blob = new Blob([body], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function ExportMenu({
  data,
  baseName,
}: {
  data: TranscriptData
  baseName: string
}) {
  return (
    <div className="transcribe-export">
      <button
        onClick={() => download(`${baseName}.txt`, 'text/plain', buildPlainText(data))}
      >
        TXT
      </button>
      <button
        onClick={() => download(`${baseName}.srt`, 'application/x-subrip', buildSrt(data))}
      >
        SRT
      </button>
      <button onClick={() => download(`${baseName}.vtt`, 'text/vtt', buildVtt(data))}>VTT</button>
      <button
        onClick={() => download(`${baseName}.json`, 'application/json', buildJson(data))}
      >
        JSON
      </button>
    </div>
  )
}
