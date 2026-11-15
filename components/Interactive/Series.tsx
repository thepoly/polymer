'use client'

import { useState, type PointerEvent } from 'react'
import { linearScale, fmtNum, textWidth, spreadLabels } from '@/lib/graph/axis.js'
import { f, full, pointerIn, Tip, TipRow, type ChartProps, type Fmt, type SeriesModel, type TipState } from './shared'

// Column and line charts, laid out as lib/graph/series.js lays them out for print.

type Scale = { domain: number[]; ticks: number[]; map: (v: number) => number }

/** The y axis, with the left margin its tick labels need. */
function yAxis(m: SeriesModel, values: number[], top: number, plotH: number, zero: boolean) {
  const scale: Scale = linearScale(Math.min(...values), Math.max(...values), top + plotH, top, {
    min: m.y.min,
    max: m.y.max,
    zero,
  } as never)
  const tickW = Math.max(...scale.ticks.map((t) => textWidth(fmtNum(t, m.fmt), 6.5)))
  return { scale, left: (m.y.label ? 16 : 0) + tickW + 6 }
}

function Grid({ scale, left, right, fmt }: { scale: Scale; left: number; right: number; fmt: Fmt }) {
  return (
    <g>
      {scale.ticks.map((v) => {
        const y = scale.map(v)
        return (
          <g key={v}>
            <line className={v === 0 ? 'ig-base' : 'ig-grid'} x1={left} x2={right} y1={y} y2={y} />
            <text className="ig-tick" x={left - 5} y={y} textAnchor="end" dominantBaseline="central">
              {fmtNum(v, fmt)}
            </text>
          </g>
        )
      })}
    </g>
  )
}

/** Which category labels to print: every one if they fit, otherwise every nth, always the last. */
function shownLabels(cats: string[], bandW: number) {
  const widest = Math.max(...cats.map((c) => textWidth(c, 6.5))) + 6
  const every = Math.max(1, Math.ceil(widest / Math.max(bandW, 1)))
  const end = cats.length - 1
  return cats
    .map((_, i) => i)
    .filter((i) => i === end || (i % every === 0 && !(every > 1 && end - i < every)))
}

/** Year-like categories: the tightest 1, 2, 5, 10… step whose labels fit. */
function shownNumeric(cats: string[], nums: number[], xs: number[]) {
  const span = Math.max(...nums) - Math.min(...nums)
  const pxPerUnit = span ? (Math.max(...xs) - Math.min(...xs)) / span : Infinity
  const widest = Math.max(...cats.map((c) => textWidth(c, 6.5))) + 8
  const step = [1, 2, 5, 10, 20, 25, 50, 100, 250, 500, 1000].find((s) => s * pxPerUnit >= widest) ?? 1000
  const shown = nums.map((v, i) => (Number.isInteger(v / step) ? i : -1)).filter((i) => i >= 0)
  return shown.length < 2 ? [...new Set([0, nums.length - 1])] : shown
}

function Axes({ m, xs, shown, left, plotW, top, plotH, H }: { m: SeriesModel; xs: number[]; shown: number[]; left: number; plotW: number; top: number; plotH: number; H: number }) {
  return (
    <>
      {m.y.label ? (
        <text className="ig-axis-title" transform={`translate(7 ${f(top + plotH / 2)}) rotate(-90)`} textAnchor="middle">
          {m.y.label}
        </text>
      ) : null}
      {shown.map((i) => (
        <text key={i} className="ig-tick" x={xs[i]} y={top + plotH + 12} textAnchor="middle">
          {m.categories[i]}
        </text>
      ))}
      {m.x.label ? (
        <text className="ig-axis-title" x={left + plotW / 2} y={H - 3} textAnchor="middle">
          {m.x.label}
        </text>
      ) : null}
    </>
  )
}

/** A column with a rounded data end and a square foot on the baseline. */
function columnPath(x: number, w: number, y0: number, y1: number) {
  const r = Math.min(2.5, w / 2, Math.abs(y1 - y0))
  const e = y1 <= y0 ? y1 + r : y1 - r
  return `M${f(x)},${f(y0)}V${f(e)}Q${f(x)},${f(y1)} ${f(x + r)},${f(y1)}H${f(x + w - r)}Q${f(x + w)},${f(y1)} ${f(x + w)},${f(e)}V${f(y0)}Z`
}

