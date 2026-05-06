/**
 * Extract plain searchable text from a Lexical content document. Unlike
 * `getPlainText` (which serves the title and concatenates without spacing),
 * this walks paragraph-style nodes and joins them with whitespace so that
 * adjacent paragraphs don't run their words together in the search index.
 *
 * Output is suitable for ILIKE/FTS matching, not display.
 */
type LexicalNode = {
  type?: string
  text?: string
  children?: unknown[]
}

const BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'quote',
  'list',
  'listitem',
  'horizontalrule',
  'linebreak',
])

function isLexicalNode(value: unknown): value is LexicalNode {
  return typeof value === 'object' && value !== null
}

function walk(node: unknown, out: string[]): void {
  if (!isLexicalNode(node)) return
  if (node.type === 'text' && typeof node.text === 'string') {
    out.push(node.text)
    return
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) walk(child, out)
  }
  if (typeof node.type === 'string' && BLOCK_TYPES.has(node.type)) {
    out.push(' ')
  }
}

export function getContentPlainText(content: unknown): string {
  if (!isLexicalNode(content)) return ''
  const root = (content as { root?: unknown }).root
  if (!isLexicalNode(root)) return ''
  const parts: string[] = []
  walk(root, parts)
  return parts.join('').replace(/\s+/g, ' ').trim()
}
