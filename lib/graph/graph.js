import { fonts, esc } from "./template.js";

import { RAMP, PURPLE, SOLID } from "./palette.js";
import { buildScatter, scatterSvg, scatterTable, scatterCss } from "./scatter.js";
import { buildSeries, columnSvg, lineSvg, seriesLegend } from "./series.js";
import { barHtml, barCss } from "./bar.js";
import { axisCss } from "./axis.js";

export { RAMP, PURPLE };

// A graph names its family with "color", and a combined graph keeps each group's own,
// so a category reads the same color wherever it appears.
const FAMILIES = { red: RAMP, purple: PURPLE };

function family(name = "red") {
  const ramp = FAMILIES[name];
  if (!ramp) throw new Error(`Unknown color "${name}". Use one of: ${Object.keys(FAMILIES).join(", ")}.`);
  return ramp;
}

const PX_PER_IN = 96;
const TAU = Math.PI * 2;
const TOTAL_CAP = 24 * (96 / 72) * 0.71; // cap height of the ring's centre total, in px
const LABEL_DROP = 13; // baseline of the total to baseline of its label, in px

/** Picks `n` evenly spread steps from the ramp, so four slices skip a middle step rather than the lightest. */
function shades(n, ramp) {
  if (n > ramp.length) {
    throw new Error(`${n} slices is more than a group can carry in ${ramp.length} shades. Fold the smallest into "Other".`);
  }
  if (n === 1) return [ramp[2]];
  return Array.from({ length: n }, (_, i) => ramp[Math.round((i * (ramp.length - 1)) / (n - 1))]);
}

/**
 * Whole-number percent of `total`. Plain rounding, so equal values always print equal
 * shares, even if a column sums to 99 or 101. Anything real that rounds to nothing prints "<1".
 */
const percentOf = (v, total) => {
  const p = Math.round((v / total) * 100);
  return p === 0 && v > 0 ? "<1" : String(p);
};

/** White or ink, whichever reads on the fill. */
function textOn(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return (1.05 / (L + 0.05)) >= ((L + 0.05) / 0.05) ? "#ffffff" : "#000000";
}

const pt = (a, r, cx, cy) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
const f = (n) => n.toFixed(2);

/** One slice from angle a0 to a1 (radians, clockwise from 12 o'clock). `inner` 0 makes a pie wedge. */
function slicePath(a0, a1, outer, inner, cx, cy) {
  if (a1 - a0 >= TAU - 1e-9) {
    // A lone slice is the whole ring: two half-arcs, since one arc can't close on itself.
    const ring = (r, sweep) =>
      `M${f(cx)},${f(cy - r)}A${r},${r} 0 1 ${sweep} ${f(cx)},${f(cy + r)}A${r},${r} 0 1 ${sweep} ${f(cx)},${f(cy - r)}Z`;
    return ring(outer, 1) + (inner ? ring(inner, 0) : "");
  }
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = pt(a0, outer, cx, cy);
  const [x1, y1] = pt(a1, outer, cx, cy);
  if (!inner) return `M${f(cx)},${f(cy)}L${f(x0)},${f(y0)}A${outer},${outer} 0 ${large} 1 ${f(x1)},${f(y1)}Z`;
  const [x2, y2] = pt(a1, inner, cx, cy);
  const [x3, y3] = pt(a0, inner, cx, cy);
  return `M${f(x0)},${f(y0)}A${outer},${outer} 0 ${large} 1 ${f(x1)},${f(y1)}L${f(x2)},${f(y2)}A${inner},${inner} 0 ${large} 0 ${f(x3)},${f(y3)}Z`;
}

/** Every kind of graph, as written in a file's "kind". */
export const KINDS = ["ring", "pie", "pie3d", "bar", "column", "line", "scatter"];
const SLICED = ["ring", "pie", "pie3d"];

function parseItems(items = [], sort, kind) {
  const rows = items.map((it, i) => {
    const [label, value] = Array.isArray(it) ? it : [it.label, it.value];
    if (kind === "bar" ? !(value >= 0) : !(value > 0)) {
      throw new Error(`"${label}" needs a ${kind === "bar" ? "" : "positive "}value${kind === "bar" ? " of zero or more" : " to take a slice"}.`);
    }
    return { label, value, i };
  });
  // Largest first, clockwise from 12 o'clock; ties keep the order they were written in.
  if (sort !== false) rows.sort((a, b) => b.value - a.value || a.i - b.i);
  return rows;
}

