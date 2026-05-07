/**
 * One-off fixup for two WP rows the importer mis-routed: 7191 (Tate Boucher
 * letter on neuromarketing) and 7421 (no content at all). Both ended up
 * pointing at a day-archive listing path instead of a real post URL.
 *
 * - 7191: re-import using SQL `post_content` and `Kicker` postmeta. Title is
 *         empty in the source so we synthesize a sensible plainTitle. Slug
 *         regenerated from that title with the standard YYYY-MM-DD prefix.
 *         Section forced to `opinion` because Kicker says "letter to the
 *         editor".
 * - 7421: source post_content is 0 chars and post_title is empty. Demote to
 *         draft and clear the bogus "CAMPUS EVENT" title so it stops showing
 *         on the archive listing.
 *
 * Run with `pnpm tsx scripts/legacy-import/fix-wp-7191-7421.ts [--write]`.
 */

import { Pool } from 'pg'
import { execFileSync } from 'child_process'
import { convertHtmlToLexical } from './wordpress/html-to-lexical'

const WP_SQLITE = '/tmp/audit/wp.db'

function parseArgs() {
  return { write: process.argv.slice(2).includes('--write') }
}

function plainTextTitleDoc(text: string) {
  return {
    root: {
      type: 'root',
      version: 1,
      direction: null,
      format: '',
      indent: 0,
      children: [
        {
          type: 'paragraph',
          version: 1,
          direction: null,
          format: '',
          indent: 0,
          textFormat: 0,
          children: [
            {
              type: 'text',
              version: 1,
              format: 0,
              detail: 0,
              mode: 'normal',
              style: '',
              text,
            },
          ],
        },
      ],
    },
  }
}

async function main() {
  const { write } = parseArgs()
  console.log(`Mode: write=${write}`)

  // Read source post_content for both rows. Use sqlite3 JSON mode to dodge
  // newline-in-column issues that break TSV parsing of multi-paragraph posts.
  const json = execFileSync(
    'sqlite3',
    ['-json', WP_SQLITE, 'SELECT id, post_title, post_content, post_date FROM posts WHERE id IN (7191, 7421)'],
    { maxBuffer: 8 * 1024 * 1024 },
  ).toString()
  // sqlite preserves original column-name casing (`ID`, not `id`). Use the
  // exact key returned by the dump.
  const rows = JSON.parse(json) as {
    ID: number
    post_title: string | null
    post_content: string | null
    post_date: string | null
  }[]

  const wpRows = new Map<number, { title: string; content: string; date: string }>()
  for (const r of rows) {
    wpRows.set(r.ID, {
      title: r.post_title ?? '',
      content: r.post_content ?? '',
      date: r.post_date ?? '',
    })
  }
  console.log(`source rows: ${[...wpRows.keys()].join(', ')}`)

  const pool = new Pool({
    host: '127.0.0.1',
    port: 5433,
    user: 'poly',
    password: 'poly',
    database: 'polymer2',
  })

  // ---- 7191 ----
  const w7191 = wpRows.get(7191)
  if (w7191) {
    const lexical = convertHtmlToLexical(w7191.content, {
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

    // Title: synthesize since source is empty. The opening sentence is
    // "People argue that using neuroscience in the field of marketing is
    // immoral" — fold to a Letter-to-the-Editor-shaped title.
    const plainTitle = 'In defense of neuromarketing'
    const titleDoc = plainTextTitleDoc(plainTitle)
    const slug = '2015-05-13-in-defense-of-neuromarketing'
    const legacyHtmlUrl = '/archive/wordpress/mirror/2015/05/13/in_defense_of_neuromarketing/'

    // Build plain content text from the lexical doc for search.
    const plainContent = w7191.content
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;|&#\d+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    const before = await pool.query(
      `SELECT id, slug, plain_title FROM articles WHERE legacy_source='wordpress' AND legacy_article_id='7191'`,
    )
    if (before.rowCount === 0) {
      console.warn('  7191 not found in polymer')
    } else {
      const row = before.rows[0] as { id: number; slug: string; plain_title: string }
      console.log(`  7191 polymer id=${row.id} old slug=${row.slug} old title="${row.plain_title}"`)
      if (write) {
        await pool.query(
          `UPDATE articles
           SET title=$1::jsonb,
               plain_title=$2,
               content=$3::jsonb,
               plain_content=$4,
               kicker='Letter to the Editor',
               opinion_type='letter-to-the-editor',
               section='opinion',
               previous_slug=COALESCE(previous_slug, slug),
               slug=$5,
               legacy_html_url=$6,
               updated_at=NOW()
           WHERE id=$7`,
          [
            JSON.stringify(titleDoc),
            plainTitle,
            JSON.stringify(lexical),
            plainContent,
            slug,
            legacyHtmlUrl,
            row.id,
          ],
        )
        // Clear stale write-in authors for this post and add Tate Boucher.
        await pool.query(`DELETE FROM articles_write_in_authors WHERE _parent_id=$1`, [row.id])
        // `id` is a string varchar (Payload's array-row id), not a numeric
        // sequence, so we generate one ourselves.
        await pool.query(
          `INSERT INTO articles_write_in_authors (_parent_id, _order, id, name) VALUES ($1, 1, gen_random_uuid()::text, $2)`,
          [row.id, 'Tate Boucher'],
        )
      }
    }
  }

  // ---- 7421 ----
  const w7421 = wpRows.get(7421)
  if (w7421) {
    if (!w7421.content || w7421.content.length === 0) {
      const before = await pool.query(
        `SELECT id, slug, plain_title FROM articles WHERE legacy_source='wordpress' AND legacy_article_id='7421'`,
      )
      if (before.rowCount === 0) {
        console.warn('  7421 not found in polymer')
      } else {
        const row = before.rows[0] as { id: number; slug: string; plain_title: string }
        console.log(`  7421 polymer id=${row.id} old slug=${row.slug} old title="${row.plain_title}"`)
        if (write) {
          await pool.query(
            `UPDATE articles
             SET _status='draft',
                 plain_title='(no source content — was wp_id 7421)',
                 title=$1::jsonb,
                 updated_at=NOW()
             WHERE id=$2`,
            [JSON.stringify(plainTextTitleDoc('(no source content — was wp_id 7421)')), row.id],
          )
        }
      }
    }
  }

  console.log(`\nMode: ${write ? 'WRITTEN' : 'DRY RUN'}`)
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
