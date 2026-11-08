/**
 * Copy the live poly.rpi.edu homepage into the local dev DB: every article in
 * the live homepage layout plus the 20 most recent published stories per
 * section (what the homepage auto-fills from), with their authors and images,
 * then rebuild the local layout to match.
 *
 * Authors aren't readable through the public API, so they're recreated from
 * each article page's JSON-LD byline as dev users (password: devpassword).
 * Re-running is idempotent (articles by slug, users by slug, media by filename).
 *
 * Usage: pnpm exec tsx --env-file=.env scripts/import-live-homepage.ts [--swap 15406,15404]
 *   --swap a,b   swap the homepage positions of two live article ids
 */
import { getPayload } from 'payload'
import config from '../payload.config'

const LIVE = 'https://poly.rpi.edu'
const SECTIONS = ['news', 'features', 'sports', 'opinion'] as const
const DEV_PASSWORD = 'devpassword'

type Json = Record<string, unknown>
type LiveArticle = Json & { id: number; slug: string; section: string; publishedDate?: string }

const getJson = async <T = Json>(path: string): Promise<T> => {
  const res = await fetch(`${LIVE}${path}`)
  if (!res.ok) throw new Error(`${res.status} ${path}`)
  return (await res.json()) as T
}

async function main() {
  const swapArg = process.argv.indexOf('--swap')
  const swap = swapArg > -1 ? process.argv[swapArg + 1].split(',').map(Number) : null

  const payload = await getPayload({ config })
  const req = { context: { legacyImport: true } } as Parameters<typeof payload.create>[0]['req']

  // ===== Which articles =====
  const layoutRes = await getJson<{ docs: Json[] }>('/api/layout?limit=1&depth=0&sort=-updatedAt')
  const liveLayout = layoutRes.docs[0]
  const grid = (liveLayout.grid ?? {}) as Json
  const ids = new Set<number>()
  const collect = (v: unknown) => {
    if (typeof v === 'number') ids.add(v)
    else if (Array.isArray(v)) v.forEach(collect)
  }
  for (const k of ['lead', 'left', 'right', 'bottom']) collect(grid[k])
  for (const k of ['mainArticle', 'top1', 'top2', 'top3', 'top4', 'op1', 'op2', 'op3', 'op4', 'special'])
    collect(liveLayout[k])
  for (const sec of Object.values((liveLayout.sectionLayouts ?? {}) as Record<string, Json>))
    collect(sec.pinnedArticles)

  const articles = new Map<number, LiveArticle>()
  for (const section of SECTIONS) {
    const res = await getJson<{ docs: LiveArticle[] }>(
      `/api/articles?depth=0&limit=20&sort=-publishedDate&where[_status][equals]=published&where[section][equals]=${section}`,
    )
    for (const a of res.docs) articles.set(a.id, a)
  }
  for (const id of ids) if (!articles.has(id)) articles.set(id, await getJson<LiveArticle>(`/api/articles/${id}?depth=0`))
  console.log(`live articles to import: ${articles.size}`)

  // ===== Media =====
  const mediaMap = new Map<number, number>()
  const importMedia = async (liveId: unknown): Promise<number | null> => {
    if (typeof liveId !== 'number') return null
    if (mediaMap.has(liveId)) return mediaMap.get(liveId)!
    try {
      const m = await getJson<Json>(`/api/media/${liveId}?depth=0`)
      const filename = m.filename as string
      const existing = await payload.find({ collection: 'media', where: { filename: { equals: filename } }, limit: 1, depth: 0 })
      let localId: number
      if (existing.docs.length) {
        localId = existing.docs[0].id as number
      } else {
        // Original uploads can be 5000px+; the 1200px webp is plenty for local design work.
        const sizes = (m.sizes ?? {}) as Record<string, { url?: string; filename?: string; mimeType?: string }>
        const src = sizes.gallery?.url ? sizes.gallery : { url: m.url as string, mimeType: m.mimeType as string }
        const res = await fetch(`${LIVE}${src.url}`)
        if (!res.ok) throw new Error(`${res.status} ${src.url}`)
        const data = Buffer.from(await res.arrayBuffer())
        const created = await payload.create({
          collection: 'media',
          data: {
            alt: m.alt as string,
            title: m.title as string,
            ...(m.writeInPhotographer ? { writeInPhotographer: m.writeInPhotographer as string } : {}),
            focalX: m.focalX as number,
            focalY: m.focalY as number,
          },
          file: { data, mimetype: src.mimeType ?? 'image/webp', name: filename, size: data.length },
        })
        localId = created.id as number
        console.log(`  media: ${filename}`)
      }
      mediaMap.set(liveId, localId)
      return localId
    } catch (err) {
      console.warn(`  media ${liveId} skipped: ${(err as Error).message}`)
      return null
    }
  }

  // Rewrite upload nodes in Lexical content to local media ids.
  const remapContent = async (node: unknown): Promise<unknown> => {
    if (Array.isArray(node)) return Promise.all(node.map(remapContent))
    if (!node || typeof node !== 'object') return node
    const out: Json = {}
    for (const [k, v] of Object.entries(node as Json)) out[k] = await remapContent(v)
    if (out.type === 'upload' && out.relationTo === 'media') {
      const local = await importMedia(out.value)
      if (local == null) return { type: 'paragraph', version: 1, format: '', indent: 0, direction: null, children: [] }
      out.value = local
    }
    return out
  }

  // ===== Users (from article JSON-LD bylines) =====
  const userMap = new Map<string, number>()
  const ensureUser = async (name: string, slug: string): Promise<number> => {
    if (userMap.has(slug)) return userMap.get(slug)!
    const existing = await payload.find({ collection: 'users', where: { slug: { equals: slug } }, limit: 1, depth: 0 })
    let id: number
    if (existing.docs.length) {
      id = existing.docs[0].id as number
    } else {
      const [firstName, ...rest] = name.split(' ')
      const created = await payload.create({
        collection: 'users',
        data: {
          email: `${slug}@live-import.local`,
          password: DEV_PASSWORD,
          firstName,
          lastName: rest.join(' ') || '-',
          slug,
          roles: ['writer'],
        },
      })
      id = created.id as number
      console.log(`  user: ${name}`)
    }
    userMap.set(slug, id)
    return id
  }
  const bylineFor = async (a: LiveArticle): Promise<number[]> => {
    const [y, m] = (a.publishedDate ?? '').split('-')
    const res = await fetch(`${LIVE}/${a.section}/${y}/${m}/${a.slug}`)
    if (!res.ok) return []
    const html = await res.text()
    for (const match of html.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)) {
      const ld = JSON.parse(match[1]) as Json
      if (ld['@type'] !== 'NewsArticle') continue
      const people = (Array.isArray(ld.author) ? ld.author : []) as { name: string; url?: string }[]
      const out: number[] = []
      for (const p of people) {
        const slug = p.url?.match(/^\/staff\/(.+)$/)?.[1]
        if (slug) out.push(await ensureUser(p.name, slug))
      }
      return out
    }
    return []
  }

  // ===== Articles =====
  const articleMap = new Map<number, number>()
  for (const a of articles.values()) {
    const data: Json = { ...a }
    for (const k of ['id', 'createdAt', 'updatedAt', 'lastModifiedBy', 'opponent', 'sport'])
      delete data[k]
    data.authors = await bylineFor(a)
    data.featuredImage = await importMedia(a.featuredImage)
    data.content = await remapContent(a.content)
    data.breakingNews = false
    data._status = 'published'

    const existing = await payload.find({
      collection: 'articles',
      where: { slug: { equals: a.slug }, section: { equals: a.section } },
      limit: 1,
      depth: 0,
      draft: true,
    })
    const doc = existing.docs.length
      ? await payload.update({ collection: 'articles', id: existing.docs[0].id, data: data as never, req, depth: 0 })
      : await payload.create({ collection: 'articles', data: data as never, req, depth: 0 })
    articleMap.set(a.id, doc.id as number)
    console.log(`article ${existing.docs.length ? 'updated' : 'created'}: [${a.section}] ${a.plainTitle}`)
  }

  // ===== Layout =====
  let swapIds = new Map<number, number>()
  if (swap) {
    const [x, y] = swap
    swapIds = new Map([[x, y], [y, x]])
  }
  const mapId = (v: unknown): number | null =>
    typeof v === 'number' ? (articleMap.get(swapIds.get(v) ?? v) ?? null) : null
  const mapList = (v: unknown) => (Array.isArray(v) ? v.map(mapId) : v)

  const layoutData: Json = {
    name: liveLayout.name,
    skeleton: liveLayout.skeleton,
    grid: { ...grid, lead: mapId(grid.lead), left: mapList(grid.left), right: mapList(grid.right), bottom: mapList(grid.bottom) },
    sectionLayouts: Object.fromEntries(
      Object.entries((liveLayout.sectionLayouts ?? {}) as Record<string, Json>).map(([k, v]) => [
        k,
        { ...v, pinnedArticles: (mapList(v.pinnedArticles) as unknown[] | undefined)?.filter((x) => x != null) ?? [] },
      ]),
    ),
    liveArticles: [],
    _status: 'published',
  }
  for (const k of ['mainArticle', 'top1', 'top2', 'top3', 'top4', 'op1', 'op2', 'op3', 'op4', 'special'])
    layoutData[k] = mapId(liveLayout[k])

  const localLayout = await payload.find({ collection: 'layout', limit: 1, depth: 0, sort: '-updatedAt', draft: true })
  if (localLayout.docs.length) {
    await payload.update({ collection: 'layout', id: localLayout.docs[0].id, data: layoutData as never, depth: 0 })
  } else {
    await payload.create({ collection: 'layout', data: layoutData as never, depth: 0 })
  }
  console.log(`layout updated${swap ? ` (swapped live ${swap.join(' <-> ')})` : ''}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('import failed:', err)
  process.exit(1)
})
