import { esc } from "./template.js";
import { CONTEXT, palette } from "./palette.js";
import { linearScale, fmtNum, textWidth, yTitle, spreadLabels, monoText, withEnds } from "./axis.js";
import { buildRefs, crowdsRef, refsSvg, refText, refYs } from "./refs.js";

// Line and column charts share one data shape: a table whose first column holds the
// categories (years, months, names) and whose other columns are the series.
//
//   "columns": ["Year", "Liquor law", "Drug law"],
//   "rows": [["2022", 61, 9], ["2023", 70, 12]]
//
// Columns need a color each, so they stop at four series. Lines can run to MAX_LINES:
// past four, one line (RPI's, if there is one) is the story in red and the rest are gray.

const f = (n) => n.toFixed(2);
const isNum = (v) => typeof v === "number" && Number.isFinite(v);

const MAX_LINES = 10;
const GRAY = "gray";

/** Colors for series nobody has picked one for: one each while they last, then highlight one. */
export function defaultSeriesColors(names) {
  const order = palette().order;
  if (names.length <= order.length) return names.map((_, i) => order[i]);
  const lead = Math.max(0, names.findIndex((n) => /^rpi$|rensselaer/i.test(String(n).trim())));
  return names.map((_, i) => (i === lead ? order[0] : GRAY));
}

export function buildSeries(g) {
  // On a column chart one series can be drawn as a line against its own axis on the right
  // ("overlay": { "series": name }). It's taken out of the columns here and built on its own.
  const overlayAt = g.kind === "column" && g.overlay?.series != null ? (g.columns ?? []).indexOf(g.overlay.series) : -1;
  if (overlayAt > 0) {
    const keep = (row) => row.filter((_, i) => i !== overlayAt);
    const rest = buildSeries({ ...g, overlay: null, columns: keep(g.columns), colors: (g.colors ?? []).filter((_, i) => i !== overlayAt - 1), rows: (g.rows ?? []).map((r) => (Array.isArray(r) ? keep(r) : r)) });
    const rows = (g.rows ?? []).filter((r) => Array.isArray(r) && String(r[0] ?? "").trim() !== "");
    const values = rows.map((r) => (isNum(r[overlayAt]) ? r[overlayAt] : null));
    const numbers = values.filter((v) => v !== null);
    if (!numbers.length) throw new Error(`"${g.overlay.series}" has no numbers to draw its line from.`);
    const named = g.overlay.color;
    const { base } = palette();
    const color = named === "gray" ? CONTEXT : named && Object.hasOwn(base, named) ? base[named] : TREND.ink;
    const biggest = Math.max(...numbers.map(Math.abs));
    rest.overlay = {
      name: String(g.overlay.series), color, values,
      // How high its axis runs at least, so its line can sit lower against the columns.
      max: isNum(g.overlay.max) ? g.overlay.max : null,
      fmt: { prefix: g.overlay.prefix ?? "", suffix: g.overlay.suffix ?? "", compact: biggest >= 1e6 },
    };
    return rest;
  }
  const columns = g.columns ?? [];
  if (columns.length < 2) throw new Error("Add a category column and at least one series column.");
  const names = columns.slice(1);
  const line = g.kind === "line";
  const { order, base } = palette();
  if (!line && names.length > order.length) {
    throw new Error(`${names.length} series is more than ${order.length} colors can tell apart. Split it into two graphs, or make it a line chart.`);
  }
  if (names.length > MAX_LINES) throw new Error(`${names.length} lines is more than one graph can name. Keep it to ${MAX_LINES}.`);
  const defaults = defaultSeriesColors(names);
  const colorNames = names.map((_, i) => g.colors?.[i] || defaults[i]);
  for (const c of colorNames) {
    if (c === GRAY && !line) throw new Error("Gray is for context lines. Give each column series its own color.");
    if (c !== GRAY && !Object.hasOwn(base, c)) throw new Error(`Unknown series color "${c}". Use ${[...order, GRAY].join(", ")}.`);
  }
  const colored = colorNames.filter((c) => c !== GRAY);
  if (new Set(colored).size < colored.length) throw new Error("Two series share a color. Give each its own, or make one gray.");

  const rows = (g.rows ?? []).filter((r) => Array.isArray(r) && String(r[0] ?? "").trim() !== "");
  if (rows.length === 0) throw new Error("Add at least one row of data.");

  const categories = rows.map((r) => String(r[0]).trim());
  const series = names.map((name, i) => ({
    name: String(name),
    color: colorNames[i] === GRAY ? CONTEXT : base[colorNames[i]],
    muted: colorNames[i] === GRAY,
    values: rows.map((r) => (isNum(r[i + 1]) ? r[i + 1] : null)),
  }));
  if (series.every((s) => s.values.every((v) => v === null))) throw new Error("None of the series has a number in it yet.");

  // Years and other plain numbers sit at their true spacing on a line chart, so a gap shows.
  const numericX = line && categories.every((c) => /^-?\d+(\.\d+)?$/.test(c));
  // Millions and up read as $1.4B and $250M rather than a wall of digits.
  const biggest = Math.max(...series.flatMap((s) => s.values.filter((v) => v !== null).map(Math.abs)));

  return {
    kind: g.kind,
    categories,
    series,
    numericX,
    stacked: g.kind === "column" && !!g.stacked && series.length > 1,
    // A dashed least-squares line through each series (or through the stacks' totals).
    trend: !!g.trend,
    overlay: null,
    refs: buildRefs(g),
    // Shading between two lines: its color is the color of whichever line is on top.
    shade: line ? shadeOf(g, names) : null,
    fmt: { prefix: g.prefix ?? "", suffix: g.suffix ?? "", compact: g.compact ?? biggest >= 1e6 },
    // Where a line chart of numbers (years) starts and ends across, if set; otherwise its first and last.
    x: { label: g.x?.label ?? "", min: isNum(g.x?.min) ? g.x.min : null, max: isNum(g.x?.max) ? g.x.max : null },
    y: { label: g.y?.label ?? "", min: g.y?.min ?? null, max: g.y?.max ?? null, zero: g.y?.zero ?? null },
  };
}

