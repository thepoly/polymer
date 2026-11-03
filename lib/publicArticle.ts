import type { Article, User } from '@/payload-types';
import type { LexicalNode } from '@/components/Article/RichTextParser';

/**
 * The shape of an article as the public article page and the draft preview
 * hand it to a layout: related users and media trimmed to the fields the
 * layouts read, so nothing like an email address rides along to the client.
 */
type PublicArticleUser = {
  id: number;
  firstName: string;
  lastName: string;
  slug?: string | null;
  headshot?: { url?: string | null; focalX?: number | null; focalY?: number | null } | null;
  bio?: {
    root?: {
      children?: LexicalNode[];
    };
  } | null;
  positions?:
    | {
        startDate: string;
        endDate?: string | null;
        jobTitle?: {
          title?: string | null;
        } | null;
      }[]
    | null;
};

type PublicArticleMedia = {
  id: number;
  url?: string | null;
  title?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  photographer?: PublicArticleUser | null;
  writeInPhotographer?: string | null;
  // Needed by the photofeature hero: it crops to the viewport, and the focal
  // point is what decides which part of the photo survives that crop.
  focalX?: number | null;
  focalY?: number | null;
};

const toPublicArticleUser = (user: User): PublicArticleUser => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  slug: user.slug,
  headshot:
    typeof user.headshot === 'object' && user.headshot
      ? { url: user.headshot.url, focalX: user.headshot.focalX, focalY: user.headshot.focalY }
      : null,
  bio: user.bio
    ? {
        root: {
          children: user.bio.root?.children as LexicalNode[] | undefined,
        },
      }
    : null,
  positions: user.positions?.map((position) => ({
    startDate: position.startDate,
    endDate: position.endDate,
    jobTitle: typeof position.jobTitle === 'object' && position.jobTitle ? { title: position.jobTitle.title } : null,
  })) || null,
});

const toPublicArticleMedia = (media: Article['featuredImage']): PublicArticleMedia | null => {
  if (!media || typeof media === 'number') return null;

  const photographer = media.photographer && typeof media.photographer === 'object'
    ? toPublicArticleUser(media.photographer as User)
    : null;

  return {
    id: media.id,
    url: media.url,
    title: (media as unknown as Record<string, unknown>).title as string | null | undefined,
    alt: media.alt,
    width: media.width,
    height: media.height,
    photographer,
    writeInPhotographer: (media as unknown as Record<string, unknown>).writeInPhotographer as string | null | undefined,
    focalX: media.focalX,
    focalY: media.focalY,
  };
};

export const toPublicArticle = (article: Article): Article => ({
  ...article,
  authors: (article.authors || [])
    .filter((author): author is User => typeof author !== 'number')
    .map(toPublicArticleUser),
  featuredImage: toPublicArticleMedia(article.featuredImage),
  imageCaption: (article as unknown as Record<string, unknown>).imageCaption as string | null | undefined,
  opinionType: (article as unknown as Record<string, unknown>).opinionType as Article['opinionType'],
} as Article);

