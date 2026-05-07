/**
 * Backfill kickers and subdecks on legacy articles.
 *
 *   poly-online: read `type_db` / `blurb_db` from the manifest
 *   wordpress:   read `Kicker` / `Subdeck` postmeta from the source DB dump
 *
 * Originally we ignored these fields during import; the audit flagged 2,303
 * poly-online + 1,366 WP rows missing kickers despite the source having them,
 * plus 768 poly-online subdecks. This script does idempotent direct-SQL
 * updates against the polymer DB (no hooks fire — we're not editing
 * narrative content).
 *
 * Run with `pnpm tsx scripts/legacy-import/backfill-kickers-subdecks.ts`.
 * Defaults to a dry run; pass `--write` to actually update rows.
 */

import { Pool } from 'pg'
import { readFileSync } from 'fs'
import { execFileSync } from 'child_process'
import { decodeEntities } from './wordpress/html-tokenizer'

type PolyOnlineArticle = {
  kind: string
  articleID: number
  type_db?: string
  blurb_db?: string
}

type Mode = { write: boolean; era: 'poly-online' | 'wordpress' | 'all' }

function parseArgs(): Mode {
  const args = process.argv.slice(2)
  const eraFlag = args.find((a) => a.startsWith('--era='))?.split('=')[1] as
    | 'poly-online'
    | 'wordpress'
    | 'all'
    | undefined
  return {
    write: args.includes('--write'),
    era: eraFlag ?? 'all',
  }
}

const POLY_ONLINE_MANIFEST = '/home/red/poly/recon/archives/polytechnic-online/manifest.json'
const WP_SQLITE = '/tmp/audit/wp.db'

// Source kicker values that are generic category names (not real kickers)
// and should be overwritten if the source `Kicker` postmeta has something better.
const GENERIC_KICKER_VALUES = new Set([
  'editorial/opinion',
  'editorial / opinion',
  'opinion',
  'news',
  'sports',
  'features',
  'feature',
])

function isGenericKicker(v: string | null): boolean {
  if (!v) return false
  return GENERIC_KICKER_VALUES.has(v.trim().toLowerCase())
}

// "none" is the manifest's null marker for type_db. Skip it. Otherwise return
// the cleaned-up label (the manifest values are already title-cased).
function cleanTypeDb(raw: string | undefined | null): string | null {
  if (!raw) return null
  const v = raw.trim()
  if (!v) return null
  if (v.toLowerCase() === 'none') return null
  return v
}

// blurb_db can have the same `&#xx;` HTML entities as titles/bodies. Decode
// before saving so the subdeck renders correctly.
function cleanBlurb(raw: string | undefined | null): string | null {
  if (!raw) return null
  const v = decodeEntities(raw).trim()
  return v || null
}

