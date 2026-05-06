/**
 * Slug helpers for the WP import.
 *
 * Mirrors the slugify rule used by `Articles.beforeChange`:
 *   - lowercase
 *   - strip everything that is not a-z, 0-9, whitespace, or hyphen
 *   - collapse whitespace and runs of hyphens to a single '-'
 *   - trim leading/trailing hyphens
 */
export function slugify(input: string): string {
  return (input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/**
 * Build the imported article slug. Format: YYYY-MM-DD-<slug>. The date prefix
 * makes collisions across 26 years of legacy content effectively impossible
 * even if a basename repeats.
 */
export function buildImportSlug(opts: {
  year: string | number
  month: string | number
  day: string | number
  base: string
}): string {
  const yyyy = String(opts.year).padStart(4, '0')
  const mm = String(opts.month).padStart(2, '0')
  const dd = String(opts.day).padStart(2, '0')
  const baseSlug = slugify(opts.base) || 'untitled'
  return `${yyyy}-${mm}-${dd}-${baseSlug}`
}

/**
 * Build the legacy archive HTML URL. Matches the on-disk mirror layout so the
 * browser can later request the original rendered page if we expose it.
 */
export function buildLegacyHtmlUrl(opts: {
  year: string | number
  month: string | number
  day: string | number
  slug: string
}): string {
  const yyyy = String(opts.year).padStart(4, '0')
  const mm = String(opts.month).padStart(2, '0')
  const dd = String(opts.day).padStart(2, '0')
  // The wget-mirror tarball was extracted with `mirror/` subdirectory intact,
  // so the on-disk path is /var/www/archive/wordpress/mirror/<Y>/<M>/<D>/<slug>/.
  return `/archive/wordpress/mirror/${yyyy}/${mm}/${dd}/${opts.slug}/`
}
