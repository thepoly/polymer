/**
 * Tiny HTML tokenizer.
 *
 * Just enough to walk WP `post_content` (or the entry-content from the
 * mirror) and produce a list of tokens we can fold into a Lexical document.
 *
 * Supports:
 *   - Open / close / self-closing tags
 *   - Attributes (single or double quoted, or unquoted)
 *   - HTML comments (`<!-- ... -->`) — emitted as `comment` tokens
 *   - HTML entity decoding for text nodes (a small whitelist + numeric refs)
 *
 * Does NOT support: CDATA, processing instructions, doctype, namespaces.
 * The WP corpus produces none of these inside post_content.
 */

export type HtmlToken =
  | { kind: 'text'; value: string }
  | { kind: 'open'; name: string; attrs: Record<string, string>; selfClosing: boolean }
  | { kind: 'close'; name: string }
  | { kind: 'comment'; value: string }

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
  'meta', 'param', 'source', 'track', 'wbr',
])

/** Tags whose content is treated as opaque (we still tokenize but the caller decides). */
const RAW_TEXT_TAGS = new Set(['script', 'style'])

const ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  copy: '©',
  reg: '®',
  trade: '™',
  laquo: '«',
  raquo: '»',
  middot: '·',
  bull: '•',
  Auml: 'Ä', auml: 'ä',
  Ouml: 'Ö', ouml: 'ö',
  Uuml: 'Ü', uuml: 'ü',
  szlig: 'ß',
  eacute: 'é', Eacute: 'É',
  egrave: 'è', Egrave: 'È',
  ecirc: 'ê', Ecirc: 'Ê',
  iacute: 'í', Iacute: 'Í',
  oacute: 'ó', Oacute: 'Ó',
  uacute: 'ú', Uacute: 'Ú',
  aacute: 'á', Aacute: 'Á',
  ntilde: 'ñ', Ntilde: 'Ñ',
  // Greek letters — appear in fraternity/sorority names ("ΠΛΥ pledge").
  Alpha: 'Α', alpha: 'α',
  Beta: 'Β', beta: 'β',
  Gamma: 'Γ', gamma: 'γ',
  Delta: 'Δ', delta: 'δ',
  Epsilon: 'Ε', epsilon: 'ε',
  Zeta: 'Ζ', zeta: 'ζ',
  Eta: 'Η', eta: 'η',
  Theta: 'Θ', theta: 'θ',
  Iota: 'Ι', iota: 'ι',
  Kappa: 'Κ', kappa: 'κ',
  Lambda: 'Λ', lambda: 'λ',
  Mu: 'Μ', mu: 'μ',
  Nu: 'Ν', nu: 'ν',
  Xi: 'Ξ', xi: 'ξ',
  Omicron: 'Ο', omicron: 'ο',
  Pi: 'Π', pi: 'π',
  Rho: 'Ρ', rho: 'ρ',
  Sigma: 'Σ', sigma: 'σ',
  Tau: 'Τ', tau: 'τ',
  Upsilon: 'Υ', upsilon: 'υ',
  Phi: 'Φ', phi: 'φ',
  Chi: 'Χ', chi: 'χ',
  Psi: 'Ψ', psi: 'ψ',
  Omega: 'Ω', omega: 'ω',
}

export function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (full, ent) => {
    if (ent[0] === '#') {
      let code: number
      if (ent[1] === 'x' || ent[1] === 'X') {
        code = parseInt(ent.slice(2), 16)
      } else {
        code = parseInt(ent.slice(1), 10)
      }
      if (Number.isFinite(code) && code >= 0 && code <= 0x10ffff) {
        try { return String.fromCodePoint(code) } catch { return full }
      }
      return full
    }
    return ENTITY_MAP[ent] ?? full
  })
}

