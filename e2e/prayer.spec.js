import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';
import { desk, ready } from './helpers.js';

/**
 * Prayer: the hymns the corpus holds, one saint at a time, with the two ways
 * out of that saint down either side.
 *
 * **Every premise is read off the build, never typed.** The page's corpus is
 * the saints the manifest says have a hymn, which is a number that moves the
 * day someone adds a folder — so a test that names it is a test that goes red
 * without having found anything.
 */

const MANIFEST = JSON.parse(readFileSync(new URL('../data/manifest.json', import.meta.url), 'utf8'));
const CARDS = Array.isArray(MANIFEST.saints) ? MANIFEST.saints : Object.values(MANIFEST.saints ?? MANIFEST);

/**
 * The page's own order, derived the same way `lib/prayer-order.js` derives it
 * — `hymnedSaints` then name order — so the two ends below are the corpus's
 * ends and not a guess about them.
 */
const HYMNED = CARDS.filter((c) => c.hymned?.length).sort((a, b) =>
  a.display_name.localeCompare(b.display_name),
);

const PRAYER = '/prayer';

test.beforeEach(async ({ page }) => {
  await ready(page);
  await desk(page);
});

test('the three columns stand side by side, and the saint is in the middle', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();

  /*
   * By geometry, never by document order (trap 1): the markup is written in the
   * phone's reading order — the saint first, then the two lists that hang off
   * them — and the desk moves the first aside back to the left with
   * `grid-column`. A `.first()` here would assert the source order and pass
   * whichever way the columns were drawn.
   */
  const box = (sel) =>
    page.evaluate((s) => {
      const el = document.querySelector(s);
      const r = el.getBoundingClientRect();
      // A hidden element reports 0 and would satisfy an ordering by accident
      // (trap 7), so the reading says whether it is drawn at all.
      return { x: r.x, y: r.y, w: r.width, drawn: el.clientWidth > 0 };
    }, sel);

  const [related, view, sameday] = await Promise.all([
    box('#hy-related'),
    box('#hy-view'),
    box('#hy-sameday'),
  ]);
  for (const [name, b] of [['related', related], ['view', view], ['sameday', sameday]]) {
    expect(b.drawn, `${name} is drawn`).toBe(true);
  }
  expect(related.x, 'recorded-with is left of the saint').toBeLessThan(view.x);
  expect(view.x, 'the saint is left of the same day').toBeLessThan(sameday.x);
  // One row, so the three tops agree to within a hair.
  expect(Math.abs(related.y - sameday.y)).toBeLessThan(2);
  // And the saint takes the room: the asides are the narrow pair.
  expect(view.w).toBeGreaterThan(related.w + sameday.w);
});

test('the page opens on the first saint the hymnal holds', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  const article = page.locator('.hy-saint');
  await expect(article).toBeVisible();
  // The pin's premise: the corpus's own first hymned saint by name.
  await expect(article).toHaveAttribute('data-slug', HYMNED[0].slug);
  await expect(page.locator('#hy-prev')).toBeDisabled();
  await expect(page.locator('#hy-next')).toBeEnabled();
});

test('stepping on changes the saint, and the drawn heading says so too', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  const article = page.locator('.hy-saint');
  await expect(article).toBeVisible();
  const before = {
    slug: await article.getAttribute('data-slug'),
    name: (await page.locator('.hy-name').textContent())?.trim(),
  };

  /*
   * **What the opacity was at the moment the card was replaced.** A poll taken
   * afterwards can only ever find the fade finished, so it would pass against
   * the mockup's own bug — a redraw on a timer aimed at a transition it does
   * not match, which paints the new saint at two thirds opacity. The observer
   * is the instrument that can see it; with nothing wrong it records 0.
   */
  await page.evaluate(() => {
    const hold = document.querySelector('#hy-hold');
    window.__swapOpacity = [];
    new MutationObserver(() => {
      window.__swapOpacity.push(Number(getComputedStyle(hold).opacity));
    }).observe(hold, { childList: true });
  });

  /*
   * **Dispatched, not clicked** (trap 3): `#hy-next` sits over a body that
   * carries its own scroll, and `locator.click()` scrolls its target into view
   * before pressing it.
   */
  await page.evaluate(() => document.querySelector('#hy-next').click());

  /*
   * **Two independent things** (trap 14): the article's `data-slug` is what the
   * page publishes about itself, and the heading is a glyph a reader could
   * have seen. The fade swaps on `transitionend`, so the third assertion is
   * that the new saint is drawn at full opacity rather than at two thirds of
   * it, which is the mockup's own bug and the one a class-watching test misses.
   */
  await expect(article).not.toHaveAttribute('data-slug', before.slug);
  await expect(page.locator('.hy-name')).not.toHaveText(before.name);
  // The heading is `saintName`, which puts the rank in front of the recorded
  // name — so the name is contained in it rather than equal to it.
  await expect(page.locator('.hy-name')).toContainText(HYMNED[1].display_name);
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector('#hy-hold')).opacity)).toBe('1');
  await expect(page.locator('#hy-prev')).toBeEnabled();

  // The card was written while the old one was gone, not while it was halfway
  // out. Anything above a hairline is the reader watching a cross-dissolve
  // nobody designed.
  const atSwap = await page.evaluate(() => window.__swapOpacity);
  expect(atSwap.length, 'the card was replaced').toBeGreaterThan(0);
  expect(Math.max(...atSwap), 'the swap happened behind a finished fade').toBeLessThan(0.05);
});

