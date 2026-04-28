import { describe, expect, it } from 'vitest'
import { signBody, verifySignature } from '../../../lib/transcribe/hmac'

describe('signBody', () => {
  it('produces a deterministic hex digest', () => {
    expect(signBody('hello', 'secret')).toBe(
      '88aab3ede8d3adf94d26ab90d3bafd4a2083070c3bcce9c014ee04a443847c0b',
    )
  })

  it('handles Buffer input identically to string', () => {
    expect(signBody(Buffer.from('hello'), 'secret')).toBe(signBody('hello', 'secret'))
  })
})

describe('verifySignature', () => {
  const body = JSON.stringify({ job_id: 'abc', status: 'completed' })
  const secret = 'a-shared-secret'

  it('accepts a valid sha256= prefixed signature', () => {
    const sig = `sha256=${signBody(body, secret)}`
    expect(verifySignature(body, sig, secret)).toBe(true)
  })

  it('accepts a valid bare signature', () => {
    expect(verifySignature(body, signBody(body, secret), secret)).toBe(true)
  })

  it('rejects a tampered body', () => {
    const sig = signBody(body, secret)
    expect(verifySignature(body + 'x', sig, secret)).toBe(false)
  })

  it('rejects a wrong secret', () => {
    const sig = signBody(body, 'other')
    expect(verifySignature(body, sig, secret)).toBe(false)
  })

  it('rejects null/undefined header', () => {
    expect(verifySignature(body, null, secret)).toBe(false)
    expect(verifySignature(body, undefined, secret)).toBe(false)
  })

  it('rejects malformed hex', () => {
    expect(verifySignature(body, 'sha256=zzzz', secret)).toBe(false)
  })

  it('rejects wrong-length signature', () => {
    expect(verifySignature(body, 'sha256=deadbeef', secret)).toBe(false)
  })
})
