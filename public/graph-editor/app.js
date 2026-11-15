// The Polytechnic — graph editor.
//
// Holds one graph at a time as an editable "doc" (strings, as typed), turns it into the
// graph file format for preview and save, and leaves rendering to the server so the
// preview is the same renderer the exports use. Exports are made here in the browser:
// the PDF through the print dialog, the PNG by drawing the page onto a canvas.
// Served at poly.rpi.edu/graph; the API is app/api/graph/, the renderer lib/graph/.

import { partsSvg, snapshotParts, paintOf, webScale } from "./parts.js";

// ── Constants ─────────────────────────────────────────────

const KINDS = [
  { id: "ring", label: "Ring", icon: '<circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="4"/>' },
  { id: "pie", label: "Pie", icon: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 12V3a9 9 0 0 1 8.2 12.7Z" fill="currentColor"/>' },
  { id: "pie3d", label: "3D pie", icon: '<ellipse cx="12" cy="10" rx="9" ry="5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 10v4c0 2.8 4 5 9 5s9-2.2 9-5v-4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 10V5a9 5 0 0 1 8.6 6.4Z" fill="currentColor"/>' },
  { id: "bar", label: "Bar", icon: '<rect x="3" y="4" width="17" height="4" rx="1" fill="currentColor"/><rect x="3" y="10" width="11" height="4" rx="1" fill="currentColor"/><rect x="3" y="16" width="6" height="4" rx="1" fill="currentColor"/>' },
  { id: "column", label: "Column", icon: '<rect x="4" y="11" width="4" height="10" rx="1" fill="currentColor"/><rect x="10" y="5" width="4" height="16" rx="1" fill="currentColor"/><rect x="16" y="14" width="4" height="7" rx="1" fill="currentColor"/>' },
  { id: "line", label: "Line", icon: '<path d="M3 18l5-6 4 3 8-10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' },
  { id: "scatter", label: "Scatter", icon: '<circle cx="6" cy="16" r="2.4" fill="currentColor"/><circle cx="11" cy="9" r="2.4" fill="currentColor"/><circle cx="17" cy="13" r="2.4" fill="currentColor"/><circle cx="18" cy="5" r="2.4" fill="currentColor"/>' },
  { id: "flow", label: "Flow", icon: '<rect x="2.5" y="4" width="3" height="16" rx="1" fill="currentColor"/><path d="M5.5 4.5C12 4.5 12 3.5 18.5 3.5V9C12 9 12 11 5.5 11Z" fill="currentColor" opacity=".45"/><path d="M5.5 12.5C12 12.5 12 14.5 18.5 14.5V20.5C12 20.5 12 19.5 5.5 19.5Z" fill="currentColor" opacity=".45"/><rect x="18.5" y="3" width="3" height="6.5" rx="1" fill="currentColor"/><rect x="18.5" y="14" width="3" height="7" rx="1" fill="currentColor"/>' },
  { id: "custom", label: "Custom", icon: '<rect x="3" y="4" width="8" height="6" rx="1" fill="currentColor"/><circle cx="17" cy="8" r="3.5" fill="currentColor" opacity=".45"/><path d="M4 19l5-5 4 3 7-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' },
];
const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.id, k.label]));
const SLICED = ["ring", "pie", "pie3d"];
const ITEM_KINDS = [...SLICED, "bar"];
const TABLE_KINDS = ["column", "line"];

// The brand colors, by name. These are the built-in ones; the site's graph settings
// (/graph/settings) replace them at startup, see applySettings.
let GROUP_COLORS = ["red", "purple", "orange", "lavender"];
let SERIES_COLORS = ["red", "purple", "orange", "lavender"];
// Gray is for context lines: any number of them can share it. Lines only; columns need a color each.
const GRAY = "gray";
const HEX = { red: "#D6001C", purple: "#6A35A0", orange: "#D9702A", lavender: "#9A64C8", gray: "#bbbbbb", ink: "#1a1a1a" };
const MAX_LINES = 10;
const MAX_SLICES = 5;

// Flow graphs (lib/graph/flow.js): any bar or band can be set to one of these, or left on Auto.
let FLOW_COLORS = [...SERIES_COLORS, GRAY, "ink"];
let FLOW_COLOR_OPTIONS = [["", "Auto"], ...FLOW_COLORS.map((c) => [c, c[0].toUpperCase() + c.slice(1)])];
const MAX_FLOW_COLUMNS = 8;
const FLOW_DEFAULTS = { palette: "branches", colorBy: "source", align: "left", order: "auto", labels: "value" };

/** How many series the current kind can hold. */
const maxSeries = () => (doc?.meta.kind === "line" ? MAX_LINES : SERIES_COLORS.length);

/** One color each while they last; past that, RPI (or the first series) in red and the rest gray. Matches lib/graph/series.js. */
function defaultSeriesColors(names) {
  if (names.length <= SERIES_COLORS.length) return names.map((_, i) => SERIES_COLORS[i]);
  const lead = Math.max(0, names.findIndex((n) => /^rpi$|rensselaer/i.test(String(n).trim())));
  return names.map((_, i) => (i === lead ? SERIES_COLORS[0] : GRAY));
}

// Keys the editor writes. Anything else in a file (hand-tuned settings) is carried through as is.
const KNOWN = new Set([
  "kicker", "title", "dek", "kind", "width", "items", "combine", "color", "centerLabel", "valueLabel", "sort",
  "columns", "colors", "rows", "stacked", "points", "x", "y", "prefix", "suffix", "othersLabel", "aspect", "source", "credit",
  "flows", "nodes", "palette", "colorBy", "align", "order", "labels", "inside", "insideLabel", "groups", "trend", "markStyle", "sheet", "views", "size", "parts", "swatches", "from",
]);

// Scatter groups (lib/graph/palette.js GROUP_SHADES): a group's points take its color, and a
// focus point the darker shade of it.
let GROUP_SHADES = {
  purple: { base: "#9A64C8", dark: "#4A1F75" },
  orange: { base: "#EE9B5E", dark: "#A84B0E" },
  red: { base: "#F2845E", dark: "#A3061B" },
  gray: { base: "#bbbbbb", dark: "#555555" },
};
let SCATTER_GROUP_COLORS = Object.keys(GROUP_SHADES);

// The site's graph settings as stored, sent along to the web preview so it draws in the same colors.
let graphSettings = null;
// The brand colors with their shades, for the canvas's color picker.
let BRAND = [];

/** Takes the brand colors from the site's graph settings: every picker and swatch follows them. */
function applySettings({ settings, colors }) {
  if (!Array.isArray(colors) || !colors.length) return;
  graphSettings = settings ?? null;
  BRAND = colors.filter((c) => Array.isArray(c.ramp));
  const names = colors.map((c) => c.name);
  GROUP_COLORS = names;
  SERIES_COLORS = names;
  for (const c of colors) HEX[c.name] = c.base;
  FLOW_COLORS = [...names, GRAY, "ink"];
  FLOW_COLOR_OPTIONS = [["", "Auto"], ...FLOW_COLORS.map((c) => [c, c[0].toUpperCase() + c.slice(1)])];
  GROUP_SHADES = { ...Object.fromEntries(colors.map((c) => [c.name, { base: c.light, dark: c.dark }])), gray: { base: "#bbbbbb", dark: "#555555" } };
  SCATTER_GROUP_COLORS = Object.keys(GROUP_SHADES);
}
const SCATTER_SHAPES = ["circle", "square", "triangle", "diamond"]; // lib/graph/scatter.js SHAPES

// ── Small helpers ─────────────────────────────────────────

const $ = (sel, el = document) => el.querySelector(sel);

/** Builds an element. Props starting with "on" become listeners; children may be nested arrays. */
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  let value;
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "class") el.className = v;
    else if (k === "value") value = v;
    else if (k === "checked") el.checked = true;
    else if (k === "icon") el.innerHTML = v; // static SVG from this file only
    else if (k === "dataset") Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  if (value !== undefined) el.value = value; // after children, so a <select> has its options
  return el;
}

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `${res.status} ${res.statusText}`);
  return json;
}

/** "1,234", "$45", "12%", "(3)", "−4" → numbers; anything else → null. */
function parseNum(s) {
  if (typeof s === "number") return Number.isFinite(s) ? s : null;
  let t = String(s ?? "").trim();
  if (!t) return null;
  t = t.replace(/[−–]/g, "-").replace(/^\((.*)\)$/, "-$1").replace(/[,\s$€£%]/g, "");
  return /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t) ? Number(t) : null;
}
const str = (v) => (v == null ? "" : String(v));
/** A date cell, "2023-08-01" or "2023-08", as a date axis takes it. Matches lib/graph/axis.js parseDate. */
const isDate = (s) => {
  const m = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(String(s ?? "").trim());
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3] ?? 1)];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= new Date(Date.UTC(y, mo, 0)).getUTCDate();
};
/** A number, or on a date axis also a date, which is kept as written. */
const axisValue = (s, axis) => (axis?.year && isDate(s) ? String(s).trim() : parseNum(s));
const blank = (s) => String(s ?? "").trim() === "";

/** Multi-line labels are written with " | " between lines in the editor. */
const joinLines = (v) => (Array.isArray(v) ? v.join(" | ") : str(v));
const splitLines = (s) => {
  const parts = String(s ?? "").split("|").map((p) => p.trim()).filter(Boolean);
  return parts.length > 1 ? parts : parts[0] ?? "";
};

const slugify = (s) =>
  String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

const fmtPct = (v, total) => {
  if (!(total > 0) || !(v > 0)) return "";
  const p = Math.round((v / total) * 100);
  return p === 0 ? "<1%" : `${p}%`;
};

// ── State ─────────────────────────────────────────────────

let graphs = []; // sidebar list from the server
let doc = null; // the graph being edited
let saved = ""; // the saved file, as JSON, to tell when the doc is dirty

const emptyRows = (n, w) => Array.from({ length: n }, () => Array(w).fill(""));
const emptyPoint = () => ({ label: "", name: "", group: "", x: "", y: "", highlight: false, labelAt: "right", note: "", _raw: {} });
const emptyAxis = () => ({ label: "", short: "", unit: "", scale: "linear", min: "", max: "", year: false });

function blankDoc(kind = "ring") {
  return {
    name: "",
    loadedName: null,
    raw: {},
    meta: {
      kind, kicker: "", title: "", dek: "", source: "", credit: "", width: "3.5",
      centerLabel: "total", valueLabel: "Reports", sort: true, prefix: "", suffix: "", stacked: false,
      xLabel: "", yLabel: "", yMin: "", yMax: "", yZero: "auto", aspect: "", othersLabel: "",
      dots: false, insideLabel: "", trend: false, markStyle: "solid",
      ...FLOW_DEFAULTS,
    },
    groups: [{ name: "", color: "red", ref: null, rows: emptyRows(4, 2) }],
    // inside: category → one entry per series, counted out as dots inside the columns.
    table: { columns: ["Category", "Series 1"], colors: ["red"], rows: emptyRows(5, 2), inside: {} },
    scatter: { x: emptyAxis(), y: emptyAxis(), points: Array.from({ length: 4 }, emptyPoint), groups: [] },
    // Rows are [from, to, amount, band color]; nodes holds each bar's color and column by name.
    flow: { rows: emptyRows(5, 4), nodes: {} },
    // The scratch spreadsheet: rows of cells as typed. Saved with the graph, never drawn.
    sheet: [],
    // A custom graph's parts, its size, the colors added to it, and the graph it was made from.
    custom: null,
  };
}

const itemRows = (items = []) => items.map((it) => (Array.isArray(it) ? [str(it[0]), str(it[1])] : [str(it.label), str(it.value)]));

function axisFrom(a = {}) {
  return {
    label: joinLines(a.label),
    short: str(a.short),
    unit: str(a.unit),
    // Files from before the switch existed are log.
    scale: a.scale === "linear" ? "linear" : "log",
    min: str(a.domain?.[0]),
    max: str(a.domain?.[1]),
    year: !!a.year,
    raw: a,
  };
}

/** A graph file → an editable doc. */
function fromFile(g, name) {
  const d = blankDoc(g.kind ?? "ring");
  d.name = name;
  d.loadedName = name;
  d.raw = structuredClone(g);
  if (g.kind === "custom") {
    const views = {};
    for (const v of ["print", "web", "phone"]) {
      const view = g.views?.[v];
      if (Array.isArray(view?.size) && Array.isArray(view?.parts)) views[v] = structuredClone({ size: view.size, parts: view.parts });
    }
    // The first custom graphs held one layout, at the top of the file; it stands in for print.
    if (!views.print && Array.isArray(g.size) && Array.isArray(g.parts)) views.print = structuredClone({ size: g.size, parts: g.parts });
    // A file missing a view shows another's in its place rather than nothing.
    const any = views.print ?? views.web ?? views.phone ?? { size: [336, 336], parts: [] };
    for (const v of ["print", "web", "phone"]) views[v] ??= structuredClone(any);
    d.custom = {
      views,
      swatches: Array.isArray(g.swatches) ? [...g.swatches] : [],
      from: g.from ? structuredClone(g.from) : null,
    };
  }
  d.sheet = Array.isArray(g.sheet) ? g.sheet.map((r) => (Array.isArray(r) ? r.map(str) : [])) : [];
  Object.assign(d.meta, {
    kicker: str(g.kicker), title: str(g.title), dek: str(g.dek), source: str(g.source), credit: str(g.credit),
    width: str(g.width ?? 3.5), centerLabel: g.centerLabel ?? "total", valueLabel: g.valueLabel ?? "Reports",
    sort: g.sort !== false, prefix: str(g.prefix), suffix: str(g.suffix), stacked: !!g.stacked,
    aspect: str(g.aspect), othersLabel: str(g.othersLabel), trend: !!g.trend, markStyle: g.markStyle ?? "solid",
  });
  if (g.items || g.combine) {
    d.groups = g.combine
      ? g.combine.map((c) =>
          c.graph
            ? { name: str(c.name), color: null, ref: c.graph, rows: [] }
            : { name: str(c.name), color: c.color ?? "red", ref: null, rows: itemRows(c.items) }
        )
      : [{ name: "", color: g.color ?? "red", ref: null, rows: itemRows(g.items) }];
  }
  if (g.columns) {
    d.table = {
      columns: g.columns.map(str),
      colors: (() => {
        const defaults = defaultSeriesColors(g.columns.slice(1));
        return g.columns.slice(1).map((_, i) => g.colors?.[i] ?? defaults[i]);
      })(),
      rows: (g.rows ?? []).map((r) => g.columns.map((_, i) => str(r?.[i]))),
      inside: Object.fromEntries((g.inside ?? []).filter((r) => Array.isArray(r)).map((r) => [str(r[0]).trim(), r.slice(1).map(str)])),
    };
    d.meta.dots = Array.isArray(g.inside);
    d.meta.insideLabel = str(g.insideLabel);
  }
  if (TABLE_KINDS.includes(g.kind)) {
    Object.assign(d.meta, {
      xLabel: joinLines(g.x?.label), yLabel: joinLines(g.y?.label),
      yMin: str(g.y?.min), yMax: str(g.y?.max),
      yZero: g.y?.zero === true ? "yes" : g.y?.zero === false ? "no" : "auto",
    });
  }
  if (g.flows) {
    d.flow = {
      rows: g.flows.map((r) => [str(r?.[0]), str(r?.[1]), str(r?.[2]), str(r?.[3])]),
      nodes: Object.fromEntries((g.nodes ?? []).filter((n) => n?.name).map((n) => [n.name, {
        color: str(n.color), column: str(n.column), y: typeof n.y === "number" ? n.y : null, label: Array.isArray(n.label) ? n.label : null,
      }])),
    };
  }
  for (const [k, def] of Object.entries(FLOW_DEFAULTS)) d.meta[k] = g[k] ?? def;
  if (g.points) {
    d.scatter = {
      x: axisFrom(g.x),
      y: axisFrom(g.y),
      groups: (g.groups ?? []).map((grp) => ({ name: str(grp.name), color: grp.color ?? "purple", shape: grp.shape ?? "circle" })),
      points: g.points.map((p) => ({
        label: str(p.label), name: str(p.name), group: str(p.group), x: str(p.x), y: str(p.y), highlight: !!p.highlight,
        labelAt: p.labelAt ?? "right", note: joinLines(p.note), _raw: p,
      })),
    };
  }
  return d;
}

/** The doc → a graph file, plus what was left out and why. */
function toFile(d) {
  const m = d.meta, kind = m.kind, warnings = [];
  const out = { kicker: m.kicker, title: m.title, dek: m.dek, kind };
  const w = parseNum(m.width);
  if (w && w !== 3.5) out.width = w;
  for (const [k, v] of Object.entries(d.raw ?? {})) if (!KNOWN.has(k)) out[k] = v;

  if (ITEM_KINDS.includes(kind)) {
    const clean = (rows, groupName) => {
      const items = [];
      rows.forEach(([label, value]) => {
        if (blank(label) && blank(value)) return;
        const v = parseNum(value);
        const where = groupName ? ` in ${groupName}` : "";
        if (blank(label)) return warnings.push(`A row${where} has a number but no label, so it's left out.`);
        if (v === null) return warnings.push(`“${label.trim()}”${where} has no number, so it's left out.`);
        if (SLICED.includes(kind) && v <= 0) return warnings.push(`“${label.trim()}” is ${v}; a ${KIND_LABEL[kind].toLowerCase()} can only show values above zero.`);
        if (kind === "bar" && v < 0) return warnings.push(`“${label.trim()}” is negative; bars start at zero.`);
        items.push([label.trim(), v]);
      });
      return items;
    };
    const solo = d.groups.length === 1 && !d.groups[0].ref;
    if (solo) {
      out.color = d.groups[0].color;
      out.items = clean(d.groups[0].rows);
    } else {
      out.combine = d.groups.map((g) =>
        g.ref ? { graph: g.ref, name: g.name } : { name: g.name, color: g.color, items: clean(g.rows, g.name) }
      );
    }
    if (kind === "ring") out.centerLabel = m.centerLabel;
    if (SLICED.includes(kind) && (m.valueLabel !== "Reports" || "valueLabel" in d.raw)) out.valueLabel = m.valueLabel;
    if (!m.sort) out.sort = false;
  }

  if (TABLE_KINDS.includes(kind)) {
    const t = d.table;
    out.columns = t.columns.map((c, i) => (blank(c) ? (i ? `Series ${i}` : "Category") : c.trim()));
    out.colors = t.colors.slice(0, t.columns.length - 1);
    out.rows = [];
    t.rows.forEach((r) => {
      const cells = t.columns.map((_, i) => r[i] ?? "");
      if (cells.every(blank)) return;
      if (blank(cells[0])) return warnings.push("A row has numbers but no category, so it's left out.");
      const row = [cells[0].trim()];
      cells.slice(1).forEach((c, i) => {
        const v = parseNum(c);
        if (v === null && !blank(c)) warnings.push(`“${c}” under ${out.columns[i + 1]} isn't a number, so that point is left out.`);
        row.push(v);
      });
      out.rows.push(row);
    });
    out.x = { ...(d.raw.x ?? {}), label: splitLines(m.xLabel) };
    out.y = { ...(d.raw.y ?? {}), label: splitLines(m.yLabel) };
    const [lo, hi] = [parseNum(m.yMin), parseNum(m.yMax)];
    if (lo !== null) out.y.min = lo; else delete out.y.min;
    if (hi !== null) out.y.max = hi; else delete out.y.max;
    if (kind === "line" && m.yZero !== "auto") out.y.zero = m.yZero === "yes"; else delete out.y.zero;
    if (kind === "column" && m.stacked) out.stacked = true;
    if (kind === "column" && m.dots) {
      out.inside = out.rows.map((r) => [r[0], ...out.columns.slice(1).map((_, i) => str(t.inside[r[0]]?.[i]).trim())]);
      if (m.insideLabel.trim()) out.insideLabel = m.insideLabel.trim();
    }
  }

  if (kind === "bar" || kind === "flow" || TABLE_KINDS.includes(kind)) {
    if (m.prefix) out.prefix = m.prefix;
    if (m.suffix) out.suffix = m.suffix;
  }

  if (kind === "flow") {
    out.flows = [];
    d.flow.rows.forEach(([from, to, amount, color]) => {
      if ([from, to, amount].every(blank)) return;
      const where = !blank(from) && !blank(to) ? `“${from.trim()} → ${to.trim()}”` : "A row";
      const v = parseNum(amount);
      if (blank(from) || blank(to)) return warnings.push(`${where} needs both a From and a To, so it's left out.`);
      if (from.trim() === to.trim()) return warnings.push(`“${from.trim()}” can't flow into itself, so that row is left out.`);
      if (v === null) return warnings.push(`${where} has no amount, so it's left out.`);
      if (v <= 0) return warnings.push(`${where} is ${v}; a flow has to carry more than zero.`);
      out.flows.push(color ? [from.trim(), to.trim(), v, color] : [from.trim(), to.trim(), v]);
    });
    // Per-bar settings, only for bars still in the data and only what's been set.
    const names = new Set(out.flows.flatMap((r) => [r[0], r[1]]));
    const nodes = Object.entries(d.flow.nodes)
      .filter(([name]) => names.has(name))
      .map(([name, s]) => ({
        name,
        ...(s.color ? { color: s.color } : {}),
        ...(s.column ? { column: Number(s.column) } : {}),
        ...(s.y != null ? { y: s.y } : {}),
        ...(s.label ? { label: s.label } : {}),
      }))
      .filter((n) => Object.keys(n).length > 1);
    if (nodes.length) out.nodes = nodes;
    for (const [k, def] of Object.entries(FLOW_DEFAULTS)) if (m[k] !== def) out[k] = m[k];
    const asp = parseNum(m.aspect);
    if (asp) out.aspect = asp;
  }

  if (kind === "scatter") {
    const s = d.scatter;
    const axisOut = (a) => {
      const o = { ...(a.raw ?? {}), label: splitLines(a.label), short: a.short, unit: a.unit };
      const [lo, hi] = [parseNum(a.min), parseNum(a.max)];
      if (lo !== null && hi !== null) o.domain = [lo, hi];
      else {
        delete o.domain;
        if (lo !== null || hi !== null) warnings.push("Set both the low and high end of an axis range, or neither.");
      }
      if (a.scale === "linear") o.scale = "linear";
      else delete o.scale;
      if (a.year) o.year = true;
      else delete o.year;
      return o;
    };
    out.x = axisOut(s.x);
    out.y = axisOut(s.y);
    const asp = parseNum(m.aspect);
    if (asp) out.aspect = asp;
    if (m.othersLabel) out.othersLabel = m.othersLabel;
    if (m.trend) out.trend = true;
    if (m.markStyle && m.markStyle !== "solid") out.markStyle = m.markStyle;
    const groups = s.groups.filter((g) => !blank(g.name)).map((g) => ({ name: g.name.trim(), color: g.color, ...(g.shape && g.shape !== "circle" ? { shape: g.shape } : {}) }));
    if (groups.length) out.groups = groups;
    const groupNames = new Set(groups.map((g) => g.name));
    out.points = [];
    s.points.forEach((p) => {
      if (blank(p.label) && blank(p.x) && blank(p.y)) return;
      const x = axisValue(p.x, s.x), y = axisValue(p.y, s.y);
      if (x === null || y === null) {
        const what = s.x.year || s.y.year ? "a number or a date like 2023-08-01" : "a number";
        return warnings.push(`${p.label.trim() || p.name.trim() ? `“${p.label.trim() || p.name.trim()}”` : "An unnamed point"} needs ${what} for both x and y, so it's left out.`);
      }
      const o = { ...p._raw };
      for (const k of ["label", "name", "group", "x", "y", "highlight", "labelAt", "note"]) delete o[k];
      const pt = {};
      if (!blank(p.label)) pt.label = p.label.trim();
      else if (!blank(p.name)) pt.name = p.name.trim();
      if (!blank(p.group)) {
        if (groupNames.has(p.group.trim())) pt.group = p.group.trim();
        else warnings.push(`“${p.group.trim()}” isn't one of the groups, so ${p.label.trim() || p.name.trim() || "a point"} is drawn without one.`);
      }
      Object.assign(pt, { x, y });
      if (p.highlight) pt.highlight = true;
      if (p.labelAt && p.labelAt !== "right") pt.labelAt = p.labelAt;
      Object.assign(pt, o);
      if (!blank(p.note)) pt.note = splitLines(p.note);
      out.points.push(pt);
    });
  }

  if (kind === "custom" && d.custom) {
    out.views = d.custom.views;
    if (d.custom.swatches.length) out.swatches = d.custom.swatches;
    if (d.custom.from) out.from = d.custom.from;
    // Its width is its own; the default isn't 3.5in as for the other kinds.
    if (w) out.width = w;
    return { graph: out, warnings };
  }

  out.source = m.source;
  out.credit = m.credit;
  const sheet = trimSheet(d.sheet);
  if (sheet.length) out.sheet = sheet;
  return { graph: out, warnings };
}

