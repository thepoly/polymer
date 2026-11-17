import { describe, expect, it } from 'vitest';
import type { Article } from '@/payload-types';
import { canManageOpinion, fillOpinionSlots, MAX_OPINION_SLOTS, normalizeOpinionLayout, safeSpotlightUrl, validateOpinionLayout } from '@/lib/opinionLayout';
import { buildOpinionSpotlights, opinionCardSelect } from '@/lib/opinionArticles';
import { opinionPageNumber } from '@/lib/opinionPagination';
import { deriveOpinionType } from '@/lib/opinionType';
import { formatArticle } from '@/utils/formatArticle';
import OpinionPageLayout from '@/collections/OpinionPageLayout';
import Submissions from '@/collections/Submissions';
import type { AccessArgs } from 'payload';

describe('opinion security boundaries', () => {
  it.each([
    [null, false], [{ roles: ['writer'] }, false],
    [{ roles: ['editor'], section: 'news' }, false],
    [{ roles: ['editor'], section: 'opinion' }, true],
    [{ roles: ['eic'] }, true], [{ roles: ['admin'] }, true],
  ])('limits layout management for %j', (user, allowed) => {
    expect(canManageOpinion(user)).toBe(allowed);
  });
  it('does not fall back to authenticated deletion or anonymous submission creation', async () => {
    expect(await OpinionPageLayout.access!.delete!({ req: { user: { roles: ['writer'] } } } as AccessArgs)).toBe(false);
    expect(await OpinionPageLayout.access!.delete!({ req: { user: { roles: ['admin'] } } } as AccessArgs)).toBe(true);
    expect(await Submissions.access!.create!({ req: { user: null } } as AccessArgs)).toBe(false);
  });
  it('does not serialize private populated fields in spotlight props', () => {
    const article = { id: 1, title: 'A title', slug: 'title', section: 'opinion', publishedDate: '2026-11-01T00:00:00Z', authors: [
      { id: 8, firstName: 'Public', lastName: 'Name', email: 'private@example.test', roles: ['admin'], headshot: { url: '/image.png', privateField: 'secret' } },
    ] } as unknown as Article;
    const result = buildOpinionSpotlights([article]);
    expect(result).toEqual([{ id: 8, name: 'Public Name', headshot: '/image.png', latestArticle: { title: 'A title', url: '/opinion/2026/11/title' } }]);
    expect(JSON.stringify(result)).not.toMatch(/private|secret|roles|admin/);
  });
  it.each(['javascript:alert(1)', '//evil.example', '/\\evil.example', 'data:text/html,x', 'https://a.example/ bad'])('rejects unsafe spotlight URL %s', (url) => {
    expect(safeSpotlightUrl(url)).toBeNull();
  });
});

describe('layout persistence and rendering', () => {
  it('fills holes without shifting a pin or duplicating editor choices', () => {
    const pinned = { id: 42 }; const pick = { id: 90 };
    expect(fillOpinionSlots([[null, pinned, null], [null]], [{ id: 1 }, pinned, pick, { id: 2 }, { id: 3 }], [pick]))
      .toEqual([[{ id: 1 }, pinned, { id: 2 }], [{ id: 3 }]]);
  });
  it('keeps empty slot positions if the auto-fill pool runs out', () => {
    expect(fillOpinionSlots([[null, { id: 42 }, null]], [])).toEqual([[null, { id: 42 }, null]]);
  });
  it('round-trips automatic slots and image settings, including added slots', () => {
    const layout = normalizeOpinionLayout({ column1: Array(7).fill(null), column1Images: [true, false, false, false, false, false, true] });
    const stored = JSON.parse(JSON.stringify(layout));
    expect(validateOpinionLayout(stored)).toBe(true);
    expect(normalizeOpinionLayout(stored)).toEqual(layout);
    expect(stored.column1).toHaveLength(7);
    expect(stored.column1Images[6]).toBe(true);
  });
  it.each([42, 'bad', [], { column1: {} }, { column1Images: ['true'] }, { editorsChoice: [1, 1] }, { spotlight: [null] }])('rejects malformed new writes %j and reads safely', (bad) => {
    expect(validateOpinionLayout(bad)).not.toBe(true);
    const normalized = normalizeOpinionLayout(bad);
    expect(validateOpinionLayout(normalized)).toBe(true);
  });
  it('bounds old oversized layouts and repairs duplicate pins', () => {
    const result = normalizeOpinionLayout({ column1: Array(10000).fill(1), column2: [1, 2] });
    expect(result.column1).toHaveLength(MAX_OPINION_SLOTS);
    expect(result.column1.filter(Boolean)).toEqual([1]);
    expect(result.column2.slice(0, 2)).toEqual([null, 2]);
  });
});

describe('archives and classification', () => {
  it('allows archive pages beyond the old 200-article ceiling', () => {
    expect(opinionPageNumber('21')).toBe(21);
    expect(opinionPageNumber('105')).toBe(105);
    for (const value of ['-1', '0', '1.5', 'Infinity', '9007199254740992', ['2']]) expect(opinionPageNumber(value)).toBe(1);
  });
  it('includes and renders guest attribution in card queries', () => {
    expect(opinionCardSelect.writeInAuthors).toBe(true);
    expect(formatArticle({ id: 1, slug: 'guest', title: 'Guest article', section: 'opinion', authors: [], writeInAuthors: [{ name: 'Guest Writer' }] })?.author).toBe('GUEST WRITER');
  });
  it('resets empty kickers and supports typographic apostrophes', () => {
    expect(deriveOpinionType(null)).toBe('opinion');
    expect(deriveOpinionType('  ')).toBe('opinion');
    expect(deriveOpinionType('Editor’s Notebook')).toBe('editors-notebook');
    expect(deriveOpinionType('Custom kicker')).toBe('more');
  });
});