/**
 * Turns a graph file into the numbers the template draws. A graph either lists its own
 * `items`, or `combine`s named groups — each one another graph's file, read with
 * `load(name)` so its numbers live in one place, or items written inline.
 */
export function buildGraph(g, load) {
  const kind = g.kind ?? "ring";
  if (!KINDS.includes(kind)) throw new Error(`Unknown kind "${kind}". Use one of: ${KINDS.join(", ")}.`);
  const head = {
    kicker: g.kicker ?? "",
    title: g.title ?? "",
    dek: g.dek ?? "",
    source: g.source ?? "",
    credit: g.credit ?? "",
    widthIn: g.width ?? 3.5,
  };
  if (kind === "scatter") return buildScatter(g);
  if (kind === "line" || kind === "column") return { ...head, ...buildSeries(g) };

  const groups = g.combine
    ? g.combine.map((c) => {
        // A group is either another graph file, or listed right here with its own items.
        const sub = c.graph ? load(c.graph) : c;
        return { name: c.name, color: sub.color, rows: parseItems(sub.items, g.sort, kind) };
      })
    : [{ name: null, color: g.color, rows: parseItems(g.items, g.sort, kind) }];
  if (groups.every((grp) => grp.rows.length === 0)) throw new Error("Add at least one row with a label and a number.");
  const colorNames = groups.map((grp) => grp.color ?? "red");
  if (new Set(colorNames).size < colorNames.length) {
    throw new Error(`Combined groups share a color (${colorNames.join(", ")}). Give each graph its own "color".`);
  }

  groups.forEach((grp) => {
    // Slices shade through their family; bars are one solid color per group.
    const colors =
      kind === "bar" ? grp.rows.map(() => SOLID[grp.color ?? "red"] ?? family(grp.color)[2]) : shades(grp.rows.length, family(grp.color));
    grp.rows.forEach((r, i) => (r.color = colors[i]));
    grp.total = grp.rows.reduce((a, r) => a + r.value, 0);
  });

  const rows = groups.flatMap((grp) => grp.rows);
  const total = rows.reduce((a, r) => a + r.value, 0);
  rows.forEach((r) => (r.pct = percentOf(r.value, total)));
  groups.forEach((grp) => (grp.pct = percentOf(grp.total, total)));

  return {
    ...head,
    kind,
    centerLabel: g.centerLabel ?? "total",
    valueLabel: g.valueLabel ?? "Reports",
    fmt: { prefix: g.prefix ?? "", suffix: g.suffix ?? "" },
    groups,
    rows,
    total,
  };
}

/** The fill pulled 30% toward black, for the side wall of a tilted pie. */
function shadeOf(hex) {
  const c = [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * 0.7));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * A pie tipped back into an ellipse, with a wall of depth along its front half. Angles are
 * still proportional to the values; only the drawing is tilted.
 */
function pie3dSvg(m) {
  const width = Math.min(m.widthIn * PX_PER_IN * 0.7, 2.5 * PX_PER_IN);
  const rx = width / 2 - 1;
  const ry = rx * 0.5;
  const depth = rx * 0.18;
  const cx = width / 2, cy = ry + 1;
  const height = 2 * ry + depth + 2;
  const at = (a, k = 1, dy = 0) => [cx + rx * k * Math.sin(a), cy - ry * k * Math.cos(a) + dy];
  const P = ([x, y]) => `${f(x)},${f(y)}`;

  const tops = [];
  const walls = [];
  const labels = [];
  let a = 0;
  for (const r of m.rows) {
    const sweep = (r.value / m.total) * TAU;
    const a0 = a, a1 = a + sweep;
    a = a1;

    if (sweep >= TAU - 1e-9) {
      tops.push(`<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${r.color}"/>`);
    } else {
      const large = sweep > Math.PI ? 1 : 0;
      tops.push(`<path d="M${f(cx)},${f(cy)}L${P(at(a0))}A${f(rx)},${f(ry)} 0 ${large} 1 ${P(at(a1))}Z" fill="${r.color}"/>`);
    }

    // Only the front half of the rim (3 to 9 o'clock, through 6) faces the reader.
    const s0 = Math.max(a0, Math.PI / 2), s1 = Math.min(a1, (3 * Math.PI) / 2);
    if (s1 > s0) {
      walls.push(
        `<path d="M${P(at(s0))}A${f(rx)},${f(ry)} 0 0 1 ${P(at(s1))}L${P(at(s1, 1, depth))}A${f(rx)},${f(ry)} 0 0 0 ${P(at(s0, 1, depth))}Z" fill="${shadeOf(r.color)}"/>`
      );
    }

    // Percent on the top face, where the slice is wide enough at label distance to hold it.
    const text = `${r.pct}%`;
    const textW = text.length * 6.2 + 8;
    const [x0, y0] = at(a0, 0.64), [x1, y1] = at(a1, 0.64);
    const room = sweep > Math.PI ? Infinity : Math.hypot(x1 - x0, y1 - y0);
    if (room >= textW) {
      const [lx, ly] = at((a0 + a1) / 2, 0.64);
      labels.push(
        `<text x="${f(lx)}" y="${f(ly)}" fill="${textOn(r.color)}" text-anchor="middle" dominant-baseline="central">${esc(text)}</text>`
      );
    }
  }

  return `<svg class="chart" width="${f(width)}" height="${f(height)}" viewBox="0 0 ${f(width)} ${f(height)}" role="img" aria-label="${esc(m.title)}">
  <g stroke="#ffffff" stroke-width="2" stroke-linejoin="round">${walls.join("")}${tops.join("")}</g>
  <g class="slice-labels">${labels.join("")}</g>
</svg>`;
}

