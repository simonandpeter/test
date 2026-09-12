import { test, expect } from './fixtures.js';
import { ready, searchMode } from './helpers.js';

/**
 * **What the boot is allowed to download.**
 *
 * Split out of `daily-panel.spec.js` on 2026-09-12 (author: name a file for
 * what it does). These two tests are not about the Daily page - it is only the
 * route they happen to open, because it is the heaviest one. What they hold is
 * a budget on the first load, and both were written after a review found the
 * site paying it.
 *
 * 2026-08-27: the first download was 470 kB of JavaScript. 293 kB of it was
 * `data/liturgical-days.js`, six months of hand-transcribed pericopes, and
 * 106 kB was all four locale packs - so a reader opening the Map downloaded
 * both to look at neither. Addendum G1, the same week: `manifest.meta.json`
 * was fetched beside the manifest on the path that blocks first paint, and no
 * reader for it existed anywhere in `src/`.
 *
 * **Both assert the shape, not a byte count**, which would go stale the first
 * time a saint was added. And both are network assertions rather than unit
 * tests on purpose: what is claimed is *which requests the boot makes*, and
 * `lib/manifest.js` builds its URLs from `import.meta.env.BASE_URL`, which
 * does not exist under `node --test`. A unit test would have had to fake the
 * thing under test.
 *
 * **These need a real build.** They match `/assets/index-*.js`, which exists
 * in `dist/` and not under the dev server, so they pass only through the
 * project's own Playwright config.
 */

/*
 * The suite standing seed: All Saints opens on the carousel, and dropping
 * this from any spec file hands its tests the other face. Neither test here
 * visits All Saints, but the seed is what every other file establishes
 * before a page loads, and these two assert what a boot downloads.
 */
test.beforeEach(async ({ page }) => {
  await searchMode(page);
});

test('the day records and the locale packs are fetched, not carried in the entry chunk', async ({ page }) => {
  /*
   * The review's second finding, 2026-08-27: the first download was 470 kB of
   * JavaScript, of which 293 kB was `data/liturgical-days.js` — six months of
   * hand-transcribed pericopes — and 106 kB was all four locale packs. A
   * reader opening the Map downloaded both to look at neither.
   *
   * Both are their own chunks now. The day records are started at boot and
   * awaited *beside* the manifest, which is the longer wait at 490 kB, so they
   * arrive inside a wait the reader was making anyway and nothing on the page
   * moves — the fast tag's grade is read out of a day's own note, so a column
   * painted before they landed would have shown an ungraded tag and then
   * changed it. The packs are fetched one language at a time.
   *
   * This asserts the shape rather than a byte count, which would go stale the
   * first time a saint was added.
   *
   * **Re-verified on 2026-09-12**, when `views/daily/picker.js` (1,060 lines)
   * and `views/daily/panel.js` (793) were deleted and `daily/{sidebar,tiles,
   * open,lives}.js` took their place: the entry chunk is rebuilt by that
   * change, and a split that survives only by accident is a split that will
   * not survive the next one.
   */
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
  /*
   * Addendum G1, done 2026-08-28. `loadManifest` fetched `manifest.meta.json`
   * beside the manifest in one `Promise.all` and hung it on `data.meta`, and a
   * sweep of `src/` found **no reader** — the only other `.meta` in the
   * codebase is `image.meta` in lib/detail.js, a different field.
   *
   * The file is 1,247 bytes, so the cost was never the payload: it was a second
   * round trip on the path that blocks first paint, taken on every visit for a
   * page that does not exist yet. About's statistics are Session 9's and call
   * `loadManifestMeta()` when they arrive.
   *
   * Asserted at the network rather than in a unit test on purpose. What is
   * claimed is *which requests the boot makes*, and `lib/manifest.js` builds its
   * URLs from `import.meta.env.BASE_URL`, which does not exist under
   * `node --test`. A unit test would have had to fake the thing under test.
   *
   * **Re-verified on 2026-09-12** for the same reason as the test above: the
   * Daily page's whole module tree was replaced, and `views/daily/lives.js`
   * now fetches one payload per saint of the day rather than one hero's — so
   * what the boot asks for before any of that is worth asking again.
   */
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


