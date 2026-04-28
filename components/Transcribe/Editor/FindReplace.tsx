'use client'
import { useMemo, useState } from 'react'
import type { TranscriptData } from '@/lib/transcribe/types'

interface Props {
  data: TranscriptData
  onApply: (next: TranscriptData) => void
  onClose: () => void
}

const META_CHARS = '.*+?^${}()|[]\\'
function escapeForRegex(input: string): string {
  let out = ''
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    out += META_CHARS.includes(ch) ? `\\${ch}` : ch
  }
  return out
}

interface PatternResult {
  pattern: RegExp | null
  error: string | null
}

export default function FindReplace({ data, onApply, onClose }: Props) {
  const [find, setFind] = useState('')
  const [replace, setReplace] = useState('')
  const [regex, setRegex] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)

  const compiled = useMemo<PatternResult>(() => {
    if (!find) return { pattern: null, error: null }
    const flags = caseSensitive ? 'g' : 'gi'
    try {
      const p = regex ? new RegExp(find, flags) : new RegExp(escapeForRegex(find), flags)
      return { pattern: p, error: null }
    } catch (e) {
      return { pattern: null, error: String(e) }
    }
  }, [find, regex, caseSensitive])

  const pattern = compiled.pattern
  const error = compiled.error

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
