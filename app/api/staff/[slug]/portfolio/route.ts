import { NextRequest, NextResponse } from 'next/server';
import { getStaffPortfolioPage, getStaffUserBySlug, STAFF_PORTFOLIO_PAGE_SIZE } from '@/lib/staffProfile';

type RouteArgs = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, { params }: RouteArgs) {
  const { slug } = await params;
  const user = await getStaffUserBySlug(slug);

  if (!user) {
    return NextResponse.json({ error: 'Staff user not found.' }, { status: 404 });
  }

  const pageParam = request.nextUrl.searchParams.get('page');
  const page = Number.parseInt(pageParam || '1', 10);

  if (!Number.isFinite(page) || page < 1) {
    return NextResponse.json({ error: 'Invalid page.' }, { status: 400 });
  }

  const portfolio = await getStaffPortfolioPage(user.id, page, STAFF_PORTFOLIO_PAGE_SIZE);
  return NextResponse.json(portfolio);
}
