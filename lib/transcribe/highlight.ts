export interface HighlightRange {
  start: number
  end: number
}

const REGEX_META_CHARS = '.*+?^${}()|[]\\'

function escapeForRegex(input: string): string {
  let out = ''
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    out += REGEX_META_CHARS.includes(ch) ? `\\${ch}` : ch
  }
  return out
}

const TOKEN_RE = /"([^"]+)"|'([^']+)'|(\S+)/g

/**
 * Tokenize a search query into individual terms. Quoted phrases (single or
 * double) are kept as one term. Whitespace separates terms otherwise.
 */
export function tokenizeQuery(q: string): string[] {
  const tokens: string[] = []
  TOKEN_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = TOKEN_RE.exec(q)) !== null) {
    const term = (m[1] ?? m[2] ?? m[3] ?? '').trim()
    if (term) tokens.push(term)
  }
  return tokens
}

/**
 * Find non-overlapping match ranges for each term in `text`. Adjacent or
 * overlapping ranges are merged. Default is case-insensitive.
 */
export function findMatchRanges(
  text: string,
  query: string,
  opts: { caseSensitive?: boolean } = {},
): HighlightRange[] {
  const terms = tokenizeQuery(query)
  if (!terms.length || !text) return []

  const flags = opts.caseSensitive ? 'g' : 'gi'
  const ranges: HighlightRange[] = []
  for (const term of terms) {
    const pattern = new RegExp(escapeForRegex(term), flags)
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      if (match[0].length === 0) {
        pattern.lastIndex++
        continue
      }
      ranges.push({ start: match.index, end: match.index + match[0].length })
    }
  }
  if (!ranges.length) return []
  ranges.sort((a, b) => a.start - b.start)
  const merged: HighlightRange[] = [ranges[0]]
  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1]
    const cur = ranges[i]
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end)
    } else {
      merged.push(cur)
    }
  }
  return merged
}
