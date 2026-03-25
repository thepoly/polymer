import { NextRequest, NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { getPayload } from 'payload';
import config from '@/payload.config';

type UserWithMeta = {
  roles?: string[];
  section?: string | null;
};

const SECTIONS = ['news', 'features', 'opinion', 'sports'];

function canEditSection(user: UserWithMeta, section: string): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const perms = (user as any).mergedPermissions || {};
  if (perms.admin || perms.manageLayout) return true;
  if (perms.manageSectionArticles && user.section === section) return true;
  return false;
}

/** GET: returns the current section layout data + user's editable sections */
export async function GET() {
  try {
    const payload = await getPayload({ config });
    const hdrs = await nextHeaders();
    const { user } = await payload.auth({ headers: hdrs });

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userMeta = user as unknown as UserWithMeta;
    const editableSections = SECTIONS.filter((s) => canEditSection(userMeta, s));

    if (editableSections.length === 0) {
      return NextResponse.json({ editableSections: [] });
    }

    const layoutRes = await payload.find({
      collection: 'layout',
      limit: 1,
      depth: 0,
      select: { sectionLayouts: true },
    });

    const layout = layoutRes.docs[0];
    const sectionLayouts = (layout as unknown as { sectionLayouts?: Record<string, unknown> })?.sectionLayouts || {};

    return NextResponse.json({
      layoutId: layout?.id,
      editableSections,
      sectionLayouts,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[section-layout GET]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** PATCH: update pinned articles for a specific section */
export async function PATCH(req: NextRequest) {
  try {
    const payload = await getPayload({ config });
    const hdrs = await nextHeaders();
    const { user } = await payload.auth({ headers: hdrs });

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userMeta = user as unknown as UserWithMeta;
    const body = await req.json();
    const { section, pinnedArticles } = body as { section: string; pinnedArticles: number[] };

    if (!section || !SECTIONS.includes(section)) {
      return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
    }

    if (!canEditSection(userMeta, section)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!Array.isArray(pinnedArticles)) {
      return NextResponse.json({ error: 'pinnedArticles must be an array' }, { status: 400 });
    }

    // Get current layout
    const layoutRes = await payload.find({
      collection: 'layout',
      limit: 1,
      depth: 0,
    });

    const layout = layoutRes.docs[0];
    if (!layout) {
      return NextResponse.json({ error: 'No layout found' }, { status: 404 });
    }

    const currentSectionLayouts = (layout as unknown as { sectionLayouts?: Record<string, unknown> }).sectionLayouts || {};

    const updatedSectionLayouts = {
      ...currentSectionLayouts,
      [section]: {
        skeleton: 'taurus',
        pinnedArticles: pinnedArticles.filter((id) => typeof id === 'number' && id > 0),
      },
    };

    await payload.update({
      collection: 'layout',
      id: layout.id,
      data: { sectionLayouts: updatedSectionLayouts } as Record<string, unknown>,
      user,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[section-layout PATCH]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
