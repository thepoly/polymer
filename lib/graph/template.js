// What the graph pages borrow from the invoice design: its fonts and its HTML escaping.
// The fonts are the site's own, served from /fonts; the PNG export inlines them in the browser.

const FONT_FILES = {
  raleway: "/fonts/raleway/Raleway-Variable.ttf",
  minion: "/fonts/minion-pro/MinionPro-Regular.otf",
  minionItalic: "/fonts/minion-pro/MinionPro-It.otf",
};

export const fonts = () => `
@font-face {
  font-family: "Raleway";
  src: url("${FONT_FILES.raleway}") format("truetype");
  font-weight: 300 700;
  font-style: normal;
}
@font-face {
  font-family: "Minion Pro";
  src: url("${FONT_FILES.minion}") format("opentype");
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: "Minion Pro";
  src: url("${FONT_FILES.minionItalic}") format("opentype");
  font-weight: 400;
  font-style: italic;
}`;

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
