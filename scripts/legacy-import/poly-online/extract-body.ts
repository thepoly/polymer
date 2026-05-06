/**
 * Extract the article body HTML from a polytechnic-online archived page.
 *
 * Page structure (consistent across all 7,995 entries):
 *   <font face='Arial, Helvetica, sans-serif' size='+2'>HEADLINE</font>
 *   [optional <i><b>SUBTITLE</b></i>]
 *   <i>Posted MM-DD-YYYY at H:MMPM</i>
 *   [optional <center><b>Byline...</b></center>]
 *   <hr>
 *   [optional "Skip to" navigation table for multi-part]
 *   <font size='-1' face='Verdana, Arial, Helvetica, sans-serif'>BODY</font>
 *   </td>
 *   ...page footer...
 *
 * The body block is the LAST `<font size='-1' face='Verdana...'>` block within
 * the center content `<td>` — specifically, it sits between the byline `<hr>`
 * marker (`hr_black.gif width='504'`) and the closing `</td>`.
 *
 * Strategy:
 *   1. Slice from the headline `size='+2'` marker forward to the first
 *      "Center Content Area Table" close comment (or the equivalent `</td>` boundary).
 *   2. Within that slice, find the LAST top-level Verdana `<font size='-1'>` block
 *      (excluding bylines, which are wrapped in `<center>`).
 */

const BODY_FONT_OPEN_RE =
  /<font\s+size=['"]-1['"]\s+face=['"]Verdana,\s*Arial,\s*Helvetica,\s*sans-serif['"]\s*>/gi

const ALT_BODY_FONT_OPEN_RE =
  /<font\s+face=['"]Verdana,\s*Arial,\s*Helvetica,\s*sans-serif['"]\s+size=['"]-1['"]\s*>/gi

/**
 * Returns the inner HTML of the article body, or null if extraction failed.
 */
export function extractBodyHtml(rawHtml: string): string | null {
  // Locate the headline anchor; everything before it is page chrome.
  const headlineMatch = rawHtml.match(
    /<font\s+face=['"]Arial,\s*Helvetica,\s*sans-serif['"]\s+size=['"]\+2['"]\s*>/i,
  )
  if (!headlineMatch || headlineMatch.index === undefined) return null
  const articleStart = headlineMatch.index

  // End boundary: the page footer "Posted MM-DD-YYYY at H:MMPM" that appears
  // again after the body, OR the END CENTER CONTENT AREA TABLE comment.
  const endComment = '<!-- END CENTER CONTENT AREA TABLE -->'
  const endIdx = rawHtml.indexOf(endComment, articleStart)
  const articleEnd = endIdx >= 0 ? endIdx : rawHtml.length

  const slice = rawHtml.slice(articleStart, articleEnd)

  // Find candidate body openings — both attribute-orderings observed in the wild.
  const candidates: { start: number; end: number; open: string }[] = []
  for (const re of [BODY_FONT_OPEN_RE, ALT_BODY_FONT_OPEN_RE]) {
    re.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = re.exec(slice)) !== null) {
      const openEnd = match.index + match[0].length
      const closeIdx = findMatchingFontClose(slice, openEnd)
      if (closeIdx > 0) {
        candidates.push({ start: openEnd, end: closeIdx, open: match[0] })
      }
    }
  }
  if (candidates.length === 0) return null

  // The byline (if present) is wrapped in `<center>`. Filter out any candidate
  // whose preceding 80 chars contains `<center>` — that's the byline block.
  const bodyCandidates = candidates.filter((c) => {
    const preceding = slice.slice(Math.max(0, c.start - 80), c.start).toLowerCase()
    return !preceding.includes('<center>')
  })

  // Among remaining candidates, prefer the longest — the body dominates.
  const finalists = bodyCandidates.length > 0 ? bodyCandidates : candidates
  finalists.sort((a, b) => b.end - b.start - (a.end - a.start))
  const best = finalists[0]
  if (!best) return null

  return slice.slice(best.start, best.end)
}

/**
 * Walks forward from `from` (inside the content of a `<font ...>` block) and
 * returns the index of the matching `</font>`. Handles nested fonts.
 */
function findMatchingFontClose(html: string, from: number): number {
  let depth = 1
  const tagRe = /<\/?font\b[^>]*>/gi
  tagRe.lastIndex = from
  let match: RegExpExecArray | null
  while ((match = tagRe.exec(html)) !== null) {
    const tag = match[0].toLowerCase()
    if (tag.startsWith('</font')) {
      depth--
      if (depth === 0) return match.index
    } else {
      depth++
    }
  }
  return -1
}

/**
 * Strip the "Skip to" navigation tables that appear in multi-part articles.
 * They look like a small <table> with "Skip to" and links such as
 * `<a href='?view=N&part=2'>...</a>`.
 */
export function stripSkipToNav(html: string): string {
  // Remove the entire <table>...</table> block whose first cell contains "Skip to".
  let result = html
  for (let pass = 0; pass < 4; pass++) {
    let changed = false
    const tableOpen = /<table\b[^>]*>/gi
    let match: RegExpExecArray | null
    while ((match = tableOpen.exec(result)) !== null) {
      const openStart = match.index
      const closeIdx = findMatchingTagClose(result, openStart + match[0].length, 'table')
      if (closeIdx < 0) break
      const block = result.slice(openStart, closeIdx + 8)
      if (/skip to/i.test(block)) {
        result = result.slice(0, openStart) + result.slice(closeIdx + 8)
        changed = true
        break
      }
    }
    if (!changed) break
  }
  return result
}

function findMatchingTagClose(html: string, from: number, tag: string): number {
  const openRe = new RegExp(`<${tag}\\b[^>]*>`, 'gi')
  const closeRe = new RegExp(`</${tag}\\s*>`, 'gi')
  let depth = 1
  let pos = from
  while (depth > 0) {
    openRe.lastIndex = pos
    closeRe.lastIndex = pos
    const openMatch = openRe.exec(html)
    const closeMatch = closeRe.exec(html)
    if (!closeMatch) return -1
    if (openMatch && openMatch.index < closeMatch.index) {
      depth++
      pos = openMatch.index + openMatch[0].length
    } else {
      depth--
      pos = closeMatch.index + closeMatch[0].length
      if (depth === 0) return closeMatch.index
    }
  }
  return -1
}
