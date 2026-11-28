import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { canManageOpinion } from '@/lib/opinionLayout';
import { opinionCardSelect } from '@/lib/opinionArticles';
import { opinionPageNumber } from '@/lib/opinionPagination';

export async function GET(req: NextRequest) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: req.headers });
  if (!canManageOpinion(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const query = (req.nextUrl.searchParams.get('q') || '').trim().slice(0, 150);
  const ids = (req.nextUrl.searchParams.get('ids') || '').split(',').map(Number).filter((id) => Number.isSafeInteger(id) && id > 0).slice(0, 63);
  const result = await payload.find({
    collection: 'articles', overrideAccess: true, depth: 1,
    page: ids.length ? 1 : opinionPageNumber(req.nextUrl.searchParams.get('page') || undefined),
    limit: ids.length || 30, sort: ['-publishedDate', '-id'],
    where: { and: [
      { section: { equals: 'opinion' } }, { _status: { equals: 'published' } },
      ...(ids.length ? [{ id: { in: ids } }] : query ? [{ plainTitle: { contains: query } }] : []),
    ] },
    select: { ...opinionCardSelect, plainTitle: true },
    populate: { users: { firstName: true, lastName: true }, media: { url: true, filename: true, sourceUrl: true, width: true, height: true, focalX: true, focalY: true } },
  });
  const docs = result.docs.map((a) => ({
    id: a.id, title: a.title, plainTitle: a.plainTitle, slug: a.slug, section: a.section,
    publishedDate: a.publishedDate, createdAt: a.createdAt,
    // id, size and focal point: dropping a story on the guest-writer photo slot uses its photo
    featuredImage: a.featuredImage && typeof a.featuredImage === 'object'
      ? { id: a.featuredImage.id, url: a.featuredImage.url, width: a.featuredImage.width, height: a.featuredImage.height, focalX: a.featuredImage.focalX, focalY: a.featuredImage.focalY }
      : null,
    authors: (a.authors || []).flatMap((u) => typeof u === 'object' && u ? [{ firstName: u.firstName, lastName: u.lastName }] : []),
    writeInAuthors: (a.writeInAuthors || []).map((u) => ({ name: u.name })),
  }));
  return NextResponse.json({ docs, hasNextPage: result.hasNextPage }, { headers: { 'Cache-Control': 'private, no-store' } });
}
