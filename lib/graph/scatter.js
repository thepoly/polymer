import { esc } from "./template.js";
import { RAMP, PURPLE } from "./palette.js";
import { lg, fmtNum, linearScale, logScale, textWidth } from "./axis.js";

// The one point a scatter is about wears the masthead red; the other named points share
// one purple; unnamed points are context and stay gray. Labels stay in ink.
const HIGHLIGHT = RAMP[2];
const NAMED = PURPLE[1];
const CONTEXT = "#bbbbbb";

const f = (n) => n.toFixed(2);
const fmt = (v) => fmtNum(v);

/**
 * One axis's scale over screen range [a, b]. Each axis is log unless it says
 * "scale": "linear"; a "domain" pins both ends, otherwise they're rounded out from the data.
 */
function scaleFor(axis, values, a, b) {
  const [min, max] = axis.domain ?? [null, null];
  const lo = Math.min(...values), hi = Math.max(...values);
  if (axis.scale !== "linear") return logScale(lo, hi, a, b, { min, max });
  // Pad the data a little before rounding out, so a point that lands exactly on a round
  // number gets a step of room rather than sitting on the edge of the plot.
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.04;
  return linearScale(lo - pad, hi + pad, a, b, { min, max });
}

export function buildScatter(g) {
  const xScale = g.x?.scale === "linear" ? "linear" : "log";
  const yScale = g.y?.scale === "linear" ? "linear" : "log";
  const points = g.points.map((p) => {
    const name = p.label ?? "(unnamed)";
    if (xScale === "log" && !(p.x > 0)) throw new Error(`Point ${name} needs a positive x for a log axis. Switch x to linear.`);
    if (yScale === "log" && !(p.y > 0)) throw new Error(`Point ${name} needs a positive y for a log axis. Switch y to linear.`);
    return { ...p, color: p.highlight ? HIGHLIGHT : p.label ? NAMED : CONTEXT };
  });
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  // The ends don't depend on screen size, so they're settled here; ticks wait for the plot.
  const axis = (spec, scale, values) => ({
    label: spec?.label ?? "",
    short: spec?.short ?? "",
    unit: spec?.unit ?? "",
    scale,
    domain: scaleFor({ scale, domain: spec?.domain }, values, 0, 1).domain,
  });
  return {
    kind: "scatter",
    kicker: g.kicker ?? "",
    title: g.title ?? "",
    dek: g.dek ?? "",
    source: g.source ?? "",
    credit: g.credit ?? "",
    widthIn: g.width ?? 3.5,
    // Plot height as a fraction of plot width…
    aspect: g.aspect ?? 0.78,
    // …unless the whole image has a shape to hit (height ÷ width), in which case the render
    // measures the graphic and sets the plot height to make it fit (see bin/graph.js).
    frame: g.frame ?? null,
    plotH: null,
    // What the key calls the unnamed gray points.
    othersLabel: g.othersLabel ?? "Others",
    x: axis(g.x, xScale, xs),
    y: axis(g.y, yScale, ys),
    points,
  };
}

/** Margins and plot size for a scatter `widthPx` wide. */
export function plotBox(m, widthPx) {
  const yLines = Array.isArray(m.y.label) ? m.y.label.length : 1;
  const left = 30 + 10 * yLines, right = 6, top = 8, bottom = 36;
  const plotW = widthPx - left - right;
  const plotH = m.plotH ?? Math.round(plotW * m.aspect);
  return { left, right, top, bottom, plotW, plotH };
}

