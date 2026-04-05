import fs from 'fs';

function prependToFile(filePath, text) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes(text)) {
    fs.writeFileSync(filePath, text + "\n" + content, 'utf8');
  }
}

prependToFile('app/(frontend)/staff/[slug]/page.tsx', "import { extractTextFromLexical } from '@/utils/formatArticle';");
prependToFile('components/Article/ArticleRecommendations.tsx', "import { extractTextFromLexical } from '@/utils/formatArticle';");
prependToFile('components/Article/Photofeature/ArticleHeader.tsx', "import { renderLexicalHeadline } from '@/utils/formatArticle';");
prependToFile('components/Dashboard/Todos/TodoRow.tsx', "import { renderLexicalHeadline } from '@/utils/formatArticle';");
prependToFile('components/Opinion/OpinionSectionPage.tsx', "import { extractTextFromLexical } from '@/utils/formatArticle';");
prependToFile('scripts/seed-features.ts', "import { extractTextFromLexical } from '../utils/formatArticle';");
prependToFile('scripts/update-features-images.ts', "import { extractTextFromLexical } from '../utils/formatArticle';");

console.log("Imports added");