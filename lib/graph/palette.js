// Shades of the masthead red, dark to light. Slices are sorted largest first, so the
// ramp is ordinal: darker means bigger. Validated with the dataviz palette checker in
// --ordinal mode (monotone lightness, visible steps, light end clears the paper).
export const RAMP = ["#6B0A12", "#A3061B", "#D6001C", "#EA4A2E", "#F2845E"];

// A second family for a graph that combines two groups. One red can't stretch to
// nine distinguishable shades, so each group keeps its own five. Same checks as RAMP.
export const PURPLE = ["#3E1A5C", "#5B2A86", "#7A3FAE", "#9A64C8", "#B78ED9"];

// Series colors for line and column charts, by name so a series keeps its color when
// columns are reordered. Validated as a categorical set (lightness band, CVD separation,
// contrast against the paper) in this order.
export const SERIES = { red: "#D6001C", purple: "#6A35A0", orange: "#D9702A", lavender: "#9A64C8" };
export const SERIES_ORDER = ["red", "purple", "orange", "lavender"];

// Context: the lines (and scatter points) a graph isn't about. Any number of series can
// be gray, so a chart can compare one school against many without a color for each.
export const CONTEXT = "#bbbbbb";

// One solid fill per family, for bars: a single series is one color, not a ramp.
export const SOLID = { red: SERIES.red, purple: SERIES.purple };

// A graph names its family with "color", and a combined graph keeps each group's own,
// so a category reads the same color wherever it appears.
export function family(name = "red") {
  // Own keys only, so a color of "constructor" can't reach into Object's prototype.
  const ramps = palette().ramp;
  const ramp = Object.hasOwn(ramps, name) ? ramps[name] : null;
  if (!ramp) throw new Error(`Unknown color "${name}". Use one of: ${Object.keys(ramps).join(", ")}.`);
  return ramp;
}

/** A brand color's base, for bars: a single series is one color, not a ramp. */
export function solid(name = "red") {
  family(name);
  return palette().base[name];
}

/** Picks `n` evenly spread steps from the ramp, so four slices skip a middle step rather than the lightest. */
export function shades(n, ramp) {
  if (n > ramp.length) {
    throw new Error(`${n} slices is more than a group can carry in ${ramp.length} shades. Fold the smallest into "Other".`);
  }
  if (n === 1) return [ramp[2]];
  return Array.from({ length: n }, (_, i) => ramp[Math.round((i * (ramp.length - 1)) / (n - 1))]);
}

// Scatter groups: points sorted into named groups (presidents, provosts) take their group's
// color, and a focus point takes the darker shade of it, so it stands out and keeps its group.
export const GROUP_SHADES = {
  purple: { base: "#9A64C8", dark: "#4A1F75" },
  orange: { base: "#EE9B5E", dark: "#A84B0E" },
  red: { base: "#F2845E", dark: "#A3061B" },
  gray: { base: "#bbbbbb", dark: "#555555" },
};

// ── Brand colors ──────────────────────────────────────────
//
// Everything above is the palette as first written, and is what a site with no settings
// file draws with. The graph settings page (/graph/settings) can change a brand color's
// base or add new ones; each becomes a series color, a family of five shades for slices,
// and a light/dark pair for scatter groups. A built-in color at its original base keeps its
// hand-tuned shades, so graphs made before the settings existed draw exactly as they did.

export const DEFAULT_COLORS = [
  { name: "red", base: SERIES.red, ramp: RAMP, light: GROUP_SHADES.red.base, dark: GROUP_SHADES.red.dark },
  { name: "purple", base: SERIES.purple, ramp: PURPLE, light: GROUP_SHADES.purple.base, dark: GROUP_SHADES.purple.dark },
  { name: "orange", base: SERIES.orange, light: GROUP_SHADES.orange.base, dark: GROUP_SHADES.orange.dark },
  { name: "lavender", base: SERIES.lavender },
];
const BUILT_IN = new Map(DEFAULT_COLORS.map((c) => [c.name, c]));

export const MAX_COLORS = 12;
// Names the graphs already use for something else.
const RESERVED = new Set(["gray", "grey", "ink", "auto", "branches"]);
const HEX = /^#[0-9a-f]{6}$/i;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** "#rrggbb" → OKLCH [lightness 0–1, chroma, hue in radians]. */
function toOklch(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), Math.atan2(B, A)];
}