const isDirty = () => !!doc && JSON.stringify(toFile(doc).graph) !== saved;

// ── Paste ─────────────────────────────────────────────────

/** Spreadsheet text → rows of cells. Tabs from Excel/Sheets; commas from a CSV. Blank lines stay as []. */
function parseClipboard(text) {
  const lines = String(text).replace(/\r\n?/g, "\n").replace(/\n+$/, "").split("\n");
  const tabbed = lines.some((l) => l.includes("\t"));
  return lines.map((line) => {
    if (tabbed) return line.split("\t").map((c) => c.trim());
    if (!line.includes(",")) return [line.trim()];
    const cells = [];
    let cur = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') q = false;
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ",") { cells.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  }).map((cells) => (cells.every(blank) ? [] : cells));
}

const isNumCell = (c) => parseNum(c) !== null;

/** Pasted rows → groups of [label, value]. Blank lines start a new group; a lone heading names it. */
function pasteItems(rows) {
  const blocks = [[]];
  for (const r of rows) {
    if (r.length === 0) { if (blocks.at(-1).length) blocks.push([]); continue; }
    blocks.at(-1).push(r);
  }
  if (!blocks.at(-1).length) blocks.pop();

  const groups = blocks.map((block, bi) => {
    let name = "";
    const out = [];
    block.forEach((r, ri) => {
      const cells = r.filter((c) => !blank(c));
      const nums = r.filter(isNumCell);
      const texts = cells.filter((c) => !isNumCell(c));
      // A header row ("Crime  Infraction") has words in every cell and no numbers.
      if (bi === 0 && ri === 0 && nums.length === 0 && texts.length >= 2) return;
      // A single word on its own at the top of a block names the group.
      if (ri === 0 && nums.length === 0 && texts.length === 1) return void (name = texts[0]);
      const label = texts[0] ?? "";
      const value = nums[0] ?? r.find((c, i) => i > 0 && !blank(c)) ?? "";
      out.push([label, value]);
    });
    return { name, rows: out };
  }).filter((g) => g.rows.length);
  return groups;
}

const SMALL_WORDS = new Set(["a", "an", "and", "as", "at", "by", "for", "in", "of", "on", "or", "per", "the", "to", "vs"]);

/**
 * A spreadsheet's column id ("case_western", "rpi") → a name for the graph ("Case Western",
 * "RPI"). Headers already written as names are left alone. A lone word of two or three
 * letters is taken for an acronym (RPI, RIT, WPI, FY); anything it gets wrong can be retyped.
 */
function tidyHeader(s) {
  const t = String(s ?? "").trim();
  if (!/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(t)) return t;
  const words = t.split("_");
  if (words.length === 1 && /^[a-z]{2,3}$/.test(t)) return t.toUpperCase();
  return words.map((w, i) => (i && SMALL_WORDS.has(w) ? w : w[0].toUpperCase() + w.slice(1))).join(" ");
}

/** Pasted rows → a table with a header row of series names. */
function pasteTable(rows) {
  const body = rows.filter((r) => r.length);
  if (!body.length) return null;
  const first = body[0];
  const header = first.slice(1).some((c) => !isNumCell(c) && !blank(c)) || first.every((c) => !isNumCell(c));
  const width = Math.max(...body.map((r) => r.length), 2);
  const columns = header
    ? first.concat(Array(width).fill("")).slice(0, width).map(tidyHeader)
    : ["Category", ...Array.from({ length: width - 1 }, (_, i) => `Series ${i + 1}`)];
  const data = (header ? body.slice(1) : body).map((r) => r.concat(Array(width).fill("")).slice(0, width));
  return { columns, rows: data };
}

/** Pasted rows → scatter points: label, x, y — or just x, y. A header row names the axes. */
function pastePoints(rows) {
  const body = rows.filter((r) => r.length);
  if (!body.length) return null;
  let header = null;
  if (body[0].slice(1).every((c) => !isNumCell(c))) header = body.shift();
  const points = body.map((r) => {
    const named = !isNumCell(r[0]);
    const [label, x, y, group] = named ? [r[0], r[1], r[2], r[3]] : ["", r[0], r[1], r[2]];
    return { ...emptyPoint(), label: label ?? "", x: x ?? "", y: y ?? "", group: str(group).trim() };
  });
  return { header, points };
}

