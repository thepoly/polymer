import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import configPromise from '@payload-config'
import { sendFcmToTokens } from '@/lib/fcm'
import { getArticleUrl } from '@/utils/getArticleUrl'
import { getPlainText } from '@/utils/getPlainText'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type DeviceTokenDoc = {
  id: number | string
  token: string
  platform?: string | null
}

async function fetchAllTokens(
  cms: Awaited<ReturnType<typeof getPayload>>,
): Promise<string[]> {
  const tokens: string[] = []
  const pageSize = 1000
  let page = 1
  let hasNextPage = true
  while (hasNextPage) {
    const res = await cms.find({
      collection: 'device-tokens',
      limit: pageSize,
      page,
      depth: 0,
    })
    const docs = res.docs as unknown as DeviceTokenDoc[]
    for (const d of docs) {
      if (typeof d.token === 'string' && d.token.length > 0) {
        tokens.push(d.token)
      }
    }
    hasNextPage = Boolean(res.hasNextPage)
    page += 1
  }
  return tokens
}

export async function POST(request: Request) {
  const expected = process.env.INTERNAL_PUSH_SECRET || ''
  const provided = request.headers.get('x-internal-secret') || ''
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const articleId = (payload as { articleId?: unknown })?.articleId
  if (articleId == null || (typeof articleId !== 'string' && typeof articleId !== 'number')) {
    return NextResponse.json({ error: 'articleId is required' }, { status: 400 })
  }

  try {
    const cms = await getPayload({ config: configPromise })

    const article = await cms.findByID({
      collection: 'articles',
      id: articleId as string | number,
      depth: 0,
    }).catch(() => null)

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }
    if (article._status !== 'published') {
      return NextResponse.json({ error: 'Article not published' }, { status: 404 })
    }

    const tokens = await fetchAllTokens(cms)
    if (tokens.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0 })
    }

    const title = getPlainText(article.title) || 'Breaking News'
    // spec fallback chain: kicker -> excerpt -> ''. `excerpt` does not
    // exist on the Articles schema, so subdeck stands in as the closest
    // editorial field.
    const body = (article.kicker as string | null | undefined)
      || (article.subdeck as string | null | undefined)
      || ''

    const permalink = getArticleUrl({
      section: article.section as string,
      slug: (article.slug as string | null | undefined) ?? null,
      publishedDate: (article.publishedDate as string | null | undefined) ?? null,
      createdAt: article.createdAt as string | undefined,
    })

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
    const articleUrl = permalink && permalink !== '#'
      ? (siteUrl ? `${siteUrl.replace(/\/$/, '')}${permalink}` : permalink)
      : ''

    const data: Record<string, string> = {
      articleId: String(articleId),
    }
    if (articleUrl) data.articleUrl = articleUrl

    const result = await sendFcmToTokens(tokens, {
      title,
      body,
      data,
    })

    return NextResponse.json({ sent: result.sent, failed: result.failed })
  } catch (err) {
    console.error('[push/send] failed', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
