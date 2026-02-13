export interface Article {
  id: number | string;
  slug: string;
  title: string;
  excerpt: string;
  author: string | null;
  date: string | null;
  image: string | null;
  section: string;
  publishedDate?: string | null;
  createdAt?: string;
}
