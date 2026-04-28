import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { TranscriptData } from '@/lib/transcribe/types'

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const found = await payload.find({
    collection: 'transcripts',
    where: { audioJob: { equals: id } },
    limit: 1,
  })
  const t = found.docs[0]
  if (!t) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ id: t.id, data: t.data, editedAt: t.editedAt })
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = (await req.json()) as { data?: TranscriptData }
  if (!body.data || !Array.isArray(body.data.segments)) {
    return NextResponse.json({ error: 'data.segments required' }, { status: 400 })
  }

  const found = await payload.find({
    collection: 'transcripts',
    where: { audioJob: { equals: id } },
    limit: 1,
  })
  const t = found.docs[0]
  if (!t) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const searchableText = body.data.segments.map((s) => s.text).join(' ')
  await payload.update({
    collection: 'transcripts',
    id: t.id,
    data: {
      data: body.data as unknown as Record<string, unknown>,
      searchableText,
      editedAt: new Date().toISOString(),
      editedBy: typeof user.id === 'string' ? Number(user.id) : (user.id as number),
    },
  })
  return NextResponse.json({ ok: true })
}
