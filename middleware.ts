import { NextResponse, type NextRequest } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@/payload.config'
import { getPostHogClient } from '@/lib/posthog-server'
import { POSTHOG_KEY } from '@/lib/posthog-config'
import { REDIRECT_PATH_RE } from '@/lib/redirects'

// Run in the Node.js runtime so we can import Payload directly. This avoids
// making an internal HTTP fetch (which CodeQL flagged as SSRF because the URL
// would derive from the incoming Host header).
export const runtime = 'nodejs'

const ARTICLE_URL_RE = /^\/([a-z]+)\/(\d{4})\/(\d{2})\/([a-z0-9][a-z0-9-]*)\/?$/
// Old WordPress permalink shape from the 2009-2019 era. Years restricted
// to 2009-2019 so we don't accidentally swallow other paths.
const LEGACY_WP_URL_RE = /^\/(20(?:0[9]|1[0-9]))\/(\d{2})\/(\d{2})\/([a-z0-9][a-z0-9_-]*)\/?$/
// 5-char ID URL shape from the WP-era `pluginSL_shorturl` plugin. The
// codes are 5-digit numeric *or* 5-char alphanumeric (case-sensitive).
// Resolved against the `legacy_shortlinks` lookup table at request time.
const LEGACY_WP_SHORTLINK_RE = /^\/([A-Za-z0-9]{5})\/?$/
const VALID_SECTIONS = new Set(['news', 'sports', 'features', 'opinion'])

/**
 * Hand-curated overrides for the WordPress `pluginSL_shorturl` map. Anything
 * not present here falls through to the `legacy_shortlinks` table (5,014
 * rows backfilled from the source plugin). Kept for two reasons:
 *
 *   1. Documents are now hosted off-site (docs.studentsenate.rpi.edu, etc.);
 *      the override map keeps those redirect targets explicit and reviewable.
 *   2. A few codes have been edited at runtime over the years (e.g. NASA's
 *      mission_pages URL was renamed) and we want our pin to win.
 *
 * The DB-backed table can be regenerated from the dump via
 * `scripts/legacy-import/backfill-legacy-shortlinks.ts`.
 */
const WP_LEGACY_SHORTLINKS: Record<string, string> = {
  '06735': 'http://poly.rpi.edu/2013/03/06/pss_breaking_the_third_wall/',
  '38223': 'http://documents.studentsenate.rpi.edu/documents/2482/revisions/current/download',
  '12311': 'http://docs.studentsenate.rpi.edu/categories/366',
  '34045': 'http://poly.rpi.edu/2013/11/20/transportation_ideas_discussed/',
  '88672': 'http://poly.rpi.edu/2014/04/07/grand-marshal-qa/',
  '21482': 'http://poly.rpi.edu/wp-content/uploads/Decision_3_GM2014.pdf',
  '52780': 'https://db.tt/xJ0z6OEc',
  '85211': 'https://db.tt/PuGolFgh',
  '19218': 'https://db.tt/UCIBxBGY',
  '35434': 'http://docs.studentsenate.rpi.edu/categories/366?type=grid',
  '72189': 'https://www.youtube.com/watch?v=ZpnYtQWQES8',
  '75886': 'http://docs.studentsenate.rpi.edu/documents/2566/revisions/current/download',
  '36249': 'http://poly.rpi.edu/wp-content/uploads/docs.studentsenate.rpi_.pdf',
  '08077': 'http://www.nasa.gov/mission_pages/station/main/',
  '85326': 'http://scte.rpi.edu/foundry.html',
  '87234': 'https://docs.google.com/document/d/1Zl_TBwR5ICcmS8bh526DJUSeeejs4vDn5Bigwi_dCdo/edit?usp=sharing',
  '36284': 'http://www.nps.gov/nr/feature/places/13000911.htm',
  '13210': 'https://www.google.com/calendar/embed?src=rpistudentsenate@gmail.com&ctz=America/New_York',
  '91063': 'http://poly.rpi.edu/files/GreekLifeCommonsStatement.pdf',
  '19012': 'http://poly.rpi.edu/files/RecruitmentBylawsApproved05.08.2013.pdf',
  '29919': 'https://docs.google.com/forms/d/1-rwKTH03e8RhKi_9ewLkDpx0kSdV9UNruyi31oFCDEc/viewform',
  '09925': 'http://poly.rpi.edu/files/SiSTTTC-TC-r1.pdf',
  '90835': 'http://www.rpiathletics.com/schedule.aspx?path=hockey',
  '47288': 'http://docs.studentsenate.rpi.edu/categories/401',
  '22763': 'http://www.signupgenius.com/go/10c044aaea92caafc1-reunion',
  '83842': 'http://harvestmoonpainting.eventbrite.com',
  '83483': 'http://conta.cc/1lWpAhY',
  '95508': 'http://www.facebook.com/hybridelectronicsandcharacterizationlab',
  '82923': 'http://rpi.edu/~lewisk2',
  '68268': 'https://docs.google.com/forms/d/1UXBlf4V8sxRlVOj_XRP5b0OIra1zKizyT_QX3uI7nnc/viewform',
  '42183': 'http://198.57.203.133/~princfj9/wp/',
  '26062': 'http://rpiecoheroes.wikispaces.com/home',
  '17163': 'http://asme.union.rpi.edu/pumpkin.html',
}