function chartSvg(m) {
  if (m.kind === "pie3d") return pie3dSvg(m);
  const size = Math.min(m.widthIn * PX_PER_IN * 0.62, 2.2 * PX_PER_IN);
  const cx = size / 2, cy = size / 2;
  const outer = size / 2 - 1;
  // A fat ring: the hole is just over half the diameter, still wide enough for the total.
  const inner = m.kind === "ring" ? outer * 0.55 : 0;
  const labelR = m.kind === "ring" ? (outer + inner) / 2 : outer * 0.64;

  let a = 0;
  const marks = [];
  const labels = [];
  for (const r of m.rows) {
    const sweep = (r.value / m.total) * TAU;
    const a0 = a, a1 = a + sweep;
    a = a1;
    marks.push(`<path d="${slicePath(a0, a1, outer, inner, cx, cy)}" fill="${r.color}" fill-rule="evenodd"/>`);

    // Percent rides on the slice only where it fits with room either side; the key always has it.
    const text = `${r.pct}%`;
    const textW = text.length * 6.2 + 8;
    const room = m.kind === "ring" ? sweep * labelR : Math.min(sweep * labelR, outer);
    if (room >= textW || sweep >= TAU - 1e-9) {
      const [lx, ly] = pt((a0 + a1) / 2, labelR, cx, cy);
      labels.push(
        `<text x="${f(lx)}" y="${f(ly)}" fill="${textOn(r.color)}" text-anchor="middle" dominant-baseline="central">${esc(text)}</text>`
      );
    }
  }

  const center =
    m.kind === "ring"
      ? // The number and its label are centred together as one block: from the top of the
        // digits (24pt Raleway, cap height ≈ 0.71em) down to the label's baseline.
        `<text class="total" x="${f(cx)}" y="${f(cy + (TOTAL_CAP - LABEL_DROP) / 2)}" text-anchor="middle">${m.total.toLocaleString("en-US")}</text>
         <text class="total-label" x="${f(cx)}" y="${f(cy + (TOTAL_CAP + LABEL_DROP) / 2)}" text-anchor="middle">${esc(m.centerLabel)}</text>`
      : "";

  // The white stroke is the 2px surface gap between slices, not an outline.
  return `<svg class="chart" width="${f(size)}" height="${f(size)}" viewBox="0 0 ${f(size)} ${f(size)}" role="img" aria-label="${esc(m.title)}">
  <g stroke="#ffffff" stroke-width="2" stroke-linejoin="round">${marks.join("")}</g>
  <g class="slice-labels">${labels.join("")}</g>
  ${center}
</svg>`;
}

