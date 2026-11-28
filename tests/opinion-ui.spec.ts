import { test, expect } from '@playwright/test';
import { build } from 'esbuild';

let bundle: string;
test.beforeAll(async () => {
  const result = await build({
    stdin: { contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { OpinionLayoutEditor } from './components/Dashboard/OpinionLayoutEditor';
      import Carousel from './components/Opinion/AuthorSpotlightCarousel';
      const authors = [1, 2, 3].map(id => ({ id, name: 'Author ' + id, headshot: null, latestArticle: { title: 'Story ' + id, url: '/story/' + id } }));
      createRoot(document.getElementById('root')).render(location.pathname === '/carousel' ? <Carousel authors={authors} /> : <OpinionLayoutEditor />);
    `, resolveDir: process.cwd(), loader: 'tsx' },
    bundle: true, write: false, platform: 'browser', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"test"' },
    plugins: [{ name: 'test-boundaries', setup(builder) {
      builder.onResolve({ filter: /^(next\/image|@\/components\/TransitionLink)$/ }, (args) => ({ path: args.path, namespace: 'stub' }));
      builder.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
        contents: args.path === 'next/image'
          ? "import React from 'react'; export default ({fill,priority,...props}) => <img {...props} />;"
          : "import React from 'react'; export default (props) => <a {...props} />;",
        loader: 'jsx', resolveDir: process.cwd(),
      }));
      builder.onLoad({ filter: /\.css$/ }, () => ({ contents: '', loader: 'js' }));
    } }],
  });
  bundle = result.outputFiles[0].text;
});

const story = (id: number, title: string) => ({ id, plainTitle: title, slug: `story-${id}`, section: 'opinion', publishedDate: '2026-01-01', authors: [] });

test('older pins, remote search, keyboard assignment, image persistence, and edits during save', async ({ page }) => {
  let finishSave: (() => void) | undefined;
  let savedLayout: Record<string, unknown> | undefined;
  let delaySave = false;
  await page.route('http://opinion.test/**', async (route) => {
    const url = new URL(route.request().url());
    const json = (body: unknown) => route.fulfill({ json: body });
    if (url.pathname === '/api/opinion-page-layout/1') {
      savedLayout = route.request().postDataJSON().layout;
      if (delaySave) await new Promise<void>((resolve) => { finishSave = resolve; });
      return json({ doc: { id: 1 } });
    }
    if (url.pathname === '/api/opinion-page-layout') return json({ docs: [{ id: 1, layout: {
      version: 2, column1: [null, 42, null], column1Images: [true, false, false],
    } }] });
    if (url.pathname === '/api/opinion/articles') return json({ docs: url.searchParams.has('ids') ? [story(42, 'Old pinned story')]
      : url.searchParams.get('q') ? [story(9, 'Archived search result')] : [story(101, 'Recent story')], hasNextPage: false });
    if (url.pathname === '/api/opinion/staff') return json({ docs: [{ id: 2, firstName: 'Another', lastName: 'Writer' }] });
    return route.fulfill({ contentType: 'text/html', body: '<div id="root"></div><script>' + bundle.replace(/<\/script/gi, '<\\/script') + '</script>' });
  });
  await page.goto('http://opinion.test/editor');
  const slot = page.getByRole('combobox', { name: 'Article for col1-1', exact: true });
  await expect(slot).toHaveValue('42');
  await expect(slot.locator('option:checked')).toHaveText('Old pinned story');
  await page.getByPlaceholder('Search all opinion titles...').fill('Archived');
  const lead = page.getByRole('combobox', { name: 'Article for col1-0', exact: true });
  await expect(lead.locator('option[value="9"]')).toHaveCount(1);
  await lead.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(lead).toHaveValue('9');
  await lead.selectOption(''); // Return lead to automatic; its image setting must survive.
  await page.getByRole('button', { name: 'Activate', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeVisible();
  // A three-slot (version 2) layout saves as two: its last automatic text slot goes, the pin stays
  expect(savedLayout?.column1).toEqual([null, 42]);
  expect(savedLayout?.column1Images).toEqual([true, false]);
  expect(savedLayout?.version).toBe(3);
  expect(savedLayout?.editorsChoiceStyle).toBe('keyline');
  await page.getByRole('combobox', { name: 'Opinion’s Choice style' }).selectOption('rule');
  await page.getByRole('button', { name: 'Activate', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeVisible();
  expect(savedLayout?.editorsChoiceStyle).toBe('rule');
  delaySave = true;
  await lead.selectOption('9');
  await page.getByRole('button', { name: 'Activate', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saving...', exact: true })).toBeVisible();
  await lead.selectOption('');
  await expect.poll(() => !!finishSave).toBe(true);
  finishSave!();
  await expect(page.getByRole('button', { name: 'Activate', exact: true })).toBeEnabled();
});

test('carousel resumes after manual navigation and pauses while focused or hovered', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.route('http://opinion.test/**', (route) => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div><script>' + bundle.replace(/<\/script/gi, '<\\/script') + '</script>' }));
  await page.goto('http://opinion.test/carousel');
  await expect(page.getByText('Story 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Show Author 2' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Story 2', { exact: true })).toBeVisible();
  await page.clock.fastForward(6000);
  await expect(page.getByText('Story 2', { exact: true })).toBeVisible();
  await expect(page.getByText('Story 3', { exact: true })).toBeHidden();
  await page.evaluate(() => (document.activeElement as HTMLElement).blur());
  await page.clock.fastForward(5100);
  await expect(page.getByText('Story 3', { exact: true })).toBeVisible();
  // No pause button and no arrows: hovering holds an author, the faces move between them
  await expect(page.getByRole('button', { name: /pause|resume|previous author|next author/i })).toHaveCount(0);
  await page.getByRole('region', { name: 'Opinion author spotlight' }).hover();
  await page.clock.fastForward(10000);
  await expect(page.getByText('Story 3', { exact: true })).toBeVisible();
  await expect(page.getByText('Story 1', { exact: true })).toBeHidden();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(5100);
  await expect(page.getByText('Story 1', { exact: true })).toBeVisible();
});

test('carousel changes author by arrow keys and the face strip, and announces only manual changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.route('http://opinion.test/**', (route) => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div><script>' + bundle.replace(/<\/script/gi, '<\\/script') + '</script>' }));
  await page.goto('http://opinion.test/carousel');
  const announcer = page.locator('[aria-live="polite"]');
  await expect(announcer).toHaveText('');
  // ← from the first author wraps to the last
  await page.getByRole('button', { name: 'Show Author 1' }).focus();
  await page.keyboard.press('ArrowLeft');
  // A real slide: both authors travel the full width, the new one in from the left
  const motion = await page.evaluate(() => document.getAnimations()
    .filter((animation) => ((animation.effect as KeyframeEffect).target as Element | null)?.getAttribute('aria-roledescription') === 'slide')
    .map((animation) => {
      const frames = (animation.effect as KeyframeEffect).getKeyframes();
      return `${frames[0].transform} -> ${frames[frames.length - 1].transform}`.replace(/\b0px\b/g, '0');
    }).sort());
  expect(motion).toEqual(['translateX(-100%) -> translateX(0)', 'translateX(0) -> translateX(100%)']);
  await expect(page.getByText('Story 3', { exact: true })).toBeVisible();
  await expect(page.getByText('Story 1', { exact: true })).toBeHidden();
  await expect(announcer).toHaveText('Author 3, 3 of 3');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('Story 1', { exact: true })).toBeVisible();
  // By keyboard: the bundle has no CSS, so the sr-only announcer sits over the faces here
  await page.getByRole('button', { name: 'Show Author 2' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Show Author 2' })).toHaveAttribute('aria-current', 'true');
  await expect(page.getByText('Story 2', { exact: true })).toBeVisible();
  // The rotation's own change isn't announced
  await page.evaluate(() => (document.activeElement as HTMLElement).blur());
  await page.mouse.move(0, 0);
  await page.clock.fastForward(5100);
  await expect(page.getByText('Story 3', { exact: true })).toBeVisible();
  await expect(announcer).toHaveText('');
});

test('carousel changes author on a two-finger trackpad swipe, once per swipe, and leaves vertical scrolling alone', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route('http://opinion.test/**', (route) => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div><script>' + bundle.replace(/<\/script/gi, '<\/script') + '</script>' }));
  await page.goto('http://opinion.test/carousel');
  await page.getByRole('region', { name: 'Opinion author spotlight' }).hover();
  // One swipe to the left, as a run of wheel events (momentum included): one author on
  for (let i = 0; i < 8; i++) await page.mouse.wheel(20, 0);
  await expect(page.getByText('Story 2', { exact: true })).toBeVisible();
  await expect(page.getByText('Story 3', { exact: true })).toBeHidden();
  // Once that swipe has ended, one to the right comes back
  await page.waitForTimeout(400);
  for (let i = 0; i < 4; i++) await page.mouse.wheel(-20, 0);
  await expect(page.getByText('Story 1', { exact: true })).toBeVisible();
  // Mostly vertical movement is a scroll, not a swipe
  await page.waitForTimeout(400);
  for (let i = 0; i < 4; i++) await page.mouse.wheel(15, 60);
  await page.waitForTimeout(100);
  await expect(page.getByText('Story 1', { exact: true })).toBeVisible();
  await expect(page.getByText('Story 2', { exact: true })).toBeHidden();
});

test('carousel takes swipes back to back, while the last one is still coasting', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route('http://opinion.test/**', (route) => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div><script>' + bundle.replace(/<\/script/gi, '<\/script') + '</script>' }));
  await page.goto('http://opinion.test/carousel');
  await page.getByRole('region', { name: 'Opinion author spotlight' }).hover();
  // A trackpad's events every ~30ms, never pausing long enough to end a swipe:
  // swipe, its momentum dying away, a second swipe on top, then its momentum
  const stream = [8, 16, 30, 24, 18, 13, 9, 7, 5, 4, 8, 18, 32, 40, 30, 20, 12, 8, 5, 3, 2];
  for (const dx of stream) {
    await page.mouse.wheel(dx, 0);
    await page.waitForTimeout(30);
  }
  // Two swipes, two authors: not stuck after the first, and no extra step from either's momentum
  await expect(page.getByText('Story 3', { exact: true })).toBeVisible();
  await expect(page.getByText('Story 1', { exact: true })).toBeHidden();
  await expect(page.getByText('Story 2', { exact: true })).toBeHidden();
});
