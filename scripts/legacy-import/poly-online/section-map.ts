/**
 * Map legacy section_db values to polymer section + kicker.
 *
 * Section list (per manifest stats):
 *   "Ed/Op" 2056, "Sports" 1752, "Features" 1248, "News" 1023,
 *   "Whats Happening" 976, "RIB" 717, "Incident Blotter" 223
 */

export type PolymerSection = 'news' | 'sports' | 'features' | 'opinion'

export type SectionMapping = {
  section: PolymerSection
  kicker: string
}

const TABLE: Record<string, SectionMapping> = {
  News: { section: 'news', kicker: '' },
  Sports: { section: 'sports', kicker: '' },
  Features: { section: 'features', kicker: '' },
  'Ed/Op': { section: 'opinion', kicker: '' },
  'Whats Happening': { section: 'features', kicker: 'Whats Happening' },
  RIB: { section: 'news', kicker: 'RIB' },
  'Incident Blotter': { section: 'news', kicker: 'Incident Blotter' },
}

export function mapSection(legacy: string): SectionMapping {
  const hit = TABLE[legacy]
  if (hit) return hit
  // Fallback: route to features and stash the original in kicker so editors can re-bucket.
  return { section: 'features', kicker: legacy }
}
