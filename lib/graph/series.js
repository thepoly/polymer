import { esc } from "./template.js";
import { SERIES, SERIES_ORDER } from "./palette.js";
import { linearScale, fmtNum, textWidth, yTitle } from "./axis.js";

// Line and column charts share one data shape: a table whose first column holds the
// categories (years, months, names) and whose other columns are the series.
//
//   "columns": ["Year", "Liquor law", "Drug law"],
//   "rows": [["2022", 61, 9], ["2023", 70, 12]]

const f = (n) => n.toFixed(2);
const isNum = (v) => typeof v === "number" && Number.isFinite(v);

export function buildSeries(g) {
  const columns = g.columns ?? [];
  if (columns.length < 2) throw new Error("Add a category column and at least one series column.");
  const names = columns.slice(1);
  if (names.length > SERIES_ORDER.length) {
    throw new Error(`${names.length} series is more than ${SERIES_ORDER.length} colors can tell apart. Split it into two graphs.`);
  }
  const colorNames = names.map((_, i) => g.colors?.[i] || SERIES_ORDER[i]);
  for (const c of colorNames) if (!Object.hasOwn(SERIES, c)) throw new Error(`Unknown series color "${c}". Use ${SERIES_ORDER.join(", ")}.`);
  if (new Set(colorNames).size < colorNames.length) throw new Error("Two series share a color. Give each its own.");

  const rows = (g.rows ?? []).filter((r) => Array.isArray(r) && String(r[0] ?? "").trim() !== "");
  if (rows.length === 0) throw new Error("Add at least one row of data.");

  const categories = rows.map((r) => String(r[0]).trim());
  const series = names.map((name, i) => ({
    name: String(name),
    color: SERIES[colorNames[i]],
    values: rows.map((r) => (isNum(r[i + 1]) ? r[i + 1] : null)),
  }));
  if (series.every((s) => s.values.every((v) => v === null))) throw new Error("None of the series has a number in it yet.");

  // Years and other plain numbers sit at their true spacing on a line chart, so a gap shows.
  const numericX = g.kind === "line" && categories.every((c) => /^-?\d+(\.\d+)?$/.test(c));

  return {
    kind: g.kind,
    categories,
    series,
    numericX,
    stacked: g.kind === "column" && !!g.stacked && series.length > 1,
    fmt: { prefix: g.prefix ?? "", suffix: g.suffix ?? "" },
    x: { label: g.x?.label ?? "" },
    y: { label: g.y?.label ?? "", min: g.y?.min ?? null, max: g.y?.max ?? null, zero: g.y?.zero ?? null },
  };
}

/** The y axis, with the left margin it needs for its tick labels. */
function yAxis(m, values, top, plotH, W, { zero }) {
  const lo = Math.min(...values), hi = Math.max(...values);
  const opts = { min: m.y.min, max: m.y.max, zero };
  const probe = linearScale(lo, hi, top + plotH, top, opts);
  const tickW = Math.max(...probe.ticks.map((t) => textWidth(fmtNum(t, m.fmt), 6.5)));
  const left = (m.y.label ? 16 : 0) + tickW + 6;
  return { scale: probe, left };
}

function gridAndTicks(scale, left, right, W, fmt) {
  return scale.ticks
    .map((v) => {
      const y = scale.map(v);
      return `<line class="${v === 0 ? "base" : "grid"}" x1="${f(left)}" x2="${f(W - right)}" y1="${f(y)}" y2="${f(y)}"/>
      <text class="tick" x="${f(left - 5)}" y="${f(y)}" text-anchor="end" dominant-baseline="central">${esc(fmtNum(v, fmt))}</text>`;
    })
    .join("");
}

/** Category labels along the bottom: every one if they fit, otherwise every nth, always the last. */
function xLabels(cats, xs, bandW, y) {
  const widest = Math.max(...cats.map((c) => textWidth(c, 6.5))) + 6;
  const every = Math.max(1, Math.ceil(widest / Math.max(bandW, 1)));
  return cats
    .map((c, i) => {
      const show = i % every === 0 || i === cats.length - 1;
      // Skip one that would crowd the last label.
      const crowdsLast = i !== cats.length - 1 && cats.length - 1 - i < every && i % every === 0 && every > 1;
      return show && !crowdsLast ? `<text class="tick" x="${f(xs[i])}" y="${f(y)}" text-anchor="middle">${esc(c)}</text>` : "";
    })
    .join("");
}