/**
 * The gap between two lines as filled areas: where line a is above line b, and where it's
 * below, each run as one closed path that follows a forward and b back. Runs end where the
 * lines cross (at the crossing, worked out between the two points) and where either line
 * has no value. `map` takes a value to its y. Returns [{ above: boolean, d }].
 */
export function gapAreas(xs, a, b, map) {
  const runs = [];
  let run = null;
  const close = () => {
    if (run && run.top.length > 1) {
      const pts = [...run.top, ...run.bottom.reverse()];
      runs.push({ above: run.above, d: `M${pts.map(([x, y]) => `${f(x)},${f(y)}`).join("L")}Z` });
    }
    run = null;
  };
  const add = (x, va, vb, above) => {
    if (!run) run = { above, top: [], bottom: [] };
    run.top.push([x, map(va)]);
    run.bottom.push([x, map(vb)]);
  };
  for (let i = 0; i < xs.length; i++) {
    const [va, vb] = [a[i], b[i]];
    if (va === null || vb === null || va === undefined || vb === undefined) {
      close();
      continue;
    }
    const d = va - vb;
    const above = d >= 0;
    if (run && i > 0 && a[i - 1] !== null && b[i - 1] !== null && run.above !== above && d !== 0) {
      // The lines cross between the last point and this one: end the run there, start the next.
      const d0 = a[i - 1] - b[i - 1];
      const t = d0 / (d0 - d);
      const x = xs[i - 1] + (xs[i] - xs[i - 1]) * t;
      const v = a[i - 1] + (va - a[i - 1]) * t;
      add(x, v, v, run.above);
      close();
      add(x, v, v, above);
    }
    if (!run) run = { above, top: [], bottom: [] };
    add(xs[i], va, vb, run.above);
  }
  close();
  return runs;
}

