/**
 * Backfill featured images on wordpress-era articles.
 *
 * Reads source postmeta from /tmp/audit/wp.db (Kicker/Photo/PhotoCaption/
 * PhotoByline/Photographer) and:
 *   1. converts the Photo path to its archived URL
 *      `/wp-content/uploads/...` → `/archive/wordpress-media/uploads/...`
 *   2. resolves it via LegacyMediaResolver (gets-or-creates a media row)
 *   3. populates `articles.featured_image_id`
 *   4. populates `articles.image_caption` from PhotoCaption (entity-decoded)
 *   5. populates `media.write_in_photographer` from PhotoByline / Photographer
 *
 * The audit confirmed 1473 distinct Photo paths exist; 1470 of those map to
 * actual files on disk in `recon/archives/wordpress/uploads-extracted/`.
 *
 * Run with `pnpm tsx scripts/legacy-import/backfill-wp-featured-images.ts`.
 * Defaults to a dry run; pass `--write` to actually update rows.
 */

import { Pool } from 'pg'
import { execFileSync } from 'child_process'
import { LegacyMediaResolver } from './media-resolver'
import { decodeEntities } from './wordpress/html-tokenizer'

const WP_SQLITE = '/tmp/audit/wp.db'

type Postmeta = {
  photo?: string
  photoCaption?: string
  photoByline?: string
  photographer?: string
  origPhoto?: string
}

function parseArgs() {
  const args = process.argv.slice(2)
  return { write: args.includes('--write') }
}

// Convert source Photo path to the polymer archive URL.
//   /wp-content/uploads/X → /archive/wordpress-media/uploads/X
// Returns null for values that don't look like a real path (e.g. "0", URLs to
// poly.rpi.edu, absolute http:// links, etc).
function toArchiveUrl(rawPath: string | undefined): string | null {
  if (!rawPath) return null
  const v = rawPath.trim()
  if (!v || v === '0') return null
  if (v.startsWith('/wp-content/uploads/')) {
    return '/archive/wordpress-media/uploads/' + v.slice('/wp-content/uploads/'.length)
  }
  // 32 rows are full URLs. Convert if they're pointing at poly.rpi.edu uploads.
  const m = v.match(/^https?:\/\/[^/]+\/wp-content\/uploads\/(.+)$/i)
  if (m) {
    return '/archive/wordpress-media/uploads/' + m[1]
  }
  // 1 row references /wp-includes/, ignore.
  return null
}

// Strip "<i>The Polytechnic</i>"-style trailing publication credit from a
// byline. WP postmeta consistently formats as "Name/<i>The Polytechnic</i>"
// or "Name/The Polytechnic"; we want just "Name".
//
// Uses indexOf scanning + a fixpoint loop instead of a single regex so the
// CodeQL `incomplete-multi-character-sanitization` rule is satisfied — a
// single `replace(/<[^>]+>/g, '')` pass can leave a leading `<` if the input
// has unbalanced angle brackets.
function stripTags(input: string): string {
  let s = input
  for (;;) {
    const open = s.indexOf('<')
    if (open === -1) break
    const close = s.indexOf('>', open + 1)
    if (close === -1) {
      // Unterminated tag — drop everything from `<` onward.
      s = s.slice(0, open)
      break
    }
    s = s.slice(0, open) + s.slice(close + 1)
  }
  return s
}

function cleanByline(raw: string | undefined): string | null {
  if (!raw) return null
  let v = decodeEntities(raw).trim()
  v = stripTags(v).trim()
  v = v.replace(/\s*\/\s*The Polytechnic\s*$/i, '').trim()
  v = v.replace(/\s*-\s*The Polytechnic\s*$/i, '').trim()
  return v || null
}

function cleanCaption(raw: string | undefined): string | null {
  if (!raw) return null
  const v = decodeEntities(raw).trim().replace(/\s+/g, ' ')
  return v || null
}

