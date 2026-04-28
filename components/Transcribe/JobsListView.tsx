'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Gutter } from '@payloadcms/ui'
import UploadModal from './UploadModal'
import './transcribe.css'

type Job = {
  id: number
  title: string
  kind: string
  status: 'queued' | 'dispatching' | 'processing' | 'completed' | 'failed'
  uploader?: { id: number; firstName?: string; lastName?: string } | number
  createdAt: string
  transcribedAt?: string | null
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
  { value: '', label: 'All statuses' },
  { value: 'queued', label: 'Queued' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
]

export default function JobsListView() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [kind, setKind] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('depth', '1')
    params.set('limit', '100')
    params.set('sort', '-createdAt')
    if (kind) params.append('where[kind][equals]', kind)
    if (status) params.append('where[status][equals]', status)
    if (search) params.append('where[title][like]', search)
    try {
      const res = await fetch(`/api/audio-jobs?${params}`, { credentials: 'include' })
      if (res.ok) {
        const json = (await res.json()) as { docs: Job[] }
        setJobs(json.docs)
      }
    } finally {
      setLoading(false)
    }
  }, [kind, status, search])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <Gutter>
      <div className="transcribe-list">
        <div className="transcribe-list__header">
          <h1>Transcripts</h1>
          <button className="transcribe-list__cta" onClick={() => setShowUpload(true)}>
            + Upload audio
          </button>
        </div>

        <div className="transcribe-list__filters">
          <input
            placeholder="Search title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <a href="/admin/transcribe/search" style={{ marginLeft: 'auto' }}>
            Search transcripts →
          </a>
        </div>

        {loading ? (
          <p>Loading…</p>
        ) : jobs.length === 0 ? (
          <p style={{ color: 'var(--theme-elevation-500)' }}>
            No transcripts yet. Click &ldquo;+ Upload audio&rdquo; to get started.
          </p>
        ) : (
          <table className="transcribe-list__table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Kind</th>
                <th>Status</th>
                <th>Uploader</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => {
                const u = typeof j.uploader === 'object' ? j.uploader : null
                return (
                  <tr
                    key={j.id}
                    onClick={() => router.push(`/admin/collections/audio-jobs/${j.id}`)}
                  >
                    <td>{j.title}</td>
                    <td>{j.kind}</td>
                    <td>
                      <span className={`status-pill status-pill--${j.status}`}>
                        {j.status}
                      </span>
                    </td>
                    <td>
                      {u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : '—'}
                    </td>
                    <td>{new Date(j.createdAt).toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {showUpload && (
          <UploadModal
            onClose={() => setShowUpload(false)}
            onCreated={(id) => router.push(`/admin/collections/audio-jobs/${id}`)}
          />
        )}
      </div>
    </Gutter>
  )
}
