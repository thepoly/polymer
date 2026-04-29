import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import { randomBytes } from 'node:crypto'
import { mkdtemp, rm, unlink, readFile, stat } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import path from 'node:path'
import os from 'node:os'
import Busboy from 'busboy'
import config from '@/payload.config'
import { ffprobe, transcodeToOpus } from '@/lib/transcribe/ffmpeg'
import { dispatchToTranscribeApi } from '@/lib/transcribe/dispatch'
import { getTranscribeConfig } from '@/lib/transcribe/config'

const MAX_HOURS = 6
const STAFF_ROLES = ['admin', 'eic', 'editor', 'writer']

export const dynamic = 'force-dynamic'
export const maxDuration = 1800

interface ParsedUpload {
  audioPath: string
  audioName: string
  audioMimeType: string
  title?: string
  kind?: string
  notes?: string
}

async function parseMultipart(req: Request, tmpDir: string): Promise<ParsedUpload> {
  if (!req.body) throw new Error('request has no body')

  const headers = Object.fromEntries(req.headers) as Record<string, string>
  const bb = Busboy({ headers })
  const fields: Record<string, string> = {}
  let audioPath: string | undefined
  let audioName: string | undefined
  let audioMimeType: string | undefined

  const nodeStream = Readable.fromWeb(req.body as Parameters<typeof Readable.fromWeb>[0])

  await new Promise<void>((resolve, reject) => {
    let pendingFile: Promise<void> | null = null
    let settled = false
    const settle = (fn: () => void) => {
      if (settled) return
      settled = true
      fn()
    }

    bb.on('file', (name, file, info) => {
      if (name !== 'audio') {
        file.resume()
        return
      }
      audioName = info.filename || 'upload.bin'
      audioMimeType = info.mimeType || 'application/octet-stream'
      const dest = path.join(tmpDir, audioName)
      audioPath = dest
      pendingFile = pipeline(file, createWriteStream(dest)).catch((err) => {
        settle(() => reject(err))
        throw err
      })
    })

    bb.on('field', (name, value) => {
      fields[name] = value
    })

    bb.on('error', (err) => {
      settle(() => reject(err instanceof Error ? err : new Error(String(err))))
    })

    bb.on('finish', () => {
      Promise.resolve(pendingFile)
        .then(() => settle(() => resolve()))
        .catch((err) => settle(() => reject(err)))
    })

    nodeStream.on('error', (err) => settle(() => reject(err)))
    nodeStream.pipe(bb)
  })

  if (!audioPath || !audioName || !audioMimeType) {
    throw new Error('audio file required')
  }

  return {
    audioPath,
    audioName,
    audioMimeType,
    title: fields.title,
    kind: fields.kind,
    notes: fields.notes,
  }
}

export async function POST(req: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const roles = (user as unknown as { roles?: string[] }).roles ?? []
  if (!roles.some((r) => STAFF_ROLES.includes(r))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'polymer-upload-'))

  let parsed: ParsedUpload
  try {
    parsed = await parseMultipart(req, tmpDir)
  } catch (err) {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
    const message = err instanceof Error ? err.message : 'invalid upload'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const tmpPath = parsed.audioPath
  const audioName = parsed.audioName
  const audioMimeType = parsed.audioMimeType
  const title = parsed.title ?? audioName
  const kind = parsed.kind ?? 'interview'
  const notes = parsed.notes && parsed.notes.length > 0 ? parsed.notes : undefined

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

    const fileStat = await stat(tmpPath)
    const fileBuffer = await readFile(tmpPath)

    const audioFile = await payload.create({
      collection: 'audio-files',
      file: {
        data: fileBuffer,
        mimetype: audioMimeType,
        name: audioName,
        size: fileStat.size,
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
      audioMimeType,
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
