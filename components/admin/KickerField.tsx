'use client'

import React, { useState, useRef } from 'react'
import { useField, useAllFormFields, FieldLabel } from '@payloadcms/ui'

const opinionTypes = [
  { label: 'Opinion', value: 'opinion' },
  { label: 'Column', value: 'column' },
  { label: 'Staff Editorial', value: 'staff-editorial' },
  { label: 'Editorial Notebook', value: 'editorial-notebook' },
  { label: 'Endorsement', value: 'endorsement' },
  { label: 'Top Hat', value: 'top-hat' },
  { label: 'Candidate Profile', value: 'candidate-profile' },
  { label: 'Letter to the Editor', value: 'letter-to-the-editor' },
  { label: "The Poly's Recommendations", value: 'polys-recommendations' },
  { label: "Editor's Notebook", value: 'editors-notebook' },
  { label: 'Derby', value: 'derby' },
  { label: 'Other', value: 'other' },
]

export const KickerField: React.FC<{ path: string; field: { label?: string } }> = ({ path, field }) => {
  const { value, setValue } = useField<string>({ path })
  const [fields] = useAllFormFields()
  const sectionValue = fields?.section?.value
  const isOpinion = sectionValue === 'opinion'

  const [showDropdown, setShowDropdown] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const query = (value || '').toLowerCase()
  const filtered = isOpinion && query
    ? opinionTypes.filter((t) => t.label.toLowerCase().includes(query))
    : opinionTypes

  const handleSelect = (type: typeof opinionTypes[0]) => {
    setValue(type.label)
    setShowDropdown(false)
  }

  return (
    <div ref={wrapperRef} className="field-type text" style={{ position: 'relative', marginBottom: 0 }}>
      <FieldLabel label={field?.label || 'Kicker'} path={path} />
      <div>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => {
            setValue(e.target.value)
            if (isOpinion) setShowDropdown(true)
          }}
          onFocus={() => {
            if (isOpinion) setShowDropdown(true)
          }}
          onBlur={() => {
            setTimeout(() => setShowDropdown(false), 200)
          }}
          placeholder={isOpinion ? 'Start typing to search opinion types...' : 'e.g. "News", "The Poly"'}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: 14,
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 4,
            background: 'var(--theme-input-bg, var(--theme-elevation-0))',
            color: 'var(--theme-text)',
            outline: 'none',
          }}
        />
        {isOpinion && showDropdown && filtered.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'var(--theme-elevation-0)',
              border: '1px solid var(--theme-elevation-150)',
              borderRadius: 4,
              maxHeight: 220,
              overflowY: 'auto',
              zIndex: 100,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            {filtered.map((type) => (
              <button
                key={type.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(type)
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: 'var(--theme-text)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--theme-elevation-100)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                {type.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
