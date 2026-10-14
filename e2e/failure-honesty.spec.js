/**
 * Errors 1, rendered: a failure may degrade the page, never fake it.
 *
 * Each test breaks exactly one file and reads what the reader is then told.
 * The bar is not "the page survived" — it is that the page says it has
 * nothing, and states no figure and no answer it did not receive.
 *
 * Every context blocks service workers and every route counts its
 * interceptions (CLAUDE.md trap 13): `page.route` cannot see a worker's own
 * fetches, and a pattern that matches nothing fails open, so each test asserts
 * that it actually broke something before it asserts what the page said.
 */
import { test, expect } from '@playwright/test';

/** Breaks `glob` for this page, and hands back the interception count. */
async function breakFile(page, glob, fulfill) {
  const seen = { n: 0 };
  await page.route(glob, (route) => {
    seen.n += 1;
    return fulfill ? route.fulfill(fulfill) : route.fulfill({ status: 500, body: 'injected' });
  });
  return seen;
}

test.use({ serviceWorkers: 'block' });

test('the Texts page that could not read its index does not say the site cites nothing', async ({ page, baseURL }) => {
  const seen = await breakFile(page, '**/data/texts.json');
  await page.goto('/texts');
  const note = page.locator('.error-note');
  await expect(note).toBeVisible();
  expect(seen.n, 'texts.json was never intercepted, so this test proved nothing').toBeGreaterThan(0);

  const said = (await page.locator('.about').innerText()).toLowerCase();
  // The page may say it could not load the list. It may not answer the
  // question the list exists to answer.
  expect(said).toContain('could not be loaded');
  expect(said, 'a failed fetch was reported as an empty corpus').not.toContain('nothing here yet');
  expect(page.url()).toContain(new URL('/texts', baseURL).pathname);
});

test('the Texts page with a genuinely empty index still says so', async ({ page }) => {
  const seen = await breakFile(page, '**/data/texts.json', {
    status: 200,
    contentType: 'application/json',
    body: '[]',
  });
  await page.goto('/texts');
  await expect(page.locator('[data-texts-list]')).toContainText(/nothing here yet/i);
  expect(seen.n).toBeGreaterThan(0);
});

test('About states no coverage figure from a meta file it could not read', async ({ page }) => {
  const seen = await breakFile(page, '**/data/manifest.meta.json');
  await page.goto('/about');
  const coverage = page.locator('[data-coverage]');
  await expect(coverage).toContainText(/could not be loaded/i);
  expect(seen.n).toBeGreaterThan(0);
  await expect(coverage).not.toContainText(/\b0 (saints|commemorations)/i);
});

test('About states no coverage figure from a meta file that parsed but is not the meta', async ({ page }) => {
  /*
   * The case this was written for: a 200 carrying valid JSON of the wrong
   * shape reached `meta.total ?? 0` and `new Date(undefined)`, which threw out
   * of the date formatter *before* the section was assigned — so the coverage
   * block was left silently blank, which is the one thing `fillCounted`'s own
   * header says not to do.
   */
  const seen = await breakFile(page, '**/data/manifest.meta.json', {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ nope: 1 }),
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/about');
  const coverage = page.locator('[data-coverage]');
  await expect(coverage).toContainText(/could not be loaded/i);
  expect(seen.n).toBeGreaterThan(0);
  await expect(coverage).not.toContainText(/\b0 (saints|commemorations)/i);
  expect(errors.join(' '), 'the malformed meta threw instead of being refused').not.toMatch(/Invalid time value/);
});

test('a manifest answered with the app shell is reported as a host that sent a page', async ({ page }) => {
  /*
   * A static host that answers a miss with its SPA shell rather than a 404
   * hands the loader `200 text/html`. The page must still refuse it — and the
   * console line must name the URL rather than the JSON parser, which is what
   * made this a 3% intermittent nobody could pin.
   */
  const seen = await breakFile(page, '**/data/manifest.json', {
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><html><body><div id="app"></div></body></html>',
  });
  const logged = [];
  page.on('console', (m) => { if (m.type() === 'error') logged.push(m.text()); });
  await page.goto('/');
  await expect(page.locator('.error-note')).toContainText(/could not be loaded/i);
  expect(seen.n).toBeGreaterThan(0);
  expect(logged.join('\n')).toMatch(/data\/manifest\.json/);
  expect(logged.join('\n')).toMatch(/answered with a page, not the file/);
});

test('a manifest that is valid JSON of the wrong shape shows no saints and claims none', async ({ page }) => {
  const seen = await breakFile(page, '**/data/manifest.json', {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ saints: [] }),
  });
  await page.goto('/');
  await expect(page.locator('.error-note')).toContainText(/could not be loaded/i);
  expect(seen.n).toBeGreaterThan(0);
});
