'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { TranscriptData } from '@/lib/transcribe/types'

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

export function useTranscript(audioJobId: string) {
  const [data, setData] = useState<TranscriptData | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const dirtyRef = useRef<TranscriptData | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      const res = await fetch(`/api/transcribe/${audioJobId}/transcript`, {
        credentials: 'include',
      })
      if (alive && res.ok) {
        const j = (await res.json()) as { data: TranscriptData }
        setData(j.data)
      }
    })()
    return () => {
      alive = false
    }
  }, [audioJobId])

  const flush = useCallback(async () => {
    if (!dirtyRef.current) return
    const payload = dirtyRef.current
    dirtyRef.current = null
    setSaveState('saving')
    try {
      const res = await fetch(`/api/transcribe/${audioJobId}/transcript`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload }),
      })
      setSaveState(res.ok ? 'saved' : 'error')
    } catch {
      setSaveState('error')
    }
  }, [audioJobId])

  const update = useCallback(
    (next: TranscriptData) => {
      setData(next)
      dirtyRef.current = next
      setSaveState('dirty')
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        void flush()
      }, 2000)
    },
    [flush],
  )

  const forceSave = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    await flush()
  }, [flush])

  return { data, update, forceSave, saveState }
}
