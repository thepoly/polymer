'use client'
import { useCallback, useMemo, useRef } from 'react'
import { useTranscript } from '../hooks/useTranscript'
import { useAudioPlayback } from '../hooks/useAudioPlayback'
import AudioPlayer from './AudioPlayer'
import SegmentList from './SegmentList'
import SpeakerSidebar from './SpeakerSidebar'
import type { TranscriptData } from '@/lib/transcribe/types'

interface Props {
  audioJobId: string
  title: string
  kind: string
}

export default function Editor({ audioJobId, title }: Props) {
  const { data, update, saveState } = useTranscript(audioJobId)
  const audioRef = useRef<HTMLAudioElement>(null)
  const pos = useAudioPlayback(audioRef, data)

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
      const speakers = data.speakers.some((sp) => sp.id === speakerId)
        ? data.speakers
        : [...data.speakers, { id: speakerId, label: null }]
      update({
        ...data,
        speakers,
        segments: data.segments.map((s) => (s.id === id ? { ...s, speakerId } : s)),
      })
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

  // Phase 5 utilities are wired here as no-ops for now; replaced when Phase 5 lands.
  const noopMerge = useCallback((_id: string) => {}, [])
  const noopSplit = useCallback((_id: string, _wordIndex: number) => {}, [])

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
            onMergeAbove={noopMerge}
            onMergeBelow={noopMerge}
            onSplitAt={noopSplit}
          />
        </div>
      </div>
    </div>
  )
}
