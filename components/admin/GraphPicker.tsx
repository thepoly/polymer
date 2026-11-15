'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useField, FieldLabel, SelectInput } from '@payloadcms/ui'

type SavedGraph = { name: string; title: string; kind: string }

const KIND_LABEL: Record<string, string> = {
  ring: 'Ring', pie: 'Pie', pie3d: '3D pie', bar: 'Bar', column: 'Column', line: 'Line', scatter: 'Scatter', flow: 'Flow', custom: 'Custom',
}

/** Picks one of the graphs saved in the graph editor, by title; the field stores its file name. */
export const GraphPicker: React.FC<{ path: string; field: { label?: string; required?: boolean } }> = ({ path, field }) => {
  const { value, setValue, showError, errorMessage } = useField<string>({ path })
  const [graphs, setGraphs] = useState<SavedGraph[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    fetch('/api/graph/graphs', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((list: SavedGraph[]) => live && setGraphs(Array.isArray(list) ? list : []))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [])

  const options = useMemo(() => {
    const list = (graphs ?? []).map((g) => ({ label: `${g.title || g.name} (${KIND_LABEL[g.kind] ?? g.kind})`, value: g.name }))
    // A graph that was renamed or deleted since still shows as what's stored, rather than as nothing.
    if (value && graphs && !list.some((o) => o.value === value)) list.unshift({ label: `${value} (not found)`, value })
    return list
  }, [graphs, value])

  return (
    <div className="field-type" style={{ marginBottom: 'var(--base)' }}>
      <FieldLabel label={field?.label ?? 'Graph'} path={path} required={field?.required} />
      <SelectInput
        path={path}
        name={path}
        options={options}
        value={value ?? ''}
        isClearable={false}
        showError={showError}
        readOnly={graphs === null && !failed}
        onChange={(option) => setValue(option && !Array.isArray(option) ? String((option as { value: unknown }).value ?? '') : '')}
      />
      {showError && errorMessage ? <div style={{ color: 'var(--theme-error-500)', marginTop: 4 }}>{errorMessage}</div> : null}
      {failed ? <div style={{ color: 'var(--theme-error-500)', marginTop: 4 }}>The saved graphs couldn’t be loaded.</div> : null}
      <div style={{ marginTop: 8, display: 'flex', gap: 16 }}>
        {value ? (
          <a href={`/graph#${encodeURIComponent(value)}`} target="_blank" rel="noreferrer">
            Edit this graph
          </a>
        ) : null}
        <a href="/graph" target="_blank" rel="noreferrer">
          New graph
        </a>
      </div>
    </div>
  )
}
