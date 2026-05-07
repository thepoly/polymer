/**
 * Import the polytechnic-online (2001-2009) legacy archive into polymer as
 * native article rows.
 *
 *   pnpm tsx scripts/import-polytechnic-online.ts [flags]
 *
 * Flags:
 *   --dry-run               Walk every row through transformation + logging
 *                           but skip the actual `payload.create()` call.
 *   --limit N               Process only the first N canonical articles.
 *   --start-from N          Skip the first N canonical articles (for resume).
 *   --source-only=ID        Process only the article whose articleID == ID.
 *   --verbose               Log per-article (instead of every-100 progress).
 *
 * Source data (read-only):
 *   Manifest:  /home/red/poly/recon/archives/polytechnic-online/manifest.json
 *   DB index:  /home/red/poly/recon/archives/polytechnic-online/.db_index.json
 *   HTML:      /home/red/poly/recon/archives/polytechnic-online/article_view.php3?view={view}&part={part}.html
 *
 * Required env (read from polymer's standard env loading):
 *   DATABASE_URL    Postgres connection string for the polymer DB.
 *   PAYLOAD_SECRET  Required by Payload bootstrap.
 *
 * Recommended env (defensive — the Articles afterChange hook gates on
 * `req.context.legacyImport=true` already, but unsetting these eliminates any
 * residual chance of fan-out):
 *   INTERNAL_PUSH_SECRET=
 *   NEXT_PUBLIC_POSTHOG_KEY=
 *
 * Idempotency:
 *   Each row is keyed by (legacySource='polytechnic-online', legacyArticleId).
 *   Re-running this script never produces duplicate rows.
 *
 * Rollback:
 *   DELETE FROM articles WHERE legacy_source = 'polytechnic-online';
 *   DELETE FROM _articles_v WHERE version_legacy_source = 'polytechnic-online';
 *
 *   (Payload's drafts mode mirrors every row into _articles_v; when you delete
 *   an article the parent row is removed but the version shadow is left behind.
 *   Both deletes are needed for a clean wipe.)
 */

import fs from 'node:fs'
import path from 'node:path'
import { getPayload } from 'payload'
import { Pool } from 'pg'
import config from '../payload.config'

import type { LegacyArticleEntry, LegacyManifest } from './legacy-import/poly-online/types'
import { mapSection } from './legacy-import/poly-online/section-map'
import { buildLegacySlug } from './legacy-import/poly-online/slug'
import { extractBodyHtml, stripSkipToNav } from './legacy-import/poly-online/extract-body'
import {
  buildContentEditorState,
  buildTitleEditorState,
  plainTitleFrom,
} from './legacy-import/poly-online/html-to-lexical'
import { LegacyMediaResolver, resolveImagesInLexicalTree } from './legacy-import/media-resolver'

// ===== CLI parsing =====

type Flags = {
  dryRun: boolean
  limit: number | null
  startFrom: number
  sourceOnly: number | null
  verbose: boolean
  update: boolean
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = {
    dryRun: false,
    limit: null,
    startFrom: 0,
    sourceOnly: null,
    verbose: false,
    update: false,
  }
  for (const arg of argv) {
    if (arg === '--dry-run') flags.dryRun = true
    else if (arg === '--verbose') flags.verbose = true
    else if (arg === '--update') flags.update = true
    else if (arg.startsWith('--limit=')) flags.limit = Number(arg.slice('--limit='.length))
    else if (arg === '--limit') {
      // Two-arg form. Handled below.
    } else if (arg.startsWith('--start-from=')) flags.startFrom = Number(arg.slice('--start-from='.length))
    else if (arg.startsWith('--source-only=')) flags.sourceOnly = Number(arg.slice('--source-only='.length))
    else if (arg.startsWith('--')) {
      // unknown — ignore
    }
  }
  // Allow two-arg form: --limit 25
  for (let i = 0; i < argv.length - 1; i++) {
    if (argv[i] === '--limit') flags.limit = Number(argv[i + 1])
    if (argv[i] === '--start-from') flags.startFrom = Number(argv[i + 1])
    if (argv[i] === '--source-only') flags.sourceOnly = Number(argv[i + 1])
  }
  return flags
}

// ===== Paths =====

const ARCHIVE_ROOT = '/home/red/poly/recon/archives/polytechnic-online'
const MANIFEST_PATH = path.join(ARCHIVE_ROOT, 'manifest.json')

// ===== Manifest grouping =====

