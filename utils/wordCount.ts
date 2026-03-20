export function calculateWordCount(content: any): number {
  if (!content || !content.root || !content.root.children) {
    return 0;
  }

  let text = "";

  function extractText(node: any) {
    if (node.text) {
      text += " " + node.text;
    }
    if (node.children) {
      node.children.forEach(extractText);
    }
  }

  content.root.children.forEach(extractText);

  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}
