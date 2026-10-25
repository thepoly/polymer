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
const FAMILIES = { red: RAMP, purple: PURPLE };

export function family(name = "red") {
  // Own keys only, so a color of "constructor" can't reach into Object's prototype.
  const ramp = Object.hasOwn(FAMILIES, name) ? FAMILIES[name] : null;
  if (!ramp) throw new Error(`Unknown color "${name}". Use one of: ${Object.keys(FAMILIES).join(", ")}.`);
  return ramp;
}

/** Picks `n` evenly spread steps from the ramp, so four slices skip a middle step rather than the lightest. */
export function shades(n, ramp) {
  if (n > ramp.length) {
    throw new Error(`${n} slices is more than a group can carry in ${ramp.length} shades. Fold the smallest into "Other".`);
  }
  if (n === 1) return [ramp[2]];
  return Array.from({ length: n }, (_, i) => ramp[Math.round((i * (ramp.length - 1)) / (n - 1))]);
}
