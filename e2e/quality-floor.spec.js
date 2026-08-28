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

  /*
   * The same sweep in vigil mode, which until 2026-08-28 nothing ran at all —
   * CLAUDE.md said so plainly ("dark mode is not covered by the axe/contrast
   * tests") and it cost a real WCAG AA failure four days of standing: dark
   * `--rubric` at 3.93:1 on the field, on the token carrying the current nav
   * item and today's date. DESIGN.md had it recorded as a live defect the whole
   * time. What finally said it out loud was Lighthouse, whose headless Chrome
   * happens to ask for dark — an accident, and not a thing to leave a gate
   * resting on.
   *
   * `tests/contrast.test.mjs` holds the *tokens* to the floor and is much the
   * faster check. This one holds the **compositions**: a token pair no test
   * thought to look at is exactly how the last one hid.
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
 * dimensions." HANDOFF.md called this criterion green for weeks and **nothing
 * measured it** — there was no CLS assertion anywhere in `e2e/` until now.
 *
 * The measurement is the browser's own `layout-shift` entries rather than a
 * before/after `getBoundingClientRect`: a rect pair catches the shift a test
 * thought to look for, and the layout-shift buffer catches the one it did not.
 * `hadRecentInput` drops shifts a reader caused by pressing something, which is
 * the whole point — growing when asked is not a defect, growing on its own is.
 *
 * The budget is 0.02, not the 0.1 of Core Web Vitals "good". The brief says
 * *no* shift; 0.1 is the threshold below which Google stops complaining, and
 * adopting it here would license eight times the movement the brief allows. The
 * value is what the site actually scores with room for the runner's rounding,
 * and it should be argued down rather than up.
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
     * The Daily page's hymns are the late arrival this criterion is about:
     * `fillSaintHymns` waits on the hero saint's detail payload, lands after
     * `networkidle` has already been declared, and grows the panel by ~500 px.
     * Whether that *shifts* anything is the question — growth below the fold is
     * not a shift — so the wait has to outlast it either way. That second fetch
     * starts *after* the first `networkidle` is declared, so waiting for idle
     * again is what actually straddles it; the timeout then buys the paint.
     */
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    const { total, blame } = await clsOf(page);
    expect(total, `CLS ${total.toFixed(4)} over budget ${CLS_BUDGET} — ${blame}`).toBeLessThanOrEqual(CLS_BUDGET);
  });
}

/*
 * Brief §13: "All colour information duplicated in text or shape." DESIGN.md
 * calls this the §7 greyscale test — remove every colour and the reader loses
 * nothing — and §2 makes it the first of the three conditions that keep the
 * fast's colour-by-kind honest. It had never been audited, executably or by
 * hand, until 2026-08-28.
 *
 * The rail's marks are where it failed. Each day can carry up to three dots —
 * a strict fast, fish-permitted, a feast — and they were one 5 px disc in three
 * hues: same size, same `border-radius: 50%`, same position, differing in
 * `background` and in nothing else. The words exist, but only in the button's
 * `aria-label`; the dots are `aria-hidden`. So a screen reader was told which
 * mark it was and a sighted reader who cannot separate the hues was not, which
 * is the one reader this criterion is written for.
 *
 * The assertion is deliberately about *shape and not hue*: it compares the
 * non-colour computed styles and requires every pair of kinds to differ in at
 * least one of them. Asserting the colours differ would pass on the defect.
 */
test('a day mark is told apart by shape, not only by hue', async ({ page }) => {
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });

  const shapes = await page.evaluate(() => {
    const kinds = ['mark-fast', 'mark-fish', 'mark-feast'];
    const out = {};
    /*
     * Probe elements in the rail's own row rather than whichever marks this
     * week happens to carry. The first version read the live dots and asserted
     * its own premise, which is how it reported that 30 January's week stands
     * only a strict fast: one kind, and a comparison of one thing against
     * itself is green for the wrong reason.
     *
     * The question here is exactly "do these three classes draw differently
     * with the colour taken away", which is a fact about the stylesheet and not
     * about the corpus — and the corpus is free to stop having a fish week.
     * They are mounted inside a real `.day-marks` row so anything inherited or
     * descendant-scoped applies as it does in place.
     */
    const row = document.querySelector('.week-strip .day-marks') ?? document.querySelector('.week-strip button');
    for (const kind of kinds) {
      const el = document.createElement('span');
      el.className = `day-mark ${kind}`;
      row.append(el);
      const s = getComputedStyle(el);
      // Everything a reader could tell the marks apart by *except* colour.
      out[kind] = [
        s.width,
        s.height,
        s.borderRadius,
        s.borderTopWidth,
        s.borderStyle,
        s.transform,
        s.clipPath,
        getComputedStyle(el, '::before').content,
      ].join('|');
      el.remove();
    }
    return out;
  });

  const kinds = Object.keys(shapes);
  // The premise, asserted rather than assumed: three kinds, or the loop below
  // is green because it compared nothing.
  expect(kinds, 'a mark kind went missing from the probe').toHaveLength(3);

  for (const a of kinds) {
    for (const b of kinds) {
      if (a >= b) continue;
      expect(
        shapes[a],
        `${a} and ${b} are the same shape, so only colour tells them apart`,
      ).not.toBe(shapes[b]);
    }
  }
});

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
