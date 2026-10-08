// The Polytechnic — graph editor.
//
// Holds one graph at a time as an editable "doc" (strings, as typed), turns it into the
// graph file format for preview and save, and leaves rendering to the server so the
// preview is the same renderer the exports use. Exports are made here in the browser:
// the PDF through the print dialog, the PNG by drawing the page onto a canvas.
// Served at poly.rpi.edu/graph; the API is app/api/graph/, the renderer lib/graph/.

// ── Constants ─────────────────────────────────────────────

const KINDS = [
  { id: "ring", label: "Ring", icon: '<circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="4"/>' },
  { id: "pie", label: "Pie", icon: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 12V3a9 9 0 0 1 8.2 12.7Z" fill="currentColor"/>' },
  { id: "pie3d", label: "3D pie", icon: '<ellipse cx="12" cy="10" rx="9" ry="5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 10v4c0 2.8 4 5 9 5s9-2.2 9-5v-4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 10V5a9 5 0 0 1 8.6 6.4Z" fill="currentColor"/>' },
  { id: "bar", label: "Bar", icon: '<rect x="3" y="4" width="17" height="4" rx="1" fill="currentColor"/><rect x="3" y="10" width="11" height="4" rx="1" fill="currentColor"/><rect x="3" y="16" width="6" height="4" rx="1" fill="currentColor"/>' },
  { id: "column", label: "Column", icon: '<rect x="4" y="11" width="4" height="10" rx="1" fill="currentColor"/><rect x="10" y="5" width="4" height="16" rx="1" fill="currentColor"/><rect x="16" y="14" width="4" height="7" rx="1" fill="currentColor"/>' },
  { id: "line", label: "Line", icon: '<path d="M3 18l5-6 4 3 8-10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' },
  { id: "scatter", label: "Scatter", icon: '<circle cx="6" cy="16" r="2.4" fill="currentColor"/><circle cx="11" cy="9" r="2.4" fill="currentColor"/><circle cx="17" cy="13" r="2.4" fill="currentColor"/><circle cx="18" cy="5" r="2.4" fill="currentColor"/>' },
];
const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.id, k.label]));
const SLICED = ["ring", "pie", "pie3d"];
const ITEM_KINDS = [...SLICED, "bar"];
const TABLE_KINDS = ["column", "line"];

const GROUP_COLORS = ["red", "purple"];
const SERIES_COLORS = ["red", "purple", "orange", "lavender"];
const HEX = { red: "#D6001C", purple: "#6A35A0", orange: "#D9702A", lavender: "#9A64C8" };
const MAX_SLICES = 5;

// Keys the editor writes. Anything else in a file (hand-tuned settings) is carried through as is.
const KNOWN = new Set([
  "kicker", "title", "dek", "kind", "width", "items", "combine", "color", "centerLabel", "valueLabel", "sort",
  "columns", "colors", "rows", "stacked", "points", "x", "y", "prefix", "suffix", "othersLabel", "aspect", "source", "credit",
]);

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
const emptyPoint = () => ({ label: "", x: "", y: "", highlight: false, labelAt: "right", note: "", _raw: {} });
const emptyAxis = () => ({ label: "", short: "", unit: "", scale: "linear", min: "", max: "" });

function blankDoc(kind = "ring") {
  return {
    name: "",
    loadedName: null,
    raw: {},
    meta: {
      kind, kicker: "", title: "", dek: "", source: "", credit: "", width: "3.5",
      centerLabel: "total", valueLabel: "Reports", sort: true, prefix: "", suffix: "", stacked: false,
      xLabel: "", yLabel: "", yMin: "", yMax: "", yZero: "auto", aspect: "", othersLabel: "",
    },
    groups: [{ name: "", color: "red", ref: null, rows: emptyRows(4, 2) }],
    table: { columns: ["Category", "Series 1"], colors: ["red"], rows: emptyRows(5, 2) },
    scatter: { x: emptyAxis(), y: emptyAxis(), points: Array.from({ length: 4 }, emptyPoint) },
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
    raw: a,
  };
}

