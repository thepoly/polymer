/**
 * Rebuild rich-text titles for the 165 WP posts whose source `post_title`
 * carried inline `<i>`/`<em>`/`<b>`/`<strong>` markup the original importer
 * dropped. The plain_title field is fine (the importer already strips tags
 * for display); only the Lexical title doc is wrong.
 *
 * Approach: tokenize the source title (very small subset — just the four
 * format tags + plain text), emit alternating text nodes with `format` bit
 * flags, wrap in a paragraph + root.
 *
 * Run with `pnpm tsx scripts/legacy-import/restore-wp-italic-titles.ts [--write]`.
 */

import { Pool } from 'pg'
import { execFileSync } from 'child_process'
import { decodeEntities } from './wordpress/html-tokenizer'

const WP_SQLITE = '/tmp/audit/wp.db'
const FMT_BOLD = 1
const FMT_ITALIC = 2

function parseArgs() {
  return { write: process.argv.slice(2).includes('--write') }
}

type Run = { text: string; format: number }

// Very small tokenizer covering the cases we see in real titles. Self-closing
// tags shouldn't appear here. The tag set is fixed; anything else is dropped.
function parseTitleRuns(html: string): Run[] {
  const runs: Run[] = []
  let format = 0
  let i = 0
  let buf = ''

  const FMT_TAGS: Record<string, number> = { i: FMT_ITALIC, em: FMT_ITALIC, b: FMT_BOLD, strong: FMT_BOLD }
  const flush = () => {
    if (buf) {
      runs.push({ text: buf, format })
      buf = ''
    }
  }

  while (i < html.length) {
    const open = html.indexOf('<', i)
    if (open === -1) {
      buf += html.slice(i)
      break
    }
    buf += html.slice(i, open)
    const close = html.indexOf('>', open + 1)
    if (close === -1) {
      // Unterminated — treat as literal text.
      buf += html.slice(open)
      break
    }
    const inner = html.slice(open + 1, close).trim()
    const isClosing = inner.startsWith('/')
    const tagName = (isClosing ? inner.slice(1) : inner).split(/\s/)[0].toLowerCase()
    const fmt = FMT_TAGS[tagName]
    if (fmt !== undefined) {
      flush()
      format = isClosing ? format & ~fmt : format | fmt
    }
    // Drop any other tags silently.
    i = close + 1
  }
  flush()
  return runs.filter((r) => r.text.length > 0).map((r) => ({ ...r, text: decodeEntities(r.text) }))
}

function buildTitleDoc(runs: Run[]): unknown {
  // Drop any leading/trailing whitespace runs that decoding+tag-stripping can
  // produce, then collapse internal double-spaces (the WP source frequently
  // had `<i>X</i> ` with a trailing space that's now adjacent to an italic-
  // boundary).
  const collapsed: Run[] = []
  for (const r of runs) {
    const text = r.text.replace(/\s+/g, ' ')
    if (!text) continue
    collapsed.push({ text, format: r.format })
  }
  // Strip leading whitespace on the very first run + trailing on the last.
  if (collapsed.length > 0) {
    collapsed[0].text = collapsed[0].text.replace(/^\s+/, '')
    collapsed[collapsed.length - 1].text = collapsed[collapsed.length - 1].text.replace(/\s+$/, '')
  }
  const children = collapsed
    .filter((r) => r.text.length > 0)
    .map((r) => ({
      type: 'text',
      version: 1,
      format: r.format,
      detail: 0,
      mode: 'normal',
      style: '',
      text: r.text,
    }))

  return {
    root: {
      type: 'root',
      version: 1,
      format: '',
      indent: 0,
      direction: 'ltr',
      children: [
        {
          type: 'paragraph',
          version: 1,
          format: '',
          indent: 0,
          direction: 'ltr',
          textFormat: 0,
          children,
        },
      ],
    },
  }
}

async function main() {
  const { write } = parseArgs()
  console.log(`Mode: write=${write}`)

  // Pull every published WP post whose title carries any of the four format
  // tags. Using JSON mode avoids tab/newline edge cases.
  const json = execFileSync(
    'sqlite3',
    [
      '-json',
      WP_SQLITE,
      `SELECT ID AS id, post_title FROM posts
       WHERE post_status='publish' AND post_type='post'
         AND (post_title LIKE '%<i>%' OR post_title LIKE '%</i>%'
              OR post_title LIKE '%<em>%' OR post_title LIKE '%</em>%'
              OR post_title LIKE '%<b>%' OR post_title LIKE '%</b>%'
              OR post_title LIKE '%<strong>%' OR post_title LIKE '%</strong>%')`,
    ],
    { maxBuffer: 64 * 1024 * 1024 },
  ).toString()
  const wpRows = JSON.parse(json) as { id: number; post_title: string }[]
  console.log(`Source rows with tagged titles: ${wpRows.length}`)

  const pool = new Pool({
    host: '127.0.0.1',
    port: 5433,
    user: 'poly',
    password: 'poly',
    database: 'polymer2',
  })

  let updated = 0
  let articleNotFound = 0
  let noFormat = 0

  for (const w of wpRows) {
    const runs = parseTitleRuns(w.post_title)
    if (runs.every((r) => r.format === 0)) {
      noFormat++
      continue
    }
    const doc = buildTitleDoc(runs)

    const r = await pool.query<{ id: number }>(
      `SELECT id FROM articles WHERE legacy_source='wordpress' AND legacy_article_id=$1`,
      [String(w.id)],
    )
    if (r.rowCount === 0) {
      articleNotFound++
      continue
    }
    const articleId = r.rows[0].id

    if (write) {
      await pool.query(`UPDATE articles SET title=$1::jsonb, updated_at=NOW() WHERE id=$2`, [
        JSON.stringify(doc),
        articleId,
      ])
    }
    updated++
  }

  console.log(`\nResults:`)
  console.log(`  titles updated     : ${updated}`)
  console.log(`  no formatting     : ${noFormat}`)
  console.log(`  article not found : ${articleNotFound}`)
  console.log(`  Mode: ${write ? 'WRITTEN' : 'DRY RUN'}`)
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
