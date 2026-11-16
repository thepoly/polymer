// A custom graph is a flat list of parts: every shape and every piece of text is one part,
// placed where it is, with nothing computed from data any more. This module turns a drawn
// graph into parts (in the browser, from its DOM) and draws parts back as SVG.
//
// It is the one implementation of both, shared three ways: the editor loads it straight
// from /graph-editor/parts.js, and lib/graph and components/Interactive import it for the
// print render and the article. Parts end up in a public page's HTML, so drawing them
// treats every field as untrusted: numbers are coerced, colors and keywords are checked
// against what's allowed, and text is escaped.
//
// A part:
//   { id, t, …geometry, m?, fill?, fo?, stroke?, so?, sw?, dash?, cap?, join?, op?, po?, dx?, dy?, k? }
//   t "path" d · "circle" cx cy r · "ellipse" cx cy rx ry · "rect" x y w h rx · "line" x1 y1 x2 y2
//   · "poly" pts closed · "text" x y anchor base size weight serif italic ls fv runs[{ s, x?, y?, dx?, dy?, w?, fill? }]
//   m is a matrix [a b c d e f] taking the part's own coordinates to the graphic's; dx/dy is
//   how far it has been dragged since; k names the parts that share its color.

/** On the web a layout unit is drawn this many px wide: print sizes read too small on a screen. */
export const webScale = (px) => (px >= 560 ? 1.35 : 1.15);

const SERIF = `'Minion Pro', 'Iowan Old Style', Georgia, serif`;
const SANS = `Raleway, 'Helvetica Neue', Arial, sans-serif`;

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const num = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? +x.toFixed(3) : 0;
};
const HEX = /^#[0-9a-f]{6}$/i;
const hex = (v) => (typeof v === "string" && HEX.test(v) ? v : null);
const oneOf = (v, allowed) => (allowed.includes(v) ? v : null);
const ANCHORS = ["start", "middle", "end"];
const BASELINES = ["central", "middle", "hanging", "alphabetic", "text-before-edge", "text-after-edge", "ideographic", "mathematical"];
const CAPS = ["butt", "round", "square"];
const JOINS = ["miter", "round", "bevel"];

/** The paint and transform attributes every part can carry. */
function common(p, ids) {
  const a = [];
  if (ids && p.id) a.push(`data-part="${esc(p.id)}"`);
  if (typeof p.tip === "string" && TIP.test(p.tip)) a.push(`data-tip="${p.tip}"`);
  const move = p.dx || p.dy ? `translate(${num(p.dx)} ${num(p.dy)})` : "";
  const m = Array.isArray(p.m) && p.m.length === 6 ? `matrix(${p.m.map(num).join(" ")})` : "";
  if (move || m) a.push(`transform="${[move, m].filter(Boolean).join(" ")}"`);
  // A hit area is clear but still answers to the pointer.
  a.push(`fill="${p.hit ? "transparent" : (hex(p.fill) ?? "none")}"`);
  if (p.fo != null && num(p.fo) < 1) a.push(`fill-opacity="${num(p.fo)}"`);
  if (hex(p.stroke)) {
    a.push(`stroke="${p.stroke}"`, `stroke-width="${num(p.sw ?? 1)}"`);
    if (p.so != null && num(p.so) < 1) a.push(`stroke-opacity="${num(p.so)}"`);
    if (Array.isArray(p.dash) && p.dash.length) a.push(`stroke-dasharray="${p.dash.map(num).join(" ")}"`);
    if (oneOf(p.cap, CAPS)) a.push(`stroke-linecap="${p.cap}"`);
    if (oneOf(p.join, JOINS)) a.push(`stroke-linejoin="${p.join}"`);
    if (p.po === "stroke") a.push(`paint-order="stroke"`);
  }
  if (p.op != null && num(p.op) < 1) a.push(`opacity="${num(p.op)}"`);
  return a.join(" ");
}

/** A readout's key: a letter and a number ("c3", "p12"). */
const TIP = /^[a-z]\d{1,5}$/;

const offset = (v) => (typeof v === "number" || /^-?[\d.]+(em|px)?$/.test(String(v)) ? String(v) : null);

