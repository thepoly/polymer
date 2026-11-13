'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useField, useDocumentInfo, FieldLabel } from '@payloadcms/ui'

type PortfolioPhoto = {
  id: number
  url?: string | null
  thumbnailURL?: string | null
  title?: string | null
  sizes?: { card?: { url?: string | null } | null } | null
}

type MediaPage = {
  docs: PortfolioPhoto[]
  hasNextPage: boolean
  nextPage: number | null
}

const PAGE_SIZE = 60

const toId = (entry: unknown): number | null => {
  if (typeof entry === 'number') return entry
  if (typeof entry === 'string' && /^\d+$/.test(entry)) return Number(entry)
  if (entry && typeof entry === 'object' && 'id' in entry) return toId((entry as { id: unknown }).id)
  return null
}

/**
 * The staffer's own gallery, as it appears on their staff page. Clicking a
 * photo takes it off the page; clicking it again puts it back. The field's
 * value is the list of removed photo ids — there is no way to add a photo
 * that is not already credited to them.
 */
export const PortfolioField: React.FC<{ path: string; field: { label?: string } }> = ({ path, field }) => {
  const { value, setValue } = useField<unknown[]>({ path })
  const { id } = useDocumentInfo()

  const [photos, setPhotos] = useState<PortfolioPhoto[]>([])
  const [nextPage, setNextPage] = useState<number | null>(1)
  const [loading, setLoading] = useState(false)

  const hidden = new Set((Array.isArray(value) ? value : []).map(toId).filter((n): n is number => n !== null))

  const loadPage = useCallback(
    async (page: number, replace: boolean) => {
      if (!id) return
      setLoading(true)
      try {
        const params = new URLSearchParams({
          'where[photographer][equals]': String(id),
          sort: '-createdAt',
          depth: '0',
          limit: String(PAGE_SIZE),
          page: String(page),
        })
        const response = await fetch(`/api/media?${params.toString()}`, { credentials: 'include' })
        if (!response.ok) throw new Error(`media ${response.status}`)
        const data = (await response.json()) as MediaPage
        setPhotos((current) => (replace ? data.docs : [...current, ...data.docs]))
        setNextPage(data.hasNextPage ? data.nextPage : null)
      } catch {
        setNextPage(null)
      } finally {
        setLoading(false)
      }
    },
    [id],
  )

  useEffect(() => {
    void loadPage(1, true)
  }, [loadPage])

  const toggle = (photoId: number) => {
    const next = new Set(hidden)
    if (next.has(photoId)) next.delete(photoId)
    else next.add(photoId)
    setValue([...next])
  }

  if (photos.length === 0) return null

  return (
    <div className="field-type" style={{ marginBottom: 'var(--base)' }}>
      <FieldLabel label={field?.label || 'Photo Portfolio'} path={path} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: 8,
        }}
      >
        {photos.map((photo) => {
          const src = photo.thumbnailURL || photo.sizes?.card?.url || photo.url
          if (!src) return null
          const isHidden = hidden.has(photo.id)

          return (
            <button
              key={photo.id}
              type="button"
              aria-pressed={isHidden}
              aria-label={`${isHidden ? 'Restore' : 'Remove'} ${photo.title || `photo ${photo.id}`}`}
              onClick={() => toggle(photo.id)}
              style={{
                position: 'relative',
                aspectRatio: '1 / 1',
                padding: 0,
                border: '1px solid var(--theme-elevation-150)',
                borderRadius: 4,
                overflow: 'hidden',
                cursor: 'pointer',
                background: 'var(--theme-elevation-50)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={photo.title || ''}
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  opacity: isHidden ? 0.25 : 1,
                  filter: isHidden ? 'grayscale(1)' : 'none',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: 4,
                  bottom: 4,
                  padding: '2px 6px',
                  borderRadius: 3,
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#fff',
                  background: isHidden ? 'var(--theme-success-500, #2f7d4f)' : 'rgba(0, 0, 0, 0.7)',
                }}
              >
                {isHidden ? 'Restore' : 'Remove'}
              </span>
            </button>
          )
        })}
      </div>
      {nextPage && (
        <button
          type="button"
          className="btn btn--style-secondary btn--size-small"
          disabled={loading}
          onClick={() => void loadPage(nextPage, false)}
          style={{ marginTop: 12 }}
        >
          Load More
        </button>
      )}
    </div>
  )
}
