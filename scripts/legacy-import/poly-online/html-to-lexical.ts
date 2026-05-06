/**
 * Minimal HTML to Lexical Serialized Editor State converter.
 *
 * Why hand-rolled?
 *   The bundled @payloadcms/richtext-lexical `convertHTMLToLexical` requires
 *   `JSDOM`, which is not a polymer dependency. Adding 30MB of test infra to
 *   ship a one-shot import script is overkill, and the legacy poly-online HTML
 *   has a constrained tag vocabulary (mostly <p>, <br>, <b>, <i>, <font>,
 *   <a>, <img>) that we can parse confidently with a small state machine.
 *
 * Output schema matches Payload's lexical default node set:
 *   root -> paragraph[] -> (text | link)
 *
 * Image handling: <img> tags with archive-relative or VM-absolute paths get
 * rewritten to /archive/polytechnic-online/images/<path>. Because polymer
 * Lexical images require a Media collection upload reference, we cannot emit
 * a "real" Lexical upload node at import time. Instead we drop body images
 * and leave a small `[image: alt]` marker so editorial review can re-attach
 * them later. The original article remains accessible via legacyHtmlUrl.
 */

export type LexicalNode = Record<string, unknown>

type TextFormat = number
const FORMAT_BOLD = 1
const FORMAT_ITALIC = 2

const CHROME_GIF_PREFIXES = [
  'banner_',
  'front_',
  'news_',
  'edop_',
  'features_',
  'sports_',
  'comics_',
  'classifieds_',
  'archives_',
  'thepoly_',
  'contactus_',
  'advertise_',
  'rpi_',
  'blotter_',
  'whats_',
  'scoreboard_',
]
const CHROME_GIF_NAMES = new Set([
  'hr_black.gif',
  'spacer.gif',
  'thisweek.gif',
  'go.gif',
  'weather.gif',
  'bottom_left.gif',
  'bottom_right.gif',
])

/**
 * Returns true if the given image src is page chrome (banner, hr, spacer, etc.)
 * and should be dropped.
 */
export function isChromeImage(src: string): boolean {
  const trimmed = src.trim()
  // VM-absolute URLs to /images/<path> are content; the rule says only bare
  // names (no path component) are chrome.
  const isBare = !trimmed.includes('/')
  if (!isBare) return false
  if (CHROME_GIF_NAMES.has(trimmed)) return true
  for (const p of CHROME_GIF_PREFIXES) {
    if (trimmed.startsWith(p) && trimmed.endsWith('.gif')) return true
  }
  if (/_on\.gif$|_off\.gif$/.test(trimmed)) return true
  return false
}

/**
 * Rewrite a content image src to its served polymer path, or return null if
 * the image should be dropped.
 */
