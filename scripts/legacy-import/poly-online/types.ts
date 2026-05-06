/**
 * Types describing the polytechnic-online manifest entries we consume.
 *
 * The manifest under /home/red/poly/recon/archives/polytechnic-online/manifest.json
 * stores one row per (view, part) pair. Most articles are single-part; a minority
 * span 2-6 parts.
 */

export type LegacyAuthor = {
  name: string
  position?: string
}

export type LegacyArticleEntry = {
  kind: 'article'
  view: number
  part: number
  headline: string
  section: string
  posted: string
  posted_iso: string
  local_path: string
  url: string
  size: number
  IssueID: number
  articleID: number
  headline_db: string
  subtitle_db?: string
  section_db: string
  type_db: string
  topstory: number
  blurb_db: string
  date_db: string
  volume?: number
  number?: number
  issue_date_iso?: string
  part_date_posted?: string
  part_time_posted?: string
  part_title_1?: string
  part_title_2?: string
  part_body_bytes?: number
  authors: LegacyAuthor[] | null
  canonical_date: string
  canonical_year: string
}

export type LegacyManifest = {
  generated_at: string
  source_url: string
  mirror_root: string
  stats: Record<string, number>
  issues: unknown[]
  articles: LegacyArticleEntry[]
  other_files: unknown[]
}
