import { test, expect } from './fixtures.js';
import {
  POPULATED,
  answered,
  dragGrain,
  duringMove,
  phone,
  ready,
  releaseGrain,
  searchMode,
  swipe,
  throwRail,
} from './helpers.js';

/**
 * The Daily page, the picker: the week strip and its rail, the month, the full-screen calendar, the reckoning, and the keys and swipes that turn the day.
 *
 * Part of the browser suite, which was one file of 9,308 lines until
 * 2026-08-27 and is now one file per surface. **The tests themselves are
 * unchanged** — each carries the instruction that caused it and the date it
 * was written, which is where this suite's provenance has always lived; what
 * moved is only which file it sits in. `helpers.js` holds the shared fixtures.
 *
 * **Split again on 2026-09-05** (cleanup plan item 6, on the author's word:
 * "Items 5 and 6"), by surface *within* the page rather than by the date a
 * test was written, once the one file had reached 5,793 lines. The rule
 * is the first split's: the tests are unchanged, each still carries
 * the instruction and the date that caused it, and only the file moved. The
 * `---- round ----` dividers are the rounds the tests were written in and
 * are repeated in whichever file holds a member of that round, so a test
 * still says which round it belongs to; the tests above the first divider
 * are the ones written before the file had any. The seam between the three
 * files is a judgement, not a measurement: a test that reads two surfaces
 * sits with the one its title names.
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


test('the day is reachable by keyboard through the week strip', async ({ page }) => {
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const before = await page.locator('h1').first().textContent();
  await page.locator('.week-strip button').first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('h1').first()).not.toHaveText(before ?? '');
});


test('the month replaces the week rather than opening beneath it', async ({ page }) => {
  await ready(page);
  await phone(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const week = page.locator('.week-strip');
  const month = page.locator('.month-body');
  const toggle = page.locator('[data-month]');

  await expect(week).toBeVisible();
  await expect(month).toBeHidden();

  await toggle.click();
  await expect(month).toBeVisible();
  // The whole point: two date pickers on screen at once were competing for the
  // same click, and a class selector quietly outranks the [hidden] attribute.
  await expect(week).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  await toggle.click();
  await expect(week).toBeVisible();
  await expect(month).toBeHidden();
});


test('a day is one click, and the keys step it from anywhere', async ({ page }) => {
  /*
   * Author, 2026-08-24 (Amendment 35). The peeked edges that moved a week are
   * gone with the rail — the reader scrolls to any day instead — and the
   * keyboard is now the page's, not the strip's: ArrowLeft/ArrowRight and S/D
   * step a day from anywhere on the page. They were bound inside the strip
   * until then, which meant they worked only after tabbing into it. A joined
   * S later the same day (author: "'A' key doesn't work for going back") —
   * a hand resting on WASD expects A to be "left" — and S left the next
   * morning, at the author's instruction: "it should only be the 'A' key".
   * So the pair is A and D, and S is asserted *dead* below, because a key
   * that quietly kept working would be the defect this test exists for.
   */
  await ready(page);
  await phone(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });

  // Days are one click each.
  await page.locator('.week-strip [data-iso="2026-08-24"]').click();
  await expect(page.locator('h1')).toHaveText(/24 Aug(ust)? 2026/);

  // The arrows, from the page body — no focus in the strip.
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('h1')).toHaveText(/25 Aug(ust)? 2026/);
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('h1')).toHaveText(/24 Aug(ust)? 2026/);

  // A and D beside them, for a hand that is not on the arrows.
  await page.keyboard.press('d');
  await expect(page.locator('h1')).toHaveText(/25 Aug(ust)? 2026/);
  await page.keyboard.press('a');
  await expect(page.locator('h1')).toHaveText(/24 Aug(ust)? 2026/);
  // And S does nothing: it stepped back a day for one day (2026-08-24) and
  // the author removed it the next.
  await page.keyboard.press('s');
  await expect(page.locator('h1')).toHaveText(/24 Aug(ust)? 2026/);

  // A modifier means the key is the browser's: ctrl+D must stay a bookmark.
  await page.keyboard.press('Control+d');
  await expect(page.locator('h1')).toHaveText(/24 Aug(ust)? 2026/);

  /*
   * And the day the reader left keeps no focus ring (author, 2026-08-25: "a
   * selection highlight remains over the day where you started moving from").
   * A day pressed with a pointer *is* focused — silently, because the press
   * was a pointer's — and the browser paints the ring on it the moment any
   * key is touched, so the old day wore a ring while the new day wore the
   * selection. The buttons are tabindex="-1" and the rail is the tab stop, so
   * that focus was never anyone's way in.
   */
  const ringed = await page.evaluate(() => {
    const active = document.activeElement;
    return {
      onADay: !!active?.closest?.('.week-strip [data-iso]'),
      tag: active?.tagName ?? null,
    };
  });
  expect(ringed.onADay).toBe(false);
});


test('the keys are the Daily page\'s, and typing elsewhere is untouched', async ({ page }) => {
  /*
   * The failure this pins is a leaked listener: wireDayKeys binds on
   * `document`, so if its cleanup were dropped, S and D pressed in the
   * Index's search box would be preventDefault-ed into dead keys — the
   * letters would simply not appear. The route must also hold still.
   *
   * Honesty note (house rule): the in-page typing guard inside onKey has no
   * reachable trigger today — the calendar page itself carries no text
   * input, and on every other page the view is destroyed and `state` is
   * null. It is defence-in-depth for the day the Daily page gains an input,
   * and this test cannot exercise it alone; what it can and does exercise is
   * the teardown, which is the layer that fails first in practice.
   */
  await ready(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  // Leave through the app's own nav, so the calendar's destroy() runs the
  // cleanups — the path a leak would leak through.
  await page.locator('.site-nav a[href$="/saints"]').click();
  const query = page.locator('[data-query]');
  await query.focus();
  await page.keyboard.type('sd');
  await expect(query).toHaveValue('sd');
  expect(page.url()).toContain('/saints');
});


test('the one jump control holds the left edge, carries a name, and fills the row', async ({ page }) => {
  /*
   * The crosshair that recentred the rail on today stood here until
   * 2026-08-26 (author: "remove the old button and stretch the monthly
   * toggle to take up the extra space"), stacked over the month toggle at
   * half the row's height each. It is withdrawn now that today carries its
   * own bubble in both grains — see the tests below — so this pins what is
   * left: one control, an icon-only button so its name has to come from the
   * label, standing the row's own full height rather than half of it.
   */
  await ready(page);
  await phone(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const jump = page.locator('.cal-jump button');
  await expect(jump).toHaveCount(1);
  const name = await jump.getAttribute('aria-label');
  expect(name?.length).toBeGreaterThan(3);
  const [stack, strip, span] = [
    await page.locator('.cal-jump').boundingBox(),
    await page.locator('.week-strip').boundingBox(),
    await page.locator('.cal-span').boundingBox(),
  ];
  expect(stack.x + stack.width).toBeLessThanOrEqual(span.x);
  // The full row height, not half of it — the space the second button left.
  expect(Math.round(stack.height)).toBe(Math.round(strip.height));
});


test('today carries its own bubble in the week and the month, apart from the selection', async ({ page }) => {
  /*
   * Author, 2026-08-26: "put a bubble around today's date in the weekly and
   * monthly display so even when selecting a different day you still
   * recognise today's date." A date three days after today is selected here
   * precisely so the two marks are pulled apart: `aria-current` on the
   * selected button, and a ring around today's own numeral regardless of
   * which day is picked.
   */
  await ready(page);
  await phone(page);
  // Same month as today, or the month view below would show today's mark in
  // a different month grid than the one the selection opens on — a real
  // failure mode near either end of a month, not a hypothetical one.
  const iso = await page.evaluate(() => {
    const today = new Date();
    const toIso = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const sameMonth = (n) => {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + n);
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() ? d : null;
    };
    const picked = sameMonth(3) || sameMonth(-3) || sameMonth(1) || sameMonth(-1);
    return toIso(picked);
  });
  await page.goto(`/calendar/${iso}`, { waitUntil: 'networkidle' });

  const week = await page.evaluate(() => {
    const today = document.querySelector('.week-strip .is-today');
    const selected = document.querySelector('.week-strip [aria-current="date"]');
    const ringed = (el) => getComputedStyle(el.querySelector('.day-num'), '::before').borderStyle !== 'none';
    return {
      distinct: today.dataset.iso !== selected.dataset.iso,
      todayRinged: ringed(today),
      selectedRinged: ringed(selected),
    };
  });
  expect(week.distinct).toBe(true);
  expect(week.todayRinged).toBe(true);
  // The selected day is not also today here, and wears no ring of its own —
  // the field and the underline are what mark it, so a ring on both would be
  // two marks for one day and no way to tell today from "the reader's place".
  expect(week.selectedRinged).toBe(false);

  await page.locator('[data-month]').click();
  await expect(page.locator('.cal-month')).toBeVisible();
  const month = await page.evaluate(() => {
    const today = document.querySelector('.month-grid button.is-today');
    const selected = document.querySelector('.month-grid [aria-current="date"]');
    const ringed = (el) => getComputedStyle(el.querySelector('.day-num'), '::before').borderStyle !== 'none';
    return {
      distinct: today.dataset.iso !== selected.dataset.iso,
      todayRinged: ringed(today),
      selectedRinged: ringed(selected),
    };
  });
  expect(month.distinct).toBe(true);
  expect(month.todayRinged).toBe(true);
  expect(month.selectedRinged).toBe(false);
});


test('the week and the month both take a swipe, in the same direction', async ({ page }) => {
  await ready(page);
  await phone(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });

  /*
   * The week's swipe is the browser's own scroll now (2026-08-24, Amendment
   * 35): the rail is a scroll container, a touch pan needs no listener of
   * ours, and the alignment asserted here is the CSS proximity snap's own
   * work — backing out settle() does not fail this test, and is not meant
   * to. What settle() uniquely owns is re-anchoring, which has a test of its
   * own below. A scroll left is forward in time by construction.
   */
  const settled = await page.evaluate(async () => {
    const strip = document.querySelector('.week-strip');
    const before = strip.scrollLeft;
    strip.scrollBy({ left: 150, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 400));
    const pad = parseFloat(getComputedStyle(strip).scrollPaddingLeft);
    const aligned = [...strip.querySelectorAll('[data-iso]')].some(
      (b) => Math.abs(b.offsetLeft - strip.scrollLeft - pad) < 2,
    );
    return { moved: strip.scrollLeft > before, aligned };
  });
  expect(settled.moved).toBe(true);
  expect(settled.aligned).toBe(true);
  // Scrolling is not selecting: the day only changes when one is chosen.
  await expect(page.locator('h1')).toHaveText(/28 Aug(ust)? 2026/);

  await page.locator('[data-month]').click();
  await expect(page.locator('.cal-month')).toBeVisible();
  await swipe(page, '.cal-month', -120);
  await expect(page.locator('.month-name')).toHaveText('Sep 2026');
  await swipe(page, '.cal-month', 120);
  await expect(page.locator('.month-name')).toHaveText('Aug 2026');

  // A short drag is a mistap, and a mostly-vertical one belongs to the scroll.
  await swipe(page, '.cal-month', -20);
  await swipe(page, '.cal-month', -120, 200);
  await expect(page.locator('.month-name')).toHaveText('Aug 2026');
});


