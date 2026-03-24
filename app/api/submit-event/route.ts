import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { checkRateLimit } from '@/utils/rateLimit'

const SUBMIT_RATE_LIMIT = 5
const SUBMIT_RATE_WINDOW_MS = 60_000

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const rl = checkRateLimit(`submit-event:${ip || 'anon'}`, SUBMIT_RATE_LIMIT, SUBMIT_RATE_WINDOW_MS)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    )
  }

  try {
    const body = await req.json()

    const { eventName, date, time, description, contactName, contactInfo } = body

    if (!eventName?.trim() || !date?.trim() || !time?.trim() || !description?.trim()) {
      return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    await payload.create({
      collection: 'event-submissions',
      data: {
        eventName: eventName.trim(),
        date,
        time: time.trim(),
        description: description.trim(),
        ...(contactName?.trim() && { contactName: contactName.trim() }),
        ...(contactInfo?.trim() && { contactInfo: contactInfo.trim() }),
        status: 'new',
      },
      overrideAccess: true,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Event submission error:', error)
    return NextResponse.json({ error: 'Failed to submit. Please try again.' }, { status: 500 })
  }
}
