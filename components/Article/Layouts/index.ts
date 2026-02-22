import { StandardLayout } from './Standard';
import { PhotofeatureLayout } from './Photofeature';
import { Article } from '@/payload-types';
import { LexicalNode } from '@/components/Article/RichTextParser';

// Registry of available layouts
export const ArticleLayouts = {
  standard: StandardLayout,
  photofeature: PhotofeatureLayout,
  news: StandardLayout,
  sports: StandardLayout,
  features: StandardLayout,
  editorial: StandardLayout,
  opinion: StandardLayout,
};

export type ArticleLayoutType = keyof typeof ArticleLayouts;

export const getArticleLayout = (article: Article): ArticleLayoutType => {
  // Logic to determine which layout to use
  
  // 1. Check for Photofeature flag in content
  const firstNode = article.content?.root?.children?.[0] as unknown as LexicalNode;
  if (article.content && firstNode?.type === 'paragraph' && firstNode.children && firstNode.children.length > 0) {
     const firstTextNode = firstNode.children[0];
     if (firstTextNode.type === 'text' && firstTextNode.text?.trim() === '#photofeature#') {
        return 'photofeature';
     }
  }

  // 2. Check for Section-specific layouts
  if (article.section === 'news') return 'news';
  if (article.section === 'sports') return 'sports';
  if (article.section === 'features') return 'features';
  if (article.section === 'editorial') return 'editorial';
  if (article.section === 'opinion') return 'opinion';

  // Default fallback
  return 'standard';
};