import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { createArchive } from '@/lib/payloadArchive'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const requireAdmin = async (request: Request) => {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })

  if (!user?.roles?.includes('admin')) {
    return null
  }

  return user
}

export async function GET(request: Request) {
  const user = await requireAdmin(request)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const archive = await createArchive()

    return new NextResponse(archive.stream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${archive.filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export archive.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
