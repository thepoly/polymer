/**
 * HTML -> Lexical converter, scoped to the WP corpus.
 *
 * Why hand-roll this instead of using `convertHTMLToLexical` from
 * `@payloadcms/richtext-lexical`?
 *  - That helper requires a JSDOM-shaped global which we'd have to install
 *    (~30MB) just for the import script.
 *  - WP body HTML carries WP-specific muck (shortcodes, plugin classes,
 *    wp-content URLs, smiley assets, jetpack social icons) that we want to
 *    rewrite or strip before conversion. Doing both passes in one walker is
 *    cleaner than parsing twice.
 *
 * Supported -> Lexical mapping:
 *   <p>           -> paragraph
 *   <br>          -> linebreak
 *   <h2..h4>      -> heading (h1 demoted to h2 since the article title is h1)
 *   <ul>/<ol>/<li>-> list / listitem
 *   <blockquote>  -> quote
 *   <a href>      -> link
 *   <img>         -> paragraph w/ a single text node carrying the alt + a
 *                    link to the image href (we don't have a Media row to
 *                    point a real upload node at; legacy images are served
 *                    statically by the archive proxy).
 *   <b>,<strong>  -> bold format flag
 *   <i>,<em>      -> italic format flag
 *   <u>           -> underline format flag
 *
 * Stripped:
 *   <script>, <style>, <iframe>, <noscript>, <form>
 *   any tag whose class is wp-block-* or wp-caption (we keep the children)
 *   WP shortcodes — see `stripShortcodes` below
 *
 * If conversion produces no content, the caller should fall back to the
 * post excerpt or title.
 */
import { tokenizeHtml } from './html-tokenizer.ts'

// Lexical text-format bit flags.
const FMT_BOLD = 1
const FMT_ITALIC = 2
const FMT_UNDERLINE = 8

type Format = number

type LexNode = {
  type: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any
}

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
const BLOCK_TAGS = new Set(['p', 'div', 'section', 'article', 'aside', 'header', 'footer'])
const SKIP_TAGS = new Set(['script', 'style', 'iframe', 'noscript', 'form', 'svg', 'meta', 'link'])

export type HtmlToLexicalOptions = {
  /** Rewrite an image src to its archived equivalent. Return null to drop the image. */
  rewriteImageSrc?: (src: string) => string | null
  /** Rewrite a hyperlink href. Return null to drop the link wrapper but keep its inner text. */
  rewriteLinkHref?: (href: string) => string | null
}

export type LexicalDoc = {
  root: {
    type: 'root'
    format: ''
    indent: 0
    version: 1
    direction: 'ltr'
    children: LexNode[]
  }
}

/** Build an empty Lexical document. */
export function emptyLexicalDoc(): LexicalDoc {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [],
    },
  }
}

/** Lexical title — single paragraph + single text node. Bold/Italic only. */
export function plainTextTitle(text: string): LexicalDoc {
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
          version: 1,
          direction: 'ltr',
          children: [makeTextNode(text, 0)],
        },
      ],
    },
  }
}

function makeTextNode(text: string, format: Format): LexNode {
  return {
    type: 'text',
    detail: 0,
    format,
    mode: 'normal',
    style: '',
    text,
    version: 1,
  }
}

function makeParagraph(children: LexNode[]): LexNode {
  return {
    type: 'paragraph',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    textFormat: 0,
    textStyle: '',
    children,
  }
}

function makeHeading(tag: string, children: LexNode[]): LexNode {
  return {
    type: 'heading',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    tag,
    children,
  }
}

function makeQuote(children: LexNode[]): LexNode {
  return {
    type: 'quote',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children,
  }
}

function makeList(listType: 'bullet' | 'number', children: LexNode[]): LexNode {
  return {
    type: 'list',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    listType,
    start: 1,
    tag: listType === 'bullet' ? 'ul' : 'ol',
    children,
  }
}

function makeListItem(children: LexNode[], value: number): LexNode {
  return {
    type: 'listitem',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    value,
    children,
  }
}

function makeLink(url: string, children: LexNode[]): LexNode {
  return {
    type: 'link',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    fields: {
      linkType: 'custom',
      newTab: false,
      url,
    },
    children,
  }
}

function makeLineBreak(): LexNode {
  return { type: 'linebreak', version: 1 }
}

/**
 * Convert WP-style HTML to a Lexical document JSON.
 */