function textPart(p, ids) {
  const a = [`x="${num(p.x)}"`, `y="${num(p.y)}"`, `font-size="${num(p.size || 10)}"`, `font-family="${esc(p.serif ? SERIF : SANS)}"`];
  if (oneOf(p.anchor, ANCHORS)) a.push(`text-anchor="${p.anchor}"`);
  if (oneOf(p.base, BASELINES)) a.push(`dominant-baseline="${p.base}"`);
  if (p.weight) a.push(`font-weight="${Math.round(num(p.weight))}"`);
  if (p.italic) a.push(`font-style="italic"`);
  if (p.ls) a.push(`letter-spacing="${num(p.ls)}"`);
  // Spaces inside a run are part of it; figures stand level and, where asked, line up in columns.
  a.push(`style="white-space:pre;font-variant-numeric:${p.fv === "tabular" ? "lining-nums tabular-nums" : "lining-nums"}"`);
  const runs = (Array.isArray(p.runs) ? p.runs : []).map((r) => {
    const t = [];
    if (r.x != null) t.push(`x="${num(r.x)}"`);
    if (r.y != null) t.push(`y="${num(r.y)}"`);
    if (offset(r.dx) != null) t.push(`dx="${offset(r.dx)}"`);
    if (offset(r.dy) != null) t.push(`dy="${offset(r.dy)}"`);
    if (r.w) t.push(`font-weight="${Math.round(num(r.w))}"`);
    if (hex(r.fill)) t.push(`fill="${r.fill}"`);
    return `<tspan${t.length ? " " + t.join(" ") : ""}>${esc(r.s)}</tspan>`;
  });
  return `<text ${common(p, ids)} ${a.join(" ")}>${runs.join("")}</text>`;
}

/** One part as an SVG element, or nothing if it isn't a kind of part this knows. `clipId` names its clip, if it has one. */
function partSvg(p, ids, clipId = "") {
  if (!p || typeof p !== "object") return "";
  if (clipId && Array.isArray(p.clip) && p.clip.length) {
    // The clip is drawn in the part's own coordinates, so it goes wherever the part goes.
    const shapes = p.clip.map((k) => partSvg({ ...k, id: null, m: null, dx: 0, dy: 0, clip: null, fill: "#000000", stroke: null, op: 1, fo: 1 }, false)).join("");
    return `<clipPath id="${clipId}">${shapes}</clipPath>${partSvg({ ...p, clip: null }, ids).replace(/^<(\w+) /, `<$1 clip-path="url(#${clipId})" `)}`;
  }
  const c = common(p, ids);
  switch (p.t) {
    case "path":
      // Path data is letters, digits and separators; anything else isn't a path.
      return /^[MmLlHhVvCcSsQqTtAaZz0-9eE\s,.+-]*$/.test(String(p.d ?? "")) ? `<path ${c} d="${esc(p.d)}"/>` : "";
    case "circle":
      return `<circle ${c} cx="${num(p.cx)}" cy="${num(p.cy)}" r="${Math.max(0, num(p.r))}"/>`;
    case "ellipse":
      return `<ellipse ${c} cx="${num(p.cx)}" cy="${num(p.cy)}" rx="${Math.max(0, num(p.rx))}" ry="${Math.max(0, num(p.ry))}"/>`;
    case "rect":
      return `<rect ${c} x="${num(p.x)}" y="${num(p.y)}" width="${Math.max(0, num(p.w))}" height="${Math.max(0, num(p.h))}"${p.rx ? ` rx="${Math.max(0, num(p.rx))}"` : ""}/>`;
    case "line":
      return `<line ${c} x1="${num(p.x1)}" y1="${num(p.y1)}" x2="${num(p.x2)}" y2="${num(p.y2)}"/>`;
    case "poly":
      return `<${p.closed ? "polygon" : "polyline"} ${c} points="${(Array.isArray(p.pts) ? p.pts : []).map(num).join(" ")}"/>`;
    case "text":
      return textPart(p, ids);
    default:
      return "";
  }
}

/**
 * The parts as SVG markup, back to front. With `ids`, each element is tagged with its part's
 * id. `prefix` starts the ids of any clips, and has to differ between drawings on one page.
 * Clear hit areas (parts with `hit`) are drawn only with `hits`, where something answers to them.
 */
