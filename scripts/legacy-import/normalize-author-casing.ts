/**
 * Author-casing dedup pass. Audit found ~40 cases where the same person was
 * stored with two different casings (e.g. `James Lenze II` + `JAmes Lenze
 * II`). For each lower-cased canonical name, we pick the most-common casing
 * and rename every occurrence to it.
 *
 * Run with `pnpm tsx scripts/legacy-import/normalize-author-casing.ts [--write]`.
 */

import { Pool } from 'pg'

function parseArgs() {
  return { write: process.argv.slice(2).includes('--write') }
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

  // Group by lowercase name. The most-common casing wins. Ties go to whichever
  // form is first in alphabetical order — deterministic.
  const r = await pool.query<{ name: string; cnt: number }>(
    `SELECT name, COUNT(*)::int AS cnt FROM articles_write_in_authors GROUP BY name`,
  )
  const byKey = new Map<string, { name: string; cnt: number }[]>()
  for (const row of r.rows) {
    const key = row.name.toLowerCase().trim()
    if (!key) continue
    const list = byKey.get(key) ?? []
    list.push({ name: row.name, cnt: row.cnt })
    byKey.set(key, list)
  }

  let groups = 0
  let renames = 0
  let rowsAffected = 0
  for (const [, list] of byKey) {
    if (list.length < 2) continue
    groups++
    list.sort((a, b) => b.cnt - a.cnt || a.name.localeCompare(b.name))
    const winner = list[0].name
    for (let i = 1; i < list.length; i++) {
      const loser = list[i]
      // Skip if the only difference is invisible (whitespace).
      if (winner === loser.name) continue
      if (write) {
        const u = await pool.query(`UPDATE articles_write_in_authors SET name=$1 WHERE name=$2`, [winner, loser.name])
        rowsAffected += u.rowCount ?? 0
      } else {
        rowsAffected += loser.cnt
      }
      renames++
    }
  }

  console.log(`groups with multiple casings: ${groups}`)
  console.log(`renamed casings              : ${renames}`)
  console.log(`rows affected                : ${rowsAffected}`)
  console.log(`Mode: ${write ? 'WRITTEN' : 'DRY RUN'}`)
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