export function* tokenizeHtml(html: string): Generator<HtmlToken> {
  let i = 0
  const n = html.length
  while (i < n) {
    const c = html[i]
    if (c === '<') {
      // Comment?
      if (html.startsWith('<!--', i)) {
        const end = html.indexOf('-->', i + 4)
        if (end === -1) {
          // Truncated comment — bail out by treating the rest as text.
          yield { kind: 'text', value: decodeEntities(html.slice(i)) }
          return
        }
        yield { kind: 'comment', value: html.slice(i + 4, end) }
        i = end + 3
        continue
      }
      // Doctype / processing instruction — skip blindly.
      if (html.startsWith('<!', i) || html.startsWith('<?', i)) {
        const end = html.indexOf('>', i)
        if (end === -1) return
        i = end + 1
        continue
      }
      // Close tag?
      if (html[i + 1] === '/') {
        const end = html.indexOf('>', i + 2)
        if (end === -1) {
          yield { kind: 'text', value: decodeEntities(html.slice(i)) }
          return
        }
        const name = html.slice(i + 2, end).trim().toLowerCase().split(/\s+/)[0]
        if (name) yield { kind: 'close', name }
        i = end + 1
        continue
      }
      // Open tag.
      const end = findTagEnd(html, i)
      if (end === -1) {
        yield { kind: 'text', value: decodeEntities(html.slice(i)) }
        return
      }
      const inner = html.slice(i + 1, end)
      const parsed = parseOpenTag(inner)
      if (parsed) {
        const isSelfClosing = parsed.selfClosing || VOID_TAGS.has(parsed.name)
        yield { kind: 'open', name: parsed.name, attrs: parsed.attrs, selfClosing: isSelfClosing }
        i = end + 1
        // For raw-text tags, jump to closing tag and emit nothing inside.
        if (RAW_TEXT_TAGS.has(parsed.name) && !isSelfClosing) {
          const closeRe = new RegExp(`</${parsed.name}\\s*>`, 'i')
          const m = html.slice(i).match(closeRe)
          if (m && m.index !== undefined) {
            i += m.index + m[0].length
            yield { kind: 'close', name: parsed.name }
          }
        }
        continue
      }
      // Couldn't parse — treat as literal text.
      yield { kind: 'text', value: decodeEntities(html.slice(i, end + 1)) }
      i = end + 1
      continue
    }
    // Text run up to the next '<' (or end of string).
    const next = html.indexOf('<', i)
    const textEnd = next === -1 ? n : next
    const t = html.slice(i, textEnd)
    if (t) yield { kind: 'text', value: decodeEntities(t) }
    i = textEnd
  }
}

/**
 * Find the index of the '>' that closes the tag starting at `start`.
 * Respects quoted attribute values so e.g. <a title="a > b"> doesn't
 * truncate prematurely.
 */
function findTagEnd(html: string, start: number): number {
  let i = start + 1
  let inSingle = false
  let inDouble = false
  while (i < html.length) {
    const c = html[i]
    if (!inSingle && !inDouble && c === '>') return i
    if (!inDouble && c === "'") inSingle = !inSingle
    else if (!inSingle && c === '"') inDouble = !inDouble
    i++
  }
  return -1
}

function parseOpenTag(
  inner: string,
): { name: string; attrs: Record<string, string>; selfClosing: boolean } | null {
  let s = inner.trim()
  if (!s) return null
  let selfClosing = false
  if (s.endsWith('/')) {
    selfClosing = true
    s = s.slice(0, -1).trim()
  }
  const nameMatch = s.match(/^([a-zA-Z][a-zA-Z0-9-]*)/)
  if (!nameMatch) return null
  const name = nameMatch[1].toLowerCase()
  let i = nameMatch[0].length
  const attrs: Record<string, string> = {}
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++
    if (i >= s.length) break
    const attrStart = i
    while (i < s.length && /[^\s=]/.test(s[i])) i++
    const attrName = s.slice(attrStart, i).toLowerCase()
    if (!attrName) break
    while (i < s.length && /\s/.test(s[i])) i++
    if (s[i] !== '=') {
      attrs[attrName] = ''
      continue
    }
    i++ // consume '='
    while (i < s.length && /\s/.test(s[i])) i++
    if (s[i] === '"' || s[i] === "'") {
      const q = s[i]
      i++
      const valStart = i
      while (i < s.length && s[i] !== q) i++
      attrs[attrName] = decodeEntities(s.slice(valStart, i))
      if (s[i] === q) i++
    } else {
      const valStart = i
      while (i < s.length && /[^\s>]/.test(s[i])) i++
      attrs[attrName] = decodeEntities(s.slice(valStart, i))
    }
  }
  return { name, attrs, selfClosing }
}
