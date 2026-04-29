import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import { randomBytes } from 'node:crypto'
import { mkdtemp, rm, unlink, readFile, stat } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import config from '@/payload.config'
import { ffprobe, transcodeToOpus } from '@/lib/transcribe/ffmpeg'
import { dispatchToTranscribeApi } from '@/lib/transcribe/dispatch'
import { getTranscribeConfig } from '@/lib/transcribe/config'

const MAX_HOURS = 6
const STAFF_ROLES = ['admin', 'eic', 'editor', 'writer']
const VALID_KINDS = ['interview', 'meeting', 'presser', 'lecture', 'court', 'other']

export const dynamic = 'force-dynamic'
// Allow up to 30 min for very large uploads. The bytes are streamed straight
// to disk so memory stays flat regardless of request size.
export const maxDuration = 1800

export async function POST(req: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const roles = (user as unknown as { roles?: string[] }).roles ?? []
  if (!roles.some((r) => STAFF_ROLES.includes(r))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const filename = sanitizeFilename(url.searchParams.get('filename') ?? 'upload.bin')
  const title = (url.searchParams.get('title') ?? '').trim() || filename.replace(/\.[^.]+$/, '')
  const kindParam = url.searchParams.get('kind') ?? 'interview'
  const kind = VALID_KINDS.includes(kindParam) ? kindParam : 'interview'
  const notes = url.searchParams.get('notes') || undefined

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'polymer-upload-'))
  const tmpPath = path.join(tmpDir, filename)

  try {
    await streamRequestBodyToFile(req, tmpPath)

    const probe = await ffprobe(tmpPath).catch(() => null)
    if (!probe || !probe.hasAudio) {
      return NextResponse.json(
        { error: 'unsupported file or no audio stream detected' },
        { status: 415 },
      )
    }
    if (probe.durationSeconds > MAX_HOURS * 3600) {
      return NextResponse.json(
        { error: `audio exceeds ${MAX_HOURS} hours` },
        { status: 400 },
      )
    }

    const fileStats = await stat(tmpPath)
    const audioBuffer = await readFile(tmpPath)
    const detectedMime = req.headers.get('x-content-type') || 'application/octet-stream'

    const audioFile = await payload.create({
      collection: 'audio-files',
      file: {
        data: audioBuffer,
        mimetype: detectedMime,
        name: filename,
        size: fileStats.size,
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
      callbackSecret,
    })

    return NextResponse.json({ id: job.id, status: 'queued' }, { status: 201 })
  } catch (err) {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function sanitizeFilename(name: string): string {
  const base = path.basename(name)
  return base.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 200) || 'upload.bin'
}

async function streamRequestBodyToFile(req: Request, dest: string): Promise<void> {
  if (!req.body) throw new Error('empty request body')
  const out = createWriteStream(dest)
  const nodeStream = Readable.fromWeb(req.body as unknown as Parameters<typeof Readable.fromWeb>[0])
  await pipeline(nodeStream, out)
}

interface BackgroundArgs {
  audioJobId: number
  audioFilePath: string
  tmpDir: string
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