/**
 * The straight line that best fits a series (least squares), as drawn: `xs` are where its
 * points sit across the plot. From its first value to its last, or null under two values.
 */
export function trendLine(xs, values) {
  const pts = values.map((v, i) => [xs[i], v]).filter(([x, v]) => v !== null && v !== undefined && Number.isFinite(x));
  if (pts.length < 2) return null;
  const n = pts.length;
  const mx = pts.reduce((a, [x]) => a + x, 0) / n, my = pts.reduce((a, [, v]) => a + v, 0) / n;
  const sxx = pts.reduce((a, [x]) => a + (x - mx) ** 2, 0);
  if (!sxx) return null;
  const slope = pts.reduce((a, [x, v]) => a + (x - mx) * (v - my), 0) / sxx;
  const at = (x) => my + slope * (x - mx);
  const [x0, x1] = [pts[0][0], pts[n - 1][0]];
  return { x0, v0: at(x0), x1, v1: at(x1) };
}

/**
 * A second axis for `values` whose ticks land on the first axis's gridlines: it has as many
 * steps as `scale`, each a round number (1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8 × a power of ten)
 * big enough to fit the values. Returns { domain, ticks, map } like linearScale.
 *
 * @param {{ domain: number[], ticks: number[], map: (v: number) => number }} scale
 * @param {number[]} values
 * @param {number | null} [atLeast]
 */
export function alignedScale(scale, values, atLeast = null) {
  const t = scale.ticks;
  const steps = Math.max(1, t.length - 1);
  const below = Math.max(0, Math.round((0 - scale.domain[0]) / ((scale.domain[1] - scale.domain[0]) / steps)));
  // `atLeast` raises the top: the axis runs at least that high (its line sits lower).
  const hi = Math.max(0, ...values, Number.isFinite(atLeast) ? atLeast : 0), lo = Math.min(0, ...values);
  const need = Math.max(hi / Math.max(1, steps - below), below ? -lo / below : 0) || 1;
  const mag = 10 ** Math.floor(Math.log10(need));
  const step = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((k) => k * mag).find((s) => s >= need - 1e-9);
  const domain = [-below * step, (steps - below) * step];
  const [y0, y1] = [scale.map(scale.domain[0]), scale.map(scale.domain[1])];
  const map = (v) => y0 + ((v - domain[0]) / (domain[1] - domain[0])) * (y1 - y0);
  return { domain, ticks: Array.from({ length: steps + 1 }, (_, i) => +(domain[0] + i * step).toFixed(10)), map };
}

/** A line on its own axis over columns: drawn thick, and both axes' numbers in ink. */
export const OVERLAY_WIDTH = 2.75;
const INK_TICKS = "#1a1a1a";

/** The trend line's look: dashed, in ink over columns, in a line's own color beside it. */
export const TREND = { width: 1.5, dash: "5 3", ink: "#1a1a1a" };

