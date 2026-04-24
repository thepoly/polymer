import { NextResponse, type NextRequest } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@/payload.config'

// Run in the Node.js runtime so we can import Payload directly. This avoids
// making an internal HTTP fetch (which CodeQL flagged as SSRF because the URL
// would derive from the incoming Host header).
export const runtime = 'nodejs'

const ARTICLE_URL_RE = /^\/([a-z]+)\/(\d{4})\/(\d{2})\/([a-z0-9][a-z0-9-]*)\/?$/
const VALID_SECTIONS = new Set(['news', 'sports', 'features', 'opinion'])

type CacheEntry = { gone: boolean; expiresAt: number }
const statusCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60_000

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

export async function middleware(req: NextRequest) {
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
