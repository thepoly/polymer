export interface Article {
  id: number | string;
  title: string;
  excerpt: string;
  author: string | null;
  date: string | null;
  image: string | null;
}