type CacheEntry = { gone: boolean; expiresAt: number }
const statusCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60_000

type RedirectEntry = { to: string | null; expiresAt: number }
const legacyRedirectCache = new Map<string, RedirectEntry>()
const previousSlugRedirectCache = new Map<string, RedirectEntry>()
const shortlinkRedirectCache = new Map<string, RedirectEntry>()

/**
 * Look up the destination URL for a 5-char WP shortlink. Pulls from the
 * `legacy_shortlinks` table backfilled from the `pluginSL_shorturl` plugin.
 *
 * No Payload collection wraps this table — the rows aren't editorial — so
 * we go through the raw `pg.Pool` exposed by the postgres db adapter.
 */
async function lookupShortlinkRedirect(code: string): Promise<string | null> {
  const cached = shortlinkRedirectCache.get(code)
  const now = Date.now()
  if (cached && cached.expiresAt > now) return cached.to

  const payload = await getPayload({ config: payloadConfig })
  const pool = (payload.db as unknown as { pool?: import('pg').Pool }).pool
  let to: string | null = null
  if (pool) {
    const r = await pool.query<{ target_url: string }>(
      'SELECT target_url FROM legacy_shortlinks WHERE short_code = $1 LIMIT 1',
      [code],
    )
    to = r.rows[0]?.target_url ?? null
  }
  shortlinkRedirectCache.set(code, { to, expiresAt: now + CACHE_TTL_MS })
  return to
}

async function isArticleGone(section: string, slug: string): Promise<boolean> {
  if (!VALID_SECTIONS.has(section)) return false

  const key = `${section}:${slug}`
  const cached = statusCache.get(key)
  const now = Date.now()
  if (cached && cached.expiresAt > now) return cached.gone

  const payload = await getPayload({ config: payloadConfig })
  const result = await payload.find({
    collection: 'articles',
    where: {
      and: [
        { slug: { equals: slug } },
        { section: { equals: section } },
      ],
    },
    limit: 1,
    depth: 0,
    // overrideAccess lets us see unpublished rows — without it, the anonymous
    // read rule would hide them and we couldn't tell "exists but unpublished"
    // from "never existed." Only a boolean is returned; no draft content leaks.
    overrideAccess: true,
  })

  const article = result.docs[0] as ({ _status?: string } | undefined)
  const gone = Boolean(article && article._status !== 'published')
  statusCache.set(key, { gone, expiresAt: now + CACHE_TTL_MS })
  return gone
}

/**
 * Look up the canonical URL for an article whose slug was renamed. Returns
 * the new URL when `previous_slug` matches; null otherwise. Used by the 301
 * redirect fallback in the article-URL branch when the live `slug` lookup
 * fails.
 */