test('picking a date leaves the month open; only the button closes it', async ({ page }) => {
  await ready(page);
  await phone(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  const month = page.locator('.cal-month');
  const toggle = page.locator('[data-month]');

  await toggle.click();
  await expect(month).toBeVisible();
  await page.locator('.month-grid [data-iso="2026-08-08"]').click();
  await expect(page.locator('h1')).toHaveText(/8 Aug(ust)? 2026/);
  // A reader comparing days should not have to reopen the month between them.
  await expect(month).toBeVisible();

  await toggle.click();
  await expect(month).toBeHidden();
  await expect(page.locator('.cal-week')).toBeVisible();
});


test('the month keeps the week edges where they were, and names itself in the gutter', async ({ page }) => {
  await ready(page);
  await phone(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const box = async (sel) => (await page.locator(sel).first().boundingBox());
  const strip = await box('.week-strip');
  // The rail replaced the week's peek buttons with real days (2026-08-24,
  // Amendment 35), so the reference is the rail's own snap inset: the month's
  // peeked column must stand in it — start where the strip starts, and end
  // where the snapped days begin — or the two grains shift sideways as they
  // swap. The snapped day's left edge is the strip's scroll-padding.
  const inset = await page
    .locator('.week-strip')
    .evaluate((el) => parseFloat(getComputedStyle(el).scrollPaddingLeft));

  await page.locator('[data-month]').click();
  await expect(page.locator('.cal-month')).toBeVisible();
  const monthPrev = await box('.cal-month .peek');
  const monthNext = await box('.cal-month .peek-next');

  expect(Math.round(monthPrev.x)).toBe(Math.round(strip.x));
  expect(monthPrev.x + monthPrev.width).toBeLessThanOrEqual(strip.x + inset + 1);
  expect(Math.round(monthNext.x + monthNext.width)).toBe(Math.round(strip.x + strip.width));

  // The name prints in the gutter under the jump stack and the back chevron
  // (author, 2026-08-21) rather than centred over the grid, where it pushed
  // every date down a line for a label the week manages without. It ends where
  // the chevron ends and starts below it, so it costs the row no height at all.
  const name = await box('.month-name');
  // It stops where the peeked column starts. The peek runs the full height of
  // the grid now, so a name spanning the whole gutter would print over it.
  expect(Math.round(name.x + name.width)).toBe(Math.round(monthPrev.x));
  const jump = await box('.cal-jump');
  expect(name.y).toBeGreaterThanOrEqual(jump.y + jump.height);
  expect(name.x).toBeLessThan((await box('.month-days')).x);
});


test('the month is the week grown taller: the day names do not move', async ({ page }) => {
  // Toggling grain changes how many rows there are, not where the week's own
  // headings sit (author, 2026-08-21) — which is what makes the dates read as
  // unfurling from under them rather than as a second control arriving.
  //
  // Measured on the text rather than on its box: in the week a day name is a
  // flex item centred in its button, in the month a grid cell carrying the
  // padding itself, so the two boxes differ exactly where the glyphs do not.
  await ready(page);
  await phone(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const text = (sel) =>
    page.evaluate((s) => {
      const range = document.createRange();
      return [...document.querySelectorAll(s)].map((el) => {
        range.selectNodeContents(el);
        const r = range.getBoundingClientRect();
        return [Math.round(r.x + r.width / 2), Math.round(r.top), Math.round(r.height)];
      });
    }, sel);

  // The seven snapped days of the rail — the ones standing where the week
  // stood. The rail holds 121 (2026-08-24), so the visible run is selected by
  // geometry: from the snap inset to its mirror on the right.
  const week = (await page.evaluate(() => {
    const strip = document.querySelector('.week-strip');
    const sb = strip.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(strip).scrollPaddingLeft);
    const range = document.createRange();
    return [...strip.querySelectorAll('.day-name')]
      .map((el) => {
        range.selectNodeContents(el);
        const r = range.getBoundingClientRect();
        return [Math.round(r.x + r.width / 2), Math.round(r.top), Math.round(r.height)];
      })
      .filter(([x]) => x > sb.x + pad - 2 && x < sb.right - pad + 2);
  })).slice(0, 7);
  await page.locator('[data-month]').click();
  await expect(page.locator('.cal-month')).toBeVisible();
  await page.waitForTimeout(600);

  expect(week).toHaveLength(7);
  // Scoped to the day-name row: the peeked column beside the grid carries a
  // spacer in the same class, because it takes the same metrics from it.
  // Within a pixel, not exact (2026-08-24): the rail is a flex row and the
  // month a grid, and at 360 px the two round the same fractional column to
  // neighbouring pixels. A real shift is a column's worth, not one pixel.
  const month = await text('.month-days .month-day-name');
  expect(month).toHaveLength(7);
  for (let i = 0; i < 7; i += 1) {
    expect(Math.abs(month[i][0] - week[i][0])).toBeLessThanOrEqual(1);
    expect(Math.abs(month[i][1] - week[i][1])).toBeLessThanOrEqual(1);
    expect(month[i][2]).toBe(week[i][2]);
  }
});


test('the month spends its height on dates rather than on leading', async ({ page }) => {
  // January 2026 is five rows. Nothing in the grid is set in the serif — the
  // dates and the day names are both the utility face — so these measure the
  // same in either face, and an absolute assertion is safe here where one on
  // the index would be flaky.
  await ready(page);
  await phone(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await page.locator('[data-month]').click();
  await page.waitForTimeout(600);

  const rows = await page.locator('.month-grid button').evaluateAll((els) =>
    [...new Set(els.map((el) => Math.round(el.getBoundingClientRect().top)))].sort((a, b) => a - b),
  );
  expect(rows).toHaveLength(5);
  // A date is one numeral; the body's reading leading around it was most of
  // why the month stood 278 px tall (author, 2026-08-21).
  expect(rows[1] - rows[0]).toBeLessThanOrEqual(32);

  const controls = await page.locator('.cal-controls').boundingBox();
  expect(controls.height).toBeLessThan(200);
});


test('the month unfurls out of the week and the page follows it down', async ({ page }) => {
  /*
   * **The right column's panel, since 2026-09-01.** The heading was what the
   * month pushed down while the picker stood above it in one column; then the
   * picker moved to the top of the right column, and then the columns were
   * made to move independently (author: "ensure only the right column moves
   * down to make room for the expanded calendar, not the left column"). So
   * what the month pushes is now exactly one thing, and this measures that
   * thing. On a phone it is the same box, one column down from the picker.
   * The claim is unchanged: it grows, it travels rather than jumping, and it
   * lets its height go afterwards.
   */
  await ready(page);
  await phone(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const heading = page.locator('[data-slot="side"]');
  const closed = (await heading.boundingBox()).y;

  await page.locator('[data-month]').click();
  await page.waitForTimeout(80);
  const mid = (await heading.boundingBox()).y;
  await page.waitForTimeout(600);
  const open = (await heading.boundingBox()).y;

  // The day is a good way further down the page with five rows above it, and
  // it travelled there — five rows arriving between two frames is the jolt the
  // growth exists to remove.
  expect(open).toBeGreaterThan(closed + 60);
  expect(mid).toBeGreaterThan(closed);
  expect(mid).toBeLessThan(open - 20);

  // And the height is released once it has arrived, so a month with a sixth
  // row is not held to the height of one with five.
  const body = page.locator('.month-body');
  expect(await body.evaluate((el) => el.style.height)).toBe('');
  expect(await body.evaluate((el) => el.classList.contains('is-growing'))).toBe(false);
});


test('under reduced motion the month arrives whole, with no held height', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 },  reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await searchMode(page);
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  // The right column's panel, for the reason the test above gives: it is the
  // one box the month still moves at either arrangement.
  const closed = (await page.locator('[data-slot="side"]').boundingBox()).y;

  await page.locator('[data-month]').click();
  // Removed, not shortened: every row is there on the next frame, and the JS
  // holds no pixel height and no clip it would then have to wait out.
  const body = page.locator('.month-body');
  expect(await body.evaluate((el) => el.style.height)).toBe('');
  expect(await body.evaluate((el) => el.classList.contains('is-growing'))).toBe(false);
  await expect(page.locator('.cal-week')).toBeHidden();
  expect((await page.locator('[data-slot="side"]').boundingBox()).y).toBeGreaterThan(closed + 60);
  await ctx.close();
});


test('the rail scrolls in one piece: real days, no copies, no track', async ({ page }) => {
  /*
   * The heir of "a week travels sideways rather than swapping in place"
   * (2026-08-24, Amendment 35). The week no longer travels at all: it is one
   * run of days on a scroll container, so there is nothing to copy, nothing
   * to mark aside, and no transform to clean up after — Amendment 9's whole
   * class of defect is structurally impossible here. What is worth pinning
   * instead: the run is continuous (the day beyond each edge is a real,
   * clickable day, not scenery), and scrolling it changes nothing until a day
   * is chosen.
   */
  await ready(page);
  await phone(page);
  /*
   * **Anchored to "today minus" an offset, not a fixed calendar date**
   * (2026-08-31, paying CLAUDE.md's third trap a fourth time — this test's
   * own history). The base date and the "day just beyond the trailing edge"
   * were both hardcoded (2026-08-28 and 2026-08-31); the edge date is what
   * broke, having become *today* itself, which put it back in the very
   * `is-today` dress the test exists to say an ordinary rail day does not
   * wear. A fixed date is a measurement of one clock and every fixed date
   * becomes today eventually — an offset from today, mirroring
   * `aDayThatIsNotToday`, never does. 30 days back keeps the whole window
   * inside the populated day-record span for months to come.
   */
  const [base, edgeIso] = await page.evaluate(() => {
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const b = new Date();
    b.setDate(b.getDate() - 30);
    const e = new Date();
    e.setDate(e.getDate() - 27);
    return [iso(b), iso(e)];
  });
  await page.goto(`/calendar/${base}`, { waitUntil: 'networkidle' });

  // No swap machinery in the week, at rest or ever.
  await expect(page.locator('.cal-week .grain-side')).toHaveCount(0);
  await expect(page.locator('.cal-week .grain-track')).toHaveCount(0);

  /*
   * The day just beyond the trailing edge is real, in the same button dress
   * as an ordinary day inside the strip — and clicking it selects it.
   *
   * **The dress is compared against a day chosen for being ordinary**, not
   * against a second fixed date: a rail day carries no class of its own
   * beyond `markRail`'s `is-today`/`aria-current`, so "ordinary" is picked
   * from the strip by being neither, whatever today happens to be.
   */
  const edge = page.locator(`.week-strip [data-iso="${edgeIso}"]`);
  await expect(edge).toBeVisible();
  const sameDress = await edge.evaluate((el) => {
    const ordinary = [...document.querySelectorAll('.week-strip [data-iso]')].find(
      (d) => d !== el && !d.classList.contains('is-today') && d.getAttribute('aria-current') === null,
    );
    return {
      edge: el.className,
      ordinary: ordinary?.className ?? null,
      iso: ordinary?.dataset.iso ?? null,
      tag: `${el.tagName}/${ordinary?.tagName}`,
    };
  });
  expect(sameDress.ordinary, 'no ordinary day in the strip to compare the edge with').not.toBeNull();
  expect(sameDress.edge, `the ${sameDress.iso} is dressed differently`).toBe(sameDress.ordinary);
  // A real day, not scenery: the same element the strip builds for every other.
  expect(sameDress.tag).toBe('BUTTON/BUTTON');
  await edge.click();
  // The URL is the format-independent proof of which day landed — the h1's
  // own rendered text would have to reimplement `headingFmt`'s locale
  // formatting just to spell a moving date back out.
  await expect(page).toHaveURL(new RegExp(`/calendar/${edgeIso}$`));

  // Scrolling the rail is not a selection.
  await page.evaluate(() => {
    document.querySelector('.week-strip').scrollBy({ left: 200, behavior: 'instant' });
  });
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(new RegExp(`/calendar/${edgeIso}$`));
});


test('a month travels sideways with its own edges, and its day names do not', async ({ page }) => {
  // The week got this on 2026-08-21 and the month did not, because the month's
  // column could not travel while the day names above it sat inside the same
  // button. The names moved to a line of their own so that it could.
  await ready(page);
  await phone(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await page.locator('[data-month]').click();
  await page.waitForTimeout(600);

  const names = () =>
    page.locator('.month-days .month-day-name').evaluateAll((els) =>
      els.map((el) => Math.round(el.getBoundingClientRect().x)),
    );
  const before = await names();

  const during = await duringMove(page, '.month-body', 'month-row', '.month-row [data-mstep="1"]');
  expect(during.rows).toBe(2);
  expect(during.sides).toEqual(['-100%']);
  expect(during.hidden).toBe('true');
  expect(during.reach).toBe('none');
  expect(during.clipped).toBe(true);

  // August's peeked columns leave with August — July's Sundays behind it,
  // September's Mondays ahead of it — and September's arrive with September.
  expect(during.sidePeeks).toEqual(['5', '12', '19', '26', '7', '14', '21', '28']);
  expect(during.livePeeks).toEqual(['2', '9', '16', '23', '30', '5', '12', '19', '26']);

  await expect(page.locator('.month-name')).toHaveText('Sep 2026');
  await expect(page.locator('.grain-side')).toHaveCount(0);
  // The names stayed exactly where they were while the grid moved under them.
  expect(await names()).toEqual(before);
});


test('the rail never dead-ends: scrolled to its edge, it rebuilds around the reader', async ({ page }) => {
  /*
   * The rail is finite — 121 days around an anchor — and settle() re-anchors
   * it when the reader comes to rest near an end, carrying the scroll offset
   * across so nothing moves under them. This is the one job the CSS snap
   * cannot do for us, so this is the test that fails when settle() is backed
   * out: the run would simply stop 60 days out.
   */
  await ready(page);
  await phone(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  const strip = page.locator('.week-strip');
  const before = await strip.evaluate((el) => ({
    n: el.querySelectorAll('[data-iso]').length,
    last: [...el.querySelectorAll('[data-iso]')].at(-1).dataset.iso,
  }));

  await strip.evaluate((el) => {
    el.scrollTo({ left: el.scrollWidth, behavior: 'instant' });
  });
  await page.waitForTimeout(450);

  const after = await strip.evaluate((el) => ({
    n: el.querySelectorAll('[data-iso]').length,
    last: [...el.querySelectorAll('[data-iso]')].at(-1).dataset.iso,
    // And the reader was not thrown: some day is still on the snap column.
    aligned: (() => {
      const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft);
      return [...el.querySelectorAll('[data-iso]')].some(
        (b) => Math.abs(b.offsetLeft - el.scrollLeft - pad) < 2,
      );
    })(),
  }));
  expect(after.n).toBe(before.n);
  expect(after.last > before.last).toBe(true);
  expect(after.aligned).toBe(true);
});


test('picking a day already in view does not move the rail', async ({ page }) => {
  // The movement decides, not the gesture (DESIGN.md §5b, unchanged by the
  // rail): a day already on screen has nowhere to be brought from, so the
  // rail must not stir under the click.
  await ready(page);
  await phone(page);
  await page.goto('/calendar/2026-08-24', { waitUntil: 'networkidle' });
  const before = await page.evaluate(() => document.querySelector('.week-strip').scrollLeft);
  await page.locator('.week-strip [data-iso="2026-08-27"]').click();
  await expect(page.locator('h1')).toHaveText(/27 Aug(ust)? 2026/);
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => document.querySelector('.week-strip').scrollLeft);
  expect(Math.abs(after - before)).toBeLessThan(2);
});


test('under reduced motion the rail steps without a glide', async ({ browser }) => {
  // Removed, not shortened: the reveal that brings a stepped day into view is
  // an instant scroll under reduced motion, not a smooth one — and stepping
  // off the visible edge still arrives.
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 },  reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await searchMode(page);
  await ready(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  // Sunday is the last snapped day; stepping past it forces a reveal.
  await page.locator('.week-strip [data-iso="2026-08-30"]').click();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('h1')).toHaveText(/31 Aug(ust)? 2026/);
  // The stepped-to day is in view at once, nothing left mid-glide.
  await expect(page.locator('.week-strip [data-iso="2026-08-31"]')).toBeInViewport();
  await ctx.close();
});


test('a mouse holds the rail and slides it, and letting go settles on a day', async ({ page }) => {
  /*
   * The reversal (author, 2026-08-24, Amendment 35): §5b called a mouse drag
   * across a date grid a selection, not a gesture, and the instruction is
   * that it is a gesture here. Nothing is lost to selection — the rail holds
   * numerals in buttons, no prose. Touch and pen need none of this handling:
   * the browser pans a scroll container natively.
   *
   * The state does not move while the reader is holding it — scrolling is not
   * selecting — and the click that ends a drag is swallowed, so the day under
   * the pointer at release is not accidentally chosen.
   */
  await ready(page);
  await phone(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  const strip = page.locator('.week-strip');
  const box = await strip.boundingBox();
  const y = box.y + box.height / 2;
  const before = await strip.evaluate((el) => el.scrollLeft);

  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i += 1) await page.mouse.move(box.x + box.width / 2 - i * 12, y);
  // Held: the rail has followed the hand, the day has not changed.
  const held = await strip.evaluate((el) => el.scrollLeft);
  expect(held).toBeGreaterThan(before + 60);
  await expect(page.locator('h1')).toHaveText(/28 Aug(ust)? 2026/);
  expect(await strip.evaluate((el) => el.classList.contains('is-dragging'))).toBe(true);

  // Held *still*, then released: a stopped hand has no throw in it, so this
  // is the settle path, not the coast — the coast has a test of its own.
  // Since Amendment 37 the release reads only samples fresh at the release;
  // without that freshness this pause changes nothing, the stale flick
  // reads as a throw, and the alignment below is still coasting when it is
  // measured — which is exactly how this test caught the defect.
  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(450);
  // Released: it settles onto a day — any day, not a Monday — and the click
  // that ended the drag chose nothing.
  await expect(page.locator('h1')).toHaveText(/28 Aug(ust)? 2026/);
  const aligned = await strip.evaluate((el) => {
    const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft);
    return [...el.querySelectorAll('[data-iso]')].some(
      (b) => Math.abs(b.offsetLeft - el.scrollLeft - pad) < 2,
    );
  });
  expect(aligned).toBe(true);
  expect(await strip.evaluate((el) => el.classList.contains('is-dragging'))).toBe(false);
});


