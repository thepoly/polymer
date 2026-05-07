/**
 * Regenerate slugs for wordpress-era articles whose original `_`-separated
 * `post_name` was stripped (not hyphen-replaced) during import, producing
 * keyword-mash slugs like `2017-04-05-votingimpactsstudents`.
 *
 * Approach:
 *   - read source `posts.post_name` from the WP DB dump (sqlite)
 *   - replace `_` with `-`, drop other non-[a-z0-9-] chars, collapse `--`s
 *   - new slug: `YYYY-MM-DD-<cleaned>`
 *   - if the new slug differs from the current one, save the current slug to
 *     `previous_slug` and overwrite `slug` + `_articles_v.version_slug`
 *
 * Collisions: handled by appending `-{wp_id}` to the new slug. polymer's slug
 * column is UNIQUE so this is necessary on the (rare) cases where two
 * articles have the same date+post_name in the source.
 *
 * Run with `pnpm tsx scripts/legacy-import/reslugify-wordpress.ts`. Defaults
 * to a dry run; pass `--write` to commit.
 */

import { Pool } from 'pg'
import { execFileSync } from 'child_process'

const WP_SQLITE = '/tmp/audit/wp.db'

function parseArgs() {
  const args = process.argv.slice(2)
  return { write: args.includes('--write') }
}

// Match polymer's slugify rule but operate on text that uses `_` as the
// word separator (the WP `post_name` convention). Underscores become hyphens
// here, then we run the standard cleanup.
function cleanWpPostname(postName: string): string {
  if (!postName) return ''
  return postName
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function main() {
  const { write } = parseArgs()
  console.log(`Mode: write=${write}`)

  // Pull post_name + post_date from sqlite in one shot.
  const tsv = execFileSync(
    'sqlite3',
    [
      '-separator',
      '\t',
      WP_SQLITE,
      "SELECT id, post_name, substr(post_date, 1, 10) AS post_date FROM posts WHERE post_status='publish' AND post_type='post' AND post_name IS NOT NULL AND post_name != ''",
    ],
    { maxBuffer: 64 * 1024 * 1024 },
  ).toString()

  type WpRow = { id: number; postName: string; date: string }
  const wpRows: WpRow[] = []
  for (const line of tsv.split('\n')) {
    if (!line) continue
    const [idStr, postName, date] = line.split('\t')
    const id = Number(idStr)
    if (!id || !postName || !date) continue
    wpRows.push({ id, postName, date })
  }
  console.log(`WP source rows: ${wpRows.length}`)

  const pool = new Pool({
    host: '127.0.0.1',
    port: 5433,
    user: 'poly',
    password: 'poly',
    database: 'polymer2',
  })

  let totalChecked = 0
  let unchanged = 0
  let renamed = 0
  let collisions = 0
  let articleNotFound = 0
  const samples: { wpId: number; old: string; new: string }[] = []

  // Pre-build a map of existing slugs to detect collisions before we attempt
  // an UPDATE (cheaper than catching unique-constraint violations).
  const existing = await pool.query<{ slug: string; id: number }>(
    `SELECT slug, id FROM articles WHERE slug IS NOT NULL`,
  )
  const slugToId = new Map<string, number>()
  for (const r of existing.rows) slugToId.set(r.slug, r.id)

  for (const w of wpRows) {
    const article = await pool.query<{ id: number; slug: string | null }>(
      `SELECT id, slug FROM articles WHERE legacy_source='wordpress' AND legacy_article_id=$1`,
      [String(w.id)],
    )
    if (article.rowCount === 0) {
      articleNotFound++
      continue
    }
    const row = article.rows[0]
    if (!row.slug) continue

    const cleaned = cleanWpPostname(w.postName)
    if (!cleaned) continue
    let newSlug = `${w.date}-${cleaned}`

    totalChecked++

    if (newSlug === row.slug) {
      unchanged++
      continue
    }

    // Collision check. If the target slug already belongs to a *different*
    // article, append `-{wp_id}` to disambiguate.
    const taker = slugToId.get(newSlug)
    if (taker !== undefined && taker !== row.id) {
      newSlug = `${newSlug}-${w.id}`
      collisions++
      if (slugToId.has(newSlug)) {
        // Highly unlikely but surface it.
        console.warn(`double-collision skipped: wp_id=${w.id} → ${newSlug}`)
        continue
      }
    }

    if (write) {
      await pool.query(
        `UPDATE articles SET previous_slug=$1, slug=$2, updated_at=NOW() WHERE id=$3`,
        [row.slug, newSlug, row.id],
      )
      // Also patch the latest version-shadow row so admin previews stay
      // aligned with the live row.
      await pool.query(
        `UPDATE "_articles_v" SET version_slug=$1 WHERE parent_id=$2 AND version_slug=$3`,
        [newSlug, row.id, row.slug],
      )
    }
    slugToId.delete(row.slug)
    slugToId.set(newSlug, row.id)
    renamed++

    if (samples.length < 12) samples.push({ wpId: w.id, old: row.slug, new: newSlug })
    if (renamed % 500 === 0) console.log(`  …${renamed} renamed`)
  }

  console.log(`\nResults:`)
  console.log(`  checked            : ${totalChecked}`)
  console.log(`  renamed            : ${renamed}`)
  console.log(`  unchanged          : ${unchanged}`)
  console.log(`  collisions handled : ${collisions}`)
  console.log(`  article not found  : ${articleNotFound}`)
  console.log(`  Mode: ${write ? 'WRITTEN' : 'DRY RUN'}`)
  console.log(`\nSample renames:`)
  for (const s of samples) console.log(`  wp_id=${s.wpId}\n    old: ${s.old}\n    new: ${s.new}`)

  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
