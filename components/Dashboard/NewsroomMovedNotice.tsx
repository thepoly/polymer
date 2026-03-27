'use client'

import { useEffect, useState } from 'react'

export function NewsroomMovedNotice({
  shouldShow,
}: {
  shouldShow: boolean
}) {
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
      await fetch('/api/newsroom/admin-move-notice', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
      })
    } finally {
      setIsOpen(false)
      setIsSaving(false)
    }
  }

  return (
    <div className="newsroom-notice-overlay">
      <div className="newsroom-notice-modal">
        <p className="newsroom-notice-version">
          Polymer 1.0.0 - <span className="newsroom-notice-rainbow">Designed for the ENTIRE Polytechnic.</span>
        </p>
        <h2>Welcome to Polymer 1.0.0! 🎉 🥳</h2>
        <div className="newsroom-notice-body">
          <p className="newsroom-notice-heading">Release notes: (PLEASE READ THEM. I WROTE THESE)</p>
          <ul className="newsroom-notice-list">
            <li>/admin has moved to /newsroom! Kinda a cooler name, I think. - Ronan<br />You can still access it at /admin if you&apos;d like - it&apos;ll just redirect to /newsroom.</li>
            <li>Payload is better than Wagtail</li>
            <li>You can now find everything from one search bar in the admin panel. Articles, Users, Skeletons, Layouts, Media - all in one place.</li>
            <li>All poly members should have Polymer accounts, enabled by Polymer&apos;s advanced permission management. The base permission is to edit your profile - do this by clicking your profile picture on the next page.</li>
          </ul>
        </div>
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
  )
}
