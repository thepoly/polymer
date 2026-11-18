import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { auth, find } = vi.hoisted(() => ({ auth: vi.fn(), find: vi.fn() }));
vi.mock('payload', () => ({ getPayload: async () => ({ auth, find }) }));
vi.mock('@/payload.config', () => ({ default: {} }));
import { GET as staff } from '@/app/api/opinion/staff/route';
import { GET as articles } from '@/app/api/opinion/articles/route';

describe('opinion editorial endpoints', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it.each([staff, articles])('denies anonymous and other-section requests before querying data', async (handler) => {
    for (const user of [null, { roles: ['writer'] }, { roles: ['editor'], section: 'sports' }]) {
      auth.mockResolvedValue({ user });
      expect((await handler(new NextRequest('http://localhost/api/opinion/staff'))).status).toBe(403);
    }
    expect(find).not.toHaveBeenCalled();
  });
  it('lets an opinion editor search staff but only returns public directory fields', async () => {
    auth.mockResolvedValue({ user: { roles: ['editor'], section: 'opinion' } });
    find.mockResolvedValue({ docs: [{ id: 7, firstName: 'A', lastName: 'Writer', email: 'private@test', roles: ['admin'] }] });
    const res = await staff(new NextRequest('http://localhost/api/opinion/staff?q=Writer'));
    expect(await res.json()).toEqual({ docs: [{ id: 7, firstName: 'A', lastName: 'Writer' }] });
    expect(res.headers.get('Cache-Control')).toContain('no-store');
    expect(find.mock.calls[0][0].where.and[0].or).toEqual([{ firstName: { contains: 'Writer' } }, { lastName: { contains: 'Writer' } }]);
  });
  it('looks up older pins by ID independently of the recent article list', async () => {
    auth.mockResolvedValue({ user: { roles: ['editor'], section: 'opinion' } });
    find.mockResolvedValue({ docs: [], hasNextPage: false });
    await articles(new NextRequest('http://localhost/api/opinion/articles?ids=10,22'));
    expect(find.mock.calls[0][0]).toMatchObject({ limit: 2, page: 1, where: { and: [
      { section: { equals: 'opinion' } }, { _status: { equals: 'published' } }, { id: { in: [10, 22] } },
    ] } });
  });
  it('searches the archive on the server with stable ordering and pagination', async () => {
    auth.mockResolvedValue({ user: { roles: ['admin'] } });
    find.mockResolvedValue({ docs: [], hasNextPage: true });
    const res = await articles(new NextRequest('http://localhost/api/opinion/articles?q=older&page=8'));
    expect(find.mock.calls[0][0]).toMatchObject({ page: 8, limit: 30, sort: ['-publishedDate', '-id'] });
    expect(await res.json()).toEqual({ docs: [], hasNextPage: true });
  });
});
