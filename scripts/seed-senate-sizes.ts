/**
 * LOCAL DEV ONLY. Fills past Senate terms with placeholder articles so the
 * shelf's book sizes (by article count, full size at 30) can be checked.
 * Never run against production.
 *
 * Every article's slug starts with `fake-senate-size-`. Re-running adds only
 * what's missing; `--remove` deletes them all.
 *
 * Usage:
 *   pnpm exec tsx --env-file=.env scripts/seed-senate-sizes.ts
 *   pnpm exec tsx --env-file=.env scripts/seed-senate-sizes.ts --remove
 */
import { getPayload } from 'payload'
import config from '../payload.config'

const PREFIX = 'fake-senate-size-'

/**
 * Senate number → articles to give it (terms start in April of 1969 + number).
 * Every past Senate on the shelf, sizes spread from 1 to past the cap of 30.
 */
const COUNTS: Record<number, number> = {
  56: 30, // full size
  55: 22,
  54: 15,
  53: 8,
  52: 3,
  51: 5,
  50: 26,
  49: 40, // over the cap: should look the same as the 56th
  48: 18,
  47: 12,
  46: 34, // over the cap
  45: 10,
  44: 20,
  43: 1, // nearly the smallest
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

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

async function main() {
  const payload = await getPayload({ config })

  if (process.argv.includes('--remove')) {
    const res = await payload.delete({
      collection: 'articles',
      where: { slug: { like: PREFIX } },
      context: { legacyImport: true },
    })
    console.log(`removed ${res.docs.length} placeholder Senate articles`)
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
  for (const [numberText, count] of Object.entries(COUNTS)) {
    const number = Number(numberText)
    const startYear = 1969 + number
    // Spread over the school year: September 1 to mid-March
    const from = Date.UTC(startYear, 8, 1, 16)
    const to = Date.UTC(startYear + 1, 2, 15, 16)
    for (let k = 1; k <= count; k++) {
      const slug = `${PREFIX}${number}-${k}`
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
          title: richTextDoc([`Placeholder: ${ordinal(number)} Senate story ${k} of ${count}`]),
          slug,
          kicker: 'Student Senate',
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
    console.log(`${ordinal(number)} Senate: ${count} placeholder articles`)
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
    const m = /^fake-senate-size-(\d+)-(\d+)$/.exec(d.slug ?? '')
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
