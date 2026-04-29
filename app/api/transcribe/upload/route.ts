import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import { randomBytes } from 'node:crypto'
import { mkdtemp, writeFile, rm, unlink } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import config from '@/payload.config'
import { ffprobe, transcodeToOpus } from '@/lib/transcribe/ffmpeg'
import { dispatchToTranscribeApi } from '@/lib/transcribe/dispatch'
import { getTranscribeConfig } from '@/lib/transcribe/config'

const MAX_HOURS = 6
const STAFF_ROLES = ['admin', 'eic', 'editor', 'writer']

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const roles = (user as unknown as { roles?: string[] }).roles ?? []
  if (!roles.some((r) => STAFF_ROLES.includes(r))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const form = await req.formData()
  const audio = form.get('audio')
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: 'audio file required' }, { status: 400 })
  }
  const title = String(form.get('title') ?? audio.name)
  const kind = String(form.get('kind') ?? 'interview')
  const notesRaw = form.get('notes')
  const notes = typeof notesRaw === 'string' && notesRaw.length > 0 ? notesRaw : undefined

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'polymer-upload-'))
  const tmpPath = path.join(tmpDir, audio.name)
  const audioBuffer = Buffer.from(await audio.arrayBuffer())
  await writeFile(tmpPath, audioBuffer)

  try {
    const probe = await ffprobe(tmpPath)
    if (!probe.hasAudio) {
      return NextResponse.json({ error: 'file has no audio stream' }, { status: 415 })
    }
    if (probe.durationSeconds > MAX_HOURS * 3600) {
      return NextResponse.json(
        { error: `audio exceeds ${MAX_HOURS} hours` },
        { status: 400 },
      )
    }

    const audioFile = await payload.create({
      collection: 'audio-files',
      file: {
        data: audioBuffer,
        mimetype: audio.type || 'application/octet-stream',
        name: audio.name,
        size: audio.size,
      },
      data: {
        durationSeconds: probe.durationSeconds,
        uploader: typeof user.id === 'string' ? Number(user.id) : (user.id as number),
      },
    })

    const callbackSecret = randomBytes(32).toString('hex')
    const job = await payload.create({
      collection: 'audio-jobs',
      data: {
        title,
        kind: kind as never,
        notes,
        audioFile: audioFile.id,
        uploader: typeof user.id === 'string' ? Number(user.id) : (user.id as number),
        status: 'queued',
        callbackSecret,
      },
    })

    const audioJobId = typeof job.id === 'string' ? Number(job.id) : (job.id as number)

    void dispatchInBackground({
      audioJobId,
      audioFilePath: tmpPath,
      tmpDir,
      audioMimeType: audio.type || 'application/octet-stream',
      callbackSecret,
    })

    return NextResponse.json({ id: job.id, status: 'queued' }, { status: 201 })
  } catch (err) {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
    throw err
  }
}

interface BackgroundArgs {
  audioJobId: number
  audioFilePath: string
  tmpDir: string
  audioMimeType: string
  callbackSecret: string
}

async function dispatchInBackground(args: BackgroundArgs): Promise<void> {
  const payload = await getPayload({ config })
  const cfg = getTranscribeConfig()
  if (!cfg.configured) {
    await payload.update({
      collection: 'audio-jobs',
      id: args.audioJobId,
      data: {
        status: 'failed',
        error:
          'TRANSCRIBE_API_URL/API_KEY/CF_ACCESS_* not configured on the server. See docs/superpowers/specs/2026-04-28-audio-transcription-design.md',
      },
    })
    await rm(args.tmpDir, { recursive: true, force: true }).catch(() => {})
    return
  }

  const opusPath = path.join(args.tmpDir, 'audio.opus')
  try {
    await payload.update({
      collection: 'audio-jobs',
      id: args.audioJobId,
      data: { status: 'dispatching' },
    })
    await transcodeToOpus(args.audioFilePath, opusPath)

    const result = await dispatchToTranscribeApi({
      audioPath: opusPath,
      audioFilename: 'audio.opus',
      audioMimeType: 'audio/opus',
      audioJobId: args.audioJobId,
      callbackSecret: args.callbackSecret,
    })
    await payload.update({
      collection: 'audio-jobs',
      id: args.audioJobId,
      data: { status: 'processing', externalJobId: result.externalJobId },
    })
  } catch (err) {
    const job = await payload.findByID({ collection: 'audio-jobs', id: args.audioJobId })
    const attempts = (job.dispatchAttempts ?? 0) + 1
    if (attempts >= 3) {
      await payload.update({
        collection: 'audio-jobs',
        id: args.audioJobId,
        data: { status: 'failed', error: String(err), dispatchAttempts: attempts },
      })
    } else {
      const backoffMs = [60_000, 300_000, 1_500_000][attempts - 1] ?? 60_000
      await payload.update({
        collection: 'audio-jobs',
        id: args.audioJobId,
        data: { status: 'queued', dispatchAttempts: attempts, error: String(err) },
      })
      setTimeout(() => {
        void dispatchInBackground(args)
      }, backoffMs)
      return
    }
  } finally {
    await unlink(opusPath).catch(() => {})
  }

  await rm(args.tmpDir, { recursive: true, force: true }).catch(() => {})
}
