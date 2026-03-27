import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import configPromise from '@payload-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await payload.update({
    collection: 'users',
    id: user.id,
    data: {
      latestVersion: '1.0.0',
    } as Record<string, unknown>,
    depth: 0,
  })

  return NextResponse.json({ ok: true })
}
