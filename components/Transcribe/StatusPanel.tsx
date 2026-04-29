'use client'
import type { JobStatusInfo } from './hooks/useJobStatus'
import './transcribe.css'

const COPY: Record<JobStatusInfo['status'], { title: string; sub: string }> = {
  queued: {
    title: 'Queued',
    sub: 'Waiting for the GPU to pick this up. The page will update automatically.',
  },
  dispatching: {
    title: 'Dispatching',
    sub: 'Sending audio to the transcription service…',
  },
  processing: {
    title: 'Transcribing',
    sub: 'WhisperX is working on it. Long audio can take 10–30 minutes.',
  },
  completed: { title: 'Done', sub: 'Transcript ready.' },
  failed: { title: 'Failed', sub: 'Something went wrong. See error below.' },
}

export default function StatusPanel({
  info,
  onRetry,
}: {
  info: JobStatusInfo
  onRetry: () => void
}) {
  const c = COPY[info.status]
  const showProgress = info.status !== 'failed' && info.status !== 'completed'
  const pct = info.progress ?? (info.status === 'processing' ? 50 : 10)
  return (
    <div className="transcribe-status">
      <h2>{c.title}</h2>
      <p>{c.sub}</p>
      {showProgress && (
        <div className="transcribe-status__progress">
          <div
            className="transcribe-status__progress-bar"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {info.error && <pre className="transcribe-status__error">{info.error}</pre>}
      {info.status === 'failed' && (
        <button className="transcribe-status__retry" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}