test('the month follows the finger too, and takes its height with it', async ({ page }) => {
  // September 2026 is five rows and August is six, so dragging back from one to
  // the other is the case where the month arriving is taller than the viewport
  // holding it and would be cut off at the bottom for the length of the drag.
  await ready(page);
  await phone(page);
  await page.goto('/calendar/2026-09-04', { waitUntil: 'networkidle' });
  await page.locator('[data-month]').click();
  await page.waitForTimeout(600);
  const fiveRows = (await page.locator('.month-body').boundingBox()).height;

  await dragGrain(page, '.cal-month', 60, { release: false });
  const held = await page.evaluate(() => {
    const body = document.querySelector('.month-body');
    return {
      rows: body.querySelectorAll('.month-row').length,
      pinned: body.style.height,
      transform: body.querySelector('.grain-track').style.transform,
    };
  });
  expect(held.rows).toBe(3);
  expect(held.transform).toMatch(/^translateX\(\d/);
  // The body takes the tallest of the three and holds it for as long as the
  // reader does, so August's sixth row is there to be dragged into view.
  expect(parseFloat(held.pinned)).toBeGreaterThan(fiveRows);

  await releaseGrain(page, '.cal-month', 60);
  await expect(page.locator('.month-name')).toHaveText('Aug 2026');
  await expect(page.locator('.grain-side')).toHaveCount(0);
  await page.waitForTimeout(600);
  // Six rows now, and the height was released rather than left pinned.
  expect(await page.locator('.month-body').evaluate((el) => el.style.height)).toBe('');
  expect((await page.locator('.month-body').boundingBox()).height).toBeGreaterThan(fiveRows);
});


test('under reduced motion a mouse drag settles with nothing to sit through', async ({ browser }) => {
  // Removed, not shortened. Following the hand is direct manipulation and
  // stays; the settle's glide is an animation and goes — the rail is simply
  // on a day the moment it comes to rest.
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 },  reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await searchMode(page);
  await ready(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  const strip = page.locator('.week-strip');
  const box = await strip.boundingBox();
  const y = box.y + box.height / 2;

  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i += 1) await page.mouse.move(box.x + box.width / 2 - i * 12, y);
  await page.mouse.up();
  // The settle detector waits for the rail to rest, then aligns instantly:
  // one bounded wait, no glide after it.
  await page.waitForTimeout(300);
  const aligned = await strip.evaluate((el) => {
    const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft);
    return [...el.querySelectorAll('[data-iso]')].some(
      (b) => Math.abs(b.offsetLeft - el.scrollLeft - pad) < 2,
    );
  });
  expect(aligned).toBe(true);
  await ctx.close();
});


