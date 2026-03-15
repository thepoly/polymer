export interface OpinionArticle {
  id: number | string;
  slug: string;
  title: string;
  excerpt: string;
  author: string | null;
  authorId: number | null;
  authorHeadshot: string | null;
  date: string | null;
  publishedDate: string | null;
  createdAt: string;
  image: string | null;
  section: string;
  opinionType: string | null;
}

export interface ColumnistAuthor {
  id: number;
  firstName: string;
  lastName: string;
  headshot: string | null;
  latestArticleUrl: string | null;
}
