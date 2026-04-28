'use client'
import { useEffect, useState, RefObject } from 'react'
import type { TranscriptData } from '@/lib/transcribe/types'

export interface CurrentPosition {
  segmentId: string | null
  wordIndex: number | null
  time: number
}

export function useAudioPlayback(
  audioRef: RefObject<HTMLAudioElement | null>,
  data: TranscriptData | null,
): CurrentPosition {
  const [pos, setPos] = useState<CurrentPosition>({
    segmentId: null,
    wordIndex: null,
    time: 0,
  })

  useEffect(() => {
    const el = audioRef.current
    if (!el || !data) return
    const onTime = () => {
      const t = el.currentTime
      const segs = data.segments
      let lo = 0
      let hi = segs.length - 1
      let segIdx = -1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        const s = segs[mid]
        if (t < s.start) hi = mid - 1
        else if (t > s.end) lo = mid + 1
        else {
          segIdx = mid
          break
        }
      }
      if (segIdx === -1) {
        setPos({ segmentId: null, wordIndex: null, time: t })
        return
      }
      const seg = segs[segIdx]
      let wi = -1
      for (let i = 0; i < seg.words.length; i++) {
        if (t >= seg.words[i].start && t <= seg.words[i].end) {
          wi = i
          break
        }
      }
      setPos({ segmentId: seg.id, wordIndex: wi >= 0 ? wi : null, time: t })
    }
    el.addEventListener('timeupdate', onTime)
    return () => el.removeEventListener('timeupdate', onTime)
  }, [audioRef, data])

  return pos
}
