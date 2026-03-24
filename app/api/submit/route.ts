import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { checkRateLimit } from '@/utils/rateLimit'

const SUBMIT_RATE_LIMIT = 5
const SUBMIT_RATE_WINDOW_MS = 60_000
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'])

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const rl = checkRateLimit(`submit:${ip || 'anon'}`, SUBMIT_RATE_LIMIT, SUBMIT_RATE_WINDOW_MS)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    )
  }

  try {
    const formData = await req.formData()

    const title = formData.get('title') as string | null
    const authorName = formData.get('authorName') as string | null
    const contact = formData.get('contact') as string | null
    const content = formData.get('content') as string | null
    const featuredImageCaption = formData.get('featuredImageCaption') as string | null
    const imageFile = formData.get('featuredImage') as File | null

    if (!title?.trim() || !authorName?.trim() || !contact?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    let featuredImageId: number | undefined
    if (imageFile && imageFile.size > 0) {
      if (imageFile.size > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: 'Image must be under 10 MB.' }, { status: 400 })
      }
      if (!ALLOWED_IMAGE_TYPES.has(imageFile.type)) {
        return NextResponse.json({ error: 'Image must be JPEG, PNG, GIF, WebP, or AVIF.' }, { status: 400 })
      }
      const buffer = Buffer.from(await imageFile.arrayBuffer())
      const mediaDoc = await payload.create({
        collection: 'media',
        data: { alt: featuredImageCaption || title },
        file: {
          data: buffer,
          mimetype: imageFile.type,
          name: imageFile.name,
          size: imageFile.size,
        },
        overrideAccess: true,
      })
      featuredImageId = mediaDoc.id
    }

    await payload.create({
      collection: 'submissions',
      data: {
        title: title.trim(),
        opinionType: 'opinion',
        authorName: authorName.trim(),
        contact: contact.trim(),
        content: content.trim(),
        ...(featuredImageId !== undefined && { featuredImage: featuredImageId }),
        ...(featuredImageCaption?.trim() && { featuredImageCaption: featuredImageCaption.trim() }),
        status: 'new',
      },
      overrideAccess: true,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Submission error:', error)
    return NextResponse.json({ error: 'Failed to submit. Please try again.' }, { status: 500 })
  }
}