type CanonicalArticle = {
  articleID: number
  view: number
  parts: LegacyArticleEntry[] // sorted by part number ascending
}

function groupByView(entries: LegacyArticleEntry[]): CanonicalArticle[] {
  const byView = new Map<number, LegacyArticleEntry[]>()
  for (const e of entries) {
    if (!byView.has(e.view)) byView.set(e.view, [])
    byView.get(e.view)!.push(e)
  }
  const result: CanonicalArticle[] = []
  for (const [view, parts] of byView) {
    parts.sort((a, b) => a.part - b.part)
    result.push({ articleID: parts[0].articleID, view, parts })
  }
  // Stable order: sort by canonical_date ascending so progress is intuitive.
  result.sort((a, b) => {
    const da = a.parts[0].canonical_date
    const db = b.parts[0].canonical_date
    if (da !== db) return da < db ? -1 : 1
    return a.view - b.view
  })
  return result
}

// ===== Body assembly =====

// CP1252 → unicode for the 0x80-0x9F range that differs from ISO-8859-1.
// All other bytes (0xA0-0xFF) map directly to U+00A0-U+00FF (Latin-1).
const CP1252_HIGH: Record<number, string> = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡',
  0x88: 'ˆ', 0x89: '‰', 0x8A: 'Š', 0x8B: '‹', 0x8C: 'Œ', 0x8E: 'Ž',
  0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”',
  0x95: '•', 0x96: '–', 0x97: '—', 0x98: '˜', 0x99: '™',
  0x9A: 'š', 0x9B: '›', 0x9C: 'œ', 0x9E: 'ž', 0x9F: 'Ÿ',
}

function decodeCp1252(buf: Buffer): string {
  let out = ''
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i]
    if (b < 0x80 || b >= 0xA0) {
      out += String.fromCharCode(b)
    } else if (CP1252_HIGH[b] !== undefined) {
      out += CP1252_HIGH[b]
    }
    // 0x81, 0x8D, 0x8F, 0x90, 0x9D are undefined in CP1252 — skip silently.
  }
  return out
}

function readBodyForPart(entry: LegacyArticleEntry): string | null {
  const filePath = path.join(ARCHIVE_ROOT, entry.local_path)
  let raw: string
  try {
    // Source HTML is CP1252 (Windows-1252) — used by classic Polytechnic
    // CMS for typographic glyphs (curly quotes, en/em dashes). Reading as
    // UTF-8 turns 0x91-0x97 into U+FFFD replacement chars. Decode explicitly.
    const buf = fs.readFileSync(filePath)
    raw = decodeCp1252(buf)
  } catch {
    return null
  }
  const body = extractBodyHtml(raw)
  if (!body) return null
  // Article images sometimes sit between the byline-hr and the body's <font
  // size='-1'> block, so they aren't inside the body slice. Pull those out
  // and prepend them so the html-to-lexical converter sees them.
  const leading = extractLeadingImages(raw)
  const combined = leading ? `${leading}${body}` : body
  return stripSkipToNav(combined)
}

/**
 * Find <img> tags that appear between the byline `<hr>` (the second
 * `hr_black.gif width='504'` marker) and the article body's `<font size='-1'>`
 * opening. Returns a string of one or more `<img>` HTML tags, or empty.
 */
function extractLeadingImages(raw: string): string {
  const bodyOpenRe = /<font\s+size=['"]-1['"]\s+face=['"]Verdana,\s*Arial,\s*Helvetica,\s*sans-serif['"]\s*>|<font\s+face=['"]Verdana,\s*Arial,\s*Helvetica,\s*sans-serif['"]\s+size=['"]-1['"]\s*>/gi
  bodyOpenRe.lastIndex = 0
  let bodyOpenMatch: RegExpExecArray | null
  let lastBodyOpen = -1
  while ((bodyOpenMatch = bodyOpenRe.exec(raw)) !== null) {
    lastBodyOpen = bodyOpenMatch.index
  }
  if (lastBodyOpen < 0) return ''

  const hrRe = /<img\s+[^>]*src=['"]hr_black\.gif['"][^>]*width=['"]504['"][^>]*>/gi
  let lastHr = -1
  let hrMatch: RegExpExecArray | null
  hrRe.lastIndex = 0
  while ((hrMatch = hrRe.exec(raw)) !== null) {
    if (hrMatch.index >= lastBodyOpen) break
    lastHr = hrMatch.index + hrMatch[0].length
  }
  if (lastHr < 0) return ''

  const gap = raw.slice(lastHr, lastBodyOpen)
  const imgRe = /<img\s+[^>]*src=['"]([^'"]+)['"][^>]*>/gi
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = imgRe.exec(gap)) !== null) {
    const src = m[1]
    if (!src.includes('/') && /\.gif$/i.test(src)) continue
    out.push(m[0])
  }
  return out.join('')
}

