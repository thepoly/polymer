'use client'
import { memo, useEffect, useRef } from 'react'
import type { Segment as SegmentT, Speaker } from '@/lib/transcribe/types'

export interface SegmentProps {
  seg: SegmentT
  speakers: Speaker[]
  isCurrent: boolean
  currentWordIndex: number | null
  onSeek: (time: number) => void
  onTextChange: (id: string, text: string) => void
  onSpeakerChange: (id: string, speakerId: string) => void
  onMergeAbove?: (id: string) => void
  onMergeBelow?: (id: string) => void
  onSplitAt?: (id: string, wordIndex: number) => void
}

function fmt(t: number): string {
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = Math.floor(t % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

function speakerLabel(speakers: Speaker[], id: string): string {
  return speakers.find((sp) => sp.id === id)?.label ?? id
}

const Segment = memo(function Segment({
  seg,
  speakers,
  isCurrent,
  currentWordIndex,
  onSeek,
  onTextChange,
  onSpeakerChange,
  onMergeAbove,
  onMergeBelow,
  onSplitAt,
}: SegmentProps) {
  const editableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (
      editableRef.current &&
      document.activeElement !== editableRef.current
    ) {
      const desired = seg.text
      if (editableRef.current.textContent !== desired) {
        editableRef.current.textContent = desired
      }
    }
  }, [seg.text])

  const showWords = !seg.edited && currentWordIndex !== null

  return (
    <div className={`transcribe-segment${isCurrent ? ' transcribe-segment--current' : ''}`}>
      <div className="transcribe-segment__head">
        <select
          className="transcribe-segment__speaker"
          value={seg.speakerId}
          onChange={(e) => onSpeakerChange(seg.id, e.target.value)}
        >
          {speakers.map((sp) => (
            <option key={sp.id} value={sp.id}>
              {speakerLabel(speakers, sp.id)}
            </option>
          ))}
        </select>
        <button className="transcribe-segment__time" onClick={() => onSeek(seg.start)}>
          {fmt(seg.start)}
        </button>
        <div className="transcribe-segment__actions">
          {onMergeAbove && (
            <button
              className="transcribe-segment__action"
              title="Merge with previous segment"
              onClick={() => onMergeAbove(seg.id)}
            >
              ↑ merge
            </button>
          )}
          {onMergeBelow && (
            <button
              className="transcribe-segment__action"
              title="Merge with next segment"
              onClick={() => onMergeBelow(seg.id)}
            >
              ↓ merge
            </button>
          )}
        </div>
      </div>
      {showWords ? (
        <div className="transcribe-segment__words">
          {seg.words.map((w, i) => (
            <span
              key={i}
              className={`transcribe-segment__word${
                i === currentWordIndex ? ' transcribe-segment__word--current' : ''
              }`}
              onClick={(e) => {
                if (e.altKey && onSplitAt) onSplitAt(seg.id, i)
                else onSeek(w.start)
              }}
              title={
                onSplitAt ? 'Click to seek · Alt-click to split here' : 'Click to seek'
              }
            >
              {w.word}
              {i < seg.words.length - 1 ? ' ' : ''}
            </span>
          ))}
        </div>
      ) : (
        <div
          ref={editableRef}
          className="transcribe-segment__text"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onTextChange(seg.id, e.currentTarget.textContent ?? '')}
        >
          {seg.text}
        </div>
      )}
    </div>
  )
})

export default Segment
