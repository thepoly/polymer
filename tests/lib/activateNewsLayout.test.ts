import type { PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'
import { activateNewsLayout } from '@/lib/activateNewsLayout'

const revision = '2026-11-17T12:00:00.000Z'
const request = (query: unknown, input: unknown, user: unknown = { roles: ['editor'], section: 'news' }) => ({
  user, routeParams: { id: '1' }, json: async () => input, payload: { db: { pool: { query } } },
}) as unknown as PayloadRequest

describe('atomic layout activation', () => {
  it('rejects unauthorized users before accessing the database', async () => {
    const query = vi.fn()
    for (const user of [null, { roles: ['editor'], section: 'sports' }]) {
      expect((await activateNewsLayout(request(query, {}, user))).status).toBe(403)
    }
    expect(query).not.toHaveBeenCalled()
  })

  it('rejects invalid revisions and layouts', async () => {
    const query = vi.fn()
    for (const input of [{}, { updatedAt: revision, layout: [] }, { updatedAt: 'invalid', layout: {} }]) {
      expect((await activateNewsLayout(request(query, input))).status).toBe(400)
    }
    expect(query).not.toHaveBeenCalled()
  })

  it('allows only one of two competing writes, then permits a fresh retry', async () => {
    let current = revision
    let stored: unknown
    const query = vi.fn(async (sql: string, [json, id, expected]: [string, number, string]) => {
      // Model the database's single-statement comparison and replacement.
      expect(sql).toContain('WHERE "id" = $2 AND "updated_at" = $3::timestamptz')
      expect(id).toBe(1)
      if (expected !== current) return { rows: [] }
      stored = JSON.parse(json)
      current = new Date(Date.parse(current) + 1).toISOString()
      return { rows: [{ updatedAt: new Date(current) }] }
    })
    const first = { timelinePages: { senate: { hidden: ['update-1'] }, eboard: {} } }
    const stale = { timelinePages: { senate: {}, eboard: { hidden: ['update-2'] } } }
    const results = await Promise.all([first, stale].map(layout => activateNewsLayout(request(query, { layout, updatedAt: revision }))))
    expect(results.map(r => r.status)).toEqual([200, 409])
    expect(stored).toEqual(first)
    const merged = { timelinePages: { ...first.timelinePages, eboard: stale.timelinePages.eboard } }
    expect((await activateNewsLayout(request(query, { layout: merged, updatedAt: current }))).status).toBe(200)
    expect(stored).toEqual(merged)
  })
})