// ===== Row build =====

type BuiltRow = {
  articleID: number
  view: number
  slug: string
  plainTitle: string
  data: Record<string, unknown>
}

function buildRow(article: CanonicalArticle): BuiltRow {
  const head = article.parts[0]
  const sectionMapping = mapSection(head.section_db)
  const headline = head.headline_db || head.headline || `Article ${article.articleID}`
  const slug = buildLegacySlug(head.canonical_date, headline)
  const plain = plainTitleFrom(headline)

  const partBodies: string[] = []
  const partTitles: string[] = []
  for (const part of article.parts) {
    const body = readBodyForPart(part)
    partBodies.push(body || '')
    // For multi-part articles, surface part_title_1 (the per-part heading) as
    // a bold leading paragraph. Skip for single-part articles.
    partTitles.push(article.parts.length > 1 ? (part.part_title_1 || '') : '')
  }

  const fallback = head.blurb_db || ''
  const content = buildContentEditorState(partBodies, partTitles, fallback)
  const title = buildTitleEditorState(headline)

  const writeInAuthors = (head.authors || [])
    .filter((a) => a && a.name && a.name.trim())
    .map((a) => ({ name: a.name.trim() }))

  // Static archive serves files whose names literally contain '?' and '&';
  // they must be percent-encoded so nginx doesn't strip them as query string.
  const legacyHtmlUrl = `/archive/polytechnic-online/article_view.php3%3Fview=${article.view}%26part=1.html`

  // canonical_date is a YYYY-MM-DD string. Convert to ISO at noon UTC so
  // timezone math doesn't bump it into the previous day in the admin UI.
  const publishedDate = `${head.canonical_date}T12:00:00.000Z`

  const data: Record<string, unknown> = {
    section: sectionMapping.section,
    title,
    plainTitle: plain,
    content,
    writeInAuthors,
    publishedDate,
    _status: 'published',
    slug,
    legacySource: 'polytechnic-online',
    legacyArticleId: String(article.articleID),
    legacyHtmlUrl,
    legacyCategory: head.section_db,
  }
  if (sectionMapping.kicker) {
    data.kicker = sectionMapping.kicker
  }

  return { articleID: article.articleID, view: article.view, slug, plainTitle: plain, data }
}

// ===== Main =====

