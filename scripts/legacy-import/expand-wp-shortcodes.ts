/**
 * Expand WP body shortcodes that the original importer dropped.
 *
 * Targets 77 published WP posts whose source `post_content` includes one of:
 *   - [gallery ids="N1,N2,..."]    (56 posts, 1012 attachment refs)
 *   - [gview file="URL"]            (19 PDF "Full Issue" embeds)
 *   - <iframe src="https://www.youtube.com/embed/VIDEO">  (3 YouTube)
 *
 * For each, we pre-expand the shortcode/iframe into plain HTML
 *   - `[gallery ids="..."]`  → one `<img>` per attachment, sourced from the
 *                              archive proxy (`/archive/wordpress-media/uploads/...`)
 *   - `[gview file="URL"]`   → `<p><a href="...">Download PDF</a></p>`
 *   - YouTube `<iframe>`     → `<p><a href="...">Watch on YouTube</a></p>`
 *   - other `<iframe>`s      → `<p><a href="...">View embedded source</a></p>`
 * then re-run the standard WP→Lexical conversion + media-resolver pipeline.
 *
 * Run with `pnpm tsx scripts/legacy-import/expand-wp-shortcodes.ts [--write]`.
 */

import { Pool } from 'pg'
import { execFileSync } from 'child_process'
import { convertHtmlToLexical, lexicalToPlainText } from './wordpress/html-to-lexical'
import { LegacyMediaResolver, resolveImagesInLexicalTree } from './media-resolver'

const WP_SQLITE = '/tmp/audit/wp.db'

function parseArgs() {
  return { write: process.argv.slice(2).includes('--write') }
}

// ── attachment lookup ──────────────────────────────────────────────────────
//
// Builds id → archive-URL map. WP attachment guids look like
// `https://poly.rpi.edu/wp-content/uploads/YYYY-MM-DD/foo.jpg`; the archive
// proxy serves them from `/archive/wordpress-media/uploads/YYYY-MM-DD/foo.jpg`.

type AttachmentMap = Map<number, { url: string; alt: string }>

function loadAttachmentMap(): AttachmentMap {
  const json = execFileSync(
    'sqlite3',
    [
      '-json',
      WP_SQLITE,
      `SELECT p.ID AS id, p.guid, p.post_title, p.post_excerpt
       FROM posts p
       WHERE p.post_type = 'attachment'`,
    ],
    { maxBuffer: 64 * 1024 * 1024 },
  ).toString()
  type Row = { id: number; guid: string | null; post_title: string | null; post_excerpt: string | null }
  const rows = JSON.parse(json) as Row[]

  const out: AttachmentMap = new Map()
  for (const r of rows) {
    if (!r.id || !r.guid) continue
    const m = r.guid.match(/^https?:\/\/[^/]+\/wp-content\/uploads\/(.+)$/i)
    if (!m) continue
    out.set(r.id, {
      url: `/archive/wordpress-media/uploads/${m[1]}`,
      alt: (r.post_title || r.post_excerpt || '').trim(),
    })
  }
  return out
}

// ── shortcode expansion ───────────────────────────────────────────────────

function expandGalleryShortcodes(html: string, attachments: AttachmentMap): { html: string; expanded: number } {
  let expanded = 0
  const out = html.replace(/\[gallery([^\]]*)\]/gi, (_full, attrsRaw: string) => {
    // [gallery ids="N1,N2,..."] is the only shape we expand; standalone
    // [gallery] (no ids) draws on the post's media library and is not
    // recoverable from the dump alone.
    const idsMatch = attrsRaw.match(/ids\s*=\s*["']?([0-9,\s]+)["']?/i)
    if (!idsMatch) return _full
    const ids = idsMatch[1]
      .split(/[,\s]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0)
    const imgTags: string[] = []
    for (const id of ids) {
      const att = attachments.get(id)
      if (!att) continue
      const altEsc = att.alt.replace(/"/g, '&quot;')
      imgTags.push(`<p><img src="${att.url}" alt="${altEsc}" /></p>`)
    }
    if (imgTags.length === 0) return _full
    expanded++
    return imgTags.join('\n')
  })
  return { html: out, expanded }
}

function expandGviewShortcodes(html: string): { html: string; expanded: number } {
  let expanded = 0
  const out = html.replace(/\[gview([^\]]*)\]/gi, (_full, attrsRaw: string) => {
    const fileMatch = attrsRaw.match(/file\s*=\s*["']([^"']+)["']/i)
    if (!fileMatch) return _full
    const fileUrl = fileMatch[1].trim()
    if (!fileUrl) return _full
    // Rewrite poly.rpi.edu paths to the archive proxy.
    const m = fileUrl.match(/^https?:\/\/[^/]+\/wp-content\/uploads\/(.+)$/i)
    const archiveUrl = m ? `/archive/wordpress-media/uploads/${m[1]}` : fileUrl
    const filename = fileUrl.split('/').pop() || 'PDF'
    expanded++
    return `<p><a href="${archiveUrl}">Download PDF (${filename})</a></p>`
  })
  return { html: out, expanded }
}

function expandIframes(html: string): { html: string; expanded: number; youtube: number } {
  let expanded = 0
  let youtube = 0
  const out = html.replace(/<iframe\b[^>]*src=["']([^"']+)["'][^>]*>(?:[\s\S]*?<\/iframe>)?/gi, (_full, src: string) => {
    if (!src) return ''
    const yt = src.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]+)/)
    if (yt) {
      youtube++
      expanded++
      return `<p><a href="https://www.youtube.com/watch?v=${yt[1]}">Watch on YouTube</a></p>`
    }
    expanded++
    return `<p><a href="${src}">View embedded source</a></p>`
  })
  return { html: out, expanded, youtube }
}

