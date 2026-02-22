type ArticleLike = {
  section: string;
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
  const slug = article.slug;
  
  return `/${section}/${year}/${month}/${slug}`;
}
