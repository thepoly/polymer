#!/usr/bin/env node
/**
 * Compare polymer rows against mirror HTML for a sampled list.
 *
 * Reads a JSON array of articles (produced by psql) from argv[2], and
 * a JSON array of write-in authors from argv[3], plus a sample-id list
 * file (legacy_article_ids, comma-separated) we already have from the
 * sample. Writes a structured report to argv[4].
 */
import fs from 'node:fs'
import path from 'node:path'
import { Client } from 'pg'

const SAMPLE_PATH = process.argv[2]
const REPORT_PATH = process.argv[3]
const MIRROR_ROOT = '/home/red/poly/recon/archives/wordpress'

const sample = JSON.parse(fs.readFileSync(SAMPLE_PATH, 'utf8'))

// ─── ENTITY DECODER (mirror of html-tokenizer.ts) ─────────────────────────
const ENTITY_MAP = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘',
  rdquo: '”', ldquo: '“', copy: '©', reg: '®', trade: '™',
  laquo: '«', raquo: '»', middot: '·', bull: '•',
  Auml: 'Ä', auml: 'ä', Ouml: 'Ö', ouml: 'ö', Uuml: 'Ü', uuml: 'ü',
  szlig: 'ß', eacute: 'é', Eacute: 'É', egrave: 'è', Egrave: 'È',
  ecirc: 'ê', Ecirc: 'Ê', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ',
}
function decodeEntities(s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (full, ent) => {
    if (ent[0] === '#') {
      let code
      if (ent[1] === 'x' || ent[1] === 'X') code = parseInt(ent.slice(2), 16)
      else code = parseInt(ent.slice(1), 10)
      if (Number.isFinite(code) && code >= 0 && code <= 0x10ffff) {
        try { return String.fromCodePoint(code) } catch { return full }
      }
      return full
    }
    return ENTITY_MAP[ent] ?? full
  })
}

function stripInlineTags(html) {
  const noTags = html.replace(/<[^>]*>/g, '')
  return decodeEntities(noTags).replace(/\s+/g, ' ').trim()
}