/** A graph file → an editable doc. */
function fromFile(g, name) {
  const d = blankDoc(g.kind ?? "ring");
  d.name = name;
  d.loadedName = name;
  d.raw = structuredClone(g);
  Object.assign(d.meta, {
    kicker: str(g.kicker), title: str(g.title), dek: str(g.dek), source: str(g.source), credit: str(g.credit),
    width: str(g.width ?? 3.5), centerLabel: g.centerLabel ?? "total", valueLabel: g.valueLabel ?? "Reports",
    sort: g.sort !== false, prefix: str(g.prefix), suffix: str(g.suffix), stacked: !!g.stacked,
    aspect: str(g.aspect), othersLabel: str(g.othersLabel),
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
      colors: g.columns.slice(1).map((_, i) => g.colors?.[i] ?? SERIES_COLORS[i] ?? "red"),
      rows: (g.rows ?? []).map((r) => g.columns.map((_, i) => str(r?.[i]))),
    };
  }
  if (TABLE_KINDS.includes(g.kind)) {
    Object.assign(d.meta, {
      xLabel: joinLines(g.x?.label), yLabel: joinLines(g.y?.label),
      yMin: str(g.y?.min), yMax: str(g.y?.max),
      yZero: g.y?.zero === true ? "yes" : g.y?.zero === false ? "no" : "auto",
    });
  }
  if (g.points) {
    d.scatter = {
      x: axisFrom(g.x),
      y: axisFrom(g.y),
      points: g.points.map((p) => ({
        label: str(p.label), x: str(p.x), y: str(p.y), highlight: !!p.highlight,
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
  }

  if (kind === "bar" || TABLE_KINDS.includes(kind)) {
    if (m.prefix) out.prefix = m.prefix;
    if (m.suffix) out.suffix = m.suffix;
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
      return o;
    };
    out.x = axisOut(s.x);
    out.y = axisOut(s.y);
    const asp = parseNum(m.aspect);
    if (asp) out.aspect = asp;
    if (m.othersLabel) out.othersLabel = m.othersLabel;
    out.points = [];
    s.points.forEach((p) => {
      if (blank(p.label) && blank(p.x) && blank(p.y)) return;
      const x = parseNum(p.x), y = parseNum(p.y);
      if (x === null || y === null) {
        return warnings.push(`${p.label.trim() ? `“${p.label.trim()}”` : "An unnamed point"} needs both an x and a y number, so it's left out.`);
      }
      const o = { ...p._raw };
      for (const k of ["label", "x", "y", "highlight", "labelAt", "note"]) delete o[k];
      const pt = {};
      if (!blank(p.label)) pt.label = p.label.trim();
      Object.assign(pt, { x, y });
      if (p.highlight) pt.highlight = true;
      if (p.labelAt && p.labelAt !== "right") pt.labelAt = p.labelAt;
      Object.assign(pt, o);
      if (!blank(p.note)) pt.note = splitLines(p.note);
      out.points.push(pt);
    });
  }

  out.source = m.source;
  out.credit = m.credit;
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

/** Pasted rows → a table with a header row of series names. */
function pasteTable(rows) {
  const body = rows.filter((r) => r.length);
  if (!body.length) return null;
  const first = body[0];
  const header = first.slice(1).some((c) => !isNumCell(c) && !blank(c)) || first.every((c) => !isNumCell(c));
  const width = Math.max(...body.map((r) => r.length), 2);
  const columns = header ? first.concat(Array(width).fill("")).slice(0, width) : ["Category", ...Array.from({ length: width - 1 }, (_, i) => `Series ${i + 1}`)];
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
    const [label, x, y] = named ? [r[0], r[1], r[2]] : ["", r[0], r[1]];
    return { ...emptyPoint(), label: label ?? "", x: x ?? "", y: y ?? "" };
  });
  return { header, points };
}

function applyPaste(text, mode = "replace") {
  const rows = parseClipboard(text);
  if (!rows.some((r) => r.length)) return status("There's nothing in the paste box.", true);
  const kind = doc.meta.kind;

  if (ITEM_KINDS.includes(kind)) {
    let groups = pasteItems(rows);
    if (!groups.length) return status("Couldn't find any rows with a label and a number.", true);
    if (mode === "append") {
      const target = doc.groups.findLast((g) => !g.ref) ?? doc.groups[0];
      target.rows = target.rows.filter((r) => !r.every(blank)).concat(groups.flatMap((g) => g.rows));
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
      // Two groups can't share a color.
      if (doc.groups.length === 2 && doc.groups[0].color === doc.groups[1].color) doc.groups[1].color = doc.groups[0].color === "red" ? "purple" : "red";
      if (groups.length === 1 && groups[0].name && blank(doc.meta.title)) doc.meta.title = groups[0].name;
    }
  } else if (TABLE_KINDS.includes(kind)) {
    const t = pasteTable(rows);
    if (!t) return;
    if (t.columns.length - 1 > SERIES_COLORS.length) {
      status(`Only ${SERIES_COLORS.length} series fit; columns after that were left off.`, true);
      t.columns = t.columns.slice(0, SERIES_COLORS.length + 1);
      t.rows = t.rows.map((r) => r.slice(0, SERIES_COLORS.length + 1));
    }
    if (mode === "append" && t.columns.length === doc.table.columns.length) {
      doc.table.rows = doc.table.rows.filter((r) => !r.every(blank)).concat(t.rows);
    } else {
      doc.table = { columns: t.columns, colors: t.columns.slice(1).map((_, i) => doc.table.colors[i] ?? SERIES_COLORS[i]), rows: t.rows };
      fixSeriesColors();
    }
  } else {
    const p = pastePoints(rows);
    if (!p) return;
    const s = doc.scatter;
    if (p.header) {
      const [, xh, yh] = !isNumCell(p.header[0]) && p.header.length >= 3 ? p.header : ["", p.header[0], p.header[1]];
      if (blank(s.x.label) && xh) s.x.label = xh;
      if (blank(s.y.label) && yh) s.y.label = yh;
    }
    s.points = mode === "append" ? s.points.filter((q) => !(blank(q.label) && blank(q.x) && blank(q.y))).concat(p.points) : p.points;
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
  doc = blankDoc(doc?.meta.kind ?? "ring");
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
  updateDirty();
  updateComputed();
  updateWarnings();
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
  doc.meta.kind = kind;
  rerender();
  changed();
}

// ── Data editors ──────────────────────────────────────────

function pasteBox() {
  const ta = h("textarea", { placeholder: "Copy cells in Excel, Google Sheets or Numbers and paste them here.", "aria-label": "Spreadsheet data" });
  const kind = doc.meta.kind;
  const how = ITEM_KINDS.includes(kind)
    ? "Two columns: label, then number. A header row is skipped. Leave a blank row between blocks to make two groups."
    : TABLE_KINDS.includes(kind)
      ? "First column is the category (a year, a month, a name); each other column is a series. The first row names the series."
      : "Columns: label, x, y. A header row names the axes. Points without a label show as gray context.";
  const hasData =
    ITEM_KINDS.includes(kind) ? doc.groups.some((g) => g.ref || g.rows.some((r) => !r.every(blank)))
    : TABLE_KINDS.includes(kind) ? doc.table.rows.some((r) => !r.every(blank))
    : doc.scatter.points.some((p) => !blank(p.x));
  return h("details", { class: "paste", open: !hasData },
    h("summary", {}, "Paste from a spreadsheet"),
    ta,
    h("div", { class: "paste-actions" },
      h("button", { class: "btn small", onclick: () => applyPaste(ta.value, "replace") }, "Replace data"),
      h("button", { class: "btn small", onclick: () => applyPaste(ta.value, "append") }, "Add to data"),
      h("span", { class: "hint" }, how)
    ),
  );
}

function dataEditor() {
  const kind = doc.meta.kind;
  const body = ITEM_KINDS.includes(kind) ? itemsEditor() : TABLE_KINDS.includes(kind) ? tableEditor() : pointsEditor();
  return [pasteBox(), body, h("div", { id: "warnings" })];
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

function cellInput(grid, ri, ci, prefix, { num = false, width, makeRow, onWide, placeholder, sync } = {}) {
  const v = grid[ri][ci] ?? "";
  return h("input", {
    type: "text", value: v, placeholder, inputmode: num ? "decimal" : null,
    class: num && !blank(v) && parseNum(v) === null ? "bad" : null,
    dataset: { cell: `${prefix}:${ri}:${ci}` },
    "aria-label": placeholder,
    oninput: (e) => {
      grid[ri][ci] = e.target.value;
      sync?.();
      if (num) e.target.classList.toggle("bad", !blank(e.target.value) && parseNum(e.target.value) === null);
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
                  if (other) other.color = GROUP_COLORS.find((c) => c !== g.color);
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
      !canAdd && h("span", { class: "hint" }, `A graph holds up to ${GROUP_COLORS.length} groups, one red and one purple.`),
    ),
  ];
}

function focusLast(prefix, ri) {
  $(`[data-cell="${CSS.escape(`${prefix}:${ri}:0`)}"]`)?.focus();
}

function addGroup() {
  const used = doc.groups.map((g) => g.color ?? g.refColor);
  if (doc.groups.length === 1 && !doc.groups[0].name) doc.groups[0].name = "Group 1";
  doc.groups.push({ name: `Group ${doc.groups.length + 1}`, color: GROUP_COLORS.find((c) => !used.includes(c)) ?? "purple", ref: null, rows: emptyRows(3, 2) });
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

function fixSeriesColors() {
  const t = doc.table;
  const used = new Set();
  t.colors = t.columns.slice(1).map((_, i) => {
    let c = t.colors[i];
    if (!c || used.has(c)) c = SERIES_COLORS.find((x) => !used.has(x));
    used.add(c);
    return c;
  });
}

function tableEditor() {
  const t = doc.table;
  const width = t.columns.length;
  const makeRow = () => Array(t.columns.length).fill("");
  const widen = (n) => {
    const target = Math.min(n, SERIES_COLORS.length + 1);
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
                const clash = t.colors.indexOf(e.target.value);
                if (clash >= 0) t.colors[clash] = prev; // swap, so no two series share a color
                t.colors[i] = e.target.value;
                rerender();
                changed();
              },
            }, SERIES_COLORS.map((x) => h("option", { value: x }, x[0].toUpperCase() + x.slice(1)))),
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
      t.columns.length - 1 < SERIES_COLORS.length
        ? h("button", { class: "link", onclick: addSeries }, "+ Add series")
        : h("span", { class: "hint" }, `Up to ${SERIES_COLORS.length} series.`),
    ),
  ];
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
    h("div", { class: "scroll-x" },
      h("table", { class: "grid" },
        h("thead", {}, h("tr", {},
          h("th", {}, "Label"), h("th", { class: "num" }, "X"), h("th", { class: "num" }, "Y"),
          h("th", { title: "Draw in the masthead red" }, "Focus"), h("th", {}, "Label side"), h("th", {}, "Note"), h("th", {}))),
        h("tbody", {}, s.points.map((p, ri) =>
          h("tr", {},
            h("td", {}, cell(ri, 0, { placeholder: "Label" })),
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

  if (kind === "bar" || TABLE_KINDS.includes(kind)) {
    out.push(h("div", { class: "row2" },
      field(m, "prefix", "Before numbers", { placeholder: "$" }),
      field(m, "suffix", "After numbers", { placeholder: "%" })));
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
    if (kind === "column") out.push(checkbox(m, "stacked", "Stack the series"));
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
      );
    out.push(axisBox(s.x, "X"), axisBox(s.y, "Y"));
    out.push(h("div", { class: "row2" },
      field(m, "aspect", "Plot height", { placeholder: "0.78", hint: "As a share of the plot's width." }),
      field(m, "othersLabel", "Key name for unlabeled points", { placeholder: "Others" })));
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

function updateWarnings() {
  const box = $("#warnings");
  if (!box || !doc) return;
  const { warnings } = toFile(doc);
  box.replaceChildren(...(warnings.length ? [h("div", { class: "warn" }, warnings.slice(0, 6).map((w) => h("div", {}, w)), warnings.length > 6 && h("div", {}, `…and ${warnings.length - 6} more.`))] : []));
  renderFileName();
}

// ── Preview ───────────────────────────────────────────────

let previewTimer, previewSeq = 0, front = 0, lastSize = null;

function schedulePreview() {
  clearTimeout(previewTimer);
  $("#frame").classList.add("stale");
  previewTimer = setTimeout(runPreview, 250);
}

async function runPreview(plotH = null) {
  if (!doc) return;
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
    if (SLICED.includes(doc.meta.kind) && g >= 0) errBox.append(h("button", { class: "btn small", onclick: () => foldOther(g) }, "Fold the smallest into “Other”"));
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
    $("#frame").classList.remove("stale");
  };
  back.srcdoc = r.html;
}

function layoutFrame() {
  if (!lastSize) return;
  const zoomSel = $("#zoom").value;
  const stage = $("#stage");
  const avail = stage.clientWidth - 48;
  const z = zoomSel === "fit" ? Math.max(0.5, Math.min(2.5, avail / lastSize.w)) : Number(zoomSel);
  const frame = $("#frame");
  frame.style.width = `${lastSize.w * z}px`;
  frame.style.height = `${lastSize.h * z}px`;
  for (const f of frame.querySelectorAll("iframe")) {
    f.style.width = `${lastSize.w}px`;
    f.style.height = `${lastSize.h}px`;
    f.style.transform = `scale(${z})`;
  }
  $("#size").textContent = `Prints ${fmtIn(lastSize.widthIn)} × ${fmtIn(lastSize.heightIn)} in${zoomSel === "fit" ? ` · shown at ${Math.round(z * 100)}%` : ""}`;
}
const fmtIn = (v) => (Math.round(v * 100) / 100).toString();

// ── Start ─────────────────────────────────────────────────

$("#new").addEventListener("click", newGraph);
$("#save").addEventListener("click", () => save());
$("#export-pdf").addEventListener("click", exportPdf);
$("#export-png").addEventListener("click", exportPng);
$("#filter").addEventListener("input", renderList);
$("#zoom").addEventListener("change", layoutFrame);
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
    await loadList();
  } catch (err) {
    return status(`Couldn't load the graphs: ${err.message}`, true, true);
  }
  const want = decodeURIComponent(location.hash.slice(1));
  if (want && graphs.some((g) => g.name === want)) await openGraph(want, { force: true });
  else if (graphs.length) await openGraph([...graphs].sort((a, b) => b.updated - a.updated)[0].name, { force: true });
  else newGraph();
})();
