import { promises as fs } from 'node:fs'
import path from 'node:path'

const mediaDir = process.env.MEDIA_DIR || '/var/www/polymer-media'

const CONTENT_TYPES: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
}

function badRequest(message: string, status = 400) {
  return new Response(message, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params

  if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return badRequest('Invalid filename')
  }

  const filePath = path.join(mediaDir, filename)
  const extension = path.extname(filename).toLowerCase()
  const contentType = CONTENT_TYPES[extension] || 'application/octet-stream'

  try {
    const file = await fs.readFile(filePath)
    return new Response(file, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return badRequest('File not found', 404)
    }
    return badRequest('Failed to read logo file', 500)
  }
}
