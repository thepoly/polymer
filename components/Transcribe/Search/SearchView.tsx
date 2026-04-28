'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Snippet from './Snippet'
import type { HighlightRange } from '@/lib/transcribe/highlight'
import '../transcribe.css'

interface Result {
  transcript_id: number
  audio_job_id: number
  title: string
  kind: string
  snippet: string
  ranges: HighlightRange[]
  rank: number
}

export default function SearchView() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!q.trim()) {
      setResults([])
      return
    }
    let alive = true
    const t = setTimeout(async () => {
      if (!alive) return
      setLoading(true)
      try {
        const res = await fetch(`/api/transcribe/search?q=${encodeURIComponent(q)}`, {
          credentials: 'include',
        })
        if (alive && res.ok) {
          const j = (await res.json()) as { results: Result[] }
          setResults(j.results)
        }
      } finally {
        if (alive) setLoading(false)
      }
    }, 250)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [q])

  return (
    <div className="transcribe-search">
      <h1>Search transcripts</h1>
      <input
        autoFocus
        placeholder="words or phrases…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {loading && <p>Searching…</p>}
      {!loading && q.trim() && results.length === 0 && <p>No results.</p>}
      <ul className="transcribe-search__list">
        {results.map((r) => (
          <li key={r.transcript_id} className="transcribe-search__item">
            <Link href={`/admin/collections/audio-jobs/${r.audio_job_id}`}>
              <strong>{r.title}</strong>{' '}
              <small style={{ color: 'var(--theme-elevation-500)' }}>· {r.kind}</small>
            </Link>
            <div className="transcribe-search__snippet">
              <Snippet text={r.snippet} ranges={r.ranges} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
