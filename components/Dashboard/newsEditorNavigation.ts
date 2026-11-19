const INDEX = '__newsEditorHistoryIndex'
const MESSAGE = 'You have unsaved changes. Leave without saving?'

type NavigationEvent = Event & { navigationType: string; destination: { sameDocument: boolean } }
type Navigation = EventTarget & { currentEntry?: { index: number } }

/** Protect custom editors, which do not participate in Payload's Form state. */
export function installNewsEditorNavigation(isSaved: () => boolean) {
  const navigation = (window as Window & { navigation?: Navigation }).navigation
  const { history } = window
  const originalPush = history.pushState
  const originalReplace = history.replaceState
  let index = navigation?.currentEntry?.index ?? history.state?.[INDEX] ?? 0
  let restoring = false
  let approvedTraversal = false
  const stateAt = (state: unknown, at: number) =>
    state && typeof state === 'object' ? { ...state, [INDEX]: at } : state
  originalReplace.call(history, stateAt(history.state, index), '')

  const push: History['pushState'] = function (state, unused, url) {
    originalPush.call(history, stateAt(state, index + 1), unused, url)
    index += 1
  }
  const replace: History['replaceState'] = function (state, unused, url) {
    originalReplace.call(history, stateAt(state, index), unused, url)
  }
  history.pushState = push
  history.replaceState = replace

  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (isSaved()) return
    event.preventDefault()
    event.returnValue = ''
  }
  const click = (event: MouseEvent) => {
    if (isSaved() || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
    if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return
    const target = new URL(anchor.href)
    const current = new URL(window.location.href)
    if (target.origin === current.origin && target.pathname === current.pathname && target.search === current.search) return
    if (!window.confirm(MESSAGE)) {
      event.preventDefault()
      event.stopImmediatePropagation()
    }
  }
  // Modern browsers can cancel traversal before the URL or React tree changes.
  const navigate = (event: Event) => {
    const e = event as NavigationEvent
    if (e.navigationType !== 'traverse' || !e.destination.sameDocument || !e.cancelable || isSaved()) return
    approvedTraversal = window.confirm(MESSAGE)
    if (!approvedTraversal) e.preventDefault()
  }
  // Fallback for browsers without cancellable Navigation API traversals. Stop
  // Next's popstate handler on cancellation, then restore the history entry.
  const pop = (event: PopStateEvent) => {
    const targetIndex = navigation?.currentEntry?.index ?? event.state?.[INDEX] ?? index - 1
    if (restoring) {
      restoring = false
      event.stopImmediatePropagation()
      return
    }
    if (!isSaved() && !approvedTraversal && !window.confirm(MESSAGE)) {
      event.stopImmediatePropagation()
      restoring = true
      history.go(index - targetIndex)
      return
    }
    approvedTraversal = false
    index = targetIndex
  }

  document.addEventListener('click', click, true)
  window.addEventListener('beforeunload', beforeUnload)
  window.addEventListener('popstate', pop, true)
  navigation?.addEventListener('navigate', navigate)
  return () => {
    document.removeEventListener('click', click, true)
    window.removeEventListener('beforeunload', beforeUnload)
    window.removeEventListener('popstate', pop, true)
    navigation?.removeEventListener('navigate', navigate)
    if (history.pushState === push) history.pushState = originalPush
    if (history.replaceState === replace) history.replaceState = originalReplace
  }
}