test('a month steps sideways and carries its height with it', async ({ page }) => {
  // August 2026 is six rows and September is five, so stepping between them is
  // the case where the page below would otherwise jump between two frames.
  await ready(page);
  await phone(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await page.locator('[data-month]').click();
  await page.waitForTimeout(600);
  const six = await page.locator('.month-body').boundingBox();

  await page.locator('[data-mstep="1"]').click();
  await expect(page.locator('.month-name')).toHaveText('Sep 2026');
  const held = await page.locator('.month-body').evaluate((el) => el.style.height);
  expect(parseFloat(held)).toBeGreaterThan(0);

  await page.waitForTimeout(600);
  const five = await page.locator('.month-body').boundingBox();
  expect(five.height).toBeLessThan(six.height);
  expect(await page.locator('.month-body').evaluate((el) => el.style.height)).toBe('');
});


test('the month fades rather than appearing between two frames', async ({ page }) => {
  await ready(page);
  await phone(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const month = page.locator('.cal-month');
  await page.locator('[data-month]').click();

  // Caught mid-fade: present and laid out, not yet at full strength.
  const during = await month.evaluate((el) => ({
    duration: getComputedStyle(el).transitionDuration,
    property: getComputedStyle(el).transitionProperty,
  }));
  expect(parseFloat(during.duration)).toBeGreaterThanOrEqual(0.4);
  expect(during.property).toContain('opacity');
  await expect(month).toHaveCSS('opacity', '1');
});


test('the days at the rail edges are real days, unmasked, and one click each', async ({ page }) => {
  /*
   * The heir of "the arrows are gone and the grain itself stands at each
   * edge" (author, 2026-08-24, Amendment 35). The peeked edges were buttons
   * that *looked* like the grain continuing — one masked copy of a day either
   * side, each a disguised week-step. Now the grain actually continues: the
   * 23rd and the 31st in the inset are the same buttons as the seven between
   * them, in full ink with no mask, and clicking one selects that day rather
   * than moving a week.
   */
  await ready(page);
  await phone(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });

  /*
   * **The no-chevrons rule of 2026-08-21 was reversed on 2026-09-02** (author:
   * "add arrows left and right over the week display and monthly display
   * edges, don't resize anything just put them over the left and right ends
   * where the dates just outside of the week are fading out").
   *
   * What that rule was protecting is still protected, and it is the rest of
   * this test: the peeked edges are *real days* — the 23rd and the 31st, in
   * full ink, one click each — rather than the disguised week-steps they were
   * before Amendment 35. The arrows are drawn over that grain rather than
   * replacing it, so the two decisions no longer conflict.
   *
   * So what is pinned now is where a chevron may appear: the two week arrows
   * and nowhere else among the controls' buttons. A chevron creeping back onto
   * a *day* button would still fail here.
   */
  const glyphs = await page.locator('.cal-controls button:not(.week-arrow)').allTextContents();
  expect(glyphs.join(''), 'a chevron is back on a control that is not an arrow').not.toMatch(/[‹›]/);

  // The neighbours are in the document and partly in view at each edge.
  const prev = page.locator('.week-strip [data-iso="2026-08-23"]');
  const next = page.locator('.week-strip [data-iso="2026-08-31"]');
  await expect(prev).toBeVisible();
  await expect(next).toBeVisible();

  // Unmasked and at full strength: the fade went with the peek buttons. The
  // contrast argument that forced the mask (Amendment 16) is moot — these are
  // ordinary day buttons in the ordinary ink.
  for (const day of [prev, next]) {
    const style = await day.evaluate((el) => {
      const s = getComputedStyle(el);
      return { mask: s.maskImage, opacity: s.opacity };
    });
    expect(style.mask).toBe('none');
    expect(style.opacity).toBe('1');
  }

  // One click selects the day itself — the edge is not a week-step any more.
  await next.click();
  await expect(page.locator('h1')).toHaveText(/31 Aug(ust)? 2026/);
});


test('every day on the rail is full-strength ink — no wash, no mask', async ({ page }) => {
  // The heir of the peeked-contrast test (Amendment 16 → Amendment 35). The
  // mask existed to fade a *copy* without washing its ink below 4.5:1; the
  // rail has no copies, so the honest assertion is now uniformity: every day
  // button, snapped or at the clipped edge, is the same colour at the same
  // strength. A backout that dimmed the edge days would land here.
  await ready(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  const days = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('.week-strip [data-iso]')];
    const seen = new Set();
    for (const b of buttons) {
      const s = getComputedStyle(b);
      seen.add(`${s.color}|${s.opacity}|${s.maskImage}`);
    }
    return [...seen];
  });
  expect(days).toHaveLength(1);
  expect(days[0]).toMatch(/\|1\|none$/);
});


