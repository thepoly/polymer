'use client'

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { REF_WIDTH } from '@/lib/graph/refs.js'
import { monoLayout, TICK_PX } from '@/lib/graph/axis.js'

// The models lib/graph builds, as the interactive charts read them.

export type Fmt = { prefix?: string; suffix?: string; decimals?: number; compact?: boolean }

export type Head = { kicker: string; title: string; dek: string; source: string; credit: string; widthIn: number }

export type Row = { label: string; value: number; color: string; pct: string }
export type Group = { name: string | null; rows: Row[]; total: number; pct: string }
export type SlicedModel = Head & {
  kind: 'ring' | 'pie' | 'pie3d' | 'bar'
  centerLabel: string
  valueLabel: string
  fmt: Fmt
  groups: Group[]
  rows: Row[]
  total: number
}

/** A line drawn across the plot at a chosen value of x or y, as lib/graph/refs.js builds it. */
export type Ref = { axis: 'x' | 'y'; value: number | null; category: string | null; text: string | null; label: string; color: string }

export type Series = { name: string; color: string; muted: boolean; values: (number | null)[] }
export type SeriesModel = Head & {
  kind: 'line' | 'column'
  categories: string[]
  series: Series[]
  numericX: boolean
  stacked: boolean
  /** A dashed least-squares line through each series. */
  trend?: boolean
  /** A line chart's names in a key above the plot, not at the lines' ends. */
  keyAbove?: boolean
  /** On a column chart, one series drawn as a line against its own axis on the right. */
  overlay?: { name: string; color: string; values: (number | null)[]; fmt: Fmt; max?: number | null } | null
  /** Lines at chosen values across the plot. */
  refs?: Ref[]
  /** The gap between two lines, shaded: the two series' indexes, and what each side is called. */
  shade?: { a: number; b: number; above: string; below: string } | null
  /** What one dot inside a column stands for, for the key. */
  insideLabel?: string
  /** Text set inside each column: rows of [category, one entry per series]. */
  inside?: (string | number | null)[][]
  fmt: Fmt
  x: { label: string; min?: number | null; max?: number | null }
  y: { label: string; min: number | null; max: number | null; zero: boolean | null }
}

export type ScatterPoint = {
  label?: string
  name?: string
  x: number
  y: number
  color: string
  highlight?: boolean
  labelAt?: 'right' | 'left' | 'above' | 'below'
  /** How far the label has been dragged from where labelAt puts it, in layout units. */
  labelDx?: number
  labelDy?: number
  note?: string | string[]
  noteAt?: 'left' | 'below'
  /** The group the point belongs to, which sets its color and shape. */
  group?: string
  shape?: string
  /** On a date axis, the date as given, for the readout ("Aug. 2023"). */
  xText?: string
  yText?: string
}
export type ScatterAxis = {
  label: string | string[]
  short: string
  unit: string
  prefix: string
  /** Years print without a comma: 2023. */
  year?: boolean
  scale: 'log' | 'linear'
  domain: [number, number]
}
export type ScatterModel = Head & {
  kind: 'scatter'
  aspect: number
  plotH: number | null
  othersLabel: string
  markStyle: 'solid' | 'clear' | 'ring'
  /** Named groups of points, keyed above the plot. */
  /** How big the dots are in print, in an article and on a phone, as a share of the usual size. */
  dotSize?: { print: number; web: number; phone: number }
  /** Lines at chosen values across the plot. */
  refs?: Ref[]
  groups: { name: string; color: string; shape: string; base: string; dark: string; trend?: { x0: number; y0: number; x1: number; y1: number } | null }[]
  x: ScatterAxis
  y: ScatterAxis
  points: ScatterPoint[]
}

