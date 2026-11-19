import { describe, expect, it, vi } from 'vitest'
import { createNewsEditorState } from '@/components/Dashboard/newsEditorState'

describe('editor save acknowledgements', () => {
  it('keeps edits made during a pending save dirty and saveable', () => {
    const state = createNewsEditorState()
    state.markDirty()
    const sent = state.captureRevision()
    state.markDirty()
    state.confirmSaved(sent)
    expect(state.isSaved()).toBe(false)
    state.confirmSaved(state.captureRevision())
    expect(state.isSaved()).toBe(true)
  })

  it('does not mark a failed request saved or let an older acknowledgement regress state', () => {
    const state = createNewsEditorState()
    state.markDirty()
    const earlier = state.captureRevision()
    expect(state.isSaved()).toBe(false)
    state.markDirty()
    state.confirmSaved(state.captureRevision())
    state.confirmSaved(earlier)
    expect(state.isSaved()).toBe(true)
  })

  it('unsubscribes listeners when the editor unmounts', () => {
    const state = createNewsEditorState()
    const listener = vi.fn()
    const unsubscribe = state.subscribe(listener)
    state.markDirty()
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    state.markDirty()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