/** Scatter on log or linear axes: horizontal hairlines only, the y title turned up the left side. */
export function scatterSvg(m, widthPx) {
  const W = widthPx;
  // The y title runs up the left edge, beside the tick labels, on as many lines as it's given.
  const yTitle = Array.isArray(m.y.label) ? m.y.label : [m.y.label];
  const { left, right, top, bottom, plotW, plotH } = plotBox(m, W);
  const H = top + plotH + bottom;

  const xs = scaleFor(m.x, m.x.domain, left, left + plotW);
  const ys = scaleFor(m.y, m.y.domain, top + plotH, top);
  const px = xs.map, py = ys.map;
  const yTicks = ys.ticks, xTicks = xs.ticks;

  // In a short plot neighbouring tick labels can collide: keep the strongest ticks first
  // (powers of ten on a log axis, zero on a linear one), then any other that has room.
  const kept = [];
  const strong = (v) => (ys.kind === "log" ? Math.abs(lg(v) - Math.round(lg(v))) < 1e-9 : v === 0);
  for (const v of [...yTicks.filter(strong), ...yTicks.filter((v) => !strong(v))]) {
    if (kept.every((k) => Math.abs(py(k) - py(v)) >= 14)) kept.push(v);
  }
  // Hairlines at each labelled tick; the baseline is drawn on its own, labelled or not.
  const baseY = top + plotH;
  const grid =
    kept
      .sort((a, b) => a - b)
      .map((v) => {
        const y = py(v);
        const line = Math.abs(y - baseY) < 0.5 ? "" : `<line x1="${left}" x2="${f(W - right)}" y1="${f(y)}" y2="${f(y)}" class="grid"/>`;
        return `${line}
      <text class="tick" x="${left - 5}" y="${f(y)}" text-anchor="end" dominant-baseline="central">${fmt(v)}</text>`;
      })
      .join("") +
    `<line x1="${left}" x2="${f(W - right)}" y1="${f(baseY)}" y2="${f(baseY)}" class="base"/>` +
    // A linear axis that crosses zero gets an ink rule there, so above and below read apart.
    (ys.kind === "linear" && ys.domain[0] < 0 && ys.domain[1] > 0
      ? `<line x1="${left}" x2="${f(W - right)}" y1="${f(py(0))}" y2="${f(py(0))}" class="base"/>`
      : "");

  const xAxis = xTicks
    .map((v) => {
      const x = px(v);
      return `<line class="base" x1="${f(x)}" x2="${f(x)}" y1="${top + plotH}" y2="${top + plotH + 3}"/>
      <text class="tick" x="${f(x)}" y="${top + plotH + 13}" text-anchor="middle">${fmt(v)}</text>`;
    })
    .join("");

  // Context points first so the named ones sit on top.
  const order = [...m.points].sort((a, b) => (a.label ? 1 : 0) - (b.label ? 1 : 0) || (a.highlight ? 1 : 0) - (b.highlight ? 1 : 0));
  const dots = order
    .map((p) => `<circle cx="${f(px(p.x))}" cy="${f(py(p.y))}" r="${p.label ? 5.5 : 4}" fill="${p.color}" stroke="#ffffff" stroke-width="2"/>`)
    .join("");

  const labels = m.points
    .filter((p) => p.label)
    .map((p) => {
      const x = px(p.x), y = py(p.y);
      const at = {
        right: [x + 9, y, "start", "central"],
        left: [x - 9, y, "end", "central"],
        above: [x, y - 10, "middle", "auto"],
        below: [x, y + 17, "middle", "auto"],
      }[p.labelAt ?? (x + 9 + textWidth(p.label, 8) > W - right ? "left" : "right")];
      return `<g class="knockout"><rect class="knockout-bg" fill="#ffffff"/><text class="point-label${p.highlight ? " hl" : ""}" x="${f(at[0])}" y="${f(at[1])}" text-anchor="${at[2]}" dominant-baseline="${at[3]}">${esc(p.label)}</text></g>`;
    })
    .join("");

  // A note hangs below its point on a short leader ("below"), or sits just left of it ("left"),
  // right-aligned either way.
  const notes = m.points
    .filter((p) => p.note)
    .map((p) => {
      const x = px(p.x), y = py(p.y);
      const lines = Array.isArray(p.note) ? p.note : [p.note];
      const left = p.noteAt === "left";
      const textX = left ? x - 10 : x + 2;
      const textTop = left ? y + 3 - ((lines.length - 1) * 10) / 2 : y + 24;
      const leader = left ? "" : `<line class="leader" x1="${f(x)}" x2="${f(x)}" y1="${f(y + 8)}" y2="${f(textTop - 7)}"/>`;
      // Notes and labels sit on a white box, so gridlines stop at the text rather than run
      // through it. The page script below fits each box to its rendered text.
      return `${leader}
      <g class="knockout"><rect class="knockout-bg" fill="#ffffff"/>
      ${lines.map((l, i) => `<text class="note" x="${f(textX)}" y="${f(textTop + i * 10)}" text-anchor="end">${esc(l)}</text>`).join("")}</g>`;
    })
    .join("");

  return `<svg class="chart scatter" width="${f(W)}" height="${f(H)}" viewBox="0 0 ${f(W)} ${f(H)}" role="img" aria-label="${esc(m.title)}">
  <text class="axis-title" transform="translate(7 ${f(top + plotH / 2)}) rotate(-90)" text-anchor="middle">${yTitle
    .map((l, i) => `<tspan x="0" dy="${i ? 10 : 0}">${esc(l)}</tspan>`)
    .join("")}</text>
  ${grid}
  ${xAxis}
  <text class="axis-title" x="${f(left + plotW / 2)}" y="${f(H - 2)}" text-anchor="middle">${esc(m.x.label)}</text>
  ${notes}
  ${dots}
  ${labels}
  <script>
    document.fonts.ready.then(() => {
      for (const g of document.querySelectorAll(".knockout")) {
        const boxes = [...g.querySelectorAll("text")].map((t) => t.getBBox());
        const x0 = Math.min(...boxes.map((b) => b.x)), x1 = Math.max(...boxes.map((b) => b.x + b.width));
        const y0 = Math.min(...boxes.map((b) => b.y)), y1 = Math.max(...boxes.map((b) => b.y + b.height));
        const r = g.querySelector(".knockout-bg");
        r.setAttribute("x", x0 - 3); r.setAttribute("y", y0 - 1);
        r.setAttribute("width", x1 - x0 + 6); r.setAttribute("height", y1 - y0 + 2);
      }
    });
  </script>
</svg>`;
}

