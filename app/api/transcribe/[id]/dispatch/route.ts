import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import { randomBytes } from 'node:crypto'
import { unlink } from 'node:fs/promises'
import path from 'node:path'
import config from '@/payload.config'
import { dispatchToTranscribeApi } from '@/lib/transcribe/dispatch'
import { transcodeToOpus } from '@/lib/transcribe/ffmpeg'
import { getTranscribeConfig } from '@/lib/transcribe/config'

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const job = await payload
    .findByID({ collection: 'audio-jobs', id, depth: 1 })
    .catch(() => null)
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const audioFile = typeof job.audioFile === 'object' ? job.audioFile : null
  if (!audioFile?.filename) {
    return NextResponse.json({ error: 'no audio file' }, { status: 409 })
  }

  const cfg = getTranscribeConfig()
  if (!cfg.configured) {
    return NextResponse.json({ error: 'transcribe API not configured' }, { status: 503 })
  }

  const audioDir = process.env.AUDIO_DIR || '/var/www/polymer-media/audio'
  const audioPath = path.join(audioDir, audioFile.filename)
  const opusPath = path.join(audioDir, `.tmp-${randomBytes(4).toString('hex')}.opus`)
  const callbackSecret = randomBytes(32).toString('hex')
  const audioJobId = typeof job.id === 'string' ? Number(job.id) : (job.id as number)

  await payload.update({
    collection: 'audio-jobs',
    id: audioJobId,
    data: {
      status: 'queued',
      dispatchAttempts: 0,
      error: null,
      callbackSecret,
    },
  })

  void (async () => {
    try {
      await payload.update({
        collection: 'audio-jobs',
        id: audioJobId,
        data: { status: 'dispatching' },
      })
      await transcodeToOpus(audioPath, opusPath)
      const result = await dispatchToTranscribeApi({
        audioPath: opusPath,
        audioFilename: 'audio.opus',
        audioMimeType: 'audio/opus',
        audioJobId,
        callbackSecret,
      })
      await payload.update({
        collection: 'audio-jobs',
        id: audioJobId,
        data: { status: 'processing', externalJobId: result.externalJobId },
      })
    } catch (e) {
      await payload.update({
        collection: 'audio-jobs',
        id: audioJobId,
        data: { status: 'failed', error: String(e) },
      })
    } finally {
      await unlink(opusPath).catch(() => {})
    }
  })()

  return NextResponse.json({ ok: true })
}