const graphCss = (pad) => `
${fonts()}

:root {
  --ink: #000000;
  --muted: #555555;
  --rule: #bbbbbb;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

/* Printed from the browser, swatches and bars are backgrounds: keep them. */
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

html, body { background: #ffffff; }

body {
  font-family: "Raleway", "Helvetica Neue", Arial, sans-serif;
  font-size: 9.5pt;
  line-height: 1.38;
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  /* Raleway's default figures are old-style; numbers in a graphic should stand level. */
  font-variant-numeric: lining-nums;
}

.graphic { padding: ${pad}px; }

.top { border-top: 0.9pt solid var(--ink); padding-top: 6pt; }

.kicker { font-size: 8.5pt; font-weight: 700; }

h1 {
  font-family: "Minion Pro", Georgia, serif;
  font-size: 17pt;
  font-weight: 400;
  line-height: 1.1;
  margin-top: 2pt;
}

.dek { margin-top: 4pt; font-size: 9pt; }

.chart { display: block; margin: 12pt auto 0; overflow: visible; }
.chart .slice-labels { font-size: 7.5pt; font-weight: 700; font-variant-numeric: lining-nums tabular-nums; }
.chart .total { font-size: 24pt; font-weight: 700; fill: var(--ink); }
.chart .total-label { font-size: 8pt; fill: var(--ink); }

table { width: 100%; border-collapse: collapse; margin-top: 12pt; font-variant-numeric: lining-nums tabular-nums; }
thead th {
  font-size: 7.5pt;
  font-weight: 400;
  text-align: left;
  padding-bottom: 3pt;
  border-bottom: 1.5pt solid var(--ink);
}
tbody td { padding: 3.5pt 0; border-bottom: 0.4pt solid var(--rule); vertical-align: baseline; font-size: 8.5pt; }
th.num, td.num { text-align: right; white-space: nowrap; width: 0.55in; }
td.label { padding-left: 0; }
tr.group td { font-weight: 700; padding-top: 9pt; border-bottom-color: var(--ink); border-bottom-width: 0.6pt; }
tbody:first-of-type tr.group td { padding-top: 4pt; }
.swatch {
  display: inline-block;
  width: 8pt;
  height: 8pt;
  margin-right: 5pt;
  border-radius: 1.5pt;
  vertical-align: -0.5pt;
}

.source { margin-top: 6pt; font-size: 7pt; color: var(--muted); }
${scatterCss}
${axisCss}
${barCss}
`;

/**
 * The graphic as a standalone page. `pageIn` sizes the PDF page to the graphic; omit it to
 * measure.
 */
export function renderGraphHtml(m, { pad = 0, pageIn = null } = {}) {
  const itemRow = (r) => `
      <tr>
        <td class="label"><span class="swatch" style="background:${r.color}"></span>${esc(r.label)}</td>
        <td class="num">${r.value.toLocaleString("en-US")}</td>
        <td class="num">${r.pct}%</td>
      </tr>`;

  // A combined graph keys each group under its own heading, with the group's subtotal.
  const keyBody = (m.groups ?? [])
    .map(
      (grp) => `
    <tbody>${
      grp.name
        ? `
      <tr class="group">
        <td>${esc(grp.name)}</td>
        <td class="num">${grp.total.toLocaleString("en-US")}</td>
        <td class="num">${grp.pct}%</td>
      </tr>`
        : ""
    }${grp.rows.map(itemRow).join("")}
    </tbody>`
    )
    .join("");

  const foot = [m.source && `Source: ${m.source}`, m.credit].filter(Boolean).join(" · ");
  const chartWidth = m.widthIn * PX_PER_IN;
  const chartHtml = () =>
    ({
      scatter: () => scatterSvg(m, chartWidth),
      bar: () => barHtml(m),
      column: () => seriesLegend(m) + columnSvg(m, chartWidth),
      line: () => seriesLegend(m) + lineSvg(m, chartWidth),
    })[m.kind]?.() ?? chartSvg(m);
  const widthPx = m.widthIn * PX_PER_IN + pad * 2;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(m.title)}</title>
<style>
${graphCss(pad)}
body { width: ${widthPx}px; }
${pageIn ? `@page { size: ${pageIn.w}in ${pageIn.h}in; margin: 0; }` : ""}
</style>
</head>
<body>
<figure class="graphic">
  <div class="top">
    ${m.kicker ? `<div class="kicker">${esc(m.kicker)}</div>` : ""}
    ${m.title ? `<h1>${esc(m.title)}</h1>` : ""}
    ${m.dek ? `<p class="dek">${esc(m.dek)}</p>` : ""}
  </div>
  ${chartHtml(m)}
  ${SLICED.includes(m.kind) ? `<table>
    <thead><tr><th></th><th class="num">${esc(m.valueLabel)}</th><th class="num">Percent</th></tr></thead>
    ${keyBody}
  </table>` : m.kind === "scatter" ? scatterTable(m) : ""}
  ${foot ? `<p class="source">${esc(foot)}</p>` : ""}
</figure>
<script>
  document.fonts.ready.then(() => {
    const h = document.querySelector(".graphic").getBoundingClientRect().height;
    document.documentElement.setAttribute("data-height", Math.ceil(h));
  });
</script>
</body>
</html>`;
}

export { PX_PER_IN };
