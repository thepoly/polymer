/**
 * Import the legacy WordPress (2009-2019) Polytechnic archive into the
 * polymer2 articles collection.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SOURCES
 * ─────────────────────────────────────────────────────────────────────────────
 *   /home/red/poly/recon/archives/wordpress/manifest.json
 *     The driver list. 4,122 entries: posts (4,108), pages (14), other (29).
 *     Each entry has wp_id, post_type, post_status, post_date_gmt, slug,
 *     title, year/month/day, html_path.
 *
 *   /home/red/poly/recon/archives/wordpress/db/wordpress-archive-2026-05-06.sql.gz
 *     The full MariaDB dump. We parse it streaming (see ./legacy-import/
 *     wordpress/sql-parser.ts) — no separate DB process required. The
 *     parser supports the subset of `mysqldump` syntax actually present in
 *     the dump (extended INSERTs, single-quoted strings with backslash
 *     escapes). Tables loaded: terms, term_taxonomy, term_relationships,
 *     users, posts.
 *
 *   /home/red/poly/recon/archives/wordpress/mirror/{Y}/{M}/{D}/{slug}/index.html
 *     Pre-rendered HTML pages. We pull the inner of `<div class="entry-content">`
 *     as the article body when present — those pages already have wpautop
 *     applied, which the raw `posts.post_content` does NOT. If the mirror
 *     file is missing or doesn't contain entry-content, we fall back to
 *     the SQL `post_content` and run our own minimal wpautop.
 *
 *   /home/red/poly/recon/archives/wordpress/uploads/wp-uploads-2026-05-06.tar.gz
 *     Not consumed by this script. Image references in body content are
 *     rewritten to `/archive/wordpress-media/uploads/...` and served
 *     separately.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WP CATEGORY -> POLYMER SECTION MAPPING
 * ─────────────────────────────────────────────────────────────────────────────
 *   The full WP category list (from the dump's `terms` × `term_taxonomy`):
 *
 *     wp term_id  WP name              -> polymer section   kicker?
 *     ----------  -------------------- -- ----------------  ------------------
 *     1           Uncategorized        -> features          (kicker omitted —
 *                                                            generic catch-all)
 *     3           Editorial/Opinion    -> opinion           kicker = name
 *     4           Features             -> features          (no kicker; exact)
 *     5           News                 -> news              (no kicker; exact)
 *     6           Sports               -> sports            (no kicker; exact)
 *     7           Post Publication     -> features          kicker = name
 *     8           Announcements        -> news              kicker = name
 *     10          PDF archives         -> features          kicker = name
 *
 *   "Featured" (term_id 15) is a tag (taxonomy='post_tag'), not a category, so
 *   it's not consulted for section routing.
 *
 *   Articles with multiple categories prefer an exact-named one (news/sports/
 *   features/opinion); otherwise the first listed category is used. The
 *   verbatim WP category names — comma-joined — are stored in `legacyCategory`.
 *
 *   See ./legacy-import/wordpress/category-mapping.ts.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * STATUS MAPPING
 * ─────────────────────────────────────────────────────────────────────────────
 *   wp post_status='publish'      -> _status='published'
 *   anything else (draft/pending/private/auto-draft/inherit/trash/...)
 *                                  -> _status='draft'
 *   wp post_type != 'post'        -> _status='draft' (always, regardless
 *                                    of post_status). Pages (14) and "other"
 *                                    (29) are preserved but never live.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IDEMPOTENCY
 * ─────────────────────────────────────────────────────────────────────────────
 *   Each row carries (legacySource='wordpress', legacyArticleId=String(wp_id)).
 *   On every run we look up that pair first and skip if found, so re-running
 *   the script (or running with overlapping --start-from / --limit flags) is
 *   safe.
 *
 *   Articles.afterChange / beforeChange hooks are gated on
 *   `req.context.legacyImport=true`, so the bulk insert does NOT trigger
 *   PostHog events or breaking-news pushes (see collections/Articles.ts).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ROLLBACK
 * ─────────────────────────────────────────────────────────────────────────────
 *   To remove every wordpress-imported article from a database:
 *
 *     DELETE FROM articles WHERE legacy_source = 'wordpress';
 *     DELETE FROM _articles_v WHERE version_legacy_source = 'wordpress';
 *     -- And the per-locale / write-in tables that cascade off articles.id;
 *     -- Postgres FKs handle the cascade if `ON DELETE CASCADE` was set;
 *     -- otherwise drop the children explicitly.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ENVIRONMENT
 * ─────────────────────────────────────────────────────────────────────────────
 *   DATABASE_URL                — polymer Postgres URL (required)
 *   PAYLOAD_SECRET              — required for getPayload bootstrap
 *   PAYLOAD_DISABLE_PUSH=1      — recommended; prevents Payload's dev
 *                                 db-push from interfering during long runs
 *   INTERNAL_PUSH_SECRET=       — leave blank, belt-and-suspenders so
 *                                 breaking-news fan-out is a no-op even if
 *                                 the legacyImport guard somehow fails
 *   NEXT_PUBLIC_POSTHOG_KEY=    — leave blank, same reason
 *
 *   No WP DB needed: we parse the .sql.gz dump directly. Override the dump
 *   path with --dump=/path/to/wordpress-archive.sql.gz if necessary.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * USAGE
 * ─────────────────────────────────────────────────────────────────────────────
 *   pnpm tsx scripts/import-wordpress.ts --dry-run --limit 5
 *   pnpm tsx scripts/import-wordpress.ts --limit 25
 *   pnpm tsx scripts/import-wordpress.ts                  # full import
 *   pnpm tsx scripts/import-wordpress.ts --source-only=15238   # one wp_id
 *
 *   Flags:
 *     --dry-run             do everything except payload.create
 *     --limit N             only process the first N matching entries
 *     --start-from N        skip the first N matching entries
 *     --type=post|page|other  filter by manifest post_type bucket
 *     --status=publish|...  filter by manifest post_status
 *     --source-only=ID      single entry by wp_id (for debugging)
 *     --manifest=PATH       override default manifest path
 *     --dump=PATH           override default dump path
 *     --mirror=PATH         override default mirror root
 */
