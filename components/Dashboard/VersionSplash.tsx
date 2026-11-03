'use client'

import { useEffect, useState } from 'react'
import type { ReleaseNotes } from '@/lib/version'

type Props = {
  /** True when this user has not yet acknowledged the running version. */
  shouldShow: boolean
  version: string
  /** The major line's name — "Indigo" — or null while a major is unnamed. */
  versionName: string | null
  releaseNotes: ReleaseNotes | null
}

/**
 * The welcome splash staff see once per release.
 *
 * Dismissing it stamps the running version onto the user, which is the same
 * field the dashboard's rollout pie chart counts — so the chart doubles as a
 * read on how many people have actually seen the notes.
 */
export function VersionSplash({ shouldShow, version, versionName, releaseNotes }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setIsOpen(shouldShow)
  }, [shouldShow])

  if (!isOpen) {
    return null
  }

  const handleContinue = async () => {
    if (isSaving) {
      return
    }

    setIsSaving(true)

    try {
      await fetch('/api/newsroom/version-notice', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
      })
    } finally {
      // Close regardless: a failed stamp means they see this again next load,
      // which is a far better outcome than trapping them behind the modal.
      setIsOpen(false)
      setIsSaving(false)
    }
  }

  return (
    <div className="newsroom-notice-overlay">
      <div className="newsroom-notice-modal" role="dialog" aria-modal="true" aria-labelledby="newsroom-notice-title">
        <div className="newsroom-notice-eyebrow">
          <p className="newsroom-notice-version">Polymer {version}</p>
          {releaseNotes ? <p className="newsroom-notice-tagline">{releaseNotes.tagline}</p> : null}
        </div>
        <h2 id="newsroom-notice-title">
          Welcome to Polymer {version}
          {versionName ? <span className="newsroom-notice-name">{versionName}</span> : null}
        </h2>
        {releaseNotes ? (
          <div className="newsroom-notice-body">
            <p className="newsroom-notice-heading">What&apos;s new</p>
            <ol className="newsroom-notice-list">
              {releaseNotes.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ol>
          </div>
        ) : null}
        <div className="newsroom-notice-footer">
          <p className="newsroom-notice-hint">You&apos;ll see this once per release.</p>
          <button
            type="button"
            className="newsroom-notice-button"
            onClick={handleContinue}
            disabled={isSaving}
          >
            {isSaving ? 'Opening newsroom...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
