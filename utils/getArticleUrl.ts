import { deriveSlug } from './deriveSlug';

type ArticleLike = {
  section: string;
  title?: string;
  slug?: string | null;
  publishedDate?: string | null;
  createdAt?: string;
}

export const getArticleUrl = (article: ArticleLike) => {
  const dateStr = article.publishedDate || article.createdAt || new Date().toISOString();
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const section = article.section;
  const slug = article.slug || (article.title ? deriveSlug(article.title) : 'untitled');

  return `/${section}/${year}/${month}/${slug}`;
}
