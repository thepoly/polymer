'use client'

import { useState } from 'react'

interface Props {
  onCancel: () => void
  onCreated: (audioJobId: number) => void
}

const KINDS = [
  { value: 'interview', label: 'Interview' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'presser', label: 'Press conference' },
  { value: 'lecture', label: 'Lecture' },
  { value: 'court', label: 'Court / hearing' },
  { value: 'other', label: 'Other' },
]

// Permissive accept — server validates via ffprobe regardless.
const ACCEPT =
  'audio/*,video/*,.m4a,.mp3,.wav,.opus,.ogg,.flac,.webm,.aac,.aiff,.aif,.caf,.mp4,.mka,.mkv,.mov,.amr,.3gp,.wma,.m4b'

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(2)} GB`
}

export default function UploadPanel({ onCancel, onCreated }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState('interview')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [bytesSent, setBytesSent] = useState(0)
  const [bytesTotal, setBytesTotal] = useState(0)
  const [rate, setRate] = useState(0)
  const [eta, setEta] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [activeXhr, setActiveXhr] = useState<XMLHttpRequest | null>(null)

  function pickFile(f: File) {
    setFile(f)
    setError(null)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  function submit() {
    if (!file) return
    setSubmitting(true)
    setError(null)
    setProgress(0)
    setBytesSent(0)
    setBytesTotal(file.size)
    setRate(0)
    setEta(0)
    const startedAt = performance.now()

    const params = new URLSearchParams()
    params.set('filename', file.name)
    if (title) params.set('title', title)
    params.set('kind', kind)
    if (notes) params.set('notes', notes)

    const xhr = new XMLHttpRequest()
    setActiveXhr(xhr)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setBytesSent(e.loaded)
        setBytesTotal(e.total)
        setProgress(Math.round((e.loaded / e.total) * 100))
        const elapsed = (performance.now() - startedAt) / 1000
        if (elapsed > 0.1) {
          const r = e.loaded / elapsed
          setRate(r)
          setEta(r > 0 ? (e.total - e.loaded) / r : 0)
        }
      }
    }
    xhr.onload = () => {
      setSubmitting(false)
      setActiveXhr(null)
      if (xhr.status === 201) {
        try {
          const json = JSON.parse(xhr.responseText)
          onCreated(json.id)
        } catch {
          setError('unexpected response from server')
        }
      } else {
        try {
          setError(JSON.parse(xhr.responseText).error || `HTTP ${xhr.status}`)
        } catch {
          setError(`HTTP ${xhr.status}`)
        }
      }
    }
    xhr.onerror = () => {
      setSubmitting(false)
      setActiveXhr(null)
      setError('Network error — check your connection and try again.')
    }
    xhr.onabort = () => {
      setSubmitting(false)
      setActiveXhr(null)
    }
    xhr.open('POST', `/api/transcribe/upload?${params}`)
    xhr.withCredentials = true
    // Send raw bytes; server streams body to disk.
    xhr.setRequestHeader('Content-Type', 'application/octet-stream')
    if (file.type) xhr.setRequestHeader('X-Content-Type', file.type)
    xhr.send(file)
  }

  function cancelUpload() {
    if (activeXhr) {
      activeXhr.abort()
    } else {
      onCancel()
    }
  }

  return (
    <div className="trx-upload">
      <div className="trx-upload__head">
        <h2>Upload audio</h2>
        <button className="trx-link" onClick={onCancel} disabled={submitting}>
          ← Back
        </button>
      </div>

      <div
        className={`trx-drop${file ? ' trx-drop--has-file' : ''}${submitting ? ' trx-drop--locked' : ''}`}
        onClick={() => {
          if (!submitting) document.getElementById('trx-file-input')?.click()
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          if (submitting) return
          const f = e.dataTransfer.files[0]
          if (f) pickFile(f)
        }}
      >
        {file ? (
          <div>
            <strong>{file.name}</strong>
            <div className="trx-drop__sub">
              {fmtBytes(file.size)} · {file.type || 'unknown type'}
            </div>
          </div>
        ) : (
          <div>
            <strong>Drop audio file here or click to choose</strong>
            <div className="trx-drop__sub">
              Any common audio or video format up to 6 hours. The bytes are streamed
              straight to disk — multi-GB files are fine.
            </div>
          </div>
        )}
      </div>
      <input
        id="trx-file-input"
        type="file"
        accept={ACCEPT}
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) pickFile(f)
        }}
      />

      <div className="trx-form">
        <label className="trx-field">
          <span>Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
          />
        </label>
        <label className="trx-field">
          <span>Kind</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            disabled={submitting}
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className="trx-field trx-field--wide">
          <span>Notes (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            disabled={submitting}
          />
        </label>
      </div>

      {submitting && (
        <div className="trx-progress">
          <div className="trx-progress__row">
            <span>Uploading…</span>
            <span>{progress}%</span>
          </div>
          <div className="trx-progress__track">
            <div className="trx-progress__bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="trx-progress__stats">
            {fmtBytes(bytesSent)} / {fmtBytes(bytesTotal)}
            {rate > 0 ? ` · ${fmtBytes(rate)}/s` : ''}
            {eta > 0 && eta < 60 * 60 * 24
              ? ` · ${eta < 60 ? `${Math.ceil(eta)}s` : `${Math.ceil(eta / 60)}m`} left`
              : ''}
          </div>
        </div>
      )}

      {error && <div className="trx-error">{error}</div>}

      <div className="trx-actions">
        <button onClick={cancelUpload} disabled={!submitting && !file && !title && !notes}>
          {submitting ? 'Cancel upload' : 'Discard'}
        </button>
        <button
          className="trx-cta"
          onClick={submit}
          disabled={!file || submitting}
        >
          {submitting ? 'Uploading…' : 'Start upload'}
        </button>
      </div>
    </div>
  )
}
