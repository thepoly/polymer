export interface Article {
  id: number | string;
  slug: string;
  title: string;
  excerpt: string;
  author: string | null;
  date: string | null;
  image: string | null;
  imageFull: string | null;
  section: string;
  kicker: string | null;
  opinionType?: string | null;
  publishedDate?: string | null;
  createdAt?: string;
  /** Absolute URL for legacy articles that live on an external domain */
  externalUrl?: string;
}