/** The shading between two lines, if the graph asks for it: which two, and what each side is called. */
function shadeOf(g, names) {
  const s = g.shade;
  if (!s || !Array.isArray(s.between) || s.between.length !== 2) return null;
  const [a, b] = s.between.map((n) => names.findIndex((x) => String(x) === String(n)));
  if (a < 0 || b < 0 || a === b) return null;
  return { a, b, above: String(s.above ?? ""), below: String(s.below ?? "") };
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

/**
 * Gridlines and their labels. A label that would run into a y line's own (at `refYs`) is
 * left off. `color` sets the labels' color, for an axis that belongs to one series.
 */
function gridAndTicks(scale, left, right, W, fmt, refLabelYs = [], color = null) {
  return withEnds(scale.ticks, scale.domain, scale.map, 12)
    .map((v) => {
      const y = scale.map(v);
      return `<line class="${v === 0 ? "base" : "grid"}" x1="${f(left)}" x2="${f(W - right)}" y1="${f(y)}" y2="${f(y)}"/>
      ${crowdsRef(refLabelYs, y) ? "" : monoText(left - 5, y, fmtNum(v, fmt), { anchor: "end", attrs: `class="tick" dominant-baseline="central"${color ? ` style="fill:${color}"` : ""}`, escape: esc })}`;
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
      return show && !crowdsLast ? monoText(xs[i], y, c, { anchor: "middle", attrs: `class="tick"`, escape: esc }) : "";
    })
    .join("");
}

/**
 * Ticks across a numeric x range [a, b] (years): every 1, 2, 5, 10… units, the tightest step
 * whose labels fit, at the round numbers in the range; just the ends if none fall in it.
 * `toX` places a value. Returns [{ v, x, text }].
 */
export function numericTicks(a, b, toX) {
  const pxPerUnit = b > a ? Math.abs(toX(b) - toX(a)) / (b - a) : Infinity;
  const label = (v) => String(+v.toFixed(6));
  const widest = Math.max(textWidth(label(a), 6.5), textWidth(label(b), 6.5)) + 8;
  const step = [1, 2, 5, 10, 20, 25, 50, 100, 250, 500, 1000].find((s) => s * pxPerUnit >= widest) ?? 1000;
  const out = [];
  for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + 1e-9; v += step) out.push(v);
  // The ends are always labeled; a round tick crowding one gives way.
  const ticks = withEnds(out, [a, b], toX, widest);
  return ticks.map((v) => ({ v, x: toX(v), text: label(v) }));
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
  // A line on its own axis takes the right side: its numbers there, room made for them.
  const ov = m.overlay;
  // With two axes, both sets of numbers are in ink, so neither reads as the lesser one.
  const axisColor = ov ? INK_TICKS : null;
  // Its ticks sit on the left axis's gridlines.
  const ovScale = ov ? alignedScale(scale, ov.values.filter((v) => v !== null), ov.max) : null;
  const right = ov ? Math.max(...ovScale.ticks.map((t) => textWidth(fmtNum(t, ov.fmt), 6.5))) + 10 : 4;
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

  // Trend lines run over the columns: one through the stacks' totals, or one through each series.
  const fits = !m.trend ? [] : m.stacked
    ? [trendLine(centers, stackTotals)]
    : m.series.map((s, j) => trendLine(centers.map((c) => c - groupW / 2 + j * (colW + 2) + colW / 2), s.values));
  const trends = fits
    .filter(Boolean)
    .map((t) => `<line x1="${f(t.x0)}" y1="${f(scale.map(t.v0))}" x2="${f(t.x1)}" y2="${f(scale.map(t.v1))}" stroke="${TREND.ink}" stroke-width="${TREND.width}" stroke-dasharray="${TREND.dash}" stroke-linecap="round"/>`)
    .join("");

  // The line, through the middle of each category, over the columns; its axis on the right.
  let overlaySvg = "";
  if (ov) {
    let d = "", pen = false;
    ov.values.forEach((v, i) => {
      if (v === null) return void (pen = false);
      d += `${pen ? "L" : "M"}${f(centers[i])},${f(ovScale.map(v))}`;
      pen = true;
    });
    // A thick line, with a dot at its last value.
    const lastAt = ov.values.findLastIndex((v) => v !== null);
    const end = lastAt < 0 ? "" : `<circle cx="${f(centers[lastAt])}" cy="${f(ovScale.map(ov.values[lastAt]))}" r="3.25" fill="${ov.color}"/>`;
    const ticks = withEnds(ovScale.ticks, ovScale.domain, ovScale.map, 12)
      .map((v) => monoText(W - right + 6, ovScale.map(v), fmtNum(v, ov.fmt), { anchor: "start", attrs: `class="tick" dominant-baseline="central" style="fill:${INK_TICKS}"`, escape: esc }))
      .join("");
    overlaySvg = `<path d="${d}" fill="none" stroke="${ov.color}" stroke-width="${OVERLAY_WIDTH}" stroke-linejoin="round" stroke-linecap="round"/>${end}${ticks}`;
  }

  const H = top + plotH + bottom;
  return `<svg class="chart axes" width="${f(W)}" height="${f(H)}" viewBox="0 0 ${f(W)} ${f(H)}" role="img">
  ${yTitle(m.y.label, 7, top + plotH / 2, esc)}
  ${gridAndTicks(scale, left, right, W, m.fmt, refYs(m.refs, (v) => scale.map(v)), axisColor)}
  <clipPath id="plot-clip"><rect x="${f(left)}" y="${f(top - 14)}" width="${f(plotW)}" height="${f(plotH + 14)}"/></clipPath>
  <g clip-path="url(#plot-clip)">${marks}</g>
  <line class="base" x1="${f(left)}" x2="${f(W - right)}" y1="${f(base)}" y2="${f(base)}"/>
  ${refsSvg(m.refs ?? [], {
    left, right: W - right, top, bottom: top + plotH, labelX: left - 5, labelY: top + plotH + 12,
    mapX: (r) => refX(r, m.categories, centers, null), mapY: (r) => (r.value === null ? null : scale.map(r.value)),
    tick: (r) => refText(r, (v) => (r.axis === "y" ? fmtNum(v, m.fmt) : String(v))),
  })}
  ${trends}
  ${overlaySvg}
  ${labels}
  ${xLabels(m.categories, centers, band, top + plotH + 12)}
  ${m.x.label ? `<text class="axis-title" x="${f(left + plotW / 2)}" y="${f(H - 3)}" text-anchor="middle">${esc(m.x.label)}</text>` : ""}
</svg>`;
}

