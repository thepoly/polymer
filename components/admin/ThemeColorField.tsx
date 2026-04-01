'use client'

import { useMemo } from 'react'
import { FieldLabel, useField } from '@payloadcms/ui'

type ThemeColorFieldProps = {
  path: string
  field?: {
    label?: string
    admin?: {
      description?: string
    }
  }
}

const HEX_COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

function normalizeHex(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!HEX_COLOR_RE.test(trimmed)) return null
  if (trimmed.length === 4) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toLowerCase()
  }
  return trimmed.toLowerCase()
}

export const ThemeColorField = ({ path, field }: ThemeColorFieldProps) => {
  const { value, setValue } = useField<string>({ path })
  const normalizedHex = useMemo(() => normalizeHex(value), [value])
  const previewColor = normalizedHex || value?.trim() || 'transparent'

  return (
    <div className="field-type text" style={{ marginBottom: 0 }}>
      <FieldLabel label={field?.label || path} path={path} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto auto',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <input
          id={`field-${path}`}
          type="text"
          value={value || ''}
          onChange={(e) => setValue(e.target.value)}
          placeholder="#D6001C or rgba(0, 0, 0, 0.15)"
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: 14,
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 6,
            background: 'var(--theme-input-bg, var(--theme-elevation-0))',
            color: 'var(--theme-text)',
            outline: 'none',
          }}
        />
        <input
          type="color"
          aria-label={`${field?.label || path} color picker`}
          value={normalizedHex || '#000000'}
          onChange={(e) => setValue(e.target.value)}
          style={{
            width: 38,
            height: 38,
            padding: 0,
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 999,
            background: 'transparent',
            cursor: 'pointer',
          }}
        />
        <span
          aria-hidden="true"
          style={{
            width: 38,
            height: 38,
            borderRadius: 999,
            border: '1px solid var(--theme-elevation-150)',
            background: previewColor,
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
          }}
        />
      </div>
      {field?.admin?.description && (
        <div
          style={{
            marginTop: 6,
            color: 'var(--theme-text-muted)',
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {field.admin.description}
        </div>
      )}
      {!normalizedHex && value?.trim() && (
        <div
          style={{
            marginTop: 4,
            color: 'var(--theme-text-muted)',
            fontSize: 11,
            lineHeight: 1.4,
          }}
        >
          Picker sets hex values. Manual input also supports formats like `rgba(...)`.
        </div>
      )}
    </div>
  )
}
