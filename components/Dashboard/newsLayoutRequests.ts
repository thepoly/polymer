export type NewsLayoutDocument = { layout: Record<string, unknown>; updatedAt: string }

/** REST archive queries have finite pages even when the editor needs all rows. */
export async function readAllDocs<T>(url: string): Promise<{ docs: T[] }> {
  const docs: T[] = []
  for (let page = 1; ; page += 1) {
    const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}page=${page}`, { cache: 'no-store' })
    if (!response.ok) throw new Error('Could not load the complete archive.')
    const result = await response.json()
    if (!Array.isArray(result.docs)) throw new Error('Invalid archive response.')
    docs.push(...result.docs)
    if (!result.hasNextPage || result.docs.length === 0) return { docs }
  }
}

export async function activateNewsLayout(id: string, layout: object, updatedAt: string): Promise<void> {
  const response = await fetch(`/api/news-page-layout/${encodeURIComponent(id)}/activate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ layout, updatedAt }),
  })
  if (!response.ok) {
    if (response.status === 409) {
      throw new Error('The layout changed while saving. Your changes are still here; activate again to retry.')
    }
    throw new Error('Failed to save')
  }
}

/** Never treat an error response or malformed document as an empty layout. */
export async function readNewsLayout(id: string): Promise<NewsLayoutDocument> {
  const response = await fetch(`/api/news-page-layout/${encodeURIComponent(id)}?depth=0`, { cache: 'no-store' })
  if (!response.ok) throw new Error('Could not read the current layout. Your changes have not been saved.')
  const doc = await response.json()
  if (
    !doc || typeof doc !== 'object' || Array.isArray(doc) ||
    String(doc.id) !== id || typeof doc.updatedAt !== 'string' || !Number.isFinite(Date.parse(doc.updatedAt)) ||
    (doc.layout != null && (typeof doc.layout !== 'object' || Array.isArray(doc.layout)))
  ) {
    throw new Error('The current layout is invalid. Your changes have not been saved.')
  }
  return { layout: doc.layout ?? {}, updatedAt: doc.updatedAt }
}