// SankeyMATIC's line format, "Budget [120] Instruction", with an optional trailing #color.
const SANKEYMATIC = /^(.+?)\s*\[\s*([^\]]+?)\s*\]\s*(.+?)(?:\s+#[0-9a-f]{3,8})?$/i;

/**
 * Rows of cells → [from, to, amount, color] flow rows. Takes spreadsheet columns (From, To,
 * Amount, and a color name if wanted), or SankeyMATIC lines, one to a cell. A header row
 * is skipped.
 */
function pasteFlows(rows) {
  const lines = rows.filter((r) => r.length).map((r) => r.filter((c) => !blank(c)).join(" ").trim())
    .filter((l) => l && !l.startsWith("//") && !l.startsWith(":"));
  if (lines.length && lines.filter((l) => SANKEYMATIC.test(l)).length >= lines.length / 2) {
    return lines.flatMap((l) => {
      const m = l.match(SANKEYMATIC);
      return m ? [[m[1].trim(), m[3].trim(), m[2].trim(), ""]] : [];
    });
  }
  const body = rows.filter((r) => r.length >= 3);
  if (body.length && !isNumCell(body[0][2])) body.shift();
  return body.map((r) => {
    const color = String(r[3] ?? "").trim().toLowerCase();
    return [r[0], r[1], r[2], FLOW_COLORS.includes(color) ? color : ""];
  });
}

/**
 * Rows of cells, read the way this kind of graph lays its data out, or null (with a
 * message) when nothing usable is in them.
 */
function parseRows(rows, kind) {
  if (kind === "flow") {
    const flows = pasteFlows(rows);
    if (!flows.length) return void status("Couldn't find any rows with a from, a to and an amount.", true);
    return { flows };
  }
  if (ITEM_KINDS.includes(kind)) {
    const groups = pasteItems(rows);
    if (!groups.length) return void status("Couldn't find any rows with a label and a number.", true);
    return { groups };
  }
  if (TABLE_KINDS.includes(kind)) {
    const table = pasteTable(rows);
    return table ? { table } : null;
  }
  return pastePoints(rows);
}

/** No two of the graph's own groups share a color: a repeat takes one that's still free. */
function fixGroupColors() {
  const used = new Set(doc.groups.filter((g) => g.ref).map((g) => g.refColor));
  for (const g of doc.groups) {
    if (g.ref) continue;
    if (!g.color || used.has(g.color)) g.color = GROUP_COLORS.find((c) => !used.has(c)) ?? g.color ?? GROUP_COLORS[0];
    used.add(g.color);
  }
}

/**
 * Puts parsed data into the graph. `mode` is "replace", "append" (more rows of the same),
 * "group" (a new group of its own, named `name`) or "series" (new series beside the ones there).
 */
function applyData(data, mode = "replace", name = "") {
  const kind = doc.meta.kind;

  if (kind === "flow") {
    doc.flow.rows = mode === "replace" ? data.flows : doc.flow.rows.filter((r) => !r.every(blank)).concat(data.flows);
    rerender();
    return changed();
  }

  if (ITEM_KINDS.includes(kind)) {
    let groups = data.groups;
    if (mode === "append") {
      const target = doc.groups.findLast((g) => !g.ref) ?? doc.groups[0];
      target.rows = target.rows.filter((r) => !r.every(blank)).concat(groups.flatMap((g) => g.rows));
    } else if (mode === "group") {
      // An untouched graph starts with one empty group; the new one takes its place.
      if (doc.groups.length === 1 && !doc.groups[0].ref && doc.groups[0].rows.every((r) => r.every(blank))) doc.groups = [];
      const free = GROUP_COLORS.filter((c) => !doc.groups.some((o) => (o.color ?? o.refColor) === c));
      if (groups.length > free.length) {
        return status(doc.groups.length >= GROUP_COLORS.length
          ? "Every color already has a group. Add a color in Settings to make room for another."
          : `Only ${free.length} more group${free.length === 1 ? "" : "s"} fit${free.length === 1 ? "s" : ""}, one for each color.`, true);
      }
      if (doc.groups.length === 1 && !doc.groups[0].name.trim()) doc.groups[0].name = "Group 1";
      groups.forEach((g, i) => {
        doc.groups.push({ name: (groups.length === 1 && name.trim()) || g.name || `Group ${doc.groups.length + 1}`, color: free[i], ref: null, rows: g.rows });
      });
      if (doc.groups.length === 1 && !name.trim() && !groups[0].name) doc.groups[0].name = "";
    } else {
      if (groups.length > GROUP_COLORS.length) {
        const extra = groups.splice(GROUP_COLORS.length);
        groups.at(-1).rows.push(...extra.flatMap((g) => g.rows));
        status(`Only ${GROUP_COLORS.length} groups fit, one per color; the rest went into the last group.`, true);
      }
      doc.groups = groups.map((g, i) => ({
        name: groups.length > 1 ? g.name || `Group ${i + 1}` : g.name,
        color: doc.groups[i]?.color && !doc.groups[i].ref ? doc.groups[i].color : GROUP_COLORS[i],
        ref: null,
        rows: g.rows,
      }));
      fixGroupColors();
      if (groups.length === 1 && groups[0].name && blank(doc.meta.title)) doc.meta.title = groups[0].name;
    }
  } else if (TABLE_KINDS.includes(kind)) {
    const t = data.table;
    const max = maxSeries();
    const tooMany = () => status(kind === "line"
      ? `Only ${max} lines fit; columns after that were left off.`
      : `Only ${max} series fit in a column chart; columns after that were left off. A line chart holds ${MAX_LINES}.`, true);
    if (mode === "series") {
      // Each new series lines up with the rows already there by category, and adds a row for any new one.
      const cur = doc.table;
      const room = max - (cur.columns.length - 1);
      if (room <= 0) return tooMany();
      if (t.columns.length - 1 > room) tooMany();
      const add = t.columns.slice(1, room + 1);
      const from = cur.columns.length;
      cur.columns.push(...add.map((c, i) => c || `Series ${from + i}`));
      cur.rows = cur.rows.filter((r) => !r.every(blank));
      const rowOf = new Map();
      cur.rows.forEach((r, i) => { if (str(r[0]).trim()) rowOf.set(str(r[0]).trim(), i); });
      cur.rows.forEach((r) => { while (r.length < cur.columns.length) r.push(""); });
      for (const r of t.rows) {
        const cat = str(r[0]).trim();
        if (!cat) continue;
        let at = rowOf.get(cat);
        if (at === undefined) {
          at = cur.rows.push([cat, ...Array(cur.columns.length - 1).fill("")]) - 1;
          rowOf.set(cat, at);
        }
        add.forEach((_, i) => (cur.rows[at][from + i] = r[i + 1] ?? ""));
      }
      fixSeriesColors();
    } else {
      if (t.columns.length - 1 > max) {
        tooMany();
        t.columns = t.columns.slice(0, max + 1);
        t.rows = t.rows.map((r) => r.slice(0, max + 1));
      }
      if (mode === "append" && t.columns.length === doc.table.columns.length) {
        doc.table.rows = doc.table.rows.filter((r) => !r.every(blank)).concat(t.rows);
      } else {
        // New data, new colors: past what the colors cover, that means RPI in red and the rest gray.
        doc.table = { columns: t.columns, colors: defaultSeriesColors(t.columns.slice(1)), rows: t.rows, inside: doc.table.inside ?? {} };
        fixSeriesColors();
      }
    }
  } else {
    const p = data;
    const s = doc.scatter;
    if (p.header) {
      const [, xh, yh] = !isNumCell(p.header[0]) && p.header.length >= 3 ? p.header : ["", p.header[0], p.header[1]];
      if (blank(s.x.label) && xh) s.x.label = xh;
      if (blank(s.y.label) && yh) s.y.label = yh;
    }
    if (mode === "group") {
      const group = name.trim() || `Group ${s.groups.length + 1}`;
      p.points.forEach((q) => (q.group = group));
    }
    s.points = mode === "replace" ? p.points : s.points.filter((q) => !(blank(q.label) && blank(q.name) && blank(q.x) && blank(q.y))).concat(p.points);
    // Groups named in the data and not set up yet get a color each.
    for (const group of new Set(p.points.map((q) => q.group).filter(Boolean))) {
      if (s.groups.some((g) => g.name.trim() === group)) continue;
      const used = new Set(s.groups.map((g) => g.color));
      s.groups.push({ name: group, color: SCATTER_GROUP_COLORS.find((c) => !used.has(c)) ?? "gray", shape: "circle" });
    }
  }
  rerender();
  changed();
}

/** Multi-cell paste into a grid cell: fills right and down from that cell, adding rows as needed. */
function pasteIntoGrid(e, grid, rowIndex, colIndex, width, makeRow, onWide, sync) {
  const text = e.clipboardData?.getData("text/plain") ?? "";
  if (!/[\t\n]/.test(text.replace(/\n$/, ""))) return; // a single value pastes normally
  e.preventDefault();
  const rows = parseClipboard(text).filter((r) => r.length);
  rows.forEach((cells, i) => {
    const ri = rowIndex + i;
    while (grid.length <= ri) grid.push(makeRow());
    if (onWide && colIndex + cells.length > width) width = onWide(colIndex + cells.length);
    cells.forEach((c, j) => {
      const ci = colIndex + j;
      if (ci < width) grid[ri][ci] = c;
    });
  });
  sync?.();
  rerender();
  changed();
}

// ── Sheet ─────────────────────────────────────────────────
//
// A spreadsheet kept with the graph. A whole sheet can be pasted in as it is; ranges of it
// are then picked out as the labels, the values and so on, and put into the graph's data.
// It works the way spreadsheets do: click and drag to select, Shift to extend, ⌘-click for
// a second range, type to edit, ⌘C/⌘V/⌘Z. The file keeps it under "sheet"; nothing draws it.

const SHEET_MIN_ROWS = 10, SHEET_MIN_COLS = 6, SHEET_MAX_ROWS = 2000, SHEET_MAX_COLS = 78;

// What each kind of graph needs picked out of the sheet. `num` columns hold numbers, so a
// word at the top of one is its heading; `multi` takes any number of columns.
const SHEET_ROLES = {
  items: [{ id: "labels", label: "Labels" }, { id: "values", label: "Values", num: true }],
  table: [{ id: "categories", label: "Categories" }, { id: "series", label: "Series", num: true, multi: true }],
  scatter: [{ id: "names", label: "Names" }, { id: "x", label: "X", num: true }, { id: "y", label: "Y", num: true }],
  flow: [{ id: "from", label: "From" }, { id: "to", label: "To" }, { id: "amount", label: "Amount", num: true }],
};
const sheetFamily = () => (doc.meta.kind === "flow" ? "flow" : ITEM_KINDS.includes(doc.meta.kind) ? "items" : TABLE_KINDS.includes(doc.meta.kind) ? "table" : "scatter");
const sheetRoles = () => SHEET_ROLES[sheetFamily()];

// The selection is the range from anchor to focus, plus any earlier ranges kept with ⌘-click.
// `roles` maps a role's id to the ranges picked for it.
const freshSheet = () => ({ anchor: [0, 0], focus: [0, 0], extra: [], roles: {}, family: null, undo: [], redo: [], drag: null, open: null, scroll: [0, 0], groupName: "" });
let sheet = freshSheet();
let sheetHost = null; // the element the sheet is drawn into
let sheetCells = []; // its <td>s, by row and column

const colName = (c) => {
  let out = "";
  for (let n = c + 1; n > 0; n = Math.floor((n - 1) / 26)) out = String.fromCharCode(65 + ((n - 1) % 26)) + out;
  return out;
};
const colIndex = (name) => [...name.toUpperCase()].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
const normRange = (a, b) => ({ r0: Math.min(a[0], b[0]), c0: Math.min(a[1], b[1]), r1: Math.max(a[0], b[0]), c1: Math.max(a[1], b[1]) });
const rangeName = (r) => (r.r0 === r.r1 && r.c0 === r.c1 ? `${colName(r.c0)}${r.r0 + 1}` : `${colName(r.c0)}${r.r0 + 1}:${colName(r.c1)}${r.r1 + 1}`);
const inRange = (r, row, col) => row >= r.r0 && row <= r.r1 && col >= r.c0 && col <= r.c1;

/** "B2" or "b2:d9" → a range, or null. */
function parseRange(text) {
  const m = /^\s*([a-z]{1,2})(\d{1,4})(?:\s*:\s*([a-z]{1,2})(\d{1,4}))?\s*$/i.exec(text);
  if (!m) return null;
  const a = [Number(m[2]) - 1, colIndex(m[1])];
  const b = m[3] ? [Number(m[4]) - 1, colIndex(m[3])] : a;
  if (Math.min(a[0], b[0]) < 0 || Math.max(a[0], b[0]) >= SHEET_MAX_ROWS || Math.max(a[1], b[1]) >= SHEET_MAX_COLS) return null;
  return normRange(a, b);
}

const sheetGet = (r, c) => str(doc.sheet[r]?.[c]);
function sheetSet(r, c, v) {
  if (r >= SHEET_MAX_ROWS || c >= SHEET_MAX_COLS) return;
  while (doc.sheet.length <= r) doc.sheet.push([]);
  const row = doc.sheet[r];
  while (row.length <= c) row.push("");
  row[c] = v;
}

/** The sheet without the empty cells at the end of each row and the empty rows at the bottom. */
function trimSheet(cells = []) {
  const rows = cells.map((r) => {
    const row = r.map(str);
    while (row.length && blank(row.at(-1))) row.pop();
    return row;
  });
  while (rows.length && !rows.at(-1).length) rows.pop();
  return rows;
}

/** How far the sheet's contents reach: [rows, columns]. */
function sheetSize() {
  const rows = trimSheet(doc.sheet);
  return [rows.length, Math.max(0, ...rows.map((r) => r.length))];
}

const sheetRange = () => normRange(sheet.anchor, sheet.focus);
const sheetRanges = () => [...sheet.extra, sheetRange()];

/** Remembers the sheet as it is, so ⌘Z can come back to it. */
function sheetSnapshot() {
  sheet.undo.push(JSON.stringify(doc.sheet));
  if (sheet.undo.length > 60) sheet.undo.shift();
  sheet.redo = [];
}

function sheetUndo(redo = false) {
  const [from, to] = redo ? [sheet.redo, sheet.undo] : [sheet.undo, sheet.redo];
  if (!from.length) return;
  to.push(JSON.stringify(doc.sheet));
  doc.sheet = JSON.parse(from.pop());
  sheetEdited();
}

/** After the sheet's cells change: redraw it, and the Save button, but not the graph. */
function sheetEdited() {
  renderSheet();
  updateDirty();
}

function sheetEditor() {
  const kind = doc.meta.kind;
  const hasData =
    kind === "flow" ? doc.flow.rows.some((r) => !r.every(blank))
    : ITEM_KINDS.includes(kind) ? doc.groups.some((g) => g.ref || g.rows.some((r) => !r.every(blank)))
    : TABLE_KINDS.includes(kind) ? doc.table.rows.some((r) => !r.every(blank))
    : doc.scatter.points.some((p) => !blank(p.x));
  // Roles belong to one layout of data; a different kind of graph starts over.
  if (sheet.family !== sheetFamily()) {
    sheet.roles = {};
    sheet.family = sheetFamily();
  }
  sheetHost = h("div", { class: "sheet-host" });
  renderSheet();
  return h("details", { class: "paste sheet-box", open: sheet.open ?? (!hasData || sheetSize()[0] > 0), ontoggle: (e) => { sheet.open = e.target.open; } },
    h("summary", {}, "Sheet"),
    sheetHost,
  );
}

/** Draws the sheet into its host: the range box, the grid, and the buttons that use a selection. */
function renderSheet() {
  if (!sheetHost) return;
  const focused = sheetHost.contains(document.activeElement) && document.activeElement?.classList.contains("sheet-catch");
  const [usedRows, usedCols] = sheetSize();
  const rows = Math.min(SHEET_MAX_ROWS, Math.max(SHEET_MIN_ROWS, usedRows + 3, sheet.focus[0] + 2, sheet.anchor[0] + 2));
  const cols = Math.min(SHEET_MAX_COLS, Math.max(SHEET_MIN_COLS, usedCols + 2, sheet.focus[1] + 2, sheet.anchor[1] + 2));

  sheetCells = [];
  const head = h("tr", {}, h("th", { class: "corner", dataset: { all: "1" }, "aria-label": "Select all" }),
    Array.from({ length: cols }, (_, c) => h("th", { dataset: { col: c } }, colName(c))));
  const body = Array.from({ length: rows }, (_, r) => {
    const tds = Array.from({ length: cols }, (_, c) => {
      const v = sheetGet(r, c);
      return h("td", { class: isNumCell(v) ? "num" : null, dataset: { r, c } }, v);
    });
    sheetCells.push(tds);
    return h("tr", {}, h("th", { dataset: { row: r } }, r + 1), tds);
  });

  // Keys, copy and paste go to an unseen text box, so the browser treats the grid as editable.
  const catcher = h("textarea", { class: "sheet-catch", "aria-label": "Sheet", dataset: { cell: "sheet" }, autocomplete: "off", spellcheck: "false", onkeydown: sheetKey, onpaste: sheetPaste, oninput: sheetTyped, oncompositionend: sheetTyped });
  const scroll = h("div", { class: "sheet-scroll", onmousedown: sheetMouseDown, onmouseover: sheetMouseOver, ondblclick: (e) => { if (e.target.closest("td")) sheetStartEdit(); }, onscroll: (e) => { sheet.scroll = [e.target.scrollTop, e.target.scrollLeft]; } },
    h("table", { class: "sheet-grid" }, h("thead", {}, head), h("tbody", {}, body)));
  const nameBox = h("input", { class: "sheet-name", type: "text", "aria-label": "Selected range", spellcheck: "false",
    onkeydown: (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const r = parseRange(e.target.value);
      if (!r) return status("Write a range like A2 or A2:C9.", true);
      Object.assign(sheet, { anchor: [r.r0, r.c0], focus: [r.r1, r.c1], extra: [] });
      renderSheet();
      sheetFocus();
    } });

  sheetHost.replaceChildren(
    h("div", { class: "sheet-bar" },
      nameBox,
      h("span", { class: "spacer" }),
      h("button", { class: "link", disabled: !sheet.undo.length, onclick: () => sheetUndo() }, "Undo"),
      h("button", { class: "link", disabled: !usedRows, onclick: () => { sheetSnapshot(); doc.sheet = []; Object.assign(sheet, { anchor: [0, 0], focus: [0, 0], extra: [], roles: {} }); sheetEdited(); } }, "Clear"),
    ),
    catcher,
    scroll,
    h("div", { class: "sheet-tools" }),
  );
  scroll.scrollTop = sheet.scroll[0];
  scroll.scrollLeft = sheet.scroll[1];
  renderSheetTools();
  paintSheet();
  if (focused) sheetFocus();
}

const sheetFocus = () => $(".sheet-catch", sheetHost)?.focus({ preventScroll: true });

/** The role buttons and the actions under the grid. */
function renderSheetTools() {
  const box = $(".sheet-tools", sheetHost);
  if (!box) return;
  const family = sheetFamily();
  const roles = sheetRoles();
  const chips = roles.map((role, i) => {
    const picked = sheet.roles[role.id];
    return h("span", { class: picked ? "role set" : "role", dataset: { role: i } },
      h("button", { class: "role-pick", onclick: () => assignRole(i) }, role.label, picked && h("span", { class: "at" }, picked.map(rangeName).join(", "))),
      picked && h("button", { class: "role-clear", "aria-label": `Clear ${role.label}`, onclick: () => { delete sheet.roles[role.id]; renderSheetTools(); paintSheet(); } }, "×"),
    );
  });
  const named = family === "items" || family === "scatter";
  box.replaceChildren(
    h("div", { class: "roles" }, chips),
    h("div", { class: "sheet-actions" },
      h("button", { class: "btn small", onclick: () => sheetToGraph("replace") }, "Replace data"),
      h("button", { class: "btn small", onclick: () => sheetToGraph("append") }, "Add to data"),
      family === "table" && h("button", { class: "btn small", onclick: () => sheetToGraph("series") }, "Add as series"),
      named && h("button", { class: "btn small", onclick: () => sheetToGraph("group") }, "Add as group"),
      named && h("input", { type: "text", class: "group-name", value: sheet.groupName, placeholder: "Group name", "aria-label": "Group name", dataset: { cell: "sheet-group" }, oninput: (e) => { sheet.groupName = e.target.value; } }),
    ),
  );
}

/** Marks the selected cells, the active one, the cells each role holds, and the headers beside them. */
function paintSheet() {
  if (!sheetHost) return;
  const ranges = sheetRanges();
  const roles = sheetRoles().map((role) => sheet.roles[role.id] ?? []);
  sheetCells.forEach((tds, r) => tds.forEach((td, c) => {
    td.classList.toggle("sel", ranges.some((x) => inRange(x, r, c)));
    td.classList.toggle("active", r === sheet.focus[0] && c === sheet.focus[1]);
    const role = roles.findIndex((rs) => rs.some((x) => inRange(x, r, c)));
    if (role >= 0) td.dataset.role = role; else delete td.dataset.role;
  }));
  for (const th of sheetHost.querySelectorAll("th[data-col]")) th.classList.toggle("on", ranges.some((x) => Number(th.dataset.col) >= x.c0 && Number(th.dataset.col) <= x.c1));
  for (const th of sheetHost.querySelectorAll("th[data-row]")) th.classList.toggle("on", ranges.some((x) => Number(th.dataset.row) >= x.r0 && Number(th.dataset.row) <= x.r1));
  const name = $(".sheet-name", sheetHost);
  if (name && document.activeElement !== name) name.value = ranges.map(rangeName).join(", ");
}

/** Moves the selection, redrawing the grid first if the new cell is past its edge. */
function sheetSelect(anchor, focus, { extra = [] } = {}) {
  const clampCell = ([r, c]) => [Math.min(SHEET_MAX_ROWS - 1, Math.max(0, r)), Math.min(SHEET_MAX_COLS - 1, Math.max(0, c))];
  Object.assign(sheet, { anchor: clampCell(anchor), focus: clampCell(focus), extra });
  if (!sheetCells[sheet.focus[0]]?.[sheet.focus[1]] || !sheetCells[sheet.anchor[0]]?.[sheet.anchor[1]]) renderSheet();
  else paintSheet();
  sheetCells[sheet.focus[0]]?.[sheet.focus[1]]?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function sheetMouseDown(e) {
  if (e.button !== 0 || e.target.closest(".sheet-edit")) return;
  const td = e.target.closest("td"), th = e.target.closest("th");
  if (!td && !th) return;
  e.preventDefault();
  sheetCommitEdit();
  const lastRow = sheetCells.length - 1, lastCol = (sheetCells[0]?.length ?? 1) - 1;
  const more = e.metaKey || e.ctrlKey;
  const extra = more ? sheetRanges() : [];
  if (td) {
    const cell = [Number(td.dataset.r), Number(td.dataset.c)];
    sheetSelect(e.shiftKey ? sheet.anchor : cell, cell, { extra: e.shiftKey ? sheet.extra : extra });
    sheet.drag = "cell";
  } else if (th.dataset.col != null) {
    const c = Number(th.dataset.col);
    sheetSelect(e.shiftKey ? [0, sheet.anchor[1]] : [0, c], [lastRow, c], { extra: e.shiftKey ? sheet.extra : extra });
    sheet.drag = "col";
  } else if (th.dataset.row != null) {
    const r = Number(th.dataset.row);
    sheetSelect(e.shiftKey ? [sheet.anchor[0], 0] : [r, 0], [r, lastCol], { extra: e.shiftKey ? sheet.extra : extra });
    sheet.drag = "row";
  } else {
    sheetSelectAll();
  }
  sheetFocus();
}

function sheetMouseOver(e) {
  if (!sheet.drag) return;
  const td = e.target.closest("td"), th = e.target.closest("th");
  const lastRow = sheetCells.length - 1, lastCol = (sheetCells[0]?.length ?? 1) - 1;
  let focus = null;
  if (sheet.drag === "cell" && td) focus = [Number(td.dataset.r), Number(td.dataset.c)];
  if (sheet.drag === "col") {
    const c = td?.dataset.c ?? th?.dataset.col;
    if (c != null) focus = [lastRow, Number(c)];
  }
  if (sheet.drag === "row") {
    const r = td?.dataset.r ?? th?.dataset.row;
    if (r != null) focus = [Number(r), lastCol];
  }
  if (!focus || (focus[0] === sheet.focus[0] && focus[1] === sheet.focus[1])) return;
  sheet.focus = focus;
  paintSheet();
}
window.addEventListener("mouseup", () => { sheet.drag = null; });

function sheetSelectAll() {
  const [rows, cols] = sheetSize();
  sheetSelect([0, 0], [Math.max(0, rows - 1), Math.max(0, cols - 1)]);
}

/** The selection as tab-separated text, the way spreadsheets copy. */
function sheetCopyText() {
  const r = sheetRange();
  const lines = [];
  for (let row = r.r0; row <= r.r1; row++) {
    const cells = [];
    for (let col = r.c0; col <= r.c1; col++) cells.push(sheetGet(row, col).replace(/[\t\n]/g, " "));
    lines.push(cells.join("\t"));
  }
  return lines.join("\n");
}

function sheetClearSelection() {
  sheetSnapshot();
  for (const r of sheetRanges()) {
    for (let row = r.r0; row <= Math.min(r.r1, doc.sheet.length - 1); row++) {
      for (let col = r.c0; col <= r.c1; col++) if (!blank(sheetGet(row, col))) sheetSet(row, col, "");
    }
  }
  sheetEdited();
}

function sheetKey(e) {
  const mod = e.metaKey || e.ctrlKey;
  const key = e.key;
  const step = (dr, dc) => {
    e.preventDefault();
    const to = [sheet.focus[0] + dr, sheet.focus[1] + dc];
    sheetSelect(e.shiftKey && key.startsWith("Arrow") ? sheet.anchor : to, to);
  };
  if (mod && key.toLowerCase() === "a") { e.preventDefault(); return sheetSelectAll(); }
  if (mod && key.toLowerCase() === "z") { e.preventDefault(); return sheetUndo(e.shiftKey); }
  if (mod && key.toLowerCase() === "y") { e.preventDefault(); return sheetUndo(true); }
  if (mod && (key.toLowerCase() === "c" || key.toLowerCase() === "x")) {
    // Put the selection in the unseen box and select it; the browser's own copy takes it from there.
    const box = e.target;
    box.value = sheetCopyText();
    box.select();
    setTimeout(() => {
      box.value = "";
      if (key.toLowerCase() === "x") sheetClearSelection();
    }, 60);
    return;
  }
  if (mod || e.altKey) return;
  if (key === "ArrowUp") return step(-1, 0);
  if (key === "ArrowDown") return step(1, 0);
  if (key === "ArrowLeft") return step(0, -1);
  if (key === "ArrowRight") return step(0, 1);
  if (key === "Tab") return step(0, e.shiftKey ? -1 : 1);
  if (key === "Enter" || key === "F2") { e.preventDefault(); return sheetStartEdit(); }
  if (key === "Backspace" || key === "Delete") { e.preventDefault(); return sheetClearSelection(); }
  if (key === "Escape") { e.preventDefault(); return sheetSelect(sheet.focus, sheet.focus); }
  // Any other character lands in the unseen box, and sheetTyped opens the cell with it.
}

/** Typing with a cell selected starts writing over it, as in any spreadsheet. */
function sheetTyped(e) {
  if (e.isComposing) return; // an accented or composed character isn't finished yet
  const typed = e.target.value;
  e.target.value = "";
  if (typed) sheetStartEdit(typed);
}

/** Pasted cells fill right and down from the top-left of the selection, growing the sheet. */
function sheetPaste(e) {
  e.preventDefault();
  const rows = parseClipboard(e.clipboardData?.getData("text/plain") ?? "");
  if (!rows.some((r) => r.length)) return;
  sheetSnapshot();
  const { r0, c0 } = sheetRange();
  const width = Math.max(...rows.map((r) => r.length));
  rows.forEach((cells, i) => cells.forEach((v, j) => sheetSet(r0 + i, c0 + j, v)));
  Object.assign(sheet, {
    anchor: [r0, c0],
    focus: [Math.min(SHEET_MAX_ROWS - 1, r0 + rows.length - 1), Math.min(SHEET_MAX_COLS - 1, c0 + Math.max(1, width) - 1)],
    extra: [],
  });
  if (r0 + rows.length > SHEET_MAX_ROWS || c0 + width > SHEET_MAX_COLS) status(`The sheet holds ${SHEET_MAX_ROWS} rows and ${SHEET_MAX_COLS} columns; what was past that was left off.`, true);
  sheetEdited();
  sheetFocus();
}

/** Opens the active cell for typing. `initial` replaces what's there; left out, it's kept. */
function sheetStartEdit(initial) {
  const [r, c] = sheet.focus;
  const td = sheetCells[r]?.[c];
  if (!td || td.querySelector(".sheet-edit")) return;
  let done = false;
  const finish = (save, move) => {
    if (done) return;
    done = true;
    const next = input.value;
    if (save && next !== sheetGet(r, c)) {
      sheetSnapshot();
      sheetSet(r, c, next);
    }
    if (move) Object.assign(sheet, { anchor: [Math.max(0, r + move[0]), Math.max(0, c + move[1])], focus: [Math.max(0, r + move[0]), Math.max(0, c + move[1])], extra: [] });
    sheetEdited();
    if (move || !save) sheetFocus();
  };
  const input = h("input", { class: "sheet-edit", type: "text", value: initial ?? sheetGet(r, c), "aria-label": `${colName(c)}${r + 1}`, spellcheck: "false",
    onkeydown: (e) => {
      if (e.key === "Enter") { e.preventDefault(); finish(true, [e.shiftKey ? -1 : 1, 0]); }
      else if (e.key === "Tab") { e.preventDefault(); finish(true, [0, e.shiftKey ? -1 : 1]); }
      else if (e.key === "Escape") { e.preventDefault(); finish(false, [0, 0]); }
    },
    onblur: () => finish(true, null),
  });
  td.append(input);
  input.focus();
  if (initial === undefined) input.select();
  else input.setSelectionRange(input.value.length, input.value.length);
}

/** Finishes typing in a cell, if one is open, by taking the focus off it. */
function sheetCommitEdit() {
  $(".sheet-edit", sheetHost)?.blur();
}

/**
 * Gives the selection to a role. One column goes to that role. A block several columns wide
 * is dealt out left to right from that role on, and so are several ranges picked with ⌘-click,
 * in the order they were picked. A single cell stands for its column from there down.
 */
function assignRole(index) {
  const roles = sheetRoles();
  let ranges = sheetRanges();
  if (ranges.length === 1 && ranges[0].r0 === ranges[0].r1 && ranges[0].c0 === ranges[0].c1) {
    const { r0, c0 } = ranges[0];
    let r1 = r0;
    while (r1 + 1 < doc.sheet.length && !blank(sheetGet(r1 + 1, c0))) r1++;
    if (blank(sheetGet(r0, c0))) return status("Select the cells to use first.", true);
    ranges = [{ r0, c0, r1, c1: c0 }];
  }
  // Split a wide block into its columns, unless the role it starts at takes several.
  let parts = ranges;
  if (ranges.length === 1 && ranges[0].c1 > ranges[0].c0 && !roles[index].multi) {
    const b = ranges[0];
    parts = Array.from({ length: b.c1 - b.c0 + 1 }, (_, i) => ({ ...b, c0: b.c0 + i, c1: b.c0 + i }));
  }
  let at = index;
  for (let i = 0; i < parts.length && at < roles.length; i++) {
    const role = roles[at];
    if (role.multi) {
      // Everything left belongs to it; neighbouring columns join back into one range.
      const rest = parts.slice(i);
      const joined = [];
      for (const p of rest) {
        const last = joined.at(-1);
        if (last && last.r0 === p.r0 && last.r1 === p.r1 && last.c1 + 1 === p.c0) last.c1 = p.c1;
        else joined.push({ ...p });
      }
      sheet.roles[role.id] = joined;
      break;
    }
    sheet.roles[role.id] = [{ ...parts[i], c1: parts[i].c0 }];
    at++;
  }
  renderSheetTools();
  paintSheet();
}

/** The cells of every column a role holds, top to bottom. */
function roleColumns(id) {
  return (sheet.roles[id] ?? []).flatMap((r) =>
    Array.from({ length: r.c1 - r.c0 + 1 }, (_, i) => Array.from({ length: r.r1 - r.r0 + 1 }, (_, j) => sheetGet(r.r0 + j, r.c0 + i).trim())));
}

/**
 * The data the roles pick out, as parseRows would return it. Null if no role is set (the
 * selection is read as a whole instead); false, with a message, if some are missing.
 */
function dataFromRoles() {
  const roles = sheetRoles();
  if (!roles.some((role) => sheet.roles[role.id])) return null;
  const family = sheetFamily();
  const needed = roles.filter((role) => role.num || family === "flow" || (family === "items" && role.id === "labels"));
  const missing = needed.filter((role) => !sheet.roles[role.id]);
  if (missing.length) {
    status(`Pick ${missing.map((role) => role.label).join(" and ")} too.`, true);
    return false;
  }
  // A word on top of a column of numbers is its heading.
  const cols = {}, heads = {};
  for (const role of roles.filter((x) => x.num)) {
    cols[role.id] = roleColumns(role.id).map((col) => {
      const headed = !blank(col[0]) && !isNumCell(col[0]) && col.slice(1).some(isNumCell);
      (heads[role.id] ??= []).push(headed ? col[0] : "");
      return headed ? col.slice(1) : col;
    });
  }
  const length = Math.max(0, ...Object.values(cols).flat().map((col) => col.length));
  // A text column one cell longer than the numbers has a heading of its own on top.
  for (const role of roles.filter((x) => !x.num)) {
    const col = roleColumns(role.id)[0] ?? [];
    heads[role.id] = [col.length === length + 1 ? col[0] : ""];
    cols[role.id] = [col.length === length + 1 ? col.slice(1) : col];
  }
  const at = (id, i, n = 0) => cols[id]?.[n]?.[i] ?? "";
  const index = Array.from({ length }, (_, i) => i);

  if (family === "flow") {
    return { flows: index.map((i) => [at("from", i), at("to", i), at("amount", i), ""]).filter((r) => !r.slice(0, 3).every(blank)) };
  }
  if (family === "items") {
    const rows = index.map((i) => [at("labels", i), at("values", i)]).filter((r) => !r.every(blank));
    return { groups: [{ name: heads.values[0] ?? "", rows }] };
  }
  if (family === "table") {
    const series = cols.series;
    const columns = [heads.categories?.[0] || "Category", ...series.map((_, n) => tidyHeader(heads.series[n]) || `Series ${n + 1}`)];
    const rows = index.map((i) => [sheet.roles.categories ? at("categories", i) : String(i + 1), ...series.map((_, n) => at("series", i, n))])
      .filter((r) => !r.slice(1).every(blank) || (sheet.roles.categories && !blank(r[0])));
    return { table: { columns, rows } };
  }
  const points = index.map((i) => ({ ...emptyPoint(), name: at("names", i), x: at("x", i), y: at("y", i) })).filter((p) => !(blank(p.name) && blank(p.x) && blank(p.y)));
  return { header: ["", heads.x[0] ?? "", heads.y[0] ?? ""], points, heading: heads.y[0] ?? "" };
}

/**
 * The selected cells as rows, for reading as a whole. Several ranges sit side by side, each
 * one's first row beside the next one's. With just one cell selected, it's the whole sheet.
 */
function selectionRows() {
  let blocks = sheetRanges();
  if (blocks.length === 1 && blocks[0].r0 === blocks[0].r1 && blocks[0].c0 === blocks[0].c1) {
    const [rows, cols] = sheetSize();
    if (!rows) return [];
    blocks = [{ r0: 0, c0: 0, r1: rows - 1, c1: cols - 1 }];
  }
  const height = Math.max(...blocks.map((b) => b.r1 - b.r0 + 1));
  return Array.from({ length: height }, (_, i) => {
    const row = blocks.flatMap((b) => Array.from({ length: b.c1 - b.c0 + 1 }, (_, j) => (i <= b.r1 - b.r0 ? sheetGet(b.r0 + i, b.c0 + j).trim() : "")));
    while (row.length && blank(row.at(-1))) row.pop();
    return row;
  });
}

/** Puts the sheet's data into the graph: what the roles pick out, or else the selection read as a whole. */
function sheetToGraph(mode) {
  sheetCommitEdit();
  let data = dataFromRoles();
  if (data === false) return;
  if (!data) {
    const rows = selectionRows();
    if (!rows.some((r) => r.length)) return status("The sheet is empty. Paste or type some data into it first.", true);
    data = parseRows(rows, doc.meta.kind);
    if (!data) return;
  }
  // Left unnamed, a new group takes the heading over its numbers.
  const name = sheet.groupName.trim() || (mode === "group" ? str(data.heading ?? data.groups?.[0]?.name) : "");
  sheet.groupName = "";
  applyData(data, mode, name);
}

// ── Status, list ──────────────────────────────────────────

let statusTimer;
function status(text, bad = false, sticky = false) {
  const el = $("#status");
  el.textContent = text;
  el.classList.toggle("bad", bad);
  clearTimeout(statusTimer);
  if (!sticky) statusTimer = setTimeout(() => (el.textContent = ""), bad ? 8000 : 3500);
}

async function loadList() {
  graphs = await api("GET", "/api/graph/graphs");
  renderList();
}

function renderList() {
  const q = $("#filter").value.trim().toLowerCase();
  const ul = $("#graph-list");
  ul.replaceChildren();
  const shown = graphs.filter((g) => !q || `${g.title} ${g.name}`.toLowerCase().includes(q));
  if (!shown.length) ul.append(h("li", { class: "empty" }, graphs.length ? "No graphs match." : "No graphs yet."));
  for (const g of shown) {
    ul.append(
      h("li", {},
        h("button", { "aria-current": doc?.loadedName === g.name ? "true" : "false", onclick: () => openGraph(g.name) },
          h("span", { class: "t" }, g.title || g.name),
          h("span", { class: "n" }, `${KIND_LABEL[g.kind] ?? g.kind} · ${g.name}`)
        )
      )
    );
  }
}

// ── Open, new, save, export, delete ───────────────────────

const confirmDiscard = () => !isDirty() || confirm(`Discard unsaved changes to “${doc.meta.title || doc.name || "this graph"}”?`);

async function openGraph(name, { force = false } = {}) {
  if (!force && !confirmDiscard()) return;
  try {
    const g = await api("GET", `/api/graph/graphs/${encodeURIComponent(name)}`);
    doc = fromFile(g, name);
    sheet = freshSheet();
    canvas = freshCanvas();
    await loadRefs();
    saved = JSON.stringify(toFile(doc).graph);
    history.replaceState(null, "", `#${name}`);
    renderAll();
  } catch (err) {
    status(err.message, true);
  }
}

/** Loads the graphs a combined graph includes, to show their rows. */
async function loadRefs() {
  for (const g of doc.groups) {
    if (!g.ref) continue;
    try {
      const sub = await api("GET", `/api/graph/graphs/${encodeURIComponent(g.ref)}`);
      g.refRows = itemRows(sub.items);
      g.refColor = sub.color ?? "red";
      g.refTitle = sub.title;
    } catch {
      g.refRows = [];
      g.refMissing = true;
    }
  }
}

function newGraph() {
  if (!confirmDiscard()) return;
  doc = blankDoc(doc?.meta.kind && doc.meta.kind !== "custom" ? doc.meta.kind : "ring");
  sheet = freshSheet();
  canvas = freshCanvas();
  saved = "";
  history.replaceState(null, "", "#");
  renderAll();
  $("#editor input.title")?.focus();
}

async function save({ quiet = false } = {}) {
  if (!doc) return false;
  const name = doc.name || slugify(doc.meta.title);
  if (!name) {
    status("Give the graph a title or a file name first.", true);
    $("#editor input.title")?.focus();
    return false;
  }
  const exists = graphs.some((g) => g.name === name);
  if (exists && name !== doc.loadedName && !confirm(`A graph called “${name}” already exists. Replace it?`)) return false;
  const { graph } = toFile(doc);
  try {
    await api("PUT", `/api/graph/graphs/${name}`, { graph });
    const copied = doc.loadedName && doc.loadedName !== name;
    doc.name = name;
    doc.loadedName = name;
    doc.raw = structuredClone(graph);
    saved = JSON.stringify(toFile(doc).graph);
    history.replaceState(null, "", `#${name}`);
    await loadList();
    renderFileName();
    if (!quiet) status(copied ? `Saved as a copy, “${name}”` : `Saved “${name}”`);
    updateDirty();
    return true;
  } catch (err) {
    status(err.message, true);
    return false;
  }
}

// ── Export ────────────────────────────────────────────────
//
// The same steps the command line runs, in this browser instead of headless Chrome:
// render the page tight, measure it, fit a framed plot, then print it for the PDF or
// draw it with a white margin at PNG_SCALE× for the PNG.

const PNG_SCALE = 6; // a 3.5in graphic comes out about 2,250px wide
const PX_PER_IN = 96;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frames2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const exportName = () => `Poly-Graph-${doc.name || slugify(doc.meta.title) || "graph"}`;

async function renderPage(graph, plotH, pad) {
  const r = await api("POST", "/api/graph/preview", { graph, plotH, pad });
  if (r.error) throw new Error(r.error);
  return r;
}

/** Loads a graph page into an offscreen frame and resolves once it has measured itself. */
function loadOffscreen(html, widthPx) {
  return new Promise((resolve, reject) => {
    const f = h("iframe", { "aria-hidden": "true", tabindex: "-1", title: "Export" });
    f.style.cssText = `position:fixed;left:-20000px;top:0;width:${Math.ceil(widthPx)}px;height:2000px;border:0;`;
    f.onload = async () => {
      try {
        const d = f.contentDocument;
        await d.fonts.ready;
        // The page writes its height onto <html> once its fonts are in.
        for (let i = 0; i < 150 && !d.documentElement.hasAttribute("data-height"); i++) await sleep(20);
        await frames2();
        resolve({ frame: f, height: Number(d.documentElement.getAttribute("data-height")) || d.body.scrollHeight });
      } catch (err) {
        f.remove();
        reject(err);
      }
    };
    document.body.append(f);
    f.srcdoc = html;
  });
}

/** The tight render (no margin), with a framed plot resized to its target shape. */
async function fittedPage() {
  const graph = toFile(doc).graph;
  let r = await renderPage(graph, null, 0);
  let widthPx = r.widthIn * PX_PER_IN;
  let page = await loadOffscreen(r.html, widthPx);
  let plotH = null;
  if (r.frame) {
    const target = Math.round((widthPx + r.frame.pad * 2) * r.frame.ratio - r.frame.pad * 2);
    plotH = r.frame.plotH + (target - page.height);
    page.frame.remove();
    if (plotH < 60) throw new Error(`Too little room for the plot at ${r.widthIn}in wide. Widen the graph.`);
    r = await renderPage(graph, plotH, 0);
    widthPx = r.widthIn * PX_PER_IN;
    page = await loadOffscreen(r.html, widthPx);
  }
  return { graph, plotH, widthIn: r.widthIn, ...page };
}

async function exporting(btn, label, fn) {
  if (!doc) return;
  btn.disabled = true;
  const was = btn.textContent;
  btn.textContent = label;
  try {
    await fn();
  } catch (err) {
    status(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = was;
  }
}

/** Print: the page is exactly the graphic, so the saved PDF drops into a layout at 100%. */
const exportPdf = () =>
  exporting($("#export-pdf"), "Preparing…", async () => {
    const { frame, height, widthIn } = await fittedPage();
    const d = frame.contentDocument;
    const page = d.createElement("style");
    page.textContent = `@page { size: ${widthIn}in ${(height / PX_PER_IN).toFixed(3)}in; margin: 0; }`;
    d.head.append(page);
    d.title = exportName(); // the print dialog names the PDF after the page title
    const done = () => frame.remove();
    frame.contentWindow.addEventListener("afterprint", () => setTimeout(done, 500), { once: true });
    setTimeout(done, 10 * 60 * 1000);
    status("In the print dialog, choose “Save as PDF”.", false);
    frame.contentWindow.focus();
    frame.contentWindow.print();
  });

const fontData = new Map();
const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(new Error("Couldn't read a font for the PNG."));
    fr.readAsDataURL(blob);
  });

/** An image of a page can't fetch anything, so its fonts go in as data. */
async function inlineFonts(html) {
  const urls = [...new Set([...html.matchAll(/url\("(\/fonts\/[^"]+)"\)/g)].map((m) => m[1]))];
  for (const u of urls) {
    if (!fontData.has(u)) {
      fontData.set(u, fetch(u).then((res) => {
        if (!res.ok) throw new Error(`Couldn't load ${u} for the PNG.`);
        return res.blob();
      }).then(blobToDataUrl));
    }
    try {
      html = html.split(`url("${u}")`).join(`url("${await fontData.get(u)}")`);
    } catch (err) {
      fontData.delete(u);
      throw err;
    }
  }
  return html;
}

function download(blob, filename) {
  const a = h("a", { href: URL.createObjectURL(blob), download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}

/** Web: the graphic with a white margin, drawn at PNG_SCALE× for sharpness. */
const exportPng = () =>
  exporting($("#export-png"), "Rendering…", async () => {
    const tight = await fittedPage();
    tight.frame.remove();
    const r = await renderPage(tight.graph, tight.plotH, undefined);
    const w = r.widthIn * PX_PER_IN + r.pad * 2;
    const page = await loadOffscreen(await inlineFonts(r.html), w);
    const hgt = page.height;

    // The page as it stands after its own scripts ran (label boxes sized), as XHTML in an SVG.
    const root = page.frame.contentDocument.documentElement.cloneNode(true);
    page.frame.remove();
    root.querySelectorAll("script").forEach((s) => s.remove());
    // Inside the SVG, :root is the <svg>; give the page's variables to its <html> too.
    root.querySelectorAll("style").forEach((s) => (s.textContent = s.textContent.replace(/:root\s*\{/g, ":root, html {")));
    const xhtml = new XMLSerializer().serializeToString(root);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hgt}" viewBox="0 0 ${w} ${hgt}"><foreignObject x="0" y="0" width="${w}" height="${hgt}">${xhtml}</foreignObject></svg>`;

    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await img.decode();
    const canvas = h("canvas", { width: Math.round(w * PNG_SCALE), height: Math.round(hgt * PNG_SCALE) });
    const ctx = canvas.getContext("2d");
    // One throwaway draw lets the image settle its fonts before the real one.
    ctx.drawImage(img, 0, 0, 1, 1);
    await sleep(250);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let blob;
    try {
      blob = await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("The PNG came out empty."))), "image/png"));
    } catch (err) {
      if (err.name === "SecurityError") throw new Error("This browser won't save the PNG. Try Chrome.");
      throw err;
    }
    download(blob, `${exportName()}.png`);
    status(`Downloaded ${exportName()}.png, ${canvas.width} × ${canvas.height} px`);
  });

async function deleteGraph() {
  if (!doc.loadedName) return;
  if (!confirm(`Delete “${doc.loadedName}” for everyone? This can't be undone.`)) return;
  try {
    await api("DELETE", `/api/graph/graphs/${doc.loadedName}`);
    status(`Deleted “${doc.loadedName}”`);
    saved = JSON.stringify(toFile(doc).graph);
    await loadList();
    doc = null;
    if (graphs.length) await openGraph(graphs[0].name, { force: true });
    else newGraph();
  } catch (err) {
    status(err.message, true);
  }
}

// ── Changes ───────────────────────────────────────────────

function changed() {
  // A pending copy shows the graph as it was; once the graph changes it's out of date.
  if (canvas.pending && doc?.meta.kind !== "custom") {
    canvas.pending = null;
    canvas.sel.clear();
  }
  // Anything but a custom graph shows its real previews again (and the bar's buttons follow).
  if (doc?.meta.kind !== "custom") renderCanvases();
  updateDirty();
  updateComputed();
  updateWarnings();
  updateFlowTools();
  schedulePreview();
}

function updateDirty() {
  const dirty = isDirty();
  $("#save").textContent = dirty ? "Save •" : "Save";
  $("#save").disabled = !dirty && !!doc?.loadedName;
  document.title = `${dirty ? "• " : ""}${doc?.meta.title || "New graph"} — Poly Graphs`;
}

/** Re-renders the editor, keeping focus and the caret in the same cell. */
function rerender() {
  const active = document.activeElement;
  const key = active?.dataset?.cell;
  const sel = key && "selectionStart" in active ? [active.selectionStart, active.selectionEnd] : null;
  renderEditor();
  if (key) {
    const el = $(`[data-cell="${CSS.escape(key)}"]`);
    if (el) {
      el.focus();
      if (sel && "setSelectionRange" in el) try { el.setSelectionRange(...sel); } catch {}
    }
  }
}

function renderAll() {
  renderList();
  renderEditor();
  changed();
}

// ── Editor ────────────────────────────────────────────────

/** A text field bound to obj[key]. */
function field(obj, key, label, { hint, placeholder, area, cls, cell, onchange, type = "text", list } = {}) {
  const props = {
    class: cls, placeholder, value: obj[key] ?? "", dataset: { cell: cell ?? `f:${key}:${label}` }, list,
    oninput: (e) => { obj[key] = e.target.value; onchange?.(); changed(); },
  };
  const input = area ? h("textarea", { rows: 2, ...props }) : h("input", { type, ...props });
  return h("label", { class: "field" }, h("span", {}, label), input, hint && h("span", { class: "hint" }, hint));
}

function select(obj, key, options, { onchange, cls, title } = {}) {
  return h("select", {
    class: cls, title, value: obj[key],
    onchange: (e) => { obj[key] = e.target.value; onchange?.(); changed(); },
  }, options.map(([v, label]) => h("option", { value: v }, label)));
}

function checkbox(obj, key, label, { onchange } = {}) {
  return h("label", { class: "check" },
    h("input", { type: "checkbox", checked: !!obj[key], onchange: (e) => { obj[key] = e.target.checked; onchange?.(); changed(); } }),
    label
  );
}

const section = (title, ...kids) => h("section", { class: "section" }, h("h2", {}, title), ...kids);

function renderEditor() {
  const ed = $("#editor");
  if (!doc) return ed.replaceChildren();
  const m = doc.meta;

  const kinds = h("div", { class: "kinds", role: "group", "aria-label": "Graph type" },
    KINDS.map((k) => h("button", { "aria-pressed": m.kind === k.id ? "true" : "false", title: k.label, onclick: () => switchKind(k.id) },
      h("span", { "aria-hidden": "true", icon: `<svg viewBox="0 0 24 24">${k.icon}</svg>` }),
      k.label
    ))
  );

  if (m.kind === "custom") {
    const was = doc.custom?.from;
    ed.replaceChildren(
      section("Type", kinds),
      section("Headline", field(m, "title", "Title", { cls: "title", placeholder: "What the graph shows", onchange: renderFileName })),
      section("Layout",
        h("div", { class: "grid-actions" },
          was && h("button", { class: "btn small", onclick: () => switchKind(was.kind ?? "ring") }, `Back to ${KIND_LABEL[was.kind ?? "ring"]}`),
        ),
      ),
      section("Options", h("div", { class: "row2" }, field(m, "width", "Width (inches)", { type: "number" }), h("div"))),
      section("File", fileEditor()),
    );
    return;
  }

  ed.replaceChildren(
    section("Type", kinds),
    section("Headline",
      field(m, "kicker", "Kicker", { placeholder: "Campus security" }),
      field(m, "title", "Title", { cls: "title", placeholder: "What the graph shows", onchange: renderFileName }),
      field(m, "dek", "Subtitle", { area: true, hint: "Optional. A sentence under the title." }),
    ),
    section("Data", dataEditor()),
    section("Options", optionsEditor()),
    section("Credits",
      h("div", { class: "row2" }, field(m, "source", "Source", { placeholder: "e.g. RPI Annual Security Report" }), field(m, "credit", "Credit", { placeholder: "e.g. Graphic by …" })),
    ),
    section("File", fileEditor()),
  );
  updateWarnings();
}

function switchKind(kind) {
  const from = doc.meta.kind;
  if (from === kind) return;
  if (kind === "custom") return makeCustom();
  if (from === "custom") {
    // Leaving Custom means going back to the graph it was made from.
    const was = doc.custom?.from;
    if (!was) return status("This custom graph doesn't have the graph it was made from, so it can't change type.", true);
    if (!confirm(`Go back to the ${KIND_LABEL[was.kind ?? "ring"]} graph this was made from? The custom layout is dropped.`)) return;
    canvas.undo.push(canvasState());
    canvas.redo = [];
    revertCustom();
    if (doc.meta.kind !== kind) switchKind(kind);
    return;
  }
  const itemsBlank = doc.groups.every((g) => !g.ref && g.rows.every((r) => r.every(blank)));
  const tableBlank = doc.table.rows.every((r) => r.every(blank));
  const pointsBlank = doc.scatter.points.every((p) => blank(p.label) && blank(p.x) && blank(p.y));

  // Carry the data across when the new type's own data is still empty.
  if (ITEM_KINDS.includes(kind) && itemsBlank) {
    if (TABLE_KINDS.includes(from) && !tableBlank) doc.groups = [{ name: "", color: doc.table.colors[0] ?? "red", ref: null, rows: doc.table.rows.map((r) => [r[0], r[1] ?? ""]) }];
    if (from === "scatter" && !pointsBlank) doc.groups = [{ name: "", color: "red", ref: null, rows: doc.scatter.points.map((p) => [p.label, p.x]) }];
  }
  if (TABLE_KINDS.includes(kind) && tableBlank) {
    if (ITEM_KINDS.includes(from) && !itemsBlank) {
      const rows = doc.groups.flatMap((g) => (g.ref ? g.refRows ?? [] : g.rows)).filter((r) => !r.every(blank));
      doc.table = { columns: ["Category", doc.groups[0].name || "Value"], colors: [doc.groups[0].color ?? "red"], rows };
    }
    if (from === "scatter" && !pointsBlank) {
      doc.table = { columns: ["Category", doc.scatter.x.short || "X", doc.scatter.y.short || "Y"], colors: ["red", "purple"], rows: doc.scatter.points.map((p) => [p.label, p.x, p.y]) };
    }
  }
  if (kind === "scatter" && pointsBlank) {
    if (TABLE_KINDS.includes(from) && !tableBlank) doc.scatter.points = doc.table.rows.map((r) => ({ ...emptyPoint(), label: r[0], x: r[1] ?? "", y: r[2] ?? "" }));
    if (ITEM_KINDS.includes(from) && !itemsBlank) doc.scatter.points = doc.groups.flatMap((g) => g.rows).map(([label, x]) => ({ ...emptyPoint(), label, x }));
  }
  // Rows of a ring or bar become one split: the title (or "Total") into each row. Groups
  // become a level of their own in between.
  const flowBlank = doc.flow.rows.every((r) => r.every(blank));
  if (kind === "flow" && flowBlank && ITEM_KINDS.includes(from) && !itemsBlank) {
    const root = doc.meta.title.trim() || "Total";
    const groups = doc.groups.filter((g) => !g.ref);
    const named = groups.length > 1;
    const rows = groups.map((g, i) => ({ name: g.name.trim() || `Group ${i + 1}`, rows: g.rows.filter((r) => !r.every(blank)) }));
    doc.flow.rows = [
      ...(named ? rows.map((g) => [root, g.name, String(g.rows.reduce((a, r) => a + (parseNum(r[1]) ?? 0), 0)), ""]) : []),
      ...rows.flatMap((g) => g.rows.map((r) => [named ? g.name : root, r[0], r[1], ""])),
    ];
  }
  doc.meta.kind = kind;
  // Columns can't use gray; give those series real colors (the preview says if there are too many).
  if (TABLE_KINDS.includes(kind)) fixSeriesColors();
  rerender();
  changed();
}

// ── Data editors ──────────────────────────────────────────

function dataEditor() {
  const kind = doc.meta.kind;
  const body = kind === "flow" ? flowEditor() : ITEM_KINDS.includes(kind) ? itemsEditor() : TABLE_KINDS.includes(kind) ? tableEditor() : pointsEditor();
  return [sheetEditor(), body, h("div", { id: "warnings" })];
}

/** Moves item i of arr by d places. */
const move = (arr, i, d) => {
  const j = i + d;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
};

const rowOps = (arr, i, makeRow) =>
  h("td", { class: "ops" },
    h("button", { title: "Move up", "aria-label": "Move row up", onclick: () => { move(arr, i, -1); rerender(); changed(); } }, "↑"),
    h("button", { title: "Move down", "aria-label": "Move row down", onclick: () => { move(arr, i, 1); rerender(); changed(); } }, "↓"),
    h("button", { class: "del", title: "Delete row", "aria-label": "Delete row", onclick: () => { arr.splice(i, 1); if (!arr.length) arr.push(makeRow()); rerender(); changed(); } }, "×"),
  );

/** Enter moves down a column, adding a row at the bottom; Shift+Enter moves up. */
function gridKeys(e, prefix, ri, ci, grid, makeRow, sync) {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const next = ri + (e.shiftKey ? -1 : 1);
  if (next < 0) return;
  if (next >= grid.length) { grid.push(makeRow()); sync?.(); rerender(); changed(); }
  $(`[data-cell="${CSS.escape(`${prefix}:${next}:${ci}`)}"]`)?.focus();
}

function cellInput(grid, ri, ci, prefix, { num = false, width, makeRow, onWide, placeholder, sync, list } = {}) {
  const v = grid[ri][ci] ?? "";
  return h("input", {
    type: "text", value: v, placeholder, inputmode: num ? "decimal" : null, list,
    class: num && !blank(v) && parseNum(v) === null && !isDate(v) ? "bad" : null,
    dataset: { cell: `${prefix}:${ri}:${ci}` },
    "aria-label": placeholder,
    oninput: (e) => {
      grid[ri][ci] = e.target.value;
      sync?.();
      if (num) e.target.classList.toggle("bad", !blank(e.target.value) && parseNum(e.target.value) === null && !isDate(e.target.value));
      changed();
    },
    onkeydown: (e) => gridKeys(e, prefix, ri, ci, grid, makeRow, sync),
    onpaste: (e) => pasteIntoGrid(e, grid, ri, ci, width, makeRow, onWide, sync),
  });
}

function itemsEditor() {
  const kind = doc.meta.kind;
  const many = doc.groups.length > 1 || doc.groups.some((g) => g.ref);
  const total = doc.groups.reduce((a, g) => a + (g.ref ? g.refRows ?? [] : g.rows).reduce((s, r) => s + Math.max(0, parseNum(r[1]) ?? 0), 0), 0);
  const makeRow = () => ["", ""];

  const blocks = doc.groups.map((g, gi) => {
    const usedByOther = doc.groups.filter((o, oi) => oi !== gi).map((o) => o.color ?? o.refColor);
    const head = many
      ? h("div", { class: "group-head" },
          h("input", { type: "text", value: g.name, placeholder: `Group ${gi + 1} name`, "aria-label": "Group name", dataset: { cell: `gname:${gi}` },
            oninput: (e) => { g.name = e.target.value; changed(); } }),
          g.ref
            ? h("span", { class: "swatch", style: `background:${HEX[g.refColor] ?? "#999"}`, title: g.refColor })
            : select(g, "color", GROUP_COLORS.map((c) => [c, c[0].toUpperCase() + c.slice(1)]), {
                onchange: () => {
                  // Two groups can't share a color: swap with whoever had it.
                  const other = doc.groups.find((o, oi) => oi !== gi && !o.ref && o.color === g.color);
                  if (other) other.color = unusedGroupColor() ?? other.color;
                  rerender();
                },
                title: usedByOther.includes(g.color) ? "Shared with another group" : "Group color",
              }),
          h("button", { class: "btn small", title: "Remove group", onclick: () => removeGroup(gi) }, "Remove")
        )
      : null;

    if (g.ref) {
      const rows = g.refRows ?? [];
      return h("div", { class: "group" }, head,
        h("div", { class: "linked" },
          g.refMissing ? `The graph “${g.ref}” wasn't found.` : `These rows come from the graph “${g.refTitle || g.ref}”. Edit them there, or `,
          !g.refMissing && h("button", { class: "link", onclick: () => unlinkGroup(gi) }, "copy them here"),
          !g.refMissing && ". ",
          !g.refMissing && h("button", { class: "link", onclick: () => openGraph(g.ref) }, `Open ${g.ref}`),
        ),
        h("table", { class: "grid" },
          h("thead", {}, h("tr", {}, h("th", {}, "Label"), h("th", { class: "num" }, "Value"), h("th", { class: "num" }, "Share"))),
          h("tbody", {}, rows.map((r) => h("tr", {}, h("td", {}, h("input", { type: "text", value: r[0], disabled: true })), h("td", { class: "num" }, h("input", { type: "text", value: r[1], disabled: true })), h("td", { class: "pct" }, fmtPct(parseNum(r[1]), total)))))
        )
      );
    }

    const tooMany = SLICED.includes(kind) && g.rows.filter((r) => !r.every(blank)).length > MAX_SLICES;
    return h("div", { class: many ? "group" : null }, head,
      h("table", { class: "grid" },
        h("thead", {}, h("tr", {},
          h("th", {}, "Label"),
          h("th", { class: "num" }, "Value"),
          h("th", { class: "num" }, SLICED.includes(kind) ? "Share" : ""),
          h("th", {}))),
        h("tbody", {}, g.rows.map((r, ri) =>
          h("tr", {},
            h("td", {}, cellInput(g.rows, ri, 0, `g${gi}`, { width: 2, makeRow, placeholder: "Label" })),
            h("td", { class: "num", style: "width:110px" }, cellInput(g.rows, ri, 1, `g${gi}`, { num: true, width: 2, makeRow, placeholder: "Value" })),
            h("td", { class: "pct", dataset: { pct: `${gi}:${ri}` } }, SLICED.includes(kind) ? fmtPct(parseNum(r[1]), total) : ""),
            rowOps(g.rows, ri, makeRow),
          )
        ))
      ),
      h("div", { class: "grid-actions" },
        h("button", { class: "link", onclick: () => { g.rows.push(makeRow()); rerender(); changed(); focusLast(`g${gi}`, g.rows.length - 1); } }, "+ Add row"),
        !many && h("label", { class: "hint", style: "display:inline-flex;gap:6px;align-items:center" }, "Color", select(g, "color", GROUP_COLORS.map((c) => [c, c[0].toUpperCase() + c.slice(1)]))),
        tooMany && h("button", { class: "link", onclick: () => splitGroup(gi) }, `Move the extra ${g.rows.filter((r) => !r.every(blank)).length - MAX_SLICES} to a new group`),
        tooMany && h("button", { class: "link", onclick: () => foldOther(gi) }, `Fold the smallest into “Other” (max ${MAX_SLICES} slices)`),
      ),
    );
  });

  const others = graphs.filter((g) => ITEM_KINDS.includes(g.kind) && g.name !== doc.loadedName && !doc.groups.some((x) => x.ref === g.name));
  const canAdd = doc.groups.length < GROUP_COLORS.length;
  const linkSel = h("select", { "aria-label": "Add a saved graph as a group", onchange: (e) => { if (e.target.value) linkGroup(e.target.value); } },
    h("option", { value: "" }, "Add a saved graph as a group…"),
    others.map((g) => h("option", { value: g.name }, g.title || g.name)),
  );
  return [
    blocks,
    h("div", { class: "grid-actions" },
      canAdd && h("button", { class: "btn small", onclick: addGroup }, "Add a group"),
      canAdd && others.length > 0 && linkSel,
      !canAdd && h("span", { class: "hint" }, `Up to ${GROUP_COLORS.length} groups, one for each color.`),
    ),
  ];
}

/** Every bar's name, in the order the rows first mention it. */
const flowNames = () => [...new Set(doc.flow.rows.flatMap((r) => [r[0], r[1]]).map((s) => String(s ?? "").trim()).filter(Boolean))];

const flowSettings = (name) => (doc.flow.nodes[name] ??= { color: "", column: "", y: null, label: null });

/** Anything set by hand on any bar: a color, a column, a dragged position or a nudged label. */
const flowCustomized = () =>
  Object.values(doc?.flow?.nodes ?? {}).some((s) => s.color || s.column || s.y != null || s.label);

function flowEditor() {
  const fl = doc.flow;
  const makeRow = () => ["", "", "", ""];
  const names = flowNames();
  const columnOptions = [["", "Auto"], ...Array.from({ length: MAX_FLOW_COLUMNS }, (_, i) => [String(i + 1), String(i + 1)])];

  const grid = h("table", { class: "grid" },
    h("thead", {}, h("tr", {},
      h("th", {}, "From"), h("th", {}, "To"), h("th", { class: "num" }, "Amount"), h("th", {}, "Band"), h("th", {}))),
    h("tbody", {}, fl.rows.map((r, ri) =>
      h("tr", {},
        h("td", {}, cellInput(fl.rows, ri, 0, "fl", { width: 3, makeRow, placeholder: "From", list: "flow-names" })),
        h("td", {}, cellInput(fl.rows, ri, 1, "fl", { width: 3, makeRow, placeholder: "To", list: "flow-names" })),
        h("td", { class: "num", style: "width:110px" }, cellInput(fl.rows, ri, 2, "fl", { num: true, width: 3, makeRow, placeholder: "Amount" })),
        h("td", { style: "width:92px" }, select(r, 3, FLOW_COLOR_OPTIONS, { title: "This band's color" })),
        rowOps(fl.rows, ri, makeRow),
      )
    )),
  );

  // Each bar, with its color and column. Dragging on the preview sets the rest.
  const bars = names.length > 0 && h("details", { class: "paste", open: flowCustomized() },
    h("summary", {}, `Bars (${names.length})`),
    h("table", { class: "grid" },
      h("thead", {}, h("tr", {}, h("th", {}, "Bar"), h("th", {}, "Color"), h("th", {}, "Column"), h("th", {}, ""))),
      h("tbody", {}, names.map((name) => {
        const s = flowSettings(name);
        const moved = s.y != null || s.label;
        return h("tr", {},
          h("td", { class: "bar-name" }, name),
          h("td", { style: "width:110px" }, select(s, "color", FLOW_COLOR_OPTIONS, { onchange: () => rerender() })),
          h("td", { style: "width:80px" }, select(s, "column", columnOptions, { onchange: () => rerender() })),
          h("td", { class: "hint" }, moved ? h("button", { class: "link", title: "Let the layout place this bar and its label again", onclick: () => { s.y = null; s.label = null; rerender(); changed(); } }, "Unpin") : ""),
        );
      })),
    ),
    h("span", { class: "hint" }, "Auto follows the data. On the preview, drag bars and labels to move them, and double-click a label to rename its bar."),
  );

  return [
    grid,
    h("datalist", { id: "flow-names" }, names.map((n) => h("option", { value: n }))),
    h("div", { class: "grid-actions" },
      h("button", { class: "link", onclick: () => { fl.rows.push(makeRow()); rerender(); changed(); focusLast("fl", fl.rows.length - 1); } }, "+ Add row"),
      h("span", { class: "hint" }, "Each row is one band: where it comes from, where it goes, how much. The same name is the same bar."),
    ),
    bars,
  ];
}

function focusLast(prefix, ri) {
  $(`[data-cell="${CSS.escape(`${prefix}:${ri}:0`)}"]`)?.focus();
}

/** A brand color no group has yet, or null when every one is taken. */
function unusedGroupColor() {
  const used = doc.groups.map((g) => g.color ?? g.refColor);
  return GROUP_COLORS.find((c) => !used.includes(c)) ?? null;
}

function addGroup() {
  if (doc.groups.length === 1 && !doc.groups[0].name) doc.groups[0].name = "Group 1";
  doc.groups.push({ name: `Group ${doc.groups.length + 1}`, color: unusedGroupColor() ?? GROUP_COLORS[0], ref: null, rows: emptyRows(3, 2) });
  rerender();
  changed();
}

/**
 * A group with more rows than a color has shades: the first five stay, and the rest move
 * into new groups of up to five, each with a color of its own.
 */
function splitGroup(gi) {
  const g = doc.groups[gi];
  const rows = g.rows.filter((r) => !r.every(blank));
  const extra = rows.slice(MAX_SLICES);
  if (!extra.length) return;
  const chunks = [];
  for (let i = 0; i < extra.length; i += MAX_SLICES) chunks.push(extra.slice(i, i + MAX_SLICES));
  const free = GROUP_COLORS.filter((c) => !doc.groups.some((o) => (o.color ?? o.refColor) === c));
  if (chunks.length > free.length) {
    return status(`That needs ${chunks.length} more color${chunks.length > 1 ? "s" : ""} and ${free.length || "none"} ${free.length === 1 ? "is" : "are"} free. Add one in Settings, or fold the smallest into “Other”.`, true);
  }
  g.rows = rows.slice(0, MAX_SLICES);
  if (!g.name.trim()) g.name = `Group ${gi + 1}`;
  doc.groups.splice(gi + 1, 0, ...chunks.map((chunk, i) => ({ name: "", color: free[i], ref: null, rows: chunk })));
  doc.groups.forEach((o, i) => { if (!o.name.trim()) o.name = `Group ${i + 1}`; });
  status(`Moved ${extra.length} row${extra.length > 1 ? "s" : ""} into ${chunks.length > 1 ? `${chunks.length} new groups` : "a new group"}.`);
  rerender();
  changed();
}

async function linkGroup(name) {
  const used = doc.groups.map((g) => g.color ?? g.refColor);
  const g = { name: "", color: null, ref: name, rows: [] };
  doc.groups.push(g);
  await loadRefs();
  g.name = g.refTitle || name;
  if (used.includes(g.refColor)) status(`“${g.name}” is ${g.refColor}, like another group. Change one of their colors before exporting.`, true);
  if (doc.groups.length === 2 && !doc.groups[0].name) doc.groups[0].name = "Group 1";
  rerender();
  changed();
}

function unlinkGroup(gi) {
  const g = doc.groups[gi];
  doc.groups[gi] = { name: g.name, color: g.refColor ?? "red", ref: null, rows: (g.refRows ?? []).map((r) => [...r]) };
  rerender();
  changed();
}

function removeGroup(gi) {
  const g = doc.groups[gi];
  const hasRows = !g.ref && g.rows.some((r) => !r.every(blank));
  if (hasRows && !confirm(`Remove the group “${g.name || `Group ${gi + 1}`}” and its rows?`)) return;
  doc.groups.splice(gi, 1);
  if (doc.groups.length === 1 && !doc.groups[0].ref) doc.groups[0].name = "";
  if (!doc.groups.length) doc.groups.push({ name: "", color: "red", ref: null, rows: emptyRows(3, 2) });
  rerender();
  changed();
}

/** Keeps the four largest slices and sums the rest into "Other". */
function foldOther(gi) {
  const g = doc.groups[gi];
  const rows = g.rows.filter((r) => !r.every(blank)).map((r) => [r[0], parseNum(r[1]) ?? 0]).sort((a, b) => b[1] - a[1]);
  const keep = rows.slice(0, MAX_SLICES - 1), rest = rows.slice(MAX_SLICES - 1);
  const other = rest.reduce((a, r) => a + r[1], 0);
  g.rows = [...keep.map(([l, v]) => [l, String(v)]), ["Other", String(+other.toFixed(6))]];
  status(`Folded ${rest.length} smaller rows (${rest.map((r) => r[0]).join(", ")}) into “Other”.`);
  rerender();
  changed();
}

/** Every series gets a color: no two share one, except gray, which lines share as context. */
function fixSeriesColors() {
  const t = doc.table;
  const used = new Set();
  t.colors = t.columns.slice(1).map((_, i) => {
    let c = t.colors[i];
    if (c === GRAY && doc.meta.kind !== "line") c = null;
    if (c === GRAY) return c;
    if (!c || used.has(c)) c = SERIES_COLORS.find((x) => !used.has(x)) ?? GRAY;
    used.add(c);
    return c;
  });
}

function tableEditor() {
  const t = doc.table;
  const width = t.columns.length;
  const makeRow = () => Array(t.columns.length).fill("");
  const widen = (n) => {
    const target = Math.min(n, maxSeries() + 1);
    while (t.columns.length < target) t.columns.push(`Series ${t.columns.length}`);
    t.rows.forEach((r) => { while (r.length < target) r.push(""); });
    fixSeriesColors();
    return target;
  };
  const addSeries = () => { widen(t.columns.length + 1); rerender(); changed(); };
  const removeSeries = (ci) => {
    if (t.columns.length <= 2) return;
    t.columns.splice(ci, 1);
    t.colors.splice(ci - 1, 1);
    t.rows.forEach((r) => r.splice(ci, 1));
    rerender();
    changed();
  };

  const head = h("tr", {},
    h("th", {}, h("input", { type: "text", value: t.columns[0], "aria-label": "Category column name", dataset: { cell: "th:0" }, oninput: (e) => { t.columns[0] = e.target.value; changed(); } })),
    t.columns.slice(1).map((c, i) => {
      const ci = i + 1;
      return h("th", { class: "num" },
        h("div", { class: "series-head" },
          h("input", { type: "text", value: c, "aria-label": `Series ${ci} name`, dataset: { cell: `th:${ci}` }, oninput: (e) => { t.columns[ci] = e.target.value; changed(); } }),
          h("div", { class: "tools" },
            h("span", { class: "swatch", style: `background:${HEX[t.colors[i]]}` }),
            h("select", {
              value: t.colors[i], "aria-label": `Series ${ci} color`,
              onchange: (e) => {
                const prev = t.colors[i];
                const next = e.target.value;
                // Swap, so no two series share a color. Gray isn't a clash: any number can be gray.
                const clash = next === GRAY ? -1 : t.colors.indexOf(next);
                if (clash >= 0) t.colors[clash] = prev;
                t.colors[i] = next;
                rerender();
                changed();
              },
            }, [...SERIES_COLORS, ...(doc.meta.kind === "line" ? [GRAY] : [])].map((x) => h("option", { value: x }, x === GRAY ? "Gray (context)" : x[0].toUpperCase() + x.slice(1)))),
            t.columns.length > 2 && h("button", { class: "link", title: "Remove series", "aria-label": `Remove series ${c}`, onclick: () => removeSeries(ci) }, "×"),
          )
        )
      );
    }),
    h("th", {}),
  );

  return [
    h("div", { class: "scroll-x" },
      h("table", { class: "grid" },
        h("thead", {}, head),
        h("tbody", {}, t.rows.map((r, ri) =>
          h("tr", {},
            h("td", {}, cellInput(t.rows, ri, 0, "t", { width, makeRow, onWide: widen, placeholder: t.columns[0] || "Category" })),
            t.columns.slice(1).map((_, i) => h("td", { class: "num" }, cellInput(t.rows, ri, i + 1, "t", { num: true, width, makeRow, onWide: widen, placeholder: "—" }))),
            rowOps(t.rows, ri, makeRow),
          )
        ))
      )
    ),
    h("div", { class: "grid-actions" },
      h("button", { class: "link", onclick: () => { t.rows.push(makeRow()); rerender(); changed(); focusLast("t", t.rows.length - 1); } }, "+ Add row"),
      t.columns.length - 1 < maxSeries()
        ? h("button", { class: "link", onclick: addSeries }, "+ Add series")
        : h("span", { class: "hint" }, doc.meta.kind === "line" ? `Up to ${MAX_LINES} lines.` : `Up to ${SERIES_COLORS.length} series. A line chart holds ${MAX_LINES}.`),
      doc.meta.kind === "line" && t.columns.length - 1 > SERIES_COLORS.length &&
        h("span", { class: "hint" }, "Past four lines, color the one the story is about and set the rest to Gray."),
    ),
    doc.meta.kind === "column" && doc.meta.dots && dotsEditor(),
  ];
}

/**
 * The counts drawn as dots inside each column, one row per category and one cell per series.
 * Cells hold text such as "3rd year": the dots count its number, the readout shows it whole.
 */
function dotsEditor() {
  const t = doc.table;
  const cats = t.rows.map((r) => str(r[0]).trim()).filter(Boolean);
  const series = t.columns.slice(1);
  // A grid view of the map, by category; writing it back keeps entries for renamed categories out.
  const view = cats.map((c) => series.map((_, i) => str(t.inside[c]?.[i])));
  const sync = () => {
    const next = {};
    view.forEach((r, ri) => { if (cats[ri]) next[cats[ri]] = r.map(str); });
    t.inside = next;
  };
  const makeRow = () => series.map(() => "");
  return h("div", { class: "dots" },
    h("span", { class: "field-label" }, "Dots in each column"),
    cats.length
      ? h("div", { class: "scroll-x" },
          h("table", { class: "grid" },
            h("thead", {}, h("tr", {}, h("th", {}, t.columns[0] || "Category"), series.map((c) => h("th", {}, c)))),
            h("tbody", {}, cats.map((c, ri) =>
              h("tr", {},
                h("td", { class: "cat" }, c),
                series.map((_, ci) => h("td", {}, cellInput(view, ri, ci, "dot", { width: series.length, makeRow, sync, placeholder: "e.g. 3rd year" }))),
              )
            ))
          )
        )
      : h("span", { class: "hint" }, "Add categories to the table first."),
  );
}

/** The scatter's named groups: each sets the color of the points in it. */
function groupsEditor() {
  const s = doc.scatter;
  const colorName = (c) => c[0].toUpperCase() + c.slice(1);
  return h("div", { class: "groups" },
    h("span", { class: "field-label" }, "Groups"),
    s.groups.map((g, gi) => {
      // The points in this group when renaming starts. They follow the name as it's typed,
      // even through a moment where it's blank or matches another group's.
      let members = null;
      const membersNow = () => s.points.filter((p) => !blank(g.name) && p.group.trim() === g.name.trim());
      return h("div", { class: "group-row" },
        h("span", { class: `swatch shape-${g.shape ?? "circle"}`, style: `background:${GROUP_SHADES[g.color]?.base ?? "#999"}` }),
        h("input", { type: "text", value: g.name, placeholder: `Group ${gi + 1}`, "aria-label": "Group name", dataset: { cell: `sg:${gi}` },
          onfocus: () => { members = membersNow(); },
          oninput: (e) => {
            members ??= membersNow();
            g.name = e.target.value;
            for (const p of members) p.group = g.name.trim();
            changed();
          },
          onchange: () => { members = null; rerender(); } }),
        select(g, "color", SCATTER_GROUP_COLORS.map((c) => [c, colorName(c)]), { onchange: rerender }),
        select(g, "shape", SCATTER_SHAPES.map((c) => [c, colorName(c)]), { onchange: rerender }),
        h("button", { class: "link", title: "Remove group", "aria-label": `Remove group ${g.name}`, onclick: () => { s.groups.splice(gi, 1); rerender(); changed(); } }, "×"),
      );
    }),
    h("button", { class: "link", onclick: () => {
      const used = new Set(s.groups.map((g) => g.color));
      s.groups.push({ name: "", color: SCATTER_GROUP_COLORS.find((c) => !used.has(c)) ?? "gray", shape: "circle" });
      rerender();
      changed();
    } }, "+ Add group"),
  );
}

/** Turns the scatter on its side: the axes trade places, settings and all, and so does every point's x and y. */
function swapAxes() {
  const s = doc.scatter;
  [s.x, s.y] = [s.y, s.x];
  for (const p of s.points) [p.x, p.y] = [p.y, p.x];
  // Ranges picked in the sheet for X and Y trade places too, so using them again keeps the swap.
  [sheet.roles.x, sheet.roles.y] = [sheet.roles.y, sheet.roles.x];
  for (const k of ["x", "y"]) if (!sheet.roles[k]) delete sheet.roles[k];
  rerender();
  changed();
}

function pointsEditor() {
  const s = doc.scatter;
  const makeRow = emptyPoint;
  // The grid edits label/x/y as columns 0–2 through an array view of each point.
  const COLS = ["label", "x", "y"];
  const view = s.points.map((p) => COLS.map((k) => p[k]));
  // Copies the view back into the points; the grid calls it before anything re-renders.
  const sync = () => view.forEach((r, i) => { if (!s.points[i]) s.points[i] = emptyPoint(); COLS.forEach((k, j) => (s.points[i][k] = r[j] ?? "")); });
  const cell = (ri, ci, opts) => cellInput(view, ri, ci, "p", { width: 3, makeRow: () => ["", "", ""], sync, ...opts });

  return [
    groupsEditor(),
    h("div", { class: "scroll-x" },
      h("table", { class: "grid" },
        h("thead", {}, h("tr", {},
          h("th", {}, "Label"), h("th", { title: "Shown on hover for points without a label" }, "Name"), h("th", {}, "Group"),
          h("th", { class: "num" }, "X"), h("th", { class: "num" }, "Y"),
          h("th", { title: "Draw in the masthead red, or the dark shade of its group" }, "Focus"), h("th", {}, "Label side"), h("th", {}, "Note"), h("th", {}))),
        h("tbody", {}, s.points.map((p, ri) =>
          h("tr", {},
            h("td", {}, cell(ri, 0, { placeholder: "Label" })),
            h("td", {}, h("input", { type: "text", value: p.name, placeholder: "Optional", "aria-label": "Name", dataset: { cell: `pname:${ri}` }, oninput: (e) => { p.name = e.target.value; changed(); } })),
            h("td", {}, select(p, "group", [["", "—"], ...s.groups.filter((g) => !blank(g.name)).map((g) => [g.name.trim(), g.name.trim()]),
              ...(!blank(p.group) && !s.groups.some((g) => g.name.trim() === p.group.trim()) ? [[p.group, `${p.group} (missing)`]] : [])])),
            h("td", { class: "num", style: "width:72px" }, cell(ri, 1, { num: true, placeholder: "x" })),
            h("td", { class: "num", style: "width:72px" }, cell(ri, 2, { num: true, placeholder: "y" })),
            h("td", { class: "center" }, h("input", { type: "checkbox", checked: p.highlight, "aria-label": "Focus point", onchange: (e) => { p.highlight = e.target.checked; changed(); } })),
            h("td", {}, select(p, "labelAt", [["right", "Right"], ["left", "Left"], ["above", "Above"], ["below", "Below"]])),
            h("td", {}, h("input", { type: "text", value: p.note, placeholder: "Optional", "aria-label": "Note", dataset: { cell: `pn:${ri}` }, oninput: (e) => { p.note = e.target.value; changed(); } })),
            rowOps(s.points, ri, makeRow),
          )
        ))
      )
    ),
    h("div", { class: "grid-actions" },
      h("button", { class: "link", onclick: () => { s.points.push(emptyPoint()); rerender(); changed(); focusLast("p", s.points.length - 1); } }, "+ Add point"),
      h("button", { class: "link", onclick: swapAxes }, "Swap X and Y"),
      h("span", { class: "hint" }, "Use | in a note or axis title for a line break."),
    ),
  ];
}

// ── Options ───────────────────────────────────────────────

function optionsEditor() {
  const m = doc.meta, kind = m.kind;
  const widthField = field(m, "width", "Width (inches)", { type: "number", hint: "The printed width. 3.5 is about two columns.", list: "widths" });
  const widths = h("datalist", { id: "widths" }, ["2", "3.5", "5", "7", "10"].map((v) => h("option", { value: v })));
  const out = [h("div", { class: "row2" }, widthField, widths)];

  if (SLICED.includes(kind)) {
    out.push(h("div", { class: "row2" },
      kind === "ring" ? field(m, "centerLabel", "Word under the total", { placeholder: "reports" }) : h("div"),
      field(m, "valueLabel", "Key column heading", { placeholder: "Reports" })));
  }
  if (ITEM_KINDS.includes(kind)) out.push(checkbox(m, "sort", "Sort largest first"));

  if (kind === "bar" || kind === "flow" || TABLE_KINDS.includes(kind)) {
    out.push(h("div", { class: "row2" },
      field(m, "prefix", "Before numbers", { placeholder: "$" }),
      field(m, "suffix", "After numbers", { placeholder: "%" })));
  }

  if (kind === "flow") {
    const pick = (key, label, options) => h("label", { class: "field" }, h("span", {}, label), select(m, key, options));
    out.push(h("div", { class: "row2" },
      pick("labels", "Labels show", [["value", "Amounts"], ["percent", "Share of the total"], ["both", "Amounts and shares"], ["name", "Names only"]]),
      pick("palette", "Colors", [["branches", "A color per branch"], ["red", "All red"], ["gray", "All gray, to pick bars out"]])));
    out.push(h("div", { class: "row3" },
      pick("colorBy", "Bands take the color of", [["source", "Where they start"], ["target", "Where they end"]]),
      pick("align", "Bars line up", [["left", "From the left"], ["justify", "Ends at the right"], ["right", "From the right"], ["center", "Centered"]]),
      pick("order", "Order in a column", [["auto", "Fewest crossings"], ["data", "As listed"], ["size", "Largest first"]])));
    out.push(h("div", { class: "row2" },
      field(m, "aspect", "Height", { placeholder: "auto", hint: "As a share of the width, e.g. 0.8. Auto fits the labels." }),
      h("div")));
  }

  if (TABLE_KINDS.includes(kind)) {
    out.push(h("div", { class: "row2" },
      field(m, "yLabel", "Y-axis title", { placeholder: "Referrals" }),
      field(m, "xLabel", "X-axis title", { placeholder: "Optional" })));
    out.push(h("div", { class: "row3" },
      field(m, "yMin", "Y from", { placeholder: kind === "column" ? "0" : "auto" }),
      field(m, "yMax", "Y to", { placeholder: "auto" }),
      kind === "line"
        ? h("label", { class: "field" }, h("span", {}, "Start at zero"), select(m, "yZero", [["auto", "When it fits"], ["yes", "Always"], ["no", "Never"]]))
        : h("div")));
    if (kind === "column") {
      out.push(checkbox(m, "stacked", "Stack the series"));
      out.push(checkbox(m, "dots", "Dots in each column", { onchange: rerender }));
      if (m.dots) out.push(h("div", { class: "row2" }, field(m, "insideLabel", "Dot key", { placeholder: "Year in office" }), h("div")));
    }
  }

  if (kind === "scatter") {
    const s = doc.scatter;
    const axisBox = (a, name) =>
      h("div", { class: "axis-box" },
        h("span", { class: "field-label" }, `${name} axis`),
        field(a, "label", "Title", { cell: `ax:${name}:label`, hint: "Use | to break the title onto two lines." }),
        h("div", { class: "row4" },
          field(a, "short", "Key heading", { cell: `ax:${name}:short` }),
          field(a, "unit", "Unit", { cell: `ax:${name}:unit` }),
          field(a, "min", "From", { cell: `ax:${name}:min`, placeholder: "auto" }),
          field(a, "max", "To", { cell: `ax:${name}:max`, placeholder: "auto" }),
        ),
        h("label", { class: "field" }, h("span", {}, "Scale"), select(a, "scale", [["log", "Logarithmic (for values spanning 10× or more)"], ["linear", "Linear"]])),
        checkbox(a, "year", "Dates"),
      );
    out.push(axisBox(s.x, "X"), axisBox(s.y, "Y"));
    out.push(h("div", { class: "row2" },
      field(m, "aspect", "Plot height", { placeholder: "0.78", hint: "As a share of the plot's width." }),
      field(m, "othersLabel", "Key name for unlabeled points", { placeholder: "Others" })));
    out.push(h("label", { class: "field" }, h("span", {}, "Dots"),
      select(m, "markStyle", [["solid", "Solid"], ["clear", "See-through"], ["ring", "Rings"]])));
    out.push(checkbox(m, "trend", "Trend line for each group"));
  }
  return out;
}

function fileEditor() {
  const nameInput = h("input", {
    type: "text", id: "file-name", value: doc.name, placeholder: slugify(doc.meta.title) || "graph-name",
    dataset: { cell: "file-name" }, "aria-label": "File name",
    oninput: (e) => {
      const clean = slugify(e.target.value);
      doc.name = clean;
      changed();
    },
    onblur: (e) => { e.target.value = doc.name; },
  });
  return [
    h("div", { class: "file-row" },
      h("label", { class: "field" },
        h("span", {}, "File name"),
        nameInput,
        h("span", { class: "hint", id: "file-hint" }),
      ),
      doc.loadedName && h("button", { class: "btn small", onclick: () => openGraph(doc.loadedName) }, "Revert"),
      doc.loadedName && h("button", { class: "btn small danger", onclick: deleteGraph }, "Delete"),
    ),
  ];
}

function renderFileName() {
  const input = $("#file-name");
  if (!input) return;
  if (document.activeElement !== input) input.value = doc.name;
  input.placeholder = slugify(doc.meta.title) || "graph-name";
  const name = doc.name || slugify(doc.meta.title);
  const hint = $("#file-hint");
  if (hint) {
    hint.textContent = !name ? "Set from the title when you save."
      : doc.loadedName && name !== doc.loadedName ? `Saving writes a copy: ${name}`
      : `Saves as ${name}`;
  }
}

function updateComputed() {
  if (!doc || !SLICED.includes(doc.meta.kind)) return;
  const total = doc.groups.reduce((a, g) => a + (g.ref ? g.refRows ?? [] : g.rows).reduce((s, r) => s + Math.max(0, parseNum(r[1]) ?? 0), 0), 0);
  document.querySelectorAll("[data-pct]").forEach((el) => {
    const [gi, ri] = el.dataset.pct.split(":").map(Number);
    el.textContent = fmtPct(parseNum(doc.groups[gi]?.rows[ri]?.[1]), total);
  });
  renderFileName();
}

/**
 * Lines that sit at 0 for two or more rows before their first real figure. In financial
 * data that's nearly always years with no figures, and drawn as zero it's a fake jump.
 */
function leadingZeroRuns() {
  if (doc?.meta.kind !== "line") return [];
  const t = doc.table;
  return t.columns.slice(1).flatMap((name, i) => {
    let k = 0;
    while (k < t.rows.length && parseNum(t.rows[k][i + 1]) === 0) k++;
    const realAfter = k < t.rows.length && (parseNum(t.rows[k][i + 1]) ?? 0) !== 0;
    return k >= 2 && realAfter ? [{ col: i + 1, name: name.trim() || `Series ${i + 1}`, rows: k, from: t.rows[k][0] }] : [];
  });
}

function updateWarnings() {
  const box = $("#warnings");
  if (!box || !doc) return;
  const { warnings } = toFile(doc);
  const runs = leadingZeroRuns();
  const blankRuns = () => {
    runs.forEach((r) => doc.table.rows.slice(0, r.rows).forEach((row) => (row[r.col] = "")));
    rerender();
    changed();
  };
  box.replaceChildren(
    ...(warnings.length ? [h("div", { class: "warn" }, warnings.slice(0, 6).map((w) => h("div", {}, w)), warnings.length > 6 && h("div", {}, `…and ${warnings.length - 6} more.`))] : []),
    ...(runs.length
      ? [h("div", { class: "warn" },
          runs.map((r) => h("div", {}, `${r.name} is 0 until ${r.from || "its first figure"}.`)),
          h("div", {}, "If those years have no figures rather than a real zero, blank them so each line starts where its data does."),
          h("button", { class: "btn small", onclick: blankRuns }, runs.length > 1 ? "Blank those zeros" : "Blank that zero run"))]
      : []),
  );
  renderFileName();
}

// ── Preview ───────────────────────────────────────────────
//
// Three previews, one under the other: Print (the PDF/PNG, rendered by the server), and Web
// and Phone (the graph as the article draws it, components/Interactive, from /graph/live in
// a frame each). The editor posts the live frames the graph; they post back their height.

const VIEWS = ["print", "web", "phone"];
// The article column plus the page's 16px gutters, and a phone.
const LIVE = { web: { width: 712, ready: false, height: 0 }, phone: { width: 375, ready: false, height: 0 } };
const liveFrame = (v) => $(`#live-${v}`);

let previewTimer, liveTimer, previewSeq = 0, front = 0, lastSize = null;

function sendLive() {
  if (!doc || doc.meta.kind === "custom") return;
  const graph = toFile(doc).graph;
  for (const v of Object.keys(LIVE)) {
    if (LIVE[v].ready) liveFrame(v).contentWindow.postMessage({ type: "graph", graph, settings: graphSettings }, location.origin);
  }
}

window.addEventListener("message", (e) => {
  if (e.origin !== location.origin) return;
  const v = Object.keys(LIVE).find((k) => e.source === liveFrame(k).contentWindow);
  if (!v) return;
  if (e.data?.type === "ready") {
    LIVE[v].ready = true;
    attachCanvasStart(liveFrame(v).contentDocument, v);
    sendLive();
  }
  if (e.data?.type === "height") { LIVE[v].height = Number(e.data.height) || 0; layoutFrame(); }
  if (e.data?.type === "label") moveLabel(Number(e.data.index), Number(e.data.dx), Number(e.data.dy));
});

/** A scatter label dragged on a web preview: its offset from where it would sit, kept on the point. */
function moveLabel(index, dx, dy) {
  if (!doc || ![index, dx, dy].every(Number.isFinite)) return;
  // The preview numbers the points as the file lists them, which skips blank and unfinished rows.
  const listed = doc.scatter.points.filter((p) =>
    !(blank(p.label) && blank(p.x) && blank(p.y)) && axisValue(p.x, doc.scatter.x) !== null && axisValue(p.y, doc.scatter.y) !== null);
  const p = listed[index];
  if (!p) return;
  const raw = { ...p._raw };
  delete raw.labelDx;
  delete raw.labelDy;
  if (dx || dy) Object.assign(raw, { labelDx: dx, labelDy: dy });
  p._raw = raw;
  changed();
}

function schedulePreview() {
  clearTimeout(previewTimer);
  clearTimeout(liveTimer);
  // A custom graph is drawn right here from its parts; nothing to ask the server or the frames for.
  if (doc?.meta.kind === "custom") return renderCanvases();
  liveTimer = setTimeout(sendLive, 120);
  $("#frame").classList.add("stale");
  previewTimer = setTimeout(runPreview, 250);
}

async function runPreview(plotH = null) {
  if (!doc || doc.meta.kind === "custom") return;
  const seq = ++previewSeq;
  let r;
  try {
    r = await api("POST", "/api/graph/preview", { graph: toFile(doc).graph, plotH });
  } catch (err) {
    r = { error: err.message };
  }
  if (seq !== previewSeq) return; // a newer edit is already on its way
  const errBox = $("#preview-error");
  if (r.error) {
    errBox.hidden = false;
    errBox.replaceChildren(r.error);
    const g = doc.groups.findIndex((g) => !g.ref && g.rows.filter((x) => !x.every(blank)).length > MAX_SLICES);
    if (SLICED.includes(doc.meta.kind) && g >= 0) {
      errBox.append(
        h("button", { class: "btn small", onclick: () => splitGroup(g) }, "Move the extra to a new group"),
        h("button", { class: "btn small", onclick: () => foldOther(g) }, "Fold the smallest into “Other”"),
      );
    }
    $("#frame").classList.add("stale");
    return;
  }
  errBox.hidden = true;
  // Draw into the hidden frame, then swap, so the preview never flashes blank.
  const frames = [$("#f0"), $("#f1")];
  const back = frames[1 - front];
  back.classList.add("back");
  back.onload = async () => {
    if (seq !== previewSeq) return;
    try { await back.contentDocument.fonts.ready; } catch {}
    await new Promise((res) => requestAnimationFrame(res));
    // A newer preview may have claimed this frame while the fonts loaded.
    if (seq !== previewSeq) return;
    const html = back.contentDocument.documentElement;
    const w = back.contentDocument.body.scrollWidth;
    const hgt = Number(html.getAttribute("data-height")) || back.contentDocument.body.scrollHeight;
    // A graph with a "frame" gets its plot resized until the PNG has that shape, as the
    // export does: measure this draw, then draw once more at the height that fits.
    if (r.frame && plotH === null) {
      const widthPx = r.widthIn * 96;
      const target = Math.round((widthPx + r.frame.pad * 2) * r.frame.ratio - r.frame.pad * 2);
      const fitted = r.frame.plotH + (target - (hgt - r.frame.pad * 2));
      if (Math.abs(fitted - r.frame.plotH) > 1 && fitted >= 60) return runPreview(fitted);
    }
    // The preview carries the PNG's white margin; the printed size doesn't.
    lastSize = { w, h: hgt, widthIn: r.widthIn, heightIn: (hgt - r.pad * 2) / 96 };
    const i = frames.indexOf(back);
    frames[1 - i].classList.add("back");
    back.classList.remove("back");
    front = i;
    layoutFrame();
    attachFlowEditing(back);
    attachCanvasStart(back.contentDocument, "print");
    $("#frame").classList.remove("stale");
  };
  back.srcdoc = r.html;
}

let previewZoom = 1;

/**
 * Runs a change to the previews' sizes without the view jumping: whichever preview is at
 * the top of the scrolled area stays where it is, however the ones above it grow or shrink.
 */
function keepScroll(fn) {
  const stage = $("#stage");
  const top = stage.getBoundingClientRect().top;
  const panes = [...stage.querySelectorAll(".pane")];
  const anchor = panes.find((p) => p.getBoundingClientRect().bottom > top + 1) ?? panes[0];
  const before = anchor ? anchor.getBoundingClientRect().top : 0;
  fn();
  if (anchor) stage.scrollTop += anchor.getBoundingClientRect().top - before;
}

function layoutFrame() {
  keepScroll(() => {
    const shown = canvasViews().filter((v) => viewDoc(v));
    const zoomSel = $("#zoom").value;
    const avail = $("#stage").clientWidth - 48;

    // Print: the frame holds the page at its own size, scaled to the zoom.
    const frame = $("#frame");
    if (shown.includes("print")) {
      const c = viewDoc("print");
      const [w, hgt] = [c.size[0] + CANVAS_PAD * 2, c.size[1] + CANVAS_PAD * 2];
      const z = zoomSel === "fit" ? Math.max(0.5, Math.min(2.5, avail / w)) : Number(zoomSel);
      previewZoom = z;
      frame.style.width = `${w * z}px`;
      frame.style.height = `${hgt * z}px`;
      canvasEl("print").style.padding = `${CANVAS_PAD * z}px`;
      const widthIn = doc.meta.kind === "custom" ? parseNum(doc.meta.width) || c.size[0] / 96 : lastSize?.widthIn ?? c.size[0] / 96;
      $("#size").textContent = `Prints ${fmtIn(widthIn)} × ${fmtIn((widthIn * c.size[1]) / c.size[0])} in${zoomSel === "fit" ? ` · shown at ${Math.round(z * 100)}%` : ""}`;
    } else if (lastSize) {
      const z = zoomSel === "fit" ? Math.max(0.5, Math.min(2.5, avail / lastSize.w)) : Number(zoomSel);
      previewZoom = z;
      frame.style.width = `${lastSize.w * z}px`;
      frame.style.height = `${lastSize.h * z}px`;
      for (const f of frame.querySelectorAll("iframe")) {
        f.style.width = `${lastSize.w}px`;
        f.style.height = `${lastSize.h}px`;
        f.style.transform = `scale(${z})`;
      }
      $("#size").textContent = `Prints ${fmtIn(lastSize.widthIn)} × ${fmtIn(lastSize.heightIn)} in${zoomSel === "fit" ? ` · shown at ${Math.round(z * 100)}%` : ""}`;
    }

    // Web and Phone: each at its real width, as tall as its graph.
    for (const v of Object.keys(LIVE)) {
      const { width, height } = LIVE[v];
      const fr = $(`#frame-${v}`), live = liveFrame(v);
      fr.style.width = `${width}px`;
      if (shown.includes(v)) {
        const c = viewDoc(v);
        const el = canvasEl(v);
        const svg = $("svg", el);
        const inner = width - 32;
        if (svg) svg.style.width = `${Math.min(inner, c.size[0] * webScale(inner))}px`;
        fr.style.height = `${el.offsetHeight}px`;
      } else {
        fr.style.height = `${height}px`;
      }
      Object.assign(live.style, { width: `${width}px`, height: `${height}px` });
    }
    paintSelection();
  });
}
const fmtIn = (v) => (Math.round(v * 100) / 100).toString();

// ── Canvas ────────────────────────────────────────────────
//
// Every preview can be taken apart. Pressing on anything in one turns what's drawn into
// parts (parts.js): each shape and each piece of text on its own, selectable. Until
// something actually changes, that's only a "pending" copy shown in place of the preview it
// was taken from. The first move, delete or recolor commits it: the graph becomes a Custom
// graph, drawn from its parts in all three previews and no longer from its data. The graph
// it was made from is kept inside it, so undoing (or picking its old type) puts it back.

const CANVAS_PAD = 20; // the white margin the print preview shows around the graphic, px

const freshCanvas = () => ({ view: "print", pending: null, sel: new Set(), undo: [], redo: [], drag: null, marquee: null, resize: null, editing: null, colors: false });
let canvas = freshCanvas();

// A custom graph keeps a set of parts for each preview ("views"), since print, web and phone
// lay the same graph out differently and each has to stay exactly as it looked. Selecting
// and editing happen in one view at a time: canvas.view, the one last pressed.

/** One view's parts and size: the custom graph's, or the pending copy's if it's of that view. */
const viewDoc = (v) => (doc?.meta.kind === "custom" ? doc.custom.views[v] : canvas.pending?.view === v ? canvas.pending : null);
/** The view being worked in. */
const canvasDoc = () => viewDoc(canvas.view);
/** Which previews are taken apart: all three for a custom graph, just the one pressed for a pending copy. */
const canvasViews = () => (doc?.meta.kind === "custom" ? VIEWS : canvas.pending ? [canvas.pending.view] : []);
const canvasEl = (v) => $(`.canvas[data-view="${v}"]`);
const partById = (id) => canvasDoc()?.parts.find((p) => p.id === id);
/** Swaps the working view's list of parts for another. */
const setParts = (parts) => { canvasDoc().parts = parts; };

function renderCanvases() {
  const shown = canvasViews();
  for (const v of VIEWS) {
    const el = canvasEl(v);
    const c = viewDoc(v);
    const on = shown.includes(v) && !!c;
    el.hidden = !on;
    el.closest(".frame").classList.toggle("custom", on);
    el.closest(".pane").classList.toggle("active", on && v === canvas.view);
    // Markup from partsSvg, which escapes and checks everything it writes.
    el.innerHTML = on ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Number(c.size[0])} ${Number(c.size[1])}">${partsSvg(c.parts, { ids: true, prefix: `cv-${v}` })}</svg>` : "";
  }
  if (shown.length) {
    $("#preview-error").hidden = true;
    $("#frame").classList.remove("stale");
  }
  layoutFrame();
  updateCanvasTools();
}

/** Outlines the selected parts, and the box being dragged out, on every canvas showing. */
function paintSelection() {
  for (const v of VIEWS) {
    const el = canvasEl(v);
    if (!el) continue;
    el.querySelectorAll(".sel-box, .marquee").forEach((b) => b.remove());
    if (el.hidden || v !== canvas.view) continue;
    const base = el.getBoundingClientRect();
    for (const id of canvas.sel) {
      const part = el.querySelector(`[data-part="${CSS.escape(id)}"]`);
      if (!part) continue;
      const r = part.getBoundingClientRect();
      el.append(h("div", { class: "sel-box", style: `left:${r.left - base.left - 2}px;top:${r.top - base.top - 2}px;width:${r.width + 4}px;height:${r.height + 4}px` }));
    }
    // One box around everything selected, with a handle on each corner and side to resize by.
    const box = selectionBox(el);
    if (box && !canvas.drag?.moved && !canvas.editing) {
      for (const hd of ["nw", "n", "ne", "e", "se", "s", "sw", "w"]) {
        const x = hd.includes("w") ? box.left : hd.includes("e") ? box.right : (box.left + box.right) / 2;
        const y = hd.includes("n") ? box.top : hd.includes("s") ? box.bottom : (box.top + box.bottom) / 2;
        el.append(h("div", { class: "sel-box handle", dataset: { handle: hd }, style: `left:${x - base.left - 4}px;top:${y - base.top - 4}px;cursor:${hd === "n" || hd === "s" ? "ns" : hd === "e" || hd === "w" ? "ew" : hd === "nw" || hd === "se" ? "nwse" : "nesw"}-resize` }));
      }
    }
    const m = canvas.marquee;
    if (m?.v === v) {
      el.append(h("div", { class: "marquee", style: `left:${Math.min(m.x0, m.x1) - base.left}px;top:${Math.min(m.y0, m.y1) - base.top}px;width:${Math.abs(m.x1 - m.x0)}px;height:${Math.abs(m.y1 - m.y0)}px` }));
    }
  }
}

/** The box around every selected part on one canvas, in page px; null with nothing selected. */
function selectionBox(el) {
  let box = null;
  for (const id of canvas.sel) {
    const r = el.querySelector(`[data-part="${CSS.escape(id)}"]`)?.getBoundingClientRect();
    if (!r) continue;
    box = box
      ? { left: Math.min(box.left, r.left), top: Math.min(box.top, r.top), right: Math.max(box.right, r.right), bottom: Math.max(box.bottom, r.bottom) }
      : { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  }
  return box;
}

/** The part under a point: the one pressed, or else the smallest one whose box is within reach. */
function hitPart(el, x, y, target) {
  const direct = target?.closest?.("[data-part]");
  if (direct && el.contains(direct)) return direct.dataset.part;
  let best = null, bestArea = Infinity;
  for (const part of el.querySelectorAll("[data-part]")) {
    const r = part.getBoundingClientRect();
    if (x < r.left - 4 || x > r.right + 4 || y < r.top - 4 || y > r.bottom + 4) continue;
    const area = Math.max(1, r.width) * Math.max(1, r.height);
    if (area < bestArea) [best, bestArea] = [part.dataset.part, area];
  }
  return best;
}

/** How many of the graphic's units one px on screen covers in a view. */
function unitsPerPx(v) {
  const svg = $("svg", canvasEl(v));
  const w = svg?.getBoundingClientRect().width;
  return w ? viewDoc(v).size[0] / w : 1;
}

const canvasState = () => JSON.stringify(doc.meta.kind === "custom" ? doc.custom : null);

/** Call before any change to the parts: remembers how things were, and makes a pending copy the graph. */
function canvasBeginEdit() {
  canvas.undo.push(canvasState());
  if (canvas.undo.length > 80) canvas.undo.shift();
  canvas.redo = [];
  if (doc.meta.kind !== "custom") commitPending();
}

function commitPending() {
  const p = canvas.pending;
  if (!p) return;
  canvas.pending = null;
  // The graph as it stood, data, sheet and all: what Undo and the old type go back to.
  const from = toFile(doc).graph;
  // Each preview is taken apart as it looks right now, so none of the three changes.
  const views = {};
  for (const v of VIEWS) {
    const snap = v === p.view ? p : takeSnapshot(v);
    if (snap) views[v] = { size: snap.size, parts: snap.parts };
  }
  for (const v of VIEWS) views[v] ??= structuredClone(views.print ?? views[p.view]);
  doc.custom = { views, swatches: [], from };
  doc.meta.kind = "custom";
  rerender();
  status(`Now a custom graph. Undo, or pick ${KIND_LABEL[from.kind ?? "ring"]} again, to go back.`);
}

/** Back to the graph a custom one was made from, dropping the custom layout. */
function revertCustom() {
  const from = doc.custom?.from;
  if (!from) return false;
  const { name, loadedName } = doc;
  doc = fromFile(from, name);
  doc.loadedName = loadedName;
  canvas.pending = null;
  canvas.sel.clear();
  rerender();
  renderCanvases();
  changed();
  return true;
}

function canvasUndo(redo = false) {
  const [from, to] = redo ? [canvas.redo, canvas.undo] : [canvas.undo, canvas.redo];
  if (!from.length) return;
  to.push(canvasState());
  const state = JSON.parse(from.pop());
  if (!state) return void revertCustom();
  doc.custom = state;
  if (doc.meta.kind !== "custom") {
    doc.meta.kind = "custom";
    rerender();
  }
  canvas.sel = new Set([...canvas.sel].filter((id) => partById(id)));
  changed();
}

/** A pending copy nobody changed: put the real preview back. */
function dropPending() {
  if (!canvas.pending) return;
  canvas.pending = null;
  canvas.sel.clear();
  renderCanvases();
}

/** Takes the graph drawn in a preview apart. Null if that preview has nothing drawn. */
function takeSnapshot(view) {
  if (view === "print") {
    const root = [$("#f0"), $("#f1")][front]?.contentDocument?.querySelector("figure.graphic");
    if (!root) return null;
    const inset = parseFloat(root.ownerDocument.defaultView.getComputedStyle(root).paddingLeft) || 0;
    return { view, ...snapshotParts(root, { inset }) };
  }
  const root = liveFrame(view).contentDocument?.querySelector("figure.ig");
  if (!root) return null;
  // On the web a unit is drawn bigger than a px; store units, so it prints at a sensible size.
  return { view, ...snapshotParts(root, { scale: 1 / webScale(root.getBoundingClientRect().width) }) };
}

/** Follows the pointer until it lifts, wherever it goes: this page, or the frame the press began in. */
function trackPointer(sources) {
  const offs = [];
  const stop = () => offs.forEach((off) => off());
  for (const { target, map } of sources) {
    const move = (e) => canvasPointerMove(...map(e));
    const up = (e) => { stop(); canvasPointerUp(...map(e)); };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
    offs.push(() => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
    });
  }
}
const here = { target: window, map: (e) => [e.clientX, e.clientY] };

/** In a preview frame: pressing on something makes the pending copy and starts dragging it. */
function attachCanvasStart(fdoc, view) {
  if (!fdoc) return;
  fdoc.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || !doc || doc.meta.kind === "custom") return;
    // Flow graphs (in print) and scatter labels (on the web) have dragging of their own, kept in the data.
    if (view === "print" && doc.meta.kind === "flow") return;
    if (e.target.closest?.(".ig-drag")) return;
    const snap = takeSnapshot(view);
    if (!snap) return;
    let id = null;
    for (let n = e.target; n && n.nodeType === 1; n = n.parentNode) {
      if (snap.byEl.has(n)) { id = snap.byEl.get(n); break; }
    }
    // Nothing directly under the pointer (the middle of a ring, a hair beside a thin line):
    // take the smallest thing whose box is within reach.
    if (!id) {
      let bestArea = Infinity;
      for (const [el, partId] of snap.byEl) {
        const r = el.getBoundingClientRect();
        if (e.clientX < r.left - 4 || e.clientX > r.right + 4 || e.clientY < r.top - 4 || e.clientY > r.bottom + 4) continue;
        const area = Math.max(1, r.width) * Math.max(1, r.height);
        if (area < bestArea) [id, bestArea] = [partId, area];
      }
    }
    if (!id) return;
    e.preventDefault();
    // Where a point in the frame is on this page; the print frames are scaled to the zoom.
    const frame = fdoc.defaultView.frameElement;
    const map = (ev) => {
      const r = frame.getBoundingClientRect();
      const z = r.width / frame.offsetWidth || 1;
      return [r.left + ev.clientX * z, r.top + ev.clientY * z];
    };
    canvas.pending = { view, size: snap.size, parts: snap.parts };
    canvas.view = view;
    canvas.sel = new Set([id]);
    renderCanvases();
    canvasEl(view).focus({ preventScroll: true });
    const [x, y] = map(e);
    canvas.drag = { v: view, x, y, moved: false, base: null };
    trackPointer([here, { target: fdoc, map }]);
  }, true);
}

