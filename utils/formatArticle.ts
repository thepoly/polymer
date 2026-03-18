import { Article as PayloadArticle, Media } from '@/payload-types';
import { Article as ComponentArticle } from '@/components/FrontPage/types';

export const formatArticle = (
  article: PayloadArticle | number | null | undefined,
  { absoluteDate = false }: { absoluteDate?: boolean } = {},
): ComponentArticle | null => {
  if (!article || typeof article === 'number') return null;

  const authors = article.authors
    ?.map((author) => {
      if (typeof author === 'number') return '';
      return `${author.firstName} ${author.lastName}`;
    })
    .filter(Boolean)
    .join(' AND ');

  const date = article.publishedDate ? new Date(article.publishedDate) : null;

  let dateString: string | null = null;
  if (date) {
    if (!absoluteDate) {
      const now = new Date().getTime();
      const diffMs = now - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 60) {
        dateString = `${diffMins} MINUTE${diffMins !== 1 ? 'S' : ''} AGO`;
      } else if (diffHours < 24) {
        dateString = `${diffHours} HOUR${diffHours !== 1 ? 'S' : ''} AGO`;
      } else if (diffDays < 7) {
        dateString = `${diffDays} DAY${diffDays !== 1 ? 'S' : ''} AGO`;
      }
    }
    if (!dateString) {
      dateString = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
  }

  return {
    id: article.id,
    slug: article.slug || '#',
    title: article.title,
    excerpt: article.subdeck || '',
    author: authors || null,
    date: dateString,
    image: (article.featuredImage as Media)?.url || null,
    section: article.section,
    kicker: article.kicker || null,
    publishedDate: article.publishedDate,
    createdAt: article.createdAt,
  };
};
