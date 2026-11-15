'use client'

import { useId, useState, type PointerEvent } from 'react'
import { lg, fmtNum, linearScale, logScale, textWidth } from '@/lib/graph/axis.js'
import { markPath, marksUnder } from '@/lib/graph/scatter.js'
import { f, pointerIn, Tip, type ChartProps, type ScatterAxis, type ScatterModel, type TipState } from './shared'

// A scatter on log or linear axes, laid out as lib/graph/scatter.js lays it out for print.

type Scale = { domain: number[]; ticks: number[]; map: (v: number) => number; kind: string }

function scaleFor(axis: ScatterAxis, a: number, b: number): Scale {
  const [min, max] = axis.domain
  return axis.scale === 'linear' ? linearScale(min, max, a, b, { min, max } as never) : logScale(min, max, a, b, { min, max } as never)
}

const lines = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : [])
/** An axis's numbers: shortened on the ticks once they reach the millions ($1.5M), exact in the readout. */
const fmtAxis = (axis: ScatterAxis, v: number, exact = false) =>
  fmtNum(v, { prefix: axis.prefix, compact: !exact && Math.max(...axis.domain.map(Math.abs)) >= 1e6 })
const withUnit = (axis: ScatterAxis, v: number) => `${fmtAxis(axis, v, true)}${axis.unit ? ` ${axis.unit}` : ''}`

type Drag = { i: number; from: [number, number]; start: [number, number]; at: [number, number] }