test('the month peeks a column of the neighbouring month, on the grid own rows', async ({ page }) => {
  await ready(page);
  await phone(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await page.locator('[data-month]').click();
  await page.waitForTimeout(600);

  // September starts on a Tuesday, so its Mondays are 7, 14, 21 and 28.
  await expect(page.locator('.cal-month .peek-next .peek-cell')).toHaveText(['7', '14', '21', '28']);

  // On the grid's rows, not merely beside it: the first peeked cell shares a
  // top with the grid's first row.
  const tops = await page.evaluate(() => {
    const first = document.querySelector('.month-grid button').getBoundingClientRect();
    const peek = document.querySelector('.cal-month .peek-next .peek-cell').getBoundingClientRect();
    return [Math.round(first.top), Math.round(peek.top)];
  });
  expect(tops[0]).toBe(tops[1]);

  // And the name in the gutter is abbreviated, so it stops clear of the column.
  await expect(page.locator('.month-name')).toHaveText('Aug 2026');
});


test('every day on the rail sits on one line', async ({ page }) => {
  // The heir of "the peeked day sits on the same line as the days beside it"
  // (Amendment 35): the fault it guarded — an edge element outside the day
  // buttons missing their border and padding and printing 5 px high — cannot
  // recur in this form, because the edge days *are* day buttons. What is
  // pinned instead is the property itself: one top for every day name and one
  // for every numeral, across the whole rail.
  await ready(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const tops = await page.evaluate(() => {
    const one = (sel) =>
      new Set(
        [...document.querySelectorAll(sel)].map((el) => Math.round(el.getBoundingClientRect().top)),
      ).size;
    return { names: one('.week-strip .day-name'), nums: one('.week-strip .day-num') };
  });
  expect(tops.names).toBe(1);
  expect(tops.nums).toBe(1);
});

/* ---- one swap primitive (src/ui/swap.js) -------------------------------- */


test('the fading week is aside while the month arrives, and current again after', async ({ page }) => {
  // For the length of the cross-fade both grains are painted over one cell.
  // The one the reader is leaving must say so completely; `hidden` only takes
  // over once the fade lands, and closing the month hands everything back.
  await answered(page);
  await phone(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });

  const during = await page.evaluate(() => {
    document.querySelector('[data-month]').click();
    const week = document.querySelector('.cal-week');
    return {
      hidden: week.getAttribute('aria-hidden'),
      allAside: [...week.querySelectorAll('button')].every((b) => b.tabIndex === -1),
    };
  });
  expect(during).toEqual({ hidden: 'true', allAside: true });
  await expect(page.locator('.cal-week')).toBeHidden();

  const after = await page.evaluate(() => {
    document.querySelector('[data-month]').click();
    const week = document.querySelector('.cal-week');
    return {
      hidden: week.getAttribute('aria-hidden'),
      anyAside: [...week.querySelectorAll('button')].some((b) => b.tabIndex === -1),
    };
  });
  expect(after).toEqual({ hidden: null, anyAside: false });
});

/* ---- the coast, and the hymns' own tongue (Amendment 37) ---------------- */


test('a thrown rail coasts to a halt and settles, instead of stopping dead', async ({ page }) => {
  /*
   * Author, 2026-08-24: "a bit of weight … slows down to a halt when let go
   * instead of snapping without any momentum". The release's velocity is
   * read from the last 80 ms of the drag and spent against exponential
   * friction; what is left below the handover threshold goes to the same
   * settle that has owned alignment and re-anchoring since the rail was
   * built. So the assertions are: still moving *after* the release, coming
   * to rest, aligned at the end, and no coasting class left behind.
   */
  await ready(page);
  await phone(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  const strip = page.locator('.week-strip');
  const box = await strip.boundingBox();
  const y = box.y + box.height / 2;
  const at = () => strip.evaluate((el) => el.scrollLeft);

  /*
   * **The throw is dispatched in the page, with its own timing** (2026-08-28).
   *
   * The rail reads its release velocity from the samples of the last 120 ms
   * (`up` in views/daily/picker.js) and coasts only past `MIN_FLICK`. Driven
   * through the harness's mouse, each move is a separate round trip, and under
   * parallel load six of them stretch past that window — so the fresh samples
   * collapse to one, `dt` is 0, the velocity is 0, and the rail *settles*
   * instead of coasting. Nothing was wrong with the rail: the gesture never
   * became a flick. That is the whole of this suite's oldest flake, and it
   * failed 1 in 32 even after the assertions stopped being fixed samples.
   *
   * So the moves are dispatched from inside the page, spaced by a spin on
   * `performance.now()` rather than by `setTimeout` — a spin blocks, so the
   * spacing is real elapsed time whatever else the machine is doing. Four
   * moves, 8 ms apart, 25 px each: a 24 ms window well inside the rail's 120,
   * and a velocity that is the same on every machine. The product path is
   * untouched — pointerdown, four pointermoves, pointerup, and the rail's own
   * sampling decides what to do with them.
   */
  const throw_ = await throwRail(strip);
  /*
   * **The test's own premise, asserted rather than assumed.** A gesture that
   * was preempted past the rail's 120 ms sampling window is not a flick, and a
   * rail that then settles is behaving correctly — so without this the failure
   * reads "the rail did not coast" when the truth is "nobody threw it". That
   * mistranslation is the whole history of this test.
   */
  expect(
    throw_.delivered,
    `could not deliver a flick in ${throw_.attempts} attempts; best span ${throw_.span.toFixed(1)} ms`,
  ).toBe(true);
  const released = throw_.released;

  /*
   * **Waited for, not sampled at a fixed moment** (2026-08-28). This read the
   * position 150 ms after the release and required 20 px of travel in that
   * window, which is not a fact about the coast — it is a fact about how many
   * frames the machine got through in 150 ms. It failed three times under
   * parallel load, most recently *inside the COLD_FACE rehearsal*, where noise
   * costs more than anywhere else: that run exists to say whether CI will be
   * red, and an answer that has nothing to do with the commit is worse than no
   * answer. Six of six alone, every time.
   *
   * The claims are unchanged and neither has a clock in it now: it is still
   * moving after the release, and it comes to rest rather than stopping dead.
   * A coast that never starts still fails — the poll runs out — and a slow
   * machine simply waits.
   */
  await expect.poll(at, { timeout: 4000 }).toBeGreaterThan(released + 20);

  // At rest is two reads that agree, which is the thing itself rather than a
  // guess at how long friction takes.
  let previous = -1;
  await expect
    .poll(
      async () => {
        const now = await at();
        const still = now === previous;
        previous = now;
        return still;
      },
      { timeout: 8000, intervals: [100] },
    )
    .toBe(true);
  const rested = await at();
  expect(rested, 'the rail stopped dead at the release').toBeGreaterThan(released + 20);
  const state = await strip.evaluate((el) => {
    const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft);
    return {
      classes: el.className,
      aligned: [...el.querySelectorAll('[data-iso]')].some(
        (b) => Math.abs(b.offsetLeft - el.scrollLeft - pad) < 2,
      ),
    };
  });
  expect(state.aligned).toBe(true);
  expect(state.classes).not.toContain('is-coasting');
  expect(state.classes).not.toContain('is-dragging');
  // Scrolling was still not selecting, momentum included.
  await expect(page.locator('h1')).toHaveText(/28 Aug(ust)? 2026/);
});


test('under reduced motion a throw does not coast', async ({ browser }) => {
  // Removed, not shortened: the weight is an animation and goes; the settle
  // aligns without a glide, and after it nothing moves at all.
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 },  reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await searchMode(page);
  await ready(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  const strip = page.locator('.week-strip');
  const box = await strip.boundingBox();
  const y = box.y + box.height / 2;

  /*
   * **This test proved nothing until 2026-08-28, and the back-out is what said
   * so.** It threw the rail and compared the position 100 ms after release with
   * the position 500 ms after. Backing the reduced-motion guard out of
   * views/daily/picker.js — so a throw coasts under reduced motion, the exact
   * regression this exists to catch — left it *green*: the coast is spent well
   * inside the first 100 ms, so both samples were taken after everything had
   * already happened. It was reading the end of the story twice.
   *
   * It watches for the coast instead of sampling around it. `is-coasting` is
   * put on the strip for exactly as long as one runs, so a MutationObserver
   * armed before the flick sees it or the coast did not happen — the same
   * reason `duringMove` in helpers.js observes rather than polls: a 260 ms
   * animation and a poll racing it is a flake waiting to be blamed on the
   * machine.
   */
  const watching = strip.evaluate(
    (el) =>
      new Promise((resolve) => {
        let sawCoast = false;
        const observer = new MutationObserver(() => {
          if (el.classList.contains('is-coasting')) sawCoast = true;
        });
        observer.observe(el, { attributes: true, attributeFilter: ['class'] });
        setTimeout(() => {
          observer.disconnect();
          resolve({ sawCoast, at: el.scrollLeft });
        }, 600);
      }),
  );
  // The same dispatched flick the coast test uses. Through the harness's own
  // mouse this test also passed whenever the gesture failed to *be* a flick,
  // which was a second way of saying nothing.
  const thrown = await throwRail(strip);
  // Same premise as the coast test: an absence only means something if the
  // gesture that should have produced a presence was actually delivered.
  expect(thrown.delivered, `no flick delivered; best span ${thrown.span.toFixed(1)} ms`).toBe(true);
  const seen = await watching;
  expect(seen.sawCoast, 'the rail coasted under reduced motion').toBe(false);

  // And nothing is still moving once the settle has had its say.
  const early = await strip.evaluate((el) => el.scrollLeft);
  await page.waitForTimeout(400);
  const late = await strip.evaluate((el) => el.scrollLeft);
  expect(late).toBe(early);
  await ctx.close();
});

/* ---- the 2026-08-25 evening batch ---------------------------------------- */


test('the rail shows the days either side whole, not clipped by the fade', async ({ page }) => {
  /*
   * Author, 2026-08-25 evening: "the spacing of the weekly display on desktop
   * needs to be decreased further so more of the Sunday to the left is
   * peaking out and more of the Monday to the right is peaking out from the
   * fade."
   *
   * The peek is the lever, not the gap. The seven day buttons divide what is
   * left *after* both insets, so tightening the gap between columns hands the
   * width straight back to the seven and shows the neighbours no more of
   * themselves; widening --cal-peek is what buys them room. 30 px was not
   * enough for a three-glyph weekday and its date, so the neighbour's name
   * was cut where the mask begins.
   *
   * This measures what "peeking out" means: the day either side of the seven
   * has more visible width than its own glyphs need, and that width lies
   * clear of the 12 px the mask dissolves.
   */
  /*
   * Its own width, because the instruction was about the desktop rail and
   * both of the suite's projects are Desktop Chrome — one merely narrow.
   * Below 560 px the peek is deliberately 24 px: there the rail is scrolled
   * rather than read across, and a phone's seven days need the width more
   * than its neighbours need showing.
   *
   * **900 rather than 1280 since 2026-09-01**, and the reason is the same one
   * in a new place. The picker moved into the day's narrow right column on a
   * wide screen (author: "move the weekly and monthly display over to the top
   * of the small column on the right"), and a rail in a 330 px column is the
   * phone's case wearing a desktop's viewport — so it takes the phone's own
   * 24 px peek and cannot show a whole neighbour past the fade. 900 px is the
   * widest the rail still runs the width of the page, which is the layout
   * this instruction was given about.
   */
  await page.setViewportSize({ width: 900, height: 900 });
  await ready(page);
  await page.goto('/calendar/2026-08-25', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const seen = await page.evaluate(() => {
    const strip = document.querySelector('.week-strip');
    const box = strip.getBoundingClientRect();
    const fade = parseFloat(getComputedStyle(strip).getPropertyValue('--rail-fade'));
    const days = [...strip.querySelectorAll('[data-iso]')].map((b) => ({
      iso: b.dataset.iso,
      left: b.getBoundingClientRect().left,
      right: b.getBoundingClientRect().right,
      // What the day actually has to draw: the wider of its two lines.
      needs: Math.max(
        ...[...b.children].map((c) => {
          const r = document.createRange();
          r.selectNodeContents(c);
          return r.getBoundingClientRect().width;
        }),
      ),
    }));
    const inView = days.filter((d) => d.left >= box.left - 1 && d.right <= box.right + 1);
    const first = inView[0];
    const last = inView[inView.length - 1];
    const before = days[days.indexOf(first) - 1];
    const after = days[days.indexOf(last) + 1];
    return {
      fade,
      inView: inView.length,
      // How much of each neighbour is inside the strip at all…
      beforeVisible: before.right - box.left,
      afterVisible: box.right - after.left,
      // …and how much each has to show.
      beforeNeeds: before.needs,
      afterNeeds: after.needs,
    };
  });

  expect(seen.inView, 'seven days across').toBe(7);
  // Clear of the dissolve *and* wide enough for the day's own glyphs, at both
  // edges. Backing --cal-peek down to its old 30 px fails both.
  expect(seen.beforeVisible).toBeGreaterThan(seen.beforeNeeds + seen.fade);
  expect(seen.afterVisible).toBeGreaterThan(seen.afterNeeds + seen.fade);
});


test('no date carries a density dot, and a fast or a feast carries its own', async ({ page }) => {
  /*
   * Author, 2026-08-25 evening: "remove the dots under each date in the
   * calendar." They stood under every date at both grains from the first
   * calendar — one per commemoration, capped at five — and DESIGN.md's "Dense
   * against sparse" argued them and now records the reversal in place. That
   * removal stands and is still the first half of this test.
   *
   * **Two marks came back on 2026-08-26**, and they are not those dots
   * returning: "Dots on the week strip for fast and feast days would let
   * someone plan the week at a glance." The old dots said only that a day was
   * busy. These say a thing a reader plans around, each with a source: the fast
   * from lib/liturgy.js in this church's own calendar, the feast from the day's
   * record carrying hymns — which is the rank cross the calendar itself
   * printed, since the harvest ships hymns only for its top-rank days.
   *
   * 10 August 2026 is inside the Dormition Fast, and carries no feast — the
   * civil 1st to the 14th under the Gregorian reckoning `ready`'s own default
   * reads by since 2026-09-05 (`reckoningInForce`, `lib/church.js`; the
   * Julian-observing Russian church keeps the same fast a fortnight later by
   * the civil calendar, the civil 14th to the 27th, which is why the date
   * moved off the 25th rather than the assertions below changing to match a
   * reckoning this test was never about). Both facts are in the day button's
   * accessible name too: a dot says nothing to a screen reader, and colour
   * says nothing to a reader who cannot separate hues.
   */
  await ready(page);
  await phone(page);
  await page.goto('/calendar/2026-08-10', { waitUntil: 'networkidle' });
  await expect(page.locator('.density')).toHaveCount(0);
  await expect(page.locator('.week-strip i')).toHaveCount(0);
  // No dated commemorations fall on this civil day in the corpus so far, so
  // the phrase for their count does not print at all — a fast is still a
  // fast on a day with nothing else recorded for it.
  await expect(page.locator('.week-strip [data-iso="2026-08-10"]')).toHaveAttribute(
    'aria-label',
    /^Monday, 10 August 2026(?: - \d+ commemorations)? - a fast$/,
  );
  const today = page.locator('.week-strip [data-iso="2026-08-10"]');
  await expect(today.locator('.mark-fast')).toHaveCount(1);
  await expect(today.locator('.mark-feast')).toHaveCount(0);
  // The marks are aria-hidden: what they say is said in words on the button.
  await expect(today.locator('.day-marks')).toHaveAttribute('aria-hidden', 'true');

  // A fast-free day carries none at all, which is what makes a run of them
  // legible. 20 September is well clear of the Dormition Fast under either
  // reckoning it might run by — a reminder that "Sunday" is not a synonym
  // for "no fast" is still worth having, just not on a date this test picks
  // to prove it.
  const sunday = page.locator('.week-strip [data-iso="2026-09-20"]');
  await expect(sunday.locator('.day-mark')).toHaveCount(0);
  await expect(sunday).toHaveAttribute('aria-label', /^Sunday, 20 September 2026 - \d+ commemorations$/);

  // The feast mark is the one place the calendar spends gold (author,
  // 2026-08-26: "Gold is almost unused"). 21 September is the Nativity of the
  // Theotokos in the Russian calendar and its record carries the day's hymns.
  await page.goto('/calendar/2026-09-21', { waitUntil: 'networkidle' });
  const feast = page.locator('.week-strip [data-iso="2026-09-21"] .mark-feast');
  await expect(feast).toHaveCount(1);
  const gold = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--gold').trim(),
  );
  const painted = await feast.evaluate((el) => getComputedStyle(el).backgroundColor);
  const hex = (rgb) => {
    const [r, g, b] = rgb.match(/\d+/g).map(Number);
    return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
  };
  expect(hex(painted)).toBe(gold.toLowerCase());

  // The month is unchanged: the marks are the week strip's, which is where the
  // author asked for them and where a week is planned.
  await page.locator('[data-month]').click();
  await page.waitForTimeout(600);
  await expect(page.locator('.density')).toHaveCount(0);
  await expect(page.locator('.month-grid i')).toHaveCount(0);
  await expect(page.locator('.month-grid .day-mark')).toHaveCount(0);
});


test('a date picked in the month is where the week opens, however far it was scrolled', async ({ page }) => {
  /*
   * Author, 2026-08-26: "When I scroll away in the monthly display, select a
   * date there, and go back to the weekly display, the weekly display should
   * open in the new location, not the old as it currently does."
   *
   * Two things were wrong and both had the same cause. Picking a date in the
   * month leaves the month open — that decision stands, so a reader comparing
   * days need not reopen it — and the rail underneath is `hidden` for the whole
   * of it. A hidden rail has no geometry: `offsetLeft` and `clientWidth` are
   * both 0, so the reveal that runs on every selection computed its scroll from
   * zeroes and left the rail wherever that arithmetic put it. And a rail
   * anchored sixty days away does not hold a date three months out at all.
   *
   * So the reveal is deferred rather than attempted, and it re-anchors: the
   * week is brought back as the month closes, before the fade, so the right
   * week is already there when the reader can first see it.
   */
  await ready(page);
  await phone(page);
  await page.goto('/calendar/2026-09-20', { waitUntil: 'networkidle' });

  await page.locator('[data-month]').click();
  await page.waitForTimeout(600);
  // Three months out, which is past the rail's own radius and well past the
  // seven days it was showing.
  for (let i = 0; i < 3; i += 1) {
    await page.locator('[data-mstep="1"]').click();
    await page.waitForTimeout(500);
  }
  await page.locator('.month-grid [data-iso="2026-12-14"]').click();
  await expect(page.locator('.cal-date')).toHaveText(/14 Dec(ember)? 2026/);

  await page.locator('[data-month]').click();
  await page.waitForTimeout(700);

  // The rail holds the day at all — it was rebuilt around it — and the day is
  // inside the strip's own scroll window rather than three months off one end.
  const where = await page.evaluate(() => {
    const strip = document.querySelector('.week-strip');
    const day = strip.querySelector('[data-iso="2026-12-14"]');
    if (!day) return null;
    const pad = parseFloat(getComputedStyle(strip).scrollPaddingLeft) || 0;
    return {
      left: day.offsetLeft - strip.scrollLeft,
      width: day.offsetWidth,
      viewport: strip.clientWidth,
      pad,
    };
  });
  expect(where, 'the rail does not hold the day at all').not.toBeNull();
  expect(where.left).toBeGreaterThanOrEqual(where.pad - 2);
  expect(where.left + where.width).toBeLessThanOrEqual(where.viewport - where.pad + 2);

  // And it is the whole week that shows, not the day pinned to an edge: coming
  // back from the month is an arrival, and an arrival shows the week the day
  // sits in. 14 December 2026 is a Monday, so it leads its own week.
  await expect(page.locator('.week-strip [data-iso="2026-12-14"]')).toHaveAttribute('aria-current', 'date');
  const monday = await page.evaluate(() => {
    const strip = document.querySelector('.week-strip');
    const day = strip.querySelector('[data-iso="2026-12-14"]');
    const pad = parseFloat(getComputedStyle(strip).scrollPaddingLeft) || 0;
    return Math.abs(day.offsetLeft - pad - strip.scrollLeft);
  });
  expect(monday).toBeLessThan(3);
});

/* ---- the 2026-08-26 evening batch: the ring, the name days, the fast
        types and the Great Feasts -------------------------------------- */


test("today's ring closes on the underline and clears the marks under it", async ({ page }) => {
  /*
   * Author, 2026-08-26 evening: "The bubble highlighting today is overlapping
   * with both the underline and dot in a weird way. Make the bubble corners a
   * bit sharper and make it line up perfectly with the underline so it blends
   * in."
   *
   * Both halves of that were real and were measured before they were fixed,
   * by rendering the today button at 8x and reading the rubric pixels back:
   * the ring's bottom border ran at css_y 42.9 while the underline ran at
   * 39.0-40.0 and the fast dot began at 42.0 - so the ring hung about three
   * pixels past the underline and took a bite out of the dot below it. With
   * `bottom: 0` the ring's bottom border and the underline land in the same
   * band, which is what "blends in" means here: the underline is drawn at
   * `text-underline-offset: 3px` from the baseline, and that falls inside the
   * last pixel of this span's own line box.
   *
   * The assertions are relationships rather than the numbers above, because
   * the numbers belong to one face at one size and the relationships are what
   * the instruction asked for. Each fails on its own if the rule is put back
   * the way it was (`inset: -3px -6px` and a 999px radius).
   */
  await ready(page, { church: 'russian' });
  await phone(page);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const geom = await page.evaluate(() => {
    const btn = document.querySelector('.week-strip button.is-today');
    const num = btn.querySelector('.day-num');
    const marks = btn.querySelector('.day-marks');
    const before = getComputedStyle(num, '::before');
    const box = num.getBoundingClientRect();
    return {
      /*
       * Where the ring's own bottom edge falls. A pseudo-element has no
       * `getBoundingClientRect`, so it is computed the way the layout engine
       * does: the offset parent here is the `.day-num` span itself
       * (`position: relative`), and `inset`'s bottom leg is negative when the
       * ring hangs *past* the box. The first draft of this test read that leg
       * raw and asserted it was `<= 0.5` — which -3 satisfies, so the
       * assertion passed with the defect restored and was pinning nothing.
       * Caught by the backout, which is what backouts are for.
       */
      ringBottom: box.bottom - parseFloat(before.bottom),
      radius: parseFloat(before.borderBottomLeftRadius),
      boxBottom: box.bottom,
      marksTop: marks ? marks.getBoundingClientRect().top : null,
      isToday: btn.classList.contains('is-today'),
      isSelected: btn.getAttribute('aria-current') === 'date',
      // Landing on `/` puts the reader on today, so the ring and the
      // underline are on the same numeral - which is the case the
      // instruction is about.
      underlined: getComputedStyle(num).textDecorationLine,
    };
  });

  expect(geom.isToday && geom.isSelected).toBe(true);
  expect(geom.underlined).toContain('underline');
  // 1. The ring does not hang below the line box the underline is drawn in.
  //    Backed out, the ring's bottom sits 3 px past it and this fails.
  expect(geom.ringBottom).toBeLessThanOrEqual(geom.boxBottom + 0.5);
  /*
   * 2. And so it clears the fast and feast dots, which begin below it -
   *    when today carries either. Not every real "today" does: this test
   *    runs against whatever day the runner's own clock calls today
   *    (2026-08-31 fails the premise here — Russian, neither a fast nor a
   *    feast — a content fact rather than the layout defect this guards
   *    against), so the check runs only when there is a mark to check it
   *    against. Backed out on a day that does have one, the ring's bottom
   *    was 116.1 against a marks top of 115.1.
   */
  if (geom.marksTop !== null) {
    expect(geom.ringBottom).toBeLessThanOrEqual(geom.marksTop);
  }
  // 3. Sharper corners: a soft rectangle, not the pill it was.
  expect(geom.radius).toBeGreaterThan(0);
  expect(geom.radius).toBeLessThan(12);

  // The month keeps the same shape, so the two grains read as one mark.
  await page.locator('[data-month]').click();
  await expect(page.locator('.cal-month')).toBeVisible();
  const month = await page.evaluate(() => {
    const num = document.querySelector('.month-grid button.is-today .day-num');
    const before = getComputedStyle(num, '::before');
    const box = num.getBoundingClientRect();
    return {
      ringBottom: box.bottom - parseFloat(before.bottom),
      boxBottom: box.bottom,
      radius: parseFloat(before.borderBottomLeftRadius),
    };
  });
  expect(month.ringBottom).toBeLessThanOrEqual(month.boxBottom + 0.5);
  expect(month.radius).toBeLessThan(12);
});


test("the month's numerals wear the same colour as the rail's dots", async ({ page }) => {
  /*
   * Author, 2026-08-26 evening: "in monthly view, make the text colour of
   * each day match the fasting dot colour for that day."
   *
   * The assertion is the instruction almost word for word — the rail's dot
   * and the month's numeral are read for the *same* day and compared as
   * computed colours, so this cannot pass on two rules that happen to look
   * alike. Both come from `fastTone` in views/calendar.js, which is the one
   * place the decision is made.
   *
   * November 2026 in the Russian calendar is the month worth walking: the
   * Nativity Fast opens on the 28th (15 November, Julian), Wednesdays and
   * Fridays are strict before it, and days.pravoslavie.ru printed
   * «разрешается рыба» for the 28th and 29th — so the month holds all three
   * states at once, which no earlier month does.
   */
  await ready(page, { church: 'russian' });
  await phone(page);
  await page.goto('/calendar/2026-11-18', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const read = async (iso) =>
    page.evaluate((day) => {
      const dot = document.querySelector(`.week-strip button[data-iso="${day}"] .day-mark:not(.mark-feast)`);
      const cell = document.querySelector(`.month-grid button[data-iso="${day}"]`);
      /*
       * Whichever property carries the mark's colour, which is not always the
       * fill. Since 2026-08-28 the three marks have three silhouettes — brief
       * §13 wants colour duplicated in shape, and they were one disc in three
       * hues — and fish-permitted is the disc *opened up*, so its hue moved
       * from `background` to `border-color` and its background is `none`.
       *
       * The assertion below is untouched: the month's numeral still has to be
       * the same computed colour as that day's mark, which is the instruction
       * this test was written for. Only where the mark keeps its colour moved.
       */
      const markColour = (el) => {
        const s = getComputedStyle(el);
        return s.backgroundColor === 'rgba(0, 0, 0, 0)' ? s.borderTopColor : s.backgroundColor;
      };
      return {
        dot: dot ? markColour(dot) : null,
        numeral: cell ? getComputedStyle(cell.querySelector('.day-num')).color : null,
        cellClass: cell ? cell.className : null,
        label: cell ? cell.getAttribute('aria-label') : null,
      };
    }, iso);

  await page.locator('[data-month]').click();
  await expect(page.locator('.cal-month')).toBeVisible();

  // A strict fast: an ordinary Wednesday before the Nativity Fast opens.
  const strict = await read('2026-11-11');
  expect(strict.dot).not.toBeNull();
  expect(strict.numeral).toBe(strict.dot);
  expect(strict.cellClass).toContain('fast-fast');

  // Fish, which is the state that used to be invisible: `kind` here is a
  // plain `fast` and only the printed note makes it fish, so before
  // 2026-08-26 evening the dot *and* the numeral would have been strict red.
  const fish = await read('2026-11-28');
  expect(fish.dot).not.toBeNull();
  expect(fish.numeral).toBe(fish.dot);
  expect(fish.cellClass).toContain('fast-fish');
  // And the two states are genuinely different colours, or the equality above
  // would be satisfied by everything being one colour.
  expect(fish.numeral).not.toBe(strict.numeral);

  // A day that is not a fast wears neither: no dot, and the numeral is left
  // to the button's own ink. A run of them is what makes a fast legible.
  const free = await read('2026-11-10');
  expect(free.dot).toBeNull();
  expect(free.cellClass).not.toContain('fast-');
  expect(free.numeral).not.toBe(strict.numeral);
  expect(free.numeral).not.toBe(fish.numeral);

  /*
   * **The colour is never the only channel.** The rail has named its marks in
   * the accessible label since the dots arrived; the month had no words at
   * all until it took a colour, and DESIGN.md §2's rule is that the words say
   * which. A screen reader and a reader who cannot separate these two hues
   * both get the fast from the name.
   */
  expect(strict.label).toContain('a fast');
  expect(fish.label).toContain('fish permitted');
  expect(free.label).not.toContain('fast');
});


test('two months of the same height do not move the page between them', async ({ page }) => {
  /*
   * Author, 2026-08-26 evening: "Sometimes, when scrolling across months of
   * equal height (i.e. only 5 rows of days) The content below still slides up
   * and down … Remove this slide up and down bug."
   *
   * `moveMonth` read the height it was leaving *before* releasing whatever a
   * grow still in flight had pinned, so the number came back interpolated and
   * two five-row months — identical to the pixel at rest — animated between
   * them. It only showed when the reader stepped inside the 420 ms a grow
   * takes, which is what "sometimes" was.
   *
   * Reproduced at 250 ms: Aug→Jul→Jun→May animated at every step, each one
   * pinning the same 119.969px, where at 700 ms only Aug→Jul (six rows to
   * five) did. So the test steps *fast* — a slow walk passed before the fix.
   */
  await ready(page, { church: 'russian' });
  await phone(page);
  await page.goto('/calendar/2026-08-15', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('[data-month]').click();
  await expect(page.locator('.cal-month')).toBeVisible();
  await page.waitForTimeout(600);

  const runs = await page.evaluate(async () => {
    const body = document.querySelector('.month-body');
    const seen = [];
    let growing = false;
    const obs = new MutationObserver(() => {
      if (body.classList.contains('is-growing')) growing = true;
    });
    obs.observe(body, { attributes: true, attributeFilter: ['class', 'style'] });
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const out = [];
    for (let i = 0; i < 3; i += 1) {
      growing = false;
      document.querySelector('.month-row .peek-prev').click();
      await sleep(250);
      out.push({ month: document.querySelector('.month-name').textContent.trim(), grew: growing });
    }
    obs.disconnect();
    return out;
  });

  // Aug (six rows) to Jul (five) is a real change and still animates.
  expect(runs[0].grew, `${runs[0].month} should still animate`).toBe(true);
  // Jul to Jun and Jun to May are five rows to five rows, at speed.
  expect(runs[1].grew, `${runs[1].month} moved the page`).toBe(false);
  expect(runs[2].grew, `${runs[2].month} moved the page`).toBe(false);
});

/* ---- the 2026-09-01 batch: the day steps, and the bars that went ---------- */


test('the full-screen calendar prints the month’s fasts, feasts and seasons', async ({ page }) => {
  /*
   * Author, 2026-09-01: "Make an expandable calendar button under the weekly
   * display called 'Full Screen Calendar' that opens up a full screen calendar
   * modal in the same style as the smaller one but with lots more detail, with
   * text of the fast days and feasts and periods like dormition and great lent,
   * christmas etc. Fill this in with information from each church calendar as
   * we have it."
   *
   * The claim worth testing is the *content*, not the box: a modal that opens
   * and shows a grid of numerals would satisfy every structural assertion and
   * none of the instruction. So this asks August for the Dormition and the
   * Transfiguration, April for Great Lent and Holy Week, and January for the
   * Nativity — three months whose answers come from three different branches of
   * lib/liturgy.js, in the reckoning of the church the reader keeps.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-08-10', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  // Under the week, not beside it.
  const open = page.locator('[data-fullcal]');
  await expect(open).toHaveText(/Open Fullscreen/i);
  const under = await page.evaluate(() => {
    const week = document.querySelector('.cal-week').getBoundingClientRect();
    const button = document.querySelector('[data-fullcal]').getBoundingClientRect();
    return button.top >= week.bottom - 1;
  });
  expect(under, 'the button is not under the weekly display').toBe(true);

  await open.click();
  const dialog = page.locator('dialog.fullcal');
  await expect(dialog).toBeVisible();
  /*
   * **Measured after it has landed.** Since 2026-09-02 the calendar slides
   * down into place on a desktop, and every number below is a position — read
   * a frame early, the box is still 16 px high of its own translate and the
   * page reports a calendar sitting over the header. Waiting on the element's
   * own animations rather than on a duration: the length is the stylesheet's
   * and would go stale here the first time it changed.
   */
  await dialog.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  /*
   * **"Full screen" stopped meaning the whole window on a desktop, 2026-09-02**
   * (author: "make the full screen calendar however have this animation of
   * moving the rest of the contents all down, and make the calendar share the
   * leftmost and rightmost margins").
   *
   * So past 1024 px it takes the glass under the header and the page's own
   * left and right margins — the same measure the masthead lines up to — and
   * what it covers is the page rather than the window. A phone still gets the
   * window: there are no margins to share at 360 px, and the modal is the only
   * way to show a month there.
   */
  const box = await dialog.evaluate((el) => {
    const r = el.getBoundingClientRect();
    /* The sticky *bar*, not the header inside it: the bar is what
       `--chrome-h` measures and what the calendar hangs from, and it is 16 px
       taller than the header — the bottom padding the two chooser panels used
       to open into. */
    const chrome = document.querySelector('.chrome-bar').getBoundingClientRect();
    const measure = document.querySelector('main.chrome > #view').getBoundingClientRect();
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      top: Math.round(r.top),
      left: Math.round(r.left),
      right: Math.round(r.right),
      chromeBottom: Math.round(chrome.bottom),
      measureLeft: Math.round(measure.left),
      measureRight: Math.round(measure.right),
      winW: window.innerWidth,
      winH: window.innerHeight,
      wide: window.innerWidth >= 1024,
    };
  });
  if (box.wide) {
    // Under the header, not over it, and the height that leaves.
    /* At or below the bar's own foot, and hanging from it rather than
       floating somewhere down the page. Not an exact equality: the calendar is
       placed at `--chrome-h`, which main.js measures from the *header*, while
       the bar carries a little padding under it — so the honest claim is that
       the header is not covered and the gap is the bar's own. */
    expect(Math.abs(box.top - box.chromeBottom), 'the calendar does not hang from the bar').toBeLessThan(3);
    expect(box.h).toBeLessThan(box.winH);
    // Sharing the page's own margins, which is what the instruction asks.
    expect(Math.abs(box.left - box.measureLeft), 'the left edge is not the page’s').toBeLessThan(3);
    expect(Math.abs(box.right - box.measureRight), 'the right edge is not the page’s').toBeLessThan(3);
  } else {
    expect(box.w).toBeGreaterThanOrEqual(box.winW - 2);
    expect(box.h).toBeGreaterThanOrEqual(box.winH - 2);
  }

  await expect(page.locator('[data-fc-title]')).toHaveText('August 2026');
  // Which church's reckoning this is, said rather than assumed.
  await expect(page.locator('[data-fc-church]')).not.toBeEmpty();
  await expect(page.locator('.fc-day')).toHaveCount(31);

  // The detail: the fast in words on every day, and the feast where there is one.
  await expect(page.locator('.fc-day').first()).toContainText(/Fast/i);
  const august = page.locator('.fc-body');
  await expect(august).toContainText('the Dormition Fast');
  await expect(august).toContainText('The Dormition of the Theotokos');
  await expect(august).toContainText('The Transfiguration');
  // And the seasons are dated runs, not a list of thirty-one identical lines.
  await expect(page.locator('.fc-period').first()).toContainText(/\d+ - \d+ August/);

  // Great Lent, Holy Week and Bright Week come out of a different branch.
  for (let i = 0; i < 8; i += 1) await page.locator('[data-fc-step="-1"]').click();
  await expect(page.locator('[data-fc-title]')).toHaveText('December 2025');
  await expect(page.locator('.fc-body')).toContainText('the Nativity Fast');

  await page.locator('[data-fc-close]').click();
  await expect(dialog).toBeHidden();

  // April: Lent, and picking a day takes the page there and closes the modal.
  await page.goto('/calendar/2026-04-10', { waitUntil: 'networkidle' });
  await page.locator('[data-fullcal]').click();
  const april = page.locator('.fc-body');
  await expect(april).toContainText('Great Lent');
  await expect(april).toContainText('Holy Week');
  await expect(april).toContainText('Bright Week');

  await page.locator('.fc-day[data-iso="2026-04-16"]').click();
  await expect(page.locator('dialog.fullcal')).toBeHidden();
  await expect(page.locator('.cal-date')).toContainText('16 April 2026');
});

/* ---- the round of 2026-09-02, late -------------------------------------- */


test('the full-screen calendar is a desktop control and is not on a phone', async ({ page }) => {
  // Author, 2026-09-02: "remove the 'Full Screen Calendar' button completely
  // from mobile - this was only ever supposed to be a desktop only addition."
  // `toBeHidden` rather than a count: it is still in the markup, and what is
  // asserted is that nothing - pointer or screen reader - can reach it.
  await ready(page);
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-fullcal]')).toBeHidden();

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('[data-fullcal]')).toBeVisible();
});


