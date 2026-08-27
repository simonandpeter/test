import { test, expect } from './fixtures.js';
import {
  INDEX,
  POPULATED,
  ROUTES,
  panelSettled,
  ready,
  searchMode,
} from './helpers.js';
import { AxeBuilder } from '@axe-core/playwright';

/**
 * The brief's §13 quality floor, as an executable gate. Every item here is non-negotiable and is meant to fail the build when it regresses.
 *
 * Part of the browser suite, which was one file of 9,308 lines until
 * 2026-08-27 and is now one file per surface. **The tests themselves are
 * unchanged** — each carries the instruction that caused it and the date it
 * was written, which is where this suite's provenance has always lived; what
 * moved is only which file it sits in. `helpers.js` holds the shared fixtures.
 */

/*
 * All Saints opens on the carousel, and almost every test that visits it was
 * written about the other mode. The suite states which face it is testing
 * rather than each of forty-odd tests growing a line to press the toggle —
 * `searchMode` in helpers.js argues it. **Every spec file needs this**: it was
 * one `beforeEach` over one file, and dropping it from any of them would hand
 * those tests the carousel instead.
 */
test.beforeEach(async ({ page }) => {
  await searchMode(page);
});

for (const [label, path, prepare] of ROUTES) {
  test(`no axe violations: ${label}`, async ({ page }) => {
    if (prepare) await prepare(page);
    await ready(page);
    await page.goto(path, { waitUntil: 'networkidle' });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations.map((v) => v.id))).toEqual([]);
  });

  test(`no horizontal overflow: ${label}`, async ({ page }) => {
    if (prepare) await prepare(page);
    await ready(page);
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
    // And under COLD_FACE the rehearsal refuses the webfont itself, so the
    // failed request is the harness talking, not the page (fixtures.js).
    const mine = process.env.COLD_FACE && m.text().includes('net::ERR_FAILED');
    if (m.type() === 'error' && !m.text().includes('404') && !mine) errors.push(m.text());
  });
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  expect(errors).toEqual([]);
});

test('every interactive element takes visible keyboard focus', async ({ page }) => {
  await ready(page);
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

test('the heading takes focus on navigation but not on arrival', async ({ page }) => {
  // Moving focus to the new h1 is how a single-page app tells a screen reader
  // the page changed. On the first page of a visit there is no change to
  // announce, and Chrome scores a programmatic focus with no interaction
  // behind it as keyboard-driven — which put a focus ring around the heading
  // of every freshly loaded page until the reader clicked it away.
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('H1');

  await page.locator('.site-nav a[href$="/saints"]').click();
  await expect(page.locator('h1')).toHaveText('All Saints');
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.tagName))
    .toBe('H1');
});

test('reduced motion removes animation rather than shortening it', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await searchMode(page);
  await ready(page);
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

test('no axe violations on the first visit, with the two marks standing', async ({ page }) => {
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await expect(page.locator('.coachmark')).toHaveCount(2);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations, JSON.stringify(results.violations.map((v) => v.id))).toEqual([]);
  // And with the header's control open over the Index.
  await ready(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.locator('#church-open').click();
  /*
   * Once it has arrived. The panel fades in over 160 ms since 2026-08-26
   * evening and axe reads an opacity as a new colour — 303 contrast
   * violations at 2.71:1 on the frame this used to sample, every one of them
   * a colour that is at full strength a sixth of a second later.
   *
   * That is *not* the mistake DESIGN.md §2 keeps catching. The peek fade
   * (2.1:1) and the cycle line's opacity (4.17:1) were permanent washes over
   * text a reader had to read; this is a transient that lands at full
   * strength and stays there. What the gate is for is the resting state, and
   * the resting state is what this now measures.
   */
  await panelSettled(page);
  const open = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(open.violations, JSON.stringify(open.violations.map((v) => v.id))).toEqual([]);
});
