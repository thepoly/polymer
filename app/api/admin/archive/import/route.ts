import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { importArchive } from '@/lib/payloadArchive'

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
  const user = await requireAdmin(request)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const archive = formData.get('archive')

    if (!(archive instanceof File)) {
      return NextResponse.json({ error: 'Archive file is required.' }, { status: 400 })
    }

    if (!archive.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json({ error: 'Archive must be a .zip file.' }, { status: 400 })
    }

    const manifest = await importArchive(Buffer.from(await archive.arrayBuffer()))

    return NextResponse.json({
      ok: true,
      importedAt: new Date().toISOString(),
      exportedAt: manifest.exportedAt,
      version: manifest.version,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import archive.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
