import { createHmac, timingSafeEqual } from 'node:crypto'

export function signBody(body: string | Buffer, secret: string): string {
  const buf = typeof body === 'string' ? Buffer.from(body) : body
  return createHmac('sha256', secret).update(buf).digest('hex')
}

export function verifySignature(
  body: string | Buffer,
  header: string | null | undefined,
  secret: string,
): boolean {
  if (!header) return false
  const expected = signBody(body, secret)
  const provided = header.startsWith('sha256=') ? header.slice(7) : header
  if (provided.length !== expected.length) return false
  try {
    const a = Buffer.from(provided, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
