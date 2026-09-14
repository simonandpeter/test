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
 * The brief's §13 quality floor, as an executable gate. Every item here is
 * non-negotiable and is meant to fail the build when it regresses.
 * docs/E2E-DECISIONS.md#quality-floorspecjs
 */

// **Every spec file needs this**: dropping it hands these tests the carousel
// instead of the search face they were written about (`searchMode`, helpers.js).
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

  /*
   * `tests/contrast.test.mjs` holds the *tokens* to the floor and is much the
   * faster check. This one holds the **compositions**: a token pair no test
   * thought to look at is exactly how the last dark-mode AA failure hid.
   * docs/E2E-DECISIONS.md#quality-floorspecjs
   */
  test(`no axe violations in vigil mode: ${label}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    if (prepare) await prepare(page);
    await ready(page);
    await page.goto(path, { waitUntil: 'networkidle' });
    // The theme is a class the boot script sets, so prove the emulation took
    // rather than measuring the light palette twice and calling it two passes.
    await expect(page.locator('html')).toHaveClass(/dark/);
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

/*
 * Brief §13: "No layout shift when data arrives — skeletons must match final
 * dimensions."
 *
 * The budget is 0.02, not the 0.1 of Core Web Vitals "good": the brief says
 * *no* shift, and 0.1 would license eight times the movement it allows.
 * **It should be argued down rather than up.**
 * docs/E2E-DECISIONS.md#quality-floorspecjs
 */
const CLS_BUDGET = 0.02;

const watchShifts = (page) =>
  page.addInitScript(() => {
    window.__shifts = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.hadRecentInput) continue;
        window.__shifts.push({
          value: e.value,
          // The nodes that moved, so a red run says what to fix rather than
          // only that something somewhere grew.
          sources: (e.sources ?? [])
            .map((s) => s.node?.tagName?.toLowerCase() + (s.node?.className ? '.' + String(s.node.className).split(' ')[0] : ''))
            .filter((n) => n && !n.startsWith('undefined')),
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });

const clsOf = async (page) => {
  const shifts = await page.evaluate(() => window.__shifts ?? []);
  const total = shifts.reduce((n, s) => n + s.value, 0);
  const blame = shifts
    .filter((s) => s.value > 0.0001)
    .map((s) => `${s.value.toFixed(4)} [${s.sources.join(', ') || 'unattributed'}]`)
    .join('; ');
  return { total, blame };
};

for (const [label, path, prepare] of ROUTES) {
  test(`nothing shifts as the data arrives: ${label}`, async ({ page }) => {
    await watchShifts(page);
    if (prepare) await prepare(page);
    await ready(page);
    await page.goto(path, { waitUntil: 'networkidle' });
    /*
     * Idle **again**, deliberately, and then a timeout. The late arrival this
     * criterion is about — the Daily page's hymns — starts its fetch *after*
     * the first `networkidle` is declared, so only a second wait straddles it;
     * the timeout then buys the paint.
     */
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    const { total, blame } = await clsOf(page);
    expect(total, `CLS ${total.toFixed(4)} over budget ${CLS_BUDGET} — ${blame}`).toBeLessThanOrEqual(CLS_BUDGET);
  });
}

/*
 * Brief §13: "All colour information duplicated in text or shape" — PLAN.md's
 * §7 greyscale test. Both of the grid's channels are held, because the grid
 * uses a different one per mark: a **shape** (rules under and above the
 * numeral, solid for the strict fast and dashed for the fish day) and the
 * **words**, in the cell's own accessible name.
 *
 * The shape assertion is deliberately about shape and *not* hue — every colour
 * is masked out before the comparison, because asserting the colours differ
 * would pass on the defect. Hence `borderTopStyle` below and not only
 * `borderTopWidth`: solid and dashed are the same width, and a pair told apart
 * by width alone is a thinner line rather than a different one — green here and
 * silent to the reader. **Two weights would pass; they must not.**
 * docs/E2E-DECISIONS.md#quality-floorspecjs
 */
test('a day in the month grid is told apart by shape and by words, not only by hue', async ({ page }) => {
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });

  const shapes = await page.evaluate(() => {
    /*
     * Probe cells mounted in the real grid rather than whichever marks this
     * month happens to carry: the question is whether these classes draw
     * differently with the colour taken away, which is a fact about the
     * stylesheet, and the corpus is free to stop having a fish week. Reading
     * the live cells instead once compared one kind against itself.
     */
    const grid = document.querySelector('.cal');
    const out = {};
    for (const kind of ['plain', 'is-fast', 'is-fish', 'is-feast']) {
      // A button, because that is what the grid renders: a span would measure
      // an element this page does not draw, and the button's own borders are
      // reset in a rule a span never matches.
      const el = document.createElement('button');
      el.className = kind === 'plain' ? 'cal-day' : `cal-day ${kind}`;
      el.textContent = '8';
      grid.append(el);
      const s = getComputedStyle(el);
      /*
       * Everything a reader could tell the cells apart by *except* colour, so
       * a rule that differs only in its ink reads here as no rule at all.
       *
       * A *fully transparent* colour masks to its own token, not to `C`: every
       * `.cal-day` carries a transparent `border-top` so no cell moves when a
       * mark appears, and collapsing that placeholder into an inked rule would
       * make a day with a fast read exactly like a day without one.
       */
      const noInk = (v) =>
        String(v)
          .replace(/rgba\([^)]*,\s*0(\.0+)?\s*\)/gi, 'BLANK')
          .replace(/(rgba?\([^)]*\)|#[0-9a-f]{3,8})/gi, 'C');
      out[kind] = [
        s.width,
        s.height,
        s.borderRadius,
        s.borderTopWidth,
        s.borderTopStyle,
        noInk(s.borderTopColor),
        s.borderStyle,
        noInk(s.boxShadow),
        s.outlineStyle,
        s.outlineWidth,
        s.textDecorationLine,
        s.fontWeight,
        s.transform,
        getComputedStyle(el, '::after').content,
      ].join('|');
      el.remove();
    }
    return out;
  });

  // The premise, asserted rather than assumed: four probes, or the comparisons
  // below are green because they compared nothing.
  expect(Object.keys(shapes), 'a probe went missing from the grid').toHaveLength(4);
  expect(shapes['is-feast'], 'a feast is drawn exactly like a plain day, so only colour marks it').not.toBe(
    shapes.plain,
  );
  expect(shapes['is-fast'], 'a strict fast is drawn exactly like a plain day, so only colour marks it').not.toBe(
    shapes.plain,
  );
  expect(shapes['is-fish'], 'a fish day is drawn exactly like a plain day, so only colour marks it').not.toBe(
    shapes.plain,
  );
  // The pair the audit was written for: two marks that are each a shape but the
  // same shape are still one channel between them.
  expect(shapes['is-fast'], 'a fast and a fish day are the same shape, so only colour tells them apart').not.toBe(
    shapes['is-fish'],
  );

  // The words, off the live grid: every marked cell names its mark in its own
  // accessible name, so the numeral's colour is never the only thing saying it.
  const said = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.cal-day')];
    const marked = cells.filter((c) => ['is-fast', 'is-fish', 'is-feast'].some((k) => c.classList.contains(k)));
    return marked.map((c) => ({
      kinds: ['is-fast', 'is-fish', 'is-feast'].filter((k) => c.classList.contains(k)),
      label: c.getAttribute('aria-label') ?? '',
    }));
  });

  // Again the premise: a month with nothing marked in it proves nothing.
  expect(said.length, 'no day in this month carries a mark, so the loop below asserts nothing').toBeGreaterThan(0);

  const WORDS = { 'is-fast': 'a fast', 'is-fish': 'fish permitted', 'is-feast': 'a feast' };
  for (const { kinds, label } of said) {
    for (const kind of kinds) {
      expect(label.toLowerCase(), `a ${kind} day says its mark in colour and nowhere else`).toContain(WORDS[kind]);
    }
  }
});

test('no console errors on load', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    // Two exemptions, both the harness rather than the page: the SPA deep-link
    // fallback answers 404 with the app shell, and COLD_FACE refuses the
    // webfont itself (fixtures.js).
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
  // the page changed — but on the first page of a visit there is nothing to
  // announce, and Chrome scores a programmatic focus with no interaction behind
  // it as keyboard-driven, ringing the heading of every fresh load.
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
   * Once it has arrived: axe reads an opacity as a new colour, and the panel
   * fades in, so sampling mid-flight indicts colours that are at full strength
   * a sixth of a second later. **Not** the mistake PLAN.md keeps catching — a
   * permanent wash over text is a real defect; this is a transient. The gate is
   * for the resting state. docs/E2E-DECISIONS.md#quality-floorspecjs
   */
  await panelSettled(page);
  const open = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(open.violations, JSON.stringify(open.violations.map((v) => v.id))).toEqual([]);
});
