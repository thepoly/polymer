'use client'

import { Fragment, useMemo, useState } from 'react'
import { slicePath, textOn, shadeOf, ringTotal } from '@/lib/graph/graph.js'
import { fmtNum } from '@/lib/graph/axis.js'
import { f, full, type ChartProps, type SlicedModel, type TipData } from './shared'

const TAU = Math.PI * 2
const TOTAL_CAP = 24 * (96 / 72) * 0.71
const LABEL_DROP = 13

/** What a slice or bar holds, for the readout. Rows are counted through every group in turn. */
export function sliceTip(m: SlicedModel, i: number): TipData {
  const r = m.rows[i]
  const rows = [{ name: m.valueLabel || 'Value', value: fmtNum(r.value, full(m.fmt)), color: r.color, key: 'block' as const }]
  return { head: r.label, rows: m.kind === 'bar' ? rows : [...rows, { name: 'Percent', value: `${r.pct}%` }] }
}

/** Ring, pie and tilted pie, with the key beside them. Pointing at a slice or its row picks it out. */
export function Sliced({ m, W, k }: ChartProps<SlicedModel>) {
  const [hot, setHot] = useState<number | null>(null)
  const arcs = useMemo(() => {
    let a = 0
    return m.rows.map((r) => {
      const a0 = a
      a += (r.value / m.total) * TAU
      return { a0, a1: a, sweep: a - a0 }
    })
  }, [m])
  const dim = (i: number) => (hot !== null && hot !== i) || undefined
  const mark = (i: number) => ({
    className: 'ig-mark',
    'data-dim': dim(i),
    'data-tip': `s${i}`,
    onPointerEnter: () => setHot(i),
  })

  let chart
  if (m.kind === 'pie3d') {
    const width = Math.min(W * 0.7, 2.5 * 96)
    const rx = width / 2 - 1
    const ry = rx * 0.5
    const depth = rx * 0.18
    const cx = width / 2
    const cy = ry + 1
    const height = 2 * ry + depth + 2
    const at = (a: number, s = 1, dy = 0) => `${f(cx + rx * s * Math.sin(a))},${f(cy - ry * s * Math.cos(a) + dy)}`
    const xy = (a: number, s: number) => [cx + rx * s * Math.sin(a), cy - ry * s * Math.cos(a)]
    chart = (
      <svg className="ig-chart" viewBox={`0 0 ${f(width)} ${f(height)}`} style={{ width: width * k }} role="img" aria-label={m.title} onPointerLeave={() => setHot(null)}>
        <g stroke="var(--ig-paper)" strokeWidth={2} strokeLinejoin="round">
          {m.rows.map((r, i) => {
            // Only the front half of the rim faces the reader.
            const s0 = Math.max(arcs[i].a0, Math.PI / 2)
            const s1 = Math.min(arcs[i].a1, (3 * Math.PI) / 2)
            if (s1 <= s0) return null
            return (
              <path
                key={i}
                {...mark(i)}
                fill={shadeOf(r.color)}
                d={`M${at(s0)}A${f(rx)},${f(ry)} 0 0 1 ${at(s1)}L${at(s1, 1, depth)}A${f(rx)},${f(ry)} 0 0 0 ${at(s0, 1, depth)}Z`}
              />
            )
          })}
          {m.rows.map((r, i) => {
            const { a0, a1, sweep } = arcs[i]
            return sweep >= TAU - 1e-9 ? (
              <ellipse key={i} {...mark(i)} cx={cx} cy={cy} rx={rx} ry={ry} fill={r.color} />
            ) : (
              <path key={i} {...mark(i)} fill={r.color} d={`M${f(cx)},${f(cy)}L${at(a0)}A${f(rx)},${f(ry)} 0 ${sweep > Math.PI ? 1 : 0} 1 ${at(a1)}Z`} />
            )
          })}
        </g>
        <g className="ig-slice-labels">
          {m.rows.map((r, i) => {
            const { a0, a1, sweep } = arcs[i]
            const text = `${r.pct}%`
            const [x0, y0] = xy(a0, 0.64)
            const [x1, y1] = xy(a1, 0.64)
            const room = sweep > Math.PI ? Infinity : Math.hypot(x1 - x0, y1 - y0)
            if (room < text.length * 6.2 + 8) return null
            const [lx, ly] = xy((a0 + a1) / 2, 0.64)
            return (
              <text key={i} x={f(lx)} y={f(ly)} fill={textOn(r.color)} textAnchor="middle" dominantBaseline="central" data-dim={dim(i)}>
                {text}
              </text>
            )
          })}
        </g>
      </svg>
    )
  } else {
    const ring = m.kind === 'ring'
    const size = Math.min(W * 0.62, 2.2 * 96)
    const c = size / 2
    const outer = size / 2 - 1
    const inner = ring ? outer * 0.55 : 0
    const labelR = ring ? (outer + inner) / 2 : outer * 0.64
    const picked = hot === null ? null : m.rows[hot]
    const total = ringTotal(m, picked ? picked.value : m.total, inner) as { text: string; pt: number }
    const cap = (TOTAL_CAP * total.pt) / 24
    chart = (
      <svg className="ig-chart" viewBox={`0 0 ${f(size)} ${f(size)}`} style={{ width: size * k }} role="img" aria-label={m.title} onPointerLeave={() => setHot(null)}>
        <g stroke="var(--ig-paper)" strokeWidth={2} strokeLinejoin="round">
          {m.rows.map((r, i) => (
            <path key={i} {...mark(i)} d={slicePath(arcs[i].a0, arcs[i].a1, outer, inner, c, c)} fill={r.color} fillRule="evenodd" />
          ))}
        </g>
        <g className="ig-slice-labels">
          {m.rows.map((r, i) => {
            const { a0, a1, sweep } = arcs[i]
            const text = `${r.pct}%`
            const room = ring ? sweep * labelR : Math.min(sweep * labelR, outer)
            if (room < text.length * 6.2 + 8 && sweep < TAU - 1e-9) return null
            const mid = (a0 + a1) / 2
            return (
              <text key={i} x={f(c + labelR * Math.sin(mid))} y={f(c - labelR * Math.cos(mid))} fill={textOn(r.color)} textAnchor="middle" dominantBaseline="central" data-dim={dim(i)}>
                {text}
              </text>
            )
          })}
        </g>
        {ring ? (
          <>
            <text className="ig-total" x={c} y={c + (cap - LABEL_DROP) / 2} textAnchor="middle" style={{ fontSize: `${total.pt}pt` }}>
              {total.text}
            </text>
            <text className="ig-total-label" x={c} y={c + (cap + LABEL_DROP) / 2} textAnchor="middle">
              {picked ? `${picked.pct}%` : m.centerLabel}
            </text>
          </>
        ) : null}
      </svg>
    )
  }

  let i = 0
  return (
    <div className="ig-sliced">
      {chart}
      <table className="ig-table" onPointerLeave={() => setHot(null)}>
        <thead>
          <tr>
            <th />
            <th className="ig-num">{m.valueLabel}</th>
            <th className="ig-num">Percent</th>
          </tr>
        </thead>
        {m.groups.map((grp, gi) => (
          <tbody key={gi}>
            {grp.name ? (
              <tr className="ig-group">
                <td>{grp.name}</td>
                <td className="ig-num">{fmtNum(grp.total, m.fmt)}</td>
                <td className="ig-num">{grp.pct}%</td>
              </tr>
            ) : null}
            {grp.rows.map((r) => {
              const at = i++
              return (
                <Fragment key={at}>
                  <tr data-tip={`s${at}`} data-dim={dim(at)} data-hot={hot === at || undefined} onPointerEnter={() => setHot(at)}>
                    <td>
                      <span className="ig-key ig-key-block" style={{ background: r.color }} />
                      {r.label}
                    </td>
                    <td className="ig-num">{fmtNum(r.value, m.fmt)}</td>
                    <td className="ig-num">{r.pct}%</td>
                  </tr>
                </Fragment>
              )
            })}
          </tbody>
        ))}
      </table>
    </div>
  )
}

/** Horizontal bars. Pointing at one sets the rest back. */
export function Bars({ m }: ChartProps<SlicedModel>) {
  const [hot, setHot] = useState<string | null>(null)
  const max = Math.max(...m.rows.map((r) => r.value), 0) || 1
  let at = 0
  return (
    <div className="ig-bars" onPointerLeave={() => setHot(null)}>
      {m.groups.map((grp, gi) => (
        <Fragment key={gi}>
          {grp.name ? <div className="ig-bar-group">{grp.name}</div> : null}
          {grp.rows.map((r, ri) => {
            const id = `${gi}-${ri}`
            const dim = (hot !== null && hot !== id) || undefined
            return (
              <div key={id} className="ig-bar-row" data-tip={`s${at++}`} data-dim={dim} onPointerOver={() => setHot(id)}>
                <div className="ig-bar-label">{r.label}</div>
                <div className="ig-bar-track">
                  <span className="ig-bar" style={{ flexBasis: `calc((100% - 56px) * ${(r.value / max).toFixed(4)})`, background: r.color }} />
                  <span className="ig-bar-value">{fmtNum(r.value, m.fmt)}</span>
                </div>
              </div>
            )
          })}
        </Fragment>
      ))}
    </div>
  )
}
