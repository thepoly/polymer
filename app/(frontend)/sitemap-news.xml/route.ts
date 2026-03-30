import { getPayload } from 'payload';
import config from '@/payload.config';
import { getArticleUrl } from '@/utils/getArticleUrl';

export const revalidate = 300; // 5 minutes

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://poly.rpi.edu';
  const payload = await getPayload({ config });

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const articles = await payload.find({
    collection: 'articles',
    where: {
      and: [
        { _status: { equals: 'published' } },
        { publishedDate: { greater_than_equal: cutoff } },
      ],
    },
    sort: '-publishedDate',
    limit: 1000,
    select: {
      title: true,
      slug: true,
      section: true,
      publishedDate: true,
      createdAt: true,
    },
  });

  const items = articles.docs
    .filter((doc) => doc.slug && doc.section && doc.title)
    .map((doc) => {
      const url = `${siteUrl}${getArticleUrl(doc)}`;
      const pubDate = new Date(doc.publishedDate || doc.createdAt).toISOString();
      const title = doc.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      return `  <url>
    <loc>${url}</loc>
    <news:news>
      <news:publication>
        <news:name>The Polytechnic</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${title}</news:title>
    </news:news>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
