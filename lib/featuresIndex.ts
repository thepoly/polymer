// Every published Features story, slimmed down for the section list and the
// Features Index at the bottom of /features. Both are filtered in the browser,
// so the page sends each story once with only what a list row shows.
import type { Payload } from 'payload'
import { formatArticle } from '@/utils/formatArticle'
import { getArticleUrl } from '@/utils/getArticleUrl'
import { departmentOf, type FeaturesDepartmentKey } from './featuresDepartments'

/** Features runs about 30 stories a year; this covers the archive with room to spare */
const INDEX_LIMIT = 600

export type FeaturesIndexStory = {
  id: number | string
  title: string
  href: string
  kicker: string | null
  /** Publish date, ISO */
  date: string | null
  /** Byline names in order; empty means "By The Polytechnic" */
  authors: { name: string; href: string | null }[]
  department: FeaturesDepartmentKey | null
}

export async function loadFeaturesIndex(payload: Payload): Promise<FeaturesIndexStory[]> {
  try {
    const response = await payload.find({
      collection: 'articles',
      where: { and: [{ section: { equals: 'features' } }, { _status: { equals: 'published' } }] },
      sort: '-publishedDate',
      limit: INDEX_LIMIT,
      depth: 1,
      // No photos: the list is text, which keeps the page light
      select: {
        title: true,
        slug: true,
        section: true,
        kicker: true,
        publishedDate: true,
        createdAt: true,
        authors: true,
        writeInAuthors: true,
        isFollytechnic: true,
      },
    })
    const stories: FeaturesIndexStory[] = []
    for (const doc of response.docs) {
      const article = formatArticle(doc)
      if (!article) continue
      const href = getArticleUrl(article)
      if (href === '#') continue
      stories.push({
        id: article.id,
        title: article.title,
        href,
        kicker: article.kicker?.trim() || null,
        date: article.isoDate ?? null,
        authors: article.authorLinks ?? [],
        department: departmentOf(article.kicker),
      })
    }
    return stories
  } catch {
    // The page still renders its cover; the list and index stay out
    return []
  }
}
