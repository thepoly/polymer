import { esc } from "./template.js";
import { CONTEXT, palette } from "./palette.js";
import { dateValue, fmtDate, monoText } from "./axis.js";

// Lines a graph's maker draws at a value of their own choosing, across the plot: a y line
// at $50,000, an x line at 2020. A graph lists them under "refs":
//
//   "refs": [{ "axis": "y", "value": 50000, "label": "Median income" },
//            { "axis": "x", "value": "2020-03-15", "label": "Pandemic", "color": "red" }]
//
// x values can be numbers, dates (on a date axis) or category names (on a column chart or a
// line chart of names). Each is a solid rule like a gridline, but in ink (or a brand color, or gray).

const INK = "#1a1a1a";

/** The graph's lines, checked: each one's axis, value, label and color. Unusable ones are dropped. */
export function buildRefs(g) {
  const out = [];
  for (const r of Array.isArray(g.refs) ? g.refs : []) {
    if (!r || (r.axis !== "x" && r.axis !== "y")) continue;
    const date = typeof r.value === "string" ? dateValue(r.value) : null;
    const num = typeof r.value === "number" && Number.isFinite(r.value) ? r.value : date;
    const category = typeof r.value === "string" && date === null ? r.value.trim() : null;
    if (num === null && !category) continue;
    const colors = palette().base;
    const color = r.color === "gray" ? CONTEXT : Object.hasOwn(colors, r.color ?? "") ? colors[r.color] : INK;
    out.push({ axis: r.axis, value: num, category, text: date !== null ? fmtDate(r.value) : null, label: String(r.label ?? "").trim(), color });
  }
  return out;
}

const f = (n) => n.toFixed(2);

/** A line's weight: a gridline's, darker, so it reads as part of the axis. */
export const REF_WIDTH = 1;

/**
 * The lines as SVG, for a plot from (left, top) to (right, bottom): each runs the full width
 * (or height) of the plot, as the gridlines do. `mapX` and `mapY` take a value to its place,
 * or return null when it can't be placed; lines off the plot are left out.
 *
 * Each line is named on its axis, where the tick labels are and exactly like them but in
 * the line's color: its label if it has one, otherwise its value as the axis writes it
 * (`tick`). A y line's sits at `labelX`, right-aligned; an x line's at `labelY`, centered.
 */
export function refsSvg(refs, { left, right, top, bottom, mapX, mapY, tick, labelX, labelY }) {
  return refs
    .map((r) => {
      const pos = r.axis === "x" ? mapX(r) : mapY(r);
      if (pos === null || pos === undefined || !Number.isFinite(pos)) return "";
      const inside = r.axis === "x" ? pos >= left - 0.5 && pos <= right + 0.5 : pos >= top - 0.5 && pos <= bottom + 0.5;
      if (!inside) return "";
      const text = r.label || tick(r);
      return r.axis === "x"
        ? `<line x1="${f(pos)}" x2="${f(pos)}" y1="${f(top)}" y2="${f(bottom)}" stroke="${r.color}" stroke-width="${REF_WIDTH}"/>
      ${monoText(pos, labelY, text, { anchor: "middle", attrs: `class="tick" style="fill:${r.color}"`, escape: esc })}`
        : `<line x1="${f(left)}" x2="${f(right)}" y1="${f(pos)}" y2="${f(pos)}" stroke="${r.color}" stroke-width="${REF_WIDTH}"/>
      ${monoText(labelX, pos, text, { anchor: "end", attrs: `class="tick" dominant-baseline="central" style="fill:${r.color}"`, escape: esc })}`;
    })
    .join("");
}

/** What a line says on its axis when it has no label: a date or category as written, or its value. */
export function refText(r, formatNumber) {
  if (r.text) return r.text;
  if (r.category) return r.category;
  return r.value === null ? "" : formatNumber(r.value);
}

/**
 * Whether a y tick at `y` would run into a y line's label: the tick's label is left off
 * then, so the line's sits on the axis on its own. `ys` are the lines' places.
 */
export const crowdsRef = (ys, y, gap = 11) => ys.some((ry) => Math.abs(ry - y) < gap);

/** The y places of a graph's y lines, for crowdsRef. */
export const refYs = (refs, mapY) => (refs ?? []).filter((r) => r.axis === "y" && r.value !== null).map((r) => mapY(r.value)).filter(Number.isFinite);

/** A line's name on its axis is a tick label like any other. */
export const refsCss = ``;
