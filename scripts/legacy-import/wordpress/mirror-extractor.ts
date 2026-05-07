/**
 * Pull metadata + body HTML from a mirrored WP page.
 *
 * The mirror pages are pre-rendered HTML produced by the `poly_new_testbed` WP
 * theme, and they are by far the cleanest authoritative source for:
 *
 *   - the entry-content body (already wpautop-applied)
 *   - the article subdeck (`<h3 class="entry-subdeck">…</h3>`)
 *   - the byline (`<span class="author"><span class="name">…</span>…</span>`)
 *
 * The byline lives in the rendered HTML rather than the SQL because nearly
 * every WP post has post_author=1 (the generic "The Poly" account) — the real
 * reporter byline was set by editors via a custom theme widget that wrote
 * directly to the rendered template. Without parsing the mirror we'd
 * permanently lose the human author for ~99% of WP-era articles.
 *
 * The theme is consistent across all archive years (2009 → 2019); the same
 * DOM shape is used everywhere.
 */
import fs from 'node:fs'
import path from 'node:path'

import { decodeEntities } from './html-tokenizer.ts'

/** Try to read and slice the entry-content from a mirror file. */
export function readEntryContentFromMirror(mirrorRoot: string, htmlRelPath: string): string | null {
  const html = readMirror(mirrorRoot, htmlRelPath)
  if (html === null) return null
  return sliceEntryContent(html)
}

export type MirrorFields = {
  /** Inner HTML of `<div class="entry-content">`. */
  entryContent: string | null
  /** Plain-text subdeck (entities decoded, inline tags stripped). */
  subdeck: string | null
  /**
   * Plain-text kicker from `<div class="kicker">` (entities decoded, tags
   * stripped, trailing colon dropped). Used as a title fallback for articles
   * whose `post_title` is empty — a few WP-era posts (letters to the editor,
   * elections notices) carry no `post_title` and the mirror's kicker is the
   * only human-readable label.
   */
  kicker: string | null
  /**
   * Cleaned author display names parsed from `<span class="author">`. Position
   * suffixes ("Staff Reporter", "Senior Reviewer", "Grand Marshal", …) are
   * stripped. Empty array if no byline element was found OR the byline only
   * contained generic placeholder names ("The Poly", "admin", "wordpress",
   * "editorial staff", "poly staff", "staff reporter") — the caller should
   * fall back to wp_users.display_name in that case.
   */
  bylineAuthors: string[]
  /**
   * True when the mirror file was found and parsed (regardless of whether the
   * sub-fields were present). False means there was no mirror file.
   */
  found: boolean
}

/** One-shot extractor: read the file once, return everything we want. */
export function extractMirrorFields(
  mirrorRoot: string,
  htmlRelPath: string,
): MirrorFields {
  const html = readMirror(mirrorRoot, htmlRelPath)
  if (html === null) {
    return { entryContent: null, subdeck: null, kicker: null, bylineAuthors: [], found: false }
  }
  return {
    entryContent: sliceEntryContent(html),
    subdeck: extractSubdeck(html),
    kicker: extractMirrorKicker(html),
    bylineAuthors: extractBylineAuthors(html),
    found: true,
  }
}

/**
 * Extract the `<div class="kicker">…</div>` text. Strip trailing colon (the
 * theme renders kickers with one).
 */
export function extractMirrorKicker(html: string): string | null {
  const re = /<div\s+[^>]*class="[^"]*\bkicker\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i
  const m = html.match(re)
  if (!m) return null
  const t = stripInlineTags(m[1]).replace(/[:\s]+$/, '').trim()
  return t || null
}

