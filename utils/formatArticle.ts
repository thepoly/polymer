import { Media } from '@/payload-types';
import { Article as ComponentArticle } from '@/components/FrontPage/types';

type PublicAuthorLike = {
  firstName: string;
  lastName: string;
};

type PublicMediaLike = Pick<Media, 'url'> & {
  sizes?: {
    card?: {
      url?: string | null;
    } | null;
  } | null;
};

type WriteInAuthor = {
  name: string;
  photo?: unknown;
};

type FormatArticleInput = {
  id: number | string;
  slug?: string | null;
  title: string;
  subdeck?: string | null;
  featuredImage?: number | PublicMediaLike | null;
  section: string;
  kicker?: string | null;
  opinionType?: string | null;
  publishedDate?: string | null;
  createdAt?: string;
  authors?: Array<number | PublicAuthorLike> | null;
  writeInAuthors?: WriteInAuthor[] | null;
  _status?: string | null;
};

export const formatArticle = (
  article: FormatArticleInput | number | null | undefined,
  { absoluteDate = false }: { absoluteDate?: boolean } = {},
): ComponentArticle | null => {
  if (!article || typeof article === 'number') return null;
  if (article._status && article._status !== 'published') return null;
  if (!article.slug) return null;

  const staffNames = (article.authors || [])
    .map((author) => {
      if (typeof author === 'number') return '';
      return `${author.firstName} ${author.lastName}`;
    })
    .filter(Boolean);

  const writeInNames = (article.writeInAuthors || [])
    .map((a) => a.name)
    .filter(Boolean);

  const authors = [...staffNames, ...writeInNames].join(' AND ');

  const date = article.publishedDate ? new Date(article.publishedDate) : null;

  let dateString: string | null = null;
  if (date) {
    const now = new Date().getTime();
    const diffMs = now - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (absoluteDate) {
      dateString = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } else if (diffDays >= 7) {
      // Hide date if older than 7 days
      dateString = null;
    } else if (diffMins < 60) {
      dateString = `${diffMins} MINUTE${diffMins !== 1 ? 'S' : ''} AGO`;
    } else if (diffHours < 24) {
      dateString = `${diffHours} HOUR${diffHours !== 1 ? 'S' : ''} AGO`;
    } else {
      dateString = `${diffDays} DAY${diffDays !== 1 ? 'S' : ''} AGO`;
    }
  }

  return {
    id: article.id,
    slug: article.slug || '#',
    title: article.title,
    excerpt: article.subdeck || '',
    author: authors ? authors.toUpperCase() : 'THE POLY',
    date: dateString,
    image: (article.featuredImage as Media)?.sizes?.card?.url || (article.featuredImage as Media)?.url || null,
    section: article.section,
    kicker: article.kicker || null,
    opinionType: article.opinionType || null,
    publishedDate: article.publishedDate,
    createdAt: article.createdAt,
  };
};
