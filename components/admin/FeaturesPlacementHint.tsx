'use client'

/*
 * A read-only note under the kicker on Features stories: where the Features
 * page will put the story, worked out from the same rules the page uses
 * (departmentOf in lib/featuresDepartments, REEL_MIN_PHOTOS in
 * lib/featuresFront). It updates as the kicker, featured image and body
 * change. Nothing here is saved: the field is a Payload "ui" field.
 */

import React from 'react'
import { useFormFields } from '@payloadcms/ui'
import { FEATURES_DEPARTMENTS, departmentOf } from '@/lib/featuresDepartments'
import { REEL_MIN_PHOTOS } from '@/lib/featuresFront'

type LexicalNode = {
  type?: string
  children?: LexicalNode[]
  value?: unknown
  fields?: { blockType?: string; images?: Array<{ image?: unknown } | null> }
}

/** A media item's id, whether the form holds the id or the populated doc */
const mediaKey = (m: unknown): string | null =>
  typeof m === 'number' || typeof m === 'string' ? String(m) : m && typeof m === 'object' && 'id' in m ? String((m as { id: unknown }).id) : null

/**
 * Photos in the body, counted as the page counts them (framesOf in
 * FeaturesFront): every image in a gallery or carousel and every inline
 * upload, each photo once, rows without a photo skipped.
 */
function countPhotos(content: unknown): number {
  const seen = new Set<string>()
  const add = (m: unknown) => {
    const key = mediaKey(m)
    if (key) seen.add(key)
  }
  const walk = (node: LexicalNode | undefined) => {
    if (!node) return
    const block = node.fields?.blockType
    if (node.type === 'block' && (block === 'photo_gallery' || block === 'carousel')) node.fields?.images?.forEach((row) => add(row?.image))
    else if (node.type === 'upload') add(node.value)
    node.children?.forEach(walk)
  }
  walk((content as { root?: LexicalNode } | null)?.root)
  return seen.size
}

const box: React.CSSProperties = {
  margin: '8px 0 20px',
  padding: '10px 12px',
  borderRadius: 4,
  border: '1px solid var(--theme-elevation-150)',
  background: 'var(--theme-elevation-50)',
  fontSize: '0.8rem',
  lineHeight: 1.45,
}
const warn: React.CSSProperties = { color: 'var(--theme-warning-600, #b45309)' }
const ok: React.CSSProperties = { color: 'var(--theme-success-600, #15803d)' }

export const FeaturesPlacementHint: React.FC = () => {
  const section = useFormFields(([fields]) => fields.section?.value)
  const kicker = useFormFields(([fields]) => fields.kicker?.value) as string | undefined
  const featuredImage = useFormFields(([fields]) => fields.featuredImage?.value)
  const content = useFormFields(([fields]) => fields.content?.value)

  if (section !== 'features') return null

  const dept = departmentOf(kicker)
  const name = dept ? FEATURES_DEPARTMENTS.find((d) => d.key === dept)?.name : null
  const photos = dept === 'photo' ? countPhotos(content) : 0
  const lines: React.ReactNode[] = []

  if (!kicker?.trim()) {
    lines.push(<span style={warn}>Add a kicker: it decides which Features section this story goes in.</span>)
  } else if (name) {
    lines.push(
      <>
        <strong>Features section: {name}</strong> (from the kicker &ldquo;{kicker}&rdquo;).
      </>,
    )
  } else {
    lines.push(
      <span style={warn}>
        The kicker &ldquo;{kicker}&rdquo; isn&rsquo;t in any Features section, so the story won&rsquo;t appear under a
        section&rsquo;s name. It can still be the cover or in the top stories, and it&rsquo;s in the archive. Kickers
        like &ldquo;Campus Event&rdquo;, &ldquo;Album Review&rdquo;, &ldquo;Club Spotlight&rdquo; or &ldquo;Photo Short
        Story&rdquo; place it.
      </span>,
    )
  }

  if (!featuredImage) {
    lines.push(
      <span style={warn}>No featured image: it can&rsquo;t be the cover, lead Arts &amp; Culture, or sit in the top-left.</span>,
    )
  }

  if (dept === 'photo' && !featuredImage) {
    lines.push(
      <span style={warn}>
        A photo story needs a featured image to appear in the Photo Short Stories reel or under it.
      </span>,
    )
  } else if (dept === 'photo') {
    lines.push(
      photos >= REEL_MIN_PHOTOS ? (
        <span style={ok}>
          {photos} photos in the body: enough to lead the photo reel (it needs {REEL_MIN_PHOTOS}).
        </span>
      ) : (
        <span style={warn}>
          {photos} photo{photos === 1 ? '' : 's'} in the body: the photo reel needs {REEL_MIN_PHOTOS} (galleries and
          carousels count), so it will be listed under the reel instead of leading it.
        </span>
      ),
    )
  }

  return (
    <div style={box} role="note" aria-label="Where this story goes on the Features page">
      {lines.map((line, i) => (
        <div key={i} style={i ? { marginTop: 4 } : undefined}>
          {line}
        </div>
      ))}
    </div>
  )
}
