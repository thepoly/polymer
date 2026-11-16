'use client'

import { useEffect, useRef, useState } from 'react'
import Graph from '@/components/Interactive/Graph'
import type { GraphSettings, GraphSpec } from '@/components/Interactive/shared'

/**
 * Draws whatever graph the editor at /graph posts to it, as the article will show it, and
 * posts back its height so the editor can size the frame.
 */
export default function LivePreview() {
  const [spec, setSpec] = useState<GraphSpec | null>(null)
  const [settings, setSettings] = useState<GraphSettings | undefined>(undefined)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return
      if (e.data?.type === 'graph' && e.data.graph && typeof e.data.graph === 'object') {
        setSpec(e.data.graph)
        setSettings(e.data.settings && typeof e.data.settings === 'object' ? e.data.settings : undefined)
      }
    }
    window.addEventListener('message', onMessage)
    window.parent.postMessage({ type: 'ready' }, window.location.origin)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      window.parent.postMessage({ type: 'height', height: Math.ceil(el.getBoundingClientRect().height) }, window.location.origin)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={ref} style={{ padding: '1px 16px' }}>
      {spec ? (
        <Graph
          spec={spec}
          settings={settings}
          exposeTips
          onLabelMove={(index, dx, dy) => window.parent.postMessage({ type: 'label', index, dx, dy }, window.location.origin)}
        />
      ) : null}
    </div>
  )
}
