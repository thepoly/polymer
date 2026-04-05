import fs from 'fs';

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const { oldStr, newStr, regex, replaceStr } of replacements) {
    if (oldStr && newStr) content = content.replace(oldStr, newStr);
    if (regex && replaceStr !== undefined) content = content.replace(regex, replaceStr);
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

replaceInFile('collections/Articles.ts', [
  { oldStr: "const // eslint-disable-next-line @typescript-eslint/no-explicit-any\n            const extractText", newStr: "// eslint-disable-next-line @typescript-eslint/no-explicit-any\n            const extractText" }
]);

replaceInFile('utils/formatArticle.ts', [
  { oldStr: "export function /* eslint-disable @typescript-eslint/no-explicit-any */\nexport function extractTextFromLexical(node: any): string", newStr: "/* eslint-disable @typescript-eslint/no-explicit-any */\nexport function extractTextFromLexical(node: any): string" }
]);

replaceInFile('components/Opinion/OpinionSectionPage.tsx', [
  { oldStr: "import { extractTextFromLexical } from '@/utils/formatArticle';\n\"use client\";", newStr: "\"use client\";\nimport { extractTextFromLexical } from '@/utils/formatArticle';" }
]);

replaceInFile('components/Article/Photofeature/ArticleHeader.tsx', [
  { oldStr: "import { renderLexicalHeadline } from '@/utils/formatArticle';\n'use client';", newStr: "'use client';\nimport { renderLexicalHeadline } from '@/utils/formatArticle';" }
]);

console.log("Syntax fixes applied");