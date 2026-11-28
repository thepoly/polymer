import { NextRequest, NextResponse } from 'next/server';
import { getPayload, type Where } from 'payload';
import config from '@/payload.config';
import { canManageOpinion } from '@/lib/opinionLayout';

export async function GET(req: NextRequest) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: req.headers });
  if (!canManageOpinion(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const query = (req.nextUrl.searchParams.get('q') || '').trim().slice(0, 100);
  const ids = (req.nextUrl.searchParams.get('ids') || '').split(',').map(Number).filter((id) => Number.isSafeInteger(id) && id > 0).slice(0, 16);
  const result = await payload.find({
    collection: 'users', depth: 0, limit: 30, sort: ['lastName', 'id'],
    overrideAccess: true, // Authorized directory lookup; return only the projection below.
    where: ids.length ? { id: { in: ids } } : query ? { and: query.split(/\s+/).slice(0, 5).map((part): Where => ({ or: [
      { firstName: { contains: part } }, { lastName: { contains: part } },
    ] })) } : undefined,
    select: { firstName: true, lastName: true },
  });
  return NextResponse.json({ docs: result.docs.map(({ id, firstName, lastName }) => ({ id, firstName, lastName })) }, { headers: { 'Cache-Control': 'private, no-store' } });
}
