import type { PayloadHandler } from 'payload'
import { canEditNews } from './canEditNews'

/**
 * Compare and replace in one SQL statement. Payload's update({ where }) first
 * selects an id and then updates by id, so it cannot provide an atomic revision
 * check. This collection has no versions or change hooks; only its JSON and
 * existing updated_at column are written here. No schema changes are needed.
 */
export const activateNewsLayout: PayloadHandler = async (req) => {
  if (!canEditNews(req.user)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const id = Number(req.routeParams?.id)
  let input: unknown
  try {
    input = await req.json?.()
  } catch {
    return Response.json({ error: 'Invalid activation request' }, { status: 400 })
  }
  const { layout, updatedAt } = (input ?? {}) as { layout?: unknown; updatedAt?: unknown }
  if (
    !Number.isSafeInteger(id) || id < 1 || !layout || typeof layout !== 'object' || Array.isArray(layout) ||
    typeof updatedAt !== 'string' || !Number.isFinite(Date.parse(updatedAt))
  ) {
    return Response.json({ error: 'Invalid activation request' }, { status: 400 })
  }

  const result = await req.payload.db.pool.query<{ updatedAt: Date }>(
    `UPDATE "news_page_layout"
       SET "layout" = $1::jsonb,
           "updated_at" = GREATEST(now(), "updated_at" + interval '1 millisecond')
     WHERE "id" = $2 AND "updated_at" = $3::timestamptz
     RETURNING "updated_at" AS "updatedAt"`,
    [JSON.stringify(layout), id, updatedAt],
  )
  if (result.rows.length === 0) {
    return Response.json(
      { error: 'The layout changed while saving. Your changes are still here; activate again to retry.' },
      { status: 409 },
    )
  }
  return Response.json({ updatedAt: result.rows[0].updatedAt.toISOString() })
}
