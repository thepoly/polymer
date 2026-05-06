/**
 * Pull `<div class="entry-content">` from a mirrored WP page.
 *
 * Returns the inner HTML of the first matching div, or null if not found.
 * The mirrored pages already have wpautop applied, so this is the cheapest
 * authoritative source for body HTML.
 */
import fs from 'node:fs'
import path from 'node:path'

/** Try to read and slice the entry-content from a mirror file. */
export function readEntryContentFromMirror(mirrorRoot: string, htmlRelPath: string): string | null {
  const abs = path.resolve(mirrorRoot, htmlRelPath)
  let html: string
  try {
    html = fs.readFileSync(abs, 'utf8')
  } catch {
    return null
  }
  return sliceEntryContent(html)
}

export function sliceEntryContent(html: string): string | null {
  // Find the opening div for entry-content. Anchor on class string with
  // optional surrounding text in the class attribute.
  const openRe = /<div\s+[^>]*class="[^"]*\bentry-content\b[^"]*"[^>]*>/i
  const openMatch = html.match(openRe)
  if (!openMatch || openMatch.index === undefined) return null
  const start = openMatch.index + openMatch[0].length
  // Walk forward to find the matching </div>. We track div nesting so a
  // <div> inside (e.g. wp-caption) doesn't close prematurely.
  let depth = 1
  let i = start
  const n = html.length
  while (i < n) {
    const lt = html.indexOf('<', i)
    if (lt === -1) break
    // Quick skip over comments
    if (html.startsWith('<!--', lt)) {
      const ce = html.indexOf('-->', lt + 4)
      i = ce === -1 ? n : ce + 3
      continue
    }
    // Check for opening div
    if (/^<div\b/i.test(html.slice(lt, lt + 4))) {
      depth++
      i = lt + 4
      continue
    }
    if (/^<\/div>/i.test(html.slice(lt, lt + 6))) {
      depth--
      if (depth === 0) {
        return html.slice(start, lt)
      }
      i = lt + 6
      continue
    }
    i = lt + 1
  }
  return null
}