// Names at the ends of lines sit at least this far apart, in px (7.5pt type).
const LABEL_GAP = 11;

export function lineSvg(m, W) {
  const n = m.categories.length;
  const values = m.series.flatMap((s) => s.values.filter((v) => v !== null));
  const lo = Math.min(...values), hi = Math.max(...values);
  // Start at zero unless the data sits well above it, where zero would flatten the lines.
  const zero = m.y.zero ?? (lo >= 0 && lo <= hi * 0.5);
  const top = 8;
  const bottom = 16 + (m.x.label ? 16 : 0);

  // Each line is named at its right end; the axis carries the numbers. A lone line needs no name.
  const named = m.series.length > 1;
  const last = m.series.map((s) => {
    let i = s.values.length - 1;
    while (i >= 0 && s.values[i] === null) i--;
    return i;
  });
  const labelled = named ? last.filter((i) => i >= 0).length : 0;
  // Tall enough that every name fits down the right edge without overlapping.
  const plotH = Math.max(Math.round(Math.min((W - 40) * 0.6, 250)), labelled * LABEL_GAP + 4);
  // Off zero, pad the low end a little so the lowest point doesn't sit on the axis line.
  const padded = zero || m.y.min !== null ? values : [...values, lo - (hi - lo) * 0.04];
  const { scale, left } = yAxis(m, padded, top, plotH, W, { zero });

  const ends = m.series
    .map((s, j) => (last[j] < 0 ? null : { j, y: scale.map(s.values[last[j]]) }))
    .filter(Boolean)
    .sort((a, b) => a.y - b.y);
  spreadLabels(ends, LABEL_GAP, top, top + plotH);
  // A name that had to move gets a short leader back to its line, which takes a little more room.
  const moved = named && ends.some((e) => Math.abs(e.ly - e.y) > 1.5);
  const gap = moved ? 16 : 8;
  // A colored line's name starts with a short stroke of its color, so lines that end close
  // together can still be told apart; gray ones share a color and don't need it.
  const KEY = 11;
  const labelW = (s) => textWidth(s.name, 7.5) + (s.muted ? 0 : KEY);
  const right = named ? Math.min(W * 0.4, Math.max(...ends.map((e) => labelW(m.series[e.j]))) + gap + 4) : 6;
  const plotW = W - left - right;

  const nums = m.numericX ? m.categories.map(Number) : null;
  // A numeric x runs from its set ends, or else from the first value to the last.
  const xLo = nums ? m.x.min ?? Math.min(...nums) : 0, xHi = nums ? m.x.max ?? Math.max(...nums) : 0;
  const xAt = (v) => (xHi === xLo ? left + plotW / 2 : left + ((v - xLo) / (xHi - xLo)) * plotW);
  let xs;
  if (nums) {
    xs = nums.map(xAt);
  } else {
    xs = m.categories.map((_, i) => (n === 1 ? left + plotW / 2 : left + (i / (n - 1)) * plotW));
  }

  // Gray context lines go down first, so the ones the graph is about run on top.
  const order = m.series.map((_, j) => j).sort((a, b) => Number(m.series[b].muted) - Number(m.series[a].muted));
  // The gap between two lines, shaded in the color of the one on top, under all the lines.
  const sh = m.shade;
  const shading = sh
    ? gapAreas(xs, m.series[sh.a].values, m.series[sh.b].values, (v) => scale.map(v))
        .map((r) => `<path d="${r.d}" fill="${m.series[r.above ? sh.a : sh.b].color}" fill-opacity="${SHADE_OPACITY}"/>`)
        .join("")
    : "";
  // Each line's trend, dashed in its own color, under the lines themselves.
  const trends = !m.trend ? "" : order
    .map((j) => [m.series[j], trendLine(xs, m.series[j].values)])
    .filter(([, t]) => t)
    .map(([s, t]) => `<line x1="${f(t.x0)}" y1="${f(scale.map(t.v0))}" x2="${f(t.x1)}" y2="${f(scale.map(t.v1))}" stroke="${s.color}" stroke-width="${TREND.width}" stroke-dasharray="${TREND.dash}" stroke-linecap="round" opacity="0.8"/>`)
    .join("");
  // Lines break where a value is missing rather than bridging the gap.
  const lines = order
    .map((j) => {
      const s = m.series[j];
      let d = "", pen = false;
      s.values.forEach((v, i) => {
        if (v === null) return void (pen = false);
        d += `${pen ? "L" : "M"}${f(xs[i])},${f(scale.map(v))}`;
        pen = true;
      });
      return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.muted ? 1.25 : 2}" stroke-linejoin="round" stroke-linecap="round"/>`;
    })
    .join("");

  const endMarks = [...ends]
    .sort((a, b) => order.indexOf(a.j) - order.indexOf(b.j))
    .map(({ j, y, ly }) => {
      const s = m.series[j];
      const x = xs[last[j]];
      const dot = s.muted
        ? `<circle cx="${f(x)}" cy="${f(y)}" r="2.25" fill="${s.color}"/>`
        : `<circle cx="${f(x)}" cy="${f(y)}" r="3.5" fill="${s.color}" stroke="#ffffff" stroke-width="1.5"/>`;
      if (!named) return dot;
      const tx = x + gap;
      const leader = Math.abs(ly - y) > 1.5 ? `<path class="leader" d="M${f(x + 4)},${f(y)}L${f(tx - 3)},${f(ly)}"/>` : "";
      const key = s.muted ? "" : `<line x1="${f(tx)}" x2="${f(tx + KEY - 4)}" y1="${f(ly)}" y2="${f(ly)}" stroke="${s.color}" stroke-width="2.5" stroke-linecap="round"/>`;
      // dy rather than dominant-baseline, which Safari doesn't apply consistently.
      return `${leader}${dot}${key}<text class="end-label${s.muted ? " muted" : ""}" x="${f(tx + (s.muted ? 0 : KEY))}" y="${f(ly)}" dy="0.35em">${esc(s.name)}</text>`;
    })
    .join("");

  const tickY = top + plotH + 12;
  const xTicks = nums
    ? numericTicks(xLo, xHi, xAt).map((t) => monoText(t.x, tickY, t.text, { anchor: "middle", attrs: `class="tick"`, escape: esc })).join("")
    : xLabels(m.categories, xs, n > 1 ? plotW / (n - 1) : plotW, tickY);
  // What's past the ends set on either axis is cut off at the plot's edge.
  const clip = `<clipPath id="plot-clip"><rect x="${f(left - 3)}" y="${f(top - 3)}" width="${f(plotW + 6)}" height="${f(plotH + 6)}"/></clipPath>`;
  const H = top + plotH + bottom;
  return `<svg class="chart axes" width="${f(W)}" height="${f(H)}" viewBox="0 0 ${f(W)} ${f(H)}" role="img" aria-label="${esc(m.title)}">
  ${yTitle(m.y.label, 7, top + plotH / 2, esc)}
  ${gridAndTicks(scale, left, right, W, m.fmt, refYs(m.refs, (v) => scale.map(v)))}
  ${/* The ink rule sits at zero; when the axis runs below zero, the bottom edge is only a gridline. */ ""}
  ${scale.domain[0] < 0 ? "" : `<line class="base" x1="${f(left)}" x2="${f(W - right)}" y1="${f(top + plotH)}" y2="${f(top + plotH)}"/>`}
  ${clip}
  <g clip-path="url(#plot-clip)">${shading}</g>
  ${refsSvg(m.refs ?? [], {
    left, right: W - right, top, bottom: top + plotH, labelX: left - 5, labelY: top + plotH + 12,
    mapX: (r) => (nums && r.category === null && r.value !== null ? xAt(r.value) : refX(r, m.categories, xs, null)),
    mapY: (r) => (r.value === null ? null : scale.map(r.value)),
    tick: (r) => refText(r, (v) => (r.axis === "y" ? fmtNum(v, m.fmt) : String(v))),
  })}
  <g clip-path="url(#plot-clip)">${trends}${lines}</g>
  ${endMarks}
  ${xTicks}
  ${m.x.label ? `<text class="axis-title" x="${f(left + plotW / 2)}" y="${f(H - 3)}" text-anchor="middle">${esc(m.x.label)}</text>` : ""}
</svg>`;
}

