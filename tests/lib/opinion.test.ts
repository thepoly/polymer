import { describe, expect, it } from 'vitest';
import type { Article } from '@/payload-types';
import { canManageOpinion, inSnakeOrder, isOpinionPinStale, MAX_OPINION_SLOTS, normalizeOpinionLayout, planOpinionColumns, safeSpotlightUrl, snakeOrder, validateOpinionLayout } from '@/lib/opinionLayout';
import { buildOpinionSpotlights, opinionCardSelect } from '@/lib/opinionArticles';
import { pickGroupStories } from '@/components/Opinion/opinionGroups';
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
    expect(result).toEqual([{ id: 8, name: 'Public Name', headshot: '/image.png', headshotFocus: '50% 30%', detail: null, latestArticle: { title: 'A title', url: '/opinion/2026/11/title' } }]);
    expect(JSON.stringify(result)).not.toMatch(/private|secret|roles|admin/);
  });
  it.each(['javascript:alert(1)', '//evil.example', '/\\evil.example', 'data:text/html,x', 'https://a.example/ bad'])('rejects unsafe spotlight URL %s', (url) => {
    expect(safeSpotlightUrl(url)).toBeNull();
  });
});

describe('layout persistence and rendering', () => {
  it('keeps the guest-writer photo and its per-screen positions, clamped', () => {
    const layout = normalizeOpinionLayout({ pitch: 25, pitchPositions: { mobile: { x: 60, y: 140, zoom: 9 }, tablet: null, desktop: 'junk' } });
    expect(layout.pitch).toBe(25);
    expect(layout.pitchPositions).toEqual({ mobile: { x: 60, y: 100, zoom: 2.5 }, tablet: null, desktop: null });
    expect(normalizeOpinionLayout({ pitchPositions: { mobile: { x: 1, y: 1, zoom: 1 } } }).pitchPositions.mobile).toBeNull();
    expect(normalizeOpinionLayout(null)).toMatchObject({ pitch: null, pitchPositions: { mobile: null, tablet: null, desktop: null } });
  });
  it('rejects a bad guest-writer photo or position on save', () => {
    expect(validateOpinionLayout({ pitch: 25, pitchPositions: { mobile: { x: 60, y: 50, zoom: 1.2 }, tablet: null, desktop: null } })).toBe(true);
    expect(validateOpinionLayout({ pitch: null, pitchPositions: null })).toBe(true);
    expect(validateOpinionLayout({ pitch: -1 })).not.toBe(true);
    expect(validateOpinionLayout({ pitch: 'x' })).not.toBe(true);
    expect(validateOpinionLayout({ pitchPositions: { mobile: { x: 120, y: 50, zoom: 1 } } })).not.toBe(true);
    expect(validateOpinionLayout({ pitchPositions: { watch: null } })).not.toBe(true);
    expect(validateOpinionLayout({ pitchPositions: { tablet: { x: 50, y: 50 } } })).not.toBe(true);
  });
  it('reads the columns row by row, alternating direction', () => {
    expect(snakeOrder([3, 3, 3])).toEqual([[0, 0], [1, 0], [2, 0], [2, 1], [1, 1], [0, 1], [0, 2], [1, 2], [2, 2]]);
    // A column an editor lengthened carries on alone in the rows the others don't reach
    expect(snakeOrder([4, 3, 3]).slice(-1)).toEqual([[0, 3]]);
  });
  it('fills along the snake without shifting a pin or duplicating editor choices', () => {
    const pinned = { id: 42 }; const pick = { id: 90 };
    expect(planOpinionColumns([[null, pinned], [null, null]], [{ id: 1 }, pinned, pick, { id: 2 }, { id: 3 }], { excluded: [pick] }))
      .toEqual([[{ id: 1 }, pinned], [{ id: 2 }, { id: 3 }]]);
  });
  it('puts a newest story without a photo at the top of the middle column, and keeps the snake going', () => {
    const s = (id: number, image: string | null) => ({ id, image });
    const pool = [s(1, null), s(2, '/2.jpg'), s(3, null), s(4, null), s(5, null), s(6, null), s(7, null), s(8, '/8.jpg'), s(9, '/9.jpg'), s(10, null)];
    const photos = [[true, false, false], [false, false, true], [false, false, true]];
    const columns = planOpinionColumns([[null, null, null], [null, null, null], [null, null, null]], pool, { photos, hasPhoto: (a) => Boolean(a.image) });
    // 1 has no photo: the lead waits for 2, and 1 goes top middle
    expect(columns.map((c) => c.map((a) => a?.id))).toEqual([[2, 6, 7], [1, 5, 8], [3, 4, 9]]);
    expect(inSnakeOrder(columns).map(({ story }) => story.id)).toEqual([2, 1, 3, 4, 5, 6, 7, 8, 9]);
  });
  it('gives a photo slot any story when none with a photo is left', () => {
    const plain = { id: 1, image: null };
    expect(planOpinionColumns([[null]], [plain], { photos: [[true]], hasPhoto: (a) => Boolean(a.image) })).toEqual([[plain]]);
  });
  it('lets a column pin lapse two weeks after the newest story', () => {
    expect(isOpinionPinStale('2026-11-01T12:00:00Z', '2026-11-14T12:00:00Z')).toBe(false);
    expect(isOpinionPinStale('2026-11-01T12:00:00Z', '2026-11-16T12:00:00Z')).toBe(true);
    expect(isOpinionPinStale(null, '2026-11-16T12:00:00Z')).toBe(false);
  });
  it('leads each group with its newest story that has a photo, then the three newest of the rest', () => {
    const story = (id: number, image: string | null = null) => ({ id, image });
    // Newest first: 1 and 2 have no photo, so 3 leads and 1, 2, 4 follow
    const picked = pickGroupStories([story(1), story(2), story(3, '/3.jpg'), story(4), story(5, '/5.jpg')]);
    expect(picked.lead?.id).toBe(3);
    expect(picked.rest.map((s) => s.id)).toEqual([1, 2, 4]);
    // No photos at all: the newest leads, without one
    expect(pickGroupStories([story(1), story(2)])).toEqual({ lead: story(1), rest: [story(2)] });
    expect(pickGroupStories([])).toEqual({ lead: null, rest: [] });
  });
  it('reads and checks the Opinion’s Choice style, keyline by default', () => {
    expect(normalizeOpinionLayout(null).editorsChoiceStyle).toBe('keyline');
    expect(normalizeOpinionLayout({ editorsChoiceStyle: 'margin' }).editorsChoiceStyle).toBe('margin');
    expect(normalizeOpinionLayout({ editorsChoiceStyle: 'panel' }).editorsChoiceStyle).toBe('keyline');
    expect(validateOpinionLayout({ editorsChoiceStyle: 'rule' })).toBe(true);
    expect(validateOpinionLayout({ editorsChoiceStyle: 'skybox' })).not.toBe(true);
  });
  it('requires a photo in column 3', () => {
    expect(validateOpinionLayout({ column3: [null, null, null], column3Images: [false, false, false] })).not.toBe(true);
    expect(validateOpinionLayout({ column3: [null, null, null], column3Images: [true, false, false] })).toBe(true);
    expect(normalizeOpinionLayout({ version: 3, column3: [null, null, null], column3Images: [false, false, false] }).column3Images).toEqual([false, false, true]);
  });
  it('keeps empty slot positions if the auto-fill pool runs out', () => {
    expect(planOpinionColumns([[null, { id: 42 }, null]], [])).toEqual([[null, { id: 42 }, null]]);
  });
  it('trims an unversioned layout to two slots per column, keeping pins and image settings', () => {
    const layout = normalizeOpinionLayout({
      column1: [null, null, null, null, null], column1Images: [true, false, false, false, false],
      column2: [null, null, null, 7], column2Images: [false, false, true, false],
      column3: [null, null, null, null], column3Images: [false, false, false, true],
    });
    expect(layout.version).toBe(3);
    expect(layout.column1).toEqual([null, null]);
    expect(layout.column1Images).toEqual([true, false]);
    // Automatic slots without a photo go first, so the pin and the photo slot stay
    expect(layout.column2).toEqual([null, 7]);
    expect(layout.column2Images).toEqual([true, false]);
    expect(layout.column3).toEqual([null, null]);
    expect(layout.column3Images).toEqual([false, true]);
    expect(normalizeOpinionLayout(null)).toMatchObject({ column1: [null, null], column1Images: [true, false], column2Images: [false, true], column3Images: [false, true] });
  });
  it('keeps each column photo slot when an unversioned 5/4/4 layout comes down to two', () => {
    const layout = normalizeOpinionLayout({
      column1: [611, null, null, null, null], column1Images: [true, false, false, false, false],
      column2: [612, null, null, null], column2Images: [false, false, true, false],
      column3: [613, null, null, null], column3Images: [false, false, false, true],
    });
    expect(layout.column1).toEqual([611, null]);
    expect(layout.column1Images).toEqual([true, false]);
    expect(layout.column2).toEqual([612, null]);
    expect(layout.column2Images).toEqual([false, true]);
    expect(layout.column3).toEqual([613, null]);
    expect(layout.column3Images).toEqual([false, true]);
  });
  it('drops one automatic slot without a photo per column from a three-slot (version 2) layout', () => {
    const layout = normalizeOpinionLayout({
      version: 2,
      column1: [null, null, null], column1Images: [true, false, false],
      column2: [5, null, null], column2Images: [false, false, true],
      column3: [null, 8, null], column3Images: [false, false, true],
    });
    expect(layout.version).toBe(3);
    expect(layout.column1).toEqual([null, null]);
    expect(layout.column1Images).toEqual([true, false]);
    // The pin and the photo slot stay; the automatic text slot between them goes
    expect(layout.column2).toEqual([5, null]);
    expect(layout.column2Images).toEqual([false, true]);
    expect(layout.column3).toEqual([8, null]);
    expect(layout.column3Images).toEqual([false, true]);
    // A column with nothing to drop (all pinned) keeps its slots, and it happens once
    const full = normalizeOpinionLayout({ version: 2, column1: [1, 2, 3], column1Images: [true, false, false] });
    expect(full.column1).toEqual([1, 2, 3]);
    expect(normalizeOpinionLayout(JSON.parse(JSON.stringify(layout)))).toEqual(layout);
  });
  it('round-trips automatic slots and image settings, including added slots', () => {
    const layout = normalizeOpinionLayout({ version: 3, column1: Array(7).fill(null), column1Images: [true, false, false, false, false, false, true] });
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
    const result = normalizeOpinionLayout({ version: 3, column1: Array(10000).fill(1), column2: [1, 2] });
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
    expect(formatArticle({ id: 1, slug: 'guest', title: 'Guest article', section: 'opinion', authors: [], writeInAuthors: [{ name: 'Guest Writer' }] })?.author).toBe('Guest Writer');
  });
  it('resets empty kickers and supports typographic apostrophes', () => {
    expect(deriveOpinionType(null)).toBe('opinion');
    expect(deriveOpinionType('  ')).toBe('opinion');
    expect(deriveOpinionType('Editor’s Notebook')).toBe('editors-notebook');
    expect(deriveOpinionType('Custom kicker')).toBe('more');
  });
});
