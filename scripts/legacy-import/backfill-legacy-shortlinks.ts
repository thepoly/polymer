/**
 * Populate the `legacy_shortlinks` lookup table from the WordPress
 * `pluginSL_shorturl` table.
 *
 * Each WP shortlink is one of:
 *   - id_post != 0:  link to a WP post → resolve to the canonical polymer URL
 *                    (via legacy_source='wordpress' + legacy_article_id=id_post),
 *                    or fall back to the source `/YYYY/MM/DD/<post_name>/`
 *                    shape (which the existing `LEGACY_WP_URL_RE` middleware
 *                    branch then re-resolves).
 *   - url_externe set: external destination → copy as-is
 *
 * Run with `pnpm tsx scripts/legacy-import/backfill-legacy-shortlinks.ts`.
 * Defaults to a dry run; pass `--write` to commit.
 */

import { Pool } from 'pg'
import { execFileSync } from 'child_process'

const WP_SQLITE = '/tmp/audit/wp.db'

function parseArgs() {
  const args = process.argv.slice(2)
  return { write: args.includes('--write') }
}

async function main() {
  const { write } = parseArgs()
  console.log(`Mode: write=${write}`)

  // Pull every shortlink + its target post info in one shot.
  // post_type='attachment' rows carry the upload's URL in `guid` so we can
  // route shortlinks pointing at media files too.
  const tsv = execFileSync(
    'sqlite3',
    [
      '-separator',
      '\t',
      WP_SQLITE,
      `SELECT s.short_url, s.id_post, s.url_externe, s.nb_hits,
              p.post_name, substr(p.post_date, 1, 10) AS post_date,
              p.post_status, p.post_type, p.guid
       FROM pluginSL_shorturl s
       LEFT JOIN posts p ON p.id = s.id_post`,
    ],
    { maxBuffer: 64 * 1024 * 1024 },
  ).toString()

  type WpRow = {
    code: string
    idPost: number
    external: string
    hits: number
    postName: string
    postDate: string
    postStatus: string
    postType: string
    guid: string
  }
  const wpRows: WpRow[] = []
  for (const line of tsv.split('\n')) {
    if (!line) continue
    const parts = line.split('\t')
    if (parts.length < 9) continue
    const [code, idPostStr, external, hitsStr, postName, postDate, postStatus, postType, guid] = parts
    if (!code) continue
    wpRows.push({
      code,
      idPost: Number(idPostStr) || 0,
      external: external || '',
      hits: Number(hitsStr) || 0,
      postName: postName || '',
      postDate: postDate || '',
      postStatus: postStatus || '',
      postType: postType || '',
      guid: guid || '',
    })
  }
  console.log(`Source pluginSL_shorturl rows: ${wpRows.length}`)

  // Pre-load polymer's wordpress-era articles for fast id_post → URL lookup.
  const pool = new Pool({
    host: '127.0.0.1',
    port: 5433,
    user: 'poly',
    password: 'poly',
    database: 'polymer2',
  })

  const polymerArticles = await pool.query<{
    legacy_article_id: string
    section: string
    slug: string
    published_date: string | null
  }>(
    `SELECT legacy_article_id, section, slug, published_date FROM articles
     WHERE legacy_source='wordpress' AND _status='published'`,
  )
  const polymerByWpId = new Map<number, { section: string; slug: string; year: string; month: string }>()
  for (const r of polymerArticles.rows) {
    if (!r.published_date) continue
    const dt = new Date(r.published_date)
    const yy = dt.getUTCFullYear().toString()
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
    polymerByWpId.set(Number(r.legacy_article_id), { section: r.section, slug: r.slug, year: yy, month: mm })
  }
  console.log(`Polymer wp-era published articles: ${polymerByWpId.size}`)

  let toPolymer = 0
  let toMirrorFallback = 0
  let toExternal = 0
  let toAttachment = 0
  let skipped = 0

  // Use a single multi-row INSERT for speed. Chunk to keep the parameter list
  // under Postgres' 65535 limit.
  type Insert = { code: string; target: string; hits: number }
  const inserts: Insert[] = []

  for (const r of wpRows) {
    let target: string | null = null

    if (r.idPost > 0) {
      const matched = polymerByWpId.get(r.idPost)
      if (matched) {
        target = `/${matched.section}/${matched.year}/${matched.month}/${matched.slug}`
        toPolymer++
      } else if (r.postName && r.postDate && r.postStatus === 'publish' && r.postType === 'post') {
        // Polymer hasn't ingested this post (rare). Fall back to the WP-era
        // permalink shape, which our LEGACY_WP_URL_RE branch will then try
        // to resolve at request time.
        const [y, m, d] = r.postDate.split('-')
        if (y && m && d) {
          target = `/${y}/${m}/${d}/${r.postName}/`
          toMirrorFallback++
        }
      } else if (r.postType === 'attachment' && r.guid) {
        // Media attachments live in the archive proxy under
        // /archive/wordpress-media/uploads/... We rewrite the guid path-
        // suffix the same way image-rewriter does for body images.
        const m = r.guid.match(/^https?:\/\/[^/]+\/wp-content\/uploads\/(.+)$/i)
        if (m) {
          target = `/archive/wordpress-media/uploads/${m[1]}`
          toAttachment++
        }
      }
    }

    if (!target && r.external) {
      target = r.external
      toExternal++
    }

    if (!target) {
      skipped++
      continue
    }

    inserts.push({ code: r.code, target, hits: r.hits })
  }

  console.log(`\nResolution:`)
  console.log(`  → polymer URL    : ${toPolymer}`)
  console.log(`  → mirror fallback: ${toMirrorFallback}`)
  console.log(`  → attachment     : ${toAttachment}`)
  console.log(`  → external URL   : ${toExternal}`)
  console.log(`  skipped          : ${skipped}`)
  console.log(`  total inserts    : ${inserts.length}`)

  if (write) {
    // Truncate and re-insert so re-runs are idempotent.
    await pool.query(`TRUNCATE TABLE legacy_shortlinks`)
    const CHUNK = 500
    for (let i = 0; i < inserts.length; i += CHUNK) {
      const batch = inserts.slice(i, i + CHUNK)
      const values: string[] = []
      const params: (string | number)[] = []
      let p = 1
      for (const ins of batch) {
        values.push(`($${p++}, $${p++}, $${p++})`)
        params.push(ins.code, ins.target, ins.hits)
      }
      await pool.query(
        `INSERT INTO legacy_shortlinks (short_code, target_url, hit_count) VALUES ${values.join(', ')}
         ON CONFLICT (short_code) DO UPDATE SET target_url = EXCLUDED.target_url, hit_count = EXCLUDED.hit_count`,
        params,
      )
    }
  }

  console.log(`\nMode: ${write ? 'WRITTEN' : 'DRY RUN'}`)
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