export function Scatter({ m, W, k, onLabelMove }: ChartProps<ScatterModel> & { onLabelMove?: (i: number, dx: number, dy: number) => void }) {
  const [hot, setHot] = useState<number | null>(null)
  const uid = useId()
  // A label being dragged, and where dropped labels sit until the editor sends the graph back.
  const [drag, setDrag] = useState<Drag | null>(null)
  const [dropped, setDropped] = useState<{ m: ScatterModel; at: Record<number, [number, number]> }>({ m, at: {} })
  const offsetOf = (i: number): [number, number] =>
    drag?.i === i ? drag.at : ((dropped.m === m && dropped.at[i]) || [Number(m.points[i].labelDx) || 0, Number(m.points[i].labelDy) || 0])

  const grab = (i: number) => (e: PointerEvent<SVGTextElement>) => {
    const svg = e.currentTarget.ownerSVGElement
    if (!svg) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const o = offsetOf(i)
    setDrag({ i, from: pointerIn(e, svg, W), start: o, at: o })
  }
  const pull = (e: PointerEvent<SVGTextElement>) => {
    const svg = e.currentTarget.ownerSVGElement
    if (!drag || !svg) return
    const [x, y] = pointerIn(e, svg, W)
    const half = (v: number) => Math.round(v * 2) / 2
    setDrag({ ...drag, at: [half(drag.start[0] + x - drag.from[0]), half(drag.start[1] + y - drag.from[1])] })
  }
  const drop = () => {
    if (!drag) return
    const { i, at, start } = drag
    setDrag(null)
    if (at[0] === start[0] && at[1] === start[1]) return
    setDropped({ m, at: { ...(dropped.m === m ? dropped.at : {}), [i]: at } })
    onLabelMove?.(i, at[0], at[1])
  }
  const yLabel = lines(m.y.label)
  const left = 30 + 10 * Math.max(1, yLabel.length)
  const right = 6
  const top = 8
  const bottom = 36
  const plotW = W - left - right
  const plotH = m.plotH ?? Math.round(plotW * m.aspect)
  const H = top + plotH + bottom
  const baseY = top + plotH

  const xs = scaleFor(m.x, left, left + plotW)
  const ys = scaleFor(m.y, baseY, top)

  // Keep the strongest ticks first (powers of ten, or zero), then any other that has room.
  const strong = (v: number) => (ys.kind === 'log' ? Math.abs(lg(v) - Math.round(lg(v))) < 1e-9 : v === 0)
  const kept: number[] = []
  for (const v of [...ys.ticks.filter(strong), ...ys.ticks.filter((v) => !strong(v))]) {
    if (kept.every((t) => Math.abs(ys.map(t) - ys.map(v)) >= 14)) kept.push(v)
  }

  // Context points first so the named ones sit on top.
  const order = m.points
    .map((p, i) => ({ p, i }))
    .sort((a, b) => Number(!!a.p.label) - Number(!!b.p.label) || Number(!!a.p.highlight) - Number(!!b.p.highlight))
  const marks = order.map(({ p, i }) => ({ p, i, x: xs.map(p.x), y: ys.map(p.y), r: p.label ? 7.5 : 6 }))
  const under = marksUnder(marks)
  const placed = new Map(marks.map((mk) => [mk.i, mk]))
  const posOf = (i: number) => placed.get(i) ?? { x: xs.map(m.points[i].x), y: ys.map(m.points[i].y) }

  const picked = hot === null ? null : m.points[hot]
  const tip: TipState = picked
    ? {
        x: posOf(hot!).x * k,
        y: posOf(hot!).y * k,
        body: (
          <>
            <div className="ig-tip-head">{picked.label ?? picked.name ?? m.othersLabel}</div>
            <div className="ig-tip-row">
              <span className="ig-tip-name">{m.x.short || lines(m.x.label).join(' ')}</span>
              <span className="ig-tip-value">{withUnit(m.x, picked.x)}</span>
            </div>
            <div className="ig-tip-row">
              <span className="ig-tip-name">{m.y.short || yLabel.join(' ')}</span>
              <span className="ig-tip-value">{withUnit(m.y, picked.y)}</span>
            </div>
          </>
        ),
      }
    : null

  return (
    <>
      {m.groups?.length ? (
        <div className="ig-legend">
          {m.groups.map((l) => (
            <span key={l.name} className="ig-legend-item">
              <svg className="ig-key-mark" viewBox="0 0 12 12" aria-hidden="true">
                {m.markStyle === 'ring' ? (
                  <path d={markPath(l.shape, 6, 6, 4)} fill="none" stroke={l.base} strokeWidth={2} />
                ) : (
                  <path d={markPath(l.shape, 6, 6, 5)} fill={l.base} fillOpacity={m.markStyle === 'clear' ? 0.5 : 1} />
                )}
              </svg>
              {l.name}
            </span>
          ))}
        </div>
      ) : null}
      <svg className="ig-chart" viewBox={`0 0 ${f(W)} ${f(H)}`} role="img" aria-label={m.title} onPointerLeave={() => setHot(null)}>
        <text className="ig-axis-title" transform={`translate(7 ${f(top + plotH / 2)}) rotate(-90)`} textAnchor="middle">
          {yLabel.map((l, i) => (
            <tspan key={i} x={0} dy={i ? 10 : 0}>
              {l}
            </tspan>
          ))}
        </text>
        {kept.map((v) => {
          const y = ys.map(v)
          return (
            <g key={v}>
              {Math.abs(y - baseY) < 0.5 ? null : <line className="ig-grid" x1={left} x2={W - right} y1={y} y2={y} />}
              <text className="ig-tick" x={left - 5} y={y} textAnchor="end" dominantBaseline="central">
                {fmtAxis(m.y, v)}
              </text>
            </g>
          )
        })}
        <line className="ig-base" x1={left} x2={W - right} y1={baseY} y2={baseY} />
        {ys.kind === 'linear' && ys.domain[0] < 0 && ys.domain[1] > 0 ? <line className="ig-base" x1={left} x2={W - right} y1={ys.map(0)} y2={ys.map(0)} /> : null}
        {xs.ticks.map((v) => (
          <g key={v}>
            <line className="ig-base" x1={xs.map(v)} x2={xs.map(v)} y1={baseY} y2={baseY + 3} />
            <text className="ig-tick" x={xs.map(v)} y={baseY + 13} textAnchor="middle">
              {fmtAxis(m.x, v)}
            </text>
          </g>
        ))}
        <text className="ig-axis-title" x={left + plotW / 2} y={H - 2} textAnchor="middle">
          {lines(m.x.label).join(' ')}
        </text>

        {m.points.map((p, i) => {
          const note = lines(p.note)
          if (!note.length) return null
          const { x, y } = posOf(i)
          const atLeft = p.noteAt === 'left'
          const textX = atLeft ? x - 10 : x + 2
          const textTop = atLeft ? y + 3 - ((note.length - 1) * 10) / 2 : y + 24
          return (
            <g key={i}>
              {atLeft ? null : <line className="ig-leader" x1={x} x2={x} y1={y + 8} y2={textTop - 7} />}
              {note.map((l, j) => (
                <text key={j} className="ig-note ig-halo" x={textX} y={textTop + j * 10} textAnchor="end">
                  {l}
                </text>
              ))}
            </g>
          )
        })}

        {m.groups?.map((g) =>
          g.trend ? (
            <line key={g.name} className="ig-trend" stroke={g.base}
              x1={f(xs.map(g.trend.x0))} y1={f(ys.map(g.trend.y0))} x2={f(xs.map(g.trend.x1))} y2={f(ys.map(g.trend.y1))} />
          ) : null,
        )}

        {/* Each mark sits inside a paper-colored edge that shows only over the earlier marks it lands on. */}
        {marks.map(({ p, i, x, y, r }, n) =>
          m.markStyle === 'clear' ? (
            <path key={i} className="ig-mark" d={markPath(p.shape, x, y, r - 1)} fill={p.color} fillOpacity={0.5} />
          ) : m.markStyle === 'ring' ? (
            <path key={i} className="ig-mark" d={markPath(p.shape, x, y, r - 2)} fill="none" stroke={p.color} strokeWidth={2} strokeLinejoin="round" />
          ) : (
          <g key={i}>
            {under[n].length ? (
              <>
                <clipPath id={`${uid}-under-${n}`}>
                  {under[n].map((j: number) => (
                    <path key={j} d={markPath(marks[j].p.shape, marks[j].x, marks[j].y, marks[j].r + 1)} />
                  ))}
                </clipPath>
                <path d={markPath(p.shape, x, y, r)} fill="none" stroke="var(--ig-paper)" strokeWidth={2} strokeLinejoin="round" clipPath={`url(#${uid}-under-${n})`} />
              </>
            ) : null}
            <path className="ig-mark" d={markPath(p.shape, x, y, r - 1)} fill={p.color} />
          </g>
          ),
        )}

        {picked ? (
          <path className="ig-ring" d={markPath(picked.shape, posOf(hot!).x, posOf(hot!).y, picked.label ? 7.5 : 6)} />
        ) : null}

        {m.points.map((p, i) => {
          if (!p.label) return null
          const { x, y } = posOf(i)
          const side = p.labelAt ?? (x + 12 + textWidth(p.label, 8) > W - right ? 'left' : 'right')
          const at = {
            right: [x + 12, y, 'start', 'central'],
            left: [x - 12, y, 'end', 'central'],
            above: [x, y - 13, 'middle', 'auto'],
            below: [x, y + 20, 'middle', 'auto'],
          }[side] as [number, number, 'start' | 'end' | 'middle', 'central' | 'auto']
          const [dx, dy] = offsetOf(i)
          return (
            <text
              key={i}
              className={`ig-point-label ig-halo${p.highlight ? ' ig-hl' : ''}${onLabelMove ? ' ig-drag' : ''}`}
              x={f(at[0] + dx)}
              y={f(at[1] + dy)}
              textAnchor={at[2]}
              dominantBaseline={at[3]}
              {...(onLabelMove ? { onPointerDown: grab(i), onPointerMove: pull, onPointerUp: drop, onPointerCancel: drop } : {})}
            >
              {p.label}
            </text>
          )
        })}

        {/* Each point answers to exactly the dot it draws, its white edge included, on top of the labels. */}
        {marks.map(({ p, i, x, y, r }) => (
          <path key={i} d={markPath(p.shape, x, y, r)}
            fill="transparent"
            stroke="transparent"
            strokeWidth={2}
            strokeLinejoin="round"
            onPointerEnter={() => setHot(i)}
            onPointerDown={() => setHot(i)}
            onPointerLeave={() => setHot((h) => (h === i ? null : h))}
          />
        ))}
      </svg>
      <Tip tip={tip} width={W * k} />
    </>
  )
}