function canvasPointerDown(e) {
  const el = e.currentTarget;
  const v = el.dataset.view;
  if (e.button !== 0 || !viewDoc(v)) return;
  if (e.target.closest?.(".canvas-edit")) return;
  e.preventDefault();
  canvasCommitText();
  if (canvas.view !== v) {
    // Working in another preview: what was selected in the last one is let go.
    canvas.view = v;
    canvas.sel.clear();
    for (const o of VIEWS) canvasEl(o).closest(".pane").classList.toggle("active", o === v);
  }
  el.focus({ preventScroll: true });
  const handle = e.target.dataset?.handle;
  const box = handle && selectionBox(el);
  if (box) {
    // Sizes are worked out in the graphic's own units, from the box as it stood when the drag began.
    const svg = $("svg", el).getBoundingClientRect();
    const u = unitsPerPx(v);
    canvas.resize = {
      v, handle, x: e.clientX, y: e.clientY, scale: u, started: false,
      box: { left: (box.left - svg.left) * u, top: (box.top - svg.top) * u, right: (box.right - svg.left) * u, bottom: (box.bottom - svg.top) * u },
    };
    return trackPointer([here]);
  }
  const id = hitPart(el, e.clientX, e.clientY, e.target);
  if (id && e.shiftKey) {
    if (canvas.sel.has(id)) canvas.sel.delete(id); else canvas.sel.add(id);
  } else if (id) {
    if (!canvas.sel.has(id)) canvas.sel = new Set([id]);
    canvas.drag = { v, x: e.clientX, y: e.clientY, moved: false, base: null };
  } else {
    if (!e.shiftKey) canvas.sel.clear();
    canvas.marquee = { v, x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY, keep: new Set(canvas.sel) };
  }
  paintSelection();
  updateCanvasTools();
  if (canvas.drag || canvas.marquee) trackPointer([here]);
}

