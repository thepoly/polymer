'use client'
import { useState } from 'react'
import type { Speaker } from '@/lib/transcribe/types'

interface Props {
  speakers: Speaker[]
  segmentCounts: Record<string, number>
  onRename: (id: string, label: string) => void
}

export default function SpeakerSidebar({ speakers, segmentCounts, onRename }: Props) {
  return (
    <aside className="transcribe-speakers">
      <h3>Speakers</h3>
      {speakers.map((sp) => (
        <SpeakerRow
          key={sp.id}
          sp={sp}
          count={segmentCounts[sp.id] ?? 0}
          onRename={onRename}
        />
      ))}
    </aside>
  )
}

function SpeakerRow({
  sp,
  count,
  onRename,
}: {
  sp: Speaker
  count: number
  onRename: Props['onRename']
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(sp.label ?? '')
  const commit = () => {
    setEditing(false)
    if (draft !== (sp.label ?? '')) onRename(sp.id, draft)
  }
  return (
    <div className="transcribe-speakers__row">
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            else if (e.key === 'Escape') {
              setDraft(sp.label ?? '')
              setEditing(false)
            }
          }}
          style={{ width: '100%' }}
        />
      ) : (
        <button
          className="transcribe-speakers__name"
          onClick={() => {
            setDraft(sp.label ?? '')
            setEditing(true)
          }}
          title={`Rename ${sp.id}`}
        >
          {sp.label || sp.id}
        </button>
      )}
      <div className="transcribe-speakers__count">
        {count} segment{count === 1 ? '' : 's'}
      </div>
    </div>
  )
}
