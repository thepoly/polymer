import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const { find } = vi.hoisted(() => ({ find: vi.fn() }));
vi.mock('payload', () => ({ getPayload: async () => ({ find }) }));
vi.mock('@/payload.config', () => ({ default: {} }));
vi.mock('@/components/Header', () => ({ default: () => null }));
vi.mock('@/components/Footer', () => ({ default: () => null }));
vi.mock('@/components/TransitionLink', () => ({ default: (props: React.ComponentProps<'a'>) => React.createElement('a', props) }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('404'); } }));
import { renderOpinionList } from '@/lib/opinionListPage';

describe('opinion category pages', () => {
  beforeEach(() => vi.clearAllMocks());
  it('fetches page 21, shows the real total, preserves guest bylines and creates page links', async () => {
    find.mockResolvedValue({ totalDocs: 250, totalPages: 25, docs: [{
      id: 201, title: 'Guest opinion', slug: 'guest', section: 'opinion',
      authors: [], writeInAuthors: [{ name: 'Guest Writer' }], publishedDate: '2026-01-01T00:00:00Z',
    }] });
    const html = renderToStaticMarkup(await renderOpinionList('more', Promise.resolve({ page: '21' })));
    expect(find.mock.calls[0][0]).toMatchObject({ page: 21, limit: 10, select: { writeInAuthors: true } });
    expect(html).toContain('Guest Writer');
    expect(html).toContain('of 250');
    expect(html).toContain('href="/opinion/more-in-opinion?page=20"');
    expect(html).toContain('href="/opinion/more-in-opinion?page=22"');
  });
  it('returns 404 for pages beyond the archive', async () => {
    find.mockResolvedValue({ totalDocs: 20, totalPages: 2, docs: [] });
    await expect(renderOpinionList('other', Promise.resolve({ page: '3' }))).rejects.toThrow('404');
  });
  it('renders an empty category without invalid pagination controls', async () => {
    find.mockResolvedValue({ totalDocs: 0, totalPages: 0, docs: [] });
    const html = renderToStaticMarkup(await renderOpinionList('other', Promise.resolve({})));
    expect(html).toContain('No published articles');
    expect(html).not.toContain('Opinion archive pages');
  });
});
