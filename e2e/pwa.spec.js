import { test, expect } from './fixtures.js';
import { ready } from './helpers.js';

/**
 * App mode (brief §12): the manifest, the worker, and the offline promises.
 *
 * The worker registers on every production page load, which is what `vite
 * preview` serves — so every test in the suite already runs *with* the worker,
 * and the console-error and quality-floor sweeps have been passing over it.
 * What this file adds are the claims the rest of the suite cannot make: that
 * the caches fill, and that the site still answers when the network is gone.
 *
 * Offline is Playwright's own (`context.setOffline`), which severs the network
 * *under* the service worker — exactly a phone in a tunnel. Each offline test
 * loads once online first, because the offline promise is about what a visit
 * leaves behind, and asserts its premise (a controlling worker) before
 * cutting the cord: an offline test with no worker would fail for the boring
 * reason and report the interesting one.
 */

/** Registered, active, and controlling this page — the premise of every offline claim. */
const controlled = async (page) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;
    // First-ever load: the worker activates with clients.claim(), which can
    // land a beat after ready resolves.
    await new Promise((resolve) => {
      navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
      setTimeout(resolve, 3000);
    });
  });
  return page.evaluate(() => Boolean(navigator.serviceWorker.controller));
};

test('the site is installable: a manifest, reachable, with maskable icons', async ({ page }) => {
  await ready(page);
  await page.goto('/', { waitUntil: 'networkidle' });

  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href, 'no manifest link in the head').toBeTruthy();

  const manifest = await page.evaluate(async (h) => (await fetch(h)).json(), href);
  expect(manifest.name).toBe('Daily Dox');
  expect(manifest.display).toBe('standalone');
  // Maskable is the difference between an icon and a white square on Android.
  expect(manifest.icons.some((i) => /maskable/.test(i.purpose ?? ''))).toBe(true);
  // And the icons resolve — a manifest naming a 404 is a broken install.
  for (const icon of manifest.icons) {
    const ok = await page.evaluate(async (src) => (await fetch(src)).ok, new URL(icon.src, new URL(href, page.url())).pathname);
    expect(ok, `${icon.src} does not resolve`).toBe(true);
  }
});

test('the worker takes the page and lays down the shell', async ({ page }) => {
  await ready(page);
  await page.goto('/', { waitUntil: 'networkidle' });
  expect(await controlled(page), 'the worker never took control').toBe(true);

  // The shell cache holds the app and the corpus's one indispensable file —
  // laid down at install, not left to luck about what the reader revisits.
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const names = await caches.keys();
          const shell = names.find((n) => n.startsWith('shell-'));
          if (!shell) return [];
          const keys = await (await caches.open(shell)).keys();
          return keys.map((k) => new URL(k.url).pathname);
        }),
      { message: 'the shell cache never filled' },
    )
    .toEqual(expect.arrayContaining(['/', '/data/manifest.json']));
});

test('offline, the site still opens', async ({ page, context }) => {
  await ready(page);
  await page.goto('/calendar/2026-01-30', { waitUntil: 'networkidle' });
  expect(await controlled(page), 'premise: the worker controls the page').toBe(true);

  await context.setOffline(true);
  try {
    /*
     * A different route than the one that was loaded, deliberately: what is
     * cached is the *shell*, and the navigation fallback serves it for any
     * path — the router reads the address and takes it from there. That is
     * the whole of offline routing for a single-page app.
     */
    await page.goto('/about', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toHaveText('About');
  } finally {
    await context.setOffline(false);
  }
});

test('a saint once read stays readable offline', async ({ page, context }) => {
  await ready(page);
  await page.goto('/saints/anthony-the-great', { waitUntil: 'networkidle' });
  expect(await controlled(page), 'premise: the worker controls the page').toBe(true);
  /*
   * Read *again*, now controlled. The very first page view's fetches race the
   * worker's install and go straight to the network - a worker only sees
   * requests made after it claims - so "cache on read" starts from the second
   * read of a fresh browser, which is what this reload is. The promise under
   * test is about what a controlled read leaves behind.
   */
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('.life p').first()).toBeVisible();

  await context.setOffline(true);
  try {
    await page.goto('/saints/anthony-the-great', { waitUntil: 'domcontentloaded' });
    // The life arrived from the cache: real prose, not the error note.
    await expect(page.locator('.life p').first()).toBeVisible();
    await expect(page.locator('.error-note')).toHaveCount(0);
  } finally {
    await context.setOffline(false);
  }
});

test('a saint never read says so offline, honestly', async ({ page, context }) => {
  await ready(page);
  await page.goto('/calendar/2026-01-30', { waitUntil: 'networkidle' });
  expect(await controlled(page), 'premise: the worker controls the page').toBe(true);

  await context.setOffline(true);
  try {
    /*
     * Brief §12: "uncached saints show a clear 'Not available offline' state,
     * not a broken card." Christopher was never opened in this context, so his
     * payload is not in any cache — the shell boots (navigation fallback), the
     * manifest names him (it is in the shell cache), and the *detail* fetch is
     * the one that fails. The page must say what is actually true: nothing
     * stored, network needed once — and not offer a retry-shaped apology about
     * hiccups.
     */
    await page.goto('/saints/christopher', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.error-note')).toBeVisible();
    await expect(page.locator('.error-note')).toContainText('offline');
    await expect(page.locator('.error-note')).not.toContainText('hiccup');
    // The shell of the page still stands around the note - the name is in the
    // manifest, so the header of the card is real, not broken.
    await expect(page.locator('h1')).toContainText('Christopher');
  } finally {
    await context.setOffline(false);
  }
});

test('saving a saint fetches them, so the shelf keeps its offline promise', async ({ page, context }) => {
  await ready(page);
  await page.goto('/saints/moses-the-prophet', { waitUntil: 'networkidle' });
  expect(await controlled(page), 'premise: the worker controls the page').toBe(true);

  // Press Save, which is the eager-precache trigger (§12).
  await page.locator('.saint-head [data-save], [data-save]').first().click();
  // The precache is fire-and-forget; poll the cache for the payload to land.
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const names = await caches.keys();
          const saints = names.find((n) => n.startsWith('saints-'));
          if (!saints) return false;
          const keys = await (await caches.open(saints)).keys();
          return keys.some((k) => k.url.includes('/saints/moses-the-prophet/saint.json'));
        }),
      { message: 'the save never reached the cache' },
    )
    .toBe(true);

  await context.setOffline(true);
  try {
    await page.goto('/saints/moses-the-prophet', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.life p').first()).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
