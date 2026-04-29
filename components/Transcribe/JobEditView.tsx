'use client'
import { useParams } from 'next/navigation'
import { useJobStatus } from './hooks/useJobStatus'
import StatusPanel from './StatusPanel'
import Editor from './Editor/Editor'

export default function JobEditView() {
  const params = useParams()
  // Payload admin route is /admin/collections/audio-jobs/[id]; the id is the
  // last segment regardless of whether it's a string or array param.
  const raw = params?.segments
  const id = Array.isArray(raw) ? raw[raw.length - 1] : (params?.id as string | undefined)
  const info = useJobStatus(id ?? '')
  if (!id) return <div style={{ padding: '2rem' }}>Missing job id.</div>
  if (!info) return <div style={{ padding: '2rem' }}>Loading…</div>

  if (info.status === 'completed') {
    return (
      <Editor audioJobId={String(id)} title={info.title ?? ''} kind={info.kind ?? ''} />
    )
  }
  return (
    <StatusPanel
      info={info}
      onRetry={async () => {
        await fetch(`/api/transcribe/${id}/dispatch`, {
          method: 'POST',
          credentials: 'include',
        })
      }}
    />
  )
}
