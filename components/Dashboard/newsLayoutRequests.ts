export type NewsLayoutDocument = { layout: Record<string, unknown>; updatedAt: string }

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
