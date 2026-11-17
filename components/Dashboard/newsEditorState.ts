'use client'

import { useState, useSyncExternalStore } from 'react'

/** A completed request only acknowledges the edits included in that request. */
export function createNewsEditorState() {
  let revision = 0
  let savedRevision = 0
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach(listener => listener())
  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    isSaved: () => revision === savedRevision,
    captureRevision: () => revision,
    markDirty: () => { revision += 1; notify() },
    confirmSaved: (sentRevision: number) => {
      savedRevision = Math.max(savedRevision, sentRevision)
      notify()
    },
  }
}

export function useNewsEditorState() {
  const [state] = useState(createNewsEditorState)
  const saved = useSyncExternalStore(state.subscribe, state.isSaved, () => true)
  return { ...state, saved }
}