export function rewriteImageSrc(src: string): string | null {
  const s = src.trim()
  if (!s) return null
  if (isChromeImage(s)) return null

  const vmMatch = s.match(/^https?:\/\/10\.10\.10\.17\/images\/(.+)$/i)
  if (vmMatch) return `/archive/polytechnic-online/images/${vmMatch[1]}`

  if (/^images\//i.test(s)) return `/archive/polytechnic-online/${s}`

  if (/^\/images\//i.test(s)) return `/archive/polytechnic-online${s}`

  return null
}

/**
 * Decode HTML entities commonly found in poly-online bodies.
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&hellip;/g, '…')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&lsquo;/g, '‘')
    .replace(/&rsquo;/g, '’')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú')
    .replace(/&ntilde;/gi, 'ñ')
    .replace(/&ccedil;/gi, 'ç')
    .replace(/&[a-z][a-z0-9]+;/gi, ' ')
}

// ===== Tokenizer =====

type Token =
  | { kind: 'text'; value: string }
  | { kind: 'open'; name: string; attrs: Record<string, string>; selfClosing: boolean }
  | { kind: 'close'; name: string }

function tokenize(html: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  const n = html.length
  while (i < n) {
    const lt = html.indexOf('<', i)
    if (lt < 0) {
      tokens.push({ kind: 'text', value: html.slice(i) })
      break
    }
    if (lt > i) tokens.push({ kind: 'text', value: html.slice(i, lt) })

    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4)
      i = end < 0 ? n : end + 3
      continue
    }

    const gt = html.indexOf('>', lt)
    if (gt < 0) {
      tokens.push({ kind: 'text', value: html.slice(lt) })
      break
    }
    const inner = html.slice(lt + 1, gt).trim()
    if (inner.startsWith('/')) {
      tokens.push({ kind: 'close', name: inner.slice(1).split(/\s+/)[0].toLowerCase() })
    } else {
      const selfClosing = inner.endsWith('/')
      const cleaned = selfClosing ? inner.slice(0, -1).trim() : inner
      const firstSpace = cleaned.search(/\s/)
      const name = (firstSpace < 0 ? cleaned : cleaned.slice(0, firstSpace)).toLowerCase()
      const rest = firstSpace < 0 ? '' : cleaned.slice(firstSpace + 1)
      const attrs = parseAttrs(rest)
      tokens.push({ kind: 'open', name, attrs, selfClosing })
    }
    i = gt + 1
  }
  return tokens
}

function parseAttrs(str: string): Record<string, string> {
  const out: Record<string, string> = {}
  const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g
  let part: RegExpExecArray | null
  while ((part = attrRe.exec(str)) !== null) {
    const key = part[1].toLowerCase()
    const val = part[2] ?? part[3] ?? part[4] ?? ''
    out[key] = decodeEntities(val)
  }
  return out
}

// ===== Lexical builders =====

function makeText(text: string, format: TextFormat = 0): LexicalNode {
  return {
    type: 'text',
    format,
    mode: 'normal',
    style: '',
    text,
    detail: 0,
    version: 1,
  }
}

function makeLink(url: string, children: LexicalNode[]): LexicalNode {
  return {
    type: 'link',
    fields: { linkType: 'custom', newTab: true, url },
    format: '',
    indent: 0,
    direction: 'ltr',
    version: 3,
    children,
  }
}

function makeParagraph(children: LexicalNode[]): LexicalNode {
  return {
    type: 'paragraph',
    format: '',
    indent: 0,
    direction: 'ltr',
    textFormat: 0,
    textStyle: '',
    version: 1,
    children,
  }
}

export function blankParagraph(): LexicalNode {
  return makeParagraph([])
}

// ===== Converter =====

/**
 * Convert one body HTML string to a Lexical paragraph[] node list.
 * Returns an array of paragraph (or other block) nodes ready to slot under root.
 */
export function htmlToLexicalBlocks(html: string): LexicalNode[] {
  const tokens = tokenize(html)

  const paragraphs: LexicalNode[][] = [[]]
  let format: TextFormat = 0
  const linkStack: string[] = []

  function currentChildren(): LexicalNode[] {
    return paragraphs[paragraphs.length - 1]
  }

  function pushText(raw: string) {
    const decoded = decodeEntities(raw)
    const collapsed = decoded.replace(/\s+/g, ' ')
    if (!collapsed) return
    const textNode = makeText(collapsed, format)
    if (linkStack.length > 0) {
      const url = linkStack[linkStack.length - 1]
      if (url === '__SKIP__') {
        currentChildren().push(textNode)
        return
      }
      const children = currentChildren()
      const last = children[children.length - 1] as LexicalNode | undefined
      if (last && last.type === 'link' && (last.fields as { url?: string })?.url === url) {
        ;(last.children as LexicalNode[]).push(textNode)
        return
      }
      children.push(makeLink(url, [textNode]))
      return
    }
    currentChildren().push(textNode)
  }

  function newParagraph() {
    if (paragraphs[paragraphs.length - 1].length === 0) return
    paragraphs.push([])
  }

  for (const tok of tokens) {
    if (tok.kind === 'text') {
      pushText(tok.value)
      continue
    }
    if (tok.kind === 'open') {
      switch (tok.name) {
        case 'p':
        case 'br':
          newParagraph()
          break
        case 'b':
        case 'strong':
          format |= FORMAT_BOLD
          break
        case 'i':
        case 'em':
          format |= FORMAT_ITALIC
          break
        case 'a': {
          const href = tok.attrs.href || ''
          if (href && !href.startsWith('#') && !href.toLowerCase().startsWith('javascript:')) {
            linkStack.push(href)
          } else {
            linkStack.push('__SKIP__')
          }
          break
        }
        case 'img': {
          const src = tok.attrs.src || ''
          const rewritten = rewriteImageSrc(src)
          const alt = tok.attrs.alt || ''
          if (rewritten) {
            const marker = `[image: ${alt || rewritten}]`
            pushText(marker)
          }
          break
        }
        case 'font':
        case 'span':
        case 'center':
        case 'div':
        case 'tr':
        case 'td':
        case 'tbody':
        case 'thead':
          break
        case 'ul':
        case 'ol':
        case 'li':
          if (tok.name === 'li') newParagraph()
          break
        case 'table':
        case 'hr':
          newParagraph()
          break
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          newParagraph()
          format |= FORMAT_BOLD
          break
        default:
          break
      }
      continue
    }
    switch (tok.name) {
      case 'p':
        newParagraph()
        break
      case 'b':
      case 'strong':
        format &= ~FORMAT_BOLD
        break
      case 'i':
      case 'em':
        format &= ~FORMAT_ITALIC
        break
      case 'a':
        linkStack.pop()
        break
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        format &= ~FORMAT_BOLD
        newParagraph()
        break
      case 'li':
      case 'table':
      case 'tr':
        newParagraph()
        break
      default:
        break
    }
  }

  const blocks: LexicalNode[] = []
  for (const children of paragraphs) {
    if (children.length === 0) continue
    blocks.push(makeParagraph(children))
  }
  return blocks
}

/**
 * Build a Lexical editor state from a list of body HTML strings (one per
 * legacy article part). A blank paragraph separator is inserted between parts.
 * If `partTitles` is provided and any are non-empty, they are emitted as bold
 * paragraphs leading the corresponding part.
 */
export function buildContentEditorState(
  parts: string[],
  partTitles: string[] = [],
  fallback?: string,
): { root: LexicalNode } {
  const blocks: LexicalNode[] = []
  for (let i = 0; i < parts.length; i++) {
    const html = parts[i] || ''
    const title = (partTitles[i] || '').trim()
    if (title) {
      blocks.push(makeParagraph([makeText(title, FORMAT_BOLD)]))
    }
    const partBlocks = htmlToLexicalBlocks(html)
    blocks.push(...partBlocks)
    if (i < parts.length - 1) {
      blocks.push(blankParagraph())
    }
  }

  if (blocks.length === 0) {
    if (fallback && fallback.trim()) {
      blocks.push(makeParagraph([makeText(decodeEntities(fallback))]))
    } else {
      blocks.push(makeParagraph([]))
    }
  }

  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: blocks,
    },
  }
}

/**
 * Build the title editor state — single paragraph, single text node, with the
 * Bold/Italic features the title editor supports.
 */
export function buildTitleEditorState(headline: string): { root: LexicalNode } {
  const decoded = decodeEntities(headline).replace(/\s+/g, ' ').trim() || 'Untitled'
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          direction: 'ltr',
          textFormat: 0,
          textStyle: '',
          version: 1,
          children: [makeText(decoded)],
        },
      ],
    },
  }
}

export function plainTitleFrom(headline: string): string {
  return decodeEntities(headline).replace(/\s+/g, ' ').trim() || 'Untitled'
}