/**
 * Where an x line goes across a table chart: at its category's place when it names one, or,
 * on a line chart of numbers (years), at its value between the two points it falls between.
 */
export function refX(r, categories, xs, nums) {
  const name = r.category ?? (r.value !== null ? String(r.value) : "");
  const i = categories.indexOf(name);
  if (i >= 0) return xs[i];
  if (!nums || r.value === null) return null;
  for (let k = 1; k < nums.length; k++) {
    const [a, b] = [nums[k - 1], nums[k]];
    if ((r.value - a) * (r.value - b) <= 0 && a !== b) return xs[k - 1] + ((r.value - a) / (b - a)) * (xs[k] - xs[k - 1]);
  }
  return null;
}

/** How strongly the gap between two lines is shaded. */
export const SHADE_OPACITY = 0.22;

/** The key for a shaded gap: a block of each side's shade with its name. Nothing if neither side is named. */
export function shadeLegend(m) {
  const sh = m.shade;
  if (!sh || (!sh.above && !sh.below)) return "";
  const item = (name, color) =>
    name ? `<span class="item"><span class="key block" style="background:${color};opacity:${SHADE_OPACITY + 0.13}"></span>${esc(name)}</span>` : "";
  return `<div class="legend">${item(sh.above, m.series[sh.a].color)}${item(sh.below, m.series[sh.b].color)}</div>`;
}

/** A legend for two or more column series, set above the chart. Lines are named at their ends instead. */
export function seriesLegend(m) {
  if (m.series.length < 2 && !m.overlay) return "";
  const blocks = m.series.map((s) => `<span class="item"><span class="key block" style="background:${s.color}"></span>${esc(s.name)}</span>`).join("");
  if (!m.overlay) return `<div class="legend">${blocks}</div>`;
  // With a line on the right axis, the columns are keyed over the left axis and the line over the right.
  const line = `<span class="item"><span class="key" style="background:${m.overlay.color};height:${OVERLAY_WIDTH}px"></span>${esc(m.overlay.name)}</span>`;
  return `<div class="legend split"><span class="side">${blocks}</span><span class="side">${line}</span></div>`;
}