/** A column with a rounded data end and a square foot on the baseline. */
function columnPath(x, w, y0, y1) {
  const r = Math.min(2.5, w / 2, Math.abs(y1 - y0));
  if (y1 <= y0) {
    return `M${f(x)},${f(y0)}V${f(y1 + r)}Q${f(x)},${f(y1)} ${f(x + r)},${f(y1)}H${f(x + w - r)}Q${f(x + w)},${f(y1)} ${f(x + w)},${f(y1 + r)}V${f(y0)}Z`;
  }
  return `M${f(x)},${f(y0)}V${f(y1 - r)}Q${f(x)},${f(y1)} ${f(x + r)},${f(y1)}H${f(x + w - r)}Q${f(x + w)},${f(y1)} ${f(x + w)},${f(y1 - r)}V${f(y0)}Z`;
}

export function columnSvg(m, W) {
  const n = m.categories.length, k = m.series.length;
  const labelEach = n <= 12 && (k === 1 || m.stacked);
  const top = labelEach ? 14 : 8;
  const bottom = 16 + (m.x.label ? 16 : 0);

  const stackTotals = m.categories.map((_, i) => m.series.reduce((a, s) => a + Math.max(0, s.values[i] ?? 0), 0));
  const values = m.stacked ? [...stackTotals, 0] : m.series.flatMap((s) => s.values.filter((v) => v !== null));
  const plotW0 = W - 40;
  const plotH = Math.round(Math.min(plotW0 * 0.62, 260));
  const { scale, left } = yAxis(m, values, top, plotH, W, { zero: true });
  const right = 4;
  const plotW = W - left - right;
  const band = plotW / n;
  const groupW = Math.min(band * 0.72, m.stacked ? 28 : k * 24 + (k - 1) * 2);
  const colW = m.stacked ? groupW : (groupW - (k - 1) * 2) / k;
  const centers = m.categories.map((_, i) => left + band * (i + 0.5));
  const base = scale.map(Math.max(scale.domain[0], Math.min(0, scale.domain[1])));

  let marks = "", labels = "";
  m.categories.forEach((_, i) => {
    const x0 = centers[i] - groupW / 2;
    if (m.stacked) {
      let acc = 0;
      m.series.forEach((s) => {
        const v = s.values[i];
        if (!(v > 0)) return;
        const y0 = scale.map(acc), y1 = scale.map(acc + v);
        marks += `<rect x="${f(x0)}" y="${f(y1)}" width="${f(colW)}" height="${f(y0 - y1)}" fill="${s.color}" stroke="#ffffff" stroke-width="1"/>`;
        acc += v;
      });
      if (labelEach && acc > 0) labels += `<text class="value" x="${f(centers[i])}" y="${f(scale.map(acc) - 4)}" text-anchor="middle">${esc(fmtNum(acc, m.fmt))}</text>`;
    } else {
      m.series.forEach((s, j) => {
        const v = s.values[i];
        if (v === null) return;
        const x = x0 + j * (colW + 2);
        marks += `<path d="${columnPath(x, colW, base, scale.map(v))}" fill="${s.color}"/>`;
        if (labelEach) {
          const ty = v >= 0 ? scale.map(v) - 4 : scale.map(v) + 10;
          labels += `<text class="value" x="${f(x + colW / 2)}" y="${f(ty)}" text-anchor="middle">${esc(fmtNum(v, m.fmt))}</text>`;
        }
      });
    }
  });

  const H = top + plotH + bottom;
  return `<svg class="chart axes" width="${f(W)}" height="${f(H)}" viewBox="0 0 ${f(W)} ${f(H)}" role="img">
  ${yTitle(m.y.label, 7, top + plotH / 2, esc)}
  ${gridAndTicks(scale, left, right, W, m.fmt)}
  ${marks}
  <line class="base" x1="${f(left)}" x2="${f(W - right)}" y1="${f(base)}" y2="${f(base)}"/>
  ${labels}
  ${xLabels(m.categories, centers, band, top + plotH + 12)}
  ${m.x.label ? `<text class="axis-title" x="${f(left + plotW / 2)}" y="${f(H - 3)}" text-anchor="middle">${esc(m.x.label)}</text>` : ""}
</svg>`;
}