export function partsSvg(parts, { ids = false, prefix = "clip", hits = false } = {}) {
  const safe = String(prefix).replace(/[^A-Za-z0-9_-]/g, "") || "clip";
  return (Array.isArray(parts) ? parts : []).map((p, i) => (p?.hit && !hits ? "" : partSvg(p, ids, `${safe}-${i}`))).join("");
}

// ── Colors ────────────────────────────────────────────────

/** Any color the browser reports ("rgb(…)", "rgba(…)", "color(srgb …)", "#abc") → { hex, a }, or null for none. */
export function parseColor(v) {
  const s = String(v ?? "").trim();
  if (!s || s === "none" || s === "transparent") return null;
  const out = (r, g, b, a = 1) => ({
    hex: `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("")}`.toUpperCase(),
    a: Math.min(1, Math.max(0, a)),
  });
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (m) {
    const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
    return out(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
  }
  const alpha = (t) => (t == null ? 1 : t.endsWith("%") ? parseFloat(t) / 100 : parseFloat(t));
  m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(s);
  if (m) return out(+m[1], +m[2], +m[3], alpha(m[4]));
  m = /^color\(srgb\s+([\d.e+-]+)\s+([\d.e+-]+)\s+([\d.e+-]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/.exec(s);
  if (m) return out(m[1] * 255, m[2] * 255, m[3] * 255, alpha(m[4]));
  return null;
}

/** Black, white and the grays between: colors that say nothing, so they're never linked. */
export function isNeutral(hexColor) {
  const c = [1, 3, 5].map((i) => parseInt(String(hexColor).slice(i, i + 2), 16));
  return Math.max(...c) - Math.min(...c) < 28;
}

/** The color a part shows as: its fill, or its line if it has no fill. */
export const paintOf = (p) => (p.t === "text" ? p.fill : p.fill ?? p.stroke) ?? null;

// ── Snapshot ──────────────────────────────────────────────

const SHAPES = {
  path: (el) => ({ t: "path", d: el.getAttribute("d") ?? "" }),
  circle: (el) => ({ t: "circle", cx: +el.getAttribute("cx") || 0, cy: +el.getAttribute("cy") || 0, r: +el.getAttribute("r") || 0 }),
  ellipse: (el) => ({ t: "ellipse", cx: +el.getAttribute("cx") || 0, cy: +el.getAttribute("cy") || 0, rx: +el.getAttribute("rx") || 0, ry: +el.getAttribute("ry") || 0 }),
  rect: (el) => ({ t: "rect", x: +el.getAttribute("x") || 0, y: +el.getAttribute("y") || 0, w: +el.getAttribute("width") || 0, h: +el.getAttribute("height") || 0, rx: +el.getAttribute("rx") || 0 }),
  line: (el) => ({ t: "line", x1: +el.getAttribute("x1") || 0, y1: +el.getAttribute("y1") || 0, x2: +el.getAttribute("x2") || 0, y2: +el.getAttribute("y2") || 0 }),
  polygon: (el) => ({ t: "poly", closed: true, pts: (el.getAttribute("points") ?? "").trim().split(/[\s,]+/).map(Number) }),
  polyline: (el) => ({ t: "poly", closed: false, pts: (el.getAttribute("points") ?? "").trim().split(/[\s,]+/).map(Number) }),
};
const SKIP_SVG = new Set(["defs", "clipPath", "mask", "script", "style", "title", "desc", "linearGradient", "radialGradient", "pattern", "foreignObject", "marker"]);
const SKIP_HTML = new Set(["script", "style", "template", "noscript"]);

/**
 * A drawn graph → its parts. `root` is the element holding the whole graphic; positions come
 * out relative to it (less `inset` px of padding on each side) and multiplied by `scale`.
 * Browser only. Returns { parts, size: [w, h], byEl } where byEl maps each element to the
 * id of the part made from it.
 */
export function snapshotParts(root, { scale = 1, inset = 0 } = {}) {
  const fdoc = root.ownerDocument;
  const win = fdoc.defaultView;
  const R = root.getBoundingClientRect();
  const ox = R.left + inset, oy = R.top + inset;
  const r2 = (v) => +v.toFixed(2);
  const X = (px) => r2((px - ox) * scale), Y = (px) => r2((px - oy) * scale), L = (px) => r2(px * scale);
  const parts = [];
  const byEl = new Map();
  const add = (el, part) => {
    part.id = `p${parts.length + 1}`;
    // Made under a mark with a readout: the part keeps the readout's key.
    const tip = el?.closest?.("[data-tip]")?.getAttribute("data-tip");
    if (tip && TIP.test(tip)) part.tip = tip;
    parts.push(part);
    if (el) byEl.set(el, part.id);
    return part;
  };
  const opacity = (cs) => {
    const o = parseFloat(cs.opacity);
    return Number.isFinite(o) ? o : 1;
  };
  const measure = fdoc.createElement("canvas").getContext("2d");

  // ── SVG ──
  const matrixOf = (el) => {
    const c = el.getScreenCTM();
    if (!c) return null;
    const m = [c.a * scale, c.b * scale, c.c * scale, c.d * scale, (c.e - ox) * scale, (c.f - oy) * scale];
    return m.map((v, i) => +v.toFixed(i < 4 ? 5 : 2));
  };
  const isIdentity = (m) => m && Math.abs(m[0] - 1) < 1e-4 && Math.abs(m[3] - 1) < 1e-4 && Math.abs(m[1]) < 1e-4 && Math.abs(m[2]) < 1e-4 && Math.abs(m[4]) < 0.005 && Math.abs(m[5]) < 0.005;
  const paint = (part, cs, op) => {
    const fill = parseColor(cs.fill), stroke = parseColor(cs.stroke);
    const fo = (fill?.a ?? 0) * (parseFloat(cs.fillOpacity) || 0), so = (stroke?.a ?? 0) * (parseFloat(cs.strokeOpacity) || 0);
    const sw = parseFloat(cs.strokeWidth) || 0;
    if (fill && fo > 0.004) {
      part.fill = fill.hex;
      if (fo < 0.995) part.fo = r2(fo);
    }
    if (stroke && so > 0.004 && sw > 0) {
      part.stroke = stroke.hex;
      part.sw = +sw.toFixed(3);
      if (so < 0.995) part.so = r2(so);
      const dash = cs.strokeDasharray && cs.strokeDasharray !== "none" ? cs.strokeDasharray.split(/[\s,]+/).map(parseFloat).filter(Number.isFinite) : [];
      if (dash.length) part.dash = dash;
      if (cs.strokeLinecap !== "butt") part.cap = cs.strokeLinecap;
      if (cs.strokeLinejoin !== "miter") part.join = cs.strokeLinejoin;
      if (String(cs.paintOrder).startsWith("stroke")) part.po = "stroke";
    }
    if (op < 0.995) part.op = r2(op);
    return part.fill || part.stroke;
  };

  function svgText(el, cs, op) {
    const part = { t: "text", x: +el.getAttribute("x") || 0, y: +el.getAttribute("y") || 0, size: +(parseFloat(cs.fontSize) || 10).toFixed(3) };
    if (!paint(part, cs, op) || !part.fill) return;
    // Print sets labels on a white box so gridlines stop short of them. As a part, the text
    // carries that as a white edge of its own, so the gap moves with it.
    if (!part.stroke && el.closest(".knockout")) Object.assign(part, { stroke: "#FFFFFF", sw: 3, join: "round", po: "stroke" });
    textStyle(part, cs, 1);
    if (cs.textAnchor !== "start") part.anchor = cs.textAnchor;
    if (cs.dominantBaseline && cs.dominantBaseline !== "auto") part.base = cs.dominantBaseline;
    const runs = [];
    for (const node of el.childNodes) {
      if (node.nodeType === 3) {
        const s = node.nodeValue.replace(/\s+/g, " ");
        if (s.trim()) runs.push({ s: runs.length ? s : s.trimStart() });
      } else if (node.nodeType === 1 && node.localName === "tspan") {
        const s = node.textContent.replace(/\s+/g, " ");
        if (!s.trim()) continue;
        const run = { s };
        for (const k of ["x", "y", "dx", "dy"]) {
          const v = node.getAttribute(k);
          if (v != null && v !== "") run[k] = /^-?[\d.]+$/.test(v) ? +v : v;
        }
        const ts = win.getComputedStyle(node);
        if (ts.fontWeight !== cs.fontWeight) run.w = +ts.fontWeight || 400;
        const tf = parseColor(ts.fill);
        if (tf && tf.hex !== part.fill) run.fill = tf.hex;
        runs.push(run);
      }
    }
    if (!runs.length) return;
    runs.at(-1).s = runs.at(-1).s.trimEnd();
    part.runs = runs;
    const m = matrixOf(el);
    if (m && !isIdentity(m)) part.m = m;
    add(el, part);
  }

  function svgNode(el, op) {
    const tag = el.localName;
    if (SKIP_SVG.has(tag)) return;
    const cs = win.getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return;
    const o = op * opacity(cs);
    if (o < 0.01) return;
    if (tag === "g" || tag === "svg" || tag === "a") {
      for (const child of el.children) svgNode(child, o);
      return;
    }
    // A clipped shape (the pale edge a dot wears only where it overlaps another) keeps its
    // clip: the shapes it's cut to, in its own coordinates.
    let clip = null;
    if (cs.clipPath && cs.clipPath !== "none") {
      const ref = /url\(["']?#([^"')]+)["']?\)/.exec(cs.clipPath);
      const def = ref && fdoc.getElementById(ref[1]);
      clip = def ? [...def.children].filter((k) => SHAPES[k.localName]).map((k) => SHAPES[k.localName](k)) : [];
      if (!clip.length || tag === "text") return;
    }
    if (tag === "text") return svgText(el, cs, o);
    if (!SHAPES[tag] || el.classList.contains("knockout-bg")) return;
    const part = SHAPES[tag](el);
    if (!paint(part, cs, o)) {
      // A clear shape that's there to be pointed at becomes a hit area.
      if (!el.hasAttribute("data-tip") || clip) return;
      delete part.op;
      part.hit = true;
    }
    if (clip) part.clip = clip;
    const m = matrixOf(el);
    if (m && !isIdentity(m)) part.m = m;
    add(el, part);
  }

  // ── HTML ──
  function textStyle(part, cs, s) {
    const weight = +cs.fontWeight || 400;
    if (weight !== 400) part.weight = weight;
    if (/minion|georgia|times|iowan|serif/i.test(cs.fontFamily.split(",")[0]) && !/sans/i.test(cs.fontFamily.split(",")[0])) part.serif = true;
    if (cs.fontStyle === "italic") part.italic = true;
    const ls = parseFloat(cs.letterSpacing);
    if (Number.isFinite(ls) && ls) part.ls = r2(ls * s);
    if (/tabular/.test(cs.fontVariantNumeric)) part.fv = "tabular";
  }

  function htmlBox(el, cs, op) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const bg = parseColor(cs.backgroundColor);
    // A ring drawn as a shadow with only a spread (a legend's hollow dot).
    const ring = /^(.+?) 0px 0px 0px ([\d.]+)px$/.exec(cs.boxShadow ?? "");
    const ringColor = ring ? parseColor(ring[1]) : null;
    if ((bg && bg.a > 0.004) || ringColor) {
      const side = Math.min(r.width, r.height);
      const raw = cs.borderTopLeftRadius;
      const radius = Math.min(side / 2, raw.endsWith("%") ? (parseFloat(raw) / 100) * side : parseFloat(raw) || 0);
      const grow = ringColor ? +ring[2] / 2 : 0;
      const part = { t: "rect", x: X(r.left - grow), y: Y(r.top - grow), w: L(r.width + grow * 2), h: L(r.height + grow * 2) };
      if (radius + grow > 0) part.rx = L(radius + grow);
      if (bg && bg.a > 0.004) {
        part.fill = bg.hex;
        if (bg.a < 0.995) part.fo = r2(bg.a);
      }
      if (ringColor) {
        part.stroke = ringColor.hex;
        part.sw = L(+ring[2]);
      }
      if (op < 0.995) part.op = r2(op);
      add(el, part);
    }
    const edge = (side, x1, y1, x2, y2) => {
      const w = parseFloat(cs[`border${side}Width`]) || 0;
      const color = parseColor(cs[`border${side}Color`]);
      if (!w || cs[`border${side}Style`] === "none" || !color || color.a < 0.004) return;
      const part = { t: "line", x1: X(x1), y1: Y(y1), x2: X(x2), y2: Y(y2), stroke: color.hex, sw: L(w) };
      if (color.a < 0.995) part.so = r2(color.a);
      if (op < 0.995) part.op = r2(op);
      add(null, part);
    };
    const half = (side) => (parseFloat(cs[`border${side}Width`]) || 0) / 2;
    edge("Top", r.left, r.top + half("Top"), r.right, r.top + half("Top"));
    edge("Bottom", r.left, r.bottom - half("Bottom"), r.right, r.bottom - half("Bottom"));
    edge("Left", r.left + half("Left"), r.top, r.left + half("Left"), r.bottom);
    edge("Right", r.right - half("Right"), r.top, r.right - half("Right"), r.bottom);
  }

  function htmlText(node, op) {
    const el = node.parentElement;
    const cs = win.getComputedStyle(el);
    const color = parseColor(cs.color);
    if (!color || color.a < 0.004) return;
    const upper = cs.textTransform === "uppercase";
    // Each word's box says which line it landed on.
    const range = fdoc.createRange();
    const lines = [];
    for (const w of node.nodeValue.matchAll(/\S+/g)) {
      range.setStart(node, w.index);
      range.setEnd(node, w.index + w[0].length);
      const rects = range.getClientRects();
      if (!rects.length) continue;
      const first = rects[0], last = rects[rects.length - 1];
      const line = lines.at(-1);
      if (line && first.top < line.top + line.height / 2) {
        line.end = w.index + w[0].length;
        line.right = last.right;
      } else {
        lines.push({ start: w.index, end: w.index + w[0].length, left: first.left, right: last.right, top: first.top, height: first.height });
      }
    }
    if (!lines.length) return;
    // A line's box runs from the font's ascent to its descent; the baseline is the ascent down from the top.
    measure.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const tm = measure.measureText("Hx");
    const ascent = Number.isFinite(tm.fontBoundingBoxAscent) && Number.isFinite(tm.fontBoundingBoxDescent)
      ? (h) => (h - (tm.fontBoundingBoxAscent + tm.fontBoundingBoxDescent)) / 2 + tm.fontBoundingBoxAscent
      : (h) => h * 0.78;
    const anchor = /right|end/.test(cs.textAlign) ? "end" : cs.textAlign === "center" ? "middle" : "start";
    const at = (l) => (anchor === "end" ? l.right : anchor === "middle" ? (l.left + l.right) / 2 : l.left);
    const text = (l) => {
      const s = node.nodeValue.slice(l.start, l.end).replace(/\s+/g, " ");
      return upper ? s.toUpperCase() : s;
    };
    const part = { t: "text", x: X(at(lines[0])), y: Y(lines[0].top + ascent(lines[0].height)), size: L(parseFloat(cs.fontSize) || 12), fill: color.hex };
    if (color.a < 0.995) part.fo = r2(color.a);
    if (op < 0.995) part.op = r2(op);
    if (anchor !== "start") part.anchor = anchor;
    textStyle(part, cs, scale);
    part.runs = lines.map((l, i) => (i ? { s: text(l), x: X(at(l)), y: Y(l.top + ascent(l.height)) } : { s: text(l) }));
    add(el, part);
  }

  function htmlNode(el, op, isRoot) {
    const cs = win.getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || el.hidden) return;
    const o = op * opacity(cs);
    if (o < 0.01) return;
    if (!isRoot) htmlBox(el, cs, o);
    for (const node of el.childNodes) {
      if (node.nodeType === 3) {
        if (node.nodeValue.trim()) htmlText(node, o);
      } else if (node.nodeType === 1) {
        if (node.localName === "svg") svgNode(node, o);
        else if (!SKIP_HTML.has(node.localName)) htmlNode(node, o, false);
      }
    }
  }

  htmlNode(root, 1, true);

  // Parts drawn in the same color belong together: a slice and its key, a line and its label.
  // The link is named for the color, so the same color in another snapshot of this graph
  // (its web or phone layout) is the same link.
  for (const p of parts) {
    const c = paintOf(p);
    if (c && !isNeutral(c)) p.k = c.slice(1).toLowerCase();
  }

  return { parts, size: [r2((R.width - inset * 2) * scale), r2((R.height - inset * 2) * scale)], byEl };
}
