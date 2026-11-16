/**
 * LOCAL DEV ONLY. Fills past Executive Board terms with placeholder articles
 * so the shelf's book sizes (by article count, full size at 30) can be
 * checked. Never run against production.
 *
 * Every article's slug starts with `fake-eboard-size-`. Re-running adds only
 * what's missing; `--remove` deletes them all.
 *
 * Usage:
 *   pnpm exec tsx --env-file=.env scripts/seed-eboard-sizes.ts
 *   pnpm exec tsx --env-file=.env scripts/seed-eboard-sizes.ts --remove
 */
import { getPayload } from 'payload'
import config from '../payload.config'

const PREFIX = 'fake-eboard-size-'

/**
 * Term start year (GM Week, spring) → articles to give it. Every past
 * Executive Board on the shelf, sizes spread from 1 to past the cap of 30.
 */
const COUNTS: Record<number, number> = {
  2025: 30, // full size
  2024: 22,
  2023: 15, // two PUs (Gallagher, then Philipps)
  2022: 8,
  2021: 3,
  2020: 5,
  2019: 26,
  2018: 40, // over the cap: should look the same as 2025
  2017: 18,
  2016: 12,
  2015: 34, // over the cap
  2014: 10,
  2013: 20,
  2012: 1, // nearly the smallest
}

const richTextDoc = (paragraphs: string[]) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: paragraphs.map((text) => ({
      type: 'paragraph',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [{ type: 'text', format: 0, mode: 'normal', style: '', text, version: 1 }],
    })),
  },
})

async function main() {
  const payload = await getPayload({ config })

  if (process.argv.includes('--remove')) {
    const res = await payload.delete({
      collection: 'articles',
      where: { slug: { like: PREFIX } },
      context: { legacyImport: true },
    })
    console.log(`removed ${res.docs.length} placeholder Executive Board articles`)
    process.exit(0)
  }

  const users = await payload.find({
    collection: 'users',
    where: { email: { equals: 'news@dev.local' } },
    limit: 1,
    depth: 0,
  })
  const authorId =
    (users.docs[0]?.id as number | undefined) ??
    ((await payload.find({ collection: 'users', limit: 1, depth: 0 })).docs[0]?.id as number | undefined)
  if (!authorId) throw new Error('No users found. Run `pnpm db:seed` first.')

  let created = 0
  for (const [yearText, count] of Object.entries(COUNTS)) {
    const startYear = Number(yearText)
    const label = `${startYear}–${String(startYear + 1).slice(2)}`
    // Spread over the school year: September 1 to mid-March
    const from = Date.UTC(startYear, 8, 1, 16)
    const to = Date.UTC(startYear + 1, 2, 15, 16)
    for (let k = 1; k <= count; k++) {
      const slug = `${PREFIX}${startYear}-${k}`
      const existing = await payload.find({ collection: 'articles', where: { slug: { equals: slug } }, limit: 1, depth: 0 })
      if (existing.docs.length) continue
      const when = new Date(from + ((to - from) * (k - 0.5)) / count)
      await payload.create({
        collection: 'articles',
        // Keeps the backdated publishedDate; no PostHog events or pushes
        context: { legacyImport: true },
        data: {
          section: 'news',
          // @ts-expect-error richText jsonb accepted directly by local API
          title: richTextDoc([`Placeholder: ${label} Executive Board story ${k} of ${count}`]),
          slug,
          kicker: 'Executive Board',
          subdeck: 'Placeholder article for testing the shelf’s book sizes.',
          authors: [authorId],
          // @ts-expect-error richText jsonb accepted directly by local API
          content: richTextDoc(['Placeholder article for testing the shelf’s book sizes. Remove with --remove.']),
          publishedDate: when.toISOString(),
          _status: 'published',
        },
      })
      created++
    }
    console.log(`${label} Executive Board: ${count} placeholder articles`)
  }

  // Counts lowered since an earlier run: remove the placeholders now past them
  const all = await payload.find({
    collection: 'articles',
    where: { slug: { like: PREFIX } },
    limit: 2000,
    depth: 0,
    select: { slug: true },
  })
  const extra = all.docs.filter((d) => {
    const m = /^fake-eboard-size-(\d+)-(\d+)$/.exec(d.slug ?? '')
    return m !== null && Number(m[2]) > (COUNTS[Number(m[1])] ?? 0)
  })
  for (const d of extra) {
    await payload.delete({ collection: 'articles', id: d.id, context: { legacyImport: true } })
  }
  console.log(`created ${created}, removed ${extra.length} no longer wanted`)
  process.exit(0)
}

main().catch((err) => {
  console.error('seed failed:', err)
  process.exit(1)
})
