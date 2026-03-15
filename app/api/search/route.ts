import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const payload = await getPayload({ config });

  const result = await payload.find({
    collection: 'articles',
    where: {
      title: { like: q },
    },
    sort: '-publishedDate',
    limit: 8,
    depth: 1,
  });

  const articles = result.docs.map((article) => {
    const dateStr = article.publishedDate || article.createdAt;
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const slug = article.slug || article.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    const url = `/${article.section}/${year}/${month}/${slug}`;

    return {
      id: article.id,
      title: article.title,
      section: article.section,
      url,
    };
  });

  return NextResponse.json(articles);
}
