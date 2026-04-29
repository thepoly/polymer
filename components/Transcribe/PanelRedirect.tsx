'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'

// Anything that lands on the auto-generated audio-jobs collection routes is
// bounced into the unified transcribe panel. Per-job links carry the id so the
// panel opens straight to that job.
export default function PanelRedirect() {
  const params = useParams()
  const raw = params?.segments
  const id = Array.isArray(raw) ? raw[raw.length - 1] : (params?.id as string | undefined)

  useEffect(() => {
    const base = window.location.pathname.startsWith('/admin')
      ? '/admin/transcribe'
      : '/newsroom/transcribe'
    const dest = id && /^\d+$/.test(id) ? `${base}?id=${id}` : base
    window.location.replace(dest)
  }, [id])

  return <div style={{ padding: '2rem' }}>Loading transcripts…</div>
}
