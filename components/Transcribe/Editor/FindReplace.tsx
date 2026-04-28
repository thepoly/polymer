'use client'
import { useMemo, useState } from 'react'
import type { TranscriptData } from '@/lib/transcribe/types'

interface Props {
  data: TranscriptData
  onApply: (next: TranscriptData) => void
  onClose: () => void
}

function escapeForRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export default function FindReplace({ data, onApply, onClose }: Props) {
  const [find, setFind] = useState('')
  const [replace, setReplace] = useState('')
  const [regex, setRegex] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pattern = useMemo<RegExp | null>(() => {
    if (!find) return null
    setError(null)
    const flags = caseSensitive ? 'g' : 'gi'
    try {
      return regex ? new RegExp(find, flags) : new RegExp(escapeForRegex(find), flags)
    } catch (e) {
      setError(String(e))
      return null
    }
  }, [find, regex, caseSensitive])

  const matchCount = useMemo(() => {
    if (!pattern) return 0
    let n = 0
    for (const s of data.segments) n += s.text.match(pattern)?.length ?? 0
    return n
  }, [pattern, data])

  function apply() {
    if (!pattern) return
    onApply({
      ...data,
      segments: data.segments.map((s) => {
        const next = s.text.replace(pattern, replace)
        return next === s.text ? s : { ...s, text: next, edited: true }
      }),
    })
    onClose()
  }

  return (
    <div role="dialog" className="transcribe-find">
      <h3>Find &amp; Replace</h3>
      <input
        placeholder="Find"
        value={find}
        onChange={(e) => setFind(e.target.value)}
        autoFocus
      />
      <input
        placeholder="Replace with"
        value={replace}
        onChange={(e) => setReplace(e.target.value)}
      />
      <label>
        <input type="checkbox" checked={regex} onChange={(e) => setRegex(e.target.checked)} /> Regex
      </label>
      <label>
        <input
          type="checkbox"
          checked={caseSensitive}
          onChange={(e) => setCaseSensitive(e.target.checked)}
        />{' '}
        Case sensitive
      </label>
      <p style={{ fontSize: 12, color: error ? '#b91c1c' : 'var(--theme-elevation-500)' }}>
        {error ?? `${matchCount} match${matchCount === 1 ? '' : 'es'}`}
      </p>
      <div className="transcribe-find__actions">
        <button onClick={onClose}>Cancel</button>
        <button onClick={apply} disabled={!matchCount} className="transcribe-list__cta">
          Replace all
        </button>
      </div>
    </div>
  )
}
