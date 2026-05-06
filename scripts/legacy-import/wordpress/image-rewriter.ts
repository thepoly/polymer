/**
 * URL rewriter for legacy WP assets.
 *
 * Mapping rules (per spec):
 *   http(s)://poly.rpi.edu/wp-content/uploads/<path>   -> /archive/wordpress-media/uploads/<path>
 *   http(s)://10.10.10.18/wp-content/uploads/<path>    -> /archive/wordpress-media/uploads/<path>
 *   /wp-content/uploads/<path>                          -> /archive/wordpress-media/uploads/<path>
 *   wp-content/uploads/<path>                           -> /archive/wordpress-media/uploads/<path>
 *
 * Drops:
 *   anything from s.w.org, wp-includes/images/smilies/, or /wp-content/plugins/
 *   (these are emoji/smiley/social-icon assets the WP install used)
 */
const ARCHIVE_PREFIX = '/archive/wordpress-media/uploads/'

const DROP_PATTERNS: RegExp[] = [
  /^https?:\/\/s\.w\.org\//i,
  /\/wp-includes\/images\/smilies\//i,
  /\/wp-content\/plugins\//i,
  // WP's emoji svg endpoint
  /\/wp-includes\/images\/wlw\//i,
]

/**
 * Returns the rewritten URL or `null` if the asset should be dropped.
 */
export function rewriteAssetUrl(src: string): string | null {
  if (!src) return null
  const trimmed = src.trim()
  if (!trimmed) return null

  // Drop?
  for (const re of DROP_PATTERNS) {
    if (re.test(trimmed)) return null
  }

  // Absolute on poly.rpi.edu / archive host:
  let m = trimmed.match(/^https?:\/\/(?:www\.)?poly\.rpi\.edu\/wp-content\/uploads\/(.*)$/i)
  if (m) return ARCHIVE_PREFIX + m[1]

  m = trimmed.match(/^https?:\/\/10\.10\.10\.18\/wp-content\/uploads\/(.*)$/i)
  if (m) return ARCHIVE_PREFIX + m[1]

  m = trimmed.match(/^\/wp-content\/uploads\/(.*)$/i)
  if (m) return ARCHIVE_PREFIX + m[1]

  m = trimmed.match(/^wp-content\/uploads\/(.*)$/i)
  if (m) return ARCHIVE_PREFIX + m[1]

  return trimmed
}
