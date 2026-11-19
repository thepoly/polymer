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
      column1: [null, 42, null, null, null], column1Images: [true, false, false, false, false],
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
  expect(savedLayout?.column1).toEqual([null, 42, null, null, null]);
  expect(savedLayout?.column1Images).toEqual([true, false, false, false, false]);
  delaySave = true;
  await lead.selectOption('9');
  await page.getByRole('button', { name: 'Activate', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saving...', exact: true })).toBeVisible();
  await lead.selectOption('');
  await expect.poll(() => !!finishSave).toBe(true);
  finishSave!();
  await expect(page.getByRole('button', { name: 'Activate', exact: true })).toBeEnabled();
});

test('carousel resumes after manual navigation and honors focus and pause controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.route('http://opinion.test/**', (route) => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div><script>' + bundle.replace(/<\/script/gi, '<\\/script') + '</script>' }));
  await page.goto('http://opinion.test/carousel');
  await expect(page.getByText('Author 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next author' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Author 2', { exact: true })).toBeVisible();
  await page.clock.fastForward(6000);
  await expect(page.getByText('Author 2', { exact: true })).toBeVisible();
  await page.evaluate(() => (document.activeElement as HTMLElement).blur());
  await page.clock.fastForward(5100);
  await expect(page.getByText('Author 3', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause rotation' }).focus();
  await page.keyboard.press('Enter');
  await page.evaluate(() => (document.activeElement as HTMLElement).blur());
  await page.clock.fastForward(10000);
  await expect(page.getByText('Author 3', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Resume rotation' }).focus();
  await page.keyboard.press('Enter');
  await page.evaluate(() => (document.activeElement as HTMLElement).blur());
  await page.clock.fastForward(5100);
  await expect(page.getByText('Author 1', { exact: true })).toBeVisible();
});