async function lookupPreviousSlugRedirect(
  section: string,
  oldSlug: string,
): Promise<string | null> {
  const cacheKey = `${section}:${oldSlug}`
  const cached = previousSlugRedirectCache.get(cacheKey)
  const now = Date.now()
  if (cached && cached.expiresAt > now) return cached.to

  const payload = await getPayload({ config: payloadConfig })
  const result = await payload.find({
    collection: 'articles',
    where: {
      and: [
        { previousSlug: { equals: oldSlug } },
        { section: { equals: section } },
        { _status: { equals: 'published' } },
      ],
    },
    limit: 1,
    depth: 0,
    select: { slug: true, section: true, publishedDate: true },
  })
  const doc = result.docs[0] as
    | { slug?: string; section?: string; publishedDate?: string }
    | undefined
  let to: string | null = null
  if (doc?.slug && doc?.section && doc?.publishedDate) {
    const dt = new Date(doc.publishedDate)
    const yy = dt.getUTCFullYear().toString()
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
    to = `/${doc.section}/${yy}/${mm}/${doc.slug}`
  }
  previousSlugRedirectCache.set(cacheKey, { to, expiresAt: now + CACHE_TTL_MS })
  return to
}

/**
 * Look up the polymer URL for an old WordPress permalink shape
 * `/{year}/{month}/{day}/{slug}/`. Returns the new URL or null if no match.
 */
async function lookupLegacyWpRedirect(
  year: string,
  month: string,
  day: string,
  wpSlug: string,
): Promise<string | null> {
  const cacheKey = `${year}/${month}/${day}/${wpSlug}`
  const cached = legacyRedirectCache.get(cacheKey)
  const now = Date.now()
  if (cached && cached.expiresAt > now) return cached.to

  const legacyHtmlUrl = `/archive/wordpress/mirror/${year}/${month}/${day}/${wpSlug}/`
  const payload = await getPayload({ config: payloadConfig })
  const result = await payload.find({
    collection: 'articles',
    where: {
      and: [
        { legacyHtmlUrl: { equals: legacyHtmlUrl } },
        { _status: { equals: 'published' } },
      ],
    },
    limit: 1,
    depth: 0,
    select: { slug: true, section: true, publishedDate: true },
  })
  const doc = result.docs[0] as { slug?: string; section?: string; publishedDate?: string } | undefined
  let to: string | null = null
  if (doc?.slug && doc?.section && doc?.publishedDate) {
    const dt = new Date(doc.publishedDate)
    const yy = dt.getUTCFullYear().toString()
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
    to = `/${doc.section}/${yy}/${mm}/${doc.slug}`
  }
  legacyRedirectCache.set(cacheKey, { to, expiresAt: now + CACHE_TTL_MS })
  return to
}

// Custom tracked redirects from the `redirects` collection. The whole table
// is small, so it's held in memory and refreshed at most every 30s — a new
// or edited redirect goes live within that window.
const CUSTOM_REDIRECT_TTL_MS = 30_000
let customRedirects: { byPath: Map<string, string>; expiresAt: number } | null = null

async function lookupCustomRedirect(path: string): Promise<string | null> {
  const now = Date.now()
  if (!customRedirects || customRedirects.expiresAt <= now) {
    const payload = await getPayload({ config: payloadConfig })
    const result = await payload.find({
      collection: 'redirects',
      limit: 0,
      pagination: false,
      depth: 0,
      overrideAccess: true,
      select: { path: true, destination: true },
    })
    const byPath = new Map<string, string>()
    for (const doc of result.docs) {
      if (doc.path && doc.destination) byPath.set(doc.path, doc.destination)
    }
    customRedirects = { byPath, expiresAt: now + CUSTOM_REDIRECT_TTL_MS }
  }
  return customRedirects.byPath.get(path) ?? null
}

/**
 * The visitor's PostHog distinct id from the posthog-js cookie, so a redirect
 * hit joins the rest of their session. Null for first-time visitors.
 */
function posthogDistinctId(req: NextRequest): string | null {
  if (!POSTHOG_KEY) return null
  const raw = req.cookies.get(`ph_${POSTHOG_KEY}_posthog`)?.value
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { distinct_id?: unknown }
    return typeof parsed.distinct_id === 'string' && parsed.distinct_id ? parsed.distinct_id : null
  } catch {
    return null
  }
}

