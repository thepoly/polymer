'use client'

import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_COLORS, MAX_COLORS, resolveColors } from '@/lib/graph/palette.js'

type Row = { id: number; name: string; base: string }

const BUILT_IN = new Map(DEFAULT_COLORS.map((c) => [c.name, c.base.toUpperCase()]))
const HEX = /^#[0-9a-f]{6}$/i
const stored = (rows: Row[]) => rows.map(({ name, base }) => ({ name: name.trim().toLowerCase(), base: base.trim().toUpperCase() }))

/** The shades a base makes, or null while the hex is still being typed. */
function shadesOf(row: Row) {
  if (!HEX.test(row.base.trim())) return null
  // Resolved under its own name, so a built-in color at its original base shows its own shades.
  const name = BUILT_IN.has(row.name) ? row.name : 'preview'
  return resolveColors({ colors: [{ name, base: row.base.trim() }] }).find((c) => c.name === name) ?? null
}

/** The brand colors every graph draws with: each one's name and base, with the shades it makes. */
export default function SettingsEditor({ initial }: { initial: { name: string; base: string }[] }) {
  const [rows, setRows] = useState<Row[]>(() => initial.map((c, id) => ({ id, ...c })))
  const [saved, setSaved] = useState(() => JSON.stringify(stored(initial.map((c, id) => ({ id, ...c })))))
  const [status, setStatus] = useState<{ text: string; bad: boolean } | null>(null)
  const [busy, setBusy] = useState(false)

  const dirty = useMemo(() => JSON.stringify(stored(rows)) !== saved, [rows, saved])

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const edit = (id: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const add = () =>
    setRows((rs) => {
      const taken = new Set(rs.map((r) => r.name))
      let n = 1
      while (taken.has(`color-${n}`)) n++
      return [...rs, { id: Math.max(-1, ...rs.map((r) => r.id)) + 1, name: `color-${n}`, base: '#1F6FB2' }]
    })

  const move = (i: number, d: number) =>
    setRows((rs) => {
      const j = i + d
      if (j < 0 || j >= rs.length) return rs
      const next = [...rs]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  async function save() {
    setBusy(true)
    try {
      const res = await fetch('/api/graph/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { colors: stored(rows) } }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || `${res.status} ${res.statusText}`)
      const colors = (json.settings?.colors ?? []) as { name: string; base: string }[]
      const next = colors.map((c, id) => ({ id, ...c }))
      setRows(next)
      setSaved(JSON.stringify(stored(next)))
      setStatus({ text: 'Saved', bad: false })
    } catch (err) {
      setStatus({ text: (err as Error).message, bad: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <header className="appbar">
        <div className="brand">
          {/* Plain links: both leave this page's layout, and /graph is served by a route, not a page. */}
          {/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element */}
          <a href="/"><img src="/logo-light-mobile.svg" alt="The Polytechnic" /></a>
          <a className="product" href="/graph">Graphs</a>
          {/* eslint-enable @next/next/no-html-link-for-pages, @next/next/no-img-element */}
          <span className="product">Settings</span>
        </div>
        <div className="actions">
          <span className={status?.bad ? 'status bad' : 'status'} role="status" aria-live="polite">{status?.text}</span>
          <button className="btn primary" onClick={save} disabled={busy || !dirty}>
            {dirty ? 'Save •' : 'Save'}
          </button>
        </div>
      </header>

      <main className="settings">
        <section className="section">
          <h2>Brand colors</h2>
          <table className="colors">
            <thead>
              <tr>
                <th>Color</th>
                <th>Name</th>
                <th>Base</th>
                <th>Shades</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const original = BUILT_IN.get(row.name)
                const shades = shadesOf(row)
                const hexOk = HEX.test(row.base.trim())
                return (
                  <tr key={row.id}>
                    <td>
                      <input
                        type="color"
                        aria-label={`${row.name} color`}
                        value={hexOk ? row.base.trim().toLowerCase() : '#000000'}
                        onChange={(e) => edit(row.id, { base: e.target.value.toUpperCase() })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        aria-label="Name"
                        value={row.name}
                        disabled={original !== undefined}
                        onChange={(e) => edit(row.id, { name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        aria-label="Base color, as hex"
                        className={hexOk ? 'hex' : 'hex bad'}
                        value={row.base}
                        spellCheck={false}
                        onChange={(e) => edit(row.id, { base: e.target.value })}
                      />
                    </td>
                    <td>
                      <span className="shades">
                        {shades?.ramp.map((hex: string, j: number) => <span key={j} style={{ background: hex }} title={hex} />)}
                      </span>
                    </td>
                    <td className="ops">
                      <button aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                      <button aria-label="Move down" onClick={() => move(i, 1)} disabled={i === rows.length - 1}>↓</button>
                      {original === undefined ? (
                        <button className="link" onClick={() => setRows((rs) => rs.filter((r) => r.id !== row.id))}>Remove</button>
                      ) : row.base.trim().toUpperCase() !== original ? (
                        <button className="link" onClick={() => edit(row.id, { base: original })}>Reset</button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="grid-actions">
            <button className="btn small" onClick={add} disabled={rows.length >= MAX_COLORS}>Add a color</button>
          </div>
        </section>
      </main>
    </>
  )
}
