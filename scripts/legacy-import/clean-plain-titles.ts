/**
 * Decode HTML entities and strip residual inline tags from `plain_title`
 * for legacy rows where the original importer left them through.
 *
 * Audit found:
 *   - 22 pipeline plain_titles with `&#8217;`/`&#038;` etc.
 *   - 7 poly-online plain_titles with literal `<i>...</i>` tags
 *
 * Run with `pnpm tsx scripts/legacy-import/clean-plain-titles.ts [--write]`.
 */

import { Pool } from 'pg'
import { decodeEntities } from './wordpress/html-tokenizer'

function parseArgs() {
  return { write: process.argv.slice(2).includes('--write') }
}

function stripTags(input: string): string {
  let s = input
  for (;;) {
    const open = s.indexOf('<')
    if (open === -1) break
    const close = s.indexOf('>', open + 1)
    if (close === -1) {
      s = s.slice(0, open)
      break
    }
    s = s.slice(0, open) + s.slice(close + 1)
  }
  return s
}

function clean(s: string): string {
  return decodeEntities(stripTags(s)).replace(/\s+/g, ' ').trim()
}

async function main() {
  const { write } = parseArgs()
  const pool = new Pool({
    host: '127.0.0.1',
    port: 5433,
    user: 'poly',
    password: 'poly',
    database: 'polymer2',
  })

  const r = await pool.query<{ id: number; plain_title: string; legacy_source: string | null }>(
    `SELECT id, plain_title, legacy_source FROM articles
     WHERE plain_title IS NOT NULL
       AND (plain_title ~ '<[a-z]+>' OR plain_title ~ '&#[0-9]+;' OR plain_title ~ '&[a-z]+;')`,
  )
  console.log(`candidates: ${r.rows.length}`)

  let updated = 0
  for (const row of r.rows) {
    const cleaned = clean(row.plain_title)
    if (cleaned === row.plain_title) continue
    if (write) {
      await pool.query(`UPDATE articles SET plain_title=$1, updated_at=NOW() WHERE id=$2`, [cleaned, row.id])
    }
    updated++
  }
  console.log(`updated: ${updated} (${write ? 'WRITTEN' : 'DRY RUN'})`)
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
