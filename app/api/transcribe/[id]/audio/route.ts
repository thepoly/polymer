import { NextResponse } from 'next/server'
import { createReadStream, statSync, existsSync } from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { getPayload } from 'payload'
import config from '@/payload.config'

const audioDir = process.env.AUDIO_DIR || '/var/www/polymer-media/audio'

function safeJoin(base: string, name: string): string | null {
  // Reject any filename that would escape the base dir.
  if (!name || name.includes('/') || name.includes('\\') || name.startsWith('.')) return null
  const resolved = path.resolve(base, name)
  const baseResolved = path.resolve(base)
  if (!resolved.startsWith(baseResolved + path.sep) && resolved !== baseResolved) return null
  return resolved
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return new NextResponse('unauthorized', { status: 401 })
  const job = await payload
    .findByID({ collection: 'audio-jobs', id, depth: 1 })
    .catch(() => null)
  if (!job) return new NextResponse('not found', { status: 404 })

  const audioFile = typeof job.audioFile === 'object' ? job.audioFile : null
  if (!audioFile?.filename) return new NextResponse('no audio', { status: 404 })

  const fp = safeJoin(audioDir, audioFile.filename)
  if (!fp || !existsSync(fp)) return new NextResponse('audio missing', { status: 404 })

  const stat = statSync(fp)
  const range = req.headers.get('range')
  if (range) {
    const match = /bytes=(\d+)-(\d+)?/.exec(range)
    if (match) {
      const start = Number(match[1])
      const end = match[2] ? Number(match[2]) : stat.size - 1
      const stream = createReadStream(fp, { start, end })
      return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(end - start + 1),
          'Content-Type': audioFile.mimeType || 'audio/mpeg',
        },
      })
    }
  }
  const stream = createReadStream(fp)
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: {
      'Content-Length': String(stat.size),
      'Accept-Ranges': 'bytes',
      'Content-Type': audioFile.mimeType || 'audio/mpeg',
    },
  })
}
