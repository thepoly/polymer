export type TranscribeConfig =
  | { configured: false }
  | {
      configured: true
      url: string
      apiKey: string
      cfClientId: string
      cfClientSecret: string
      publicBaseUrl: string
    }

export function getTranscribeConfig(): TranscribeConfig {
  const url = process.env.TRANSCRIBE_API_URL
  const apiKey = process.env.TRANSCRIBE_API_KEY
  const cfId = process.env.TRANSCRIBE_CF_ACCESS_CLIENT_ID
  const cfSecret = process.env.TRANSCRIBE_CF_ACCESS_CLIENT_SECRET
  const publicBase = process.env.TRANSCRIBE_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL

  if (!url || !apiKey || !cfId || !cfSecret || !publicBase) {
    return { configured: false }
  }
  return {
    configured: true,
    url: url.replace(/\/$/, ''),
    apiKey,
    cfClientId: cfId,
    cfClientSecret: cfSecret,
    publicBaseUrl: publicBase.replace(/\/$/, ''),
  }
}