test('a phone prints the month short, on one line, close under the rail', async ({ page }) => {
  /*
   * Author, 2026-09-02: the date "was always supposed to be 'Sep' not
   * 'September' ... to avoid 2 rows for the date on mobile. And this date was
   * also supposed to be pushed up the page into the weekly display with
   * minimal margin."
   *
   * Three claims and the first carries the other two: the long month is what
   * made the heading wrap, and a wrapped heading is the row of content the
   * instruction is trying to buy back. The short form is the reader's own -
   * `formatDate` goes through the pack - so this asserts the long one is gone
   * rather than that three particular letters are there.
   */
  await ready(page);
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const date = page.locator('.cal-date');
  await expect(date).not.toContainText('September');
  await expect(date).toContainText('2026');

  const m = await page.evaluate(() => {
    const d = document.querySelector('.cal-date');
    const rail = document.querySelector('.cal-controls');
    const cs = getComputedStyle(d);
    return {
      lines: Math.round(d.getBoundingClientRect().height / parseFloat(cs.lineHeight)),
      gap: Math.round(d.getBoundingClientRect().top - rail.getBoundingClientRect().bottom),
    };
  });
  expect(m.lines, 'the date still takes two rows').toBe(1);
  expect(m.gap, 'the date is not pushed up into the picker').toBeLessThan(16);

  // And the desktop keeps the long month, which is the other half of it.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await expect(page.locator('.cal-date')).toContainText('September');
});


