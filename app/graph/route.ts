import { graphUser } from '@/lib/graph/auth'

export const dynamic = 'force-dynamic'

// The graph editor: a plain page whose script (public/graph-editor/app.js) does the editing.
// It sits outside the site's layouts, and only staff signed in to the newsroom can open it.
const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Poly Graphs</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><circle cx='16' cy='16' r='11' fill='none' stroke='%23D6001C' stroke-width='7'/></svg>">
<link rel="stylesheet" href="/graph-editor/app.css">
<script type="module" src="/graph-editor/app.js"></script>
</head>
<body>

<header class="appbar">
  <div class="brand">
    <a href="/"><img src="/logo-light-mobile.svg" alt="The Polytechnic"></a>
    <span class="product">Graphs</span>
  </div>
  <div class="actions">
    <span id="status" class="status" role="status" aria-live="polite"></span>
    <a class="btn" href="/graph/settings">Settings</a>
    <button id="save" class="btn" title="Save (⌘S)">Save</button>
    <button id="export-pdf" class="btn" title="Opens the print dialog: choose Save as PDF">PDF</button>
    <button id="export-png" class="btn primary">Download PNG</button>
  </div>
</header>

<div class="layout">
  <nav class="sidebar" aria-label="Graphs">
    <button id="new" class="btn wide">New graph</button>
    <input id="filter" class="filter" type="search" placeholder="Find a graph" aria-label="Find a graph">
    <ul id="graph-list" class="graph-list"></ul>
  </nav>

  <main id="editor" class="editor" aria-label="Editor"></main>

  <section class="preview" aria-label="Preview">
    <div class="preview-bar">
      <span id="size" class="size"></span>
      <span id="edit-hint" class="size edit-hint" hidden>Drag bars and labels · double-click a label to rename</span>
      <button id="reset-layout" class="btn small" title="Put every bar and label back where the defaults put them" hidden>Reset to defaults</button>
      <label class="zoom">Zoom
        <select id="zoom">
          <option value="fit" selected>Fit</option>
          <option value="1">100%</option>
          <option value="1.5">150%</option>
          <option value="2">200%</option>
        </select>
      </label>
    </div>
    <div id="canvas-tools" class="canvas-tools" role="toolbar" aria-label="Canvas"></div>
    <div id="preview-error" class="preview-error" hidden></div>
    <div id="stage" class="stage">
      <section class="pane" data-view="print" aria-label="Print">
        <h3>Print</h3>
        <div id="frame" class="frame">
          <iframe id="f0" title="Print preview" tabindex="-1"></iframe>
          <iframe id="f1" title="Print preview" tabindex="-1"></iframe>
          <div class="canvas" data-view="print" tabindex="0" hidden></div>
        </div>
      </section>
      <section class="pane" data-view="web" aria-label="Web">
        <h3>Web</h3>
        <div id="frame-web" class="frame">
          <iframe id="live-web" title="Web preview"></iframe>
          <div class="canvas" data-view="web" tabindex="0" hidden></div>
        </div>
      </section>
      <section class="pane" data-view="phone" aria-label="Phone">
        <h3>Phone</h3>
        <div id="frame-phone" class="frame">
          <iframe id="live-phone" title="Phone preview"></iframe>
          <div class="canvas" data-view="phone" tabindex="0" hidden></div>
        </div>
      </section>
    </div>
  </section>
</div>

</body>
</html>
`

export async function GET(req: Request) {
  if (!(await graphUser(req))) {
    return new Response(null, {
      status: 307,
      headers: { Location: '/newsroom/login?redirect=%2Fgraph', 'Cache-Control': 'no-store' },
    })
  }
  return new Response(PAGE, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
