/**
 * WP category -> polymer section mapping.
 *
 * Polymer's section enum is fixed at: news | sports | features | opinion.
 * Anything that doesn't match one of those four maps to its closest cousin
 * here, and the original WP category name is preserved in `kicker` and in
 * `legacyCategory` so editors can sanity-check after import.
 *
 * This dump's actual category list (from terms WHERE taxonomy='category'):
 *   1  Uncategorized        -> features (default catch-all)
 *   3  Editorial/Opinion    -> opinion
 *   4  Features             -> features
 *   5  News                 -> news
 *   6  Sports               -> sports
 *   7  Post Publication     -> features (admin/internal; rare)
 *   8  Announcements        -> news
 *   10 PDF archives         -> features (legacy PDF dump container)
 */
export type PolymerSection = 'news' | 'sports' | 'features' | 'opinion'

const EXACT_MATCH: Record<string, PolymerSection> = {
  news: 'news',
  sports: 'sports',
  features: 'features',
  opinion: 'opinion',
}

/**
 * Heuristic mapping for non-exact WP category names. Order matters: more
 * specific keywords first.
 */
const KEYWORD_RULES: { test: RegExp; section: PolymerSection }[] = [
  { test: /(editor(?:ial)?|op[\s-]?ed|letter|column|notebook|top hat)/i, section: 'opinion' },
  { test: /(opinion)/i, section: 'opinion' },
  { test: /(sport|hockey|football|basketball|tennis|baseball|soccer|lacrosse)/i, section: 'sports' },
  { test: /(news|announce|business|polit|campus|senate|union)/i, section: 'news' },
  { test: /(feature|profile|review|arts|culture|life)/i, section: 'features' },
]

export function mapWpCategoryToSection(name: string): PolymerSection {
  const cleaned = name.trim()
  if (!cleaned) return 'features'
  const lower = cleaned.toLowerCase()
  if (EXACT_MATCH[lower]) return EXACT_MATCH[lower]
  for (const rule of KEYWORD_RULES) {
    if (rule.test.test(lower)) return rule.section
  }
  return 'features'
}

/**
 * For a list of WP category names attached to a post, derive (section, kicker).
 *
 * - Pick the first category that maps to one of the four sections (preferring
 *   exact-named ones), use that as the polymer section.
 * - If the chosen category's name is NOT one of the literal four (case-
 *   insensitive), populate `kicker` with the verbatim WP name. Otherwise
 *   leave kicker empty.
 * - If the post has multiple categories, the rest are not represented in
 *   `kicker` — they're preserved in `legacyCategory`.
 */
export function deriveSectionAndKicker(categoryNames: string[]): {
  section: PolymerSection
  kicker: string | null
} {
  if (categoryNames.length === 0) {
    return { section: 'features', kicker: null }
  }
  // Prefer an exact-named category (news/sports/features/opinion) if any.
  const exactHit = categoryNames.find((n) => EXACT_MATCH[n.trim().toLowerCase()])
  if (exactHit) {
    return { section: EXACT_MATCH[exactHit.trim().toLowerCase()], kicker: null }
  }
  // Otherwise take the first category, map heuristically, and use its name as kicker.
  const first = categoryNames[0]
  return { section: mapWpCategoryToSection(first), kicker: first.trim() || null }
}

export function joinLegacyCategory(categoryNames: string[]): string | null {
  if (!categoryNames.length) return null
  return categoryNames.map((n) => n.trim()).filter(Boolean).join(', ') || null
}
