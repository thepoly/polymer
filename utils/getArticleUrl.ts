type ArticleLike = {
  section: string;
  slug?: string | null;
  publishedDate?: string | null;
  createdAt?: string;
}

export const getArticleUrl = (article: ArticleLike) => {
  const dateStr = article.publishedDate || article.createdAt;
  if (!dateStr || !article.slug || article.slug === '#') return '#';

  const date = new Date(dateStr);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');

  return `/${article.section}/${year}/${month}/${article.slug}`;
}