// ── main ──────────────────────────────────────────────────────────────────

async function main() {
  const { write } = parseArgs()
  console.log(`Mode: write=${write}`)

  const attachments = loadAttachmentMap()
  console.log(`Attachment map: ${attachments.size} entries`)

  // Pull all shortcode-bearing posts.
  const json = execFileSync(
    'sqlite3',
    [
      '-json',
      WP_SQLITE,
      `SELECT ID AS id, post_content
       FROM posts
       WHERE post_status='publish' AND post_type='post'
         AND (post_content LIKE '%[gallery%' OR post_content LIKE '%[gview%' OR post_content LIKE '%<iframe%')`,
    ],
    { maxBuffer: 128 * 1024 * 1024 },
  ).toString()
  const wpRows = JSON.parse(json) as { id: number; post_content: string }[]
  console.log(`Source rows with shortcodes/iframes: ${wpRows.length}`)

  const pool = new Pool({
    host: '127.0.0.1',
    port: 5433,
    user: 'poly',
    password: 'poly',
    database: 'polymer2',
  })
  const resolver = new LegacyMediaResolver(pool)

  let updated = 0
  let totalGalleries = 0
  let totalGviews = 0
  let totalIframes = 0
  let totalYoutube = 0
  let totalImagesResolved = 0
  let articleNotFound = 0

  for (const w of wpRows) {
    const expandedGallery = expandGalleryShortcodes(w.post_content, attachments)
    const expandedGview = expandGviewShortcodes(expandedGallery.html)
    const expandedIframe = expandIframes(expandedGview.html)
    totalGalleries += expandedGallery.expanded
    totalGviews += expandedGview.expanded
    totalIframes += expandedIframe.expanded
    totalYoutube += expandedIframe.youtube

    // Skip if nothing changed (defensive).
    if (
      expandedGallery.expanded === 0 &&
      expandedGview.expanded === 0 &&
      expandedIframe.expanded === 0
    ) {
      continue
    }

    // Find the polymer row.
    const article = await pool.query<{ id: number; slug: string }>(
      `SELECT id, slug FROM articles WHERE legacy_source='wordpress' AND legacy_article_id=$1`,
      [String(w.id)],
    )
    if (article.rowCount === 0) {
      articleNotFound++
      continue
    }
    const row = article.rows[0]

    const html = expandedIframe.html
    const lexical = convertHtmlToLexical(html, {
      rewriteImageSrc: (src) => {
        if (!src) return null
        const m = src.match(/^https?:\/\/[^/]+\/wp-content\/uploads\/(.+)$/i)
        if (m) return `/archive/wordpress-media/uploads/${m[1]}`
        if (src.startsWith('/wp-content/uploads/')) {
          return '/archive/wordpress-media/uploads/' + src.slice('/wp-content/uploads/'.length)
        }
        return src
      },
    })
    const imgRes = await resolveImagesInLexicalTree(lexical, resolver)
    totalImagesResolved += imgRes.resolved

    const plainContent = lexicalToPlainText(lexical)

    if (write) {
      await pool.query(
        `UPDATE articles SET content=$1::jsonb, plain_content=$2, updated_at=NOW() WHERE id=$3`,
        [JSON.stringify(lexical), plainContent, row.id],
      )
    }
    updated++
  }

  console.log(`\nResults:`)
  console.log(`  rows updated         : ${updated}`)
  console.log(`  galleries expanded   : ${totalGalleries}`)
  console.log(`  gviews expanded      : ${totalGviews}`)
  console.log(`  iframes expanded     : ${totalIframes} (youtube: ${totalYoutube})`)
  console.log(`  images resolved      : ${totalImagesResolved}`)
  console.log(`  article not found    : ${articleNotFound}`)
  console.log(`  Mode: ${write ? 'WRITTEN' : 'DRY RUN'}`)

  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
