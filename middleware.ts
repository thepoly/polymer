import { NextResponse, type NextRequest } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@/payload.config'

// Run in the Node.js runtime so we can import Payload directly. This avoids
// making an internal HTTP fetch (which CodeQL flagged as SSRF because the URL
// would derive from the incoming Host header).
export const runtime = 'nodejs'

const ARTICLE_URL_RE = /^\/([a-z]+)\/(\d{4})\/(\d{2})\/([a-z0-9][a-z0-9-]*)\/?$/
// Old WordPress permalink shape from the 2009-2019 era. Years restricted
// to 2009-2019 so we don't accidentally swallow other paths.
const LEGACY_WP_URL_RE = /^\/(20(?:0[9]|1[0-9]))\/(\d{2})\/(\d{2})\/([a-z0-9][a-z0-9_-]*)\/?$/
// 5-digit ID URL shape from the WP-era pluginSL_shorturl plugin. Articles
// from 2013-2014 link to documents via these short codes.
const LEGACY_WP_SHORTLINK_RE = /^\/(\d{5})\/?$/
const VALID_SECTIONS = new Set(['news', 'sports', 'features', 'opinion'])

/**
 * 33 shortlinks recovered from the legacy WordPress `pluginSL_shorturl` table.
 * Most of these point at student-senate document portals (still up at
 * docs.studentsenate.rpi.edu) or external services (Google Docs, Eventbrite,
 * etc.). Some chain to old `poly.rpi.edu/YYYY/...` URLs that the
 * LEGACY_WP_URL_RE branch then redirects to their new polymer URL.
 *
 * Source: `pluginSL_shorturl` table in
 * /home/red/poly/recon/archives/wordpress/db/wordpress-archive-2026-05-06.sql.gz
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

export async function middleware(req: NextRequest) {
  // Legacy WP shortlink (5-digit IDs from pluginSL_shorturl) → original URL.
  const shortMatch = req.nextUrl.pathname.match(LEGACY_WP_SHORTLINK_RE)
  if (shortMatch) {
    const target = WP_LEGACY_SHORTLINKS[shortMatch[1]]
    if (target) {
      return NextResponse.redirect(target, 301)
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
