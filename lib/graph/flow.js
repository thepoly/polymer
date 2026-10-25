import { esc } from "./template.js";
import { SERIES, SERIES_ORDER, CONTEXT } from "./palette.js";
import { fmtNum, textWidth, spreadLabels } from "./axis.js";

// A flow graph (a Sankey diagram): bars joined by bands as thick as the amounts they carry.
// It draws whatever the rows describe: one bar splitting into parts and the parts splitting
// again, several sources merging into one, bands that skip a column, any mix of those.
//
//   "flows": [["Tuition", "Revenue", 300], ["Gifts", "Revenue", 80],
//             ["Revenue", "Instruction", 210], ["Revenue", "Research", 170, "purple"]]
//
// A name is one bar wherever it appears. A row may end with a color to paint just that band.
// "nodes" sets a bar's color or column (counting from 1) by name, and keeps what was done by
// hand in the editor: "y" is where the bar's top was dragged to, as a share of the plot's
// height, and "label" is how far its label was nudged, in px.
//
//   "nodes": [{ "name": "Research", "color": "red", "column": 3, "y": 0.42, "label": [0, -6] }]
//
// The layout is d3-sankey's: bars start stacked in their columns, then are pulled toward
// the bars they connect to, back and forth, while columns keep them from overlapping.

const f = (n) => n.toFixed(2);

const BAR = 6; // bar width, px
const PAD = 8; // most space between bars in a column, px (less if a column is crowded)
const LABEL_GAP = 11; // least distance between label baselines, px (7.5pt type)
const ITERATIONS = 32;
const MAX_NODES = 80;
const MAX_COLUMNS = 8;

const INK = "#1a1a1a";
const COLORS = { ...SERIES, gray: CONTEXT, ink: INK };
const NEUTRAL = new Set([CONTEXT, INK]);

// The settings a flow file can carry; the first of each list is the default.
export const FLOW_COLORS = [...SERIES_ORDER, "gray", "ink"];
export const FLOW_OPTIONS = {
  palette: ["branches", "red", "gray"],
  colorBy: ["source", "target"],
  align: ["left", "justify", "right", "center"],
  order: ["auto", "data", "size"],
  labels: ["value", "percent", "both", "name"],
};

const colorFor = (name, where) => {
  if (name == null || name === "") return null;
  if (!Object.hasOwn(COLORS, name)) throw new Error(`Unknown color "${name}" ${where}. Use one of: ${FLOW_COLORS.join(", ")}.`);
  return COLORS[name];
};

function option(g, key) {
  const allowed = FLOW_OPTIONS[key];
  const v = g[key];
  if (v == null || v === "") return allowed[0];
  if (!allowed.includes(v)) throw new Error(`"${v}" isn't a choice for ${key}. Use one of: ${allowed.join(", ")}.`);
  return v;
}

/** Nodes in an order where every flow runs from an earlier node to a later one, or an error naming a loop. */
function topoOrder(nodes) {
  const indegree = new Map(nodes.map((n) => [n, n.targetLinks.length]));
  const ready = nodes.filter((n) => indegree.get(n) === 0);
  const order = [];
  while (ready.length) {
    const n = ready.shift();
    order.push(n);
    for (const l of n.sourceLinks) {
      indegree.set(l.target, indegree.get(l.target) - 1);
      if (indegree.get(l.target) === 0) ready.push(l.target);
    }
  }
  if (order.length < nodes.length) {
    // Walk forward from any node left over until a name repeats: that's the loop.
    const left = new Set(nodes.filter((n) => !order.includes(n)));
    let n = [...left][0];
    const path = [];
    while (!path.includes(n)) {
      path.push(n);
      n = n.sourceLinks.map((l) => l.target).find((t) => left.has(t));
    }
    const loop = [...path.slice(path.indexOf(n)), n].map((x) => `“${x.name}”`).join(" → ");
    throw new Error(`These flows go round in a circle: ${loop}. Every flow has to move to the right.`);
  }
  return order;
}