export function lineSvg(m, W) {
  const n = m.categories.length;
  const values = m.series.flatMap((s) => s.values.filter((v) => v !== null));
  const lo = Math.min(...values), hi = Math.max(...values);
  // Start at zero unless the data sits well above it, where zero would flatten the lines.
  const zero = m.y.zero ?? (lo >= 0 && lo <= hi * 0.5);
  const top = 8;
  const bottom = 16 + (m.x.label ? 16 : 0);
  const plotH = Math.round(Math.min((W - 40) * 0.6, 250));
  // Off zero, pad the low end a little so the lowest point doesn't sit on the axis line.
  const padded = zero || m.y.min !== null ? values : [...values, lo - (hi - lo) * 0.04];
  const { scale, left } = yAxis(m, padded, top, plotH, W, { zero });

  // End labels hang off the right edge: the series name (when there's more than one) and its last value.
  const last = m.series.map((s) => {
    let i = s.values.length - 1;
    while (i >= 0 && s.values[i] === null) i--;
    return i;
  });
  const endText = m.series.map((s, j) => (last[j] < 0 ? "" : `${m.series.length > 1 ? `${s.name} ` : ""}${fmtNum(s.values[last[j]], m.fmt)}`));
  const right = Math.min(W * 0.4, Math.max(...endText.map((t) => textWidth(t, 7.5))) + 12);
  const plotW = W - left - right;

  let xs;
  if (m.numericX) {
    const nums = m.categories.map(Number);
    const [a, b] = [Math.min(...nums), Math.max(...nums)];
    xs = nums.map((v) => (a === b ? left + plotW / 2 : left + ((v - a) / (b - a)) * plotW));
  } else {
    xs = m.categories.map((_, i) => (n === 1 ? left + plotW / 2 : left + (i / (n - 1)) * plotW));
  }

  // Lines break where a value is missing rather than bridging the gap.
  const lines = m.series
    .map((s) => {
      let d = "", pen = false;
      s.values.forEach((v, i) => {
        if (v === null) return void (pen = false);
        d += `${pen ? "L" : "M"}${f(xs[i])},${f(scale.map(v))}`;
        pen = true;
      });
      return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    })
    .join("");

  // Spread end labels that would overlap, keeping each tied to its line by a short leader.
  const ends = m.series
    .map((s, j) => (last[j] < 0 ? null : { j, x: xs[last[j]], y: scale.map(s.values[last[j]]), ly: scale.map(s.values[last[j]]) }))
    .filter(Boolean)
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) ends[i].ly = Math.max(ends[i].ly, ends[i - 1].ly + 11);
  const overflow = ends.length ? ends[ends.length - 1].ly - (top + plotH) : 0;
  if (overflow > 0) ends.forEach((e) => (e.ly -= overflow));

  const endMarks = ends
    .map(({ j, x, y, ly }) => {
      const s = m.series[j];
      const tx = x + 8;
      const leader = Math.abs(ly - y) > 2 ? `<path class="leader" d="M${f(x + 4)},${f(y)}L${f(tx - 2)},${f(ly)}"/>` : "";
      const name = m.series.length > 1 ? `${esc(s.name)} ` : "";
      return `${leader}<circle cx="${f(x)}" cy="${f(y)}" r="3.5" fill="${s.color}" stroke="#ffffff" stroke-width="1.5"/>
      <text class="end-label" x="${f(tx)}" y="${f(ly)}" dominant-baseline="central">${name}<tspan class="end-value">${esc(fmtNum(s.values[last[j]], m.fmt))}</tspan></text>`;
    })
    .join("");

  const bandW = n > 1 ? plotW / (n - 1) : plotW;
  const H = top + plotH + bottom;
  return `<svg class="chart axes" width="${f(W)}" height="${f(H)}" viewBox="0 0 ${f(W)} ${f(H)}" role="img">
  ${yTitle(m.y.label, 7, top + plotH / 2, esc)}
  ${gridAndTicks(scale, left, right, W, m.fmt)}
  <line class="base" x1="${f(left)}" x2="${f(W - right)}" y1="${f(top + plotH)}" y2="${f(top + plotH)}"/>
  ${lines}
  ${endMarks}
  ${xLabels(m.categories, xs, bandW, top + plotH + 12)}
  ${m.x.label ? `<text class="axis-title" x="${f(left + plotW / 2)}" y="${f(H - 3)}" text-anchor="middle">${esc(m.x.label)}</text>` : ""}
</svg>`;
}

/** A legend for two or more series, set above the chart. */
export function seriesLegend(m) {
  if (m.series.length < 2) return "";
  const block = m.kind === "column";
  return `<div class="legend">${m.series
    .map((s) => `<span class="item"><span class="key${block ? " block" : ""}" style="background:${s.color}"></span>${esc(s.name)}</span>`)
    .join("")}</div>`;
}
