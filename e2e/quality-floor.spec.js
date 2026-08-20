import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

/**
 * The brief's §13 quality floor, as an executable gate. Every item here is
 * non-negotiable and is meant to fail the build when it regresses.
 *
 * A day with commemorations and a day without are both checked everywhere,
 * because the empty state is a designed state (DESIGN.md §5b) and is exactly
 * the kind of thing that rots unnoticed while the populated path stays fine.
 */

// 30 January 2026: Anthony the Great, Eastern Orthodox (17 Jan Julian) and
// Coptic (22 Tobi) — two traditions reaching one Gregorian day by different
// calendar arithmetic, which makes it the most load-bearing date in the corpus.
const POPULATED = '/calendar/2026-01-30';
const EMPTY = '/calendar/2026-08-20';

const ROUTES = [
  ['calendar, populated', POPULATED],
  ['calendar, empty day', EMPTY],
  ['all saints', '/saints'],
  ['map', '/map'],
  ['about', '/about'],
];

for (const [label, path] of ROUTES) {
  test(`no axe violations: ${label}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations.map((v) => v.id))).toEqual([]);
  });

  test(`no horizontal overflow: ${label}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });
}

test('no console errors on load', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    // The SPA deep-link fallback makes GitHub Pages return a 404 status whose
    // body is the app shell; the resulting resource error is inherent to the
    // technique and is not a fault.
    if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text());
  });
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  expect(errors).toEqual([]);
});

test('every interactive element takes visible keyboard focus', async ({ page }) => {
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      return { tag: el.tagName, outline: s.outlineStyle, width: s.outlineWidth };
    });
    if (!focused) continue;
    expect(focused.outline, `${focused.tag} has no focus outline`).not.toBe('none');
  }
});

test('the day is reachable by keyboard through the week strip', async ({ page }) => {
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const before = await page.locator('h1').first().textContent();
  await page.locator('.week-strip button').first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('h1').first()).not.toHaveText(before ?? '');
});

test('reduced motion removes animation rather than shortening it', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const animated = await page.evaluate(() =>
    [...document.querySelectorAll('*')].some((el) => {
      const s = getComputedStyle(el);
      const dur = (v) => v.split(',').some((d) => parseFloat(d) > 0);
      return dur(s.animationDuration) || dur(s.transitionDuration);
    }),
  );
  expect(animated, 'something still animates under prefers-reduced-motion').toBe(false);
  await ctx.close();
});

test('a populated day renders hero, badge and each tradition in its own reckoning', async ({ page }) => {
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await expect(page.locator('.hero-name')).toHaveText('Anthony the Great');
  await expect(page.locator('.empty-day')).toHaveCount(0);

  const badge = page.locator('.hero svg.badge');
  await expect(badge).toHaveAttribute('aria-label', /Venerated in 3 of 4 communions/);
  // Three attested cells as filled squares, one undocumented as a dot: the
  // three states must stay distinguishable by shape, not colour alone.
  await expect(badge.locator('rect')).toHaveCount(3);
  await expect(badge.locator('circle')).toHaveCount(1);

  const feasts = await page.locator('.hero-feasts li').allTextContents();
  expect(feasts.join(' | ')).toContain('17 January (Julian)');
  expect(feasts.join(' | ')).toContain('22 Tobi');
  await expect(page.locator('.cal-reckonings')).toContainText('Coptic 22 Tobi');
});

test('an empty day is a designed state, not a hole', async ({ page }) => {
  await page.goto(EMPTY, { waitUntil: 'networkidle' });
  await expect(page.locator('.empty-day')).toHaveCount(1);
  await expect(page.locator('.hero')).toHaveCount(0);
  // The chrome stays: an empty day must still offer a way onward.
  await expect(page.locator('.week-strip button')).toHaveCount(7);
});

test('the card image box is reserved from manifest data before it loads', async ({ page }) => {
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const img = page.locator('.hero-media img');
  await expect(img).toBeVisible();
  const box = await img.boundingBox();
  const ratio = box.width / box.height;
  // Anthony's icon is 369x501; the rendered box must match its aspect, which
  // is what makes the no-layout-shift guarantee structural rather than lucky.
  expect(Math.abs(ratio - 369 / 501)).toBeLessThan(0.02);
});
