import { NextResponse } from 'next/server';
import { getArchiveArticlesForDate, parseArchiveDateKey } from '@/lib/archive';

const responseHeaders = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date || !parseArchiveDateKey(date)) {
    return NextResponse.json({ error: 'A valid date is required.' }, { status: 400 });
  }

  const articles = await getArchiveArticlesForDate(date);
  return NextResponse.json({ date, articles }, { headers: responseHeaders });
}
