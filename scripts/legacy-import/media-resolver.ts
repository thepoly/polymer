/**
 * Resolve `<img src=…>` references found in legacy article bodies to numeric
 * media-collection ids. Bypasses Payload's upload pipeline (no file copy)
 * and inserts directly via SQL with `source_url` set; the Media collection's
 * afterRead hook then surfaces the URL when no `filename` is present.
 *
 * - Idempotent: lookups by `source_url`, creates only when missing.
 * - Caches within the run for cheap repeat hits across articles.
 *
 * The script-side caller passes a `pg.Pool` (already wired up in the WP
 * importer) plus the rewritten archive URL. The poly-online importer
 * doesn't yet have a pool — we accept either a pool or a function-shaped
 * adapter so both call sites stay simple.
 */
import type { Pool } from 'pg'

export type DbAdapter = {
  query: <T = unknown>(text: string, params?: unknown[]) => Promise<{ rows: T[] }>
}

export class LegacyMediaResolver {
  private readonly db: DbAdapter
  private readonly cache = new Map<string, number>()

  constructor(db: Pool | DbAdapter) {
    // Pool's .query returns the same shape we need.
    this.db = db as DbAdapter
  }

  /**
   * Look up the media row for an archive URL. Inserts one if missing.
   * Returns the row id (or null on error).
   */
  async resolve(archiveUrl: string, alt: string | null): Promise<number | null> {
    const url = archiveUrl.trim()
    if (!url) return null
    const cached = this.cache.get(url)
    if (cached !== undefined) return cached

    try {
      const found = await this.db.query<{ id: number }>(
        'SELECT "id" FROM "media" WHERE "source_url" = $1 LIMIT 1',
        [url],
      )
      if (found.rows.length > 0) {
        this.cache.set(url, found.rows[0].id)
        return found.rows[0].id
      }

      const filename = url.split('/').pop() || ''
      const ext = (filename.match(/\.([a-z0-9]{2,4})$/i)?.[1] || '').toLowerCase()
      const mime = MIME_BY_EXT[ext] || 'application/octet-stream'
      // Use the basename without extension as a default title; admins can edit.
      const title = filename.replace(/\.[a-z0-9]{2,4}$/i, '').replace(/[-_]+/g, ' ').trim() || 'Legacy archive image'
      const altText = (alt || '').trim() || title

      const inserted = await this.db.query<{ id: number }>(
        `INSERT INTO "media" ("alt", "title", "source_url", "mime_type", "created_at", "updated_at")
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING "id"`,
        [altText, title, url, mime],
      )
      if (inserted.rows.length === 0) return null
      this.cache.set(url, inserted.rows[0].id)
      return inserted.rows[0].id
    } catch {
      return null
    }
  }

  size(): number {
    return this.cache.size
  }
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  tiff: 'image/tiff',
  tif: 'image/tiff',
}

// ──────────────────────────────────────────────────────────────────────────
// Lexical tree post-processing: walk a content tree, find upload-placeholder
// nodes, and replace them with real upload nodes referencing media row ids.
// ──────────────────────────────────────────────────────────────────────────

type LexicalNode = {
  type?: string
  src?: string
  alt?: string
  children?: LexicalNode[]
  [k: string]: unknown
}

const PLACEHOLDER_TYPE = 'legacy-image-placeholder'

export function makeImagePlaceholder(src: string, alt: string | null): LexicalNode {
  return {
    type: PLACEHOLDER_TYPE,
    src,
    alt: alt || '',
    version: 1,
  } as LexicalNode
}

function uploadNode(mediaId: number, alt: string): LexicalNode {
  return {
    type: 'upload',
    value: mediaId,
    fields: alt ? { caption: alt } : {},
    format: '',
    version: 3,
    relationTo: 'media',
  } as LexicalNode
}

/**
 * Walk a Lexical content tree. For every placeholder node (created by
 * makeImagePlaceholder), resolve the src to a media id and replace the
 * placeholder with an upload node. Placeholders that fail to resolve are
 * dropped entirely (they would otherwise validate-fail Payload's create).
 *
 * Mutates the tree in place. Returns counts for logging.
 */
export async function resolveImagesInLexicalTree(
  content: unknown,
  resolver: LegacyMediaResolver,
): Promise<{ resolved: number; dropped: number }> {
  let resolved = 0
  let dropped = 0

  async function visit(node: LexicalNode): Promise<void> {
    const children = node.children
    if (!Array.isArray(children)) return
    const next: LexicalNode[] = []
    for (const child of children) {
      if (!child || typeof child !== 'object') continue
      if (child.type === PLACEHOLDER_TYPE) {
        const id = await resolver.resolve(String(child.src || ''), String(child.alt || ''))
        if (id !== null) {
          next.push(uploadNode(id, String(child.alt || '')))
          resolved++
        } else {
          dropped++
        }
        continue
      }
      next.push(child as LexicalNode)
    }
    node.children = next
    for (const c of node.children) await visit(c)
  }

  if (content && typeof content === 'object') {
    const root = (content as { root?: LexicalNode }).root
    if (root) await visit(root)
  }

  return { resolved, dropped }
}
