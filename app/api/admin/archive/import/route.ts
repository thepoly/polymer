import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { importArchive, importArchiveFromServerPath } from '@/lib/payloadArchive'

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

export async function POST(request: Request) {
  const requestId = crypto.randomUUID()
  const user = await requireAdmin(request)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', requestId }, { status: 401 })
  }

  try {
    const contentType = request.headers.get('content-type') || ''
    let manifest

    if (contentType.includes('application/json')) {
      const body = (await request.json()) as { serverPath?: string }
      const serverPath = body.serverPath?.trim()

      if (!serverPath) {
        return NextResponse.json(
          { error: 'Server archive path is required.', requestId },
          { status: 400 },
        )
      }

      manifest = await importArchiveFromServerPath(serverPath)
    } else {
      const formData = await request.formData()
      const archive = formData.get('archive')

      if (!(archive instanceof File)) {
        return NextResponse.json(
          { error: 'Archive file is required.', requestId },
          { status: 400 },
        )
      }

      if (!archive.name.toLowerCase().endsWith('.zip')) {
        return NextResponse.json(
          { error: 'Archive must be a .zip file.', requestId },
          { status: 400 },
        )
      }

      manifest = await importArchive(Buffer.from(await archive.arrayBuffer()))
    }

    return NextResponse.json({
      ok: true,
      requestId,
      importedAt: new Date().toISOString(),
      exportedAt: manifest.exportedAt,
      version: manifest.version,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import archive.'
    console.error(`[archive-import:${requestId}]`, error)
    return NextResponse.json({ error: message, requestId }, { status: 500 })
  }
}
