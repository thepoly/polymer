import { NextResponse, type NextRequest } from 'next/server'

// Article URLs look like /:section/:year/:month/:slug — the middleware only
// acts on URLs that match that shape. Anything else passes straight through.
const ARTICLE_URL_RE = /^\/([a-z]+)\/(\d{4})\/(\d{2})\/([a-z0-9][a-z0-9-]*)\/?$/

export async function middleware(req: NextRequest) {
  const match = req.nextUrl.pathname.match(ARTICLE_URL_RE)
  if (!match) return NextResponse.next()

  const [, section, year, month, slug] = match
  const params = new URLSearchParams({ section, year, month, slug })

  try {
    const statusRes = await fetch(
      `${req.nextUrl.origin}/api/article-status?${params.toString()}`,
      { next: { revalidate: 60, tags: [`article-status:${slug}`] } },
    )
    if (!statusRes.ok) return NextResponse.next()
    const data = (await statusRes.json()) as { gone?: boolean }
    if (data.gone) {
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
    // Skip everything we definitely don't want to intercept. The ARTICLE_URL_RE
    // above is the real filter; this matcher just avoids invoking middleware
    // on static assets and known non-article paths.
    '/((?!_next/|api/|admin/|favicon|robots\\.txt|sitemap|feed|logo|manifest).*)',
  ],
}