import fs from 'node:fs'
import { performance } from 'node:perf_hooks'

import { getPayload, type Payload } from 'payload'
import { Pool } from 'pg'
import { LegacyMediaResolver, resolveImagesInLexicalTree } from './legacy-import/media-resolver.ts'
import config from '../payload.config.ts'

import { loadWpDataset, type WpPostRow } from './legacy-import/wordpress/wp-data.ts'
import {
  deriveSectionAndKicker,
  joinLegacyCategory,
  type PolymerSection,
} from './legacy-import/wordpress/category-mapping.ts'
import {
  convertHtmlToLexical,
  emptyLexicalDoc,
  lexicalToPlainText,
  plainTextTitle,
  type LexicalDoc,
} from './legacy-import/wordpress/html-to-lexical.ts'
import { decodeEntities } from './legacy-import/wordpress/html-tokenizer.ts'
import { rewriteAssetUrl } from './legacy-import/wordpress/image-rewriter.ts'
import {
  cleanHumanName,
  extractMirrorFields,
  isGenericByline,
} from './legacy-import/wordpress/mirror-extractor.ts'
import { buildImportSlug, buildLegacyHtmlUrl } from './legacy-import/wordpress/slug.ts'

// ─── default paths ──────────────────────────────────────────────────────────
const DEFAULT_MANIFEST = '/home/red/poly/recon/archives/wordpress/manifest.json'
const DEFAULT_DUMP = '/home/red/poly/recon/archives/wordpress/db/wordpress-archive-2026-05-06.sql.gz'
const DEFAULT_MIRROR_ROOT = '/home/red/poly/recon/archives/wordpress'

// ─── manifest types ─────────────────────────────────────────────────────────
type ManifestEntry = {
  wp_id: number
  url_path: string
  post_type: string
  post_status: string
  post_date_gmt: string
  post_modified_gmt: string
  slug: string
  title: string
  html_path: string
  type: string
  year: string
  month: string
  day: string
}

type Manifest = {
  entries: ManifestEntry[]
  totals?: { entries?: number }
}