test('the hymnal is a book: neither end wraps', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();

  /*
   * Saturated rather than stepped 141 times at a fade each: `stepBy` refuses to
   * go past the last saint, and a disabled button fires no click at all, so
   * pressing more times than the corpus is long lands on the end and stays
   * there. The count comes off the manifest so it cannot fall short.
   */
  await page.evaluate((n) => {
    const next = document.querySelector('#hy-next');
    for (let i = 0; i < n; i += 1) next.click();
  }, HYMNED.length + 5);

  await expect(page.locator('#hy-next')).toBeDisabled();
  await expect(page.locator('#hy-prev')).toBeEnabled();
  await expect(page.locator('.hy-saint')).toHaveAttribute('data-slug', HYMNED[HYMNED.length - 1].slug);
});

test('the hymn column keeps the wheel: it scrolls and the page does not', async ({ page }) => {
  /*
   * **A short desk rather than a chosen saint.** Whether the opening saint's
   * troparion overflows is a fact about the corpus and moves with it, so the
   * premise is made by the window instead: past 1024 px wide the page gives up
   * its own scroll whatever its height, and at this height any hymn at all
   * overruns the column. The premise is then asserted rather than assumed.
   */
  await page.setViewportSize({ width: 1280, height: 420 });
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-hymns')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.querySelector('.hy-hymns')?.children.length ?? 0))
    .toBeGreaterThan(0);
  // A box mid-layout reports 0 and would satisfy this by accident (trap 7), so
  // the poll waits for a settled reading rather than taking the first.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const el = document.querySelector('.hy-hymns');
        return el.clientHeight > 0 ? el.scrollHeight - el.clientHeight : -1;
      }),
    )
    .toBeGreaterThan(0);

  await page.evaluate(() => {
    const el = document.querySelector('.hy-hymns');
    el.scrollTop = el.scrollHeight;
  });
  expect(await page.evaluate(() => document.querySelector('.hy-hymns').scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY), 'the page itself stayed put').toBe(0);
});

test('the page fetches the saint it is showing and its neighbours, not the corpus', async ({ page }) => {
  /*
   * Observed rather than intercepted: the suite runs with the service worker
   * registered, and a `page.route` pattern it never sees fails open (trap 13).
   * A cached answer can only *lower* this count, so the ceiling below holds
   * either way — and the floor is the answer to "what would this look like if
   * it were doing nothing", which is zero.
   */
  const payloads = [];
  page.on('request', (r) => {
    if (/\/saints\/[^/]+\/saint\.json(\?|$)/.test(r.url())) payloads.push(r.url());
  });

  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  await page.waitForTimeout(600);

  /*
   * Two: the saint in hand and the one after them, because a step should be a
   * cache hit rather than a fetch the reader waits through. There is nobody
   * before the first saint, so two is both the floor and — with one of slack
   * for a retry — most of the ceiling. The number this test exists to refuse is
   * the length of the hymnal.
   */
  expect(payloads.length, 'the shown saint and its neighbour').toBeGreaterThanOrEqual(2);
  expect(payloads.length, 'and not the whole hymnal').toBeLessThanOrEqual(3);
  expect(payloads.length).toBeLessThan(HYMNED.length);
});