export function buildFlow(g) {
  const rows = (g.flows ?? []).filter((r) => Array.isArray(r) && r.slice(0, 3).some((c) => String(c ?? "").trim() !== ""));
  if (!rows.length) throw new Error("Add a row for each flow: where it comes from, where it goes, and how much.");

  const byName = new Map();
  const nodeFor = (name) => {
    if (!byName.has(name)) byName.set(name, { name, index: byName.size, sourceLinks: [], targetLinks: [] });
    return byName.get(name);
  };
  const pairs = new Map();
  const links = [];
  rows.forEach((r, i) => {
    const from = String(r[0] ?? "").trim(), to = String(r[1] ?? "").trim();
    const where = from && to ? `“${from} → ${to}”` : `Row ${i + 1}`;
    if (!from || !to) throw new Error(`${where} needs both where it comes from and where it goes.`);
    if (from === to) throw new Error(`“${from}” can't flow into itself.`);
    const value = r[2];
    if (!(typeof value === "number" && Number.isFinite(value) && value > 0)) throw new Error(`${where} needs an amount above zero.`);
    const color = colorFor(r[3], `on ${where}`);
    // The same pair written twice is one band carrying both amounts.
    const key = JSON.stringify([from, to]);
    if (pairs.has(key)) {
      const l = pairs.get(key);
      l.value += value;
      l.color ??= color;
      return;
    }
    const link = { source: nodeFor(from), target: nodeFor(to), value, color, index: links.length };
    link.source.sourceLinks.push(link);
    link.target.targetLinks.push(link);
    pairs.set(key, link);
    links.push(link);
  });
  const nodes = [...byName.values()];
  if (nodes.length > MAX_NODES) throw new Error(`${nodes.length} bars is more than one graph can label. Keep it to ${MAX_NODES}.`);

  // Per-bar settings, by name. Names no flow mentions any more are ignored.
  for (const s of g.nodes ?? []) {
    const n = byName.get(String(s?.name ?? "").trim());
    if (!n) continue;
    n.explicitColor = colorFor(s.color, `for “${n.name}”`);
    if (s.column != null && s.column !== "") {
      if (!(Number.isInteger(s.column) && s.column >= 1 && s.column <= MAX_COLUMNS)) {
        throw new Error(`“${n.name}” is set to column ${s.column}. Columns run from 1 to ${MAX_COLUMNS}.`);
      }
      n.fixedLayer = s.column - 1;
    }
    if (typeof s.y === "number" && s.y >= 0 && s.y <= 1) n.placed = s.y;
    if (Array.isArray(s.label) && s.label.length === 2 && s.label.every((v) => Number.isFinite(v) && Math.abs(v) <= 2000)) {
      n.nudge = s.label;
    }
  }

  const order = topoOrder(nodes);
  for (const n of order) n.depth = Math.max(0, ...n.targetLinks.map((l) => l.source.depth + 1));
  for (const n of [...order].reverse()) n.height = Math.max(0, ...n.sourceLinks.map((l) => l.target.height + 1));
  const last = Math.max(...nodes.map((n) => n.depth));

  // Left: each bar one column right of whatever feeds it, so a part that stops splitting ends
  // where it is. Justify: everything that ends, ends at the right edge.
  const align = option(g, "align");
  for (const n of nodes) {
    n.layer =
      align === "left" ? n.depth
      : align === "right" ? last - n.height
      : align === "center" ? (n.targetLinks.length ? n.depth : n.sourceLinks.length ? Math.min(...n.sourceLinks.map((l) => l.target.depth)) - 1 : 0)
      : n.sourceLinks.length ? n.depth : last;
    if (n.fixedLayer != null) n.layer = n.fixedLayer;
  }
  for (const l of links) {
    if (l.target.layer <= l.source.layer) {
      throw new Error(`“${l.target.name}” is in column ${l.target.layer + 1}, but “${l.source.name}” in column ${l.source.layer + 1} flows into it. Flows have to move right.`);
    }
  }
  const columns = Math.max(...nodes.map((n) => n.layer)) + 1;
  if (columns > MAX_COLUMNS) throw new Error(`${columns} columns is more than fits. Keep it to ${MAX_COLUMNS}.`);

  for (const n of nodes) {
    const sum = (ls) => ls.reduce((a, l) => a + l.value, 0);
    n.inflow = sum(n.targetLinks);
    n.outflow = sum(n.sourceLinks);
    n.value = Math.max(n.inflow, n.outflow);
  }
  const sources = nodes.filter((n) => !n.targetLinks.length);
  const total = sources.reduce((a, n) => a + n.value, 0);

  // Colors. "branches": one source is ink and its parts take a color each; several sources
  // take a color each. Past four, the rest are gray. A bar fed by one color keeps it, so a
  // branch stays its color as it splits; a bar where colors meet is ink, since it mixes them.
  // "red" and "gray" paint everything one color, apart from bars set by name and what they
  // feed most.
  const palette = option(g, "palette");
  const base = palette === "red" ? SERIES.red : palette === "gray" ? CONTEXT : null;
  const anchorColor = new Map();
  if (palette === "branches") {
    const anchors = sources.length === 1 ? sources[0].sourceLinks.map((l) => l.target) : sources;
    [...anchors]
      .sort((a, b) => b.value - a.value || a.index - b.index)
      .forEach((n, i) => anchorColor.set(n, SERIES[SERIES_ORDER[i]] ?? CONTEXT));
  }
  for (const n of order) {
    const feeder = [...n.targetLinks].sort((a, b) => b.value - a.value)[0]?.source;
    const fed = new Set(n.targetLinks.map((l) => l.source.color));
    if (n.explicitColor) n.color = n.explicitColor;
    else if (base) n.color = feeder && feeder.color !== base ? feeder.color : base;
    else n.color = anchorColor.get(n) ?? (fed.size === 1 ? [...fed][0] : INK);
  }
  const colorBy = option(g, "colorBy");
  for (const l of links) {
    const [near, far] = colorBy === "target" ? [l.target.color, l.source.color] : [l.source.color, l.target.color];
    // A band out of an ink or gray bar into a colored one takes the color it's heading for.
    l.fill = l.color ?? (NEUTRAL.has(near) && !NEUTRAL.has(far) ? far : near);
  }

  // A band that skips columns gets a stand-in in each column it crosses, so the bars there
  // make room for it as they would for another bar, and it never cuts through one. Layout
  // works on these one-column steps; drawing joins each band's steps back into one ribbon.
  const layoutNodes = [...nodes];
  const layoutLinks = [];
  for (const n of nodes) { n.sourceLinks = []; n.targetLinks = []; }
  const step = (source, target, l) => {
    const s = { source, target, value: l.value, index: l.index };
    source.sourceLinks.push(s);
    target.targetLinks.push(s);
    layoutLinks.push(s);
    return s;
  };
  for (const l of links) {
    let from = l.source;
    l.steps = [];
    l.via = [];
    for (let layer = l.source.layer + 1; layer < l.target.layer; layer++) {
      const via = { name: "", via: true, layer, value: l.value, index: layoutNodes.length, sourceLinks: [], targetLinks: [] };
      layoutNodes.push(via);
      l.via.push(via);
      l.steps.push(step(from, via, l));
      from = via;
    }
    l.steps.push(step(from, l.target, l));
  }

  const biggest = Math.max(...nodes.map((n) => n.value));
  return {
    kind: "flow",
    kicker: g.kicker ?? "",
    title: g.title ?? "",
    dek: g.dek ?? "",
    source: g.source ?? "",
    credit: g.credit ?? "",
    widthIn: g.width ?? 3.5,
    aspect: g.aspect ?? null,
    nodes,
    links,
    layoutNodes,
    layoutLinks,
    columns,
    total,
    order: option(g, "order"),
    labels: option(g, "labels"),
    // Labels are the whole readout here, so amounts shorten sooner than on an axis: $520K.
    fmt: { prefix: g.prefix ?? "", suffix: g.suffix ?? "", compact: g.compact ?? biggest >= 1e5 },
  };
}