function canvasPointerMove(x, y) {
  const d = canvas.drag, m = canvas.marquee, rz = canvas.resize;
  if (rz) {
    if (!rz.started) {
      if (Math.hypot(x - rz.x, y - rz.y) < 2) return;
      rz.started = true;
      canvasBeginEdit();
      rz.orig = new Map([...canvas.sel].map((id) => [id, structuredClone(partById(id))]).filter(([, p]) => p));
    }
    const b = rz.box, hd = rz.handle;
    const [w0, h0] = [b.right - b.left, b.bottom - b.top];
    const [du, dv] = [(x - rz.x) * rz.scale, (y - rz.y) * rz.scale];
    let sx = hd.includes("e") ? (w0 + du) / w0 : hd.includes("w") ? (w0 - du) / w0 : 1;
    let sy = hd.includes("s") ? (h0 + dv) / h0 : hd.includes("n") ? (h0 - dv) / h0 : 1;
    if (!(w0 > 0.5)) sx = 1;
    if (!(h0 > 0.5)) sy = 1;
    // A corner keeps the shape's proportions; a side stretches it one way.
    const corner = hd.length === 2;
    if (corner) sx = sy = Math.max(w0 > 0.5 ? sx : sy, h0 > 0.5 ? sy : sx);
    sx = Math.max(0.02, sx);
    sy = Math.max(0.02, sy);
    // The side or corner opposite the handle stays put.
    const ax = hd.includes("w") ? b.right : hd.includes("e") ? b.left : (b.left + b.right) / 2;
    const ay = hd.includes("n") ? b.bottom : hd.includes("s") ? b.top : (b.top + b.bottom) / 2;
    const parts = canvasDoc().parts;
    for (const [id, orig] of rz.orig) {
      const i = parts.findIndex((p) => p.id === id);
      if (i >= 0) parts[i] = scalePart(structuredClone(orig), sx, sy, ax, ay, corner);
    }
    return renderCanvases();
  }
  if (m) {
    [m.x1, m.y1] = [x, y];
    // Everything the box touches joins what was selected before it.
    const [l, r, t, b] = [Math.min(m.x0, x), Math.max(m.x0, x), Math.min(m.y0, y), Math.max(m.y0, y)];
    canvas.sel = new Set(m.keep);
    for (const part of canvasEl(m.v).querySelectorAll("[data-part]")) {
      const p = part.getBoundingClientRect();
      if (p.right >= l && p.left <= r && p.bottom >= t && p.top <= b) canvas.sel.add(part.dataset.part);
    }
    return paintSelection();
  }
  if (!d) return;
  if (!d.moved) {
    if (Math.hypot(x - d.x, y - d.y) < 3) return;
    d.moved = true;
    d.scale = unitsPerPx(d.v);
    canvasBeginEdit();
    d.base = new Map([...canvas.sel].map((id) => [id, [partById(id)?.dx ?? 0, partById(id)?.dy ?? 0]]));
  }
  for (const [id, [dx, dy]] of d.base) {
    const p = partById(id);
    if (!p) continue;
    p.dx = Math.round((dx + (x - d.x) * d.scale) * 100) / 100;
    p.dy = Math.round((dy + (y - d.y) * d.scale) * 100) / 100;
  }
  renderCanvases();
}