async function main() {
  const { write } = parseArgs()
  console.log(`Mode: write=${write}`)

  // Pull all relevant postmeta in one shot.
  const tsv = execFileSync(
    'sqlite3',
    [
      '-separator',
      '\t',
      WP_SQLITE,
      "SELECT post_id, meta_key, meta_value FROM postmeta WHERE meta_key IN ('Photo','PhotoCaption','PhotoByline','Photographer','OrigPhoto') AND meta_value IS NOT NULL AND meta_value != ''",
    ],
    { maxBuffer: 64 * 1024 * 1024 },
  ).toString()

  const byWpId = new Map<number, Postmeta>()
  for (const line of tsv.split('\n')) {
    if (!line) continue
    const tab1 = line.indexOf('\t')
    const tab2 = line.indexOf('\t', tab1 + 1)
    if (tab1 < 0 || tab2 < 0) continue
    const pid = Number(line.slice(0, tab1))
    const key = line.slice(tab1 + 1, tab2)
    const value = line.slice(tab2 + 1)
    if (!pid || !value) continue
    const cur = byWpId.get(pid) ?? {}
    if (key === 'Photo') cur.photo = value
    else if (key === 'PhotoCaption') cur.photoCaption = value
    else if (key === 'PhotoByline') cur.photoByline = value
    else if (key === 'Photographer') cur.photographer = value
    else if (key === 'OrigPhoto') cur.origPhoto = value
    byWpId.set(pid, cur)
  }

  console.log(`WP postmeta: ${byWpId.size} wp_ids with photo-related meta`)

  const pool = new Pool({
    host: '127.0.0.1',
    port: 5433,
    user: 'poly',
    password: 'poly',
    database: 'polymer2',
  })
  const resolver = new LegacyMediaResolver(pool)

  let imageFills = 0
  let captionFills = 0
  let mediaCreated = 0
  let mediaReused = 0
  let bylineFills = 0
  let pathSkipped = 0
  let articleNotFound = 0

  for (const [wpId, meta] of byWpId) {
    const archiveUrl = toArchiveUrl(meta.photo)
    if (!archiveUrl) {
      // Even without a Photo path we may still want to set the caption alone,
      // but image_caption belongs to the article's hero image; if there's no
      // image, skip. Caption-only would render as orphaned text.
      pathSkipped++
      continue
    }

    const article = await pool.query<{ id: number; featured_image_id: number | null; image_caption: string | null }>(
      `SELECT id, featured_image_id, image_caption FROM articles WHERE legacy_source='wordpress' AND legacy_article_id=$1`,
      [String(wpId)],
    )
    if (article.rowCount === 0) {
      articleNotFound++
      continue
    }
    const row = article.rows[0]

    // Skip articles that already have a featured image — be conservative.
    if (row.featured_image_id) continue

    // Resolve (or create) the media row.
    const beforeSize = resolver.size()
    const mediaId = await resolver.resolve(archiveUrl, null)
    if (!mediaId) continue
    if (resolver.size() > beforeSize) mediaCreated++
    else mediaReused++

    // Update photographer attribution on the media row if absent.
    // Prefer Photographer (clean name) over PhotoByline (markup-laden).
    const byline = cleanByline(meta.photographer) || cleanByline(meta.photoByline)
    if (byline && write) {
      const r = await pool.query(
        `UPDATE media
         SET write_in_photographer = COALESCE(write_in_photographer, $1),
             updated_at = NOW()
         WHERE id = $2 AND (write_in_photographer IS NULL OR write_in_photographer = '')`,
        [byline, mediaId],
      )
      if ((r.rowCount ?? 0) > 0) bylineFills++
    } else if (byline) {
      bylineFills++
    }

    const caption = cleanCaption(meta.photoCaption)

    if (write) {
      await pool.query(
        `UPDATE articles
         SET featured_image_id = $1,
             image_caption = COALESCE(image_caption, $2),
             updated_at = NOW()
         WHERE id = $3`,
        [mediaId, caption, row.id],
      )
    }
    imageFills++
    if (caption && !row.image_caption) captionFills++

    if (imageFills % 200 === 0) {
      console.log(`  …${imageFills} images filled`)
    }
  }

  console.log(`\nResults:`)
  console.log(`  featured_image_id filled : ${imageFills}`)
  console.log(`  image_caption filled     : ${captionFills}`)
  console.log(`  media rows created       : ${mediaCreated}`)
  console.log(`  media rows reused        : ${mediaReused}`)
  console.log(`  byline backfills on media: ${bylineFills}`)
  console.log(`  Photo path skipped       : ${pathSkipped}`)
  console.log(`  article not found        : ${articleNotFound}`)
  console.log(`  Mode: ${write ? 'WRITTEN' : 'DRY RUN'}`)

  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