const percentOf = (v, total) => {
  const p = Math.round((v / total) * 100);
  return p === 0 ? "<1%" : `${p}%`;
};

function labelParts(m, n) {
  const value = fmtNum(n.value, m.fmt);
  const pct = percentOf(n.value, m.total);
  // The whole is plainly 100%; saying so just adds width.
  const whole = n.value >= m.total;
  const rest = { value, percent: pct, both: whole ? value : `${value} · ${pct}`, name: "" }[m.labels];
  return [n.name, rest];
}
/** A label's width: name and numbers on one line, or stacked on two. Names are set semibold, a little wider. */
const labelWidth = (m, n, twoLine) => {
  const [name, rest] = labelParts(m, n);
  const nameW = textWidth(name, 7.5) * 1.06;
  const restW = rest ? textWidth(rest, 7.5) : 0;
  return twoLine ? Math.max(nameW, restW) : nameW + (rest ? restW + textWidth(" ", 7.5) : 0);
};

/** Vertical positions, after d3-sankey: stack each column, then relax toward connected bars. */
function layoutColumns(m, cols, top, plotH) {
  const longest = Math.max(...cols.map((c) => c.length));
  const py = Math.min(PAD, longest > 1 ? plotH / (longest - 1) / 2 : PAD);
  const ky = Math.min(...cols.filter((c) => c.length).map((c) => (plotH - (c.length - 1) * py) / c.reduce((a, n) => a + n.value, 0)));
  for (const l of m.layoutLinks) l.width = l.value * ky;

  const byY = (a, b) => a.y0 - b.y0;
  const byTargetY = (a, b) => a.target.y0 - b.target.y0 || a.index - b.index;
  const bySourceY = (a, b) => a.source.y0 - b.source.y0 || a.index - b.index;
  const reorderLinks = (ns) => ns.forEach((n) => { n.sourceLinks.sort(byTargetY); n.targetLinks.sort(bySourceY); });
  const reorderNodeLinks = (n) => {
    for (const { source } of n.targetLinks) source.sourceLinks.sort(byTargetY);
    for (const { target } of n.sourceLinks) target.targetLinks.sort(bySourceY);
  };

  const fixedOrder = m.order !== "auto";
  for (const c of cols) {
    if (m.order === "size") c.sort((a, b) => b.value - a.value || a.index - b.index);
    else c.sort((a, b) => a.index - b.index);
    let y = top;
    for (const n of c) {
      n.y0 = y;
      n.y1 = y + n.value * ky;
      y = n.y1 + py;
    }
    // Share the column's spare height out between its bars.
    const spare = (top + plotH - y + py) / (c.length + 1);
    c.forEach((n, i) => { n.y0 += spare * (i + 1); n.y1 += spare * (i + 1); });
    // A bar dragged into place stays there; the others settle around it.
    for (const n of c) {
      if (n.placed == null) continue;
      const h = n.y1 - n.y0;
      n.y0 = Math.min(top + n.placed * plotH, top + plotH - h);
      n.y1 = n.y0 + h;
    }
    if (!fixedOrder) c.sort(byY);
    reorderLinks(c);
  }

  // Placed bars don't move: they only set where their neighbours have to stop.
  const pushDown = (c, y, i, alpha) => {
    for (; i < c.length; i++) {
      const dy = (y - c[i].y0) * alpha;
      if (dy > 1e-6 && c[i].placed == null) { c[i].y0 += dy; c[i].y1 += dy; }
      y = c[i].y1 + py;
    }
  };
  const pushUp = (c, y, i, alpha) => {
    for (; i >= 0; i--) {
      const dy = (c[i].y1 - y) * alpha;
      if (dy > 1e-6 && c[i].placed == null) { c[i].y0 -= dy; c[i].y1 -= dy; }
      y = c[i].y0 - py;
    }
  };
  const resolve = (c, alpha) => {
    const i = c.length >> 1;
    pushUp(c, c[i].y0 - py, i - 1, alpha);
    pushDown(c, c[i].y1 + py, i + 1, alpha);
    pushUp(c, top + plotH, c.length - 1, alpha);
    pushDown(c, top, 0, alpha);
  };
  // Where a bar's top would sit for a straight band from the other end.
  const targetTop = (s, t) => {
    let y = s.y0 - ((s.sourceLinks.length - 1) * py) / 2;
    for (const l of s.sourceLinks) { if (l.target === t) break; y += l.width + py; }
    for (const l of t.targetLinks) { if (l.source === s) break; y -= l.width; }
    return y;
  };
  const sourceTop = (s, t) => {
    let y = t.y0 - ((t.targetLinks.length - 1) * py) / 2;
    for (const l of t.targetLinks) { if (l.source === s) break; y += l.width + py; }
    for (const l of s.sourceLinks) { if (l.target === t) break; y -= l.width; }
    return y;
  };
  const relax = (c, alpha, beta, inward) => {
    for (const n of c) {
      if (n.placed != null) continue;
      let y = 0, w = 0;
      for (const l of inward ? n.targetLinks : n.sourceLinks) {
        const v = l.value * (l.target.layer - l.source.layer);
        y += (inward ? targetTop(l.source, n) : sourceTop(n, l.target)) * v;
        w += v;
      }
      if (!(w > 0)) continue;
      const dy = (y / w - n.y0) * alpha;
      n.y0 += dy;
      n.y1 += dy;
      reorderNodeLinks(n);
    }
    if (!fixedOrder) c.sort(byY);
    resolve(c, beta);
  };
  for (let i = 0; i < ITERATIONS; i++) {
    const alpha = 0.99 ** i;
    const beta = Math.max(1 - alpha, (i + 1) / ITERATIONS);
    for (let k = cols.length - 2; k >= 0; k--) relax(cols[k], alpha, beta, false);
    for (let k = 1; k < cols.length; k++) relax(cols[k], alpha, beta, true);
  }

  // Bands leave and arrive in the order of whatever is at their other end, so they don't cross at a bar.
  reorderLinks(m.layoutNodes);
  for (const n of m.layoutNodes) {
    let ys = n.y0, yt = n.y0;
    for (const l of n.sourceLinks) { l.ys = ys; ys += l.width; }
    for (const l of n.targetLinks) { l.yt = yt; yt += l.width; }
  }
}

