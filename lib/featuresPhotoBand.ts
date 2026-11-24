import type { BasePayload } from 'payload'
import type { Article, Media } from '@/payload-types'
import type { FeaturesPhotoBandData } from '@/components/Features/FeaturesPhotoBand'
import { resolveCredit } from '@/components/Article/PhotoCaption'
import { extractTextFromLexical } from '@/utils/formatArticle'
import { getArticleUrl } from '@/utils/getArticleUrl'
import { staffHref, staffName } from '@/utils/articleAuthors'

/**
 * The photo band as the Features Layout editor saves it, in the layout JSON
 * (`features-page-layout.layout.photoBand`). The media record is stored, not
 * a URL, so the page has the photo's size, alt text and photographer.
 */
export type StoredPhotoBand = {
  mediaId: number
  /** The story the photo comes from; its title links from the credit */
  articleId?: number | null
  /** Where the photo is aimed, as object-position percentages */
  focusX?: number
  focusY?: number
}

const clampPercent = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 50
}

/**
 * The band for the Features page, or null when none is set or its photo is
 * gone. A story that's gone or unpublished just drops its link.
 */
export async function loadFeaturesPhotoBand(
  payload: Pick<BasePayload, 'findByID'>,
  stored: StoredPhotoBand | null | undefined,
): Promise<FeaturesPhotoBandData | null> {
  if (!stored || typeof stored !== 'object' || !stored.mediaId) return null

  let media: Media
  try {
    media = (await payload.findByID({ collection: 'media', id: stored.mediaId, depth: 1 })) as Media
  } catch {
    return null
  }
  if (!media?.url || !media.width || !media.height) return null

  let story: FeaturesPhotoBandData['story'] = null
  if (stored.articleId) {
    try {
      const article = (await payload.findByID({
        collection: 'articles',
        id: stored.articleId,
        depth: 0,
        select: { title: true, slug: true, section: true, publishedDate: true, createdAt: true, _status: true },
      })) as Pick<Article, 'title' | 'slug' | 'section' | 'publishedDate' | 'createdAt' | '_status'>
      const href = getArticleUrl(article)
      const title = extractTextFromLexical(article.title).trim()
      if (article._status === 'published' && href !== '#' && title) story = { title, href }
    } catch {
      // Deleted story: the band keeps its photo and credit
    }
  }

  const { staff, writeIn } = resolveCredit({ image: media })
  const photographer = staff[0]
    ? { name: staffName(staff[0]), href: staffHref(staff[0]) }
    : writeIn
      ? { name: writeIn, href: null }
      : null

  return {
    photo: { src: media.url, width: media.width, height: media.height },
    alt: media.alt || media.title || '',
    focus: `${clampPercent(stored.focusX)}% ${clampPercent(stored.focusY)}%`,
    photographer,
    story,
  }
}