function trackRedirect(req: NextRequest, path: string, destination: string) {
  try {
    const knownId = posthogDistinctId(req)
    const params = req.nextUrl.searchParams
    const utm: Record<string, string> = {}
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
      const value = params.get(key)
      if (value) utm[key] = value
    }
    getPostHogClient()?.capture({
      distinctId: knownId ?? crypto.randomUUID(),
      event: 'redirect_followed',
      properties: {
        redirect_path: path,
        redirect_destination: destination,
        // Behind nginx the request URL is the internal localhost:3000 one, so
        // rebuild it on the public origin.
        $current_url: new URL(
          req.nextUrl.pathname + req.nextUrl.search,
          process.env.NEXT_PUBLIC_SITE_URL || 'https://poly.rpi.edu',
        ).href,
        $host: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://poly.rpi.edu').host,
        $pathname: req.nextUrl.pathname,
        $referrer: req.headers.get('referer') || '$direct',
        $raw_user_agent: req.headers.get('user-agent') || undefined,
        ...utm,
        // Anonymous hits shouldn't each mint a person profile.
        ...(knownId ? {} : { $process_person_profile: false }),
      },
    })
  } catch {
    // Tracking must never break the redirect.
  }
}

export async function middleware(req: NextRequest) {
  // Custom tracked redirect (poly.rpi.edu/<path>) from the `redirects`
  // collection. Checked first so it wins over the legacy shortlink codes.
  const customPath = req.nextUrl.pathname.replace(/^\/|\/$/g, '').toLowerCase()
  if (REDIRECT_PATH_RE.test(customPath)) {
    try {
      const destination = await lookupCustomRedirect(customPath)
      if (destination) {
        trackRedirect(req, customPath, destination)
        const url = /^https?:\/\//i.test(destination)
          ? destination
          : new URL(destination, req.url).toString()
        // 302 + no-store so browsers ask every time and each hit is counted.
        const res = NextResponse.redirect(url, 302)
        res.headers.set('Cache-Control', 'no-store')
        return res
      }
    } catch {
      // Fall through — the request is handled as if no redirect existed.
    }
  }

  // Legacy WP shortlink (5-char IDs from pluginSL_shorturl) → target URL.
  // The hand-curated `WP_LEGACY_SHORTLINKS` map wins; otherwise we look up
  // the DB-backed `legacy_shortlinks` table.
  const shortMatch = req.nextUrl.pathname.match(LEGACY_WP_SHORTLINK_RE)
  if (shortMatch) {
    const code = shortMatch[1]
    const override = WP_LEGACY_SHORTLINKS[code]
    if (override) {
      return NextResponse.redirect(override, 301)
    }
    try {
      const target = await lookupShortlinkRedirect(code)
      if (target) {
        // External (absolute) targets pass through; relative paths get
        // resolved against the request origin.
        const url = /^https?:\/\//i.test(target) ? target : new URL(target, req.url).toString()
        return NextResponse.redirect(url, 301)
      }
    } catch {
      // Fall through — let the request 404 normally if lookup fails.
    }
  }

  // Old WP permalink → new polymer URL (preserves SEO from the 2009-2019 era).
  const wpMatch = req.nextUrl.pathname.match(LEGACY_WP_URL_RE)
  if (wpMatch) {
    const [, y, m, d, slug] = wpMatch
    try {
      const to = await lookupLegacyWpRedirect(y, m, d, slug)
      if (to) {
        return NextResponse.redirect(new URL(to, req.url), 301)
      }
    } catch {
      // Fall through on lookup error — the request will 404 normally.
    }
  }

  const match = req.nextUrl.pathname.match(ARTICLE_URL_RE)
  if (!match) return NextResponse.next()

  const [, section, , , slug] = match

  try {
    // Renamed-slug 301: if no row has `slug=$slug` but one has
    // `previous_slug=$slug`, redirect to the new canonical URL. This kicks in
    // for the legacy slug-cleanup pass (post_name `_`-stripping) and any
    // future editor-driven rename.
    const renamedTo = await lookupPreviousSlugRedirect(section, slug)
    if (renamedTo) {
      return NextResponse.redirect(new URL(renamedTo, req.url), 301)
    }

    if (await isArticleGone(section, slug)) {
      // 410 Gone tells search engines the URL is permanently removed so they
      // de-index faster than they would from a bare 404.
      return new NextResponse('Gone — this article has been unpublished.', {
        status: 410,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600',
        },
      })
    }
  } catch {
    // If the status check fails for any reason, don't break the page — fall
    // through and let the normal page handler render (which will 404 on miss).
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // The ARTICLE_URL_RE above is the real filter; this matcher just avoids
    // invoking middleware on static assets and known non-article paths.
    '/((?!_next/|api/|admin/|favicon|robots\\.txt|sitemap|feed|logo|manifest).*)',
  ],
}