// ─── MIRROR EXTRACTORS ────────────────────────────────────────────────────
function readMirrorByUrl(legacyHtmlUrl) {
  // legacyHtmlUrl is like "/archive/wordpress/mirror/2017/11/08/foo/"
  // Strip "/archive/wordpress/" prefix and append "index.html".
  const stripped = legacyHtmlUrl.replace(/^\/archive\/wordpress\//, '')
  const abs = path.resolve(MIRROR_ROOT, stripped, 'index.html')
  try {
    return fs.readFileSync(abs, 'utf8')
  } catch {
    // Try without trailing slash mode
    const noSlash = path.resolve(MIRROR_ROOT, stripped.replace(/\/$/, ''), 'index.html')
    try { return fs.readFileSync(noSlash, 'utf8') } catch { return null }
  }
}

function extractTitle(html) {
  // Try <h1 class="entry-title">...</h1> first
  let m = html.match(/<h1[^>]*class="[^"]*\bentry-title\b[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)
  if (m) return stripInlineTags(m[1]).replace(/\s+/g, ' ').trim()
  // h2 fallback
  m = html.match(/<h2[^>]*class="[^"]*\bentry-title\b[^"]*"[^>]*>([\s\S]*?)<\/h2>/i)
  if (m) return stripInlineTags(m[1]).replace(/\s+/g, ' ').trim()
  // <title> tag fallback — strip "X | The Polytechnic" suffix if present
  m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (m) {
    const t = stripInlineTags(m[1]).replace(/\s+\|\s+The Polytechnic\s*$/i, '').replace(/\s+/g, ' ').trim()
    return t
  }
  return null
}

function extractSubdeck(html) {
  const m = html.match(/<h3[^>]*class="[^"]*\bentry-subdeck\b[^"]*"[^>]*>([\s\S]*?)<\/h3>/i)
  if (!m) return null
  const t = stripInlineTags(m[1])
  return t || null
}

function sliceMatchingSpan(html, openIdx, openLen) {
  let depth = 1
  let i = openIdx + openLen
  const n = html.length
  while (i < n) {
    const lt = html.indexOf('<', i)
    if (lt === -1) return null
    if (html.startsWith('<!--', lt)) {
      const ce = html.indexOf('-->', lt + 4)
      i = ce === -1 ? n : ce + 3
      continue
    }
    if (/^<span\b/i.test(html.slice(lt, lt + 5))) { depth++; i = lt + 5; continue }
    if (/^<\/span>/i.test(html.slice(lt, lt + 7))) {
      depth--
      if (depth === 0) return html.slice(openIdx + openLen, lt)
      i = lt + 7; continue
    }
    i = lt + 1
  }
  return null
}

function extractRawByline(html) {
  const openRe = /<span\s+[^>]*class="(?:[^"]*\s)?author(?:\s[^"]*)?"[^>]*>/i
  const m = html.match(openRe)
  if (!m || m.index === undefined) return null
  const block = sliceMatchingSpan(html, m.index, m[0].length)
  if (!block) return null
  const nameRe = /<span\s+[^>]*class="(?:[^"]*\s)?name(?:\s[^"]*)?"[^>]*>([\s\S]*?)<\/span>/i
  const nm = block.match(nameRe)
  return {
    raw: stripInlineTags(block),
    nameRaw: nm ? stripInlineTags(nm[1]) : null,
  }
}

function sliceEntryContent(html) {
  const openRe = /<div\s+[^>]*class="[^"]*\bentry-content\b[^"]*"[^>]*>/i
  const om = html.match(openRe)
  if (!om || om.index === undefined) return null
  const start = om.index + om[0].length
  let depth = 1, i = start
  const n = html.length
  while (i < n) {
    const lt = html.indexOf('<', i)
    if (lt === -1) break
    if (html.startsWith('<!--', lt)) { const ce = html.indexOf('-->', lt + 4); i = ce === -1 ? n : ce + 3; continue }
    if (/^<div\b/i.test(html.slice(lt, lt + 4))) { depth++; i = lt + 4; continue }
    if (/^<\/div>/i.test(html.slice(lt, lt + 6))) {
      depth--
      if (depth === 0) return html.slice(start, lt)
      i = lt + 6; continue
    }
    i = lt + 1
  }
  return null
}

function bodyPlainText(entryContent) {
  if (!entryContent) return ''
  return stripInlineTags(entryContent).slice(0, 500)
}

// ─── PG: pull plain content + write-in authors ────────────────────────────
async function loadDbDetails(ids) {
  const client = new Client({ connectionString: 'postgres://poly:poly1885@127.0.0.1:5433/polymer2' })
  await client.connect()
  const articleIds = ids.map(s => s.id)
  // Plain content
  const plainQ = await client.query(
    'SELECT id, plain_content FROM articles WHERE id = ANY($1::int[])',
    [articleIds],
  )
  const plainMap = new Map()
  for (const r of plainQ.rows) plainMap.set(r.id, r.plain_content || '')
  // Write-in authors
  const authQ = await client.query(
    'SELECT _parent_id, name, _order FROM articles_write_in_authors WHERE _parent_id = ANY($1::int[]) ORDER BY _parent_id, _order',
    [articleIds],
  )
  const authMap = new Map()
  for (const r of authQ.rows) {
    if (!authMap.has(r._parent_id)) authMap.set(r._parent_id, [])
    authMap.get(r._parent_id).push(r.name)
  }
  await client.end()
  return { plainMap, authMap }
}

// ─── CHECK ────────────────────────────────────────────────────────────────
function normalize(s) {
  return (s || '').replace(/\s+/g, ' ').trim()
}

function classify(row, mirror, dbDetails) {
  const issues = []
  if (!mirror.html) {
    issues.push({ kind: 'mirror-file-missing', detail: row.legacy_html_url })
    return issues
  }
  // Title: compare polymer plainTitle vs mirror title.
  const mirrorTitle = normalize(mirror.title)
  const dbTitle = normalize(row.plain_title)
  if (dbTitle.includes('<') && dbTitle.includes('>')) {
    issues.push({ kind: 'plain-title-contains-html', detail: `wp_id=${row.legacy_article_id} title=${JSON.stringify(dbTitle).slice(0,120)}` })
  }
  if (mirrorTitle && dbTitle && !dbTitle.includes('<')) {
    // Normalize typographic quotes — WP's autoptypograph filter rewrites
    // straight quotes in the rendered mirror HTML, but the canonical source
    // (post_title) keeps straight quotes. We honor the source.
    const norm = (s) => s.replace(/[’‘]/g, "'").replace(/[”“]/g, '"').replace(/[—–]/g, '-')
    if (norm(mirrorTitle) !== norm(dbTitle)) {
      issues.push({ kind: 'plain-title-mismatch', detail: `wp_id=${row.legacy_article_id} mirror=${JSON.stringify(mirrorTitle).slice(0,120)} db=${JSON.stringify(dbTitle).slice(0,120)}` })
    }
  }
  if (/&(amp|lt|gt|quot|apos|nbsp|ndash|mdash|hellip|rsquo|lsquo|rdquo|ldquo|copy|reg|#x?[0-9a-fA-F]+);/.test(dbTitle)) {
    issues.push({ kind: 'plain-title-still-encoded', detail: `wp_id=${row.legacy_article_id} title=${JSON.stringify(dbTitle).slice(0,120)}` })
  }
  // Subdeck.
  const mirrorSub = mirror.subdeck ? normalize(mirror.subdeck) : null
  const dbSub = row.subdeck ? normalize(row.subdeck) : null
  if (mirrorSub && !dbSub) {
    issues.push({ kind: 'subdeck-missing-in-db', detail: `wp_id=${row.legacy_article_id} mirror=${JSON.stringify(mirrorSub).slice(0,120)}` })
  } else if (mirrorSub && dbSub && mirrorSub !== dbSub) {
    issues.push({ kind: 'subdeck-mismatch', detail: `wp_id=${row.legacy_article_id} mirror=${JSON.stringify(mirrorSub).slice(0,120)} db=${JSON.stringify(dbSub).slice(0,120)}` })
  } else if (!mirrorSub && dbSub) {
    issues.push({ kind: 'subdeck-extra-in-db', detail: `wp_id=${row.legacy_article_id} db=${JSON.stringify(dbSub).slice(0,120)} (no mirror subdeck)` })
  }
  if (dbSub && /&(amp|lt|gt|quot|apos|nbsp|ndash|mdash|hellip|rsquo|lsquo|rdquo|ldquo|#x?[0-9a-fA-F]+);/.test(dbSub)) {
    issues.push({ kind: 'subdeck-still-encoded', detail: `wp_id=${row.legacy_article_id} db=${JSON.stringify(dbSub).slice(0,120)}` })
  }
  // Byline.
  const dbAuthors = (dbDetails.authMap.get(row.id) || []).map(normalize)
  const mb = mirror.byline
  if (mb && mb.nameRaw) {
    // Generic byline?
    const lc = mb.nameRaw.toLowerCase()
    const isGeneric = ['the poly', 'the polytechnic', 'admin', 'wordpress'].includes(lc)
    if (!isGeneric) {
      // Check db has at least one author whose name appears in mb.nameRaw
      const overlap = dbAuthors.some(a => mb.nameRaw.toLowerCase().includes(a.toLowerCase()))
      if (!overlap) {
        issues.push({ kind: 'byline-mismatch', detail: `wp_id=${row.legacy_article_id} mirror=${JSON.stringify(mb.nameRaw).slice(0,160)} db=${JSON.stringify(dbAuthors).slice(0,160)}` })
      }
    }
  }
  // Generic placeholder ended up in db
  for (const a of dbAuthors) {
    const lc = a.toLowerCase()
    if (['the poly', 'the polytechnic', 'admin', 'wordpress'].includes(lc)) {
      issues.push({ kind: 'generic-byline-in-db', detail: `wp_id=${row.legacy_article_id} db_author=${JSON.stringify(a)} (mirror nameRaw=${JSON.stringify(mb && mb.nameRaw)})` })
    }
    if (/&(amp|lt|gt|quot|apos|nbsp|ndash|mdash|hellip|rsquo|lsquo|rdquo|ldquo|#x?[0-9a-fA-F]+);/.test(a)) {
      issues.push({ kind: 'byline-still-encoded', detail: `wp_id=${row.legacy_article_id} db_author=${JSON.stringify(a)}` })
    }
    if (a.length > 80) {
      issues.push({ kind: 'byline-too-long', detail: `wp_id=${row.legacy_article_id} db_author=${JSON.stringify(a)}` })
    }
  }
  // Body plain text: compare first ~400 chars after squishing whitespace +
  // alphanumerics-only to be robust against image-caption boundary spacing.
  const squish = s => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const mirrorBody = bodyPlainText(mirror.entryContent).slice(0, 400)
  const dbBody = normalize(dbDetails.plainMap.get(row.id) || '').slice(0, 400)
  if (mirrorBody && !dbBody) {
    issues.push({ kind: 'body-empty-in-db', detail: `wp_id=${row.legacy_article_id} mirror_first=${JSON.stringify(mirrorBody).slice(0,160)}` })
  } else if (mirrorBody && dbBody) {
    const ms = squish(mirrorBody)
    const ds = squish(dbBody)
    // Looser: if 60-char prefix of either appears in the other, it's a match.
    const prefix = ms.slice(0, 60)
    const dprefix = ds.slice(0, 60)
    if (prefix && dprefix && !ds.includes(prefix) && !ms.includes(dprefix)) {
      issues.push({ kind: 'body-content-divergent', detail: `wp_id=${row.legacy_article_id} mirror_first=${JSON.stringify(mirrorBody).slice(0,160)} db_first=${JSON.stringify(dbBody).slice(0,160)}` })
    }
  }
  return issues
}

;(async () => {
  const dbDetails = await loadDbDetails(sample)
  const allIssues = []
  for (const row of sample) {
    const html = readMirrorByUrl(row.legacy_html_url)
    if (!html) {
      allIssues.push({ kind: 'mirror-file-missing', detail: `wp_id=${row.legacy_article_id} url=${row.legacy_html_url}` })
      continue
    }
    const mirror = {
      html,
      title: extractTitle(html),
      subdeck: extractSubdeck(html),
      byline: extractRawByline(html),
      entryContent: sliceEntryContent(html),
    }
    const issues = classify(row, mirror, dbDetails)
    for (const iss of issues) allIssues.push(iss)
  }

  // Group by kind
  const byKind = new Map()
  for (const iss of allIssues) {
    if (!byKind.has(iss.kind)) byKind.set(iss.kind, [])
    byKind.get(iss.kind).push(iss.detail)
  }
  const lines = []
  lines.push(`# Round QA report — ${new Date().toISOString()}`)
  lines.push(`Sample size: ${sample.length}`)
  lines.push(`Total issues: ${allIssues.length}`)
  lines.push(`Distinct kinds: ${byKind.size}`)
  lines.push('')
  for (const [kind, dets] of [...byKind.entries()].sort((a,b) => b[1].length - a[1].length)) {
    lines.push(`## ${kind} (${dets.length})`)
    for (const d of dets.slice(0, 8)) lines.push(`- ${d}`)
    if (dets.length > 8) lines.push(`- ...and ${dets.length - 8} more`)
    lines.push('')
  }
  fs.writeFileSync(REPORT_PATH, lines.join('\n'))
  console.log(`wrote ${REPORT_PATH}: ${allIssues.length} issues, ${byKind.size} kinds`)
})().catch(err => { console.error(err); process.exit(1) })
