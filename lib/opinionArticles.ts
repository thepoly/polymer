import type { Article, User } from '@/payload-types';
import type { SpotlightAuthor } from '@/components/Opinion/spotlight';
import { extractTextFromLexical } from '@/utils/formatArticle';
import { getArticleUrl } from '@/utils/getArticleUrl';
import { headshotObjectPosition } from '@/utils/focalPoint';

export const opinionCardSelect = {
  title: true, slug: true, subdeck: true, featuredImage: true, section: true,
  kicker: true, publishedDate: true, createdAt: true, authors: true,
  opinionType: true, writeInAuthors: true, isFollytechnic: true,
} as const;

/** Only this public projection may cross the server/client boundary. */
export function buildOpinionSpotlights(articles: Article[]): SpotlightAuthor[] {
  const authors = new Map<number, { count: number; value: SpotlightAuthor }>();
  for (const article of articles) {
    if (!article.slug) continue;
    for (const author of article.authors || []) {
      if (!author || typeof author !== 'object') continue;
      const existing = authors.get(author.id);
      if (existing) { existing.count++; continue; }
      const user = author as User;
      authors.set(user.id, { count: 1, value: {
        id: user.id, name: `${user.firstName} ${user.lastName}`,
        headshot: user.headshot && typeof user.headshot === 'object' ? user.headshot.url || null : null,
        headshotFocus: user.headshot && typeof user.headshot === 'object' ? headshotObjectPosition(user.headshot) : null,
        detail: user.major || null,
        latestArticle: { title: extractTextFromLexical(article.title), url: getArticleUrl(article) },
      } });
    }
  }
  return [...authors.values()].sort((a, b) => b.count - a.count).slice(0, 8).map((a) => a.value);
}