export type FlowNode = { name: string; value: number; color: string }
export type FlowLink = { source: FlowNode; target: FlowNode; value: number; index: number }
export type FlowModel = Head & { kind: 'flow'; total: number; fmt: Fmt; nodes: FlowNode[]; links: FlowLink[] }
export type FlowGeometry = {
  W: number
  H: number
  bands: { link: FlowLink; d: string; fill: string; opacity: number }[]
  bars: { node: FlowNode; x: number; y: number; w: number; h: number; color: string }[]
  labels: { node: FlowNode; name: string; rest: string; tx: number; ly: number; leader: string | null; twoLine: boolean }[]
}

/** A graph rearranged by hand: its parts for each place it's shown, each in a box `size` units wide and tall. */
export type CustomView = { size: [number, number]; parts: unknown[]; tips?: Record<string, TipData> }
export type CustomModel = Head & { kind: 'custom'; views: { print?: CustomView; web?: CustomView; phone?: CustomView } }

export type Model = SlicedModel | SeriesModel | ScatterModel | FlowModel | CustomModel

/** The site's graph settings, as lib/graph/store reads them. */
export type { GraphSettings } from '@/lib/graph/store'

/** A graph file, as the editor at /graph writes it. */
export type GraphSpec = { kind?: string } & Record<string, unknown>

/** What every chart is handed: its model, the width it lays out at, and px per layout unit. */
export type ChartProps<M> = { m: M; W: number; k: number }

export const f = (n: number) => n.toFixed(2)

/** The rendered width of an element, tracked as it resizes. Zero until it's measured. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    // Measured at once too: a frame the browser isn't drawing hears from the observer late, or never.
    setWidth(el.clientWidth - (parseFloat(getComputedStyle(el).paddingLeft) || 0) - (parseFloat(getComputedStyle(el).paddingRight) || 0))
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

/** A pointer's position in the chart's own layout units. */
export function pointerIn(e: PointerEvent, svg: Element, W: number): [number, number] {
  const r = svg.getBoundingClientRect()
  const s = W / r.width
  return [(e.clientX - r.left) * s, (e.clientY - r.top) * s]
}

export type TipState = { x: number; y: number; body: ReactNode } | null

/**
 * The readout for what's under the pointer. With a mouse it sits beside the cursor; with a
 * finger, which would cover it, it sits at the tip's own x and y (px within the plot).
 */