/** OKLCH → linear sRGB, which may fall outside 0–1. */
function oklchToRgb(L, C, h) {
  const A = C * Math.cos(h), B = C * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** OKLCH → "#rrggbb", giving up chroma (never lightness or hue) until the color exists on a screen. */
function fromOklch(L, C, h) {
  const fits = (c) => oklchToRgb(L, c, h).every((v) => v >= -0.0005 && v <= 1.0005);
  let c = C;
  if (!fits(c)) {
    let lo = 0, hi = C;
    for (let i = 0; i < 18; i++) {
      c = (lo + hi) / 2;
      if (fits(c)) lo = c; else hi = c;
    }
    c = lo;
  }
  return `#${oklchToRgb(L, c, h).map((v) => Math.round(clamp01(toGamma(clamp01(v))) * 255).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

// The lightness of the five steps, dark to light, and how much of the base's chroma each
// keeps. Taken from the hand-tuned red and purple ramps, so a generated family sits beside them.
const STEP_L = [0.33, 0.44, 0.55, 0.64, 0.73];
const STEP_C = [0.72, 0.92, 1, 0.9, 0.7];

/** Five shades of one hue, dark to light, with the base itself as the step nearest its lightness. */
export function rampFrom(base) {
  const [L, C, h] = toOklch(base);
  let k = 0;
  STEP_L.forEach((l, i) => { if (Math.abs(l - L) < Math.abs(STEP_L[k] - L)) k = i; });
  // A very light or very dark base slides the whole ramp with it, within what still reads.
  const shift = L - STEP_L[k];
  return STEP_L.map((l, i) => (i === k ? base.toUpperCase() : fromOklch(Math.min(0.9, Math.max(0.2, l + shift)), C * STEP_C[i] / STEP_C[k], h)));
}

/**
 * Checks what the settings page sends, and returns it as stored: the brand colors, in
 * order, each a name and a base. The built-in colors are always there, since saved graphs
 * name them; only their base can change.
 */
export function cleanSettings(input) {
  const seen = new Set();
  const colors = [];
  for (const c of Array.isArray(input?.colors) ? input.colors : []) {
    const name = String(c?.name ?? "").trim().toLowerCase();
    const base = String(c?.base ?? "").trim();
    if (!/^[a-z][a-z0-9-]{0,23}$/.test(name)) throw new Error(`"${c?.name ?? ""}" isn't a usable color name. Use lowercase letters, numbers and dashes, starting with a letter.`);
    if (RESERVED.has(name)) throw new Error(`"${name}" is already used by the graphs. Pick another name.`);
    if (seen.has(name)) throw new Error(`Two colors are called "${name}".`);
    if (!HEX.test(base)) throw new Error(`"${base}" isn't a color. Write it as six hex digits, like #D6001C.`);
    seen.add(name);
    colors.push({ name, base: base.toUpperCase() });
  }
  for (const d of DEFAULT_COLORS) if (!seen.has(d.name)) colors.push({ name: d.name, base: d.base.toUpperCase() });
  if (colors.length > MAX_COLORS) throw new Error(`That's ${colors.length} colors; ${MAX_COLORS} is the most a graph can tell apart.`);
  return { colors };
}

/** Every brand color with all its shades worked out, in order. Bad entries are skipped, not thrown on. */
export function resolveColors(settings) {
  let stored;
  try {
    stored = cleanSettings(settings).colors;
  } catch {
    stored = cleanSettings(null).colors;
  }
  return stored.map(({ name, base }) => {
    const d = BUILT_IN.get(name);
    const asMade = d && d.base.toUpperCase() === base;
    const ramp = (asMade && d.ramp) || rampFrom(base);
    return {
      name,
      base,
      ramp: [...ramp],
      light: (asMade && d.light) || ramp[3],
      dark: (asMade && d.dark) || ramp[1],
      builtIn: !!d,
      changed: !!d && !asMade,
    };
  });
}

function makePalette(settings) {
  const colors = resolveColors(settings);
  return {
    colors,
    // Brand color names in order: a graph's series take them first to last.
    order: colors.map((c) => c.name),
    base: Object.fromEntries(colors.map((c) => [c.name, c.base])),
    ramp: Object.fromEntries(colors.map((c) => [c.name, c.ramp])),
    shade: { ...Object.fromEntries(colors.map((c) => [c.name, { base: c.light, dark: c.dark }])), gray: GROUP_SHADES.gray },
  };
}

let current = makePalette(null);
let currentKey = "";

/**
 * Sets the brand colors the next graph is built with. buildGraph calls this on every
 * build, with the site's settings or nothing, so one graph's colors never leak into another.
 *
 * @param {{ colors?: { name: string, base: string }[] } | null} [settings]
 */
export function setPalette(settings) {
  const key = settings ? JSON.stringify(settings.colors ?? null) : "";
  if (key !== currentKey) {
    current = makePalette(settings);
    currentKey = key;
  }
  return current;
}

/** The brand colors in force. */
export const palette = () => current;