export function convertHtmlToLexical(rawHtml: string, opts: HtmlToLexicalOptions = {}): LexicalDoc {
  // Normalize and pre-process: strip shortcodes, drop undesirable plugin
  // markup, and run wpautop if there are no <p> tags (raw post_content).
  const cleaned = preprocessWpHtml(rawHtml)
  const tokens = [...tokenizeHtml(cleaned)]

  // The converter consumes tokens and emits a sequence of top-level block
  // nodes. We track an inline format stack for nested <strong>/<em>/<u>
  // and an "active block" so loose inline tokens get wrapped in paragraphs.
  const root: LexNode[] = []
  let inlineBuffer: LexNode[] = []
  const blockStack: { tag: string; node: LexNode; targetChildren: LexNode[] }[] = []
  const formatStack: Format[] = [0]
  // Suppression stack: counts how deep we are inside elements we want to skip
  // entirely (script/style/iframe/etc.) — > 0 means drop everything.
  let suppress = 0
  // Stack of "transparent" wrappers that don't introduce a block (div/span
  // without semantic meaning). We track them so we can correctly pop on close.
  const transparentStack: string[] = []

  const currentFormat = (): Format => formatStack[formatStack.length - 1]

  const flushInline = () => {
    if (inlineBuffer.length === 0) return
    if (blockStack.length > 0) {
      blockStack[blockStack.length - 1].targetChildren.push(...inlineBuffer)
    } else {
      root.push(makeParagraph(inlineBuffer))
    }
    inlineBuffer = []
  }

  const pushBlock = (node: LexNode, tag: string, targetChildren?: LexNode[]) => {
    flushInline()
    if (blockStack.length > 0) {
      blockStack[blockStack.length - 1].targetChildren.push(node)
    } else {
      root.push(node)
    }
    blockStack.push({ tag, node, targetChildren: targetChildren ?? node.children })
  }

  const popBlockUntil = (tag: string) => {
    flushInline()
    // Close blocks until we pop one matching `tag`.
    while (blockStack.length > 0) {
      const top = blockStack.pop()!
      if (top.tag === tag) return
    }
  }

  // Track open links separately because they're inline, not block, but they
  // wrap subsequent inline text.
  const linkStack: LexNode[] = []
  const pushInlineNode = (node: LexNode) => {
    if (linkStack.length > 0) {
      linkStack[linkStack.length - 1].children.push(node)
    } else {
      inlineBuffer.push(node)
    }
  }

  const handleText = (raw: string) => {
    if (!raw) return
    // Collapse runs of whitespace inside text nodes — WP HTML often has
    // newlines and tabs inserted by wpautop. We preserve a single space.
    // Note: we do NOT trim; leading/trailing spaces matter for "Hello <b>world</b>!"
    const text = raw.replace(/[\t \f\v]+/g, ' ').replace(/\r/g, '').replace(/\n+/g, '\n')
    if (!text) return
    pushInlineNode(makeTextNode(text, currentFormat()))
  }

  for (const tok of tokens) {
    if (suppress > 0) {
      if (tok.kind === 'open' && !tok.selfClosing && !VOID(tok.name)) suppress++
      else if (tok.kind === 'close') suppress = Math.max(0, suppress - 1)
      continue
    }
    if (tok.kind === 'comment') continue
    if (tok.kind === 'text') {
      handleText(tok.value)
      continue
    }
    if (tok.kind === 'open') {
      const name = tok.name
      if (SKIP_TAGS.has(name)) {
        if (!tok.selfClosing) suppress++
        continue
      }
      // <br>
      if (name === 'br') {
        pushInlineNode(makeLineBreak())
        continue
      }
      // <img>
      if (name === 'img') {
        const src = tok.attrs.src || ''
        if (!src) continue
        const rewritten = opts.rewriteImageSrc ? opts.rewriteImageSrc(src) : src
        if (!rewritten) continue
        const alt = tok.attrs.alt || ''
        // Render as a paragraph containing a link to the image with the alt
        // text (or the filename) as visible content. This is a deliberate
        // degraded representation: full Upload nodes require Media rows we
        // don't have for the legacy corpus.
        flushInline()
        const label = alt.trim() || basename(rewritten) || 'image'
        const linkNode = makeLink(rewritten, [makeTextNode(label, FMT_ITALIC)])
        if (blockStack.length > 0) {
          blockStack[blockStack.length - 1].targetChildren.push(makeParagraph([linkNode]))
        } else {
          root.push(makeParagraph([linkNode]))
        }
        continue
      }
      // Inline format tags — push onto the format stack.
      if (name === 'strong' || name === 'b') {
        formatStack.push(currentFormat() | FMT_BOLD)
        if (tok.selfClosing) formatStack.pop()
        continue
      }
      if (name === 'em' || name === 'i' || name === 'cite') {
        formatStack.push(currentFormat() | FMT_ITALIC)
        if (tok.selfClosing) formatStack.pop()
        continue
      }
      if (name === 'u') {
        formatStack.push(currentFormat() | FMT_UNDERLINE)
        if (tok.selfClosing) formatStack.pop()
        continue
      }
      // <a>
      if (name === 'a') {
        let href = tok.attrs.href || ''
        if (opts.rewriteLinkHref) {
          const r = opts.rewriteLinkHref(href)
          if (r === null) {
            // Drop the link wrapper but keep inline content.
            transparentStack.push('a')
            continue
          }
          href = r
        }
        if (!href) {
          transparentStack.push('a')
          continue
        }
        const link = makeLink(href, [])
        // Attach to the current container immediately so its children flow
        // in via the inline buffer redirect.
        if (linkStack.length > 0) {
          linkStack[linkStack.length - 1].children.push(link)
        } else {
          inlineBuffer.push(link)
        }
        linkStack.push(link)
        continue
      }
      // <p>, <div>, etc.
      if (BLOCK_TAGS.has(name)) {
        // For <div> with WP layout classes, fall through to transparent.
        const cls = (tok.attrs.class || '').toLowerCase()
        if (
          name === 'div' &&
          /(wp-block|wp-caption|gallery|sharedaddy|jp-relatedposts|wp-embed|crayon|epyt-)/.test(cls)
        ) {
          transparentStack.push(name)
          continue
        }
        // <p> always opens a paragraph block. Other block tags become
        // paragraphs too if they contain inline content.
        flushInline()
        const node = makeParagraph([])
        pushBlock(node, name)
        continue
      }
      if (HEADING_TAGS.has(name)) {
        flushInline()
        const tag = name === 'h1' ? 'h2' : name // h1 demoted (article title is h1)
        const node = makeHeading(tag, [])
        pushBlock(node, name)
        continue
      }
      if (name === 'blockquote') {
        flushInline()
        const node = makeQuote([])
        pushBlock(node, name)
        continue
      }
      if (name === 'ul' || name === 'ol') {
        flushInline()
        const node = makeList(name === 'ol' ? 'number' : 'bullet', [])
        pushBlock(node, name)
        continue
      }
      if (name === 'li') {
        flushInline()
        // Determine value within the parent list.
        const parent = blockStack[blockStack.length - 1]
        const value = parent && (parent.tag === 'ul' || parent.tag === 'ol')
          ? (parent.targetChildren.length + 1)
          : 1
        const node = makeListItem([], value)
        pushBlock(node, name)
        continue
      }
      // Unknown / unhandled element — treat as transparent (process children
      // as inline). We record in `transparentStack` so we can ignore the
      // matching close tag without affecting block state.
      transparentStack.push(name)
      continue
    }
    if (tok.kind === 'close') {
      const name = tok.name
      if (SKIP_TAGS.has(name)) continue
      if (name === 'br' || name === 'img') continue
      if (name === 'strong' || name === 'b' || name === 'em' || name === 'i' || name === 'u' || name === 'cite') {
        if (formatStack.length > 1) formatStack.pop()
        continue
      }
      if (name === 'a') {
        // If we suppressed this <a> via rewriteLinkHref, pop transparent.
        if (transparentStack[transparentStack.length - 1] === 'a') {
          transparentStack.pop()
          continue
        }
        if (linkStack.length > 0) linkStack.pop()
        continue
      }
      if (BLOCK_TAGS.has(name) || HEADING_TAGS.has(name) || name === 'blockquote' || name === 'ul' || name === 'ol' || name === 'li') {
        // If a transparent wrapper is on top with this name, pop it instead.
        if (transparentStack[transparentStack.length - 1] === name) {
          transparentStack.pop()
          continue
        }
        popBlockUntil(name)
        continue
      }
      // Otherwise it's a transparent close.
      const idx = transparentStack.lastIndexOf(name)
      if (idx !== -1) transparentStack.splice(idx, 1)
      continue
    }
  }

  flushInline()
  while (blockStack.length > 0) blockStack.pop()

  // Trim empty paragraphs at the start/end. WP often produces leading/trailing
  // empty paragraphs (just whitespace) which look ugly in Payload's editor.
  trimEmptyEdges(root)

  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: root,
    },
  }
}

