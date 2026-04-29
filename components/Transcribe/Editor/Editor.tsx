'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranscript } from '../hooks/useTranscript'
import { useAudioPlayback } from '../hooks/useAudioPlayback'
import AudioPlayer from './AudioPlayer'
import SegmentList from './SegmentList'
import SpeakerSidebar from './SpeakerSidebar'
import FindReplace from './FindReplace'
import ExportMenu from './ExportMenu'
import { mergeSegments, splitSegment, reassignSpeaker } from '@/lib/transcribe/segments'
import type { TranscriptData } from '@/lib/transcribe/types'

interface Props {
  audioJobId: string
  title: string
  kind: string
}

export default function Editor({ audioJobId, title }: Props) {
  const { data, update, forceSave, saveState } = useTranscript(audioJobId)
  const audioRef = useRef<HTMLAudioElement>(null)
  const pos = useAudioPlayback(audioRef, data)
  const [showFind, setShowFind] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setShowFind(true)
      } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        void forceSave()
      } else if (e.key === 'Escape') {
        setShowFind(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [forceSave])

  const segmentCounts = useMemo(() => {
    if (!data) return {}
    const acc: Record<string, number> = {}
    for (const s of data.segments) acc[s.speakerId] = (acc[s.speakerId] ?? 0) + 1
    return acc
  }, [data])

  const onSeek = useCallback((t: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = t
      void audioRef.current.play()
    }
  }, [])

  const onTextChange = useCallback(
    (id: string, text: string) => {
      if (!data) return
      update({
        ...data,
        segments: data.segments.map((s) =>
          s.id === id ? { ...s, text, edited: true } : s,
        ),
      })
    },
    [data, update],
  )

  const onSpeakerChange = useCallback(
    (id: string, speakerId: string) => {
      if (!data) return
      update(reassignSpeaker(data, id, speakerId))
    },
    [data, update],
  )

  const onMergeAbove = useCallback(
    (id: string) => {
      if (!data) return
      const idx = data.segments.findIndex((s) => s.id === id)
      if (idx <= 0) return
      update(mergeSegments(data, data.segments[idx - 1].id, id))
    },
    [data, update],
  )
  const onMergeBelow = useCallback(
    (id: string) => {
      if (!data) return
      const idx = data.segments.findIndex((s) => s.id === id)
      if (idx < 0 || idx >= data.segments.length - 1) return
      update(mergeSegments(data, id, data.segments[idx + 1].id))
    },
    [data, update],
  )
  const onSplitAt = useCallback(
    (id: string, wordIndex: number) => {
      if (!data) return
      update(splitSegment(data, id, wordIndex))
    },
    [data, update],
  )

  const onRename = useCallback(
    (id: string, label: string) => {
      if (!data) return
      update({
        ...data,
        speakers: data.speakers.map((sp) =>
          sp.id === id ? { ...sp, label: label || null } : sp,
        ),
      })
    },
    [data, update],
  )

  if (!data) return <div style={{ padding: '2rem' }}>Loading transcript…</div>

  const saveText: Record<typeof saveState, string> = {
    idle: '',
    dirty: '● Unsaved',
    saving: '○ Saving…',
    saved: '✓ Saved',
    error: 'Save failed',
  }

  return (
    <div className="transcribe-editor">
      <header className="transcribe-editor__header">
        <h2>{title || 'Transcript'}</h2>
        <ExportMenu
          data={data}
          baseName={(title || 'transcript').replace(/[^a-z0-9-]+/gi, '_')}
        />
        <button
          onClick={() => setShowFind(true)}
          style={{
            background: 'none',
            border: '1px solid var(--theme-elevation-200, #ccc)',
            borderRadius: 4,
            padding: '0.25rem 0.6rem',
            fontSize: 12,
            cursor: 'pointer',
            color: 'inherit',
          }}
          title="Find & Replace (⌘F)"
        >
          Find
        </button>
        <span
          className={`transcribe-editor__save${
            saveState === 'error' ? ' transcribe-editor__save--error' : ''
          }`}
        >
          {saveText[saveState]}
        </span>
      </header>
      <div className="transcribe-editor__player">
        <AudioPlayer ref={audioRef} audioJobId={audioJobId} />
      </div>
      <div className="transcribe-editor__body">
        <SpeakerSidebar
          speakers={data.speakers}
          segmentCounts={segmentCounts}
          onRename={onRename}
        />
        <div className="transcribe-segment-list">
          <SegmentList
            segments={data.segments}
            speakers={data.speakers}
            currentSegmentId={pos.segmentId}
            currentWordIndex={pos.wordIndex}
            onSeek={onSeek}
            onTextChange={onTextChange}
            onSpeakerChange={onSpeakerChange}
            onMergeAbove={onMergeAbove}
            onMergeBelow={onMergeBelow}
            onSplitAt={onSplitAt}
          />
        </div>
      </div>
      {showFind && (
        <FindReplace
          data={data}
          onApply={(next: TranscriptData) => update(next)}
          onClose={() => setShowFind(false)}
        />
      )}
    </div>
  )
}
