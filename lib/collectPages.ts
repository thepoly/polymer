/** Apply eligibility before the limit, continuing until enough matches or EOF. */
export async function collectPages<T>(
  fetchPage: (page: number) => Promise<{ docs: T[]; hasNextPage?: boolean }>,
  accept: (doc: T) => boolean = () => true,
  limit = Infinity,
): Promise<T[]> {
  const docs: T[] = []
  for (let page = 1; docs.length < limit; page += 1) {
    const result = await fetchPage(page)
    for (const doc of result.docs) {
      if (accept(doc)) docs.push(doc)
      if (docs.length >= limit) break
    }
    if (!result.hasNextPage || result.docs.length === 0) break
  }
  return docs
}