/** The text a spec sets inside one column, found by its category's name. */
function insideText(m: SeriesModel, i: number, j: number) {
  const row = m.inside?.find((r) => String(r[0]).trim() === m.categories[i])
  const v = row?.[j + 1]
  return v == null || v === '' ? null : String(v)
}

const PIP_R = 2.2
const PIP_STEP = 6.4

/** The count a column's inside text stands for: "3rd" is 3. */
const countOf = (text: string | null) => {
  const n = parseInt(text ?? '', 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * One white dot per unit of the count, laid in rows from the column's foot up, as many to a
 * row as the column has room for (three at most). `x` is the column's left edge. Where the
 * dots won't fit the column, none are drawn; the readout still gives the count.
 */
function Pips({ text, x, y0, y1, w }: { text: string | null; x: number; y0: number; y1: number; w: number }) {
  const n = countOf(text)
  if (!n) return null
  const perRow = Math.min(3, Math.floor((w - 3) / PIP_STEP))
  if (perRow < 1) return null
  const rows = Math.ceil(n / perRow)
  const h = Math.abs(y0 - y1)
  if (rows * PIP_STEP + 2 > h) return null
  const bottom = Math.max(y0, y1)
  const left = x + (w - perRow * PIP_STEP) / 2 + PIP_STEP / 2
  return (
    <g className="ig-pips">
      {Array.from({ length: n }, (_, k) => (
        <circle key={k} cx={f(left + (k % perRow) * PIP_STEP)} cy={f(bottom - PIP_STEP / 2 - 1 - Math.floor(k / perRow) * PIP_STEP)} r={PIP_R} />
      ))}
    </g>
  )
}

/** What a category holds, for the readout. */
function readout(m: SeriesModel, i: number, total: boolean) {
  const rows = m.series.filter((s) => s.values[i] !== null)
  return (
    <>
      <div className="ig-tip-head">{m.categories[i]}</div>
      {rows.map((s) => {
        const j = m.series.indexOf(s)
        const note = m.inside ? insideText(m, i, j) : null
        return (
          <TipRow
            key={s.name}
            color={s.color}
            name={note ? `${s.name}, ${note}` : s.name}
            value={fmtNum(s.values[i] as number, full(m.fmt))}
            line={m.kind === 'line'}
          />
        )
      })}
      {total && rows.length > 1 ? (
        <TipRow name="Total" value={fmtNum(rows.reduce((a, s) => a + (s.values[i] as number), 0), full(m.fmt))} />
      ) : null}
    </>
  )
}

export function Column({ m, W, k }: ChartProps<SeriesModel>) {
  const [hot, setHot] = useState<number | null>(null)
  const n = m.categories.length
  const count = m.series.length
  const labelEach = n <= 12 && (count === 1 || m.stacked)
  const top = labelEach ? 14 : 8
  const bottom = 16 + (m.x.label ? 16 : 0)

  const totals = m.categories.map((_, i) => m.series.reduce((a, s) => a + Math.max(0, s.values[i] ?? 0), 0))
  const values = m.stacked ? [...totals, 0] : m.series.flatMap((s) => s.values.filter((v): v is number => v !== null))
  const plotH = Math.round(Math.min((W - 40) * 0.62, 260))
  const { scale, left } = yAxis(m, values, top, plotH, true)
  const right = 4
  const plotW = W - left - right
  const band = plotW / n
  const groupW = Math.min(band * 0.72, m.stacked ? 28 : count * 24 + (count - 1) * 2)
  const colW = m.stacked ? groupW : (groupW - (count - 1) * 2) / count
  const centers = m.categories.map((_, i) => left + band * (i + 0.5))
  const base = scale.map(Math.max(scale.domain[0], Math.min(0, scale.domain[1])))
  const H = top + plotH + bottom

  const tip: TipState = hot === null ? null : { x: centers[hot] * k, y: (top + plotH * 0.35) * k, body: readout(m, hot, m.stacked) }

  return (
    <>
      {count > 1 ? (
        <div className="ig-legend">
          {m.series.map((s) => (
            <span key={s.name} className="ig-legend-item">
              <span className="ig-key ig-key-block" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
          {m.inside && m.insideLabel ? (
            <span className="ig-legend-item">
              <span className="ig-key-pip" />
              {m.insideLabel}
            </span>
          ) : null}
        </div>
      ) : null}
      <svg className="ig-chart" viewBox={`0 0 ${f(W)} ${f(H)}`} role="img" aria-label={m.title} onPointerLeave={() => setHot(null)}>
        <Grid scale={scale} left={left} right={W - right} fmt={m.fmt} />
        {m.categories.map((_, i) => {
          const x0 = centers[i] - groupW / 2
          let acc = 0
          return (
            <g key={i} onPointerEnter={() => setHot(i)} onPointerDown={() => setHot(i)} onPointerLeave={() => setHot(null)}>
              {m.series.map((s, j) => {
                const v = s.values[i]
                if (m.stacked) {
                  if (!(v !== null && v > 0)) return null
                  const y0 = scale.map(acc)
                  const y1 = scale.map((acc += v))
                  return (
                    <g key={j}>
                      <rect x={x0} y={y1} width={colW} height={y0 - y1} fill={s.color} stroke="var(--ig-paper)" strokeWidth={1} />
                      <Pips text={insideText(m, i, j)} x={x0} y0={y0} y1={y1} w={colW} />
                    </g>
                  )
                }
                if (v === null) return null
                const x = x0 + j * (colW + 2)
                return (
                  <g key={j}>
                    <path d={columnPath(x, colW, base, scale.map(v))} fill={s.color} />
                    <Pips text={insideText(m, i, j)} x={x} y0={base} y1={scale.map(v)} w={colW} />
                    {labelEach ? (
                      <text className="ig-value" x={x + colW / 2} y={v >= 0 ? scale.map(v) - 4 : scale.map(v) + 10} textAnchor="middle">
                        {fmtNum(v, m.fmt)}
                      </text>
                    ) : null}
                  </g>
                )
              })}
              {m.stacked && labelEach && acc > 0 ? (
                <text className="ig-value" x={centers[i]} y={scale.map(acc) - 4} textAnchor="middle">
                  {fmtNum(acc, m.fmt)}
                </text>
              ) : null}
            </g>
          )
        })}
        <line className="ig-base" x1={left} x2={W - right} y1={base} y2={base} />
        <Axes m={m} xs={centers} shown={shownLabels(m.categories, band)} left={left} plotW={plotW} top={top} plotH={plotH} H={H} />
      </svg>
      <Tip tip={tip} width={W * k} />
    </>
  )
}

// Names at the ends of lines sit at least this far apart (7.5pt type).
const LABEL_GAP = 11
const KEY = 11

export function Line({ m, W, k }: ChartProps<SeriesModel>) {
  // The category under the pointer, and the series whose name is pointed at.
  const [hot, setHot] = useState<number | null>(null)
  const [hotSeries, setHotSeries] = useState<number | null>(null)

  const n = m.categories.length
  const values = m.series.flatMap((s) => s.values.filter((v): v is number => v !== null))
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  // Start at zero unless the data sits well above it, where zero would flatten the lines.
  const zero = m.y.zero ?? (lo >= 0 && lo <= hi * 0.5)
  const top = 8
  const bottom = 16 + (m.x.label ? 16 : 0)

  const named = m.series.length > 1
  const last = m.series.map((s) => s.values.findLastIndex((v) => v !== null))
  const labelled = named ? last.filter((i) => i >= 0).length : 0
  const plotH = Math.max(Math.round(Math.min((W - 40) * 0.6, 250)), labelled * LABEL_GAP + 4)
  const padded = zero || m.y.min !== null ? values : [...values, lo - (hi - lo) * 0.04]
  const { scale, left } = yAxis(m, padded, top, plotH, zero)

  const ends: { j: number; y: number; ly: number }[] = m.series
    .map((s, j) => (last[j] < 0 ? null : { j, y: scale.map(s.values[last[j]] as number), ly: 0 }))
    .filter((e) => e !== null)
    .sort((a, b) => a.y - b.y)
  spreadLabels(ends, LABEL_GAP, top, top + plotH)
  const moved = named && ends.some((e) => Math.abs(e.ly - e.y) > 1.5)
  const gap = moved ? 16 : 8
  const labelW = (j: number) => textWidth(m.series[j].name, 7.5) + (m.series[j].muted ? 0 : KEY)
  const right = named ? Math.min(W * 0.4, Math.max(...ends.map((e) => labelW(e.j))) + gap + 4) : 6
  const plotW = W - left - right

  const nums = m.numericX ? m.categories.map(Number) : null
  let xs: number[]
  if (nums) {
    const a = Math.min(...nums)
    const b = Math.max(...nums)
    xs = nums.map((v) => (a === b ? left + plotW / 2 : left + ((v - a) / (b - a)) * plotW))
  } else {
    xs = m.categories.map((_, i) => (n === 1 ? left + plotW / 2 : left + (i / (n - 1)) * plotW))
  }

  // Gray context lines go down first, so the ones the graph is about run on top.
  const order = m.series.map((_, j) => j).sort((a, b) => Number(m.series[b].muted) - Number(m.series[a].muted))
  const H = top + plotH + bottom
  const dim = (j: number) => (hotSeries !== null && hotSeries !== j) || undefined

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const [x, y] = pointerIn(e, e.currentTarget, W)
    if (x < left - 8 || x > left + plotW + 8 || y < 0 || y > top + plotH + 14) return setHot(null)
    let best = 0
    xs.forEach((v, i) => {
      if (Math.abs(v - x) < Math.abs(xs[best] - x)) best = i
    })
    setHot(best)
  }

  const tip: TipState = hot === null ? null : { x: xs[hot] * k, y: (top + plotH * 0.35) * k, body: readout(m, hot, false) }

  return (
    <>
      <svg
        className="ig-chart"
        viewBox={`0 0 ${f(W)} ${f(H)}`}
        role="img"
        aria-label={m.title}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => {
          setHot(null)
          setHotSeries(null)
        }}
      >
        <Grid scale={scale} left={left} right={W - right} fmt={m.fmt} />
        <line className="ig-base" x1={left} x2={W - right} y1={top + plotH} y2={top + plotH} />
        {hot !== null ? <line className="ig-cursor" x1={xs[hot]} x2={xs[hot]} y1={top} y2={top + plotH} /> : null}
        {order.map((j) => {
          const s = m.series[j]
          // Lines break where a value is missing rather than bridging the gap.
          let d = ''
          let pen = false
          s.values.forEach((v, i) => {
            if (v === null) return void (pen = false)
            d += `${pen ? 'L' : 'M'}${f(xs[i])},${f(scale.map(v))}`
            pen = true
          })
          return <path key={j} className="ig-mark" data-dim={dim(j)} d={d} fill="none" stroke={s.color} strokeWidth={s.muted ? 1.25 : 2} strokeLinejoin="round" strokeLinecap="round" />
        })}
        {[...ends]
          .sort((a, b) => order.indexOf(a.j) - order.indexOf(b.j))
          .map(({ j, y, ly }) => {
            const s = m.series[j]
            const x = xs[last[j]]
            const tx = x + gap
            return (
              <g key={j} className="ig-mark" data-dim={dim(j)} onPointerEnter={() => setHotSeries(j)} onPointerLeave={() => setHotSeries(null)}>
                {named && Math.abs(ly - y) > 1.5 ? <path className="ig-leader" d={`M${f(x + 4)},${f(y)}L${f(tx - 3)},${f(ly)}`} /> : null}
                {s.muted ? <circle cx={x} cy={y} r={2.25} fill={s.color} /> : <circle cx={x} cy={y} r={3.5} fill={s.color} stroke="var(--ig-paper)" strokeWidth={1.5} />}
                {named && !s.muted ? <line x1={tx} x2={tx + KEY - 4} y1={ly} y2={ly} stroke={s.color} strokeWidth={2.5} strokeLinecap="round" /> : null}
                {named ? (
                  <text className={s.muted ? 'ig-end ig-end-muted' : 'ig-end'} x={tx + (s.muted ? 0 : KEY)} y={ly} dy="0.35em">
                    {s.name}
                  </text>
                ) : null}
              </g>
            )
          })}
        {hot !== null
          ? order.map((j) => {
              const v = m.series[j].values[hot]
              return v === null ? null : <circle key={j} cx={xs[hot]} cy={scale.map(v)} r={3.5} fill={m.series[j].color} stroke="var(--ig-paper)" strokeWidth={1.5} pointerEvents="none" />
            })
          : null}
        <Axes m={m} xs={xs} shown={nums ? shownNumeric(m.categories, nums, xs) : shownLabels(m.categories, n > 1 ? plotW / (n - 1) : plotW)} left={left} plotW={plotW} top={top} plotH={plotH} H={H} />
      </svg>
      <Tip tip={tip} width={W * k} />
    </>
  )
}
