'use client'

import { useId, useState, type PointerEvent } from 'react'
import { lg, fmtNum, linearScale, logScale, textWidth, withEnds } from '@/lib/graph/axis.js'
import { halfPath, markPath, marksUnder, splitOverlaps } from '@/lib/graph/scatter.js'
import { crowdsRef, refYs } from '@/lib/graph/refs.js'
import { f, pointerIn, RefLines, TickText, Tip, TipBody, type ChartProps, type TipData, type ScatterAxis, type ScatterModel, type TipState } from './shared'

// A scatter on log or linear axes, laid out as lib/graph/scatter.js lays it out for print.

type Scale = { domain: number[]; ticks: number[]; map: (v: number) => number; kind: string }

function scaleFor(axis: ScatterAxis, a: number, b: number): Scale {
  const [min, max] = axis.domain
  return axis.scale === 'linear' ? linearScale(min, max, a, b, { min, max } as never) : logScale(min, max, a, b, { min, max } as never)
}

const lines = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : [])
/** An axis's numbers: shortened on the ticks once they reach the millions ($1.5M), exact in the readout. */
const fmtAxis = (axis: ScatterAxis, v: number, exact = false) =>
  fmtNum(v, { prefix: axis.prefix, grouping: !axis.year, compact: !exact && !axis.year && Math.max(...axis.domain.map(Math.abs)) >= 1e6 })
const withUnit = (axis: ScatterAxis, v: number) => `${fmtAxis(axis, v, true)}${axis.unit ? ` ${axis.unit}` : ''}`

