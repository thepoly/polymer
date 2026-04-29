export interface HighlightRange {
  start: number
  end: number
}

/**
 * Tokenize a search query into individual terms. Quoted phrases (single or
 * double) are kept as one term. Whitespace separates terms otherwise.
 *
 * Implemented as a small character-level scanner — keeps the user query out of
 * any RegExp construction so we cannot inject regex metacharacters.
 */
export function tokenizeQuery(q: string): string[] {
  const tokens: string[] = []
  let i = 0
  while (i < q.length) {
    const ch = q[i]
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++
      continue
    }
    if (ch === '"' || ch === "'") {
      const quote = ch
      const end = q.indexOf(quote, i + 1)
      if (end === -1) {
        const tail = q.slice(i + 1).trim()
        if (tail) tokens.push(tail)
        break
      }
      const inner = q.slice(i + 1, end).trim()
      if (inner) tokens.push(inner)
      i = end + 1
      continue
    }
    let j = i
    while (j < q.length && q[j] !== ' ' && q[j] !== '\t' && q[j] !== '\n' && q[j] !== '\r') {
      j++
    }
    const term = q.slice(i, j).trim()
    if (term) tokens.push(term)
    i = j
  }
  return tokens
}

/**
 * Find non-overlapping match ranges for each term in `text`. Adjacent or
 * overlapping ranges are merged. Default is case-insensitive.
 *
 * Uses String.prototype.indexOf instead of RegExp so the search query is
 * treated as a literal — no regex injection surface.
 */
export function findMatchRanges(
  text: string,
  query: string,
  opts: { caseSensitive?: boolean } = {},
): HighlightRange[] {
  const terms = tokenizeQuery(query)
  if (!terms.length || !text) return []

  const haystack = opts.caseSensitive ? text : text.toLowerCase()
  const ranges: HighlightRange[] = []
  for (const rawTerm of terms) {
    const needle = opts.caseSensitive ? rawTerm : rawTerm.toLowerCase()
    if (!needle) continue
    let from = 0
    while (from <= haystack.length) {
      const at = haystack.indexOf(needle, from)
      if (at === -1) break
      ranges.push({ start: at, end: at + needle.length })
      from = at + needle.length
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
