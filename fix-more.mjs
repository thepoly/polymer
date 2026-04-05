import fs from 'fs';
import path from 'path';

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const { oldStr, newStr, regex, replaceStr } of replacements) {
    if (oldStr && newStr) content = content.replace(oldStr, newStr);
    if (regex && replaceStr !== undefined) content = content.replace(regex, replaceStr);
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

// 1. app/(frontend)/[section]/[year]/[month]/[slug]/page.tsx
replaceInFile('app/(frontend)/[section]/[year]/[month]/[slug]/page.tsx', [
  { oldStr: "title: typeof article.title === 'object' ? extractTextFromLexical(article.title) : article.title,", newStr: "title: extractTextFromLexical(article.title)," },
  { oldStr: "title: `${sectionName} | ${typeof article.title === 'object' ? extractTextFromLexical(article.title) : article.title}`,", newStr: "title: `${sectionName} | ${extractTextFromLexical(article.title)}`," },
  { oldStr: "headline: typeof article.title === 'object' ? extractTextFromLexical(article.title) : article.title,", newStr: "headline: extractTextFromLexical(article.title)," },
  { oldStr: "title={typeof article.title === 'object' ? extractTextFromLexical(article.title) : article.title}", newStr: "title={extractTextFromLexical(article.title)}" },
  { oldStr: "title={article.title}", newStr: "title={extractTextFromLexical(article.title)}" },
  { oldStr: "title: article.title,", newStr: "title: extractTextFromLexical(article.title)," },
  { regex: /import \{ notFound \} from 'next\/navigation';/g, replaceStr: "import { notFound } from 'next/navigation';\nimport { extractTextFromLexical } from '@/utils/formatArticle';" }
]);

// 2. app/(frontend)/staff/[slug]/page.tsx
replaceInFile('app/(frontend)/staff/[slug]/page.tsx', [
  { oldStr: "title: typeof article.title === 'object' ? extractTextFromLexical(article.title) : article.title,", newStr: "title: extractTextFromLexical(article.title)," }
]);

// 3. components/Article/ArticleHeader.tsx
replaceInFile('components/Article/ArticleHeader.tsx', [
  { oldStr: "{article.richTitle || article.title}", newStr: "{renderLexicalHeadline(article.title)}" },
  { oldStr: "import { ArticleByline }", newStr: "import { renderLexicalHeadline } from '@/utils/formatArticle';\nimport { ArticleByline }" }
]);

// 4. components/Article/ArticleRecommendations.tsx
replaceInFile('components/Article/ArticleRecommendations.tsx', [
  { oldStr: "title: typeof article.title === 'object' ? extractTextFromLexical(article.title) : article.title,", newStr: "title: extractTextFromLexical(article.title)," }
]);

// 5. components/Article/Photofeature/ArticleHeader.tsx
replaceInFile('components/Article/Photofeature/ArticleHeader.tsx', [
  { oldStr: "{article.richTitle || article.title}", newStr: "{renderLexicalHeadline(article.title)}" },
  { oldStr: "import { ArticleByline }", newStr: "import { renderLexicalHeadline } from '@/utils/formatArticle';\nimport { ArticleByline }" }
]);

// 6. components/Dashboard/Todos/TodoRow.tsx
replaceInFile('components/Dashboard/Todos/TodoRow.tsx', [
  { oldStr: "article.richTitle || article.title ||", newStr: "renderLexicalHeadline(article.title) ||" },
  { oldStr: "import Link from 'next/link';", newStr: "import Link from 'next/link';\nimport { renderLexicalHeadline } from '@/utils/formatArticle';" }
]);

// 7. components/Opinion/OpinionArticleHeader.tsx
replaceInFile('components/Opinion/OpinionArticleHeader.tsx', [
  { oldStr: "{article.richTitle || article.title}", newStr: "{renderLexicalHeadline(article.title)}" },
  { oldStr: "import { ArticleByline }", newStr: "import { renderLexicalHeadline } from '@/utils/formatArticle';\nimport { ArticleByline }" }
]);

// 8. components/Opinion/OpinionSectionPage.tsx
replaceInFile('components/Opinion/OpinionSectionPage.tsx', [
  { oldStr: "title: typeof raw.title === 'object' ? extractTextFromLexical(raw.title) : raw.title,", newStr: "title: extractTextFromLexical(raw.title)," }
]);

// 9. scripts/seed-features.ts
replaceInFile('scripts/seed-features.ts', [
  { oldStr: "title: typeof article.title === 'object' ? extractTextFromLexical(article.title) : article.title as any,", newStr: "title: extractTextFromLexical(article.title)," }
]);

// 10. scripts/update-features-images.ts
replaceInFile('scripts/update-features-images.ts', [
  { regex: /\(typeof article\.title === 'string' \? article\.title : extractTextFromLexical\(article\.title\)\)/g, replaceStr: "extractTextFromLexical(article.title)" }
]);

console.log("Fixes done");