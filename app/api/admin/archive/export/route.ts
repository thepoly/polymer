import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { createArchive, readStoredArchive } from '@/lib/payloadArchive'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const requireAdmin = async (request: Request) => {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(user as any)?.mergedPermissions?.admin) {
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
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('file')
    const archive = filename ? await readStoredArchive(filename) : await createArchive()

    return new NextResponse(archive.stream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${archive.filename}"`,
        'Cache-Control': 'no-store',
        'X-Archive-Server-Path': archive.serverPath,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export archive.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const user = await requireAdmin(request)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const archive = await createArchive()

    return NextResponse.json({
      ok: true,
      filename: archive.filename,
      serverPath: archive.serverPath,
      downloadUrl: `/api/admin/archive/export?file=${encodeURIComponent(archive.filename)}`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export archive.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
