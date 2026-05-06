/**
 * WordPress data loader.
 *
 * Pulls the metadata we need from the gzipped MariaDB dump:
 * - users (id -> display_name)
 * - terms / term_taxonomy / term_relationships (post_id -> [category names])
 * - posts (id -> {content, excerpt, ...}) — only the rows referenced in the
 *   manifest are kept in memory.
 *
 * The full posts table is large (post_content is the bulk), so we avoid
 * loading the entire dump into memory: the manifest pre-selects the wp_ids
 * we care about, we stream the dump, and we keep only matching rows.
 */
import { streamTableRows, SqlValue } from './sql-parser.ts'

export type WpUser = {
  id: number
  login: string
  displayName: string
}

export type WpTerm = {
  termId: number
  name: string
  slug: string
  taxonomy: string
}

export type WpPost = {
  id: number
  authorId: number
  postDateGmt: string // mysql datetime, treat as UTC
  postContent: string
  postTitle: string
  postExcerpt: string
  postStatus: string
  postName: string
  postModifiedGmt: string
  postType: string
  guid: string
}

/** Final per-post bundle exposed to the importer. */
export type WpPostRow = WpPost & {
  authorDisplayName: string | null
  categoryNames: string[] // may be empty; verbatim term names where taxonomy='category'
  tagNames: string[]
}

const asString = (v: SqlValue): string => (v == null ? '' : String(v))
const asNumber = (v: SqlValue): number => {
  if (v == null) return 0
  if (typeof v === 'number') return v
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export async function loadUsers(dumpPath: string): Promise<Map<number, WpUser>> {
  const out = new Map<number, WpUser>()
  for await (const row of streamTableRows(dumpPath, 'users')) {
    // schema: ID, user_login, user_pass, user_nicename, user_email, user_url,
    // user_registered, user_activation_key, user_status, display_name
    const id = asNumber(row[0])
    out.set(id, {
      id,
      login: asString(row[1]),
      displayName: asString(row[9]),
    })
  }
  return out
}

/**
 * Load terms keyed by term_taxonomy_id, including taxonomy and name.
 *
 * Joins terms + term_taxonomy in one pass.
 */
export async function loadTerms(dumpPath: string): Promise<Map<number, WpTerm>> {
  // First pass: terms (term_id -> name/slug)
  const termsByTermId = new Map<number, { name: string; slug: string }>()
  for await (const row of streamTableRows(dumpPath, 'terms')) {
    // schema: term_id, name, slug, term_group
    termsByTermId.set(asNumber(row[0]), {
      name: asString(row[1]),
      slug: asString(row[2]),
    })
  }
  // Second pass: term_taxonomy (term_taxonomy_id -> term_id, taxonomy)
  const out = new Map<number, WpTerm>()
  for await (const row of streamTableRows(dumpPath, 'term_taxonomy')) {
    // schema: term_taxonomy_id, term_id, taxonomy, description, parent, count
    const ttId = asNumber(row[0])
    const termId = asNumber(row[1])
    const taxonomy = asString(row[2])
    const term = termsByTermId.get(termId)
    if (!term) continue
    out.set(ttId, {
      termId,
      name: term.name,
      slug: term.slug,
      taxonomy,
    })
  }
  return out
}

/**
 * For each object_id (post_id), return the list of term_taxonomy_ids attached.
 */
export async function loadTermRelationships(
  dumpPath: string,
): Promise<Map<number, number[]>> {
  const out = new Map<number, number[]>()
  for await (const row of streamTableRows(dumpPath, 'term_relationships')) {
    // schema: object_id, term_taxonomy_id, term_order
    const objectId = asNumber(row[0])
    const ttId = asNumber(row[1])
    let arr = out.get(objectId)
    if (!arr) {
      arr = []
      out.set(objectId, arr)
    }
    arr.push(ttId)
  }
  return out
}

/**
 * Stream posts and yield only the rows matching `wantedIds`.
 *
 * Returns the matching subset as a Map. The dump has ~15K post rows including
 * autosaves and revisions, but we restrict to ids the manifest picked out
 * (typically 4,122 entries), so the kept set is bounded.
 */
export async function loadSelectedPosts(
  dumpPath: string,
  wantedIds: Set<number>,
): Promise<Map<number, WpPost>> {
  const out = new Map<number, WpPost>()
  if (wantedIds.size === 0) return out
  for await (const row of streamTableRows(dumpPath, 'posts')) {
    // schema (24 cols):
    // 0:ID, 1:post_author, 2:post_date, 3:post_date_gmt, 4:post_content,
    // 5:post_title, 6:post_excerpt, 7:post_status, 8:comment_status,
    // 9:ping_status, 10:post_password, 11:post_name, 12:to_ping, 13:pinged,
    // 14:post_modified, 15:post_modified_gmt, 16:post_content_filtered,
    // 17:post_parent, 18:guid, 19:menu_order, 20:post_type,
    // 21:post_mime_type, 22:comment_count
    const id = asNumber(row[0])
    if (!wantedIds.has(id)) continue
    out.set(id, {
      id,
      authorId: asNumber(row[1]),
      postDateGmt: asString(row[3]),
      postContent: asString(row[4]),
      postTitle: asString(row[5]),
      postExcerpt: asString(row[6]),
      postStatus: asString(row[7]),
      postName: asString(row[11]),
      postModifiedGmt: asString(row[15]),
      postType: asString(row[20]),
      guid: asString(row[18]),
    })
    if (out.size === wantedIds.size) break
  }
  return out
}

/**
 * Load every WP-side artifact we need in one go and return a per-post bundle
 * builder.
 */
export type WpDataset = {
  users: Map<number, WpUser>
  terms: Map<number, WpTerm>
  relationships: Map<number, number[]>
  posts: Map<number, WpPost>
  buildRow: (postId: number) => WpPostRow | null
}

export async function loadWpDataset(
  dumpPath: string,
  wantedPostIds: Set<number>,
): Promise<WpDataset> {
  const [users, terms, relationships, posts] = await Promise.all([
    loadUsers(dumpPath),
    loadTerms(dumpPath),
    loadTermRelationships(dumpPath),
    loadSelectedPosts(dumpPath, wantedPostIds),
  ])

  function buildRow(postId: number): WpPostRow | null {
    const p = posts.get(postId)
    if (!p) return null
    const ttIds = relationships.get(postId) ?? []
    const categoryNames: string[] = []
    const tagNames: string[] = []
    for (const ttId of ttIds) {
      const t = terms.get(ttId)
      if (!t) continue
      if (t.taxonomy === 'category') categoryNames.push(t.name)
      else if (t.taxonomy === 'post_tag') tagNames.push(t.name)
    }
    const author = users.get(p.authorId) ?? null
    return {
      ...p,
      authorDisplayName: author?.displayName || null,
      categoryNames,
      tagNames,
    }
  }

  return { users, terms, relationships, posts, buildRow }
}
