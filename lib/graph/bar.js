import { esc } from "./template.js";
import { fmtNum } from "./axis.js";

// Horizontal bars use the same items and groups as a ring. Every bar in a group is one
// solid color (a single series is one color, not a ramp), the value sits at the tip, and
// bars all grow from the same left edge, so no axis is needed.

export function barHtml(m) {
  const max = Math.max(...m.rows.map((r) => r.value), 0) || 1;
  const body = m.groups
    .map((grp) => {
      const head = grp.name ? `<div class="bar-group">${esc(grp.name)}</div>` : "";
      const rows = grp.rows
        .map(
          (r) => `
      <div class="bar-label">${esc(r.label)}</div>
      <div class="bar-track">
        <span class="bar" style="--frac:${(r.value / max).toFixed(4)};background:${r.color}"></span>
        <span class="bar-value">${esc(fmtNum(r.value, m.fmt))}</span>
      </div>`
        )
        .join("");
      return head + rows;
    })
    .join("");
  return `<div class="bars">${body}</div>`;
}

export const barCss = `
.bars {
  display: grid;
  grid-template-columns: fit-content(45%) 1fr;
  column-gap: 6pt;
  row-gap: 4pt;
  align-items: center;
  margin-top: 12pt;
  font-size: 8pt;
  font-variant-numeric: lining-nums tabular-nums;
}
.bar-group {
  grid-column: 1 / -1;
  font-weight: 700;
  padding-bottom: 2pt;
  border-bottom: 0.6pt solid var(--ink);
  margin-top: 6pt;
}
.bar-group:first-child { margin-top: 0; }
.bar-label { line-height: 1.15; }
.bar-track { display: flex; align-items: center; gap: 4pt; min-width: 0; }
/* Leave room after the longest bar for its value. */
.bar { display: block; height: 11pt; border-radius: 0 2pt 2pt 0; flex: 0 0 calc((100% - 30pt) * var(--frac)); min-width: 1pt; }
.bar-value { white-space: nowrap; }
`;
