/**
 * Build the canonical polymer slug for a legacy poly-online article.
 *
 * Format: {YYYY-MM-DD}-{slugified-headline}
 * The date prefix is essential — the legacy archive spans 2001-2009 and headline
 * collisions across years are common (e.g. "Editorial").
 */

export function slugify(input: string): string {
  return input
    .toLowerCase()
    // Common HTML entities that appear pre-decode in legacy data:
    .replace(/&amp;/g, ' and ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

export function buildLegacySlug(canonicalDate: string, headline: string): string {
  const slugBody = slugify(headline) || 'untitled'
  // canonicalDate is YYYY-MM-DD; trust the manifest precomputation.
  return `${canonicalDate}-${slugBody}`
}
