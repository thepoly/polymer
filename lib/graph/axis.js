// Scales and number formatting shared by the charts with axes (column, line, scatter).

export const lg = Math.log10;
const STEPS = [1, 2, 5];

/** Strips float noise: 0.30000000000000004 → 0.3. */
const clean = (v) => Number(v.toPrecision(12));

const UNITS = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];

/**
 * "1,234", "6.3", "$45", "12%" — up to `decimals` places, trailing zeros dropped.
 * `compact` shortens big numbers to three significant figures: $1.38B, $333M, 23K.
 */
export function fmtNum(v, { prefix = "", suffix = "", decimals = 2, compact = false, grouping = true } = {}) {
  const sign = v < 0 ? "−" : "";
  let a = Math.abs(v), unit = "";
  let i = compact ? UNITS.findIndex(([n]) => a >= n) : -1;
  if (i >= 0) {
    let scaled = Number((a / UNITS[i][0]).toPrecision(3));
    // Rounding can carry into the next unit: 999.7M prints as 1B, not 1,000M.
    if (scaled >= 1000 && i > 0) scaled = Number((a / UNITS[--i][0]).toPrecision(3));
    [a, unit] = [scaled, UNITS[i][1]];
  }
  const body = a.toLocaleString("en-US", { maximumFractionDigits: decimals, useGrouping: grouping });
  return `${sign}${prefix}${body}${unit}${suffix}`;
}

// Months as the paper writes them beside a year (AP style).
const MONTHS = ["Jan.", "Feb.", "March", "April", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];
const DATE = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/;

/** "2023-08-01" or "2023-08" → [year, month 1–12, day], or null for anything else. */
export function parseDate(v) {
  const m = DATE.exec(String(v ?? "").trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3] ?? 1)];
  const days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return mo >= 1 && mo <= 12 && d >= 1 && d <= days ? [y, mo, d] : null;
}

/** A date as a year with its fraction: Aug. 1, 2023 is 2023 + 7/12, so dates and plain years share an axis. */
export function dateValue(v) {
  const p = parseDate(v);
  if (!p) return null;
  const [y, mo, d] = p;
  const days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return y + (mo - 1 + (d - 1) / days) / 12;
}

/** "2023-08-01" → "Aug. 2023"; a plain year stays as it is. */
export function fmtDate(v) {
  const p = parseDate(v);
  if (!p) return String(v ?? "");
  return `${MONTHS[p[1] - 1]} ${p[0]}`;
}

