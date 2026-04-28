import { spawn } from 'node:child_process'

export interface ProbeResult {
  durationSeconds: number
  hasAudio: boolean
}

/**
 * Run ffprobe on a file path. Uses spawn with array args (no shell), so the
 * file path cannot be interpreted as a shell expression.
 */
export async function ffprobe(filePath: string): Promise<ProbeResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'ffprobe',
      ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', filePath],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    )
    let out = ''
    let errBuf = ''
    proc.stdout.on('data', (d: Buffer) => {
      out += d.toString('utf8')
    })
    proc.stderr.on('data', (d: Buffer) => {
      errBuf += d.toString('utf8')
    })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited ${code}: ${errBuf.slice(-2000)}`))
        return
      }
      try {
        const json = JSON.parse(out) as {
          streams?: { codec_type?: string }[]
          format?: { duration?: string | number }
        }
        const streams = json.streams ?? []
        const hasAudio = streams.some((s) => s.codec_type === 'audio')
        const duration = Number(json.format?.duration ?? 0)
        resolve({ durationSeconds: Number.isFinite(duration) ? duration : 0, hasAudio })
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)))
      }
    })
  })
}

/**
 * Transcode any audio input to opus 32 kbps, mono, 16 kHz — matches what
 * Whisper resamples to internally, so accuracy is identical and the upload
 * stays well under Cloudflare's 100 MB body limit even for multi-hour audio.
 */
export async function transcodeToOpus(input: string, output: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'ffmpeg',
      [
        '-y',
        '-i', input,
        '-vn',
        '-ac', '1',
        '-ar', '16000',
        '-c:a', 'libopus',
        '-b:a', '32k',
        '-application', 'voip',
        output,
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    )
    let errBuf = ''
    proc.stderr.on('data', (d: Buffer) => {
      errBuf += d.toString('utf8')
      if (errBuf.length > 4096) errBuf = errBuf.slice(-2048)
    })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(`ffmpeg exited ${code}: ${errBuf.slice(-2000)}`))
      else resolve()
    })
  })
}
