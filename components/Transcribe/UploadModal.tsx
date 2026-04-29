'use client'

import { useState } from 'react'
import './transcribe.css'

interface Props {
  onClose: () => void
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

export default function UploadModal({ onClose, onCreated }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState('interview')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  function pickFile(f: File) {
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  function submit() {
    if (!file) return
    setSubmitting(true)
    setError(null)
    setProgress(0)

    const form = new FormData()
    form.append('audio', file)
    form.append('title', title || file.name)
    form.append('kind', kind)
    if (notes) form.append('notes', notes)

    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      setSubmitting(false)
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
      setError('Network error')
    }
    xhr.open('POST', '/api/transcribe/upload')
    xhr.withCredentials = true
    xhr.send(form)
  }

  return (
    <div role="dialog" className="transcribe-modal__overlay" onClick={onClose}>
      <div className="transcribe-modal__panel" onClick={(e) => e.stopPropagation()}>
        <h2>Upload audio</h2>

        <div
          className={`transcribe-dropzone${file ? ' transcribe-dropzone--has-file' : ''}`}
          onClick={() => document.getElementById('audio-file-input')?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const f = e.dataTransfer.files[0]
            if (f) pickFile(f)
          }}
        >
          {file ? (
            <div>
              <strong>{file.name}</strong>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {(file.size / 1024 / 1024).toFixed(1)} MB · {file.type || 'audio'}
              </div>
            </div>
          ) : (
            <>Drop audio file here or click to choose. Max 6 hours.</>
          )}
        </div>
        <input
          id="audio-file-input"
          type="file"
          accept="audio/*,.m4a,.mp3,.wav,.opus,.ogg,.flac,.webm"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) pickFile(f)
          }}
        />

        <label className="transcribe-modal__field">
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="transcribe-modal__field">
          Kind
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className="transcribe-modal__field">
          Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </label>

        {submitting && (
          <div style={{ margin: '0.5rem 0', fontSize: 13 }}>
            Uploading… {progress}%
            <div className="transcribe-progress-track">
              <div
                className="transcribe-progress-bar"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        {error && <div className="transcribe-error">{error}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!file || submitting}
            className="transcribe-list__cta"
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  )
}
