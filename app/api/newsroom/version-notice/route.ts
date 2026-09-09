import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import configPromise from '@payload-config'
import { APP_VERSION } from '@/lib/version'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Marks the signed-in user as having seen the running version's splash.
 *
 * Stamps whatever version is deployed rather than a hardcoded one, so a
 * release only has to bump package.json. `users.latestVersion` is also what
 * the dashboard's rollout pie chart groups by, so this is what moves someone
 * into the current slice.
 */
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
      latestVersion: APP_VERSION,
    } as Record<string, unknown>,
    depth: 0,
  })

  return NextResponse.json({ ok: true, version: APP_VERSION })
}
