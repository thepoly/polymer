// Short tracked redirects (poly.rpi.edu/<path>), defined in the `redirects`
// collection and served by middleware.ts.

// One URL segment: lowercase letters, digits, hyphens and underscores.
export const REDIRECT_PATH_RE = /^[a-z0-9][a-z0-9_-]*$/

// Top-level routes the site itself serves. A redirect on one of these would
// shadow the real page, since middleware runs before routing.
const RESERVED_PATHS = new Set([
  'news',
  'sports',
  'features',
  'opinion',
  'about',
  'archive',
  'archives',
  'contact',
  'copyright',
  'live',
  'preview',
  'privacy',
  'search',
  'staff',
  'staff2',
  'submit',
  '12',
  'rpi-finance-26',
  'admin',
  'newsroom',
  'api',
  'media',
  'fonts',
  'print',
  'graph-editor',
  'easter-egg',
  '_next',
])

// Prefixes the middleware matcher skips entirely, so a redirect starting with
// one of them would never fire.
const SKIPPED_PREFIXES = ['favicon', 'robots.txt', 'sitemap', 'feed', 'logo', 'manifest']

export function normalizeRedirectPath(input: string): string {
  return input.trim().replace(/^\/+|\/+$/g, '').toLowerCase()
}

/** Returns an error message, or null when the path is usable. */
export function redirectPathError(path: string): string | null {
  if (!REDIRECT_PATH_RE.test(path)) {
    return 'Use lowercase letters, numbers, hyphens and underscores only (one segment, no slashes).'
  }
  if (RESERVED_PATHS.has(path)) return `"/${path}" is already a page on the site.`
  if (SKIPPED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return `Paths can't start with ${SKIPPED_PREFIXES.map((p) => `"${p}"`).join(', ')}.`
  }
  return null
}

/** Returns an error message, or null when the destination is usable. */
export function redirectDestinationError(destination: string): string | null {
  if (/^\/(?!\/)/.test(destination)) return null
  try {
    const url = new URL(destination)
    if (url.protocol === 'http:' || url.protocol === 'https:') return null
  } catch {
    // fall through
  }
  return 'Enter a full URL (https://…) or a path on this site starting with "/".'
}