// ─── CLI parsing ────────────────────────────────────────────────────────────
type Flags = {
  dryRun: boolean
  limit: number | null
  startFrom: number
  typeFilter: 'post' | 'page' | 'other' | null
  statusFilter: string | null
  sourceOnly: number | null
  manifestPath: string
  dumpPath: string
  mirrorRoot: string
  update: boolean
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = {
    dryRun: false,
    limit: null,
    startFrom: 0,
    typeFilter: null,
    statusFilter: null,
    sourceOnly: null,
    manifestPath: DEFAULT_MANIFEST,
    dumpPath: DEFAULT_DUMP,
    mirrorRoot: DEFAULT_MIRROR_ROOT,
    update: false,
  }
  for (const a of argv) {
    if (a === '--dry-run') flags.dryRun = true
    else if (a === '--update') flags.update = true
    else if (a.startsWith('--limit=')) flags.limit = Number(a.slice('--limit='.length))
    else if (a === '--limit') {
      // handled by next-arg lookup below
    } else if (a.startsWith('--start-from=')) flags.startFrom = Number(a.slice('--start-from='.length))
    else if (a.startsWith('--type=')) {
      const v = a.slice('--type='.length)
      if (v === 'post' || v === 'page' || v === 'other') flags.typeFilter = v
      else throw new Error(`--type must be post|page|other, got ${v}`)
    } else if (a.startsWith('--status=')) flags.statusFilter = a.slice('--status='.length)
    else if (a.startsWith('--source-only=')) flags.sourceOnly = Number(a.slice('--source-only='.length))
    else if (a.startsWith('--manifest=')) flags.manifestPath = a.slice('--manifest='.length)
    else if (a.startsWith('--dump=')) flags.dumpPath = a.slice('--dump='.length)
    else if (a.startsWith('--mirror=')) flags.mirrorRoot = a.slice('--mirror='.length)
  }
  // Support `--limit N` and `--start-from N` (space form).
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--limit' && argv[i + 1] && !argv[i + 1].startsWith('--')) {
      flags.limit = Number(argv[i + 1])
    }
    if (argv[i] === '--start-from' && argv[i + 1] && !argv[i + 1].startsWith('--')) {
      flags.startFrom = Number(argv[i + 1])
    }
  }
  return flags
}

// ─── manifest filtering ─────────────────────────────────────────────────────
function filterManifest(entries: ManifestEntry[], flags: Flags): ManifestEntry[] {
  let filtered = entries
  if (flags.sourceOnly != null) {
    filtered = filtered.filter((e) => e.wp_id === flags.sourceOnly)
  }
  if (flags.typeFilter) {
    filtered = filtered.filter((e) => {
      if (flags.typeFilter === 'post') return e.post_type === 'post'
      if (flags.typeFilter === 'page') return e.post_type === 'page'
      return e.post_type !== 'post' && e.post_type !== 'page'
    })
  }
  if (flags.statusFilter) {
    filtered = filtered.filter((e) => e.post_status === flags.statusFilter)
  }
  if (flags.startFrom > 0) {
    filtered = filtered.slice(flags.startFrom)
  }
  if (flags.limit != null) {
    filtered = filtered.slice(0, flags.limit)
  }
  return filtered
}

// ─── per-row build ──────────────────────────────────────────────────────────
type BuiltArticle = {
  data: {
    section: PolymerSection
    title: LexicalDoc
    plainTitle: string
    subdeck: string | null
    kicker: string | null
    content: LexicalDoc
    writeInAuthors: { name: string }[]
    publishedDate: string
    _status: 'published' | 'draft'
    slug: string
    legacySource: 'wordpress'
    legacyArticleId: string
    legacyHtmlUrl: string
    legacyCategory: string | null
  }
  // Diagnostics for the dry-run table.
  diag: {
    wpId: number
    postType: string
    postStatus: string
    contentSource: 'mirror' | 'sql' | 'excerpt' | 'title-fallback' | 'empty'
    authorSource: 'mirror' | 'wp_users' | 'none'
    plainTextLen: number
    categoryNames: string[]
  }
}

/**
 * Clean a raw WP `post_title` (or manifest title) into the form we want
 * stored as `plainTitle`:
 *
 *   1. Decode HTML entities (`&rsquo;`, `&amp;`, etc.).
 *   2. Strip inline HTML tags (`<i>Oblivion</i>` -> `Oblivion`).
 *   3. Collapse runs of whitespace and trim.
 *
 * Used for both `plainTitle` and the text node inside the Lexical title doc.
 * (We intentionally lose italics/bold formatting in the title — Polymer's
 * collection schema gives titles a Lexical doc but no styling is preserved
 * across the import; the article body is where rich formatting lives.)
 */
function cleanPlainTitle(raw: string): string {
  if (!raw) return ''
  const decoded = decodeEntities(raw)
  // Loop until fixpoint so a malformed `<scr<script>ipt>` doesn't leave a
  // residue after a single pass. (CodeQL flags single-pass tag stripping.)
  let s = decoded
  let prev: string
  do { prev = s; s = s.replace(/<[^>]*>/g, '') } while (s !== prev)
  return s.replace(/\s+/g, ' ').trim()
}

