import { NextResponse, type NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export const runtime = 'nodejs'
export const revalidate = 60

const VALID_SECTIONS = new Set(['news', 'sports', 'features', 'opinion'])

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const section = searchParams.get('section')
  const slug = searchParams.get('slug')

  if (!section || !slug) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }
  if (!VALID_SECTIONS.has(section)) {
    return NextResponse.json({ gone: false })
  }

  const payload = await getPayload({ config })
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
    // read rule would hide them and we'd never be able to distinguish
    // "never existed" from "exists but unpublished".
    overrideAccess: true,
  })

  const article = result.docs[0] as ({ _status?: string } | undefined)
  if (!article) {
    return NextResponse.json({ gone: false })
  }

  const status = article._status
  return NextResponse.json({ gone: status !== 'published' })
}
