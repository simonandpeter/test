import { test, expect } from './fixtures.js';
import { ready, searchMode } from './helpers.js';

/**
 * **What the boot is allowed to download.** The Daily route is only the
 * heaviest one to open; what is held here is a budget on the first load.
 *
 * **These need a real build.** They match `/assets/index-*.js`, which exists
 * in `dist/` and not under the dev server, so they pass only through the
 * project's own Playwright config.
 *
 * Why these two, why at the network rather than in a unit test, and the
 * numbers that prompted them: docs/E2E-DECISIONS.md#download-limiterspecjs
 */

// The suite's standing seed; neither test visits All Saints, but every other
// spec file establishes it before a page loads.
test.beforeEach(async ({ page }) => {
  await searchMode(page);
});

test('the day records and the locale packs are fetched, not carried in the entry chunk', async ({ page }) => {
  // What the split costs and why the day records are awaited beside the
  // manifest: docs/E2E-DECISIONS.md#download-limiterspecjs
  const scripts = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(r.url());
  });

  await ready(page, { church: 'russian', language: 'ru', reckoning: null });
  await page.goto('/calendar/2026-08-27', { waitUntil: 'networkidle' });

  const entry = scripts.filter((u) => /\/assets\/index-[^/]+\.js$/.test(u));
  expect(entry.length, 'one entry chunk').toBeGreaterThan(0);
  expect(scripts.some((u) => /liturgical-days-[^/]+\.js$/.test(u)), 'the day records travel alone').toBe(true);

  // One language's pack, and only one: the reader keeps Russian.
  const packs = scripts
    .map((u) => u.match(/\/assets\/(ru|ro|el|sr)-[^/]+\.js$/))
    .filter(Boolean)
    .map((m) => m[1]);
  expect([...new Set(packs)]).toEqual(['ru']);

  // And the page is whole, which is the half that matters: the records are in
  // before the column is painted, so the tag carries its grade at first sight.
  await expect(page.locator('[data-readings] a').first()).toBeVisible();
  await expect(page.locator('.day-tags .tag').first()).toHaveAttribute('data-fast', /.+/);
  await expect(page.locator('#church-open')).toHaveText('Русская');

  /*
   * Opening the chooser starts the other three, so that pressing one is
   * instant rather than a fetch the reader watches. Deliberately not awaited
   * by the page itself, which must appear at once.
   */
  await page.locator('#lang-open').click();
  await expect.poll(() => new Set(scripts.map((u) => (u.match(/\/assets\/(ru|ro|el|sr)-/) ?? [])[1]).filter(Boolean)).size).toBe(4);
});


test('the boot path fetches the manifest and not the coverage statistics', async ({ page }) => {
  // Addendum G1. About's statistics call `loadManifestMeta()` when they want
  // the file; the boot path must not. docs/E2E-DECISIONS.md#download-limiterspecjs
  const fetched = [];
  page.on('request', (r) => fetched.push(r.url()));

  await ready(page);
  await page.goto('/calendar/2026-08-27', { waitUntil: 'networkidle' });

  // The premise: the boot really did load the manifest through this path, so
  // the absence below is an absence and not a page that never started.
  expect(
    fetched.filter((u) => /data\/manifest\.json$/.test(u)).length,
    'the manifest was not fetched at all',
  ).toBe(1);
  expect(
    fetched.filter((u) => /manifest\.meta\.json$/.test(u)),
    'the coverage statistics are back on the boot path',
  ).toEqual([]);

  // And the page is whole without them, which is the half that matters.
  await expect(page.locator('[data-readings] a').first()).toBeVisible();
});


