import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import configPromise from '@payload-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Platform = 'android' | 'ios'

const MAX_TOKEN_LENGTH = 4096
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_ENTRIES = 10_000

// Module-scoped, in-memory de-dupe: one registration per token per 60s.
// Next.js keeps module state alive across requests within a single
// process — this is a best-effort rate limit, not a security boundary.
const recentTokens = new Map<string, number>()

function rememberToken(token: string, now: number) {
  if (recentTokens.size >= RATE_LIMIT_MAX_ENTRIES) {
    // Map iteration order is insertion order, so deleting the first
    // entry evicts the oldest. Evict ~10% at once to amortize cost.
    const toEvict = Math.max(1, Math.floor(RATE_LIMIT_MAX_ENTRIES * 0.1))
    let evicted = 0
    for (const key of recentTokens.keys()) {
      recentTokens.delete(key)
      evicted += 1
      if (evicted >= toEvict) break
    }
  }
  recentTokens.set(token, now)
}

function isValidPlatform(value: unknown): value is Platform {
  return value === 'android' || value === 'ios'
}

export async function POST(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const body = (payload ?? {}) as { token?: unknown; platform?: unknown }
  const token = typeof body.token === 'string' ? body.token.trim() : ''
  if (!token || token.length > MAX_TOKEN_LENGTH) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  const platform: Platform = isValidPlatform(body.platform) ? body.platform : 'android'

  const now = Date.now()
  const lastSeen = recentTokens.get(token)
  if (lastSeen && now - lastSeen < RATE_LIMIT_WINDOW_MS) {
    return NextResponse.json({ ok: true, skipped: true })
  }
  rememberToken(token, now)

  try {
    const cms = await getPayload({ config: configPromise })

    const existing = await cms.find({
      collection: 'device-tokens',
      where: { token: { equals: token } },
      limit: 1,
      depth: 0,
      pagination: false,
    })

    if (existing.docs.length > 0) {
      await cms.update({
        collection: 'device-tokens',
        id: existing.docs[0].id,
        data: {
          lastSeenAt: new Date().toISOString(),
          platform,
        },
        depth: 0,
      })
    } else {
      await cms.create({
        collection: 'device-tokens',
        data: {
          token,
          platform,
          lastSeenAt: new Date().toISOString(),
        },
        depth: 0,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[push/register] upsert failed', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