/** The scatter's key: every named point with both values, largest x first. */
export function scatterTable(m) {
  const named = m.points.filter((p) => p.label).sort((a, b) => b.x - a.x);
  const rows = named
    .map(
      (p) => `
      <tr>
        <td class="label"><span class="swatch dot" style="background:${p.color}"></span>${esc(p.label)}</td>
        <td class="num">${fmt(p.x)}</td>
        <td class="num">${fmt(p.y)}</td>
      </tr>`
    )
    .join("");
  const others = m.points.some((p) => !p.label)
    ? `
      <tr>
        <td class="label"><span class="swatch dot" style="background:${CONTEXT}"></span>${esc(m.othersLabel)}</td>
        <td class="num"></td>
        <td class="num"></td>
      </tr>`
    : "";
  return `<table>
    <thead><tr><th></th><th class="num wide">${esc(m.x.short)}<br><span class="unit">${esc(m.x.unit)}</span></th><th class="num wide">${esc(m.y.short)}<br><span class="unit">${esc(m.y.unit)}</span></th></tr></thead>
    <tbody>${rows}${others}
    </tbody>
  </table>`;
}

export const scatterCss = `
.scatter { margin-top: 10pt; }
.scatter .grid { stroke: #dddddd; stroke-width: 0.5; }
.scatter .base { stroke: var(--ink); stroke-width: 0.75; }
.scatter .tick { font-size: 6.5pt; fill: var(--muted); }
.scatter .axis-title { font-size: 7pt; fill: var(--ink); }
.scatter .point-label { font-size: 8pt; font-weight: 600; fill: var(--ink); }
.scatter .point-label.hl { font-weight: 700; }
.scatter .note { font-size: 6.5pt; fill: var(--muted); }
.scatter .leader { stroke: var(--muted); stroke-width: 0.5; }
th.wide, td.num.wide { width: 0.8in; }
th .unit { color: var(--muted); }
.swatch.dot { border-radius: 50%; }
`;
