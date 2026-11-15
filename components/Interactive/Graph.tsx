'use client'

import { useId, useMemo } from 'react'
import { buildGraph } from '@/lib/graph/graph.js'
import { partsSvg, webScale } from '@/public/graph-editor/parts.js'
import { Sliced, Bars } from './Sliced'
import { Column, Line } from './Series'
import { Scatter } from './Scatter'
import { Flow } from './Flow'
import { useWidth, type CustomModel, type GraphSettings, type GraphSpec, type Model, type ScatterModel, type SeriesModel, type SlicedModel } from './shared'
import './interactive.css'

// Type sizes come from the print graphics, which are set in points for a 3.5in column.
// On screen each layout unit is drawn this many px wide, so the same proportions read
// at web sizes.
const scaleFor = (px: number) => webScale(px) as number

/**
 * A custom graph: the parts as the editor left them, drawn as they are. Its title, key and
 * source are parts too, so it gets no heading of its own, and nothing in it answers to the pointer.
 */
function Custom({ m, k, px }: { m: CustomModel; k: number; px: number }) {
  // The layout made for this width: the web one in an article column, the phone one when narrow.
  const view = (px >= 560 ? m.views.web : m.views.phone) ?? m.views.web ?? m.views.print ?? m.views.phone
  const id = useId()
  if (!view) return null
  const [w, h] = view.size
  return (
    <svg
      className="ig-chart ig-custom"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={m.title}
      style={{ maxWidth: w * k, margin: '0 auto' }}
      // Safe to set as markup: partsSvg escapes every string and checks every number, color and keyword.
      dangerouslySetInnerHTML={{ __html: partsSvg(view.parts, { prefix: `ig${id}` }) as string }}
    />
  )
}

/**
 * One graph file, drawn live. It takes the same file the editor at /graph saves, builds
 * the same model, and lays it out to whatever width it's given.
 */
export default function Graph({
  spec,
  size = 'text',
  settings,
  onLabelMove,
}: {
  spec: GraphSpec
  size?: 'text' | 'wide'
  /** The site's graph settings (brand colors). Without them the built-in colors are used. */
  settings?: GraphSettings
  /** Given only in the editor, where a point's label can be dragged: its index and new offset. */
  onLabelMove?: (index: number, dx: number, dy: number) => void
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const px = width || (size === 'wide' ? 1040 : 680)
  const k = scaleFor(px)
  const W = px / k

  const built = useMemo(() => {
    try {
      // Graphs here carry their own numbers; "combine" can't reach into the editor's saved files.
      const load = (name: string) => {
        throw new Error(`"${name}" is another graph's file. List its items here instead.`)
      }
      const m = buildGraph(spec, load, settings ?? null) as unknown as Model
      // Text inside columns is only drawn here, so it rides along beside the shared model.
      if (m.kind === 'column' && Array.isArray(spec.inside)) {
        m.inside = spec.inside as SeriesModel['inside']
        m.insideLabel = typeof spec.insideLabel === 'string' ? spec.insideLabel : ''
      }
      return { m, error: null }
    } catch (err) {
      return { m: null, error: (err as Error).message }
    }
  }, [spec, settings])

  const m = built.m
  if (m?.kind === 'custom') {
    return (
      <figure className={`ig ig-${size}`}>
        <div className="ig-plot" ref={ref}>
          <Custom m={m} k={k} px={px} />
        </div>
      </figure>
    )
  }
  const foot = m ? [m.source && `Source: ${m.source}`, m.credit].filter(Boolean).join(' · ') : ''

  return (
    <figure className={`ig ig-${size}`}>
      <div className="ig-top">
        {m?.kicker ? <div className="ig-kicker">{m.kicker}</div> : null}
        {m?.title ? <h3 className="ig-title">{m.title}</h3> : null}
        {m?.dek ? <p className="ig-dek">{m.dek}</p> : null}
      </div>
      <div className="ig-plot" ref={ref}>
        {!m ? (
          <p className="ig-error">{built.error}</p>
        ) : m.kind === 'flow' ? (
          <Flow spec={spec} settings={settings} W={W} k={k} />
        ) : m.kind === 'scatter' ? (
          <Scatter m={m as ScatterModel} W={W} k={k} onLabelMove={onLabelMove} />
        ) : m.kind === 'line' ? (
          <Line m={m as SeriesModel} W={W} k={k} />
        ) : m.kind === 'column' ? (
          <Column m={m as SeriesModel} W={W} k={k} />
        ) : m.kind === 'bar' ? (
          <Bars m={m as SlicedModel} W={W} k={k} />
        ) : (
          <Sliced m={m as SlicedModel} W={W} k={k} />
        )}
      </div>
      {foot ? <figcaption className="ig-source">{foot}</figcaption> : null}
    </figure>
  )
}