test('a desktop shows the month alone, across the column, with no toggle', async ({ page }) => {
  /*
   * Author, 2026-09-02: "on desktop daily page (ONLY ON DESKTOP), rework the
   * weekly/monthly display: remove the monthly button completely and just
   * display monthly only on desktop, no weekly display. Then make it take up
   * the whole width of the right hand column instead of allowing a column for
   * the old monthly display button, and justify the 'Full Screen Calendar'
   * button to the left margin of the right hand column along with the new
   * small monthly calendar display."
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  await expect(page.locator('[data-month]'), 'the month toggle is still on the page').toBeHidden();
  await expect(page.locator('.cal-week'), 'the week is still drawn on a desktop').toBeHidden();
  await expect(page.locator('.cal-month')).toBeVisible();
  await expect(page.locator('.month-grid [data-iso]').first()).toBeVisible();

  const m = await page.evaluate(() => {
    const controls = document.querySelector('.cal-controls').getBoundingClientRect();
    const month = document.querySelector('.cal-month').getBoundingClientRect();
    const grid = document.querySelector('.month-grid').getBoundingClientRect();
    const full = document.querySelector('[data-fullcal]').getBoundingClientRect();
    return {
      spare: Math.round(month.left - controls.left),
      gridLeft: Math.round(grid.left),
      fullLeft: Math.round(full.left),
      fullRight: Math.round(full.right),
      monthRight: Math.round(month.right),
      fullBelow: full.top >= month.bottom - 1,
    };
  });
  // No column held open for the button that is gone.
  expect(m.spare, 'a column is still being kept for the old toggle').toBeLessThan(4);
  /*
   * **Right-justified since 2026-09-02** (author: "move it right justified to
   * the rightmost column margin and change to 'Open Fullscreen'"), where the
   * instruction of the day before had put it on the grid's left margin. It is
   * the calendar's own way out, so it sits at the end of the calendar's last
   * line.
   */
  expect(Math.abs(m.fullRight - m.monthRight), 'Open Fullscreen is not on the column margin').toBeLessThan(6);
  expect(m.fullBelow, 'the button is not under the calendar').toBe(true);

  // And a phone keeps both the week and the button that swaps them.
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await expect(page.locator('.cal-week')).toBeVisible();
  await expect(page.locator('[data-month]')).toBeVisible();
});

