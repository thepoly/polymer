import { NextRequest, NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { getPayload } from 'payload';
import config from '@/payload.config';

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config });
    const hdrs = await nextHeaders();
    const { user } = await payload.auth({ headers: hdrs });

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const articleId = Number(req.nextUrl.searchParams.get('id'));
    if (!articleId) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const article = await payload.findByID({
      collection: 'articles',
      id: articleId,
      depth: 0,
      draft: false,
      select: { content: true },
    });

    return NextResponse.json({ content: article.content });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[inline-edit GET] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const payload = await getPayload({ config });
    const hdrs = await nextHeaders();
    const { user } = await payload.auth({ headers: hdrs });

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const perms = (user as any).mergedPermissions || {};
    const canEdit = perms.admin || perms.manageArticles || perms.manageSectionArticles;
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { articleId, ...fields } = body as { articleId: number; [key: string]: unknown };

    if (!articleId || typeof articleId !== 'number') {
      return NextResponse.json({ error: 'articleId is required' }, { status: 400 });
    }

    // Build the update data — only allow safe fields
    const updateData: Record<string, unknown> = {};
    const allowedSimple = ['title', 'subdeck', 'kicker', 'imageCaption'];

    for (const key of allowedSimple) {
      if (key in fields && typeof fields[key] === 'string') {
        updateData[key] = fields[key];
      }
    }

    if ('content' in fields && fields.content && typeof fields.content === 'object') {
      updateData.content = fields.content;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'No changes' });
    }

    const result = await payload.update({
      collection: 'articles',
      id: articleId,
      data: updateData,
      draft: false,
      user,
      overrideAccess: false,
      context: {
        isInlineEdit: true,
      },
    });

    return NextResponse.json({ success: true, id: result.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[inline-edit] Error:', message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
