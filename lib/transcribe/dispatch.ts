import { createReadStream } from 'node:fs'
import { Readable } from 'node:stream'
import { getTranscribeConfig } from './config'

export interface DispatchInput {
  audioPath: string
  audioFilename: string
  audioMimeType: string
  audioJobId: number
  callbackSecret: string
}

export interface DispatchResult {
  externalJobId: string
  queuePosition?: number
}

export async function dispatchToTranscribeApi(input: DispatchInput): Promise<DispatchResult> {
  const cfg = getTranscribeConfig()
  if (!cfg.configured) throw new Error('Transcribe API not configured')

  const callbackUrl = `${cfg.publicBaseUrl}/api/transcribe/webhook`

  const fileBlob = await fileStreamToBlob(input.audioPath, input.audioMimeType)

  const form = new FormData()
  form.append('audio', fileBlob, input.audioFilename)
  form.append('callback_url', callbackUrl)
  form.append('callback_secret', input.callbackSecret)
  form.append('job_metadata', JSON.stringify({ audioJobId: input.audioJobId }))

  const res = await fetch(`${cfg.url}/v1/jobs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      'CF-Access-Client-Id': cfg.cfClientId,
      'CF-Access-Client-Secret': cfg.cfClientSecret,
    },
    body: form,
    signal: AbortSignal.timeout(10 * 60 * 1000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Transcribe API ${res.status}: ${body.slice(0, 500)}`)
  }
  const json = (await res.json()) as { job_id: string; queue_position?: number }
  return { externalJobId: json.job_id, queuePosition: json.queue_position }
}

async function fileStreamToBlob(path: string, mimeType: string): Promise<Blob> {
  const stream = Readable.toWeb(createReadStream(path)) as ReadableStream<Uint8Array>
  const res = new Response(stream, { headers: { 'Content-Type': mimeType } })
  return await res.blob()
}
