// Scales and number formatting shared by the charts with axes (column, line, scatter).

export const lg = Math.log10;
const STEPS = [1, 2, 5];

/** Strips float noise: 0.30000000000000004 → 0.3. */
const clean = (v) => Number(v.toPrecision(12));

/** "1,234", "6.3", "$45", "12%" — up to `decimals` places, trailing zeros dropped. */
export function fmtNum(v, { prefix = "", suffix = "", decimals = 2 } = {}) {
  const sign = v < 0 ? "−" : "";
  const body = Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: decimals });
  return `${sign}${prefix}${body}${suffix}`;
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
  const lo = min ?? nice125(dataMin), hi = max ?? nice125(dataMax, true);
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

/** Rough rendered width of Raleway text, for layout decisions made before the browser measures. */
export const textWidth = (s, pt) => String(s).length * pt * (96 / 72) * 0.52;

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
.axes .end-value { font-weight: 400; }
.axes .leader { stroke: var(--muted); stroke-width: 0.5; fill: none; }
.legend { display: flex; flex-wrap: wrap; gap: 3pt 10pt; margin-top: 8pt; font-size: 7.5pt; }
.legend .item { display: inline-flex; align-items: center; gap: 4pt; }
.legend .key { display: inline-block; width: 12pt; height: 2.5pt; border-radius: 1pt; }
.legend .key.block { width: 8pt; height: 8pt; border-radius: 1.5pt; }
`;
