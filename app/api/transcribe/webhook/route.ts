import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { verifySignature } from '@/lib/transcribe/hmac'
import type { TranscribeWebhookBody, TranscriptData } from '@/lib/transcribe/types'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const raw = await req.text()
  const sig = req.headers.get('x-polymer-transcribe-signature')

  let body: TranscribeWebhookBody
  try {
    body = JSON.parse(raw) as TranscribeWebhookBody
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }

  const audioJobId = body.metadata?.audioJobId
  if (!audioJobId) {
    return NextResponse.json({ error: 'missing metadata.audioJobId' }, { status: 400 })
  }

  const payload = await getPayload({ config })
  const job = await payload
    .findByID({ collection: 'audio-jobs', id: audioJobId, overrideAccess: true })
    .catch(() => null)
  if (!job) return NextResponse.json({ error: 'unknown job' }, { status: 404 })
  if (!job.callbackSecret) {
    return NextResponse.json({ error: 'no callback secret' }, { status: 409 })
  }
  if (!verifySignature(raw, sig, job.callbackSecret)) {
    return NextResponse.json({ error: 'bad signature' }, { status: 401 })
  }

  if (body.status === 'failed' || !body.result) {
    await payload.update({
      collection: 'audio-jobs',
      id: audioJobId,
      overrideAccess: true,
      data: { status: 'failed', error: body.error ?? 'unknown error' },
    })
    return NextResponse.json({ ok: true })
  }

  const r = body.result
  const data: TranscriptData = {
    language: r.language,
    duration: r.duration,
    model: r.model,
    speakers: r.speakers.map((s) => ({ id: s.id, label: null })),
    segments: r.segments.map((s) => ({
      id: s.id,
      speakerId: s.speaker_id,
      start: s.start,
      end: s.end,
      text: s.text,
      words: s.words.map((w) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        score: w.score,
      })),
    })),
  }
  const searchableText = data.segments.map((s) => s.text).join(' ')

  const existing = await payload.find({
    collection: 'transcripts',
    where: { audioJob: { equals: audioJobId } },
    limit: 1,
    overrideAccess: true,
  })
  // Payload's `json` field type expects an indexable record; TranscriptData
  // is structurally compatible but TS doesn't infer the index signature.
  const dataRecord = data as unknown as Record<string, unknown>
  if (existing.docs[0]) {
    await payload.update({
      collection: 'transcripts',
      id: existing.docs[0].id,
      overrideAccess: true,
      data: { data: dataRecord, searchableText },
    })
  } else {
    await payload.create({
      collection: 'transcripts',
      overrideAccess: true,
      data: { audioJob: audioJobId, data: dataRecord, searchableText },
    })
  }
  await payload.update({
    collection: 'audio-jobs',
    id: audioJobId,
    overrideAccess: true,
    data: { status: 'completed', transcribedAt: new Date().toISOString(), error: null },
  })

  return NextResponse.json({ ok: true })
}