function canvasPointerUp() {
  const d = canvas.drag, m = canvas.marquee, rz = canvas.resize;
  canvas.drag = canvas.marquee = canvas.resize = null;
  if (d?.moved || rz?.started) return changed();
  // A press that selected nothing leaves a pending copy with no purpose.
  if (!canvas.sel.size && canvas.pending) return dropPending();
  if (m) paintSelection();
  updateCanvasTools();
}

const r2 = (v) => Math.round(v * 100) / 100;

/**
 * A part scaled by sx and sy about the point (ax, ay), all in the graphic's units. Shapes
 * that sit square to the page take the new size in their own numbers, so their outlines
 * keep their weight; text takes it as a type size when `uniform`. Anything turned or
 * drawn as a path carries it as a transform instead.
 */
function scalePart(p, sx, sy, ax, ay, uniform) {
  const [a, b, c, d, e, f] = Array.isArray(p.m) ? p.m : [1, 0, 0, 1, 0, 0];
  const [tx, ty] = [e + (p.dx ?? 0), f + (p.dy ?? 0)];
  const square = Math.abs(b) < 1e-6 && Math.abs(c) < 1e-6 && a > 0 && d > 0;
  if (!square || p.t === "path" || p.t === "poly") {
    p.m = [a * sx, b * sy, c * sx, d * sy, sx * tx + ax * (1 - sx), sy * ty + ay * (1 - sy)].map((v, i) => +v.toFixed(i < 4 ? 5 : 2));
    delete p.dx;
    delete p.dy;
    return p;
  }
  const X = (x) => r2(sx * (a * x + tx) + ax * (1 - sx)), Y = (y) => r2(sy * (d * y + ty) + ay * (1 - sy));
  delete p.m;
  delete p.dx;
  delete p.dy;
  if (p.sw) p.sw = +(p.sw * Math.min(a, d)).toFixed(3);
  if (p.t === "text") {
    const grow = uniform ? sy : 1;
    for (const run of p.runs ?? []) {
      if (typeof run.x === "number") run.x = X(run.x);
      if (typeof run.y === "number") run.y = Y(run.y);
      if (typeof run.dx === "number") run.dx = r2(run.dx * a * sx);
      if (typeof run.dy === "number") run.dy = r2(run.dy * d * sy);
    }
    [p.x, p.y] = [X(p.x), Y(p.y)];
    p.size = +(p.size * d * grow).toFixed(3);
    if (p.ls) p.ls = r2(p.ls * d * grow);
    if (p.sw) p.sw = +(p.sw * grow).toFixed(3);
  } else if (p.t === "rect") {
    [p.x, p.y, p.w, p.h] = [X(p.x), Y(p.y), r2(p.w * a * sx), r2(p.h * d * sy)];
    if (p.rx) p.rx = r2(p.rx * Math.min(a * sx, d * sy));
  } else if (p.t === "line") {
    [p.x1, p.y1, p.x2, p.y2] = [X(p.x1), Y(p.y1), X(p.x2), Y(p.y2)];
  } else {
    // A circle stretched one way is an ellipse from then on.
    const [rx, ry] = p.t === "circle" ? [p.r, p.r] : [p.rx, p.ry];
    Object.assign(p, { t: "ellipse", cx: X(p.cx), cy: Y(p.cy), rx: r2(rx * a * sx), ry: r2(ry * d * sy) });
    delete p.r;
  }
  return p;
}