async function main() {
  const mode = parseArgs()
  console.log(`Mode: era=${mode.era} write=${mode.write}`)

  const pool = new Pool({
    host: '127.0.0.1',
    port: 5433,
    user: 'poly',
    password: 'poly',
    database: 'polymer2',
  })

  let kickerUpdates = 0
  let subdeckUpdates = 0

  // ---- poly-online ----
  if (mode.era === 'all' || mode.era === 'poly-online') {
    console.log('\n=== poly-online ===')
    const manifest = JSON.parse(readFileSync(POLY_ONLINE_MANIFEST, 'utf-8')) as {
      articles: PolyOnlineArticle[]
    }
    const articles = manifest.articles.filter((a) => a.kind === 'article')
    console.log(`Manifest articles: ${articles.length}`)

    // De-dupe by articleID; manifest has multiple part rows per article.
    const seen = new Set<number>()
    const updates: { id: number; kicker: string | null; subdeck: string | null }[] = []
    for (const a of articles) {
      if (seen.has(a.articleID)) continue
      seen.add(a.articleID)
      const k = cleanTypeDb(a.type_db)
      const s = cleanBlurb(a.blurb_db)
      if (!k && !s) continue
      updates.push({ id: a.articleID, kicker: k, subdeck: s })
    }
    console.log(`Distinct articleIDs with type_db/blurb_db: ${updates.length}`)

    for (const u of updates) {
      // Only overwrite if the destination is empty. Don't trample any
      // editor's manual cleanup.
      const result = await pool.query(
        `SELECT id, kicker, subdeck FROM articles WHERE legacy_source='polytechnic-online' AND legacy_article_id=$1`,
        [String(u.id)]
      )
      if (result.rowCount === 0) continue
      const row = result.rows[0]
      const setKicker = u.kicker && !row.kicker
      const setSubdeck = u.subdeck && !row.subdeck
      if (!setKicker && !setSubdeck) continue
      if (mode.write) {
        await pool.query(
          `UPDATE articles SET kicker=COALESCE($1, kicker), subdeck=COALESCE($2, subdeck), updated_at=NOW() WHERE id=$3`,
          [setKicker ? u.kicker : null, setSubdeck ? u.subdeck : null, row.id]
        )
      }
      if (setKicker) kickerUpdates++
      if (setSubdeck) subdeckUpdates++
    }

    console.log(`poly-online: kicker updates=${kickerUpdates} subdeck updates=${subdeckUpdates}`)
  }

  // ---- wordpress ----
  if (mode.era === 'all' || mode.era === 'wordpress') {
    console.log('\n=== wordpress ===')
    // Use sqlite CLI to pull Kicker and Subdeck postmeta into TSV.
    // Avoids adding a dependency on better-sqlite3 just for this script.
    const tsv = execFileSync(
      'sqlite3',
      [
        '-separator',
        '\t',
        WP_SQLITE,
        "SELECT post_id, meta_key, meta_value FROM postmeta WHERE meta_key IN ('Kicker','Subdeck') AND meta_value IS NOT NULL AND meta_value != ''",
      ],
      { maxBuffer: 64 * 1024 * 1024 }
    ).toString()

    type Postmeta = { kicker?: string; subdeck?: string }
    const byWpId = new Map<number, Postmeta>()
    for (const line of tsv.split('\n')) {
      if (!line) continue
      const [pidStr, key, value] = line.split('\t')
      const pid = Number(pidStr)
      if (!pid) continue
      const cur = byWpId.get(pid) ?? {}
      // Decode entities (Kicker postmeta can carry &#8217; from the WP editor).
      const v = decodeEntities(value).trim()
      if (!v) continue
      if (key === 'Kicker') cur.kicker = v
      else if (key === 'Subdeck') cur.subdeck = v
      byWpId.set(pid, cur)
    }
    console.log(`WP postmeta rows: ${byWpId.size} wp_ids with Kicker or Subdeck`)

    let kickerOverwrites = 0
    let kickerFills = 0
    let subdeckFills = 0

    for (const [wpId, meta] of byWpId) {
      const result = await pool.query(
        `SELECT id, kicker, subdeck FROM articles WHERE legacy_source='wordpress' AND legacy_article_id=$1`,
        [String(wpId)]
      )
      if (result.rowCount === 0) continue
      const row = result.rows[0]

      let newKicker: string | null = null
      if (meta.kicker) {
        if (!row.kicker) {
          newKicker = meta.kicker
          kickerFills++
        } else if (isGenericKicker(row.kicker) && meta.kicker.toLowerCase() !== row.kicker.toLowerCase()) {
          newKicker = meta.kicker
          kickerOverwrites++
        }
      }

      let newSubdeck: string | null = null
      if (meta.subdeck && !row.subdeck) {
        newSubdeck = meta.subdeck
        subdeckFills++
      }

      if (!newKicker && !newSubdeck) continue
      if (mode.write) {
        await pool.query(
          `UPDATE articles SET kicker=COALESCE($1, kicker), subdeck=COALESCE($2, subdeck), updated_at=NOW() WHERE id=$3`,
          [newKicker, newSubdeck, row.id]
        )
      }
    }

    console.log(
      `wordpress: kicker fills=${kickerFills} kicker overwrites=${kickerOverwrites} subdeck fills=${subdeckFills}`
    )
    kickerUpdates += kickerFills + kickerOverwrites
    subdeckUpdates += subdeckFills
  }

  console.log(`\nTotal: kicker=${kickerUpdates} subdeck=${subdeckUpdates} (${mode.write ? 'WRITTEN' : 'DRY RUN'})`)
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
