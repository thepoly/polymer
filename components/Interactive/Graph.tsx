'use client'

import { useId, useMemo, useState, type PointerEvent } from 'react'
import { buildGraph } from '@/lib/graph/graph.js'
import { partsSvg, webScale } from '@/public/graph-editor/parts.js'
import { Sliced, Bars, sliceTip } from './Sliced'
import { Column, Line, seriesTip } from './Series'
import { Scatter, pointTip } from './Scatter'
import { Flow } from './Flow'
import { Tip, TipBody, useWidth, type CustomModel, type TipData, type TipState, type GraphSettings, type GraphSpec, type Model, type ScatterModel, type SeriesModel, type SlicedModel } from './shared'
import './interactive.css'

// Type sizes come from the print graphics, which are set in points for a 3.5in column.
// On screen each layout unit is drawn this many px wide, so the same proportions read
// at web sizes.
const scaleFor = (px: number) => webScale(px) as number

/** Every readout a graph can show, keyed as its marks are (data-tip), for a custom graph to keep. */
function tipsFor(m: Model): Record<string, TipData> {
  const out: Record<string, TipData> = {}
  if (m.kind === 'column' || m.kind === 'line') {
    const sm = m as SeriesModel
    sm.categories.forEach((_, i) => (out[`c${i}`] = seriesTip(sm, i, sm.kind === 'column' && !!sm.stacked)))
  } else if (m.kind === 'scatter') {
    ;(m as ScatterModel).points.forEach((_, i) => (out[`p${i}`] = pointTip(m as ScatterModel, i)))
  } else if (m.kind === 'ring' || m.kind === 'pie' || m.kind === 'pie3d' || m.kind === 'bar') {
    ;(m as SlicedModel).rows.forEach((_, i) => (out[`s${i}`] = sliceTip(m as SlicedModel, i)))
  }
  return out
}

/**
 * A custom graph: the parts as the editor left them, drawn as they are. Its title, key and
 * source are parts too, so it gets no heading of its own. Parts made from a bar, dot or slice
 * keep that mark's readout, and show it when pointed at.
 */
function Custom({ m, k, px }: { m: CustomModel; k: number; px: number }) {
  // The layout made for this width: the web one in an article column, the phone one when narrow.
  const view = (px >= 560 ? m.views.web : m.views.phone) ?? m.views.web ?? m.views.print ?? m.views.phone
  const id = useId()
  const [hot, setHot] = useState<{ key: string; x: number; y: number } | null>(null)
  // Safe to set as markup: partsSvg escapes every string and checks every number, color and keyword.
  const html = useMemo(() => (view ? (partsSvg(view.parts, { prefix: `ig${id}`, hits: true }) as string) : ''), [view, id])
  if (!view) return null
  const [w, h] = view.size
  const tips = view.tips ?? {}
  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const key = (e.target as Element).closest?.('[data-tip]')?.getAttribute('data-tip') ?? ''
    if (!Object.hasOwn(tips, key)) return setHot(null)
    if (hot?.key === key && e.pointerType === 'mouse') return
    const r = (e.currentTarget.parentElement ?? e.currentTarget).getBoundingClientRect()
    setHot({ key, x: e.clientX - r.left, y: e.clientY - r.top })
  }
  const tip: TipState = hot && tips[hot.key] ? { x: hot.x, y: hot.y, body: <TipBody data={tips[hot.key]} /> } : null
  return (
    <>
      <svg
        className="ig-chart ig-custom"
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={m.title}
        style={{ maxWidth: w * k, margin: '0 auto' }}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={() => setHot(null)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <Tip tip={tip} width={px} />
    </>
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
  exposeTips,
}: {
  spec: GraphSpec
  size?: 'text' | 'wide'
  /** The site's graph settings (brand colors). Without them the built-in colors are used. */
  settings?: GraphSettings
  /** Given only in the editor, where a point's label can be dragged: its index and new offset. */
  onLabelMove?: (index: number, dx: number, dy: number) => void
  /** Given only in the editor: the figure carries every readout (data-tips), for a custom graph made from it. */
  exposeTips?: boolean
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
  const tipsJson = exposeTips && m ? JSON.stringify(tipsFor(m)) : undefined
  const foot = m ? [m.source && `Source: ${m.source}`, m.credit].filter(Boolean).join(' · ') : ''

  return (
    <figure className={`ig ig-${size}`} data-tips={tipsJson}>
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