async function main() {
  const flags = parseFlags(process.argv.slice(2))
  const startedAt = Date.now()

  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`[poly-online] manifest not found: ${MANIFEST_PATH}`)
    process.exit(1)
  }

  console.log(`[poly-online] loading manifest from ${MANIFEST_PATH}`)
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as LegacyManifest
  if (!Array.isArray(manifest.articles)) {
    console.error('[poly-online] manifest.articles is not an array')
    process.exit(1)
  }
  console.log(`[poly-online] loaded ${manifest.articles.length} part-entries`)

  let canonical = groupByView(manifest.articles)
  console.log(`[poly-online] grouped into ${canonical.length} canonical articles`)

  if (flags.sourceOnly !== null) {
    canonical = canonical.filter((a) => a.articleID === flags.sourceOnly)
    if (canonical.length === 0) {
      console.error(`[poly-online] --source-only=${flags.sourceOnly}: no match`)
      process.exit(1)
    }
  } else {
    if (flags.startFrom > 0) canonical = canonical.slice(flags.startFrom)
    if (flags.limit !== null) canonical = canonical.slice(0, flags.limit)
  }

  const total = canonical.length
  console.log(
    `[poly-online] processing ${total} articles (dry-run=${flags.dryRun}, start-from=${flags.startFrom}, limit=${flags.limit ?? 'all'})`,
  )

  // ===== Boot Payload =====
  const payload = await getPayload({ config })

  // Raw pg pool used by the media resolver to look up / insert media rows
  // referenced by inline body images. Skipped on dry-run.
  let pgPool: Pool | null = null
  let mediaResolver: LegacyMediaResolver | null = null
  if (!flags.dryRun) {
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
      console.error('[poly-online] DATABASE_URL not set; required for non-dry-run mode')
      process.exit(1)
    }
    pgPool = new Pool({ connectionString: dbUrl })
    mediaResolver = new LegacyMediaResolver(pgPool)
  }

  let imported = 0
  let skipped = 0
  let failed = 0
  const sampleSlugs: string[] = []
  const dryRunSamples: BuiltRow[] = []

  for (let i = 0; i < canonical.length; i++) {
    const article = canonical[i]
    let row: BuiltRow
    try {
      row = buildRow(article)
      if (mediaResolver) {
        await resolveImagesInLexicalTree(row.data.content, mediaResolver)
      }
    } catch (err) {
      failed++
      console.error(
        `[poly-online] build failed for articleID=${article.articleID} view=${article.view}:`,
        (err as Error).message,
      )
      continue
    }

    if (flags.verbose || (flags.dryRun && dryRunSamples.length < 5)) {
      console.log(
        `[poly-online] #${i + 1} articleID=${row.articleID} view=${row.view} slug=${row.slug} section=${(row.data.section as string)} kicker=${(row.data.kicker as string) || '-'}`,
      )
      if (flags.dryRun && dryRunSamples.length < 5) dryRunSamples.push(row)
    }

    if (flags.dryRun) {
      // No insert, count it as if-imported for stats clarity.
      imported++
      if (sampleSlugs.length < 10) sampleSlugs.push(row.slug)
      continue
    }

    try {
      const existing = await payload.find({
        collection: 'articles',
        where: {
          and: [
            { legacySource: { equals: 'polytechnic-online' } },
            { legacyArticleId: { equals: String(row.articleID) } },
          ],
        },
        limit: 1,
        depth: 0,
        // We need to see drafts too to be fully idempotent, but published=true
        // is also fine — the legacy importer always writes _status='published'.
        pagination: false,
      })
      if (existing.docs.length > 0 && !flags.update) {
        skipped++
      } else if (existing.docs.length > 0 && flags.update) {
        // --update mode: rewrite content/plainTitle/legacyHtmlUrl/legacyCategory
        // on the existing row. Preserves the existing slug (which may have
        // been disambiguated with a -<articleID> suffix during the original
        // import) and any user-authored fields not in row.data.
        const existingDoc = existing.docs[0]
        const existingId = existingDoc.id
        const updateData: Record<string, unknown> = {
          content: row.data.content,
          plainTitle: row.data.plainTitle,
          legacyHtmlUrl: row.data.legacyHtmlUrl,
          legacyCategory: row.data.legacyCategory,
          legacySource: row.data.legacySource,
          legacyArticleId: row.data.legacyArticleId,
        }
        if (row.data.kicker !== undefined) updateData.kicker = row.data.kicker
        try {
          await payload.update({
            collection: 'articles',
            id: existingId,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: updateData as any,
            req: { context: { legacyImport: true } } as Parameters<typeof payload.update>[0]['req'],
            depth: 0,
          })
          imported++
          if (sampleSlugs.length < 10) sampleSlugs.push(String(existingDoc.slug || row.slug))
        } catch (updateErr) {
          const msg = (updateErr as Error).message || ''
          if (/Content/i.test(msg)) {
            // Same Content fallback as create path: minimal-body Lexical doc.
            const blurb = (article.parts[0]?.blurb_db || row.plainTitle || '').trim()
            updateData.content = {
              root: {
                type: 'root', format: '', indent: 0, version: 1, direction: 'ltr',
                children: [{
                  type: 'paragraph', format: '', indent: 0, version: 1, direction: 'ltr',
                  textFormat: 0, textStyle: '',
                  children: blurb
                    ? [{ type: 'text', format: 0, mode: 'normal', style: '', text: blurb, detail: 0, version: 1 }]
                    : [],
                }],
              },
            }
            await payload.update({
              collection: 'articles',
              id: existingId,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data: updateData as any,
              req: { context: { legacyImport: true } } as Parameters<typeof payload.update>[0]['req'],
              depth: 0,
            })
            imported++
          } else {
            throw updateErr
          }
        }
      } else {
        // Retry on slug collision by appending the legacy article ID. Date-prefixed
        // slugs already prevent cross-decade collisions; only same-day same-headline
        // articles need this fallback (rare but real, e.g. articleID 1108/1109).
        // Also retry on Content validation error with a minimal-body fallback so
        // articles with broken HTML (e.g. nested anchors) still publish — losing
        // nothing important, since legacyHtmlUrl preserves the original.
        let attempt = 0
        let createdId: string | number | null = null
        while (attempt < 3 && createdId === null) {
          try {
            const created = await payload.create({
              collection: 'articles',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data: row.data as any,
              req: { context: { legacyImport: true } } as Parameters<typeof payload.create>[0]['req'],
              depth: 0,
            })
            createdId = created.id
          } catch (createErr) {
            const msg = (createErr as Error).message || ''
            if (attempt < 2 && /slug/i.test(msg)) {
              const disambiguated = `${row.slug}-${row.articleID}`
              ;(row.data as { slug: string }).slug = disambiguated
              row.slug = disambiguated
              attempt++
              continue
            }
            if (attempt < 2 && /Content/i.test(msg)) {
              // Replace content with a single paragraph from the article blurb
              // (or the headline if no blurb). The original HTML stays viewable
              // via the legacyHtmlUrl chip on the article page.
              const blurb = (article.parts[0]?.blurb_db || row.plainTitle || '').trim()
              ;(row.data as { content: unknown }).content = {
                root: {
                  type: 'root',
                  format: '',
                  indent: 0,
                  version: 1,
                  direction: 'ltr',
                  children: [{
                    type: 'paragraph',
                    format: '',
                    indent: 0,
                    version: 1,
                    direction: 'ltr',
                    textFormat: 0,
                    textStyle: '',
                    children: blurb
                      ? [{ type: 'text', format: 0, mode: 'normal', style: '', text: blurb, detail: 0, version: 1 }]
                      : [],
                  }],
                },
              }
              attempt++
              continue
            }
            throw createErr
          }
        }
        const created = { id: createdId as string | number }
        // The Articles `beforeChange` hook overrides publishedDate to "now" on
        // the first transition to _status='published'. We don't own that hook
        // so we follow up with an update to write the legacy date back. On
        // this second call the row is already published, so the override
        // branch (`isNowPublished && !wasPublished`) is skipped.
        const legacyPublishedDate = row.data.publishedDate as string
        if (legacyPublishedDate) {
          await payload.update({
            collection: 'articles',
            id: created.id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: { publishedDate: legacyPublishedDate } as any,
            req: { context: { legacyImport: true } } as Parameters<typeof payload.update>[0]['req'],
            depth: 0,
          })
        }
        imported++
        if (sampleSlugs.length < 10) sampleSlugs.push(row.slug)
      }
    } catch (err) {
      failed++
      console.error(
        `[poly-online] insert failed for articleID=${row.articleID} slug=${row.slug}:`,
        (err as Error).message,
      )
    }

    if ((i + 1) % 100 === 0) {
      console.log(
        `[poly-online] ${i + 1}/${total} processed, ${imported} imported, ${skipped} skipped, ${failed} failed`,
      )
    }
  }

  if (flags.dryRun && dryRunSamples.length > 0) {
    console.log('\n[poly-online] dry-run sample rows (first 5):')
    for (const r of dryRunSamples) {
      const data = r.data
      const writeIn = (data.writeInAuthors as Array<{ name: string }>).map((a) => a.name).join(', ') || '(none)'
      console.log(`  - articleID=${r.articleID} view=${r.view}`)
      console.log(`    slug:           ${r.slug}`)
      console.log(`    plainTitle:     ${r.plainTitle}`)
      console.log(`    section:        ${data.section}`)
      console.log(`    kicker:         ${data.kicker || '-'}`)
      console.log(`    publishedDate:  ${data.publishedDate}`)
      console.log(`    legacyCategory: ${data.legacyCategory}`)
      console.log(`    legacyHtmlUrl:  ${data.legacyHtmlUrl}`)
      console.log(`    writeInAuthors: ${writeIn}`)
      const root = (data.content as { root: { children: unknown[] } }).root
      console.log(`    content blocks: ${root.children.length}`)
    }
  }

  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log('')
  console.log(`[poly-online] done in ${elapsedSec}s — ${imported} imported, ${skipped} skipped, ${failed} failed (of ${total})`)
  if (mediaResolver) {
    console.log(`[poly-online] media rows touched: ${mediaResolver.size()}`)
  }
  if (sampleSlugs.length > 0) {
    console.log('[poly-online] sample slugs:')
    for (const s of sampleSlugs) console.log(`  - ${s}`)
  }

  if (pgPool) await pgPool.end().catch(() => {})
  process.exit(0)
}

main().catch((err) => {
  console.error('[poly-online] fatal:', err)
  process.exit(1)
})
