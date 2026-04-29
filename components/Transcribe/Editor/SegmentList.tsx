'use client'
import { useEffect, useMemo } from 'react'
import { List, useListRef, type RowComponentProps } from 'react-window'
import type { Segment as SegmentT, Speaker } from '@/lib/transcribe/types'
import Segment from './Segment'

interface Props {
  segments: SegmentT[]
  speakers: Speaker[]
  currentSegmentId: string | null
  currentWordIndex: number | null
  onSeek: (time: number) => void
  onTextChange: (id: string, text: string) => void
  onSpeakerChange: (id: string, speakerId: string) => void
  onMergeAbove: (id: string) => void
  onMergeBelow: (id: string) => void
  onSplitAt: (id: string, wordIndex: number) => void
}

interface RowProps {
  segments: SegmentT[]
  speakers: Speaker[]
  currentSegmentId: string | null
  currentWordIndex: number | null
  onSeek: (time: number) => void
  onTextChange: (id: string, text: string) => void
  onSpeakerChange: (id: string, speakerId: string) => void
  onMergeAbove: (id: string) => void
  onMergeBelow: (id: string) => void
  onSplitAt: (id: string, wordIndex: number) => void
}

function Row({ index, style, ...row }: RowComponentProps<RowProps>) {
  const seg = row.segments[index]
  const isLast = index === row.segments.length - 1
  return (
    <div style={style}>
      <Segment
        seg={seg}
        speakers={row.speakers}
        isCurrent={row.currentSegmentId === seg.id}
        currentWordIndex={row.currentSegmentId === seg.id ? row.currentWordIndex : null}
        onSeek={row.onSeek}
        onTextChange={row.onTextChange}
        onSpeakerChange={row.onSpeakerChange}
        onMergeAbove={index > 0 ? row.onMergeAbove : undefined}
        onMergeBelow={!isLast ? row.onMergeBelow : undefined}
        onSplitAt={row.onSplitAt}
      />
    </div>
  )
}

export default function SegmentList(props: Props) {
  const listRef = useListRef(null)

  const rowProps: RowProps = useMemo(
    () => ({
      segments: props.segments,
      speakers: props.speakers,
      currentSegmentId: props.currentSegmentId,
      currentWordIndex: props.currentWordIndex,
      onSeek: props.onSeek,
      onTextChange: props.onTextChange,
      onSpeakerChange: props.onSpeakerChange,
      onMergeAbove: props.onMergeAbove,
      onMergeBelow: props.onMergeBelow,
      onSplitAt: props.onSplitAt,
    }),
    [props],
  )

  useEffect(() => {
    if (!props.currentSegmentId) return
    const idx = props.segments.findIndex((s) => s.id === props.currentSegmentId)
    if (idx >= 0 && listRef.current) {
      listRef.current.scrollToRow({ index: idx, align: 'smart', behavior: 'smooth' })
    }
  }, [props.currentSegmentId, props.segments, listRef])

  const rowHeight = (index: number, _: RowProps): number => {
    const seg = props.segments[index]
    if (!seg) return 80
    const words = seg.words.length
    return Math.max(72, Math.ceil(words / 12) * 24 + 56)
  }

  return (
    <List
      listRef={listRef}
      style={{ height: '100%', width: '100%' }}
      rowCount={props.segments.length}
      rowComponent={Row}
      rowProps={rowProps}
      rowHeight={rowHeight}
      overscanCount={5}
    />
  )
}