let partSeq = 0;
const newPartId = () => `n${Date.now().toString(36)}${(partSeq++).toString(36)}`;

/** Adds a new part in the middle of the graphic and selects it. A graph that isn't custom yet becomes one. */
function canvasAdd(kind) {
  if (doc.meta.kind !== "custom") {
    const snap = takeSnapshot(canvas.view) ?? takeSnapshot("print");
    if (!snap) return status("There's nothing drawn to add to yet. Fix what the preview says first.", true);
    canvas.pending = { view: snap.view, size: snap.size, parts: snap.parts };
    canvas.view = snap.view;
  }
  canvasBeginEdit();
  const [w, hgt] = canvasDoc().size;
  const [cx, cy] = [r2(w / 2), r2(hgt / 2)];
  const accent = BRAND[0]?.base ?? "#D6001C";
  const part = {
    text: { t: "text", x: cx, y: cy, anchor: "middle", size: 12, fill: "#000000", runs: [{ s: "Text" }] },
    rect: { t: "rect", x: cx - 40, y: cy - 25, w: 80, h: 50, fill: accent },
    ellipse: { t: "ellipse", cx, cy, rx: 30, ry: 30, fill: accent },
    line: { t: "line", x1: cx - 50, y1: cy, x2: cx + 50, y2: cy, stroke: "#000000", sw: 1.5, cap: "round" },
  }[kind];
  part.id = newPartId();
  canvasDoc().parts.push(part);
  canvas.sel = new Set([part.id]);
  changed();
  if (kind === "text") canvasEditText(part.id, canvas.view);
}

