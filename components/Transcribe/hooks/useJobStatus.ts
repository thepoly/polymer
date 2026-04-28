'use client'
import { useEffect, useState } from 'react'

export type JobStatusInfo = {
  id: string | number
  status: 'queued' | 'dispatching' | 'processing' | 'completed' | 'failed'
  progress?: number
  error?: string | null
  title?: string
  kind?: string
  transcribedAt?: string | null
}

export function useJobStatus(id: string | number, intervalMs = 5000): JobStatusInfo | null {
  const [info, setInfo] = useState<JobStatusInfo | null>(null)
  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | null = null
    const tick = async () => {
      try {
        const res = await fetch(`/api/transcribe/${id}`, { credentials: 'include' })
        if (alive && res.ok) {
          const j = (await res.json()) as JobStatusInfo
          setInfo(j)
          if (j.status === 'completed' || j.status === 'failed') return
        }
      } catch {
        /* ignore */
      }
      if (alive) timer = setTimeout(tick, intervalMs)
    }
    void tick()
    return () => {
      alive = false
      if (timer) clearTimeout(timer)
    }
  }, [id, intervalMs])
  return info
}
