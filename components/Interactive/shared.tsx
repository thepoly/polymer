'use client'

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'

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

export type Series = { name: string; color: string; muted: boolean; values: (number | null)[] }
export type SeriesModel = Head & {
  kind: 'line' | 'column'
  categories: string[]
  series: Series[]
  numericX: boolean
  stacked: boolean
  /** What one dot inside a column stands for, for the key. */
  insideLabel?: string
  /** Text set inside each column: rows of [category, one entry per series]. */
  inside?: (string | number | null)[][]
  fmt: Fmt
  x: { label: string }
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
export type CustomView = { size: [number, number]; parts: unknown[] }
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

/** Readouts give the exact figure, written out with commas; only the axes shorten to $1.5M. */
export const full = (fmt: Fmt): Fmt => ({ ...fmt, compact: false })