/** Copies of the selected parts, a little down and to the right, selected in their place. */
function canvasDuplicate() {
  if (!canvas.sel.size || !canvasDoc()) return;
  canvasBeginEdit();
  const copies = canvasDoc().parts.filter((p) => canvas.sel.has(p.id)).map((p) => ({ ...structuredClone(p), id: newPartId(), dx: (p.dx ?? 0) + 8, dy: (p.dy ?? 0) + 8 }));
  canvasDoc().parts.push(...copies);
  canvas.sel = new Set(copies.map((p) => p.id));
  changed();
}

/** Moves the selected parts in front of everything, or behind it, keeping their order among themselves. */
function canvasOrder(front) {
  if (!canvas.sel.size || !canvasDoc()) return;
  canvasBeginEdit();
  const parts = canvasDoc().parts;
  const picked = parts.filter((p) => canvas.sel.has(p.id)), rest = parts.filter((p) => !canvas.sel.has(p.id));
  setParts(front ? [...rest, ...picked] : [...picked, ...rest]);
  changed();
}

/** Runs a change over the selected parts (of one kind, if given), as one step to undo. */
function canvasEach(fn, only) {
  if (!canvas.sel.size || !canvasDoc()) return;
  canvasBeginEdit();
  for (const id of canvas.sel) {
    const p = partById(id);
    if (p && (!only || only(p))) fn(p);
  }
  changed();
}
const isText = (p) => p.t === "text";
const isShape = (p) => p.t !== "text";
/** The size a part's text is drawn at, in the graphic's units: its own size times any scale it carries. */
const textScale = (p) => (Array.isArray(p.m) ? Math.hypot(p.m[2], p.m[3]) || 1 : 1);

/** A text part's words as typed: one line per row of it. */
function textOf(p) {
  return (p.runs ?? []).map((r, i) => (i && (r.x != null || r.y != null || (r.dy != null && r.dy !== 0)) ? "\n" : "") + r.s).join("");
}

/** Opens a text part for typing, in place. Enter finishes; Shift+Enter starts a new line; Escape leaves it as it was. */
function canvasEditText(id, v) {
  const p = partById(id);
  const el = canvasEl(v);
  const node = el?.querySelector(`[data-part="${CSS.escape(id)}"]`);
  if (!p || p.t !== "text" || !node) return;
  canvasCommitText();
  const base = el.getBoundingClientRect(), r = node.getBoundingClientRect();
  const px = (p.size * textScale(p)) / unitsPerPx(v);
  const box = h("textarea", { class: "canvas-edit", "aria-label": "Text", spellcheck: "false", value: textOf(p) });
  Object.assign(box.style, {
    left: `${r.left - base.left - 6}px`, top: `${r.top - base.top - 4}px`,
    minWidth: `${Math.max(120, r.width + 40)}px`, minHeight: `${Math.max(px * 1.6, r.height + 10)}px`,
    fontSize: `${Math.max(10, px)}px`, fontWeight: p.weight ?? 400, fontStyle: p.italic ? "italic" : "normal",
    fontFamily: p.serif ? '"Minion Pro", Georgia, serif' : '"Raleway", "Helvetica Neue", Arial, sans-serif',
  });
  let done = false;
  const finish = (save) => {
    if (done) return;
    done = true;
    canvas.editing = null;
    const value = box.value.replace(/\s+$/, "");
    box.remove();
    if (save && value !== textOf(p)) {
      canvasBeginEdit();
      const q = partById(id);
      if (!value.trim()) {
        setParts(canvasDoc().parts.filter((x) => x.id !== id));
        canvas.sel.delete(id);
      } else if (q) {
        q.runs = value.split("\n").map((line, i) => (i ? { s: line, x: q.x, dy: "1.25em" } : { s: line }));
      }
      return changed();
    }
    paintSelection();
  };
  box.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); finish(true); }
    if (e.key === "Escape") { e.preventDefault(); finish(false); }
  });
  box.addEventListener("blur", () => finish(true));
  canvas.editing = { finish };
  el.append(box);
  paintSelection();
  box.focus();
  box.select();
}

/** Finishes any text being typed on a canvas. */
function canvasCommitText() {
  canvas.editing?.finish(true);
}

function canvasDelete() {
  if (!canvas.sel.size || !canvasDoc()) return;
  canvasBeginEdit();
  setParts(canvasDoc().parts.filter((p) => !canvas.sel.has(p.id)));
  canvas.sel.clear();
  changed();
}

function canvasKey(e) {
  if (!canvasDoc()) return;
  const mod = e.metaKey || e.ctrlKey;
  const key = e.key;
  if (mod && key.toLowerCase() === "z") { e.preventDefault(); return canvasUndo(e.shiftKey); }
  if (mod && key.toLowerCase() === "y") { e.preventDefault(); return canvasUndo(true); }
  if (mod && key.toLowerCase() === "d") { e.preventDefault(); return canvasDuplicate(); }
  if (key === "Enter" && canvas.sel.size === 1 && partById([...canvas.sel][0])?.t === "text") {
    e.preventDefault();
    return canvasEditText([...canvas.sel][0], e.currentTarget.dataset.view);
  }
  if (mod && key.toLowerCase() === "a") {
    e.preventDefault();
    canvas.sel = new Set(canvasDoc().parts.map((p) => p.id));
    paintSelection();
    return updateCanvasTools();
  }
  if (mod || e.altKey) return;
  if (key === "Backspace" || key === "Delete") { e.preventDefault(); return canvasDelete(); }
  if (key === "Escape") {
    e.preventDefault();
    if (canvas.pending) return dropPending();
    canvas.sel.clear();
    paintSelection();
    return updateCanvasTools();
  }
  const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[key];
  if (!step || !canvas.sel.size) return;
  e.preventDefault();
  canvasBeginEdit();
  const by = e.shiftKey ? 10 : 1;
  for (const id of canvas.sel) {
    const p = partById(id);
    if (!p) continue;
    p.dx = (p.dx ?? 0) + step[0] * by;
    p.dy = (p.dy ?? 0) + step[1] * by;
  }
  changed();
}

/**
 * Colors the selection. As the main color ("fill"), parts that share a color are linked:
 * change one and the rest follow. As an outline ("line") it goes on just what's selected.
 * A null color takes the fill or the outline away.
 */
function canvasColor(hex, target = "fill") {
  if (!canvasDoc() || !canvas.sel.size || (hex !== null && !/^#[0-9a-f]{6}$/i.test(hex))) return;
  canvasBeginEdit();
  if (target === "line") {
    for (const id of canvas.sel) {
      const p = partById(id);
      if (!p || p.t === "text") continue;
      if (hex === null) {
        // Something with no fill is only its outline; leave it that.
        if (p.fill) { delete p.stroke; delete p.sw; }
      } else {
        p.stroke = hex;
        p.sw ??= 1.5;
      }
    }
    return changed();
  }
  const targets = new Set();
  for (const id of canvas.sel) {
    const p = partById(id);
    if (!p) continue;
    // A linked color is the same thing in every preview: a series, a group, a slice.
    if (p.k && hex !== null) VIEWS.forEach((v) => doc.custom.views[v].parts.filter((q) => q.k === p.k).forEach((q) => targets.add(q)));
    else targets.add(p);
  }
  for (const p of targets) {
    const was = paintOf(p);
    if (hex === null) {
      if (p.t !== "text" && p.fill) {
        // An empty shape still needs an outline to be seen.
        p.stroke ??= p.fill;
        p.sw ??= 1.5;
        delete p.fill;
      }
    } else if (p.t === "text" || p.fill || target === "fill" && !p.stroke) {
      // An outline in the same color as its fill is part of the same mark.
      if (p.t !== "text" && p.stroke && p.stroke === was) p.stroke = hex;
      p.fill = hex;
    } else {
      p.stroke = hex;
    }
  }
  changed();
}

const NEUTRALS = ["#000000", "#555555", "#8A8A8A", "#BBBBBB", "#FFFFFF"];

function colorPopover(target) {
  const c = canvasDoc();
  const swatch = (hex) => h("button", { class: "pick", style: `background:${hex}`, title: hex, "aria-label": hex, onclick: () => canvasColor(hex, target) });
  const row = (label, colors) => h("div", { class: "pick-row" }, h("span", { class: "pick-name" }, label), colors.map(swatch));
  const picker = h("input", { type: "color", value: "#1F6FB2", "aria-label": "Custom color" });
  const hexBox = h("input", { type: "text", class: "pick-hex", value: "#1F6FB2", "aria-label": "Custom color, as hex", spellcheck: "false" });
  picker.addEventListener("input", () => { hexBox.value = picker.value.toUpperCase(); });
  hexBox.addEventListener("input", () => { if (/^#[0-9a-f]{6}$/i.test(hexBox.value.trim())) picker.value = hexBox.value.trim().toLowerCase(); });
  const addCustom = () => {
    const hex = hexBox.value.trim().toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(hex)) return status("Write the color as six hex digits, like #1F6FB2.", true);
    // Using it makes the graph custom if it wasn't; the graph then keeps the color to pick again.
    canvasColor(hex, target);
    if (doc.meta.kind === "custom" && !doc.custom.swatches.includes(hex)) doc.custom.swatches.push(hex);
    changed();
  };
  return h("div", { class: "color-pop" },
    BRAND.map((b) => row(b.name[0].toUpperCase() + b.name.slice(1), b.ramp)),
    row("Neutral", NEUTRALS),
    c?.swatches?.length ? row("Custom", c.swatches) : null,
    h("div", { class: "pick-row" }, h("span", { class: "pick-name" }, "New"), picker, hexBox, h("button", { class: "btn small", onclick: addCustom }, "Add")),
    h("div", { class: "pick-row" }, h("span", { class: "pick-name" }), h("button", { class: "link", onclick: () => canvasColor(null, target) }, target === "line" ? "No outline" : "No fill")),
  );
}

/** The bar over the previews: things to add, and what can be done to the selection. */
function updateCanvasTools() {
  const box = $("#canvas-tools");
  if (!doc) return box.replaceChildren();
  const c = canvasDoc();
  const sel = c ? [...canvas.sel].map(partById).filter(Boolean) : [];
  const first = sel[0];
  if (!first) canvas.colors = false;
  const texts = sel.filter(isText), shapes = sel.filter(isShape);
  const toggle = (label, on, fn, cls = "") => h("button", { class: `btn small ${cls}`, "aria-pressed": on ? "true" : "false", onclick: fn }, label);
  const number = (label, value, fn, step = 1) => h("label", { class: "tool-num" }, label,
    h("input", { type: "number", min: "0", step: String(step), value: String(value), dataset: { cell: `tool:${label}` },
      onchange: (e) => { const v = parseFloat(e.target.value); if (Number.isFinite(v) && v >= 0) fn(v); } }));
  const pop = (target, label, color) => h("span", { class: "tool-pop" },
    h("button", { class: "btn small", "aria-expanded": canvas.colors === target ? "true" : "false", onclick: () => { canvas.colors = canvas.colors === target ? false : target; updateCanvasTools(); } },
      h("span", { class: "swatch", style: `background:${color || "transparent"}` }), ` ${label}`),
    canvas.colors === target ? colorPopover(target) : null);

  box.replaceChildren(...[
    h("span", { class: "tool-group" },
      h("button", { class: "btn small", onclick: () => canvasAdd("text") }, "+ Text"),
      h("button", { class: "btn small", onclick: () => canvasAdd("rect") }, "+ Box"),
      h("button", { class: "btn small", onclick: () => canvasAdd("ellipse") }, "+ Circle"),
      h("button", { class: "btn small", onclick: () => canvasAdd("line") }, "+ Line"),
    ),
    first && h("span", { class: "tool-group" },
      pop("fill", "Color", paintOf(first)),
      shapes.length ? pop("line", "Outline", shapes[0].stroke) : null,
      shapes.some((p) => p.stroke) ? number("Width", +(shapes.find((p) => p.stroke).sw ?? 1).toFixed(2), (v) => canvasEach((p) => { if (v > 0) p.sw = v; else if (p.fill) { delete p.stroke; delete p.sw; } }, (p) => isShape(p) && p.stroke), 0.25) : null,
    ),
    texts.length ? h("span", { class: "tool-group" },
      number("Size", +(texts[0].size * textScale(texts[0])).toFixed(1), (v) => canvasEach((p) => { if (v > 0) p.size = +(v / textScale(p)).toFixed(3); }, isText), 0.5),
      toggle("B", (texts[0].weight ?? 400) >= 600, () => { const on = (texts[0].weight ?? 400) >= 600; canvasEach((p) => { if (on) delete p.weight; else p.weight = 700; (p.runs ?? []).forEach((r) => delete r.w); }, isText); }, "tool-b"),
      toggle("I", !!texts[0].italic, () => { const on = !!texts[0].italic; canvasEach((p) => { if (on) delete p.italic; else p.italic = true; }, isText); }, "tool-i"),
      toggle("Serif", !!texts[0].serif, () => { const on = !!texts[0].serif; canvasEach((p) => { if (on) delete p.serif; else p.serif = true; }, isText); }),
      h("span", { class: "tool-seg" }, [["start", "Left"], ["middle", "Center"], ["end", "Right"]].map(([a, label]) =>
        toggle(label, (texts[0].anchor ?? "start") === a, () => canvasEach((p) => { if (a === "start") delete p.anchor; else p.anchor = a; }, isText)))),
    ) : null,
    first && h("span", { class: "tool-group" },
      h("button", { class: "btn small", onclick: () => canvasOrder(true) }, "To front"),
      h("button", { class: "btn small", onclick: () => canvasOrder(false) }, "To back"),
      h("button", { class: "btn small", onclick: canvasDuplicate }, "Duplicate"),
      h("button", { class: "btn small", onclick: canvasDelete }, "Delete"),
    ),
    h("span", { class: "tool-group" },
      h("button", { class: "btn small", disabled: !canvas.undo.length, onclick: () => canvasUndo() }, "Undo"),
      h("button", { class: "btn small", disabled: !canvas.redo.length, onclick: () => canvasUndo(true) }, "Redo"),
    ),
  ].filter(Boolean));
}

/** The Type bar's Custom button: takes the print preview apart as it stands. */
function makeCustom() {
  const snap = takeSnapshot("print");
  if (!snap) return status("There's nothing drawn to take apart yet. Fix what the preview says first.", true);
  canvas.pending = { view: "print", size: snap.size, parts: snap.parts };
  canvas.view = "print";
  canvas.sel.clear();
  canvasBeginEdit();
  changed();
}

// ── Editing on the preview (flow graphs) ──────────────────
//
// The flow renderer tags each bar and label with data-node. Dragging one moves it on the
// spot; letting go saves where it landed in the bar's settings and redraws, so the bands
// follow. The preview frame is same-origin, so its document takes listeners directly; its
// own pointer coordinates are in the graphic's px whatever the zoom.

/** Makes el draggable, carrying partners along; done(dx, dy) runs if it actually moved. */
function draggable(fdoc, el, partners, done) {
  el.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    const [sx, sy] = [e.clientX, e.clientY];
    let [dx, dy] = [0, 0];
    const moved = () => Math.hypot(dx, dy) > 2;
    const move = (ev) => {
      [dx, dy] = [ev.clientX - sx, ev.clientY - sy];
      if (!moved()) return;
      fdoc.documentElement.classList.add("dragging");
      for (const p of [el, ...partners]) p.setAttribute("transform", `translate(${dx} ${dy})`);
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      fdoc.documentElement.classList.remove("dragging");
      if (moved()) done(dx, dy);
      else for (const p of [el, ...partners]) p.removeAttribute("transform");
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  });
}

function attachFlowEditing(frame) {
  if (doc?.meta.kind !== "flow") return;
  const fdoc = frame.contentDocument;
  const svg = fdoc?.querySelector("svg.flow");
  if (!svg) return;
  const style = fdoc.createElement("style");
  style.textContent = `
    .flow rect[data-node] { cursor: grab; }
    .flow rect[data-node]:hover { stroke: #000000; stroke-width: 1px; }
    .flow .flow-label[data-node] { cursor: move; }
    .flow .flow-label[data-node]:hover .name { text-decoration: underline; }
    html.dragging, html.dragging * { cursor: grabbing !important; user-select: none; }`;
  fdoc.head.append(style);

  const top = Number(svg.dataset.top), plotH = Number(svg.dataset.plotH);
  const cols = svg.dataset.cols.split(",").map(Number);
  const nearestColumn = (x) => cols.reduce((best, cx, i) => (Math.abs(cx - x) < Math.abs(cols[best] - x) ? i : best), 0);
  const labelOf = (name) => [...svg.querySelectorAll(".flow-label[data-node]")].find((el) => el.dataset.node === name);

  // A bar: up and down places it; dropped nearer another column, it moves there.
  for (const bar of svg.querySelectorAll("rect[data-node]")) {
    const name = bar.dataset.node;
    const label = labelOf(name);
    draggable(fdoc, bar, label ? [label] : [], (dx, dy) => {
      const s = flowSettings(name);
      const x = Number(bar.getAttribute("x")), y = Number(bar.getAttribute("y"));
      const [from, to] = [nearestColumn(x), nearestColumn(x + dx)];
      if (to !== from) s.column = String(to + 1);
      s.y = Math.round(Math.min(1, Math.max(0, (y + dy - top) / plotH)) * 1e4) / 1e4;
      rerender();
      changed();
    });
  }

  // A label: drag to nudge it, double-click to rename its bar.
  for (const label of svg.querySelectorAll(".flow-label[data-node]")) {
    const name = label.dataset.node;
    draggable(fdoc, label, [], (dx, dy) => {
      const s = flowSettings(name);
      const [ox, oy] = s.label ?? [0, 0];
      s.label = [Math.round(ox + dx), Math.round(oy + dy)];
      rerender();
      changed();
    });
    label.addEventListener("dblclick", (e) => {
      e.preventDefault();
      renameOnPreview(frame, label, name);
    });
  }
}

/** An input over the label on the preview; Enter or clicking away renames, Escape doesn't. */
function renameOnPreview(frame, label, name) {
  const fr = frame.getBoundingClientRect();
  const r = label.getBoundingClientRect();
  const z = previewZoom;
  const input = h("input", { class: "inline-rename", type: "text", value: name, "aria-label": `Rename ${name}` });
  Object.assign(input.style, {
    left: `${fr.left + r.left * z - 5}px`,
    top: `${fr.top + r.top * z - 4}px`,
    minWidth: `${Math.max(140, r.width * z + 30)}px`,
  });
  document.body.append(input);
  input.focus();
  input.select();
  let finished = false;
  const finish = (save) => {
    if (finished) return;
    finished = true;
    const next = input.value.trim();
    input.remove();
    if (save && next && next !== name) renameFlowNode(name, next);
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); finish(true); }
    if (e.key === "Escape") { e.preventDefault(); finish(false); }
  });
  input.addEventListener("blur", () => finish(true));
}

/** Renames a bar everywhere the rows mention it, keeping its settings. */
function renameFlowNode(from, to) {
  for (const r of doc.flow.rows) {
    if (String(r[0]).trim() === from) r[0] = to;
    if (String(r[1]).trim() === from) r[1] = to;
  }
  if (doc.flow.nodes[from]) {
    doc.flow.nodes[to] ??= doc.flow.nodes[from];
    delete doc.flow.nodes[from];
  }
  status(`Renamed “${from}” to “${to}”.`);
  rerender();
  changed();
}

/** Back to the automatic layout: clears every bar's color, column, position and label nudge. */
function resetFlowLayout() {
  if (!flowCustomized()) return;
  if (!confirm("Put every bar and label back where the defaults put them? This clears the colors, columns and positions set by hand.")) return;
  doc.flow.nodes = {};
  rerender();
  changed();
  status("Back to the defaults.");
}

function updateFlowTools() {
  const flow = doc?.meta.kind === "flow";
  $("#edit-hint").hidden = !flow;
  $("#reset-layout").hidden = !flow;
  $("#reset-layout").disabled = !flowCustomized();
}

// ── Start ─────────────────────────────────────────────────

$("#new").addEventListener("click", newGraph);
$("#save").addEventListener("click", () => save());
$("#export-pdf").addEventListener("click", exportPdf);
$("#export-png").addEventListener("click", exportPng);
$("#filter").addEventListener("input", renderList);
$("#zoom").addEventListener("change", layoutFrame);
for (const v of VIEWS) {
  canvasEl(v).addEventListener("pointerdown", canvasPointerDown);
  canvasEl(v).addEventListener("keydown", canvasKey);
  canvasEl(v).addEventListener("dblclick", (e) => {
    const id = hitPart(e.currentTarget, e.clientX, e.clientY, e.target);
    if (id && partById(id)?.t === "text") {
      canvas.sel = new Set([id]);
      canvasEditText(id, v);
    }
  });
}
for (const v of Object.keys(LIVE)) liveFrame(v).src = "/graph/live";
$("#reset-layout").addEventListener("click", resetFlowLayout);
window.addEventListener("resize", layoutFrame);
window.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    save();
  }
});
window.addEventListener("beforeunload", (e) => {
  if (isDirty()) { e.preventDefault(); e.returnValue = ""; }
});
window.addEventListener("hashchange", () => {
  const name = decodeURIComponent(location.hash.slice(1));
  if (name && name !== doc?.loadedName) openGraph(name);
});

(async () => {
  try {
    applySettings(await api("GET", "/api/graph/settings"));
  } catch {
    // The built-in colors still work if the settings can't be read.
  }
  try {
    await loadList();
  } catch (err) {
    return status(`Couldn't load the graphs: ${err.message}`, true, true);
  }
  const want = decodeURIComponent(location.hash.slice(1));
  if (want && graphs.some((g) => g.name === want)) await openGraph(want, { force: true });
  else if (graphs.length) await openGraph([...graphs].sort((a, b) => b.updated - a.updated)[0].name, { force: true });
  else newGraph();
})();