function VOID(name: string): boolean {
  return name === 'br' || name === 'img' || name === 'hr' || name === 'meta' || name === 'link' || name === 'input' || name === 'source'
}

function basename(url: string): string {
  const m = url.match(/\/([^/?#]+)(?:[?#]|$)/)
  return m ? m[1] : ''
}

function trimEmptyEdges(nodes: LexNode[]): void {
  const isEmpty = (n: LexNode): boolean => {
    if (n.type !== 'paragraph') return false
    if (!Array.isArray(n.children) || n.children.length === 0) return true
    return n.children.every(
      (c: LexNode) => c.type === 'text' && (typeof c.text !== 'string' || c.text.trim() === ''),
    )
  }
  while (nodes.length && isEmpty(nodes[0])) nodes.shift()
  while (nodes.length && isEmpty(nodes[nodes.length - 1])) nodes.pop()
}

/**
 * Pre-process WP HTML before tokenizing:
 *   - Strip / unwrap WP shortcodes
 *   - Drop common WP plugin junk (jetpack share, sharedaddy, related posts)
 *   - If there are no `<p>` tags, run a minimal wpautop pass (WP normally
 *     applies wpautop on render, so raw `post_content` looks empty without
 *     it).
 */
export function preprocessWpHtml(input: string): string {
  let s = input || ''

  // Strip BOMs / null chars.
  s = s.replace(/ /g, '')

  // ===== WP shortcodes =====
  // [caption id="..." align="..." width="..."]<img.../>caption text[/caption]
  // We unwrap to <figure>-equivalent: the img + an italic paragraph for the caption.
  s = s.replace(
    /\[caption[^\]]*\]([\s\S]*?)\[\/caption\]/g,
    (_full, inner: string) => {
      // Try to split into img portion and trailing caption text.
      const imgMatch = inner.match(/<img[^>]*>/i)
      if (!imgMatch) return inner
      const img = imgMatch[0]
      const caption = inner.replace(img, '').replace(/<a [^>]*>|<\/a>/gi, '').trim()
      if (caption) {
        return `${img}\n<p><em>${caption}</em></p>`
      }
      return img
    },
  )

  // [gallery ids="1,2,3"] -> drop entirely (gallery rendering is too complex
  // for the legacy import; the source images are still served from the mirror).
  s = s.replace(/\[gallery[^\]]*\]/gi, '')

  // [embed]URL[/embed] -> linkified URL
  s = s.replace(/\[embed[^\]]*\]([\s\S]*?)\[\/embed\]/gi, (_full, url: string) => {
    const u = url.trim()
    return u ? `<p><a href="${u}">${u}</a></p>` : ''
  })

  // [audio src="..."] / [video src="..."] / [playlist] / [rss]: drop
  s = s.replace(/\[(?:audio|video|playlist|rss)[^\]]*\]/gi, '')
  s = s.replace(/\[\/(?:audio|video|playlist|rss)\]/gi, '')

  // Other unknown shortcodes — strip the brackets but keep text.
  // [foo bar="baz"] -> ''
  // [/foo] -> ''
  s = s.replace(/\[\/?[a-zA-Z][a-zA-Z0-9_:-]*[^\]]*\]/g, '')

  // ===== WP plugin junk =====
  // jetpack-related-posts, sharedaddy, etc. — generally rendered as <div class="...">.
  // We rely on the block-tag walker to drop divs with these classes; here we
  // additionally remove JetpackRelatedPosts placeholder comments.
  s = s.replace(/<!--\s*jetpack-related-posts\s*-->/gi, '')

  // Strip <script>/<style>/<iframe> blocks completely (the tokenizer does this
  // too via SKIP_TAGS, but doing it here keeps the wpautop pass from acting
  // on script bodies). Loop because nested/sequential blocks need multiple
  // passes; close-tag pattern allows whitespace before the '>'.
  let prev: string
  do {
    prev = s
    s = s.replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    s = s.replace(/<style\b[\s\S]*?<\/style\s*>/gi, '')
    s = s.replace(/<iframe\b[\s\S]*?<\/iframe\s*>/gi, '')
  } while (s !== prev)
  // Drop any unmatched/unterminated remnants so partial tags can't slip through.
  s = s.replace(/<\/?(script|style|iframe)\b[^>]*>/gi, '')

  // ===== wpautop =====
  // If there are no <p> tags AND the HTML has blank-line separated text
  // chunks, wrap them. WP's real wpautop is more elaborate; this is a
  // minimal version that handles the bulk of post_content.
  if (!/<p[\s>]/i.test(s)) {
    s = wpautop(s)
  }

  return s
}

/** Minimal WP wpautop: split on double-newlines, wrap each chunk in <p>. */
function wpautop(input: string): string {
  // Normalize line endings.
  const text = input.replace(/\r\n?/g, '\n')
  // Split on 2+ newlines into paragraphs, then convert single newlines to <br>.
  const paragraphs = text.split(/\n{2,}/).map((para) => para.trim()).filter(Boolean)
  return paragraphs
    .map((p) => {
      // If the paragraph already starts with a block-level tag, leave as-is.
      if (/^<(?:h[1-6]|ul|ol|li|blockquote|pre|table|hr|figure|div)\b/i.test(p)) return p
      const withBreaks = p.replace(/\n/g, '<br>')
      return `<p>${withBreaks}</p>`
    })
    .join('\n\n')
}

/** Plain-text extraction (for fallback/empty checks). */
export function lexicalToPlainText(doc: LexicalDoc): string {
  const out: string[] = []
  const walk = (node: LexNode) => {
    if (node.type === 'text' && typeof node.text === 'string') out.push(node.text)
    if (Array.isArray(node.children)) for (const c of node.children) walk(c)
  }
  for (const c of doc.root.children) walk(c)
  return out.join('').trim()
}
