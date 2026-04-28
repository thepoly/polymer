import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const job = await payload
    .findByID({ collection: 'audio-jobs', id })
    .catch(() => null)
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    error: job.error,
    transcribedAt: job.transcribedAt,
    title: job.title,
    kind: job.kind,
  })
}