/* ---- the round of 2026-09-02, night ------------------------------------- */


test('the calendar names its own reckoning, and the reader may change it', async ({ page }) => {
  /*
   * Author, 2026-09-02: "opposite it, right justified, on the same row, add
   * text that says 'Revised Julian'. Have the ability only on desktop to click
   * on this and in a drop down menu select between Revised Julian, Julian and
   * any other available calendar dates. Make sure all dates on the website
   * then change to match this selected calendar date."
   *
   * 14 September is the Exaltation of the Cross, which is the cleanest proof
   * available that a reckoning still reaches the fast (`calendarFor`, unlike
   * `churchDayFor` — see lib/church.js's own 2026-09-04 record — is a real
   * content question, not only a label): on the Revised Julian the civil 14th
   * is the Exaltation and brings its own strict fast, and on the Julian it is
   * not — the reckoning is the whole difference, and the day itself never
   * moves either way.
   */
  // The true unset state — `ready`'s own default reckoning is explicitly
  // Gregorian since 2026-09-05, for every test that is not about this.
  await ready(page, { church: 'russian', reckoning: null });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-09-14', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const button = page.locator('[data-reckoning-btn]');
  /*
   * **Before anybody has chosen anything, the control names the church's own
   * calendar — Julian, for a Russian reader — not a flat Gregorian**
   * (2026-09-05, reversing 2026-09-04's own fix, author: "'Follow my church'
   * doesnt work as it implies but just goes to Gregorian ... make sure the
   * 'Follow my church' selection actually works as it says"). The
   * 2026-09-04 fix made this read Gregorian on the reasoning that the
   * heading had not moved and printing "Julian" beside an unmoved 14
   * September was the false claim that started this whole area — true, but
   * the fix for it was on the wrong side: the heading below is what changed
   * instead, so both now agree on Julian rather than both agreeing on
   * Gregorian.
   */
  await expect(button).toHaveText('Julian');

  const head = await page.evaluate(() => {
    const name = document.querySelector('.month-name').getBoundingClientRect();
    const rec = document.querySelector('[data-reckoning]').getBoundingClientRect();
    const month = document.querySelector('.cal-month').getBoundingClientRect();
    return {
      sameRow: Math.abs(name.top - rec.top) < 20,
      nameOnMargin: Math.round(name.left - month.left),
      recOnMargin: Math.round(month.right - rec.right),
      fullName: document.querySelector('.month-name').textContent.trim(),
    };
  });
  expect(head.sameRow, 'the name and the reckoning are not on one row').toBe(true);
  expect(head.nameOnMargin, 'the month name is offset from the column margin').toBeLessThan(4);
  expect(head.recOnMargin, 'the reckoning is not on the right margin').toBeLessThan(4);
  // The civil 14 September is the Julian 1 September, by the church's own
  // default reckoning now in force before any explicit choice.
  expect(head.fullName, 'the month is abbreviated on a desktop').toContain('September');

  // What the day says before the change: the fast already followed the
  // church by way of `calendarFor`, unaffected by any of this — only the
  // label was ever wrong.
  const before = await page.locator('.cal').textContent();
  expect(before, 'premise: the Julian reckoning already keeps the Exaltation here').not.toContain('Exaltation');

  await button.click();
  // Four now, not three: Gregorian is an explicit choice of its own
  // (2026-09-05), not only ever an implicit default.
  await expect(page.locator('[data-reckoning-pop] [data-pick]')).toHaveCount(4);
  await page.locator('[data-reckoning-pop] [data-pick="revised-julian"]').click();

  // The control tells the truth about itself, and the fast has changed with
  // it — the civil 14th is a Great Feast under the calendar whose fixed dates
  // now govern it, unmoved from the day itself (2026-09-04).
  await expect(button).toHaveText('Revised Julian');
  await expect.poll(async () => (await page.locator('.cal').textContent()).includes('Exaltation')).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gos-settings')).reckoning)).toBe('revised-julian');

  /*
   * And the way back is a choice of its own rather than a third calendar —
   * back to the church's own default, Julian for a Russian reader, not to a
   * flat civil Gregorian. A reader who wants the civil date specifically now
   * picks "Gregorian" outright, checked next.
   */
  await button.click();
  await page.locator('[data-reckoning-pop] [data-pick=""]').click();
  await expect(button).toHaveText('Julian');

  await button.click();
  await page.locator('[data-reckoning-pop] [data-pick="gregorian"]').click();
  await expect(button).toHaveText('Gregorian');
  await expect(page.locator('.cal-date')).toHaveText(/14 September/);
});


test('a chosen reckoning renames the day and moves nothing it names', async ({ page }) => {
  /*
   * Author, 2026-09-02: "I click to change from Revised Julian to Julian, but
   * it stays as 2 Sep instead of going back 13 days. So now its claiming that
   * today is 2 Sep in Julian, which it isnt."
   *
   * That report was read, briefly, as asking for more than a label — a build
   * the same day made a chosen reckoning move which of the church's recorded
   * days the page showed, so picking Julian did not just rename 2 September
   * to 20 August, it substituted the saints of civil 15 September (the day
   * the Russian church's own calendar calls "2 September") for today's.
   * **Reversed, author, 2026-09-04: "today is still today, no matter what
   * calendar display is chosen… the saints should not be changing."** A
   * reckoning is now purely how the day is *named* — heading, month, grid,
   * hero, saints, readings, hymns, fasting note, all of it stay the civil
   * day's own; only the numerals and the month name change.
   */
  // The true unset state — `ready`'s own default reckoning is explicitly
  // Gregorian since 2026-09-05, for every test that is not about this.
  await ready(page, { church: 'russian', reckoning: null });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-09-02', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const heading = page.locator('.cal-date');
  const monthName = page.locator('.month-name');
  const hero = page.locator('.hero-name');
  /*
   * **The premise, updated 2026-09-05**: the church's own reckoning, not
   * flatly the civil date, once "Follow my church" is what is in force —
   * Julian for a Russian reader, thirteen days behind the civil URL this
   * page is still written in. DESIGN.md's "civil date and only the civil
   * date" rule now holds only for a reader whose church actually keeps
   * Gregorian, or who has chosen it outright (checked below).
   */
  await expect(heading).toHaveText('Wednesday, 20 August 2026');
  const civilHero = await hero.textContent();

  const pick = async (id) => {
    await page.locator('[data-reckoning-btn]').click();
    await page.locator(`[data-reckoning-pop] [data-pick="${id}"]`).click();
  };

  // Gregorian, chosen outright: the civil date the URL was always written
  // in, and still nothing re-sourced — the same saints as every other
  // reckoning shows for this same real day.
  await pick('gregorian');
  await expect(heading).toHaveText('Wednesday, 2 September 2026');
  await expect(hero).toHaveText(civilHero);

  // Julian, the Russian church's own: the day is renamed, and there is
  // nothing to re-source — the same saints, thirteen days earlier in the
  // reader's own reckoning.
  await pick('julian');
  await expect(heading).toHaveText('Wednesday, 20 August 2026');
  await expect(monthName).toHaveText('August 2026');
  await expect(hero).toHaveText(civilHero);

  // The month grid is the Julian month, and the cell for the day the reader is
  // standing on carries the Julian numeral against the civil date the URL and
  // every link on the page are still written in.
  const grid = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.month-grid [data-iso]')];
    const here = document.querySelector('.month-grid [aria-current="date"]');
    return {
      count: cells.length,
      first: cells[0]?.dataset.iso,
      last: cells.at(-1)?.dataset.iso,
      selected: { iso: here?.dataset.iso, num: here?.querySelector('.day-num')?.textContent },
    };
  });
  expect(grid.count, 'the Julian August is 31 days').toBe(31);
  expect(grid.first, 'the Julian 1 August is the civil 14th').toBe('2026-08-14');
  expect(grid.last, 'the Julian 31 August is the civil 13 September').toBe('2026-09-13');
  expect(grid.selected).toEqual({ iso: '2026-09-02', num: '20' });

  /*
   * Revised Julian too: the heading goes back to reading 2 September, and now
   * — unlike the reversed build — the hero stays the civil day's own. Two
   * different reckonings of the same real day print two different numerals
   * over one unmoved saint.
   */
  await pick('revised-julian');
  await expect(heading).toHaveText('Wednesday, 2 September 2026');
  await expect(hero).toHaveText(civilHero);

  // Neither reckoning goes anywhere: the URL, and what a link on the page
  // points at, are the civil date throughout.
  await expect(page).toHaveURL(/\/calendar\/2026-09-02$/);

  /*
   * And **the saints never move for a reader who has not asked, though the
   * label does now** (2026-09-05): back on Follow my church, a Russian
   * reader reads the day in their own church's Julian again — the same
   * numerals the explicit Julian pick above gave, arrived at without ever
   * touching that row — with the civil day's saints unchanged either way.
   */
  await pick('');
  await expect(heading).toHaveText('Wednesday, 20 August 2026');
  await expect(monthName).toHaveText('August 2026');
  await expect(hero).toHaveText(civilHero);
});


test('a phone is told the reckoning without being offered the choice', async ({ page }) => {
  // "Only on desktop" (author, 2026-09-02). A phone reader has already
  // answered the church question in the header; a second calendar control
  // beside it would be the same question asked twice.
  await ready(page);
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/calendar/2026-09-14', { waitUntil: 'networkidle' });
  await page.locator('[data-month]').click();
  await expect(page.locator('[data-reckoning]')).toBeHidden();
});
