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
  { oldStr: "title: article.title,", newStr: "title: typeof article.title === 'object' ? extractTextFromLexical(article.title) : article.title," },
  { oldStr: "title: article.title,", newStr: "title: typeof article.title === 'object' ? extractTextFromLexical(article.title) : article.title," },
  { oldStr: "title: `${sectionName} | ${article.title}`,", newStr: "title: `${sectionName} | ${typeof article.title === 'object' ? extractTextFromLexical(article.title) : article.title}`," },
  { oldStr: "headline: article.title,", newStr: "headline: typeof article.title === 'object' ? extractTextFromLexical(article.title) : article.title," },
  { oldStr: "title={article.title}", newStr: "title={typeof article.title === 'object' ? extractTextFromLexical(article.title) : article.title}" },
  { regex: /import \{ getSeo \} from '@\/lib\/getSeo';/g, replaceStr: "import { getSeo } from '@/lib/getSeo';\nimport { extractTextFromLexical } from '@/utils/formatArticle';" }
]);

// 2. app/(frontend)/sitemap-news.xml/route.ts
replaceInFile('app/(frontend)/sitemap-news.xml/route.ts', [
  { oldStr: "doc.title.replace", newStr: "(typeof doc.title === 'string' ? doc.title : extractTextFromLexical(doc.title)).replace" },
  { oldStr: "import { getPayload }", newStr: "import { extractTextFromLexical } from '@/utils/formatArticle';\nimport { getPayload }" }
]);

// 3. app/(frontend)/staff/[slug]/page.tsx
replaceInFile('app/(frontend)/staff/[slug]/page.tsx', [
  { oldStr: "title: article.title,", newStr: "title: typeof article.title === 'object' ? extractTextFromLexical(article.title) : article.title," },
  { oldStr: "import { StaffProfile }", newStr: "import { extractTextFromLexical } from '@/utils/formatArticle';\nimport { StaffProfile }" }
]);

// 4. app/api/search/route.ts
replaceInFile('app/api/search/route.ts', [
  { oldStr: "formatArticle(doc as PayloadSearchArticle,", newStr: "formatArticle(doc as any," }
]);

// 5. app/api/search/spellcheck/route.ts
replaceInFile('app/api/search/spellcheck/route.ts', [
  { oldStr: "extractWords(doc.title)", newStr: "extractWords(typeof doc.title === 'string' ? doc.title : extractTextFromLexical(doc.title))" },
  { oldStr: "import { getPayload }", newStr: "import { extractTextFromLexical } from '@/utils/formatArticle';\nimport { getPayload }" }
]);

// 6. components/Article/ArticleHeader.tsx
replaceInFile('components/Article/ArticleHeader.tsx', [
  { oldStr: "{article.title}", newStr: "{article.richTitle || article.title}" }
]);

// 7. components/Article/ArticleRecommendations.tsx
replaceInFile('components/Article/ArticleRecommendations.tsx', [
  { oldStr: "title: article.title,", newStr: "title: typeof article.title === 'object' ? extractTextFromLexical(article.title) : article.title," },
  { oldStr: "import { Article }", newStr: "import { extractTextFromLexical } from '@/utils/formatArticle';\nimport { Article }" }
]);

// 8. components/Article/Photofeature/ArticleHeader.tsx
replaceInFile('components/Article/Photofeature/ArticleHeader.tsx', [
  { oldStr: "{article.title}", newStr: "{article.richTitle || article.title}" }
]);

// 9. components/Dashboard/Todos/TodoRow.tsx
replaceInFile('components/Dashboard/Todos/TodoRow.tsx', [
  { oldStr: "article.title ||", newStr: "article.richTitle || article.title ||" }
]);

// 10. components/Opinion/OpinionArticleHeader.tsx
replaceInFile('components/Opinion/OpinionArticleHeader.tsx', [
  { oldStr: "{article.title}", newStr: "{article.richTitle || article.title}" }
]);

// 11. components/Opinion/OpinionSectionPage.tsx
replaceInFile('components/Opinion/OpinionSectionPage.tsx', [
  { oldStr: "title: raw.title,", newStr: "title: typeof raw.title === 'object' ? extractTextFromLexical(raw.title) : raw.title," },
  { oldStr: "import { OpinionCard }", newStr: "import { extractTextFromLexical } from '@/utils/formatArticle';\nimport { OpinionCard }" }
]);

// 12. scripts/seed-features.ts
replaceInFile('scripts/seed-features.ts', [
  { oldStr: "title: article.title,", newStr: "title: typeof article.title === 'object' ? extractTextFromLexical(article.title) : article.title as any," },
  { oldStr: "import payload", newStr: "import { extractTextFromLexical } from '../utils/formatArticle';\nimport payload" }
]);

// 13. scripts/update-features-images.ts
replaceInFile('scripts/update-features-images.ts', [
  { regex: /\(article\.title as string\)/g, replaceStr: "(typeof article.title === 'string' ? article.title : extractTextFromLexical(article.title))" },
  { oldStr: "import payload", newStr: "import { extractTextFromLexical } from '../utils/formatArticle';\nimport payload" }
]);

console.log("Replacements done");
