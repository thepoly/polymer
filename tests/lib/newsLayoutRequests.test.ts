import { afterEach, describe, expect, it, vi } from 'vitest'
import { activateNewsLayout, readAllDocs, readNewsLayout } from '@/components/Dashboard/newsLayoutRequests'

afterEach(() => vi.unstubAllGlobals())
const document = { id: 1, updatedAt: '2026-11-17T12:00:00.000Z', layout: { timelinePages: { senate: { hidden: ['update-1'] } } } }

describe('reading the layout before activation', () => {
  it('rejects a JSON HTTP error instead of turning it into an empty layout', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ errors: [] }, { status: 503 }))
    vi.stubGlobal('fetch', fetch)
    await expect(readNewsLayout('1')).rejects.toThrow('Could not read')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it.each([{}, { ...document, id: 2 }, { ...document, layout: [] }, { ...document, updatedAt: 'invalid' }])(
    'rejects an invalid document: %j', async (doc) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(doc)))
      await expect(readNewsLayout('1')).rejects.toThrow('invalid')
    },
  )

  it('preserves the complete current layout and its revision', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(document)))
    expect(await readNewsLayout('1')).toEqual({ layout: document.layout, updatedAt: document.updatedAt })
  })

  it('accepts an explicitly empty new layout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ...document, layout: null })))
    expect((await readNewsLayout('1')).layout).toEqual({})
  })
})

it('sends the revision and keeps a conflict actionable without retrying a stale layout', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({}, { status: 409 }))
  vi.stubGlobal('fetch', fetch)
  await expect(activateNewsLayout('1', document.layout, document.updatedAt)).rejects.toThrow('activate again')
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ layout: document.layout, updatedAt: document.updatedAt })
})

it('loads every REST page and rejects a partial archive when a later page fails', async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(Response.json({ docs: [{ id: 1 }], hasNextPage: true }))
    .mockResolvedValueOnce(Response.json({ docs: [{ id: 2 }], hasNextPage: false }))
  vi.stubGlobal('fetch', fetch)
  expect((await readAllDocs('/api/articles?limit=1')).docs).toEqual([{ id: 1 }, { id: 2 }])
  expect(fetch.mock.calls[1][0]).toContain('page=2')
  fetch.mockResolvedValueOnce(Response.json({ docs: [{ id: 1 }], hasNextPage: true }))
    .mockResolvedValueOnce(Response.json({}, { status: 503 }))
  await expect(readAllDocs('/api/articles?limit=1')).rejects.toThrow('complete archive')
})
