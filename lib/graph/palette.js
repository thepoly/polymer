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

// One solid fill per family, for bars: a single series is one color, not a ramp.
export const SOLID = { red: SERIES.red, purple: SERIES.purple };