function gmtToIso(gmt: string): string | null {
  // e.g. "2019-05-07 18:02:22" -> "2019-05-07T18:02:22.000Z"
  // WP uses '0000-00-00 00:00:00' for unset draft dates; we return null in
  // that case and let the caller fall back to post_modified_gmt or the epoch.
  if (!gmt) return null
  const m = gmt.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/)
  if (!m) return null
  if (m[1] === '0000' || m[2] === '00' || m[3] === '00') return null
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}.000Z`
}

function pickPublishedDate(opts: {
  postDateGmt: string
  postModifiedGmt: string
  manifestDateGmt: string
  year: string
  month: string
  day: string
}): string {
  return (
    gmtToIso(opts.postDateGmt) ||
    gmtToIso(opts.manifestDateGmt) ||
    gmtToIso(opts.postModifiedGmt) ||
    // Last-resort: synthesize from the manifest's year/month/day if present.
    (opts.year && opts.month && opts.day
      ? `${opts.year.padStart(4, '0')}-${opts.month.padStart(2, '0')}-${opts.day.padStart(2, '0')}T00:00:00.000Z`
      : new Date(0).toISOString())
  )
}

function buildArticle(
  entry: ManifestEntry,
  wpRow: WpPostRow,
  mirrorRoot: string,
): BuiltArticle | null {
  // Pull body, subdeck, and byline from the mirror in a single read.
  const mirror = extractMirrorFields(mirrorRoot, entry.html_path)

  // Source the body HTML.
  let html: string | null = null
  let contentSource: BuiltArticle['diag']['contentSource'] = 'sql'
  if (mirror.entryContent && mirror.entryContent.trim()) {
    html = mirror.entryContent
    contentSource = 'mirror'
  }
  if (!html) {
    html = wpRow.postContent || ''
    contentSource = 'sql'
  }

  // Convert.
  let content = convertHtmlToLexical(html, {
    rewriteImageSrc: rewriteAssetUrl,
    rewriteLinkHref: (href) => {
      // Drop tracking-only links etc.? Spec doesn't ask for that. Keep.
      return href || null
    },
  })
  let plainTextBody = lexicalToPlainText(content)

  // Fallbacks if the body came out empty.
  if (!plainTextBody) {
    if (wpRow.postExcerpt && wpRow.postExcerpt.trim()) {
      content = convertHtmlToLexical(wpRow.postExcerpt, {
        rewriteImageSrc: rewriteAssetUrl,
      })
      plainTextBody = lexicalToPlainText(content)
      if (plainTextBody) contentSource = 'excerpt'
    }
  }
  if (!plainTextBody) {
    const fallbackTitle = wpRow.postTitle || entry.title || ''
    if (fallbackTitle) {
      content = plainTextTitle(fallbackTitle)
      plainTextBody = fallbackTitle
      contentSource = 'title-fallback'
    } else {
      content = emptyLexicalDoc()
      contentSource = 'empty'
    }
  }

  // Title. Decode HTML entities (`&rsquo;`, `&amp;`, `&hellip;`, etc.), strip
  // any inline HTML tags (some titles still carry literal `<i>...</i>` from
  // the WP source), and collapse whitespace before building the Lexical title
  // node. Both manifest's `entry.title` and `wpRow.postTitle` are stored
  // encoded-and-tagged in the WP source — leaving either path raw produced
  // plain_title rows like `"<i>Oblivion</i> entertains with action, beauty"`
  // or `"About  Poly  Press Pass"` (double spaces left from the tag-stripping
  // the WP theme did at render time).
  //
  // For ~11 articles WP `post_title` is empty entirely (letters to the editor,
  // elections notices). We fall back to the mirror's `<div class="kicker">`
  // text ("Letter to the Editor", "Editorial Board Elections Notice", …) as
  // a meaningful human label rather than emitting "(untitled)".
  const rawHeadline = (wpRow.postTitle || entry.title || '').trim()
  let headline = cleanPlainTitle(rawHeadline)
  if (!headline && mirror.kicker) {
    headline = cleanPlainTitle(mirror.kicker)
  }
  if (!headline) headline = '(untitled)'
  const titleDoc = plainTextTitle(headline)

  // Subdeck. Comes from the mirror's `<h3 class="entry-subdeck">` element.
  // The extractor already decodes entities and strips inline tags.
  const subdeck = mirror.subdeck && mirror.subdeck.trim() ? mirror.subdeck.trim() : null

  // Section / kicker / legacyCategory.
  const { section, kicker } = deriveSectionAndKicker(wpRow.categoryNames)
  const legacyCategory = joinLegacyCategory(wpRow.categoryNames)

  // Status.
  let _status: 'published' | 'draft'
  if (entry.post_type !== 'post') {
    _status = 'draft'
  } else if (wpRow.postStatus === 'publish') {
    _status = 'published'
  } else {
    _status = 'draft'
  }

  // Author. Prefer the byline parsed from the mirror page (the real reporter
  // name lives there). Fall back to wp_users.display_name when the mirror
  // produced no byline OR only generic placeholders. The mirror-extractor
  // strips position suffixes ("Staff Reporter", etc.) and rejects generic
  // names like "The Poly" / "admin" / "wordpress" — leaving an empty array
  // signals that we should use the wp_users path.
  //
  // The wp_users fallback ALSO has to reject generics: virtually every old WP
  // post has `post_author=1` (the generic "The Poly" account), so naively
  // taking display_name produces ~500 articles bylined "The Poly". Filter
  // those through the same generic-name set; if that yields nothing, leave
  // the writeInAuthors array empty so the UI degrades gracefully (the
  // `legacyHtmlUrl` chip on the article page still surfaces the source).
  const writeInAuthors: { name: string }[] = []
  let authorSource: BuiltArticle['diag']['authorSource'] = 'none'
  if (mirror.bylineAuthors.length > 0) {
    for (const name of mirror.bylineAuthors) {
      writeInAuthors.push({ name })
    }
    authorSource = 'mirror'
  } else {
    const fallbackAuthor = cleanHumanName(decodeEntities((wpRow.authorDisplayName || '').trim()))
    if (fallbackAuthor && !isGenericByline(fallbackAuthor)) {
      writeInAuthors.push({ name: fallbackAuthor })
      authorSource = 'wp_users'
    }
  }

  // Slug. Use the WP post_name when present, fall back to the manifest slug
  // or the headline.
  const baseSlug = wpRow.postName || entry.slug || headline
  const slug = buildImportSlug({
    year: entry.year || (wpRow.postDateGmt || '').slice(0, 4),
    month: entry.month || (wpRow.postDateGmt || '').slice(5, 7),
    day: entry.day || (wpRow.postDateGmt || '').slice(8, 10),
    base: baseSlug,
  })

  // Fall back to post_date_gmt for the legacy URL date components when the
  // manifest entry lacks year/month/day (a few drafts/oddly-shaped posts have
  // null in those fields). Without this fallback we produced URLs like
  // `/archive/wordpress/mirror/undefined/undefined/undefined/(untitled)/`.
  const legacyHtmlUrl = buildLegacyHtmlUrl({
    year: entry.year || (wpRow.postDateGmt || '').slice(0, 4),
    month: entry.month || (wpRow.postDateGmt || '').slice(5, 7),
    day: entry.day || (wpRow.postDateGmt || '').slice(8, 10),
    slug: entry.slug || baseSlug,
  })

  return {
    data: {
      section,
      title: titleDoc,
      plainTitle: headline,
      subdeck,
      kicker,
      content,
      writeInAuthors,
      publishedDate: pickPublishedDate({
        postDateGmt: wpRow.postDateGmt,
        postModifiedGmt: wpRow.postModifiedGmt,
        manifestDateGmt: entry.post_date_gmt,
        year: entry.year,
        month: entry.month,
        day: entry.day,
      }),
      _status,
      slug,
      legacySource: 'wordpress',
      legacyArticleId: String(wpRow.id),
      legacyHtmlUrl,
      legacyCategory,
    },
    diag: {
      wpId: wpRow.id,
      postType: wpRow.postType,
      postStatus: wpRow.postStatus,
      contentSource,
      authorSource,
      plainTextLen: plainTextBody.length,
      categoryNames: wpRow.categoryNames,
    },
  }
}

// ─── existence check ────────────────────────────────────────────────────────
async function existingArticleId(
  payload: Payload,
  wpId: number,
): Promise<number | string | null> {
  const res = await payload.find({
    collection: 'articles',
    where: {
      and: [
        { legacySource: { equals: 'wordpress' } },
        { legacyArticleId: { equals: String(wpId) } },
      ],
    },
    limit: 1,
    depth: 0,
    pagination: false,
  })
  if (res.docs.length === 0) return null
  return res.docs[0].id as number | string
}

// ─── main ───────────────────────────────────────────────────────────────────
async function main() {
  const argv = process.argv.slice(2)
  const flags = parseFlags(argv)

  console.log('[wp] flags:', JSON.stringify(flags))

  // Load + filter manifest.
  if (!fs.existsSync(flags.manifestPath)) {
    console.error(`[wp] manifest not found: ${flags.manifestPath}`)
    process.exit(1)
  }
  const manifestRaw = JSON.parse(fs.readFileSync(flags.manifestPath, 'utf8')) as Manifest
  const allEntries = manifestRaw.entries || []
  const filtered = filterManifest(allEntries, flags)
  console.log(`[wp] manifest entries=${allEntries.length}, after filter=${filtered.length}`)

  if (filtered.length === 0) {
    console.log('[wp] nothing to import')
    process.exit(0)
  }

  // Load WP dataset (only the ids we care about).
  if (!fs.existsSync(flags.dumpPath)) {
    console.error(`[wp] dump not found: ${flags.dumpPath}`)
    process.exit(1)
  }
  console.log('[wp] streaming dump (this takes ~30-60s)...')
  const t0 = performance.now()
  const wantedIds = new Set(filtered.map((e) => e.wp_id))
  const dataset = await loadWpDataset(flags.dumpPath, wantedIds)
  console.log(
    `[wp] loaded users=${dataset.users.size} terms=${dataset.terms.size} ` +
      `relationships=${dataset.relationships.size} posts=${dataset.posts.size} ` +
      `(${Math.round(performance.now() - t0)}ms)`,
  )

  // Bootstrap Payload + a raw pg pool (for the post-insert _status /
  // published_date pin) — skip both in pure dry-run.
  let payload: Payload | null = null
  let pgPool: Pool | null = null
  let mediaResolver: LegacyMediaResolver | null = null
  if (!flags.dryRun) {
    payload = await getPayload({ config })
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
      console.error('[wp] DATABASE_URL not set; required for non-dry-run mode')
      process.exit(1)
    }
    pgPool = new Pool({ connectionString: dbUrl })
    mediaResolver = new LegacyMediaResolver(pgPool)
  }

  let imported = 0
  let skipped = 0
  let failed = 0
  let dryShown = 0
  const sectionCounts: Record<PolymerSection, number> = { news: 0, sports: 0, features: 0, opinion: 0 }
  const statusCounts: Record<'published' | 'draft', number> = { published: 0, draft: 0 }
  const authorSourceCounts: Record<'mirror' | 'wp_users' | 'none', number> = { mirror: 0, wp_users: 0, none: 0 }
  const sampleSlugs: string[] = []
  const failures: { wpId: number; reason: string }[] = []
  const oddities: string[] = []
  const start = performance.now()

  for (let i = 0; i < filtered.length; i++) {
    const entry = filtered[i]
    let built: BuiltArticle | null = null
    try {
      const wpRow = dataset.buildRow(entry.wp_id)
      if (!wpRow) {
        oddities.push(`wp_id=${entry.wp_id} present in manifest but missing from posts dump`)
        failed++
        failures.push({ wpId: entry.wp_id, reason: 'missing in posts dump' })
        continue
      }
      built = buildArticle(entry, wpRow, flags.mirrorRoot)
      if (built && mediaResolver) {
        // Swap legacy-image-placeholder nodes for real upload nodes referencing
        // media rows (created on demand). Done in-place on built.data.content.
        await resolveImagesInLexicalTree(built.data.content, mediaResolver)
      }
      if (!built) {
        failed++
        failures.push({ wpId: entry.wp_id, reason: 'build returned null' })
        continue
      }
      // Diagnostics aggregation.
      sectionCounts[built.data.section]++
      statusCounts[built.data._status]++
      authorSourceCounts[built.diag.authorSource]++
      if (sampleSlugs.length < 10) sampleSlugs.push(built.data.slug)
      if (built.diag.authorSource === 'wp_users') {
        // Surface fallback cases — mirror byline missing or only generic.
        if (oddities.length < 200) {
          oddities.push(
            `wp_id=${entry.wp_id} fell back to wp_users author "${wpRow.authorDisplayName || '?'}" (no usable mirror byline)`,
          )
        }
      } else if (built.diag.authorSource === 'none') {
        oddities.push(`wp_id=${entry.wp_id} has no author at all (mirror missing, wp_users empty)`)
      }
      if (!wpRow.categoryNames.length && entry.post_type === 'post') {
        oddities.push(`wp_id=${entry.wp_id} has no category — defaulted to features`)
      }
      if (built.diag.contentSource === 'empty') {
        oddities.push(`wp_id=${entry.wp_id} produced empty body (no mirror, no SQL content, no excerpt, no title)`)
      }

      if (flags.dryRun) {
        if (dryShown < 25) {
          console.log(
            `[wp:dry] wp=${built.diag.wpId} ` +
              `type=${built.diag.postType.padEnd(4)} ` +
              `status=${built.diag.postStatus.padEnd(8)} ` +
              `-> _status=${built.data._status.padEnd(9)} ` +
              `section=${built.data.section.padEnd(8)} ` +
              `kicker=${(built.data.kicker || '-').padEnd(20).slice(0, 20)} ` +
              `src=${built.diag.contentSource.padEnd(15)} ` +
              `bodyLen=${String(built.diag.plainTextLen).padEnd(6)} ` +
              `slug=${built.data.slug}`,
          )
          dryShown++
        }
        imported++
        continue
      }

      // Real insert path.
      const existingId = await existingArticleId(payload!, entry.wp_id)
      if (existingId !== null && !flags.update) {
        skipped++
        continue
      }
      if (existingId !== null && flags.update) {
        // --update mode: rewrite title/content/plainTitle/subdeck/
        // writeInAuthors/legacyHtmlUrl/legacyCategory on the existing row
        // without touching slug or status. We pass `title` as well as
        // `plainTitle` because the Articles beforeChange hook overwrites
        // plainTitle from getPlainText(title) — if we didn't ship a fresh
        // title doc, the hook would re-encode plainTitle from the stale
        // (entity-encoded) row. Hook will re-derive plainContent from the
        // updated content.
        try {
          const updateData: Record<string, unknown> = {
            title: built.data.title,
            content: built.data.content,
            plainTitle: built.data.plainTitle,
            subdeck: built.data.subdeck,
            writeInAuthors: built.data.writeInAuthors,
            legacyHtmlUrl: built.data.legacyHtmlUrl,
            legacyCategory: built.data.legacyCategory,
            legacySource: built.data.legacySource,
            legacyArticleId: built.data.legacyArticleId,
          }
          if (built.data.kicker !== undefined) updateData.kicker = built.data.kicker
          /* eslint-disable @typescript-eslint/no-explicit-any */
          await payload!.update({
            collection: 'articles',
            id: existingId,
            data: updateData as any,
            req: { context: { legacyImport: true } } as any,
          })
          /* eslint-enable @typescript-eslint/no-explicit-any */
          imported++
        } catch (updateErr) {
          const msg = updateErr instanceof Error ? updateErr.message : String(updateErr)
          if (/Content/i.test(msg)) {
            // Same Content fallback as create: minimal-body Lexical doc.
            const fallbackText = decodeEntities((entry.title || '').trim())
            const updateData: Record<string, unknown> = {
              title: built.data.title,
              content: {
                root: {
                  type: 'root', format: '', indent: 0, version: 1, direction: 'ltr',
                  children: [{
                    type: 'paragraph', format: '', indent: 0, version: 1, direction: 'ltr',
                    textFormat: 0, textStyle: '',
                    children: fallbackText
                      ? [{ type: 'text', format: 0, mode: 'normal', style: '', text: fallbackText, detail: 0, version: 1 }]
                      : [],
                  }],
                },
              },
              plainTitle: built.data.plainTitle,
              subdeck: built.data.subdeck,
              writeInAuthors: built.data.writeInAuthors,
              legacyHtmlUrl: built.data.legacyHtmlUrl,
              legacyCategory: built.data.legacyCategory,
            }
            /* eslint-disable @typescript-eslint/no-explicit-any */
            await payload!.update({
              collection: 'articles',
              id: existingId,
              data: updateData as any,
              req: { context: { legacyImport: true } } as any,
            })
            /* eslint-enable @typescript-eslint/no-explicit-any */
            imported++
          } else {
            throw updateErr
          }
        }
        continue
      }
      // We always create with _status='draft' to dodge the
      // Articles.beforeChange hook that overwrites publishedDate with
      // `new Date().toISOString()` whenever the row transitions to
      // published. After insert we run a raw SQL UPDATE that sets the
      // intended _status and the historical published_date on both
      // `articles` and the latest `_articles_v` row. We do NOT modify
      // collections/Articles.ts (per import spec) — the legacyImport
      // context flag is only checked by afterChange.
      const desiredStatus = built.data._status
      const desiredPublishedDate = built.data.publishedDate
      const insertData = { ...built.data, _status: 'draft' as const }
      /* eslint-disable @typescript-eslint/no-explicit-any */
      // Retry on slug collision (cross-source same-day collisions with poly-online)
      // and on Content validation errors (rare cases where the converted Lexical
      // structure doesn't validate). Both retries are bounded by attempt count.
      let created: { id: number | string } | null = null
      let attempt = 0
      while (attempt < 3 && created === null) {
        try {
          created = await payload!.create({
            collection: 'articles',
            data: insertData as unknown as any,
            req: { context: { legacyImport: true } } as unknown as any,
          })
        } catch (createErr) {
          const msg = createErr instanceof Error ? createErr.message : String(createErr)
          if (attempt < 2 && /slug/i.test(msg)) {
            const disambiguated = `${insertData.slug}-${entry.wp_id}`
            insertData.slug = disambiguated
            built.data.slug = disambiguated
            attempt++
            continue
          }
          if (attempt < 2 && /Content/i.test(msg)) {
            // Replace body with a single empty paragraph; the legacyHtmlUrl chip
            // still surfaces the original HTML to readers.
            const fallbackText = decodeEntities((entry.title || '').trim())
            ;(insertData as any).content = {
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
                  children: fallbackText
                    ? [{ type: 'text', format: 0, mode: 'normal', style: '', text: fallbackText, detail: 0, version: 1 }]
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
      if (created === null) throw new Error('create returned null after retries')
      /* eslint-enable @typescript-eslint/no-explicit-any */
      // Pin _status and published_date in raw SQL. We update both the
      // canonical row and the most-recent version shadow row. This bypasses
      // Payload hooks entirely.
      const articleId = (created as { id: number | string }).id
      await pgPool!.query(
        'UPDATE "articles" SET "_status" = $1, "published_date" = $2 WHERE "id" = $3',
        [desiredStatus, desiredPublishedDate, articleId],
      )
      await pgPool!.query(
        'UPDATE "_articles_v" SET "version__status" = $1, "version_published_date" = $2 ' +
          'WHERE "parent_id" = $3 AND "latest" = true',
        [desiredStatus, desiredPublishedDate, articleId],
      )
      imported++
    } catch (err) {
      failed++
      const reason = err instanceof Error ? err.message : String(err)
      failures.push({ wpId: entry.wp_id, reason })
      console.error(
        `[wp] FAIL wp_id=${entry.wp_id} (${entry.title?.slice(0, 60) ?? '?'}): ${reason}`,
      )
    }
    if ((i + 1) % 100 === 0) {
      const elapsed = Math.round((performance.now() - start) / 1000)
      console.log(
        `[wp] ${i + 1}/${filtered.length} processed — ` +
          `imported=${imported} skipped=${skipped} failed=${failed} (${elapsed}s)`,
      )
    }
  }

  const totalSec = Math.round((performance.now() - start) / 1000)
  console.log('\n[wp] done.')
  console.log(`[wp]   processed:  ${filtered.length}`)
  console.log(`[wp]   imported:   ${imported}${flags.dryRun ? ' (dry-run; would-insert count)' : ''}`)
  console.log(`[wp]   skipped:    ${skipped} (already in DB)`)
  console.log(`[wp]   failed:     ${failed}`)
  console.log(`[wp]   elapsed:    ${totalSec}s`)
  console.log(
    `[wp]   sections:   news=${sectionCounts.news} sports=${sectionCounts.sports} ` +
      `features=${sectionCounts.features} opinion=${sectionCounts.opinion}`,
  )
  console.log(`[wp]   _status:    published=${statusCounts.published} draft=${statusCounts.draft}`)
  console.log(
    `[wp]   author src: mirror=${authorSourceCounts.mirror} wp_users=${authorSourceCounts.wp_users} ` +
      `none=${authorSourceCounts.none}`,
  )
  if (sampleSlugs.length) {
    console.log(`[wp]   sample slugs: ${sampleSlugs.slice(0, 5).join(', ')}`)
  }
  if (oddities.length) {
    console.log(`[wp]   anomalies (${oddities.length}):`)
    for (const o of oddities.slice(0, 20)) console.log(`         - ${o}`)
    if (oddities.length > 20) console.log(`         ... and ${oddities.length - 20} more`)
  }
  if (failures.length) {
    console.log(`[wp]   failures (${failures.length}):`)
    for (const f of failures.slice(0, 20)) console.log(`         - wp_id=${f.wpId}: ${f.reason}`)
    if (failures.length > 20) console.log(`         ... and ${failures.length - 20} more`)
  }

  if (pgPool) await pgPool.end().catch(() => {})
  process.exit(0)
}

main().catch((err) => {
  console.error('[wp] fatal:', err)
  process.exit(1)
})
