'use client'

import { useMemo, useState } from 'react'
import { buildGraph } from '@/lib/graph/graph.js'
import { flowGeometry } from '@/lib/graph/flow.js'
import { fmtNum } from '@/lib/graph/axis.js'
import { f, full, pointerIn, Tip, type FlowGeometry, type FlowLink, type FlowModel, type GraphSettings, type GraphSpec, type TipState } from './shared'

type Hot = { node: string } | { link: number; x: number; y: number } | null

/**
 * A flow graph, drawn from the same geometry as the print one. Pointing at a bar picks out
 * the bands in and out of it; pointing at a band reads out what it carries.
 */
export function Flow({ spec, settings, W, k }: { spec: GraphSpec; settings?: GraphSettings; W: number; k: number }) {
  const [hot, setHot] = useState<Hot>(null)
  // Laying out moves the model's bars, so each width gets a model of its own.
  const { m, g } = useMemo(() => {
    const model = buildGraph(spec, () => ({}), settings ?? null) as unknown as FlowModel
    return { m: model, g: flowGeometry(model, W) as unknown as FlowGeometry }
  }, [spec, settings, W])

  const touches = (l: FlowLink) =>
    !hot || ('node' in hot ? l.source.name === hot.node || l.target.name === hot.node : l.index === hot.link)
  const lit = (name: string) =>
    !hot ||
    ('node' in hot
      ? name === hot.node || m.links.some((l) => touches(l) && (l.source.name === name || l.target.name === name))
      : m.links.some((l) => l.index === hot.link && (l.source.name === name || l.target.name === name)))

  const band = hot && 'link' in hot ? m.links.find((l) => l.index === hot.link) : null
  const tip: TipState =
    band && hot && 'link' in hot
      ? {
          x: hot.x * k,
          y: hot.y * k,
          body: (
            <>
              <div className="ig-tip-head">
                {band.source.name} → {band.target.name}
              </div>
              <div className="ig-tip-row">
                <span className="ig-tip-value">{fmtNum(band.value, full(m.fmt))}</span>
                <span className="ig-tip-name">{Math.round((band.value / m.total) * 100)}%</span>
              </div>
            </>
          ),
        }
      : null

  return (
    <>
      <svg className="ig-chart ig-flow" viewBox={`0 0 ${f(W)} ${f(g.H)}`} role="img" aria-label={m.title} onPointerLeave={() => setHot(null)}>
        <g>
          {g.bands.map((b) => (
            <path
              key={b.link.index}
              className="ig-mark"
              data-dim={!touches(b.link) || undefined}
              d={b.d}
              fill={b.fill}
              fillOpacity={hot && touches(b.link) ? Math.min(1, b.opacity + 0.25) : b.opacity}
              onPointerMove={(e) => {
                const [x, y] = pointerIn(e, e.currentTarget.ownerSVGElement ?? e.currentTarget, W)
                setHot({ link: b.link.index, x, y })
              }}
            />
          ))}
        </g>
        <g>
          {g.bars.map((b) => (
            <rect key={b.node.name} className="ig-mark" data-dim={!lit(b.node.name) || undefined} x={b.x} y={b.y} width={b.w} height={b.h} fill={b.color} />
          ))}
        </g>
        <g>
          {g.labels.map((l) => (
            <g key={l.node.name} className="ig-mark" data-dim={!lit(l.node.name) || undefined} onPointerEnter={() => setHot({ node: l.node.name })}>
              {l.leader ? <path className="ig-leader" d={l.leader} /> : null}
              <text className="ig-flow-label ig-halo" x={l.tx} y={l.ly} dy={l.twoLine ? undefined : '0.35em'}>
                {!l.rest ? (
                  <tspan className="ig-name">{l.name}</tspan>
                ) : l.twoLine ? (
                  <>
                    <tspan className="ig-name" x={l.tx} dy="-0.225em">
                      {l.name}
                    </tspan>
                    <tspan x={l.tx} dy="1.15em">
                      {l.rest}
                    </tspan>
                  </>
                ) : (
                  <>
                    <tspan className="ig-name">{l.name}</tspan> <tspan>{l.rest}</tspan>
                  </>
                )}
              </text>
            </g>
          ))}
        </g>
        {/* Bars are thin, so each answers to a wider strip around it. */}
        {g.bars.map((b) => (
          <rect key={b.node.name} x={b.x - 4} y={b.y} width={b.w + 8} height={b.h} fill="transparent" onPointerEnter={() => setHot({ node: b.node.name })} onPointerDown={() => setHot({ node: b.node.name })} />
        ))}
      </svg>
      <Tip tip={tip} width={W * k} />
    </>
  )
}
