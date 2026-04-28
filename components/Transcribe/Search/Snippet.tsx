'use client'
import type { HighlightRange } from '@/lib/transcribe/highlight'
import { Fragment } from 'react'

interface Props {
  text: string
  ranges: HighlightRange[]
}

/**
 * Renders text with `<mark>` highlights driven by character ranges. Pure React
 * — never injects HTML, so the input cannot smuggle markup.
 */
export default function Snippet({ text, ranges }: Props) {
  if (!ranges.length) return <>{text}</>
  const out: React.ReactNode[] = []
  let cursor = 0
  ranges.forEach((r, i) => {
    if (r.start > cursor) out.push(<Fragment key={`t-${i}`}>{text.slice(cursor, r.start)}</Fragment>)
    out.push(<mark key={`m-${i}`}>{text.slice(r.start, r.end)}</mark>)
    cursor = r.end
  })
  if (cursor < text.length) out.push(<Fragment key="tail">{text.slice(cursor)}</Fragment>)
  return <>{out}</>
}
