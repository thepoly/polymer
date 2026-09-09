import { getPayload, type Payload } from 'payload';
import config from '@/payload.config';
import { getArticleUrl } from '@/utils/getArticleUrl';
import type { Article, Media, User } from '@/payload-types';

export const STAFF_PORTFOLIO_PAGE_SIZE = 24;

export type StaffPortfolioPhoto = Pick<
  Media,
  'id' | 'url' | 'title' | 'alt' | 'width' | 'height' | 'sizes' | 'thumbnailURL' | 'filename' | 'sourceUrl'
>;

type StaffPortfolioArticle = Pick<Article, 'slug' | 'section' | 'publishedDate' | 'createdAt'>;
type StaffPortfolioArticleLookup = StaffPortfolioArticle & Pick<Article, 'featuredImage' | 'content'>;

export async function getStaffUserBySlug(slug: string): Promise<User | undefined> {
  const payload = await getPayload({ config });
  const isNumeric = /^\d+$/.test(slug);
  const result = await payload.find({
    collection: 'users',
    where: {
      or: [
        { slug: { equals: slug } },
        ...(isNumeric ? [{ id: { equals: parseInt(slug, 10) } }] : []),
      ],
    },
    depth: 1,
    limit: 1,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      slug: true,
      headshot: true,
      bio: true,
      positions: true,
    },
  });

  return result.docs[0] as User | undefined;
}

function getMediaRelationId(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'number') {
    return value.id;
  }

  return null;
}

function getArticlePhotoIds(article: StaffPortfolioArticleLookup): number[] {
  const photoIds = new Set<number>();
  const featuredImageId = getMediaRelationId(article.featuredImage);

  if (featuredImageId) {
    photoIds.add(featuredImageId);
  }

  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;

    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    if ('type' in node && node.type === 'upload' && 'value' in node) {
      const uploadId = getMediaRelationId(node.value);
      if (uploadId) photoIds.add(uploadId);
    }

    if ('blockType' in node && (node.blockType === 'photo_gallery' || node.blockType === 'carousel') && 'images' in node && Array.isArray(node.images)) {
      node.images.forEach((image) => {
        if (!image || typeof image !== 'object' || !('image' in image)) return;
        const imageId = getMediaRelationId(image.image);
        if (imageId) photoIds.add(imageId);
      });
    }

    Object.values(node).forEach(walk);
  };

  walk(article.content);

  return [...photoIds];
}

/**
 * How far back the inline-image scan is willing to walk. Inline uploads live
 * inside the lexical `content` JSON, which is not queryable, so resolving them
 * means reading article bodies. Without a bound, a photographer whose photos
 * were never used inline makes this read every published article — thousands,
 * once the legacy archive is counted — on every render of their profile.
 *
 * 20 pages of 50 covers the most recent 1,000 articles. A photo older than
 * that simply renders without a link to its article, which is a far better
 * outcome than a profile page that takes seconds to respond.
 */
const MAX_INLINE_SCAN_PAGES = 20;

export async function getPhotoArticleMap(photoIds: number[], payload?: Payload): Promise<Record<number, string>> {
  if (photoIds.length === 0) return {};

  const payloadClient = payload || await getPayload({ config });
  const unresolvedPhotoIds = new Set(photoIds);
  const photoToArticleMap: Record<number, string> = {};

  // Most portfolio photos are an article's featured image, and that is an
  // indexed relationship — ask for exactly those articles instead of reading
  // every article body looking for them. Deliberately does not select
  // `content`: this pass has no need for it, and it is by far the heaviest
  // column on the table.
  const featured = await payloadClient.find({
    collection: 'articles',
    where: {
      and: [
        { _status: { equals: 'published' } },
        { featuredImage: { in: photoIds } },
      ],
    },
    sort: '-publishedDate',
    limit: Math.max(photoIds.length, 50),
    depth: 0,
    select: {
      slug: true,
      section: true,
      publishedDate: true,
      createdAt: true,
      featuredImage: true,
    },
  });

  for (const article of featured.docs as StaffPortfolioArticleLookup[]) {
    const href = getArticleUrl(article);
    if (!href || href === '#') continue;

    const featuredImageId = getMediaRelationId(article.featuredImage);
    if (featuredImageId === null || !unresolvedPhotoIds.has(featuredImageId)) continue;

    photoToArticleMap[featuredImageId] = href;
    unresolvedPhotoIds.delete(featuredImageId);
  }

  // Anything still unresolved was only ever used inline, so it needs the scan.
  if (unresolvedPhotoIds.size === 0) return photoToArticleMap;

  let page = 1;
  let hasNextPage = true;

  while (hasNextPage && unresolvedPhotoIds.size > 0 && page <= MAX_INLINE_SCAN_PAGES) {
    const relatedArticles = await payloadClient.find({
      collection: 'articles',
      where: {
        _status: {
          equals: 'published',
        },
      },
      sort: '-publishedDate',
      page,
      limit: 50,
      // depth 0: only relationship ids are needed, so there is no reason to
      // join and hydrate the media row behind every article's featured image.
      depth: 0,
      select: {
        slug: true,
        section: true,
        publishedDate: true,
        createdAt: true,
        featuredImage: true,
        content: true,
      },
    });

    for (const article of relatedArticles.docs as StaffPortfolioArticleLookup[]) {
      const href = getArticleUrl(article);
      if (!href || href === '#') continue;

      for (const imageId of getArticlePhotoIds(article)) {
        if (!unresolvedPhotoIds.has(imageId)) continue;
        photoToArticleMap[imageId] = href;
        unresolvedPhotoIds.delete(imageId);
      }
    }

    hasNextPage = relatedArticles.hasNextPage;
    page += 1;
  }

  return photoToArticleMap;
}

export async function getStaffPortfolioPage(userId: number, page = 1, limit = STAFF_PORTFOLIO_PAGE_SIZE) {
  const payload = await getPayload({ config });
  const photos = await payload.find({
    collection: 'media',
    where: {
      or: [
        {
          photographer: {
            equals: userId,
          },
        },
        {
          photographer: {
            equals: String(userId),
          },
        },
      ],
    },
    sort: '-createdAt',
    page,
    limit,
    depth: 0,
    select: {
      id: true,
      filename: true,
      sourceUrl: true,
      url: true,
      title: true,
      alt: true,
      width: true,
      height: true,
      sizes: true,
      thumbnailURL: true,
    },
  });

  const photoToArticleMap = await getPhotoArticleMap(photos.docs.map((photo) => photo.id), payload);

  return {
    photos: photos.docs as StaffPortfolioPhoto[],
    photoToArticleMap,
    hasMore: photos.hasNextPage,
    nextPage: photos.hasNextPage ? photos.nextPage : null,
  };
}
