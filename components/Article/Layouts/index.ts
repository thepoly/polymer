import { StandardLayout } from './Standard';
import { PhotofeatureLayout } from './Photofeature';
import { OpinionLayout } from './Opinion';
import { Article } from '@/payload-types';

// Registry of available layouts
export const ArticleLayouts = {
  standard: StandardLayout,
  photofeature: PhotofeatureLayout,
  news: StandardLayout,
  sports: StandardLayout,
  features: StandardLayout,
  opinion: OpinionLayout,
};

export type ArticleLayoutType = keyof typeof ArticleLayouts;

export const getArticleLayout = (article: Article): ArticleLayoutType => {
  // Logic to determine which layout to use

  // 1. Check for Photofeature toggle
  if ((article as unknown as Record<string, unknown>).isPhotofeature) {
    return 'photofeature';
  }

  // 2. Check for Section-specific layouts
  if (article.section === 'news') return 'news';
  if (article.section === 'sports') return 'sports';
  if (article.section === 'features') return 'features';
  if (article.section === 'opinion') return 'opinion';

  // Default fallback
  return 'standard';
};
