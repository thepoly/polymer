'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Gutter } from '@payloadcms/ui'
import UploadPanel from './UploadPanel'
import StatusPanel from './StatusPanel'
import Editor from './Editor/Editor'
import Snippet from './Search/Snippet'
import type { HighlightRange } from '@/lib/transcribe/highlight'
import { useJobStatus } from './hooks/useJobStatus'
import './transcribe.css'

type Status = 'queued' | 'dispatching' | 'processing' | 'completed' | 'failed'

interface Job {
  id: number
  title: string
  kind: string
  status: Status
  uploader?: { id: number; firstName?: string; lastName?: string } | number
  createdAt: string
  transcribedAt?: string | null
}

interface SearchHit {
  transcript_id: number
  audio_job_id: number
  title: string
  kind: string
  snippet: string
  ranges: HighlightRange[]
  rank: number
}

const KINDS = [
  { value: '', label: 'All kinds' },
  { value: 'interview', label: 'Interview' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'presser', label: 'Press conf' },
  { value: 'lecture', label: 'Lecture' },
  { value: 'court', label: 'Court' },
  { value: 'other', label: 'Other' },
]
const STATUSES = [
  { value: '', label: 'Any' },
  { value: 'queued', label: 'Queued' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
]

type Mode = 'idle' | 'upload' | 'job'

export default function Panel() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [hits, setHits] = useState<SearchHit[]>([])
  const [query, setQuery] = useState('')
  const [kindFilter, setKindFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [mode, setMode] = useState<Mode>('idle')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true)
    const params = new URLSearchParams()
    params.set('depth', '1')
    params.set('limit', '200')
    params.set('sort', '-createdAt')
    if (kindFilter) params.append('where[kind][equals]', kindFilter)
    if (statusFilter) params.append('where[status][equals]', statusFilter)
    if (query.trim()) params.append('where[title][like]', query.trim())
    try {
      const res = await fetch(`/api/audio-jobs?${params}`, { credentials: 'include' })
      if (res.ok) {
        const json = (await res.json()) as { docs: Job[] }
        setJobs(json.docs)
      }
    } finally {
      setLoadingJobs(false)
    }
  }, [kindFilter, statusFilter, query])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  // Full-text transcript search runs in parallel when query is meaningful.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 3) {
      setHits([])
      return
    }
    let alive = true
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/transcribe/search?q=${encodeURIComponent(q)}`, {
          credentials: 'include',
        })
        if (alive && res.ok) {
          const j = (await res.json()) as { results: SearchHit[] }
          setHits(j.results)
        }
      } catch {
        /* ignore */
      }
    }, 300)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [query])

  // Sync selection from ?id= search param on mount + when URL changes.
  useEffect(() => {
    const sync = () => {
      const sp = new URLSearchParams(window.location.search)
      const id = sp.get('id')
      const want = sp.get('upload')
      if (want != null) {
        setMode('upload')
        setSelectedId(null)
      } else if (id) {
        setMode('job')
        setSelectedId(Number(id))
      } else {
        setMode('idle')
        setSelectedId(null)
      }
    }
    sync()
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  const setUrl = useCallback((mode: Mode, id?: number) => {
    const sp = new URLSearchParams()
    if (mode === 'upload') sp.set('upload', '1')
    if (mode === 'job' && id != null) sp.set('id', String(id))
    const qs = sp.toString()
    const next = qs ? `?${qs}` : window.location.pathname
    window.history.pushState({}, '', qs ? `${window.location.pathname}?${qs}` : next)
  }, [])

  const openUpload = useCallback(() => {
    setMode('upload')
    setSelectedId(null)
    setUrl('upload')
  }, [setUrl])
  const openJob = useCallback(
    (id: number) => {
      setMode('job')
      setSelectedId(id)
      setUrl('job', id)
    },
    [setUrl],
  )
  const closeAll = useCallback(() => {
    setMode('idle')
    setSelectedId(null)
    setUrl('idle')
  }, [setUrl])

  const onUploadCreated = useCallback(
    (id: number) => {
      void loadJobs()
      openJob(id)
    },
    [loadJobs, openJob],
  )

  // Merge transcript hits into the visible job list ordering: hits first, then matching jobs.
  const jobsById = useMemo(() => {
    const m = new Map<number, Job>()
    for (const j of jobs) m.set(j.id, j)
    return m
  }, [jobs])

  return (
    <Gutter>
      <div className="trx-panel">
        <aside className="trx-panel__sidebar">
          <div className="trx-panel__sidebar-head">
            <button className="trx-cta" onClick={openUpload}>
              + Upload audio
            </button>
          </div>
          <div className="trx-panel__filters">
            <input
              className="trx-search"
              placeholder="Search transcripts…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="trx-panel__chips">
              <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="trx-panel__list">
            {loadingJobs && jobs.length === 0 ? (
              <p className="trx-empty">Loading…</p>
            ) : null}
            {!loadingJobs && jobs.length === 0 && hits.length === 0 ? (
              <p className="trx-empty">
                {query.trim()
                  ? 'No matches.'
                  : 'No transcripts yet. Click + Upload audio to start.'}
              </p>
            ) : null}

            {hits.length > 0 && (
              <div className="trx-panel__section">
                <div className="trx-panel__section-label">Transcript matches</div>
                {hits.map((h) => (
                  <button
                    key={`hit-${h.transcript_id}`}
                    className={`trx-row${selectedId === h.audio_job_id ? ' trx-row--active' : ''}`}
                    onClick={() => openJob(h.audio_job_id)}
                  >
                    <div className="trx-row__title">{h.title}</div>
                    <div className="trx-row__meta">
                      <span className={`trx-pill trx-pill--${jobsById.get(h.audio_job_id)?.status ?? 'completed'}`}>
                        {jobsById.get(h.audio_job_id)?.status ?? 'completed'}
                      </span>
                      <span className="trx-row__kind">{h.kind}</span>
                    </div>
                    <div className="trx-row__snippet">
                      <Snippet text={h.snippet} ranges={h.ranges} />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {jobs.length > 0 && (
              <div className="trx-panel__section">
                {hits.length > 0 && (
                  <div className="trx-panel__section-label">All transcripts</div>
                )}
                {jobs.map((j) => {
                  const u = typeof j.uploader === 'object' ? j.uploader : null
                  const uname = u
                    ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()
                    : null
                  return (
                    <button
                      key={`job-${j.id}`}
                      className={`trx-row${selectedId === j.id ? ' trx-row--active' : ''}`}
                      onClick={() => openJob(j.id)}
                    >
                      <div className="trx-row__title">{j.title}</div>
                      <div className="trx-row__meta">
                        <span className={`trx-pill trx-pill--${j.status}`}>{j.status}</span>
                        <span className="trx-row__kind">{j.kind}</span>
                        {uname ? <span className="trx-row__uploader">· {uname}</span> : null}
                      </div>
                      <div className="trx-row__date">
                        {new Date(j.createdAt).toLocaleString()}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </aside>

        <main className="trx-panel__main">
          {mode === 'upload' ? (
            <UploadPanel
              onCancel={closeAll}
              onCreated={onUploadCreated}
            />
          ) : mode === 'job' && selectedId != null ? (
            <JobView id={selectedId} onClose={closeAll} onChanged={loadJobs} />
          ) : (
            <Welcome onUpload={openUpload} />
          )}
        </main>
      </div>
    </Gutter>
  )
}

function Welcome({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="trx-welcome">
      <h1>Transcripts</h1>
      <p>
        Upload an audio recording — interview, meeting, lecture, presser — and the
        homelab GPU will transcribe and diarize it. Long audio is fine; the request is
        streamed straight to disk so size isn&rsquo;t a problem.
      </p>
      <button className="trx-cta trx-cta--big" onClick={onUpload}>
        + Upload audio
      </button>
      <ul className="trx-welcome__shortcuts">
        <li>
          <kbd>⌘</kbd>+<kbd>F</kbd> — find &amp; replace inside a transcript
        </li>
        <li>
          <kbd>⌘</kbd>+<kbd>S</kbd> — force-save edits
        </li>
        <li>Search box on the left runs across every transcript&rsquo;s text.</li>
      </ul>
    </div>
  )
}

function JobView({
  id,
  onClose,
  onChanged,
}: {
  id: number
  onClose: () => void
  onChanged: () => void
}) {
  const info = useJobStatus(id)

  // When the status flips, refresh the sidebar so the pill stays in sync.
  useEffect(() => {
    if (!info) return
    onChanged()
  }, [info?.status, onChanged]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!info) {
    return (
      <div className="trx-loading">
        <button className="trx-link" onClick={onClose}>
          ← Back
        </button>
        <p>Loading…</p>
      </div>
    )
  }

  if (info.status === 'completed') {
    return (
      <Editor audioJobId={String(id)} title={info.title ?? ''} kind={info.kind ?? ''} />
    )
  }
  return (
    <div className="trx-status-wrap">
      <button className="trx-link" onClick={onClose}>
        ← Back
      </button>
      <StatusPanel
        info={info}
        onRetry={async () => {
          await fetch(`/api/transcribe/${id}/dispatch`, {
            method: 'POST',
            credentials: 'include',
          })
        }}
      />
    </div>
  )
}