/** What a point holds, for the readout: its name, then where it sits on each axis. */
export function pointTip(m: ScatterModel, i: number): TipData {
  const p = m.points[i]
  return {
    head: p.label ?? p.name ?? m.othersLabel,
    rows: [
      { name: m.x.short || lines(m.x.label).join(' '), value: p.xText ?? withUnit(m.x, p.x) },
      { name: m.y.short || lines(m.y.label).join(' '), value: p.yText ?? withUnit(m.y, p.y) },
    ],
  }
}

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
  // Both ends of each axis are always labeled.
  const yTicks = withEnds(ys.ticks, ys.domain, ys.map, 14) as number[]
  const xGap = Math.max(...xs.domain.map((v) => textWidth(fmtAxis(m.x, v), 6.5))) + 6
  const xTicks = withEnds(xs.ticks, xs.domain, xs.map, xGap) as number[]
  const kept: number[] = []
  for (const v of [...yTicks.filter(strong), ...yTicks.filter((v) => !strong(v))]) {
    if (kept.every((t) => Math.abs(ys.map(t) - ys.map(v)) >= 14)) kept.push(v)
  }
  for (const e of ys.domain) if (!kept.includes(e)) kept.push(e)

  // Context points first so the named ones sit on top.
  const order = m.points
    .map((p, i) => ({ p, i }))
    .sort((a, b) => Number(!!a.p.label) - Number(!!b.p.label) || Number(!!a.p.highlight) - Number(!!b.p.highlight))
  // Dots are sized for where they're shown: the article column, or a phone.
  const dot = (W * k >= 560 ? m.dotSize?.web : m.dotSize?.phone) ?? 1
  const rOf = (p: { label?: string }) => (p.label ? 7.5 : 6) * dot
  // Points past the axes' set ends are left out; ones on the edge keep their whole dot.
  const within = (v: number, [a, b]: [number, number]) => v >= Math.min(a, b) - 1e-9 && v <= Math.max(a, b) + 1e-9
  const marks = order
    .filter(({ p }) => within(p.x, m.x.domain) && within(p.y, m.y.domain))
    .map(({ p, i }) => ({ p, i, x: xs.map(p.x), y: ys.map(p.y), r: rOf(p) }))
  const halves = splitOverlaps(marks, (m.groups ?? []).map((g) => g.name)) as Map<number, string>
  const under = marksUnder(marks)
  const placed = new Map(marks.map((mk) => [mk.i, mk]))
  const posOf = (i: number) => placed.get(i) ?? { x: xs.map(m.points[i].x), y: ys.map(m.points[i].y) }

  const refLabelYs = refYs(m.refs, (v: number) => ys.map(v)) as number[]
  const picked = hot === null ? null : m.points[hot]
  const tip: TipState = picked ? { x: posOf(hot!).x * k, y: posOf(hot!).y * k, body: <TipBody data={pointTip(m, hot!)} /> } : null

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
        {/* A tick label that would run into a y line's own label is left off. */}
        {kept.map((v) => {
          const y = ys.map(v)
          return (
            <g key={v}>
              {Math.abs(y - baseY) < 0.5 ? null : <line className="ig-grid" x1={left} x2={W - right} y1={y} y2={y} />}
              {crowdsRef(refLabelYs, y) ? null : (
                <TickText x={left - 5} y={y} text={fmtAxis(m.y, v)} anchor="end" baseline="central" />
              )}
            </g>
          )
        })}
        <line className="ig-base" x1={left} x2={W - right} y1={baseY} y2={baseY} />
        {ys.kind === 'linear' && ys.domain[0] < 0 && ys.domain[1] > 0 ? <line className="ig-base" x1={left} x2={W - right} y1={ys.map(0)} y2={ys.map(0)} /> : null}
        {xTicks.map((v) => (
          <g key={v}>
            <line className="ig-base" x1={xs.map(v)} x2={xs.map(v)} y1={baseY} y2={baseY + 3} />
            <TickText x={xs.map(v)} y={baseY + 13} text={fmtAxis(m.x, v)} anchor="middle" />
          </g>
        ))}
        <text className="ig-axis-title" x={left + plotW / 2} y={H - 2} textAnchor="middle">
          {lines(m.x.label).join(' ')}
        </text>

        {m.points.map((p, i) => {
          const note = lines(p.note)
          if (!note.length || !placed.has(i)) return null
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

        {/* Past the axes' set ends, trend lines stop at the plot's edge. */}
        <clipPath id={`${uid}-lines`}>
          <rect x={f(left)} y={f(top)} width={f(plotW)} height={f(plotH)} />
        </clipPath>
        <RefLines refs={m.refs} left={left} right={W - right} top={top} bottom={baseY} labelX={left - 5} labelY={baseY + 13}
          mapX={(r) => (r.value === null ? null : xs.map(r.value))} mapY={(r) => (r.value === null ? null : ys.map(r.value))}
          tick={(r) => r.text ?? r.category ?? (r.value === null ? '' : fmtAxis(r.axis === 'x' ? m.x : m.y, r.value))} />
        {m.groups?.map((g) =>
          g.trend ? (
            <line key={g.name} className="ig-trend" stroke={g.base} clipPath={`url(#${uid}-lines)`}
              x1={f(xs.map(g.trend.x0))} y1={f(ys.map(g.trend.y0))} x2={f(xs.map(g.trend.x1))} y2={f(ys.map(g.trend.y1))} />
          ) : null,
        )}

        {/* Points past the axes' set ends are cut off just beyond the plot's edge. */}
        <clipPath id={`${uid}-plot`}>
          <rect x={f(left - 10)} y={f(top - 10)} width={f(plotW + 20)} height={f(plotH + 20)} />
        </clipPath>
        {/* Each mark sits inside a paper-colored edge that shows only over the earlier marks it lands on. */}
        <g clipPath={`url(#${uid}-plot)`}>
        {marks.map(({ p, i, x, y, r }, n) =>
          halves.has(n) ? (
            // Two overlapping dots of different colors each show as half, side by side.
            m.markStyle === 'ring' ? (
              <path key={i} data-tip={`p${i}`} className="ig-mark" d={halfPath(p.shape, x, y, r - 2, halves.get(n), true)} fill="none" stroke={p.color} strokeWidth={2} strokeLinejoin="round" />
            ) : (
              <path key={i} data-tip={`p${i}`} className="ig-mark" d={halfPath(p.shape, x, y, r - 1, halves.get(n))} fill={p.color} fillOpacity={m.markStyle === 'clear' ? 0.5 : 1} />
            )
          ) : m.markStyle === 'clear' ? (
            <path key={i} data-tip={`p${i}`} className="ig-mark" d={markPath(p.shape, x, y, r - 1)} fill={p.color} fillOpacity={0.5} />
          ) : m.markStyle === 'ring' ? (
            <path key={i} data-tip={`p${i}`} className="ig-mark" d={markPath(p.shape, x, y, r - 2)} fill="none" stroke={p.color} strokeWidth={2} strokeLinejoin="round" />
          ) : (
          <g key={i} data-tip={`p${i}`}>
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
        </g>

        {picked ? (
          <path className="ig-ring" d={markPath(picked.shape, posOf(hot!).x, posOf(hot!).y, rOf(picked))} />
        ) : null}

        {m.points.map((p, i) => {
          // A point left out for being past the axes' ends takes its label with it.
          if (!p.label || !placed.has(i)) return null
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
            data-tip={`p${i}`}
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