export function Tip({ tip, width }: { tip: TipState; width: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [cursor, setCursor] = useState<[number, number] | null>(null)
  useEffect(() => {
    const plot = ref.current?.parentElement
    if (!plot) return
    const move = (e: globalThis.PointerEvent) => {
      if (e.pointerType !== 'mouse') return setCursor(null)
      const r = plot.getBoundingClientRect()
      setCursor([e.clientX - r.left, e.clientY - r.top])
    }
    plot.addEventListener('pointermove', move)
    plot.addEventListener('pointerdown', move)
    return () => {
      plot.removeEventListener('pointermove', move)
      plot.removeEventListener('pointerdown', move)
    }
  }, [])

  const [x, y] = cursor ?? (tip ? [tip.x, tip.y] : [0, 0])
  const flip = x > width / 2
  return (
    <div
      ref={ref}
      className="ig-tip"
      role="status"
      hidden={!tip}
      // Moved by transform on its own layer, whole px, so Safari doesn't leave its borders behind.
      style={{ transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) translate(${flip ? 'calc(-100% - 14px)' : '14px'}, -50%)` }}
    >
      {tip?.body}
    </div>
  )
}

/** One line of a readout: a color key, a name and a number. */
export function TipRow({ color, name, value, line }: { color?: string; name: string; value: string; line?: boolean }) {
  return (
    <div className="ig-tip-row">
      {color ? <span className={line ? 'ig-key' : 'ig-key ig-key-block'} style={{ background: color }} /> : null}
      <span className="ig-tip-name">{name}</span>
      <span className="ig-tip-value">{value}</span>
    </div>
  )
}

/**
 * A readout as data: a heading and its rows. Live charts draw it, and a custom graph keeps
 * it beside its parts, keyed by the tip each part was made under ("c3", "p12", "s0").
 * `key` is how a row's color is shown: a block, a line, or the faint block of a shaded gap.
 */
export type TipLine = { name: string; value: string; color?: string; key?: 'block' | 'line' | 'shade' }
export type TipData = { head: string; rows: TipLine[] }

export function TipBody({ data }: { data: TipData }) {
  return (
    <>
      <div className="ig-tip-head">{data.head}</div>
      {data.rows.map((r, i) =>
        r.key === 'shade' ? (
          <div key={i} className="ig-tip-row ig-tip-gap">
            <span className="ig-key ig-key-block" style={{ background: r.color, opacity: 0.35 }} />
            <span className="ig-tip-name">{r.name}</span>
            <span className="ig-tip-value">{r.value}</span>
          </div>
        ) : (
          <TipRow key={i} color={r.color} name={r.name} value={r.value} line={r.key === 'line'} />
        ),
      )}
    </>
  )
}

/** Readouts give the exact figure, written out with commas; only the axes shorten to $1.5M. */
export const full = (fmt: Fmt): Fmt => ({ ...fmt, compact: false })

/**
 * Lines at chosen values across a plot from (left, top) to (right, bottom), as print draws
 * them (lib/graph/refs.js): each named on its axis like the tick labels, in its own color.
 * `mapX` and `mapY` place a line, or return null when they can't.
 */
export function RefLines({ refs, left, right, top, bottom, mapX, mapY, tick, labelX, labelY }: {
  refs: Ref[] | undefined
  left: number
  right: number
  top: number
  bottom: number
  mapX: (r: Ref) => number | null
  mapY: (r: Ref) => number | null
  /** The line's value as its axis writes it, for a line with no label. */
  tick: (r: Ref) => string
  /** Where the axes' tick labels sit: a y label's right edge, an x label's baseline. */
  labelX: number
  labelY: number
}) {
  return (
    <g pointerEvents="none">
      {(refs ?? []).map((r, i) => {
        const pos = r.axis === 'x' ? mapX(r) : mapY(r)
        if (pos === null || !Number.isFinite(pos)) return null
        if (r.axis === 'x' ? pos < left - 0.5 || pos > right + 0.5 : pos < top - 0.5 || pos > bottom + 0.5) return null
        return (
          <g key={i}>
            {r.axis === 'x' ? (
              <line x1={f(pos)} x2={f(pos)} y1={f(top)} y2={f(bottom)} stroke={r.color} strokeWidth={REF_WIDTH} />
            ) : (
              <line x1={f(left)} x2={f(right)} y1={f(pos)} y2={f(pos)} stroke={r.color} strokeWidth={REF_WIDTH} />
            )}
            {r.axis === 'x' ? (
              <TickText x={pos} y={labelY} text={r.label || tick(r)} anchor="middle" fill={r.color} />
            ) : (
              <TickText x={labelX} y={pos} text={r.label || tick(r)} anchor="end" baseline="central" fill={r.color} />
            )}
          </g>
        )
      })}
    </g>
  )
}

/**
 * A tick label with its digits evenly spaced, as if the font were tabular (lib/graph/axis.js
 * monoLayout); anything that isn't a number is set as is.
 */
export function TickText({ x, y, text, anchor = 'start', baseline, className = 'ig-tick', fill }: {
  x: number
  y: number
  text: string
  anchor?: 'start' | 'middle' | 'end'
  baseline?: 'central'
  className?: string
  fill?: string
}) {
  const runs = monoLayout(text, TICK_PX, anchor) as [string, number][] | null
  const style = fill ? { fill } : undefined
  if (!runs) {
    return <text className={className} x={f(x)} y={f(y)} textAnchor={anchor} dominantBaseline={baseline} style={style}>{text}</text>
  }
  return (
    <text className={className} x={f(x)} y={f(y)} textAnchor="middle" dominantBaseline={baseline} style={style}>
      {runs.map(([ch, dx], i) => (
        <tspan key={i} x={f(x + dx)}>{ch}</tspan>
      ))}
    </text>
  )
}