function readMirror(mirrorRoot: string, htmlRelPath: string): string | null {
  if (!htmlRelPath) return null
  const abs = path.resolve(mirrorRoot, htmlRelPath)
  try {
    return fs.readFileSync(abs, 'utf8')
  } catch {
    return null
  }
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

/**
 * Strip inline HTML tags and normalize whitespace.
 *
 * Used for both subdeck extraction and byline name extraction — both fields
 * occasionally contain `<i>…</i>` (italicized titles) or `<a>…</a>` wrappers.
 */
function stripInlineTags(html: string): string {
  // Drop tags entirely (they're inline emphasis/links inside a
  // single-paragraph header element). Keep their text content.
  const noTags = html.replace(/<[^>]*>/g, '')
  // Collapse whitespace and decode entities.
  return decodeEntities(noTags).replace(/\s+/g, ' ').trim()
}

/** Extract the entry-subdeck heading text, or null if absent/empty. */
export function extractSubdeck(html: string): string | null {
  // <h3 class="entry-subdeck">…</h3>  (poly_new_testbed theme)
  // Tolerant of attribute order, additional classes, and whitespace.
  const re = /<h3\s+[^>]*class="[^"]*\bentry-subdeck\b[^"]*"[^>]*>([\s\S]*?)<\/h3>/i
  const m = html.match(re)
  if (!m) return null
  const text = stripInlineTags(m[1])
  return text || null
}

/**
 * Extract the byline `<span class="author">` content, then split into one or
 * more author display names with position/title suffixes removed.
 *
 * The theme's structure:
 *
 *   <span class="author">
 *     <span class="name">Jenn Leach</span>,
 *     <span class="title">Staff Reporter</span>
 *   </span>
 *
 * …but the inner `name` span sometimes carries multiple authors comma-joined,
 * or carries names + titles inline:
 *
 *   <span class="name">Justin Etzine, Olivia Fiscaletti</span>, <span class="title">Senior Reporters</span>
 *   <span class="name">Jonathan Caicedo, Staff Reviewer and Kay Sun, Senior Reviewer</span>
 *   <span class="name">Brookelyn Parslow, Senior Reporter, and Madison Wagner, Staff Reporter</span>
 *
 * We extract the inner text of the `name` span (preferring it over the outer
 * `author` span which may include a trailing position label), then split on
 * `;`, ` and `, and `, ` boundaries; strip any segment that matches a known
 * position suffix; and drop anything that's a generic placeholder.
 */
export function extractBylineAuthors(html: string): string[] {
  // Anchor on `<span class="author">…</span>`. We need an exact class match
  // because the same page also contains `<span class="meta-prep
  // meta-prep-author">Posted on</span>` — `\bauthor\b` would match that too
  // since `-` is a word boundary. So we require the class to be exactly
  // `author` or `author <something>` or `<something> author` (whitespace-
  // delimited within the class attribute).
  const openRe = /<span\s+[^>]*class="(?:[^"]*\s)?author(?:\s[^"]*)?"[^>]*>/i
  const openMatch = html.match(openRe)
  if (!openMatch || openMatch.index === undefined) return []
  const authorBlock = sliceMatchingSpan(html, openMatch.index, openMatch[0].length)
  if (!authorBlock) return []
  // Within that block, prefer the `<span class="name">` inner text. Same
  // strict anchoring for the same reason.
  const nameRe = /<span\s+[^>]*class="(?:[^"]*\s)?name(?:\s[^"]*)?"[^>]*>([\s\S]*?)<\/span>/i
  const nameMatch = authorBlock.match(nameRe)
  const rawNames = nameMatch ? stripInlineTags(nameMatch[1]) : stripInlineTags(authorBlock)
  if (!rawNames) return []
  return splitAndCleanAuthors(rawNames)
}

/** Walk the matching `</span>` for the span starting at `openIdx`. */
function sliceMatchingSpan(html: string, openIdx: number, openLen: number): string | null {
  let depth = 1
  let i = openIdx + openLen
  const n = html.length
  while (i < n) {
    const lt = html.indexOf('<', i)
    if (lt === -1) return null
    if (html.startsWith('<!--', lt)) {
      const ce = html.indexOf('-->', lt + 4)
      i = ce === -1 ? n : ce + 3
      continue
    }
    if (/^<span\b/i.test(html.slice(lt, lt + 5))) {
      depth++
      i = lt + 5
      continue
    }
    if (/^<\/span>/i.test(html.slice(lt, lt + 7))) {
      depth--
      if (depth === 0) return html.slice(openIdx + openLen, lt)
      i = lt + 7
      continue
    }
    i = lt + 1
  }
  return null
}

// ──────────────────────────────────────────────────────────────────────────
// Author cleanup
// ──────────────────────────────────────────────────────────────────────────

/** Lowercase patterns for position/title suffixes we want to strip. */
const POSITION_PATTERNS: RegExp[] = [
  /\b(?:senior|staff|junior|associate|assistant|chief|managing|copy|news|sports|features?|opinion|editorial|photography|photo|web|online|multimedia|guest|contributing|graduate|undergraduate)\s+(?:reporter|reviewer|editor|writer|columnist|photographer|correspondent|contributor)s?\b/i,
  /\bgrand\s+marshal\b/i,
  /\bpresident\s+of\s+(?:the\s+)?union\b/i,
  /\beditor[ -]in[ -]chief\b/i,
  /\bacting\s+(?:editor[ -]in[ -]chief|editor)\b/i,
  /\b(?:reporter|reviewer|editor|writer|columnist|photographer|correspondent|contributor)s?\b/i,
]

/**
 * Trailing credentials / generational suffixes that should be glued back onto
 * the preceding name rather than treated as a separate byline. These come
 * after a comma in the source ("Joe Albert, Ph.D.", "John Smith, Jr.",
 * "Larry Pulvirent '81, '82G") so the comma-splitter falsely treats them as
 * a second author.
 */
const NAME_SUFFIX_PATTERNS: RegExp[] = [
  /^(?:Ph\.?D\.?|M\.?D\.?|J\.?D\.?|Ed\.?D\.?|D\.?D\.?S\.?|M\.?B\.?A\.?|M\.?S\.?|B\.?S\.?|B\.?A\.?|M\.?A\.?|R\.?N\.?|Esq\.?|Jr\.?|Sr\.?|II|III|IV)$/i,
  // RPI class-year notation: "'81G", "'82", "’01G", "G'18". Also "TC&E G'18".
  /^[’'][0-9]{2}[A-Z]?$/,
  /^[A-Z]?[’'][0-9]{2}[A-Z]?$/,
  /^TC&E\s+G[’'][0-9]{2}$/i,
]

function looksLikeNameSuffix(s: string): boolean {
  const t = s.trim().replace(/\s+/g, ' ')
  if (!t) return false
  for (const re of NAME_SUFFIX_PATTERNS) {
    if (re.test(t)) return true
  }
  return false
}

/**
 * Names that are not human bylines and should trigger a fallback to the
 * wp_users path. We only treat truly-generic site placeholders as fallbacks
 * — collective bylines like "Editorial Staff" or "Poly Staff" are real
 * attributions and we keep them as-is.
 */
const GENERIC_BYLINES = new Set([
  'the poly',
  'the polytechnic',
  'admin',
  'wordpress',
])

/**
 * Public predicate so the importer can filter the wp_users fallback through
 * the same set. Without this, every old WP post (post_author=1, the generic
 * "The Poly" account) produces a literal "The Poly" write-in author.
 */
export function isGenericByline(name: string): boolean {
  return GENERIC_BYLINES.has(name.trim().toLowerCase())
}

/**
 * Trim, collapse whitespace, and strip a `<i>...</i>` wrapper if present.
 * Used by the wp_users fallback path so the importer doesn't have to re-import
 * the html-tokenizer just to clean a display name.
 */
export function cleanHumanName(raw: string): string {
  if (!raw) return ''
  const noTags = raw.replace(/<[^>]*>/g, '')
  return noTags.replace(/\s+/g, ' ').trim()
}

function splitAndCleanAuthors(raw: string): string[] {
  // Normalize separators. WP bylines use a mix of:
  //   "A, Title and B, Title"
  //   "A; B"
  //   "A, B, and C"
  //   "A and B"
  // We split on `;`, ` and ` (case-insensitive), then on `,` — and for each
  // resulting piece strip a trailing position-suffix segment.
  //
  // The tricky case is a single name span "Jonathan Caicedo, Staff Reviewer
  // and Kay Sun, Senior Reviewer" where the comma immediately after the
  // first name precedes a position rather than another author. We handle
  // that by splitting on `;` and ` and ` first, then trimming a trailing
  // ", <position-pattern>" off each piece.

  const pieces: string[] = []
  // First split on `;`, then on ` and ` (whole-word, case-insensitive). Then
  // try splitting on `/` IFF both halves look like full names — there are a
  // handful of joint-byline editorials like "Russell Brown/Christina
  // Gilliland" we do want to split, but plenty of degree-code bylines like
  // "Bryan Johns CSCI/BMGT '19" we MUST leave alone. The `looksLikeFullName`
  // heuristic gates the split.
  for (const semi of raw.split(/\s*;\s*/)) {
    if (!semi) continue
    for (const andPart of semi.split(/\s+and\s+/i)) {
      const trimmed = andPart.trim()
      if (!trimmed) continue
      const slashSplit = trySlashSplit(trimmed)
      for (const piece of slashSplit) pieces.push(piece)
    }
  }

  const out: string[] = []
  for (const piece of pieces) {
    // Trim a trailing ", <position>" if present. Be greedy: try the longest
    // suffix first (the patterns are already ordered roughly that way). If
    // the entire trailing piece matches a position, drop it.
    let cleaned = trimTrailingPosition(piece)
    // Now cleaned might still contain a comma if there are TWO real authors
    // listed comma-joined ("Justin Etzine, Olivia Fiscaletti"). Heuristic:
    // if there's exactly one comma AND neither side matches a position,
    // treat as two authors. Otherwise treat as one.
    //
    // Trailing credential suffixes (Ph.D., Jr., III, …) need special handling:
    // "Joe Albert, Ph.D." should stay as ONE author, not split into "Joe
    // Albert" + "Ph.D.". We keep credential-suffix segments glued to the
    // preceding name.
    const rawSegs = cleaned.split(/\s*,\s*/).map((s) => s.trim()).filter(Boolean)
    const segs: string[] = []
    for (const s of rawSegs) {
      if (segs.length > 0 && looksLikeNameSuffix(s)) {
        segs[segs.length - 1] = `${segs[segs.length - 1]}, ${s}`
      } else {
        segs.push(s)
      }
    }
    if (segs.length >= 2 && segs.every((s) => !looksLikePosition(s))) {
      for (const s of segs) {
        const final = finalizeAuthor(s)
        if (final) out.push(final)
      }
    } else {
      // Drop trailing position-y segments (e.g. "X, Senior Reporter, of Y").
      const kept = segs.filter((s, idx) => idx === 0 || !looksLikePosition(s))
      cleaned = kept.join(', ')
      const final = finalizeAuthor(cleaned)
      if (final) out.push(final)
    }
  }

  // De-duplicate while preserving order.
  const seen = new Set<string>()
  const dedup: string[] = []
  for (const a of out) {
    const k = a.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    dedup.push(a)
  }
  return dedup
}

/**
 * Attempt to split "A/B" on the slash IF both halves look like a full
 * person name (first + last, neither all-caps, neither containing a digit
 * or apostrophe-class-year). Otherwise return the input as a single piece.
 *
 * Examples that should split:
 *   "Russell Brown/Christina Gilliland" -> ["Russell Brown", "Christina Gilliland"]
 *
 * Examples that must NOT split:
 *   "Bryan Johns CSCI/BMGT '19"
 *   "Michael Gardner CSE/CS '17 TC&E G'18"
 *   "MIDN 3/C Michaela Bailie"   (military rank notation)
 */
function trySlashSplit(piece: string): string[] {
  if (!piece.includes('/')) return [piece]
  const halves = piece.split('/').map((s) => s.trim()).filter(Boolean)
  if (halves.length !== 2) return [piece]
  const looksLikePerson = (s: string): boolean => {
    if (!s) return false
    if (/\d/.test(s)) return false               // degree-year, military rank
    if (s.length < 5) return false               // "CS", "BMGT" etc.
    if (/^[A-Z]+$/.test(s.replace(/\s/g, ''))) return false  // all-caps abbrev
    if (!/\s/.test(s)) return false              // need first + last
    // Both words should start with an uppercase letter (loose name check).
    // Apostrophes inside a word are fine ("O'Neil", "D'Amico").
    const words = s.split(/\s+/)
    if (words.length < 2) return false
    return words.every((w) => /^[A-Z]/.test(w))
  }
  if (looksLikePerson(halves[0]) && looksLikePerson(halves[1])) {
    return halves
  }
  return [piece]
}

function trimTrailingPosition(piece: string): string {
  // Repeatedly chop a trailing ", <position-clause>" so chains like
  // "A, Senior Reporter, of Y" reduce to "A".
  let s = piece
  for (let i = 0; i < 3; i++) {
    const m = s.match(/^(.*?),\s*([^,]+)$/)
    if (!m) break
    if (looksLikePosition(m[2])) {
      s = m[1].trim()
      continue
    }
    break
  }
  return s.trim()
}

function looksLikePosition(s: string): boolean {
  const t = s.trim()
  if (!t) return true
  for (const re of POSITION_PATTERNS) {
    if (re.test(t)) return true
  }
  return false
}

function finalizeAuthor(s: string): string | null {
  const cleaned = s.trim().replace(/\s+/g, ' ')
  if (!cleaned) return null
  if (GENERIC_BYLINES.has(cleaned.toLowerCase())) return null
  // If what's left is *only* a position label, drop it — that means the
  // input was something like "Staff Reporter" with no human name attached.
  if (looksLikePosition(cleaned)) return null
  // Sanity bound — anything > 80 chars is almost certainly not a single name.
  if (cleaned.length > 80) return null
  return cleaned
}