/** A 1-2-5 step that cuts `span` into roughly `target` pieces. */
function niceStep(span, target) {
  const raw = span / target;
  const mag = 10 ** Math.floor(lg(raw));
  const norm = raw / mag;
  return (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
}

/**
 * A linear axis over [min, max] on screen range [a, b]. Ends the caller leaves open are
 * rounded out to the step; `zero` pulls the domain down (or up) to include 0.
 */
export function linearScale(dataMin, dataMax, a, b, { min = null, max = null, zero = false, target = 5 } = {}) {
  let lo = min ?? (zero ? Math.min(0, dataMin) : dataMin);
  let hi = max ?? (zero ? Math.max(0, dataMax) : dataMax);
  if (hi <= lo) hi = lo + 1;
  const step = niceStep(hi - lo, target);
  if (min == null) lo = Math.floor(clean(lo / step)) * step;
  if (max == null) hi = Math.ceil(clean(hi / step)) * step;
  const ticks = [];
  for (let v = Math.ceil(clean(lo / step)) * step; v <= hi + step * 1e-9; v += step) ticks.push(clean(v));
  const map = (v) => a + ((v - lo) / (hi - lo)) * (b - a);
  return { domain: [clean(lo), clean(hi)], ticks, map, kind: "linear" };
}

/** The largest 1-2-5 value at or below v (or, with up, the smallest at or above). */
function nice125(v, up) {
  const p = Math.floor(lg(v));
  const cands = [-1, 0, 1].flatMap((d) => STEPS.map((s) => s * 10 ** (p + d)));
  return up ? Math.min(...cands.filter((c) => c >= v - 1e-12)) : Math.max(...cands.filter((c) => c <= v + 1e-12));
}

/** A log axis. 1-2-5 ticks when a decade has the room, otherwise powers of ten plus the ends. */
export function logScale(dataMin, dataMax, a, b, { min = null, max = null } = {}) {
  if (!(dataMin > 0)) throw new Error("A log axis needs every value above zero. Switch the axis to linear.");
  // A pinned end at or below zero has no log, so it's set from the data instead; left in, the
  // tick loop below would count down to minus infinity and never finish.
  const lo = min !== null && min > 0 ? min : nice125(dataMin);
  let hi = max !== null && max > lo ? max : nice125(dataMax, true);
  if (!(hi > lo)) hi = lo * 10;
  const [l0, l1] = [lg(lo), lg(hi)];
  const pxPerDecade = Math.abs(b - a) / (l1 - l0);
  const ticks = [];
  for (let p = Math.floor(l0); p <= Math.ceil(l1); p++) {
    for (const s of pxPerDecade >= 110 ? STEPS : [1]) {
      const v = clean(s * 10 ** p);
      if (v >= lo - 1e-12 && v <= hi + 1e-12) ticks.push(v);
    }
  }
  for (const end of [lo, hi]) if (!ticks.some((v) => Math.abs(lg(v) - lg(end)) < 1e-9)) ticks.push(end);
  ticks.sort((x, y) => x - y);
  const map = (v) => a + ((lg(v) - l0) / (l1 - l0)) * (b - a);
  return { domain: [lo, hi], ticks, map, kind: "log" };
}

/**
 * Sets `ly` on each item (sorted by `y`) so labels sit `gap` apart within [lo, hi]. Labels
 * that would touch form a group centred on the things they name, so a crowd of labels fans
 * out both ways instead of spilling down from its top one.
 */
export function spreadLabels(items, gap, lo, hi) {
  const place = (members) => {
    const mean = members.reduce((a, e) => a + e.y, 0) / members.length;
    const span = (members.length - 1) * gap;
    return { members, top: Math.max(lo, Math.min(mean - span / 2, hi - span)) };
  };
  const groups = items.map((e) => place([e]));
  for (let i = 1; i < groups.length; ) {
    const [a, b] = [groups[i - 1], groups[i]];
    if (a.top + a.members.length * gap > b.top) {
      groups.splice(i - 1, 2, place([...a.members, ...b.members]));
      i = Math.max(1, i - 1); // the merged group may now touch the one above
    } else i++;
  }
  for (const g of groups) g.members.forEach((e, k) => (e.ly = g.top + k * gap));
}

/** Rough rendered width of Raleway text, for layout decisions made before the browser measures. */
export const textWidth = (s, pt) => String(s).length * pt * (96 / 72) * 0.52;

// Raleway's advance widths (in em) for what axis numbers are made of. Its digits are
// proportional and the site's font file has no tabular ones, so axis numbers are spaced by
// hand: every digit gets the widest digit's room, and the rest keep their own.
const ADVANCE = {
  "$": 0.619, ",": 0.225, ".": 0.189, "−": 0.539, "-": 0.422, "+": 0.415, "%": 0.714, " ": 0.255,
  "(": 0.269, ")": 0.268, M: 0.877, B: 0.666, K: 0.643, k: 0.53,
};
const DIGIT = 0.612;

/**
 * Where each character of a number goes so its digits are evenly spaced, as if the font
 * were tabular: [character, the middle of its room, from the anchor point], at `sizePx`.
 * Null for text with anything else in it (a name, a date written out), which is set as is.
 */
export function monoLayout(text, sizePx, anchor = "start") {
  const s = String(text);
  if (!s || ![...s].every((ch) => /[0-9]/.test(ch) || Object.hasOwn(ADVANCE, ch))) return null;
  const widths = [...s].map((ch) => (/[0-9]/.test(ch) ? DIGIT : ADVANCE[ch]) * sizePx);
  const total = widths.reduce((a, w) => a + w, 0);
  let at = anchor === "end" ? -total : anchor === "middle" ? -total / 2 : 0;
  return [...s].map((ch, i) => {
    const mid = at + widths[i] / 2;
    at += widths[i];
    return [ch, mid];
  });
}

/**
 * An axis's ticks with both of its ends among them, so every axis is labeled where it starts
 * and stops. A round tick closer than `gap` (in place units, after `map`) to an end gives
 * way to it. `domain` is the axis's [start, end].
 */
export function withEnds(ticks, domain, map, gap) {
  const ends = [...new Set(domain.filter(Number.isFinite))];
  const near = (v) => ends.some((e) => Math.abs(map(e) - map(v)) < gap && Math.abs(e - v) > 1e-9);
  const out = ticks.filter((v) => !near(v));
  for (const e of ends) if (!out.some((v) => Math.abs(v - e) <= 1e-9 * Math.max(1, Math.abs(e)))) out.push(e);
  return out.sort((a, b) => a - b);
}

/** An axis tick's type size in a chart's own units: 6.5pt. */
export const TICK_PX = 6.5 * (96 / 72);

/**
 * A tick label as SVG, its digits evenly spaced (monoLayout). `attrs` are the text
 * element's other attributes, already written out; `escape` is for text set as is.
 */
export function monoText(x, y, text, { anchor = "start", attrs = "", escape = (v) => v } = {}) {
  const runs = monoLayout(text, TICK_PX, anchor);
  if (!runs) return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="${anchor}" ${attrs}>${escape(text)}</text>`;
  return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle" ${attrs}>${runs.map(([ch, dx]) => `<tspan x="${(x + dx).toFixed(2)}">${ch}</tspan>`).join("")}</text>`;
}

/** A sideways axis title, centred on the plot's height. */
export const yTitle = (text, x, cy, esc) =>
  text ? `<text class="axis-title" transform="translate(${x} ${cy.toFixed(2)}) rotate(-90)" text-anchor="middle">${esc(text)}</text>` : "";

/** Shared look for every chart with axes. */
export const axisCss = `
.axes .grid { stroke: #dddddd; stroke-width: 0.5; }
.axes .base { stroke: var(--ink); stroke-width: 0.75; }
.axes .tick { font-size: 6.5pt; fill: var(--muted); }
.axes .axis-title { font-size: 7pt; fill: var(--ink); }
.axes .value { font-size: 7pt; fill: var(--ink); font-weight: 600; }
.axes .end-label { font-size: 7.5pt; fill: var(--ink); font-weight: 600; }
.axes .end-label.muted { fill: var(--muted); font-weight: 400; }
.axes .leader { stroke: var(--muted); stroke-width: 0.5; fill: none; }
.legend { display: flex; flex-wrap: wrap; gap: 3pt 10pt; margin-top: 8pt; font-size: 7.5pt; }
.legend .item { display: inline-flex; align-items: center; gap: 4pt; }
.legend .key { display: inline-block; width: 12pt; height: 2.5pt; border-radius: 1pt; }
.legend .key.block { width: 8pt; height: 8pt; border-radius: 1.5pt; }
.legend.split { justify-content: space-between; }
.legend.split .side { display: inline-flex; flex-wrap: wrap; gap: 3pt 10pt; }
`;
