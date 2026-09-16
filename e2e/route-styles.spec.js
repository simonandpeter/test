import { test, expect } from './fixtures.js';
import { DETAIL, searchMode } from './helpers.js';

/**
 * **A route may not paint its text before its own stylesheet.**
 *
 * `index.css` and `saint.css` left the render-blocking entry bundle on
 * 2026-09-16 (`src/ui/sheets.js`), which took ~18 kB and a 150 ms round trip
 * off every route's first paint. The price is that the two routes those sheets
 * dress now fetch them separately — and both paint text on their first frame,
 * so markup that lands before its sheet is a column of unstyled text that then
 * reflows. That is worse than the round trip the move removed, and it is
 * exactly the failure a byte budget cannot see.
 *
 * So `main.js` awaits `view.styles()` before it renders, and this is the test
 * that holds the await in place: delete the `await` and both tests below fail,
 * because the view renders the moment the manifest lands instead of waiting.
 *
 * **The stylesheet chunk cannot be named by a pattern.** Vite names a dynamic
 * chunk after its source file, so `src/styles/index.css` is served as
 * `assets/index-<hash>.css` — the same shape as the entry sheet. The shell
 * names the entry sheet in its one blocking `<link>`, so it is read from there
 * and everything else under `assets/*.css` is held: that set is the two sheets
 * under test plus `map.css`, `prayer.css` and `theme-fade.css`, none of which
 * anything awaits.
 *
 * Holding a stylesheet blocks painting, not scripting, so the DOM assertions
 * below are answered normally while the page is frozen.
 */

/** The href of the one stylesheet the shell blocks on, read from the shell. */
async function entrySheet(context) {
  const html = await (await context.request.get('/')).text();
  const hrefs = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((m) => m[1]);
  expect(hrefs, 'the shell names exactly one render-blocking stylesheet').toHaveLength(1);
  return hrefs[0];
}

/**
 * Opens `path` with every stylesheet but the entry's held, and hands back the
 * page, the release, and a count of what was actually intercepted.
 *
 * The count is not decoration: a pattern that matches nothing fails *open*
 * (trap 13), and this test's whole claim is about a request that was held. The
 * service worker is blocked for the same reason — `page.route` never sees a
 * request a worker answered.
 */
async function withHeldSheets(browser, path) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const entry = await entrySheet(context);
  const page = await context.newPage();
  await searchMode(page);

  const held = [];
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  await page.route(/\/assets\/[^/]+\.css$/, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith(entry.replace(/^.*\//, ''))) return route.continue();
    held.push(url.pathname);
    await gate;
    await route.continue();
  });

  // Not `load`: the load event is one of the things a held stylesheet delays.
  await page.goto(path, { waitUntil: 'commit' });
  // The view's data, which is the *other* thing its render waits for. Past
  // this point the only thing left between the reader and the markup is the
  // stylesheet — which is what makes the assertion that follows about the
  // await and not about the manifest.
  await page.waitForResponse((r) => /data\/manifest\.json$/.test(r.url()));
  return { context, page, held, release: () => release() };
}

for (const [name, path] of [
  ['All Saints', '/saints'],
  ["a saint's page", DETAIL],
]) {
  test(`${name} does not paint its text before its stylesheet`, async ({ browser }) => {
    const { context, page, held, release } = await withHeldSheets(browser, path);

    // A generous settle *after* the manifest: without the await the render is
    // synchronous with the manifest resolving, so anything the page was going
    // to draw is drawn well inside this.
    await page.waitForTimeout(1000);
    expect(held.length, 'a stylesheet was actually held').toBeGreaterThan(0);
    expect(await page.locator('#view h1').count(), 'the view has not rendered yet').toBe(0);

    release();
    await expect(page.locator('#view h1').first()).toBeAttached({ timeout: 15_000 });
    await context.close();
  });
}

test('the Daily page fetches neither of the two route stylesheets', async ({ browser }) => {
  /*
   * The other half of the claim, and the reason the split is worth its
   * complexity: the page a returning reader lands on reads neither sheet, so
   * it must not pay for either. It asks for them only once a shelf has
   * something on it — `ui/shelf.js` — and a first visit's shelves are empty.
   *
   * By URL shape, because that is all a network log has: the entry sheet is
   * the only `index-*.css` a Daily load may ask for, and `saint-*.css` must
   * not appear at all.
   */
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  await searchMode(page);
  const css = new Set();
  page.on('request', (r) => {
    const { pathname } = new URL(r.url());
    if (/^\/assets\/.*\.css$/.test(pathname)) css.add(pathname);
  });

  await page.goto('/', { waitUntil: 'load' });
  await expect(page.locator('#view h1').first()).toBeAttached();
  await page.waitForTimeout(1000);

  const sheets = [...css];
  expect(sheets.length, 'the Daily page asked for stylesheets at all').toBeGreaterThan(0);
  expect(
    sheets.filter((p) => /\/index-[^/]+\.css$/.test(p)),
    'only the entry sheet, never a second index-*.css chunk',
  ).toHaveLength(1);
  expect(sheets.filter((p) => /\/saint-[^/]+\.css$/.test(p)), 'no saint.css on the Daily page').toHaveLength(0);
  await context.close();
});