/**
 * One band as a filled ribbon through its stations: where it leaves its source, across each
 * column it skips, and where it reaches its target. Each hop between columns is an S-curve.
 */
function ribbon(stations, w) {
  let d = `M${f(stations[0].x1)},${f(stations[0].y)}`;
  for (let i = 1; i < stations.length; i++) {
    const a = stations[i - 1], b = stations[i], xm = (a.x1 + b.x0) / 2;
    d += `C${f(xm)},${f(a.y)} ${f(xm)},${f(b.y)} ${f(b.x0)},${f(b.y)}`;
    if (b.x1 !== b.x0) d += `L${f(b.x1)},${f(b.y)}`;
  }
  const end = stations.at(-1);
  d += `L${f(end.x1)},${f(end.y + w)}`;
  for (let i = stations.length - 1; i > 0; i--) {
    const a = stations[i - 1], b = stations[i], xm = (a.x1 + b.x0) / 2;
    if (b.x1 !== b.x0) d += `L${f(b.x0)},${f(b.y + w)}`;
    d += `C${f(xm)},${f(b.y + w)} ${f(xm)},${f(a.y + w)} ${f(a.x1)},${f(a.y + w)}`;
  }
  return `${d}Z`;
}

export function flowSvg(m, W) {
  const cols = Array.from({ length: m.columns }, () => []);
  for (const n of m.layoutNodes) cols[n.layer].push(n);
  const real = (c) => c.filter((n) => !n.via);

  // Labels sit right of their bars: in the margin for the last column, over the bands for
  // the others. A column is set far enough from the next that its labels clear those bars.
  // If one-line labels don't fit across, names and numbers stack on two lines; if even those
  // don't, the middle columns close up, but the last column's labels always fit.
  const spans = m.columns - 1;
  const plan = (twoLine) => {
    const labelW = cols.map((c) => Math.max(0, ...real(c).map((n) => labelWidth(m, n, twoLine))));
    const lastW = labelW[spans];
    const need = labelW.slice(0, spans).map((w) => w + 14);
    const room = W - m.columns * BAR - (lastW + 6);
    return { twoLine, need, room, fits: need.reduce((a, b) => a + b, 0) <= room };
  };
  const hasNumbers = m.labels !== "name";
  let layout = plan(false);
  if (!layout.fits && hasNumbers) layout = plan(true);
  const { twoLine, need, room } = layout;
  const needed = need.reduce((a, b) => a + b, 0);
  const even = room / spans;
  const gaps = need.every((n) => n <= even)
    ? need.map(() => even)
    : needed <= room
      ? need.map((n) => n + (room - needed) / spans)
      : need.map((n) => Math.max(20, (n * room) / needed));
  const labelGap = twoLine ? LABEL_GAP * 2 : LABEL_GAP;
  const xs = [0];
  for (let k = 1; k < m.columns; k++) xs.push(xs[k - 1] + BAR + gaps[k - 1]);
  for (const n of m.layoutNodes) n.x = xs[n.layer];

  const top = 6;
  const longest = Math.max(...cols.map((c) => real(c).length));
  const plotH = Math.round(m.aspect ? W * m.aspect : Math.max(Math.min(W * 0.62, 420), longest * (labelGap + 3)));
  layoutColumns(m, cols, top, plotH);

  // Bands, widest first so thin ones stay visible on top.
  const bands = [...m.links]
    .sort((a, b) => b.value - a.value)
    .map((l) => {
      const [first, lastStep] = [l.steps[0], l.steps.at(-1)];
      const stations = [
        { x0: l.source.x + BAR, x1: l.source.x + BAR, y: first.ys },
        ...l.via.map((v) => ({ x0: v.x, x1: v.x + BAR, y: v.y0 })),
        { x0: l.target.x, x1: l.target.x, y: lastStep.yt },
      ];
      const opacity = l.fill === INK ? 0.2 : l.fill === CONTEXT ? 0.55 : 0.4;
      return `<path d="${ribbon(stations, first.width)}" fill="${l.fill}" fill-opacity="${opacity}"/>`;
    })
    .join("");

  // data-node names each bar and label for the editor, which lets them be dragged and renamed.
  const bars = m.nodes
    .map((n) => `<rect data-node="${esc(n.name)}" x="${f(n.x)}" y="${f(n.y0)}" width="${BAR}" height="${f(Math.max(1, n.y1 - n.y0))}" fill="${n.color}"/>`)
    .join("");

  // Each column's labels spread apart where bars are too thin to hold one each.
  const plotBottom = top + plotH;
  const labels = cols
    .map((c) => {
      const items = real(c).map((n) => ({ n, y: (n.y0 + n.y1) / 2 })).sort((a, b) => a.y - b.y);
      spreadLabels(items, labelGap, top, plotBottom);
      return items
        .map(({ n, y, ly: spreadY }) => {
          const [name, rest] = labelParts(m, n);
          const [dx, dy] = n.nudge ?? [0, 0];
          const ly = spreadY + dy;
          const tx = n.x + BAR + (Math.abs(spreadY - y) > 1.5 ? 12 : 4) + dx;
          // A label moved off its bar, by the layout or by hand, keeps a leader back to it.
          const away = Math.abs(ly - y) > 1.5 || Math.abs(dx) > 12;
          const leader = away ? `<path class="leader" d="M${f(n.x + BAR + 1)},${f(y)}L${f(tx - 2)},${f(ly)}"/>` : "";
          // Centred on the bar: one line drops 0.35em to its baseline; two lines straddle it.
          const text = !rest
            ? `<tspan class="name">${esc(name)}</tspan>`
            : twoLine
              ? `<tspan class="name" x="${f(tx)}" dy="-0.225em">${esc(name)}</tspan><tspan class="num" x="${f(tx)}" dy="1.15em">${esc(rest)}</tspan>`
              : `<tspan class="name">${esc(name)}</tspan> <tspan class="num">${esc(rest)}</tspan>`;
          return `${leader}<text class="flow-label" data-node="${esc(n.name)}" x="${f(tx)}" y="${f(ly)}"${twoLine && rest ? "" : ' dy="0.35em"'}>${text}</text>`;
        })
        .join("");
    })
    .join("");

  // The plot's frame and column positions ride along for the editor's dragging.
  const H = plotBottom + 6;
  return `<svg class="chart flow" width="${f(W)}" height="${f(H)}" viewBox="0 0 ${f(W)} ${f(H)}" role="img" aria-label="${esc(m.title)}" data-top="${top}" data-plot-h="${plotH}" data-cols="${xs.map(f).join(",")}">
  <g class="bands">${bands}</g>
  <g class="bars">${bars}</g>
  <g class="labels">${labels}</g>
</svg>`;
}

export const flowCss = `
.flow .flow-label { font-size: 7.5pt; fill: var(--ink); paint-order: stroke; stroke: #ffffff; stroke-width: 2.5px; stroke-linejoin: round; font-variant-numeric: lining-nums tabular-nums; }
.flow .flow-label .name { font-weight: 600; }
.flow .flow-label .num { font-weight: 400; }
.flow .leader { stroke: var(--muted); stroke-width: 0.5; fill: none; }
`;
