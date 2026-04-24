import { getPayload } from 'payload'
import config from '@/payload.config'
import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { getArticleUrl } from '@/utils/getArticleUrl'
import { getPlainText } from '@/utils/getPlainText'
import { getSeo } from '@/lib/getSeo'
import type { Article, Media, User } from '@/payload-types'

export const revalidate = 300

const FALLBACK_SITE_URL = 'https://poly.rpi.edu'

function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_SITE_URL
  return raw.replace(/\/+$/, '')
}

function toAbsoluteUrl(url: string | null | undefined, siteUrl: string): string | null {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('//')) return `https:${url}`
  if (url.startsWith('/')) return `${siteUrl}${url}`
  return `${siteUrl}/${url}`
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function safeCdata(value: string): string {
  // Split any ]]> sequence so it can't terminate our CDATA block
  return value.split(']]>').join(']]]]><![CDATA[>')
}

function toRfc822(date: string | Date | null | undefined): string {
  const d = date ? new Date(date) : new Date()
  if (isNaN(d.getTime())) return new Date().toUTCString()
  return d.toUTCString()
}

function rewriteRelativeImageUrls(html: string, siteUrl: string): string {
  // Rewrite src="/..." and srcset entries with relative URLs to absolute.
  // Keep absolute http(s):// and protocol-relative //... untouched.
  const rewriteSrc = (attr: 'src' | 'href') =>
    new RegExp(`(${attr}\\s*=\\s*")(\\/[^"\\s]*)(")`, 'gi')

  let out = html.replace(rewriteSrc('src'), (_m, p1, p2, p3) => `${p1}${siteUrl}${p2}${p3}`)
  out = out.replace(rewriteSrc('href'), (_m, p1, p2, p3) => `${p1}${siteUrl}${p2}${p3}`)

  // srcset="url1 1x, url2 2x" — rewrite each leading relative URL
  out = out.replace(/(srcset\s*=\s*")([^"]*)(")/gi, (_m, open, value: string, close) => {
    const parts = value.split(',').map((entry) => {
      const trimmed = entry.trim()
      if (!trimmed) return trimmed
      const [url, ...rest] = trimmed.split(/\s+/)
      if (!url) return trimmed
      if (/^https?:\/\//i.test(url) || url.startsWith('//')) return trimmed
      if (url.startsWith('/')) {
        return [`${siteUrl}${url}`, ...rest].join(' ')
      }
      return trimmed
    })
    return `${open}${parts.join(', ')}${close}`
  })

  return out
}

function authorsFor(article: Article): string[] {
  const staffNames = (article.authors || [])
    .map((author) => {
      if (!author || typeof author === 'number') return ''
      const u = author as User
      const first = u.firstName || ''
      const last = u.lastName || ''
      return `${first} ${last}`.trim()
    })
    .filter(Boolean)

  const writeInNames = (article.writeInAuthors || [])
    .map((a) => a?.name || '')
    .filter(Boolean)

  return [...staffNames, ...writeInNames]
}

function featuredImageFor(article: Article): Media | null {
  const fi = article.featuredImage
  if (!fi || typeof fi === 'number') return null
  return fi
}

export async function GET(): Promise<Response> {
  const siteUrl = getSiteUrl()
  const feedUrl = `${siteUrl}/feed`

  const seo = await getSeo()

  const payload = await getPayload({ config })
  const res = await payload.find({
    collection: 'articles',
    where: { _status: { equals: 'published' } },
    sort: '-publishedDate',
    limit: 50,
    depth: 2,
  })

  const channelTitle = escapeXml(seo.siteIdentity.siteName || 'The Polytechnic')
  const channelDescription = escapeXml(
    seo.siteIdentity.defaultDescription ||
      "The Polytechnic is Rensselaer Polytechnic Institute's student run newspaper.",
  )
  const channelLink = escapeXml(siteUrl)
  const channelSelf = escapeXml(feedUrl)
  const logoUrl = `${siteUrl}/logo-light.svg`

  const mostRecentPub =
    res.docs
      .map((a) => a.publishedDate)
      .filter((d): d is string => !!d)
      .map((d) => new Date(d).getTime())
      .sort((a, b) => b - a)[0] ?? Date.now()
  const lastBuildDate = toRfc822(new Date(mostRecentPub))

  const items: string[] = []

  for (const article of res.docs) {
    if (!article.slug || !article.section) continue

    const articlePath = getArticleUrl(article)
    if (articlePath === '#') continue
    const articleUrl = `${siteUrl}${articlePath}`

    const title = getPlainText(article.title) || 'Untitled'
    const pubDate = toRfc822(article.publishedDate || article.createdAt)
    const authors = authorsFor(article)
    const subdeck = article.subdeck || ''
    const featured = featuredImageFor(article)
    const featuredUrl = featured ? toAbsoluteUrl(featured.url, siteUrl) : null
    const featuredAlt = featured?.title || featured?.alt || title

    // Build content:encoded body HTML. Prepend featured image so readers that
    // only render content:encoded still see it.
    let bodyHtml = ''
    if (featuredUrl) {
      const imgAlt = escapeXml(featuredAlt)
      const captionHtml = article.imageCaption
        ? `<figcaption>${escapeXml(article.imageCaption)}</figcaption>`
        : ''
      bodyHtml += `<figure><img src="${escapeXml(featuredUrl)}" alt="${imgAlt}" />${captionHtml}</figure>`
    }

    if (article.content) {
      try {
        const html = convertLexicalToHTML({
          data: article.content as SerializedEditorState,
          disableContainer: true,
        })
        bodyHtml += rewriteRelativeImageUrls(html, siteUrl)
      } catch (err) {
        console.error('[feed] failed to convert lexical content', {
          articleId: article.id,
          error: err,
        })
      }
    }

    // Enclosure / media:content
    let enclosureTag = ''
    let mediaContentTag = ''
    if (featuredUrl) {
      const mime = featured?.mimeType || 'image/jpeg'
      const length = featured?.filesize ? ` length="${featured.filesize}"` : ''
      enclosureTag = `    <enclosure url="${escapeXml(featuredUrl)}" type="${escapeXml(mime)}"${length} />\n`
      const width = featured?.width ? ` width="${featured.width}"` : ''
      const height = featured?.height ? ` height="${featured.height}"` : ''
      mediaContentTag = `    <media:content url="${escapeXml(featuredUrl)}" medium="image" type="${escapeXml(mime)}"${width}${height} />\n`
    }

    const creators = authors.length > 0 ? authors : ['The Polytechnic']
    const creatorTags = creators
      .map((name) => `    <dc:creator>${escapeXml(name)}</dc:creator>`)
      .join('\n')

    items.push(
      `  <item>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(articleUrl)}</link>
    <guid isPermaLink="true">${escapeXml(articleUrl)}</guid>
    <pubDate>${pubDate}</pubDate>
    <description>${escapeXml(subdeck)}</description>
    <category>${escapeXml(article.section)}</category>
${creatorTags}
    <content:encoded><![CDATA[${safeCdata(bodyHtml)}]]></content:encoded>
${enclosureTag}${mediaContentTag}  </item>`,
    )
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${channelTitle}</title>
    <link>${channelLink}</link>
    <description>${channelDescription}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link rel="self" type="application/rss+xml" href="${channelSelf}" />
    <image>
      <url>${escapeXml(logoUrl)}</url>
      <title>${channelTitle}</title>
      <link>${channelLink}</link>
    </image>
${items.join('\n')}
  </channel>
</rss>
`

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
