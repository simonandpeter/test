import { test, expect } from '@playwright/test';
import {
  EMPTY,
  POPULATED,
  answered,
  dragGrain,
  duringMove,
  openChooser,
  ready,
  releaseGrain,
  searchMode,
  swipe,
} from './helpers.js';

/**
 * The Daily page: the rail, the month, the day panel, the readings and the fast.
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

test('the day is reachable by keyboard through the week strip', async ({ page }) => {
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const before = await page.locator('h1').first().textContent();
  await page.locator('.week-strip button').first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('h1').first()).not.toHaveText(before ?? '');
});

test('a populated day renders the hero, and each tradition in its own reckoning', async ({ page }) => {
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await expect(page.locator('.hero-name')).toHaveText('Venerable Anthony the Great');
  await expect(page.locator('.empty-day')).toHaveCount(0);

  // One calendar at a time (author, 2026-08-22; one church of three): the
  // Russian calendar names Anthony once, by the Julian feast that falls on 30
  // January; change to the Greek and the same civil day holds nothing of his,
  // because the New Calendar keeps 17 January on the 17th — the same menologion
  // date, two civil days, and never the same saint listed twice.
  await expect(page.locator('.day-panel .register li')).toHaveCount(0);
  await openChooser(page);
  await page.locator('#church-panel [data-church="greek"]').click();
  await expect(page.locator('.hero')).toHaveCount(0);
  await expect(page.locator('.empty-day')).toContainText('Nothing in the Greek calendar today');
  await page.goto('/calendar/2026-01-17', { waitUntil: 'networkidle' });
  await expect(page.locator('.hero-name')).toHaveText('Venerable Anthony the Great');
  // Only the civil date is printed (author, 2026-08-24): the line that gave
  // the day in the church's own reckoning went with the "Change calendar"
  // control under the strip, because two dates for one day read as confusion
  // rather than precision. The calendar is named and changed in the header.
  await expect(page.locator('[data-own-date]')).toHaveCount(0);
  await expect(page.locator('[data-which]')).toHaveCount(0);
  await expect(page.locator('[data-which-change]')).toHaveCount(0);
  // The older reckoning lines went earlier still (author, 2026-08-21).
  await expect(page.locator('.cal-reckonings')).toHaveCount(0);
  await expect(page.locator('.cal-reckoning')).toHaveCount(0);
  await expect(page.locator('.day-date')).toHaveCount(0);
});

test('an empty day is a designed state, not a hole', async ({ page }) => {
  await ready(page);
  await page.goto(EMPTY, { waitUntil: 'networkidle' });
  await expect(page.locator('.empty-day')).toHaveCount(1);
  await expect(page.locator('.hero')).toHaveCount(0);
  // The chrome stays: an empty day must still offer a way onward. The rail
  // holds far more than seven days (2026-08-24); what matters here is that it
  // is there and populated.
  expect(await page.locator('.week-strip button').count()).toBeGreaterThan(7);
  await expect(page.locator('.week-strip')).toBeVisible();
});

test('the hero image is a square on desktop and a 3:2 band on a phone', async ({ page }) => {
  /*
   * A square from 2026-08-21, a band from 2026-08-26 morning — "Change the
   * daily saint image crop from square to a horizontal rectangle … This is to
   * reduce the height of the card to show more of what's below in the also
   * commemorated section" — and **both, from the evening of the same day**:
   * "make sure on desktop the icon on the Daily main saint card is only
   * cropped to square, not to the horizontal rectangle."
   *
   * The two are not in conflict once the reason is read. The band was bought
   * to buy the register height, and from 620 px the image has a column of its
   * own beside the body: the hero's height is the taller of the two columns
   * and the body carries the name, the dates and six clamped lines of the
   * life, so the band costs a third of every icon and saves nothing. Below
   * 620 px the image is full width and *is* the card's height, which is where
   * the morning's instruction still applies, and it keeps the band there.
   *
   * What has not changed either way is why there is a fixed ratio at all: the
   * box is reserved before the image decodes, so nothing reflows on arrival.
   * Anthony's icon is 369x501, so this is a real crop at both.
   */
  await ready(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const img = page.locator('.hero-media img');
  await expect(img).toBeVisible();
  const desktop = await img.boundingBox();
  expect(Math.abs(desktop.width / desktop.height - 1), 'square on desktop').toBeLessThan(0.03);

  // And the band survives where it was bought: a phone, where the picture is
  // the card's own height.
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await expect(img).toBeVisible();
  const phone = await img.boundingBox();
  expect(Math.abs(phone.width / phone.height - 1.5), '3:2 on a phone').toBeLessThan(0.03);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(POPULATED, { waitUntil: 'networkidle' });

  // What a tall icon loses is its lower half, not the face: cover, anchored to
  // the top and centred across. The blurred placeholder underneath is anchored
  // the same way, or it would paint a differently-framed image under the one
  // arriving.
  const crop = await page.evaluate(() => {
    const s = getComputedStyle(document.querySelector('.hero-media img'));
    const media = getComputedStyle(document.querySelector('.hero-media'));
    return { fit: s.objectFit, position: s.objectPosition, background: media.backgroundPosition };
  });
  // Zero resolves to `0px` in one property and `0%` in the other; what is being
  // asserted is centred across and hard against the top, not which unit the
  // engine chose to print it in.
  expect(crop.fit).toBe('cover');
  expect(crop.position).toMatch(/^50% 0(px|%)$/);
  expect(crop.background).toMatch(/^50% 0(px|%)$/);
});

test('opening from the calendar goes through the prefetched payload', async ({ page }) => {
  const fetched = [];
  await page.route('**/saints/*/saint.json', (route) => {
    fetched.push(route.request().url());
    return route.continue();
  });

  await ready(page);

  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const link = page.locator('.hero-name a');
  await link.hover();
  await page.waitForTimeout(300);
  const afterHover = fetched.length;
  expect(afterHover).toBe(1);

  await link.click();
  await expect(page.locator('h1.saint-name')).toHaveText('Venerable Anthony the Great');
  // The click reuses what the hover fetched rather than asking again.
  expect(fetched.length).toBe(afterHover);
});

test('the shared element is named once, on both sides of the navigation', async ({ page }) => {
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });

  const names = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('[style*="view-transition-name"]')].map(
        (el) => getComputedStyle(el).viewTransitionName,
      ),
    );

  const onCalendar = await names();
  expect(onCalendar).toContain('s-anthony-the-great-name');
  expect(onCalendar).toContain('s-anthony-the-great-image');
  // A duplicate name makes the browser skip the transition entirely, which is
  // exactly the kind of fault that shows up as "it just stopped animating".
  expect(new Set(onCalendar).size).toBe(onCalendar.length);

  await page.locator('.hero-name a').click();
  await expect(page.locator('h1.saint-name')).toHaveText('Venerable Anthony the Great');
  const onDetail = await names();
  expect(onDetail).toContain('s-anthony-the-great-name');
  expect(new Set(onDetail).size).toBe(onDetail.length);
});

test('without a pointer to hover with, prefetch follows the viewport', async ({ browser }) => {
  // The mobile branch of the prefetch budget has no hover to trigger it, so it
  // is the half that can rot unnoticed while the desktop half keeps passing.
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await searchMode(page);
  const fetched = [];
  await page.route('**/saints/*/saint.json', (route) => {
    fetched.push(route.request().url());
    return route.continue();
  });

  await ready(page);

  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await expect(page.locator('.hero-name a')).toBeVisible();
  await page.waitForTimeout(400);
  expect(fetched.some((url) => url.includes('anthony-the-great'))).toBe(true);
  await ctx.close();
});

test('clicking through days faster than the roll leaves one panel, not two', async ({ page }) => {
  // The day panel rolls for 300 ms. A second click inside that window used to
  // find the *leaving* panel and append beside the entering one, so the day
  // showed an empty-day notice and a hero at once and the orphan outlived
  // every navigation after it. 28 June is Augustine in the Russian calendar;
  // 24 and 27 are empty.
  await ready(page);
  await page.goto('/calendar/2026-06-22', { waitUntil: 'networkidle' });
  // By date, not by position: the rail holds 121 days (2026-08-24), so the
  // nth button is no longer the nth of this week.
  const day = (iso) => page.locator(`.week-strip [data-iso="${iso}"]`);

  await day('2026-06-27').click();
  await page.waitForTimeout(60);
  await day('2026-06-28').click();
  await expect(page.locator('h1')).toHaveText(/28 Jun 2026/);
  await expect(page.locator('.day-panel')).toHaveCount(1);
  await expect(page.locator('.hero-name')).toHaveText('St Augustine of Hippo');
  await expect(page.locator('.empty-day')).toHaveCount(0);

  // And the day after the fast pair is clean too: the orphan used to persist.
  await day('2026-06-24').click();
  await expect(page.locator('h1')).toHaveText(/24 Jun 2026/);
  await expect(page.locator('.day-panel')).toHaveCount(1);
  await expect(page.locator('.empty-day')).toHaveCount(1);
  await expect(page.locator('.hero')).toHaveCount(0);
});

test('the month replaces the week rather than opening beneath it', async ({ page }) => {
  await ready(page);
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
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });

  // Days are one click each.
  await page.locator('.week-strip [data-iso="2026-08-24"]').click();
  await expect(page.locator('h1')).toHaveText(/24 Aug 2026/);

  // The arrows, from the page body — no focus in the strip.
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('h1')).toHaveText(/25 Aug 2026/);
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('h1')).toHaveText(/24 Aug 2026/);

  // A and D beside them, for a hand that is not on the arrows.
  await page.keyboard.press('d');
  await expect(page.locator('h1')).toHaveText(/25 Aug 2026/);
  await page.keyboard.press('a');
  await expect(page.locator('h1')).toHaveText(/24 Aug 2026/);
  // And S does nothing: it stepped back a day for one day (2026-08-24) and
  // the author removed it the next.
  await page.keyboard.press('s');
  await expect(page.locator('h1')).toHaveText(/24 Aug 2026/);

  // A modifier means the key is the browser's: ctrl+D must stay a bookmark.
  await page.keyboard.press('Control+d');
  await expect(page.locator('h1')).toHaveText(/24 Aug 2026/);

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
  await expect(page.locator('h1')).toHaveText(/28 Aug 2026/);

  await page.locator('[data-month]').click();
  await expect(page.locator('.cal-month')).toBeVisible();
  await swipe(page, '.cal-month', -120);
  await expect(page.locator('.month-name')).toHaveText('Sept 2026');
  await swipe(page, '.cal-month', 120);
  await expect(page.locator('.month-name')).toHaveText('Aug 2026');

  // A short drag is a mistap, and a mostly-vertical one belongs to the scroll.
  await swipe(page, '.cal-month', -20);
  await swipe(page, '.cal-month', -120, 200);
  await expect(page.locator('.month-name')).toHaveText('Aug 2026');
});

test('picking a date leaves the month open; only the button closes it', async ({ page }) => {
  await ready(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  const month = page.locator('.cal-month');
  const toggle = page.locator('[data-month]');

  await toggle.click();
  await expect(month).toBeVisible();
  await page.locator('.month-grid [data-iso="2026-08-08"]').click();
  await expect(page.locator('h1')).toHaveText(/8 Aug 2026/);
  // A reader comparing days should not have to reopen the month between them.
  await expect(month).toBeVisible();

  await toggle.click();
  await expect(month).toBeHidden();
  await expect(page.locator('.cal-week')).toBeVisible();
});

test('the month keeps the week edges where they were, and names itself in the gutter', async ({ page }) => {
  await ready(page);
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
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const heading = page.locator('h1');
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
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await searchMode(page);
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const closed = (await page.locator('h1').boundingBox()).y;

  await page.locator('[data-month]').click();
  // Removed, not shortened: every row is there on the next frame, and the JS
  // holds no pixel height and no clip it would then have to wait out.
  const body = page.locator('.month-body');
  expect(await body.evaluate((el) => el.style.height)).toBe('');
  expect(await body.evaluate((el) => el.classList.contains('is-growing'))).toBe(false);
  await expect(page.locator('.cal-week')).toBeHidden();
  expect((await page.locator('h1').boundingBox()).y).toBeGreaterThan(closed + 60);
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
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });

  // No swap machinery in the week, at rest or ever.
  await expect(page.locator('.cal-week .grain-side')).toHaveCount(0);
  await expect(page.locator('.cal-week .grain-track')).toHaveCount(0);

  // The day just beyond the trailing edge is real: the 31st, next Monday, in
  // the same button dress as the 28th — and clicking it selects it.
  const edge = page.locator('.week-strip [data-iso="2026-08-31"]');
  await expect(edge).toBeVisible();
  expect(await edge.evaluate((el, sel) => el.className === document.querySelector(sel).className,
    '.week-strip [data-iso="2026-08-28"]')).toBe(true);
  await edge.click();
  await expect(page.locator('h1')).toHaveText(/31 Aug 2026/);

  // Scrolling the rail is not a selection.
  await page.evaluate(() => {
    document.querySelector('.week-strip').scrollBy({ left: 200, behavior: 'instant' });
  });
  await page.waitForTimeout(300);
  await expect(page.locator('h1')).toHaveText(/31 Aug 2026/);
});

test('a month travels sideways with its own edges, and its day names do not', async ({ page }) => {
  // The week got this on 2026-08-21 and the month did not, because the month's
  // column could not travel while the day names above it sat inside the same
  // button. The names moved to a line of their own so that it could.
  await ready(page);
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

  await expect(page.locator('.month-name')).toHaveText('Sept 2026');
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
  await page.goto('/calendar/2026-08-24', { waitUntil: 'networkidle' });
  const before = await page.evaluate(() => document.querySelector('.week-strip').scrollLeft);
  await page.locator('.week-strip [data-iso="2026-08-27"]').click();
  await expect(page.locator('h1')).toHaveText(/27 Aug 2026/);
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => document.querySelector('.week-strip').scrollLeft);
  expect(Math.abs(after - before)).toBeLessThan(2);
});

test('under reduced motion the rail steps without a glide', async ({ browser }) => {
  // Removed, not shortened: the reveal that brings a stepped day into view is
  // an instant scroll under reduced motion, not a smooth one — and stepping
  // off the visible edge still arrives.
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await searchMode(page);
  await ready(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  // Sunday is the last snapped day; stepping past it forces a reveal.
  await page.locator('.week-strip [data-iso="2026-08-30"]').click();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('h1')).toHaveText(/31 Aug 2026/);
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
  await expect(page.locator('h1')).toHaveText(/28 Aug 2026/);
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
  await expect(page.locator('h1')).toHaveText(/28 Aug 2026/);
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
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
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
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await page.locator('[data-month]').click();
  await page.waitForTimeout(600);
  const six = await page.locator('.month-body').boundingBox();

  await page.locator('[data-mstep="1"]').click();
  await expect(page.locator('.month-name')).toHaveText('Sept 2026');
  const held = await page.locator('.month-body').evaluate((el) => el.style.height);
  expect(parseFloat(held)).toBeGreaterThan(0);

  await page.waitForTimeout(600);
  const five = await page.locator('.month-body').boundingBox();
  expect(five.height).toBeLessThan(six.height);
  expect(await page.locator('.month-body').evaluate((el) => el.style.height)).toBe('');
});

test('the month fades rather than appearing between two frames', async ({ page }) => {
  await ready(page);
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
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });

  // Still no chevrons anywhere in the chrome (author, 2026-08-21 — stands).
  const glyphs = await page.locator('.cal-controls button').allTextContents();
  expect(glyphs.join('')).not.toMatch(/[‹›]/);

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
  await expect(page.locator('h1')).toHaveText(/31 Aug 2026/);
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

test('changing the calendar changes the day everywhere it is counted', async ({ page }) => {
  // 28 June 2026 is Augustine in the Russian calendar — 15 June Julian — and
  // in no other: the New Calendar churches keep him on the civil 15th. So the
  // one church answers for the whole day, which is what makes this a test of
  // the choice rather than of a coincidence.
  await answered(page);
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  await expect(page.locator('.hero-name')).toContainText('Augustine');
  await expect(page.locator('#church-open')).toHaveText('Russian');

  await openChooser(page);
  await page.locator('#church-panel [data-church="greek"]').click();
  // The day, the hero, and the density dots under that date in the strip: one
  // choice, read everywhere, rather than in the one place someone remembered.
  await expect(page.locator('#church-open')).toHaveText('Greek');
  await expect(page.locator('.hero')).toHaveCount(0);
  await expect(page.locator('.empty-day')).toHaveCount(1);
  await expect(page.locator('.empty-day')).toContainText('Nothing in the Greek calendar today');
  await expect(page.locator('.empty-day')).toContainText('another church');
  /*
   * The dots under that date went with the author's instruction of 2026-08-25
   * evening ("remove the dots under each date in the calendar"), so what is
   * read here is the channel that outlived them: the day button's accessible
   * name, which carries the count when there is one and nothing when there is
   * not. Same reading, same one calendar answering for the whole day.
   */
  await expect(page.locator('.density')).toHaveCount(0);
  // The label carries the day's own marks since 2026-08-26 — a fast, a fish
  // day, a feast — because a dot says nothing to a screen reader. 28 June is a
  // Sunday inside the Apostles' Fast in the Greek calendar, so it keeps that
  // clause after the count goes.
  await expect(
    page.locator('.week-strip [data-iso="2026-06-28"]'),
  ).toHaveAttribute('aria-label', 'Sunday, 28 June 2026 - a fast');

  // And in the month, which counts the same entries.
  await page.locator('[data-month]').click();
  await page.waitForTimeout(600);
  await expect(page.locator('.density')).toHaveCount(0);

  // Where the Greek calendar does keep him: the same menologion date, on the
  // civil day of that name.
  await page.goto('/calendar/2026-06-15', { waitUntil: 'networkidle' });
  await expect(page.locator('.hero-name')).toContainText('Augustine');
});

test('an empty day says which of the two silences it is', async ({ page }) => {
  // Two different facts (redrawn 2026-08-22 for one church of three), and a
  // reader is owed the difference between them. The corpus having nothing for
  // a day is a statement about our sourcing; this church's calendar having
  // nothing while another of the three does is a fact about the choice above,
  // and names the way to the others. Prose in ink in either case.
  await ready(page);
  await page.goto(EMPTY, { waitUntil: 'networkidle' });
  await expect(page.locator('.empty-day')).toContainText('The corpus grows folder by folder');

  // 15 June has Augustine in the Romanian and Greek calendars, by the New
  // Calendar, and nothing in the Russian, which keeps him on the 28th.
  await page.goto('/calendar/2026-06-15', { waitUntil: 'networkidle' });
  await expect(page.locator('.empty-day')).toContainText('Nothing in the Russian calendar today');
  await expect(page.locator('.empty-day')).toContainText('another church’s calendar');
  await expect(page.locator('.empty-day')).not.toContainText('The corpus grows folder by folder');

  // Change to one that keeps him and the day fills.
  await openChooser(page);
  await page.locator('#church-panel [data-church="romanian"]').click();
  await expect(page.locator('.hero-name')).toContainText('Augustine');

  // A day with nothing on it is still about the sourcing, whichever is kept.
  await page.goto(EMPTY, { waitUntil: 'networkidle' });
  await expect(page.locator('.empty-day')).toContainText('The corpus grows folder by folder');
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

test('the hero image fills its column, and opens the saint', async ({ page }) => {
  /*
   * **Full width from 2026-08-26**, where it was 85% and centred from
   * 2026-08-21. Both halves of that decision were bought by the square: the
   * 15% kept a tall icon's own name above the fold at 360 px, and the centring
   * was a frame's habit. The 3:2 band clears the fold on its own — the test
   * below still measures it — and with the panel gone (author: "Let the main
   * saint sit directly on the ground") an inset picture over a full-measure
   * name reads as a mistake rather than as a margin.
   *
   * Wide, the image still has a column of its own and still fills it; the
   * 221 px track is unchanged, because that number was the *column's* and not
   * the image's.
   */
  await ready(page);
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const m = await page.evaluate(() => {
    const hero = document.querySelector('.hero');
    const s = getComputedStyle(hero);
    const tracks = s.gridTemplateColumns.split(' ').map(parseFloat).filter((n) => !Number.isNaN(n));
    return {
      tracks,
      column: hero.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight),
      width: document.querySelector('.hero-media').getBoundingClientRect().width,
    };
  });
  const expected = m.tracks.length === 2 ? m.tracks[0] : m.column;
  if (m.tracks.length === 2) expect(Math.round(m.tracks[0])).toBe(221);
  expect(Math.abs(m.width - expected)).toBeLessThan(1);

  // Clicking the image goes where clicking the name goes. It is hidden from
  // the accessibility tree and out of the tab order on purpose: the name links
  // to the same page, and a second link with no text of its own would be
  // either an unnamed link or the same one announced twice.
  const media = page.locator('.hero-media');
  await expect(media).toHaveAttribute('aria-hidden', 'true');
  await expect(media).toHaveAttribute('tabindex', '-1');

  /*
   * **No bookmark anywhere on the hero** (author, 2026-08-27: "remove the
   * bookmark on the main saint card … If people want to bookmark they can go
   * to the profile page itself").
   *
   * The mark moved three times before it was withdrawn — off the image's
   * corner and beside the name (2026-08-26 morning), pinned to the trailing
   * edge rather than trailing the name (that evening), then centred against a
   * wrapped name — so the count is checked in every place it has ever stood
   * rather than only the last one. `.hero-actions` is the oldest of them: it
   * carried the mark for a hero with no picture, and went with that branch.
   */
  await expect(page.locator('.hero-figure > .bookmark')).toHaveCount(0);
  await expect(page.locator('.hero .hero-actions')).toHaveCount(0);
  await expect(page.locator('.hero .bookmark')).toHaveCount(0);
  await expect(page.locator('.hero .name-line')).toHaveCount(0);

  await media.click();
  await expect(page.locator('h1.saint-name')).toHaveText('St Augustine of Hippo');
});

test('the hero name takes the whole line, with no mark to make room for', async ({ page }) => {
  /*
   * Author, 2026-08-27: "remove the bookmark on the main saint card, and
   * remove the margin that kept the text from overlapping with the bookmark,
   * let the text go full width now."
   *
   * This was the test that the mark *held its place* beside a name that wraps,
   * from the instruction of the day before ("reserve a spot for it, so as to
   * make sure if the text is long and requires 2 lines the bookmark still
   * stays in the same position"). The reservation is what has been withdrawn,
   * so the assertion turns over on the same day and the same saint: the name's
   * own box is now the whole column rather than the column less a mark.
   *
   * 14 September 2026 in the Romanian calendar is the day's sole Romanian
   * entry, so pickHero is deterministic rather than the usual hash over a
   * pool — and "Cuviosul Mucenic Macarie, ucenicul Patriarhului Nifon" is long
   * enough to wrap at 360 px without being built for the test.
   */
  await page.setViewportSize({ width: 360, height: 780 });
  await ready(page, { church: 'romanian' });
  await page.goto('/calendar/2026-09-14', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const name = page.locator('.hero-name');
  await expect(name).toContainText('Macarius');
  await expect(page.locator('.hero .bookmark')).toHaveCount(0);

  const m = await page.evaluate(() => {
    const el = document.querySelector('.hero-name');
    const range = document.createRange();
    range.selectNodeContents(el);
    return {
      lines: range.getClientRects().length,
      nameWidth: el.getBoundingClientRect().width,
      bodyWidth: document.querySelector('.hero-body').getBoundingClientRect().width,
    };
  });
  // Still the wrapping name the older test needed, so the two are comparable.
  expect(m.lines).toBeGreaterThan(1);
  // The whole column. A reserved slot shows up here as the mark's 32 px and
  // its gap missing from the name's own box, which is what this used to be.
  expect(m.bodyWidth - m.nameWidth).toBeLessThan(1);
});

test('the saint name clears the fold at 360 px on a tall icon', async ({ page }) => {
  // The reason the image came down to 85%. Augustine is the tallest icon in
  // the corpus and 28 August is his day, so this is the worst case the corpus
  // actually holds rather than one constructed for the test.
  await page.setViewportSize({ width: 360, height: 780 });
  await answered(page);
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const name = await page.locator('.hero-name').boundingBox();
  expect(name.y).toBeLessThan(780);
});

/* ---- one swap primitive (src/ui/swap.js) -------------------------------- */

test('a calendar change repaints the day in place rather than rolling it', async ({ page }) => {
  // The movement decides, not the gesture (DESIGN.md §5b). A change of
  // calendar has not travelled anywhere in time, so the panel repaints where
  // it stands — it used to roll upward as if the reader had stepped forward a
  // day. 28 June is Augustine's in the Russian calendar and nobody's in the
  // other two, so the change empties the day rather than taking it elsewhere.
  await ready(page);
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  await expect(page.locator('.hero-name')).toContainText('Augustine');
  await openChooser(page);
  await page.locator('#church-panel [data-church="greek"]').click();
  await expect(page.locator('.empty-day')).toContainText('another church');
  await openChooser(page);
  await page.locator('#church-panel [data-church="russian"]').click();
  await expect(page.locator('.hero-name')).toContainText('Augustine');

  // Read synchronously after the click, inside the window a roll would occupy.
  await openChooser(page);
  const after = await page.evaluate(() => {
    document.querySelector('#church-panel [data-church="romanian"]').click();
    return {
      leaving: document.querySelectorAll('.day-panel.slot-leaving').length,
      entering: document.querySelectorAll('.day-panel.slot-entering').length,
      panels: document.querySelectorAll('.day-panel').length,
    };
  });
  expect(after).toEqual({ leaving: 0, entering: 0, panels: 1 });
  // The repaint itself still happened: Augustine is not in the Romanian
  // calendar on this civil day.
  await expect(page.locator('.empty-day')).toHaveCount(1);
});

test('the rolling day leaves an inert copy behind it', async ({ page }) => {
  // Amendment 17's corollary, applied to the roll it had never reached: for
  // 300 ms the document holds two day panels, and the leaving one is laid over
  // the same spot — aria-hidden, out of the tab order, out of the pointer's
  // reach, or its links swallow the click meant for the arriving day.
  await answered(page);
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  await expect(page.locator('.hero-name')).toContainText('Augustine');

  const marked = await page.evaluate(() => {
    document.querySelector('.week-strip [data-iso="2026-06-26"]').click();
    const leaving = document.querySelector('.day-panel.slot-leaving');
    if (!leaving) return null;
    return {
      hidden: leaving.getAttribute('aria-hidden'),
      pointer: leaving.style.pointerEvents,
      reachable: [...leaving.querySelectorAll('a, button')].filter((n) => n.tabIndex !== -1)
        .length,
    };
  });
  expect(marked).toEqual({ hidden: 'true', pointer: 'none', reachable: 0 });
  await expect(page.locator('.day-panel')).toHaveCount(1);
});

test('the fading week is aside while the month arrives, and current again after', async ({ page }) => {
  // For the length of the cross-fade both grains are painted over one cell.
  // The one the reader is leaving must say so completely; `hidden` only takes
  // over once the fade lands, and closing the month hands everything back.
  await answered(page);
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

test('the × returns to the Daily page when the saint was opened from it, not to All Saints', async ({ page }) => {
  // Author, 2026-08-23. The hero, the register and both shelves all open a
  // saint from the calendar, and closing it should land the reader back on
  // that day rather than in All Saints, a page they never asked to visit.
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await page.locator('.hero-name a').click();
  await expect(page).toHaveURL(/\/saints\/anthony-the-great$/);
  await expect(page.locator('[data-back]')).toHaveAttribute('aria-label', 'Back to Daily');
  await page.locator('[data-back]').click();
  await expect(page).toHaveURL(new RegExp(`${POPULATED}$`));
  await expect(page.locator('.hero-name')).toHaveText('Venerable Anthony the Great');

  // Opened from All Saints instead, the × still returns there.
  await page.goto('/saints', { waitUntil: 'networkidle' });
  await page.locator('[data-query]').fill('Anthony the Great');
  await page.locator('.index-card .index-name', { hasText: 'Anthony the Great' }).first().click();
  await expect(page).toHaveURL(/\/saints\/anthony-the-great$/);
  await expect(page.locator('[data-back]')).toHaveAttribute('aria-label', 'Back to All Saints');
  await page.locator('[data-back]').click();
  await expect(page).toHaveURL(/\/saints$/);
});

test('the Daily page prints the civil date alone, the paschal cycle, the tone and the fast in its colour', async ({ page }) => {
  // Author, 2026-08-23, amended 2026-08-24: only the civil date is printed
  // now. Under it, where the day stands in the paschal cycle, the
  // tone, and whether it is a fast for this church — which is why the Russian
  // and the Greek disagree on the same civil day (the Dormition Fast runs to
  // 27 August on the Julian calendar). Each figure is what the church's own
  // calendar printed for the day (tests/liturgy.test.mjs has the comparison).
  await ready(page, { church: 'russian' });
  await page.goto('/calendar/2026-08-23', { waitUntil: 'networkidle' });
  /*
   * The grade leads the line where the church's own calendar printed one
   * (author, 2026-08-25 evening: "the fasting text should say which type of
   * fast is required"). days.pravoslavie.ru printed «разрешается пища с
   * растительным маслом» for this day, so the line says Oil and wine — read
   * off that note by lib/fast-grade.js, never computed. lib/liturgy.js still
   * refuses to compute an allowance, which is why a day whose calendar
   * printed none still says only "Fast".
   */
  /*
   * **The fast leads the line, as a chip, since 2026-08-26** (author: "Fasting
   * is the number-one daily question and it's currently the quietest element …
   * Make it a chip at the top of the day — coloured with your
   * fast-strict/fish/free tokens — and print the allowance inline on fast
   * days"). The three facts are the same three and the order is reversed: the
   * fast first, then what it allows, then the cycle and the tone.
   *
   * So the one string that asserted all three in one reading is three
   * assertions, which is also a truer test — it can no longer pass on a line
   * that happens to contain the right words in the wrong places.
   */
  // The chip is the grade alone since the evening of 2026-08-26 (author:
  // "Don't mention the event for fasting in the fasting label"); the occasion
  // it used to trail stands beside it in a chip of its own, and the allowance
  // it used to print beneath is back in the bubble.
  await expect(page.locator('[data-liturgy] .fast')).toHaveText(/^Oil and Wine Allowed/);
  await expect(page.locator('[data-liturgy] .occasion-chip')).toHaveText('the Dormition Fast');
  await expect(page.locator('[data-liturgy] .fast-allowance')).toHaveCount(0);
  await expect(page.locator('[data-liturgy] .cal-cycle')).toHaveText('12th Sunday after Pentecost · Tone 3');
  await expect(page.locator('[data-liturgy] .fast')).toHaveAttribute('aria-haspopup', 'dialog');
  await expect(page.locator('[data-liturgy] .fast')).toHaveAttribute('data-grade', 'oil');
  // A chip, not a run of coloured words: it carries a field and a hairline of
  // its own colour, which is what makes it findable before it is read.
  const chip = await page.locator('[data-liturgy] .fast').evaluate((el) => {
    const cs = getComputedStyle(el);
    return { radius: parseFloat(cs.borderTopLeftRadius), border: parseFloat(cs.borderTopWidth) };
  });
  expect(chip.radius).toBeGreaterThan(8);
  expect(chip.border).toBeGreaterThan(0);
  // The fast carries its kind, so the three states are told apart by colour
  // as well as by their wording (author, 2026-08-24).
  await expect(page.locator('[data-liturgy] .fast')).toHaveAttribute('data-fast', 'fast');
  // A life with no recorded beginning is read from its end (author,
  // 2026-08-24): the hero of this day, Lawrence of Kaluga, said
  // "undated – 1515" until then.
  // "Entered eternal glory in 1515" until 2026-08-25, when the author
  // replaced the phrase with plain "Reposed".
  // The office joined the line under the name on 2026-08-27, when it moved
  // out of `display_name`: the heading reads "Blessed Lawrence of Kaluga" and
  // this line says what he was.
  await expect(page.locator('.hero-dates')).toHaveText('Fool for Christ · Reposed 1515');
  // And Also commemorated reads as one company, not a ruled ledger: no line
  // between the saints (author, 2026-08-24; the shelves keep theirs).
  expect(
    await page.locator('.day-panel .register li').first().evaluate((li) => getComputedStyle(li).borderBottomWidth),
  ).toBe('0px');
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  // A fish-permitted day resolves to the `fish` grade, which is the one
   // grade taken from lib/liturgy.js rather than from a printed note — that
   // claim is liturgy.js's own and predates this.
  // The chip is the grade alone, and the occasion is *not* chipped beside it
  // on this day: "a Great Feast on a Friday" and the gold chip's "Great Feast
  // - The Dormition of the Theotokos" are the same sentence twice, so the one
  // that names the feast wins and the other is suppressed.
  await expect(page.locator('[data-liturgy] .fast')).toHaveText(/^Oil, Wine and Fish Allowed/);
  await expect(page.locator('[data-liturgy] .occasion-chip')).toHaveCount(0);
  await expect(page.locator('[data-liturgy] .feast-chip')).toHaveText(
    'Great Feast - The Dormition of the Theotokos',
  );
  await expect(page.locator('[data-liturgy] .fast')).toHaveAttribute('data-fast', 'fish');

  await openChooser(page);
  await page.locator('#church-panel [data-church="greek"]').click();
  // And an ordinary Friday, whose calendar printed no allowance. It said
  // "Fast - Friday" and stopped until the evening of 2026-08-26; it is Strict
  // Fasting by default now, and the weekday goes with the change because on
  // this day the reason *was* the weekday (DESIGN.md §5b carries the
  // reversal).
  await expect(page.locator('[data-liturgy] .fast')).toHaveText(/^Strict Fasting/);
  await expect(page.locator('[data-liturgy] .cal-cycle')).toHaveText('13th week after Pentecost · Tone 3');
  // The weekday earns no occasion chip: on this day the reason *is* the
  // weekday, printed in full in the heading above.
  await expect(page.locator('[data-liturgy] .occasion-chip')).toHaveCount(0);
  await page.goto('/calendar/2026-08-23', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-liturgy] .fast')).toContainText('No Fast');
  await expect(page.locator('[data-liturgy] .cal-cycle')).toHaveText('12th Sunday after Pentecost · Tone 3');
  // Nothing prints the allowance inline any more, on any day: the author
  // withdrew that line on the evening of 2026-08-26 and the bubble is its
  // home again.
  await expect(page.locator('[data-liturgy] .fast-allowance')).toHaveCount(0);
  await expect(page.locator('[data-liturgy] .fast')).toHaveAttribute('data-fast', 'fast-free');
});

test('the readings of the day link to Bible Gateway and name the page they were read from', async ({ page }) => {
  // Author, 2026-08-23. Recorded per church for the week of 23 August; the
  // Russian reads the Dormition on the 28th where the Greek reads the weekday,
  // and a day nobody has recorded prints nothing.
  await ready(page, { church: 'russian' });
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  const links = page.locator('[data-readings] .readings a');
  await expect(links).toHaveCount(2);
  await expect(links.first()).toHaveText('Philippians 2:5-11');
  await expect(links.first()).toHaveAttribute('href', /biblegateway\.com\/passage\/\?search=Philippians%202%3A5-11&version=NKJV/);
  await expect(page.locator('[data-readings] .readings-source a')).toHaveAttribute('href', /days\.pravoslavie\.ru\/Days\/20260815\.html/);
  await openChooser(page);
  await page.locator('#church-panel [data-church="greek"]').click();
  await expect(page.locator('[data-readings] .readings a').first()).toHaveText('2 Corinthians 11:5-21');
  // 20 September is a recorded day for the Russian and Romanian calendars
  // since Amendment 44 — but not for the Greek, which is the church selected
  // here: saint.gr publishes about a fortnight ahead and its records stop on
  // the 19th. So this still shows nothing, and now it shows nothing for a
  // reason a reader could check.
  await page.goto('/calendar/2026-09-20', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-readings]')).toHaveCount(0);
});

test('the hymns of the day are the chosen church own, in its language, and the hero is the saint it sings for', async ({ page }) => {
  // Author, 2026-08-23. The Greek 24 August: Kosmas of Aetolia's apolytikion
  // and kontakion from saint.gr, and Kosmas the hero because the Greek church
  // sings for him that day — not Eutyches, whom the date's hash would pick.
  // The Romanian 27 August: Phanourios's tropar from Doxologia, in Romanian.
  // The Greek 23 August: the Leavetaking of the Dormition, a feast's hymns
  // recorded with the day, before any saint's payload arrives.
  /*
   * Read in Greek, not in English, and deliberately since 2026-08-26: the
   * hymn a church sings is one question and the language it is *rendered* in
   * is another. Where a published English translation exists — Hapgood's
   * 1906, for three feasts — an English reader is given it, and the
   * Leavetaking of the Dormition below is one of the three. This test is
   * about the first question, so it asks it in the church's own tongue; the
   * second has tests of its own.
   */
  await ready(page, { church: 'greek', language: 'el' });
  await page.goto('/calendar/2026-08-24', { waitUntil: 'networkidle' });
  await expect(page.locator('.hero-name')).toHaveText('Ισαπόστολος Κοσμάς ο Αιτωλός');
  await expect(page.locator('[data-hymns] .hymn')).toHaveCount(2);
  await expect(page.locator('[data-hymns] .hymn-text').first()).toHaveAttribute('lang', 'el');
  await expect(page.locator('[data-hymns] .hymn-text').first()).toContainText('Κοσμᾶν τὸν ἰσαπόστολον');
  // The label follows the reader's language too, and this page is read in
  // Greek: «Απολυτίκιο», not "Troparion".
  await expect(page.locator('[data-hymns] .hymn-kind').first()).toContainText('Απολυτίκιο · Ἦχος α΄');
  await page.goto('/calendar/2026-08-23', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-hymns] [data-feast-hymns] .hymn')).toHaveCount(2);
  await expect(page.locator('[data-hymns] .hymn-text').first()).toContainText('ἐν τὴ Κοιμήσει τὸν κόσμον οὐ κατέλιπες');

  await openChooser(page);
  await page.locator('#church-panel [data-church="romanian"]').click();
  await page.goto('/calendar/2026-08-27', { waitUntil: 'networkidle' });
  // The *calendar* changed to Romanian; the *language* is still Greek, and
  // the name follows the language: «Μεγαλομάρτυς Φανούριος», the form the Greek
  // synaxarion prints. Which is the distinction this whole test is about,
  // arriving in the names as well as in the hymns (2026-08-26).
  await expect(page.locator('.hero-name')).toHaveText(/Φανούριος|Ποιμήν/);
  await expect(page.locator('[data-hymns] .hymn-text').first()).toHaveAttribute('lang', 'ro');
  await expect(page.locator('[data-hymns] .hymn-kind').first()).toContainText('Glas');
  // Nothing Greek on the Romanian page, and nothing at all where nothing is
  // recorded. That day used to be 20 September; since Amendment 44 the
  // Romanian records run to the end of 2026, so the empty day has to be one
  // past every source's horizon.
  await expect(page.locator('[data-hymns] .hymn-text[lang="el"]')).toHaveCount(0);
  await page.goto('/calendar/2027-03-01', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-hymns]:not([hidden])')).toHaveCount(0);
  await expect(page.locator('[data-readings]')).toHaveCount(0);
});

test('the Serbian calendar is the fourth choice, on the Julian calendar, with its own week of saints, readings, fast and tropars', async ({ page }) => {
  // Author, 2026-08-23 (Amendment 29). The chooser offers four; the Serbian
  // keeps the Julian calendar, so the civil 23 August is its 10 August, the
  // same Sunday and tone as the Russian, and the same Dormition Fast. Its
  // week is read off the Православни подсетник (pravoslavno.rs): Lawrence on
  // the 23rd with his tropar in Serbian — the hero, because the Serbian sings
  // for him — the day's Apostle and Gospel, and on the 29th two Apostles.
  await ready(page, { church: 'russian' });
  await page.goto('/calendar/2026-08-23', { waitUntil: 'networkidle' });
  await openChooser(page);
  const serbian = page.locator('#church-panel [data-church="serbian"]');
  await expect(serbian).toContainText('Serbian');
  await expect(serbian.locator('.choice-calendar')).toHaveText('Julian calendar');
  await serbian.click();
  await expect(page.locator('#church-open')).toContainText('Serbian');
  // The fast is a button since 2026-08-25 — it opens what the fast allows —
  // so the line's text now carries the (i) and the announcement a screen
  // reader is given. The Serbian calendar records no fasting note at all for
  // this day, which used to mean no grade led the line; since the evening of
  // 2026-08-26 an unstated fast is Strict Fasting by default, and the reason
  // stays because "the Dormition Fast" is not a weekday.
  await expect(page.locator('[data-liturgy] .fast')).toHaveText(/^Strict Fasting/);
  await expect(page.locator('[data-liturgy] .occasion-chip')).toHaveText('the Dormition Fast');
  await expect(page.locator('[data-liturgy] .cal-cycle')).toHaveText('12th Sunday after Pentecost · Tone 3');
  await expect(page.locator('[data-liturgy] .fast')).toHaveAttribute('aria-haspopup', 'dialog');
  await expect(page.locator('.hero-name')).toContainText('Lawrence of Rome');
  const links = page.locator('[data-readings] .readings a');
  await expect(links).toHaveCount(2);
  await expect(links.first()).toHaveText('1 Corinthians 15:1-11');
  await expect(links.last()).toHaveText('Matthew 19:16-30');
  await expect(page.locator('[data-readings] .readings-source a')).toHaveAttribute('href', /pravoslavno\.rs/);
  await expect(page.locator('[data-hymns] .hymn')).toHaveCount(1);
  await expect(page.locator('[data-hymns] .hymn-text').first()).toHaveAttribute('lang', 'sr');
  await expect(page.locator('[data-hymns] .hymn-text').first()).toContainText('Мученик Твој Господе, Лаврентије');
  await expect(page.locator('[data-hymns] .hymn-kind').first()).toContainText('Troparion · глас 4');
  await page.goto('/calendar/2026-08-29', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-readings] .readings a')).toHaveCount(3);
  await expect(page.locator('[data-liturgy] .fast')).toContainText('No Fast');
  await expect(page.locator('[data-liturgy] .cal-cycle')).toHaveText('13th week after Pentecost · Tone 3');

  // The Russian week (Amendment 29 too): the 24th is its 11 August, Euplus
  // and the Caves fathers with Church Slavonic tropars from the Patriarchate's
  // calendar, and the hero one of the saints it sings for.
  await openChooser(page);
  await page.locator('#church-panel [data-church="russian"]').click();
  await page.goto('/calendar/2026-08-24', { waitUntil: 'networkidle' });
  await expect(page.locator('.hero-name')).toHaveText(/Euplus|Theodore|Basil/);
  // Euplus sings the martyrs' *common* troparion, which Orloff's General
  // Menaion prints, so this reader — who is reading English — meets it in
  // English. The tone beside it is still the Slavonic calendar's own «глас»,
  // because a rendering does not change which church's book the hymn is from.
  await expect(page.locator('[data-hymns] .hymn-kind').first()).toContainText('глас');
  await expect(page.locator('[data-hymns] .hymn-text[lang="en"]').first())
    .toContainText('Thy martyr, O Lord');
  // The claim this line has always made: nothing Serbian on the Russian
  // calendar. Unchanged.
  await expect(page.locator('[data-hymns] .hymn-text[lang="sr"]')).toHaveCount(0);
  // And a Russian reader still meets the Slavonic, which is the corpus's text.
  await page.locator('#lang-open').click();
  await page.locator('#lang-panel [data-language="ru"]').click();
  await expect(page.locator('[data-hymns] .hymn-text').first()).toHaveAttribute('lang', 'cu');
  await expect(page.locator('[data-hymns] .hymn-text[lang="en"]')).toHaveCount(0);
});

test('the three weeks after the first are in the calendars: readings, feast hymns, the saints they sing for, and icons with their Commons source', async ({ page }) => {
  // Amendment 31 (author, 2026-08-23): 30 August to 19 September for all four
  // churches. The Romanian 8 September is the Nativity of the Theotokos — the
  // feast's pericopes from doxologia.ro and its troparion, recorded with the
  // day; the Greek 14 September the Exaltation, whose apolytikion saint.gr
  // prints though its readings for that day were not yet published when read
  // (so no readings block, and nothing invented); the Russian 11 September
  // the Beheading, a strict fast, the Forerunner the hero because the
  // Patriarchate's calendar sings for him; the Serbian 18 September Zacharias
  // with his tropar from the Православни подсетник. A new saint opens on a
  // life from the calendars and an icon from Wikimedia Commons, its licence
  // and file page on the credit line.
  // In Romanian, for the same reason as the test above: 8 September is the
  // Nativity of the Birth-giver of God, one of the three feasts Hapgood's
  // 1906 English covers, so an English reader would be shown her rendering.
  await ready(page, { church: 'romanian', language: 'ro' });
  await page.goto('/calendar/2026-09-08', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-readings] .readings a').first()).toHaveText('Filipeni 2:5-11');
  await expect(page.locator('[data-readings] .readings-source a')).toHaveAttribute('href', /doxologia\.ro\/8-septembrie/);
  await expect(page.locator('[data-hymns] [data-feast-hymns] .hymn-text[lang="ro"]').first()).toContainText('Naşterea ta, de Dumnezeu Născătoare Fecioară');

  await openChooser(page);
  await page.locator('#church-panel [data-church="greek"]').click();
  await page.goto('/calendar/2026-09-14', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-readings]')).toHaveCount(0);
  await expect(page.locator('[data-hymns] [data-feast-hymns] .hymn-text[lang="el"]').first()).toContainText('Σῶσον Κύριε τὸν λαόν σου');

  await openChooser(page);
  await page.locator('#church-panel [data-church="russian"]').click();
  await page.goto('/calendar/2026-09-11', { waitUntil: 'networkidle' });
  // Romanian page, Romanian book name — the reference is printed in the
  // reader's language and links to a Bible in it (Amendment 39).
  await expect(page.locator('[data-readings] .readings a').first()).toHaveText('Faptele Apostolilor 13:25-32');
  await expect(page.locator('[data-readings] .readings-source a')).toHaveAttribute('href', /days\.pravoslavie\.ru\/Days\/20260829\.html/);
  await expect(page.locator('.hero-name')).toHaveText('Proorocul Ioan Botezătorul');
  await expect(page.locator('[data-hymns] .hymn-text[lang="cu"]').first()).toContainText('Память праведнаго с похвалами');

  await openChooser(page);
  await page.locator('#church-panel [data-church="serbian"]').click();
  await page.goto('/calendar/2026-09-18', { waitUntil: 'networkidle' });
  // Serbian calendar, Romanian page: «Proorocul Zaharia», from the Romanian form.
  await expect(page.locator('.hero-name')).toContainText('Proorocul Zaharia');
  await expect(page.locator('[data-hymns] .hymn-text[lang="sr"]').first()).toContainText('Обучен у свештеничке одежде');
  await expect(page.locator('[data-readings] .readings a').first()).toHaveText('Efeseni 1:7-17');

  await page.goto('/saints/babylas-of-antioch', { waitUntil: 'networkidle' });
  await expect(page.locator('h1.saint-name')).toHaveText('Sfințitul Mucenic Vavila, Episcopul Antiohiei');
  /*
   * The life itself is English and the page says so first, in Romanian
   * (author, 2026-08-26: "The saint profile pages do not have russian, greek,
   * serbian or romanian translations. We need to add them").
   *
   * Everything on this page that is the *site's* words now translates. The
   * corpus does not, and will not by this build: 742 lives, each the author's
   * paraphrase of a named source, and the only way to render them into four
   * languages is machine translation — which Amendment 2 forbids outright, and
   * which in hagiography would turn a mistranslated clause into a false claim
   * about a person and about a source cited by name. So the reader is told,
   * once, rather than left to wonder whether the page is broken.
   */
  await expect(page.locator('.life-language')).toHaveText(
    'Viața este scrisă în engleză și încă nu a fost tradusă.',
  );
  await expect(page.locator('.life [lang="en"]')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.life p').nth(1)).toContainText('this great and wonderful man');
  await expect(page.locator('.life em a[href*="pravoslavno.rs"]')).toHaveCount(1);
  await expect(page.locator('.saint-media img')).toBeVisible();
  const credit = page.locator('.image-credit a');
  // The harvest pipeline stores the colon percent-encoded (File%3A); both
  // forms resolve to the same Commons file page.
  await expect(credit).toHaveAttribute('href', /commons\.wikimedia\.org\/wiki\/File(:|%3A)/);
  await expect(credit).toHaveText('Public domain');
});

test('every language fits the 360 px header, and none leaks a placeholder', async ({ browser }) => {
  /*
   * The two failure modes hand-written packs actually produce: a string long
   * enough to overflow the narrow header (Russian did, at first writing —
   * «Русская церковь» put it 6 px over, which is why the packs name the
   * churches by adjective alone), and a {placeholder} that survives to the
   * reader because a template lost its token (the unit suite pins token
   * parity; this pins the rendered page).
   */
  for (const lang of ['ru', 'ro', 'el', 'sr']) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
    const page = await ctx.newPage();
  await searchMode(page);
    await page.addInitScript(
      (l) => localStorage.setItem('gos-settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('gos-settings') ?? '{}'), church: 'russian', language: l })),
      lang,
    );
    await page.goto('/calendar/2026-08-26', { waitUntil: 'networkidle' });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${lang} overflows 360px`).toBe(0);
    const chrome = await page.evaluate(
      () => document.querySelector('header').innerText + document.querySelector('[data-liturgy]').innerText,
    );
    expect(chrome, `${lang} leaks a placeholder`).not.toMatch(/\{\w+\}/);
    await ctx.close();
  }
});

test('the gold hairline under the date runs full width, close to the text', async ({ page }) => {
  /*
   * Author, 2026-08-26: "make the gold line on daily page go full width like
   * the other lines and make it closer to the date not so far down." It ran
   * 2.5em (40px at this size) and sat a full space-2 (8 px) below the
   * heading's text; now it spans the column like the register's own rules and
   * the register-heading's underline, and stands a tighter space-1 (4 px)
   * under it.
   */
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const m = await page.evaluate(() => {
    const heading = document.querySelector('.cal-date');
    const body = document.querySelector('.cal-body');
    const s = getComputedStyle(heading, '::after');
    return {
      headingWidth: heading.getBoundingClientRect().width,
      bodyWidth: body.getBoundingClientRect().width,
      afterWidth: parseFloat(s.width),
      paddingBottom: parseFloat(getComputedStyle(heading).paddingBottom),
      goldRgb: (() => {
        const hex = getComputedStyle(document.documentElement).getPropertyValue('--gold').trim();
        const n = parseInt(hex.slice(1), 16);
        return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
      })(),
      afterBackground: s.backgroundColor,
    };
  });
  // Full column width, not the old 2.5em fixed measure.
  expect(Math.abs(m.headingWidth - m.bodyWidth)).toBeLessThan(2);
  expect(Math.abs(m.afterWidth - m.bodyWidth)).toBeLessThan(2);
  // Close to the text: one space-1 (4 px), not two (8 px).
  expect(m.paddingBottom).toBeLessThanOrEqual(4);
  expect(m.afterBackground).toBe(m.goldRgb);
});

/* ---- the 2026-08-25 batch: the fast, the hymns, the lede, the Bibles ---- */

test('the fast bubble says what this day allows, and nothing about the others', async ({ page }) => {
  /*
   * Author, 2026-08-25, revised the same evening. It began as a modal listing
   * all four grades and a paragraph on whose the ruling is; the author cut it
   * to the day in hand — "the pop-up shouldn't explain more than what that
   * day requires. E.g. if a day is Xerophagy, the pop-up says 'Uncooked food,
   * without oil or wine'" — and the cut is right: a reader looking at Tuesday
   * is owed Tuesday, and three grades that do not apply are three chances to
   * act on the wrong one.
   *
   * What did *not* change is the boundary underneath. lib/liturgy.js still
   * refuses to compute an allowance, because that is the typikon's and
   * jurisdictions keeping the same fast differ. The grade is read off the
   * church's own printed note and named from a closed vocabulary — a
   * quotation resolved, never a derivation — and the note it was read from is
   * quoted under it, untranslated and cited, as every other quotation here.
   */
  await ready(page, { church: 'russian' });
  await page.goto('/calendar/2026-08-23', { waitUntil: 'networkidle' });
  const fast = page.locator('[data-liturgy] .fast');
  await expect(fast).toHaveAttribute('aria-haspopup', 'dialog');
  await expect(fast).toHaveAttribute('aria-expanded', 'false');
  // The (i) is the hint that it can be asked, and it is decoration: the
  // button already says in words what it opens.
  await expect(page.locator('[data-liturgy] .fast-info')).toHaveText('i');
  await expect(page.locator('[data-liturgy] .fast-info')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.fast-bubble')).toHaveCount(0);

  await fast.click();
  const bubble = page.locator('.fast-bubble');
  await expect(bubble).toBeVisible();
  await expect(fast).toHaveAttribute('aria-expanded', 'true');
  // This day's allowance, and only this day's.
  await expect(bubble.locator('.fast-allows')).toHaveText('Meat, dairy and eggs are set aside; oil and wine are permitted.');
  await expect(bubble).not.toContainText('Strict Fasting');
  await expect(bubble).not.toContainText('Fish');
  await expect(bubble.locator('.fast-levels')).toHaveCount(0);
  // The calendar's own note, quoted untranslated and tagged for a screen
  // reader, with the page it was read from cited.
  await expect(bubble.locator('.fast-note')).toHaveText('Успенский пост; разрешается пища с растительным маслом');
  await expect(bubble.locator('.fast-note')).toHaveAttribute('lang', 'ru');
  await expect(bubble).toContainText('days.pravoslavie.ru');

  // A bubble, not a dialogue: no `<dialog>`, so nothing paints a backdrop and
  // the page behind stays lit and readable. This is the author's own
  // complaint — "the background doesn't go white as it currently does" — and
  // the reason the modal went.
  await expect(page.locator('dialog')).toHaveCount(0);
  const lit = await page.evaluate(() => {
    const h1 = document.querySelector('h1').getBoundingClientRect();
    const over = document.elementFromPoint(h1.left + 4, h1.top + h1.height / 2);
    return over?.closest('h1') !== null;
  });
  expect(lit, 'the day is still reachable behind the bubble').toBe(true);

  await page.keyboard.press('Escape');
  await expect(page.locator('.fast-bubble')).toHaveCount(0);
  await expect(fast).toHaveAttribute('aria-expanded', 'false');
});

test('the fast bubble goes when the reader moves on', async ({ page }) => {
  // Author, 2026-08-25 evening: it "pops into view and out of view when
  // scrolling or clicking elsewhere". Three ways out, because a bubble that
  // has to be dismissed on its own terms is a dialogue again.
  await ready(page, { church: 'russian' });
  await page.goto('/calendar/2026-08-23', { waitUntil: 'networkidle' });
  const fast = page.locator('[data-liturgy] .fast');

  // A press somewhere else on the page.
  await fast.click();
  await expect(page.locator('.fast-bubble')).toBeVisible();
  await page.locator('h1').click();
  await expect(page.locator('.fast-bubble')).toHaveCount(0);

  // A scroll.
  await fast.click();
  await expect(page.locator('.fast-bubble')).toBeVisible();
  await page.mouse.wheel(0, 240);
  await expect(page.locator('.fast-bubble')).toHaveCount(0);

  // And the control itself, which is a toggle.
  await fast.click();
  await expect(page.locator('.fast-bubble')).toBeVisible();
  await fast.click();
  await expect(page.locator('.fast-bubble')).toHaveCount(0);
});

test('a day whose calendar named no allowance is strict, and quotes nothing back', async ({ page }) => {
  /*
   * **This test's premise was reversed on the evening of 2026-08-26 and it is
   * kept as the heir rather than retired**, because half of what it pins is
   * unchanged. It used to be called *a day whose calendar named no allowance
   * says that much and stops*, and it asserted the honest silence: 25 August
   * in the Serbian calendar is the Dormition Fast, pravoslavno.rs printed
   * «Пост (означен у календару)» beside it — which says *that* it is a fast
   * and not what it allows — so the line said "Fast" with no grade and the
   * bubble said what every fast sets aside and refused to guess the rest.
   *
   * The author's instruction ('"Fast - Friday" becomes "Strict Fasting"')
   * fills that silence, in the strict direction, and DESIGN.md §5b carries
   * the reversal in place. What did *not* change, and is the reason this test
   * still earns its name: the note is still not quoted back. A grade the site
   * defaulted to was not read out of «Пост», and the bubble prints a
   * quotation only where the quotation says more than the label above it.
   */
  await ready(page, { church: 'serbian' });
  await page.goto('/calendar/2026-08-25', { waitUntil: 'networkidle' });
  const fast = page.locator('[data-liturgy] .fast');
  await expect(fast).toHaveAttribute('data-grade', 'strict');
  await expect(page.locator('[data-liturgy] .fast')).toHaveText(/^Strict Fasting/);
  await expect(page.locator('[data-liturgy] .occasion-chip')).toHaveText('the Dormition Fast');
  await fast.click();
  const bubble = page.locator('.fast-bubble');
  await expect(bubble.locator('.fast-allows')).toHaveText(
    'Vegan; set aside meat, animal products, cooking oils and alcohol.',
  );
  /*
   * And the quotation is gone with it, while the citation stays (author, same
   * instruction, about the Beheading in the Romanian calendar: "remove the
   * italic 'Post' above the hyperlink from doxologia.ro, just keep the
   * hyperlink"). «пост (as marked on the month calendar)» tells a reader who
   * has just read "Fast - the Dormition Fast" that the day is a fast. The
   * note is printed when a grade was read out of it — exactly when it says
   * more than the label — and the source line stands either way, because the
   * day's record came from that page whether or not its words bear repeating.
   *
   * That condition had to be rewritten when the strict default landed: it was
   * `note && grade`, and every fast day has a grade now, so it would have
   * started quoting the very notes it exists to suppress. It asks whether the
   * grade was read *out of* the note instead.
   */
  await expect(bubble.locator('.fast-note')).toHaveCount(0);
  await expect(bubble.locator('.fast-source')).toContainText('pravoslavno.rs');
});

test('a fast-free day says so, and quotes nothing it was not given', async ({ page }) => {
  // The other side: a day with no fast opens the same bubble and prints no
  // quotation at all, because for that day nobody printed one. A heading over
  // an empty quotation would be the furniture DESIGN.md 5b refuses.
  await ready(page, { church: 'russian' });
  await page.goto('/calendar/2026-09-01', { waitUntil: 'networkidle' });
  await page.locator('[data-liturgy] .fast').click();
  const bubble = page.locator('.fast-bubble');
  // "Not a fast. Nothing is set aside, including on a Wednesday or Friday."
  // until 2026-08-26: the author cut it to the half that is about today.
  await expect(bubble.locator('.fast-allows')).toHaveText('Nothing is set aside.');
  await expect(bubble.locator('.fast-note')).toHaveCount(0);
  await expect(bubble.locator('.fast-source')).toHaveCount(0);
});

test('the fast and its bubble are in the reader own language', async ({ browser }) => {
  /*
   * Author, 2026-08-25 evening: "the fasting for the day and its pop-up
   * explanation should be in the selected language." The modal had no pack
   * entry at all until then — it was English whatever the header said, which
   * is what the instruction is about.
   *
   * What stays untranslated is the quotation, tagged with the language it is
   * in. That is not an omission: it is the church's own printed words, and
   * this corpus quotes rather than paraphrases.
   */
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await searchMode(page);
  await page.addInitScript(() =>
    localStorage.setItem('gos-settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('gos-settings') ?? '{}'), church: 'russian', language: 'ru' })),
  );
  await page.goto('/calendar/2026-08-24', { waitUntil: 'networkidle' });
  // «Успенский пост; сухоядение» → the xerophagy grade, in Russian, and the
  // label its type shares with `no-oil` since 2026-08-26.
  await expect(page.locator('[data-liturgy] .fast')).toHaveText(/^Строгий пост/);
  await expect(page.locator('[data-liturgy] .occasion-chip')).toHaveText('Успенский пост');
  await page.locator('[data-liturgy] .fast').click();
  const bubble = page.locator('.fast-bubble');
  await expect(bubble.locator('.fast-allows')).toHaveText(
    'Растительная пища; отлагаются мясо, животные продукты, растительное масло и алкоголь.',
  );
  await expect(bubble.locator('.fast-note')).toHaveAttribute('lang', 'ru');
  await ctx.close();
});

test('under reduced motion the bubble does not pop, it is simply there', async ({ browser }) => {
  // Removed, not shortened (DESIGN.md §6): no scale, no fade, no wait.
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await searchMode(page);
  await ready(page, { church: 'russian' });
  await page.goto('/calendar/2026-08-23', { waitUntil: 'networkidle' });
  await page.locator('[data-liturgy] .fast').click();
  const at = await page.evaluate(() => {
    const el = document.querySelector('.fast-bubble');
    const cs = getComputedStyle(el);
    return { opacity: +cs.opacity, transform: cs.transform, transition: cs.transitionDuration };
  });
  expect(at.opacity).toBe(1);
  expect(at.transform === 'none' || at.transform === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true);
  expect(at.transition).toMatch(/^0s/);
  // And it goes the same way it came.
  await page.keyboard.press('Escape');
  await expect(page.locator('.fast-bubble')).toHaveCount(0);
  await ctx.close();
});

test('the day hero opens its life on a wide screen, and not on a narrow one', async ({ page }) => {
  // Author, 2026-08-25: "because there is space on the left of the saint card
  // under their name, add a preview of their Life section". The same first
  // paragraph the Index's Detailed rows show, from the same helper, so the
  // two can never disagree about where a life begins.
  await ready(page, { church: 'russian' });
  await page.goto('/calendar/2026-09-01', { waitUntil: 'networkidle' });
  const lede = page.locator('[data-hero-lede]');
  await expect(lede).toContainText('Gerasim, Pitirim and Jonah were bishops of Great Perm');
  const shown = await lede.evaluate((el) => ({
    display: getComputedStyle(el).display,
    wide: innerWidth >= 760,
  }));
  // Wide it fills the column the name and dates leave empty; narrow the hero
  // stacks and there is no spare column, so the box is not drawn at all.
  expect(shown.display === 'none').toBe(!shown.wide);
});

test('a reading opens a Bible in the reader own language', async ({ browser }) => {
  /*
   * Author, 2026-08-25, naming a site per language. Three of the four were
   * opened and read before being written down; the fourth was refused.
   * eBiblia.ro, which the author asked for, is a JavaScript application whose
   * own navigation is javascript:app.* calls and which exposes no addressable
   * passage URL - so Romanian goes to Bible Gateway's Cornilescu, which opens
   * the passage, and the refusal is recorded in lib/bible.js for the author
   * to overrule.
   *
   * The reference itself is printed in the reader's language too - the book
   * names are a closed set of sixteen - while the data keeps the English it
   * was transcribed with, because a reference is a key as much as a text.
   */
  for (const [language, church, book, href] of [
    ['ru', 'russian', '1 Коринфянам 15:1-11', /biblegateway\.com.*version=RUSV/],
    ['ro', 'romanian', '1 Corinteni 15:1-11', /biblegateway\.com.*version=RMNN/],
    ['el', 'greek', 'Φιλιππησίους 2:5-11', /greekbible\.com\/philippians\/2\//],
    ['sr', 'serbian', '1. Коринћанима 15:1-11', /wordproject\.org\/bibles\/sr\/46\/15\.htm/],
  ]) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
  await searchMode(page);
    await page.addInitScript(
      (a) => localStorage.setItem('gos-settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('gos-settings') ?? '{}'), church: a.c, language: a.l })),
      { l: language, c: church },
    );
    await page.goto('/calendar/2026-08-23', { waitUntil: 'networkidle' });
    const first = page.locator('.readings li').first();
    await expect(first, language).toContainText(book);
    expect(await first.locator('a').getAttribute('href'), language).toMatch(href);
    await ctx.close();
  }
});

test('the reading labels are the reader language, keeping the calendar own qualifier', async ({ browser }) => {
  // The data carries each church's own label - "Epistle (Prophet)",
  // "Apostol" - and it is the *kind* that translates: the bracketed qualifier
  // names which commemoration the reading belongs to and is a quotation, so
  // it is passed through exactly as the calendar printed it.
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await searchMode(page);
  await page.addInitScript(() =>
    localStorage.setItem('gos-settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('gos-settings') ?? '{}'), church: 'russian', language: 'ro' })),
  );
  await page.goto('/calendar/2026-08-23', { waitUntil: 'networkidle' });
  await expect(page.locator('.readings .reading-label').first()).toHaveText('Apostol');
  await expect(page.locator('.readings-source')).toContainText('Cornilescu');
  await ctx.close();
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
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  const strip = page.locator('.week-strip');
  const box = await strip.boundingBox();
  const y = box.y + box.height / 2;
  const at = () => strip.evaluate((el) => el.scrollLeft);

  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  for (let i = 1; i <= 6; i += 1) await page.mouse.move(box.x + box.width / 2 - i * 25, y);
  await page.mouse.up();
  const released = await at();

  await page.waitForTimeout(150);
  const coasting = await at();
  expect(coasting).toBeGreaterThan(released + 20);

  await page.waitForTimeout(1500);
  const rested = await at();
  expect(rested).toBeGreaterThan(coasting);
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
  await expect(page.locator('h1')).toHaveText(/28 Aug 2026/);
});

test('under reduced motion a throw does not coast', async ({ browser }) => {
  // Removed, not shortened: the weight is an animation and goes; the settle
  // aligns without a glide, and after it nothing moves at all.
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await searchMode(page);
  await ready(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  const strip = page.locator('.week-strip');
  const box = await strip.boundingBox();
  const y = box.y + box.height / 2;

  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  for (let i = 1; i <= 6; i += 1) await page.mouse.move(box.x + box.width / 2 - i * 25, y);
  await page.mouse.up();
  await page.waitForTimeout(100);
  const early = await strip.evaluate((el) => el.scrollLeft);
  await page.waitForTimeout(400);
  const late = await strip.evaluate((el) => el.scrollLeft);
  expect(late).toBe(early);
  await ctx.close();
});

test('the hymns carry no note about their own tongue', async ({ page }) => {
  /*
   * Two tests stood here from 2026-08-24 to 2026-08-25. Amendment 37 put a
   * line under the Hymns heading — "In the church's own tongue, as the source
   * prints it; no translation is recorded." — shown exactly when the site's
   * language was not the hymns' language, because the author had reported the
   * Russian hymns showing under an English chrome and the honest answer was
   * that the corpus holds no English hymn texts by decision.
   *
   * The author removed the line the next morning ("don't print it. Remove
   * it").
   *
   * *The half of it about translation has since been reversed by the author,
   * and this test is corrected in place rather than left standing* (2026-08-26
   * and the Orloff pass after it): "when you select English as the language,
   * on any calendar, it should be in English." So the corpus now carries a
   * published English rendering beside a hymn wherever a source it may copy
   * prints one, and the reader reading English gets it. 11 September's
   * troparion is the Forerunner's, which Orloff's General Menaion of 1899
   * prints, so it is the case in point.
   *
   * What survives unchanged is the note itself: it is gone in every language.
   * And what is pinned beside it is the shape of the reversal — English gets
   * the English *where one exists*, everyone else gets the source's own text,
   * and a hymn with no published rendering (the kontakion below it) stays in
   * Slavonic even for an English reader.
   */
  await ready(page);
  await page.goto('/calendar/2026-09-11', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-hymns] .hymn-own')).toHaveCount(0);
  await expect(page.locator('[data-hymns] .hymn-text[lang="en"]').first())
    .toContainText('The memory of a righteous one');
  // the kontakion has no published English and is still the Slavonic
  await expect(page.locator('[data-hymns] .hymn-text[lang="cu"]').first())
    .toContainText('Предтечево славное усекновение');

  await page.locator('#lang-open').click();
  await page.locator('#lang-panel [data-language="ru"]').click();
  await expect(page.locator('[data-hymns] .hymn-own')).toHaveCount(0);
  await expect(page.locator('[data-hymns] .hymn-text[lang="en"]')).toHaveCount(0);
  await expect(page.locator('[data-hymns] .hymn-text[lang="cu"]').first())
    .toContainText('Память праведнаго');
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
  // Its own width, because the instruction was about the desktop rail and
  // both of the suite's projects are Desktop Chrome — one merely narrow.
  // Below 560 px the peek is deliberately 24 px: there the rail is scrolled
  // rather than read across, and a phone's seven days need the width more
  // than its neighbours need showing.
  await page.setViewportSize({ width: 1280, height: 900 });
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
   * 25 August 2026 is inside the Dormition Fast in the Russian calendar, and
   * carries no feast. Both facts are in the day button's accessible name too:
   * a dot says nothing to a screen reader, and colour says nothing to a reader
   * who cannot separate hues.
   */
  await ready(page);
  await page.goto('/calendar/2026-08-25', { waitUntil: 'networkidle' });
  await expect(page.locator('.density')).toHaveCount(0);
  await expect(page.locator('.week-strip i')).toHaveCount(0);
  await expect(page.locator('.week-strip [data-iso="2026-08-25"]')).toHaveAttribute(
    'aria-label',
    /^Tuesday, 25 August 2026 - \d+ commemorations - a fast$/,
  );
  const today = page.locator('.week-strip [data-iso="2026-08-25"]');
  await expect(today.locator('.mark-fast')).toHaveCount(1);
  await expect(today.locator('.mark-feast')).toHaveCount(0);
  // The marks are aria-hidden: what they say is said in words on the button.
  await expect(today.locator('.day-marks')).toHaveAttribute('aria-hidden', 'true');

  // A fast-free day carries none at all, which is what makes a run of them
  // legible. 20 September is the one: 23 August is a Sunday and still inside
  // the Dormition Fast, which the Julian calendar runs to the civil 27th — the
  // exact difference this site exists to show, and a reminder that "Sunday"
  // is not a synonym for "no fast".
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

test("a register row is the register's own, tighter than the Index's and with no mark", async ({ page }) => {
  /*
   * Author, 2026-08-27: "for saints under 'Also Commemorated' on the Daily
   * page, don't do it in the exact same row style anymore, pack them more
   * tightly" — and, in the same message, "on all row cards, remove the
   * bookmark entirely".
   *
   * This was the test that the mark held the row's trailing edge on a phone
   * (author, 2026-08-25 evening: "the row card for St Bartholomew on mobile
   * pushes the bookmark to the next line instead of remaining pinned to the
   * right side as it should be"). That fault was inherited rather than
   * written — the register had borrowed the Index's row wholesale at
   * Amendment 38 — and the borrowing is what has now been undone. The same
   * day, saint and width are kept so the two can be read against each other.
   */
  await page.setViewportSize({ width: 360, height: 780 });
  await ready(page, { church: 'greek' });
  await page.goto('/calendar/2026-08-25', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const row = page.locator('.reg-card', { hasText: 'Bartholomew' }).first();
  await expect(row).toBeVisible();
  // Not the Index's row any more, and carrying none of its parts.
  await expect(row).not.toHaveClass(/index-card/);
  await expect(row.locator('.bookmark')).toHaveCount(0);
  await expect(row.locator('.index-media, .index-name, .index-dates')).toHaveCount(0);

  const m = await row.evaluate((li) => ({
    card: li.getBoundingClientRect(),
    name: li.querySelector('.reg-name').getBoundingClientRect(),
    thumb: li.querySelector('.reg-thumb').getBoundingClientRect(),
  }));
  // Square, and trailing the name rather than standing before it.
  expect(Math.round(m.thumb.width)).toBe(Math.round(m.thumb.height));
  expect(m.thumb.left).toBeGreaterThanOrEqual(m.name.right - 1);
  expect(m.card.right - m.thumb.right).toBeLessThan(8);
  // Tighter than the row it used to be, which is 83 px since the same
  // afternoon. This is the whole of "pack them more tightly" as a number.
  expect(m.card.height).toBeLessThan(66);
});

test('a note that only says "a fast" is not quoted back at the reader', async ({ page }) => {
  /*
   * Author, 2026-08-26, about the Beheading of the Forerunner in the Romanian
   * calendar: "remove the italic 'Post' above the hyperlink from doxologia.ro,
   * just keep the hyperlink."
   *
   * The quotation earns its place by saying something the line above does not.
   * „Post" tells a reader who has just read "Fast - the Beheading of the
   * Forerunner", in their own language and in larger type, that the day is a
   * fast. So the note is printed when a grade was read *out of it* — exactly
   * when it carries more than the label — and the citation stands either way,
   * because the day's record came from that page whether or not its words
   * bear repeating.
   */
  await ready(page, { church: 'romanian' });
  await page.goto('/calendar/2026-08-29', { waitUntil: 'networkidle' });
  const fast = page.locator('[data-liturgy] .fast');
  // `strict` is the default a silent calendar falls to, not something read
  // out of „Post" — which is exactly why the note below is still not quoted.
  await expect(fast).toHaveAttribute('data-grade', 'strict');
  await fast.click();
  const bubble = page.locator('.fast-bubble');
  await expect(bubble.locator('.fast-allows')).toHaveText(
    'Vegan; set aside meat, animal products, cooking oils and alcohol.',
  );
  await expect(bubble.locator('.fast-note')).toHaveCount(0);
  await expect(bubble).not.toContainText('Post');
  // The hyperlink, which is the half the author kept.
  await expect(bubble.locator('.fast-source a')).toHaveAttribute('href', /doxologia\.ro/);

});

test('a note that says more than the label is still quoted', async ({ page }) => {
  // The other side of the same rule: «Успенский пост; сухоядение» is where
  // the day's grade was read from, so it is printed under it — a claim this
  // site makes always shows the words it was taken from.
  await ready(page, { church: 'russian' });
  await page.goto('/calendar/2026-08-24', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-liturgy] .fast')).toHaveAttribute('data-grade', 'xerophagy');
  await page.locator('[data-liturgy] .fast').click();
  await expect(page.locator('.fast-bubble .fast-note')).toHaveText('Успенский пост; сухоядение');
  await expect(page.locator('.fast-bubble .fast-source a')).toHaveAttribute('href', /pravoslavie\.ru/);
});

test('an early date says which era it is in, and a late one does not', async ({ page }) => {
  /*
   * Author, 2026-08-26: "add AD back to the dates so it's more obvious for
   * stuff like 'Reposed 105' what that means" — reversing Amendment 39's "BC
   * only, no AD".
   *
   * A rule rather than a blanket: marked below 1000, where a three-digit
   * number reads as a quantity as easily as a year, and left alone above it,
   * because 1937 says what it is. And appended only to a display that *ends*
   * in the figure — "under Licinius AD" is not English.
   */
  await ready(page, { church: 'russian' });
  await page.goto('/calendar/2026-08-25', { waitUntil: 'networkidle' });
  await expect(page.locator('.hero-dates')).toHaveText('Reposed 305–306 AD');
  const dates = page.locator('.reg-card .reg-sub');
  await expect(dates.filter({ hasText: 'Reposed 3rd C. AD' }).first()).toBeVisible();
  // Four figures carry their own era.
  await expect(dates.filter({ hasText: 'Reposed 1937' }).first()).toBeVisible();
  await expect(dates.filter({ hasText: '1937 AD' })).toHaveCount(0);
});

test('the corpus dates a saint its own sources date, and says Lived where they only place him', async ({ page }) => {
  /*
   * Author, 2026-08-26: "Saints like Natalia and Adrian of Nicodemus are dated
   * around 4th C, 305-311, as their synaxarion says. So say that instead of
   * Undated. And scan the whole corpus for any others because I've told you
   * this already and there are still saints with this error."
   *
   * The first audit (Amendment 39) read the lives only and found nine, which
   * is why the author kept finding more. The datings are mostly not in the
   * prose: they are in the *calendar entry lines* transcribed into each
   * attestation's source — «Мчч. Адриана и Наталии … (305-311)» — and in the
   * reigns and councils the lives name. Widening the audit to those wells
   * found 43 more; four proposals were read and thrown out, because a
   * parenthesis in a life is not always about the saint (Phanourios was
   * proposed 1355–1369, the tenure of the metropolitan who found his icon).
   */
  await ready(page, { church: 'russian' });
  await page.goto('/calendar/2026-09-08', { waitUntil: 'networkidle' });
  // Adrian is the day's hero and Natalia is in the register beneath him, so
  // the pair is read off both places at once. Both said Undated until
  // 2026-08-26, and both are dated by the same sentence of the same life:
  // "lived at Nicomedia in Bithynia under Maximian (305-311)".
  await expect(page.locator('.hero-name')).toContainText('Adrian of Nicomedia');
  await expect(page.locator('.hero-dates')).toHaveText('Reposed under Maximian');
  const natalia = page.locator('.reg-card', { hasText: 'Natalia of Nicomedia' }).first();
  await expect(natalia.locator('.reg-sub')).toHaveText('Reposed under Maximian');
  await expect(page.locator('.hero')).not.toContainText('Undated');

  /*
   * And the other half of the instruction — "or at least centuries for every
   * saint". A life that places a man without bounding him has always had
   * somewhere to go in the schema, `floruit`, and nothing printed it, so
   * Agathocles of Corone read Undated while his life said he sat at the Third
   * Ecumenical Council. `formatLifespan` falls through to it now.
   */
  await page.goto('/saints/agathocles-of-corone', { waitUntil: 'networkidle' });
  await expect(page.locator('.saint-facts, .facts').first()).toContainText('Lived at the Council of Ephesus');
});

test('the hero keeps its foot close under the dates', async ({ page }) => {
  // Author, 2026-08-26: "move the bottom edge of the card higher so there
  // isn't as big a margin between the dating and the bottom of the card." On a
  // hero with no icon that was 65 px — space-3 under the dates, a 36 px
  // control, and the panel's own 16 px. The dates sit straight on the control
  // now and the panel keeps half its foot.
  await ready(page, { church: 'russian' });
  await page.goto('/calendar/2026-08-25', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const foot = await page.evaluate(() => {
    const hero = document.querySelector('.hero').getBoundingClientRect();
    const dates = document.querySelector('.hero-dates').getBoundingClientRect();
    return hero.bottom - dates.bottom;
  });
  expect(foot).toBeLessThan(50);
});

test('a hero with a picture has no frame to have a foot', async ({ page }) => {
  /*
   * The trim was scoped to the heroes that needed it: where there is an icon
   * the image column is the taller side and its own bottom set the panel's
   * depth, so taking the foot off there would have crowded the picture.
   * **Superseded in the round after Amendment 45**, when the author said it a
   * second time — "The margin on the bottom of the Daily saint card is still
   * too much" — and, in the same breath, took the frame away: "Let the main saint sit directly on
   * the ground with the icon as the strongest element."
   *
   * With no panel there is no foot to scope, on either kind of hero, and the
   * question this test asked no longer has two answers. What it guards now is
   * that the frame is really gone — no border, no field — because a hero that
   * quietly regained either would be the boxes coming back.
   */
  await ready(page, { church: 'greek' });
  await page.goto('/calendar/2026-08-25', { waitUntil: 'networkidle' });
  await expect(page.locator('.hero.has-media')).toBeVisible();
  const dress = await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('.hero'));
    return {
      padded: parseFloat(cs.paddingBottom),
      border: parseFloat(cs.borderBottomWidth),
      background: cs.backgroundColor,
    };
  });
  expect(dress.padded).toBe(0);
  expect(dress.border).toBe(0);
  expect(dress.background).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
});

test('the paschal cycle line is in the reader own language', async ({ browser }) => {
  /*
   * Author, 2026-08-26: "make sure you print '13th week after Pentecost' in
   * the chosen language as well." It was composed as an English sentence
   * inside lib/liturgy.js — the seam Amendment 36 recorded and HANDOFF has
   * carried as open since — and that module is the one place that knows the
   * paschal reckoning and the one place that must not know about words.
   *
   * `cycleOf` returns which day of the cycle it is; ui/cycle-name.js gives it
   * words. Holy Week and Bright Week are tables of seven rather than
   * templates, because Slavonic, Serbian and Greek decline the adjective for
   * the weekday's gender — «Великая Среда» beside «Великий Четверг».
   */
  for (const [language, church, expected] of [
    ['en', 'russian', '13th week after Pentecost'],
    ['ru', 'russian', '13-я седмица по Пятидесятнице'],
    ['ro', 'romanian', 'Săptămâna a 13-a după Rusalii'],
    ['el', 'greek', '13η εβδομάδα μετά την Πεντηκοστή'],
    ['sr', 'serbian', '13. седмица по Духовима'],
  ]) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
  await searchMode(page);
    await page.addInitScript(
      (a) => localStorage.setItem('gos-settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('gos-settings') ?? '{}'), church: a.c, language: a.l })),
      { c: church, l: language },
    );
    await page.goto('/calendar/2026-08-25', { waitUntil: 'networkidle' });
    await expect(page.locator('[data-liturgy]'), language).toContainText(expected);
    await ctx.close();
  }
});

test('an English reader is given a published English hymn where one exists', async ({ browser }) => {
  /*
   * Author, 2026-08-26: "when you select English as the language, on any
   * calendar, it should be in English." Asked, and answered with the source
   * the author named — Isabel Hapgood's 1906 *Service Book*, long in the
   * public domain, which is the whole reason it can be copied here when the
   * OCA's modern translations cannot: an English translation is a living
   * author's work, and permission for one is the author's decision, not a
   * build's.
   *
   * Nothing is translated by this build. The hymn carries an `english` block
   * that is somebody else's published rendering of that same hymn, with its
   * own citation, and `lang` follows the text so a screen reader is never
   * handed English in a Greek voice.
   */
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await searchMode(page);
  await page.addInitScript(() =>
    localStorage.setItem('gos-settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('gos-settings') ?? '{}'), church: 'greek', language: 'en' })),
  );
  await page.goto('/calendar/2026-09-14', { waitUntil: 'networkidle' });
  const cross = page.locator('[data-hymns] .hymn', { hasText: 'O Lord, save thy people' });
  await expect(cross).toHaveCount(1);
  await expect(cross.locator('.hymn-text')).toHaveAttribute('lang', 'en');
  // Her own forms and her own 1906 petitions, kept because it is a quotation:
  // the modern Greek beside it reads "unto the faithful" where she has "unto
  // our Sovereign, N." A reader meeting that is reading a 1906 book.
  await expect(cross.locator('.hymn-text')).toContainText('unto our Sovereign, N.');
  await expect(cross.locator('.hymn-source')).toContainText('Hapgood');
  await expect(cross.locator('.hymn-source a')).toHaveAttribute('href', /archive\.org/);
  await ctx.close();
});

test('a hymn with no published English stays in its own tongue', async ({ browser }) => {
  /*
   * The size of what Hapgood gives, said plainly rather than left to be
   * discovered. Her book is the fixed services, the eight tones and the Great
   * Feasts; it holds **no** menaion of per-saint troparia, so of the 132
   * saints here with hymns it names none. Five texts, three feasts, twelve
   * hymn objects. Everywhere else an English reader still meets the original,
   * and that is the state of the corpus rather than a gap in the code.
   */
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await searchMode(page);
  await page.addInitScript(() =>
    localStorage.setItem('gos-settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('gos-settings') ?? '{}'), church: 'greek', language: 'en' })),
  );
  await page.goto('/calendar/2026-09-14', { waitUntil: 'networkidle' });
  const gerasimus = page.locator('[data-hymns] .hymn', { hasText: 'Γεράσιμος' });
  await expect(gerasimus.first().locator('.hymn-text')).toHaveAttribute('lang', 'el');
  await expect(gerasimus.first().locator('.hymn-source')).toContainText('saint.gr');
  await ctx.close();
});

test('a Greek reader keeps the Greek, translation or no translation', async ({ browser }) => {
  // The other side: the English rendering is for the English reader and
  // nobody else. A Greek reader on the Greek calendar meets the hymn her
  // church actually sings, cited to the page it was read from.
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await searchMode(page);
  await page.addInitScript(() =>
    localStorage.setItem('gos-settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('gos-settings') ?? '{}'), church: 'greek', language: 'el' })),
  );
  await page.goto('/calendar/2026-09-14', { waitUntil: 'networkidle' });
  const cross = page.locator('[data-hymns] .hymn', { hasText: 'Σῶσον Κύριε τὸν λαόν σου' });
  await expect(cross).toHaveCount(1);
  await expect(cross.locator('.hymn-text')).toHaveAttribute('lang', 'el');
  await expect(cross.locator('.hymn-source')).toContainText('saint.gr');
  await expect(page.locator('[data-hymns]')).not.toContainText('Hapgood');
  await ctx.close();
});

test('the day the site used to run dry on is lit, and reads off the calendar that printed it', async ({ page }) => {
  /*
   * Amendment 44 (author: "Do the Romanian and Russian day records for the
   * next 6 months"). The records stopped on 19 September, so 20 September was
   * the day the Daily page went dark. It does not now.
   *
   * days.pravoslavie.ru prints three sets for that day — the Sunday before the
   * Exaltation, the ordinary set, and the martyr's — and each keeps the label
   * the calendar gave it. The second of them is «Ряд. (под зачало)», a label
   * with brackets *inside* it, and that is here on purpose: the pattern that
   * lifts a qualifier off a label used to refuse a nested bracket, find no
   * qualifier at all, and leave the kind untranslated.
   */
  //
  // The reader here is Russian *because* of that: in English the broken path
  // renders an identical string, since the untranslated fallback is the word
  // "Epistle" itself. The defect is only visible where the kind changes.
  await ready(page, { church: 'russian', language: 'ru' });
  await page.goto('/calendar/2026-09-20', { waitUntil: 'networkidle' });
  const labels = page.locator('[data-readings] .readings .reading-label');
  await expect(labels.first()).toHaveText('Апостол (Недели пред Воздвижением)');
  // the kind is the reader's, the qualifier is the calendar's, brackets and all
  await expect(labels.nth(2)).toHaveText('Апостол (Ряд. (под зачало))');
  await expect(page.locator('[data-readings] .readings a').nth(2)).toHaveText('2 Коринфянам 6:1-10');
  await expect(page.locator('[data-readings] .readings-source a'))
    .toHaveAttribute('href', /days\.pravoslavie\.ru\/Days\/20260907\.html/);

  // and the Greek is still and deliberately dark on that day, which is the
  // author's instruction of 2026-08-26 holding: its saints are folders, its
  // days are not.
  await openChooser(page);
  await page.locator('#church-panel [data-church="greek"]').click();
  await page.goto('/calendar/2026-09-20', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-readings]')).toHaveCount(0);
});

test('a great feast months past the corpus keeps its readings, its fast and its hymns', async ({ page }) => {
  /*
   * 14 October 2026 is 1 October Julian, the Protection of the Theotokos, and
   * the Russian calendar gives it the Typikon's highest sign. Its page prints
   *
   *   День постный.   Разрешается рыба.
   *   Лит. - Богородицы: Евр., 320 зач., IX, 1-7.  Лк., 54 зач., X, 38-42; XI, 27-28.
   *
   * — which is two claims about the fast, not one: the day is a fast *and*
   * fish is allowed on it. Both are quoted, and `lib/fast-grade.js` reads the
   * allowance off the second.
   */
  await ready(page, { church: 'russian', language: 'ru' });
  await page.goto('/calendar/2026-10-14', { waitUntil: 'networkidle' });
  // the reference in the reader's own language, the qualifier as printed
  await expect(page.locator('[data-readings] .readings .reading-label').first())
    .toHaveText('Апостол (Богородицы)');
  await expect(page.locator('[data-readings] .readings a').first()).toHaveText('Евреям 9:1-7');
  await expect(page.locator('[data-readings] .readings a').nth(1)).toHaveText('Луки 10:38-42; 11:27-28');
  // the fast the calendar printed, resolved to what it allows
  await expect(page.locator('[data-liturgy]')).toContainText('Разрешаются масло, вино и рыба');
  // a great feast sings, and every hymn says where it was read
  const hymns = page.locator('[data-hymns]:not([hidden]) [data-feast-hymns] .hymn-text');
  expect(await hymns.count()).toBeGreaterThan(4);
  await expect(hymns.first()).toHaveAttribute('lang', 'cu');
  await expect(page.locator('[data-hymns] .hymn-source a').first())
    .toHaveAttribute('href', /days\.pravoslavie\.ru/);
});

test('a day whose calendar is recorded but whose saints are not says which half is missing', async ({ page }) => {
  /*
   * `emptyDayNote` told two silences apart: the corpus having nothing, and
   * this church having nothing while another has something. Amendment 44 made
   * a third — the day records now run to January and the saints stop on 19
   * September — and the old wording called such a day "an empty day" directly
   * above its own readings and a dozen hymns, which said the opposite of what
   * the page showed.
   */
  await ready(page, { church: 'russian', language: 'en' });
  await page.goto('/calendar/2026-10-14', { waitUntil: 'networkidle' });
  const note = page.locator('.empty-day p');
  await expect(note).toHaveCount(1);
  await expect(note).toContainText('Its saints are not folders yet');
  await expect(note).not.toContainText('No commemorations are recorded');
  // and the readings it is standing above are really there
  await expect(page.locator('[data-readings] .readings li')).toHaveCount(2);

  // Past every source's horizon the day really is empty, and says so plainly.
  await page.goto('/calendar/2027-03-01', { waitUntil: 'networkidle' });
  await expect(page.locator('.empty-day p')).toContainText('No commemorations are recorded');
  await expect(page.locator('[data-readings]')).toHaveCount(0);
});

test('the Romanian months carry Romanian book names, and stop where doxologia stops', async ({ page }) => {
  /*
   * doxologia.ro's URL carries no year and the site keeps one calendar year,
   * so `/1-ianuarie` serves 1 January *2026* — a date already past. Every page
   * asked for in January 2027 was refused for printing the wrong year, and the
   * Romanian records end on 31 December. The Russian keeps going to 13 January
   * 2027, because its URL carries the Julian date and the Julian year has not
   * turned over yet.
   */
  await ready(page, { church: 'romanian', language: 'ro' });
  await page.goto('/calendar/2026-12-31', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-readings] .readings li').first()).toBeVisible();
  await expect(page.locator('[data-readings] .readings-source a'))
    .toHaveAttribute('href', /doxologia\.ro\/31-decembrie/);

  // 1 January is past what doxologia serves: nothing recorded, nothing borrowed
  await page.goto('/calendar/2027-01-01', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-readings]')).toHaveCount(0);

  // but the Russian is still printing that day
  await openChooser(page);
  await page.locator('#church-panel [data-church="russian"]').click();
  await page.goto('/calendar/2027-01-01', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-readings] .readings li').first()).toBeVisible();
  // and one day past its own end, nothing
  await page.goto('/calendar/2027-01-14', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-readings]')).toHaveCount(0);
});

test('the first day past the runway has its saints, and the eight the corpus already held say so', async ({ page }) => {
  /*
   * Author, 2026-08-26: "Cant you make them folders?" — of the twenty-one
   * people the Russian calendar names on 7 September (the civil 20 September),
   * thirteen were new and **eight were already in the corpus**, built earlier
   * from the Greek and Romanian calendars for their 7 September on the new
   * calendar, which is a different civil day.
   *
   * That is the finding worth pinning. Matching on names found none of the
   * eight and produced false pairs instead — «Святитель Иоанн, архиепископ
   * Новгородский» matched a new martyr of 1937 — while asking which folders
   * already keep a feast on 7 September found all of them. Three would have
   * been caught by a slug collision; five would have entered the corpus as
   * silent duplicates.
   */
  await ready(page, { church: 'russian', language: 'en' });
  await page.goto('/calendar/2026-09-20', { waitUntil: 'networkidle' });

  // the day is no longer bare of saints, and no longer says it is
  await expect(page.locator('.empty-day')).toHaveCount(0);
  await expect(page.locator('.hero-name')).toContainText('Sozon of Pompeiopolis');
  const also = page.locator('[data-also] a, .also-list a, .day-list a');
  const listed = await page.locator('main').textContent();
  // one new folder and one the corpus already held, on the same day
  expect(listed).toContain('Macarius of Kanev');
  // The see is on the subtext line rather than in the name since 2026-08-27,
  // so this looks for it where it now is.
  expect(listed).toContain('Archbishop of Novgorod');

  // A saint the corpus already held now carries the Russian calendar's own
  // testimony, where the row used to say the page had not been read.
  await page.goto('/saints/john-of-novgorod', { waitUntil: 'networkidle' });
  await expect(page.locator('main')).toContainText('7 September (Julian)');
  await expect(page.locator('main')).toContainText('days.pravoslavie.ru');
  await expect(page.locator('main')).not.toContainText('Not checked: days.pravoslavie.ru');

  // A new folder carries a life that is a paraphrase with its source named.
  await page.goto('/saints/gregory-averin', { waitUntil: 'networkidle' });
  await expect(page.locator('h1')).toContainText('Gregory Averin');
  await expect(page.locator('main')).toContainText('Temirtau');
  await expect(page.locator('main')).toContainText('read 26 August 2026');

  // And the Romanian calendar's own 20 September fills in a row on a folder
  // built from the Greek at Amendment 43.
  // behind the disclosure, because the reader here keeps the Russian calendar
  // and the other three are folded away
  await page.goto('/saints/hilarion-the-new-monk-martyr-of-crete', { waitUntil: 'networkidle' });
  await page.locator('[data-reveal]').click();
  await expect(page.locator('main')).toContainText('doxologia.ro');
  await expect(page.locator('main')).not.toContainText('Not checked: doxologia.ro');
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
  await expect(page.locator('.cal-date')).toContainText('14 Dec 2026');

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

test('the day says whose name day it is, and links only the names one saint bears', async ({ page }) => {
  /*
   * Author, 2026-08-26: "add name days". In Orthodox practice a name day is the
   * feast of the saint whose name you bear, and in Greece, Romania, Russia and
   * Serbia alike it is the day that is actually kept.
   *
   * Nothing here is looked up or invented: every name is the first word of a
   * commemoration already printed above it, cut at the first comma or bracket
   * (lib/name-days.js). 20 September in the Russian calendar is the case worth
   * pinning, because it holds both halves — nineteen names from twenty-one
   * saints, two of them shared.
   */
  await ready(page, { church: 'russian' });
  await page.goto('/calendar/2026-09-20', { waitUntil: 'networkidle' });

  const names = page.locator('[data-namedays] .name-day');
  await expect(page.locator('[data-namedays] .register-heading')).toHaveText('Name days');
  // The hero counts: he is one of the day's saints, not a separate thing.
  await expect(names.filter({ hasText: 'Sozon' })).toHaveCount(1);
  await expect(names.filter({ hasText: 'Serapion' })).toHaveCount(1);

  // A name one saint bears opens that saint.
  await expect(page.locator('[data-namedays] a[data-prefetch="serapion-of-pskov"]')).toHaveCount(1);
  // A name two of the day's saints share is text, because the site cannot tell
  // which is meant: two Eugenes on this day, and two Macariuses.
  const eugene = names.filter({ hasText: 'Eugene' });
  await expect(eugene).toHaveCount(1);
  expect(await eugene.evaluate((el) => el.tagName)).toBe('SPAN');
  // Once each, however many saints bear it.
  await expect(names.filter({ hasText: 'Macarius' })).toHaveCount(1);

  // A collective gives nobody a name day. 26 August in the Greek calendar keeps
  // a company whose English name is the company: it must not contribute "The".
  await expect(names.filter({ hasText: /^The$/ })).toHaveCount(0);

  // In the reader's own language, where the corpus recorded the form — a name
  // day is the reader's name, and «Иоанн» is not "John" to whoever bears it.
  await page.goto('/?lang', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const key = 'gos-settings';
    localStorage.setItem(key, JSON.stringify({ ...JSON.parse(localStorage.getItem(key)), language: 'ru' }));
  });
  await page.goto('/calendar/2026-09-20', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-namedays] .register-heading')).toHaveText('Именины');
  await expect(page.locator('[data-namedays]')).toContainText('Иоанн');
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
  // 2. And so it clears the fast and feast dots, which begin below it.
  //    Backed out, the ring's bottom is 116.1 against a marks top of 115.1.
  expect(geom.marksTop).not.toBeNull();
  expect(geom.ringBottom).toBeLessThanOrEqual(geom.marksTop);
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

test('name days say "today" only on the day that is today', async ({ page }) => {
  /*
   * Author, 2026-08-26 evening: replace "Name Days" with "Today's Name Days".
   * Taken at its word on the day it is true and refused on every other,
   * because the Daily page is a day browser - the rail reaches 121 days
   * either side of today - and the heading would be a plain falsehood on all
   * but one of them. The rest of this panel says "this day" for the same
   * reason.
   */
  await ready(page, { church: 'russian' });
  await page.goto('/', { waitUntil: 'networkidle' });
  const heading = page.locator('[data-namedays] .register-heading');
  // Some days hold no names at all - the corpus is thin past 20 September and
  // the section does not render then. Only assert where it is there.
  if (await heading.count()) await expect(heading).toHaveText("Today's name days");

  // 20 September is not today and says so. (It is also the day the older
  // name-days test uses, for the same reason: it is the richest one.)
  await page.goto('/calendar/2026-09-20', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-namedays] .register-heading')).toHaveText('Name days');
});

test('the fast chip names the type of fast, and the bubble still quotes the calendar', async ({ page }) => {
  /*
   * Author, 2026-08-26 evening: "For the fasting labels, change to show the
   * types directly: Strict Fasting (tool tip shows Vegan; set aside meat,
   * animal products, cooking oils and alcohol), 'Oil and Wine Allowed' (tool
   * tip explains meat dairy and eggs set aside), 'Oil, Wine and Fish
   * Allowed', or 'No Fast'."
   *
   * The load-bearing part of this test is the *merge*. Two grades of the
   * closed vocabulary now share one label - `xerophagy` (uncooked) and
   * `no-oil` (cooked, still without oil) are both Strict Fasting - and the
   * thing to protect is that the merge is a change of headline and not a loss
   * of what the calendar printed. So: two days that resolve to the two
   * different grades, both reading Strict Fasting on the chip, and each still
   * quoting its own different Russian note in the bubble underneath.
   */
  await ready(page, { church: 'russian' });

  // 25 August 2026: days.pravoslavie.ru printed cooked-without-oil for the
  // day, which resolves to the `no-oil` grade.
  await page.goto('/calendar/2026-08-25', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-liturgy] .fast')).toHaveText(/^Strict Fasting/);
  await expect(page.locator('[data-liturgy] .occasion-chip')).toHaveText('the Dormition Fast');
  await expect(page.locator('[data-liturgy] .fast')).toHaveAttribute('data-grade', 'no-oil');
  await page.locator('[data-liturgy] .fast').click();
  await expect(page.locator('.fast-bubble .fast-note')).toContainText('без масла');

  // 24 August 2026: the same calendar printed xerophagy for the day. The same
  // chip and the same allowance line, a different quotation under them -
  // which is the whole point of the pair.
  await page.goto('/calendar/2026-08-24', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-liturgy] .fast')).toContainText('Strict Fasting');
  await expect(page.locator('[data-liturgy] .fast')).toHaveAttribute('data-grade', 'xerophagy');
  await page.locator('[data-liturgy] .fast').click();
  await expect(page.locator('.fast-bubble .fast-note')).toContainText('ухояд');

  // The other three of the four the author named.
  await page.goto('/calendar/2026-08-23', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-liturgy] .fast')).toContainText('Oil and Wine Allowed');
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-liturgy] .fast')).toContainText('Oil, Wine and Fish Allowed');
  await page.goto('/calendar/2026-08-30', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-liturgy] .fast')).toContainText('No Fast');
});

test('every calendar names its type of fast, not only the one that prints allowances', async ({ page }) => {
  /*
   * Author, 2026-08-26 evening, after seeing the first build of the labels:
   * "Why are these changes applied only to the Russian calendar?" … "This
   * change hasnt been applied to the Romanian calendar for instance, and I
   * dont see any blue labels in the Romanian calendar as i do in the Russian
   * calendar."
   *
   * Both halves were true and both had the same root. Only
   * days.pravoslavie.ru prints an allowance beside its days: of the 144 day
   * records, 67 Romanian, 59 Greek and 62 Serbian fast days carry **no
   * fasting note at all**. A grade read strictly off a printed note therefore
   * existed almost nowhere but the Russian, and every other calendar fell
   * through to a bare "Fast - Friday".
   *
   * So a fast with no printed allowance is Strict Fasting by default now
   * (lib/fast-grade.js argues the direction; DESIGN.md §5b records the
   * reversal), and this test is the one that would catch the default being
   * quietly dropped again — it walks the three calendars that have no notes
   * to read.
   */
  await ready(page, { church: 'romanian' });
  // 28 August 2026 is an ordinary Friday in the Revised Julian calendar, and
  // it is the author's own example: "Fast - Friday" becomes "Strict Fasting",
  // with the reason gone because the reason was the weekday.
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-liturgy] .fast')).toHaveText(/^Strict Fasting/);
  await expect(page.locator('[data-liturgy] .fast')).not.toContainText('Friday');
  await expect(page.locator('[data-liturgy] .fast')).toHaveAttribute('data-grade', 'strict');
  // A reason that says where in the year the reader is *is* kept: the drop is
  // for the weekday alone.
  await page.goto('/calendar/2026-11-18', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-liturgy] .fast')).toHaveText(/^Strict Fasting/);
  await expect(page.locator('[data-liturgy] .occasion-chip')).toHaveText('the Nativity Fast');

  // The Greek and the Serbian, whose calendars are equally silent.
  for (const church of ['greek', 'serbian']) {
    await openChooser(page);
    await page.locator(`#church-panel [data-church="${church}"]`).click();
    await page.goto('/calendar/2026-09-04', { waitUntil: 'networkidle' });
    await expect(page.locator('[data-liturgy] .fast'), church).toHaveText(/^Strict Fasting/);
  }

  /*
   * And the blue. The chip's colour follows the *grade* now rather than
   * liturgy.js's `kind`, because the two disagreed on thirteen Russian days:
   * 14 October's note reads «Разрешается рыба», so the words said fish was
   * permitted while the chip was painted in the rubric of a strict day. Its
   * `kind` is still `fast` — that is a different fact and `data-fast` still
   * carries it — and it is teal now because its grade is fish.
   */
  await openChooser(page);
  await page.locator('#church-panel [data-church="russian"]').click();
  await page.goto('/calendar/2026-10-14', { waitUntil: 'networkidle' });
  const fish = page.locator('[data-liturgy] .fast');
  await expect(fish).toContainText('Oil, Wine and Fish Allowed');
  await expect(fish).toHaveAttribute('data-fast', 'fast');
  await expect(fish).toHaveAttribute('data-grade', 'fish');
  const paint = await fish.evaluate((el) => {
    const probe = document.createElement('span');
    document.body.append(probe);
    const root = getComputedStyle(document.documentElement);
    probe.style.color = root.getPropertyValue('--fast-fish').trim();
    const teal = getComputedStyle(probe).color;
    probe.style.color = root.getPropertyValue('--fast-strict').trim();
    const strict = getComputedStyle(probe).color;
    probe.remove();
    return { colour: getComputedStyle(el).color, teal, strict };
  });
  expect(paint.colour).toBe(paint.teal);
  expect(paint.colour).not.toBe(paint.strict);
});

test('a Great Feast is named beside the fast, in gold that never carries the words', async ({ page }) => {
  /*
   * Author, 2026-08-26 evening: "Add a label if its a Feast Day as well with
   * the name of the Feast." lib/liturgy.js says which of the nine fixed Great
   * Feasts the day is - from the same table its own fish rule reads, in the
   * church's own calendar - and the words come from the reader's pack.
   *
   * Two things are pinned besides the words. **The calendar, not the civil
   * date**: 28 August 2026 is the Dormition for a Russian reader and an
   * ordinary Friday for a Greek one, and the chip has to follow the reader.
   * And **the colour**: gold is what this site marks a finding with, but
   * --gold on gesso is 2.78:1, so it may carry the chip's edge and its tint
   * and never its text. That is the trap the peek fade (2.1:1) and the cycle
   * line's opacity (4.17:1) both fell into before it, and the third time it
   * gets an assertion of its own.
   */
  await ready(page, { church: 'russian' });
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  const chip = page.locator('[data-liturgy] .feast-chip');
  await expect(chip).toHaveText('Great Feast - The Dormition of the Theotokos');
  await expect(chip).toHaveAttribute('data-feast', 'dormition');

  const paint = await chip.evaluate((el) => {
    const cs = getComputedStyle(el);
    const root = getComputedStyle(document.documentElement);
    const probe = document.createElement('span');
    document.body.append(probe);
    const resolve = (value) => {
      probe.style.color = value;
      return getComputedStyle(probe).color;
    };
    const goldRgb = resolve(root.getPropertyValue('--gold').trim());
    const inkRgb = resolve(root.getPropertyValue('--ink').trim());
    probe.remove();
    /*
     * The border is a `color-mix`, and Chrome computes it as
     * `color(srgb 0.66 0.51 0.21 / 0.6)` — no decimal-integer channels to
     * read, and a translucent colour besides. Compositing it over white on a
     * 1x1 canvas gives the number that actually reaches the reader's eye,
     * which is the thing under test anyway.
     */
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    const ctx = c.getContext('2d');
    const overWhite = (value) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1, 1);
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return { r, g, b, warmth: r - b };
    };
    return {
      color: cs.color,
      goldRgb,
      inkRgb,
      borderWidth: parseFloat(cs.borderTopWidth),
      border: overWhite(cs.borderTopColor),
      rule: overWhite(root.getPropertyValue('--rule').trim()),
    };
  });
  // The words are ink, never gold.
  expect(paint.color).toBe(paint.inkRgb);
  expect(paint.color).not.toBe(paint.goldRgb);
  // And the edge is gold - a mix of it against the page, so not the token
  // exactly, but unmistakably warm where the site's ordinary hairline is not.
  // Measured 2026-08-26: the edge composites to r-b of 68, --rule to 17.
  expect(paint.borderWidth).toBeGreaterThan(0);
  expect(paint.border.warmth).toBeGreaterThan(40);
  expect(paint.border.warmth).toBeGreaterThan(paint.rule.warmth * 2);

  // The same civil day, the other calendar: no feast, because the Greek keeps
  // the Dormition on the 15th.
  await openChooser(page);
  await page.locator('#church-panel [data-church="greek"]').click();
  await expect(page.locator('[data-liturgy] .feast-chip')).toHaveCount(0);
  await page.goto('/calendar/2026-08-15', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-liturgy] .feast-chip')).toHaveText(
    'Great Feast - The Dormition of the Theotokos',
  );

  // An ordinary day wears none at all.
  await page.goto('/calendar/2026-08-26', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-liturgy] .feast-chip')).toHaveCount(0);
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
  await page.goto('/calendar/2026-11-18', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const read = async (iso) =>
    page.evaluate((day) => {
      const dot = document.querySelector(`.week-strip button[data-iso="${day}"] .day-mark:not(.mark-feast)`);
      const cell = document.querySelector(`.month-grid button[data-iso="${day}"]`);
      return {
        dot: dot ? getComputedStyle(dot).backgroundColor : null,
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

test('the fast chip is the type alone, and the occasion stands in a chip of its own', async ({ page }) => {
  /*
   * Author, 2026-08-26 evening, three instructions in one breath:
   *
   *   1. "Don't mention the event for fasting in the fasting label, e.g. the
   *      Beheading of the Forerunner, or Dormition."
   *   2. "Mention The Beheading of the Forerunner in a second separate bubble
   *      tag like the feast tag but different colour."
   *   3. "Remove the explanation of the fasting under the bubble tag."
   *
   * So the line went from one chip carrying three things — "Strict Fasting -
   * the Beheading of the Forerunner" over "Vegan; set aside meat, animal
   * products…" — to two chips carrying one each, and the explanation back
   * behind the (i) where it lived before the morning of the same day.
   *
   * 29 August is the worked case in the instruction itself: the Beheading is
   * a strict fast whatever the weekday, in every one of the four calendars
   * that keeps it on the civil 29th.
   */
  await ready(page, { church: 'romanian' });
  await page.goto('/calendar/2026-08-29', { waitUntil: 'networkidle' });

  const fast = page.locator('[data-liturgy] .fast');
  const occasion = page.locator('[data-liturgy] .occasion-chip');

  // 1. The label is the type and stops. `toHaveText` and not `toContainText`,
  //    because what is under test is the absence of the trailing occasion.
  await expect(fast).toHaveText(/^Strict Fasting/);
  await expect(fast).not.toContainText('Beheading');
  // 2. Which stands beside it instead.
  await expect(occasion).toHaveText('the Beheading of the Forerunner');
  // 3. And nothing explains the fast under either of them.
  await expect(page.locator('[data-liturgy] .fast-allowance')).toHaveCount(0);
  await expect(page.locator('[data-liturgy]')).not.toContainText('Vegan');

  /*
   * The explanation is not lost, which is the half of instruction 3 that
   * would be easy to take too far: the chip is still a control and the bubble
   * it opens is still the sentence's home.
   */
  await fast.click();
  await expect(page.locator('.fast-bubble .fast-allows')).toHaveText(
    'Vegan; set aside meat, animal products, cooking oils and alcohol.',
  );

  /*
   * "Like the feast tag but different colour." Both chips are edge-and-tint
   * with ink words — --gold on gesso is 2.78:1 and dark-mode --rubric is
   * 4.20:1, so neither hue may carry text — and the two edges are far enough
   * apart to be told at a glance. Composited over the page, because both are
   * `color-mix` and compute to `color(srgb …/ a)` with no integer channels.
   */
  /*
   * 19 August in the Russian calendar is the one shape that shows both chips
   * at once: the Transfiguration (a Great Feast, so the gold chip) whose fast
   * reason is "the Transfiguration, in the Dormition Fast" — which names the
   * *fast* the feast sits inside and so says more than the gold chip does,
   * and is therefore one of the reasons deliberately left un-suppressed.
   */
  // Driven through the header's own chooser, not a second `ready()`: the
  // helper seeds only where nothing is stored (Amendments 19 and 23), so
  // calling it again mid-test changes nothing and the page stays Romanian.
  await openChooser(page);
  await page.locator('#church-panel [data-church="russian"]').click();
  await page.goto('/calendar/2026-08-19', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-liturgy] .feast-chip')).toHaveCount(1);
  await expect(page.locator('[data-liturgy] .occasion-chip')).toHaveCount(1);
  const paint = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    const ctx = c.getContext('2d');
    const page_ = getComputedStyle(document.body).backgroundColor;
    const over = (value) => {
      ctx.fillStyle = page_;
      ctx.fillRect(0, 0, 1, 1);
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return { r, g, b };
    };
    const el = (sel) => document.querySelector(sel);
    const probe = document.createElement('span');
    document.body.append(probe);
    probe.style.color = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
    const ink = getComputedStyle(probe).color;
    probe.remove();
    return {
      feastEdge: over(getComputedStyle(el('.feast-chip')).borderTopColor),
      occasionEdge: over(getComputedStyle(el('.occasion-chip')).borderTopColor),
      feastText: getComputedStyle(el('.feast-chip')).color,
      occasionText: getComputedStyle(el('.occasion-chip')).color,
      ink,
    };
  });
  // Both wear the page's ink, neither its own hue.
  expect(paint.feastText).toBe(paint.ink);
  expect(paint.occasionText).toBe(paint.ink);
  // Gold leans green of red; rubric leans hard red. A swap of the two tokens
  // fails on the green channel alone.
  expect(paint.feastEdge.g).toBeGreaterThan(paint.occasionEdge.g);
  expect(paint.occasionEdge.r - paint.occasionEdge.g).toBeGreaterThan(
    paint.feastEdge.r - paint.feastEdge.g,
  );

  /*
   * And the occasion is suppressed where the feast chip says it better. This
   * is the Dormition in the Greek calendar: liturgy.js's reason for the fish
   * is "a Great Feast on a Saturday", which beside "Great Feast - The
   * Dormition of the Theotokos" would be the same sentence twice.
   */
  await openChooser(page);
  await page.locator('#church-panel [data-church="greek"]').click();
  await page.goto('/calendar/2026-08-15', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-liturgy] .feast-chip')).toHaveText(
    'Great Feast - The Dormition of the Theotokos',
  );
  await expect(page.locator('[data-liturgy] .occasion-chip')).toHaveCount(0);
  // This is the author's own second example — "e.g. the Beheading of the
  // Forerunner, or Dormition" — and it took two passes: the word came out of
  // the fast label and reappeared one chip to the right, which is the same
  // complaint moved rather than answered.
  await expect(page.locator('[data-liturgy]')).not.toContainText('No Fast - ');
});

test('the Daily page carries no bookmark, at any width and whatever the name does', async ({ page }) => {
  /*
   * Author, 2026-08-27: "remove the bookmark on the main saint card … If
   * people want to bookmark they can go to the profile page itself. From my
   * own experience a 'watch later' style bookmarking system is never actually
   * revisited. Thus the bookmark does not need to be such a prominent feature
   * especially on first view." The register's marks went in the same message,
   * with the row cards.
   *
   * **This test is the inverse of the one it replaces, deliberately kept at
   * the same three widths and the same two days.** That one pinned the hero's
   * mark to the register's column of marks, to the pixel, and was the third
   * answer to a mark that had wandered: `.name-line` held its *width* against
   * a long name and did nothing about a short one, so it sat a fixed 8 px
   * after whatever the name happened to end at — at 1280, "St Peter,
   * Metropolitan of Moscow" landed it on the column and "St Sozon of
   * Pompeiopolis" left it 5.7 px short. Two of those days are these two.
   *
   * The shapes still matter with the mark gone, which is why they are still
   * here: a short name and a wrapping one are the two cases where a leftover
   * reservation would show, and it would show as the name stopping short of
   * the column rather than as a mark in the wrong place.
   */
  await ready(page, { church: 'russian' });

  for (const width of [1280, 900, 360]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [day, shape] of [
      ['2026-09-20', 'a short name that leaves the line half empty'],
      ['2026-09-06', 'a name long enough to wrap to a second line'],
    ]) {
      const where = `${width}px, ${shape}`;
      await page.goto(`/calendar/${day}`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);

      // Nowhere on the page: not on the hero, not on a register row, and not
      // in the `.name-line` wrapper, which is gone with the thing it held.
      expect(await page.locator('.hero .bookmark').count(), where).toBe(0);
      expect(await page.locator('.register .bookmark').count(), where).toBe(0);
      expect(await page.locator('.hero .name-line').count(), where).toBe(0);

      const m = await page.evaluate(() => {
        const h2 = document.querySelector('.hero-name');
        const body = document.querySelector('.hero-body');
        return {
          nameWidth: h2.getBoundingClientRect().width,
          bodyWidth: body.getBoundingClientRect().width,
          rows: document.querySelectorAll('.register .reg-card').length,
        };
      });
      // The name's box is the whole column. A reserved slot is 32 px of mark
      // and a gap missing from exactly this number, which is what makes the
      // measurement worth taking rather than only counting elements.
      expect(m.bodyWidth - m.nameWidth, where).toBeLessThan(1);
      // The register is on the page in both shapes, so the count above is a
      // real zero rather than an empty list agreeing with itself.
      expect(m.rows, where).toBeGreaterThan(0);
    }
  }
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

test('a Great Feast is what the day is, and the page stops saying there is nothing', async ({ page }) => {
  /*
   * Found in review, 2026-08-27: 28 August 2026 in the Russian calendar
   * printed the Dormition's gold chip, the fish it allows on a Friday, the
   * feast's own readings and the feast's own troparion — and, in the middle of
   * them, "Nothing in the Russian calendar today."
   *
   * The defect was structural rather than a wording slip. The Daily page's
   * subject is a saint *folder*, so a day whose subject is a feast had no
   * subject at all and fell through to the silence; 28 August has no folder
   * for any saint of it, which is a true sentence about the corpus and a false
   * one about the day. The feast is read in the church's own calendar, exactly
   * as the chip above reads it, so the Russian keeps the Dormition on the
   * civil 28 August and the Greek on the 15th, and both are checked here.
   */
  await ready(page, { church: 'russian', language: 'en' });
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });

  const note = page.locator('.empty-day');
  await expect(note).toContainText('Today is The Dormition of the Theotokos in the Russian calendar');
  await expect(note).not.toContainText('Nothing in the Russian calendar today');
  // What is missing is the folders, and the note now says so in those words.
  await expect(note).toContainText('No saint of the day is a folder here yet');
  // The pointer half of the old sentence survives the split intact.
  await expect(note).toContainText('other churches’ calendars');
  // And it was standing in the middle of the feast's own record all along.
  await expect(page.locator('[data-hymns] .hymn')).not.toHaveCount(0);
  await expect(page.locator('.feast-chip')).toContainText('Dormition');

  /*
   * Past the end of the day records the readings clause comes off, because
   * there are none below to be the feast's own — which is the same defect one
   * horizon further on.
   */
  await page.goto('/calendar/2027-04-07', { waitUntil: 'networkidle' });
  await expect(note).toContainText('Today is The Annunciation in the Russian calendar');
  await expect(note).not.toContainText('readings and hymns below');

  // The Greek keeps the same feast on the civil 15 August, and reads the same.
  await page.evaluate(() => {
    const key = 'gos-settings';
    const now = JSON.parse(localStorage.getItem(key) ?? '{}');
    localStorage.setItem(key, JSON.stringify({ ...now, church: 'greek' }));
  });
  await page.goto('/calendar/2026-08-15', { waitUntil: 'networkidle' });
  await expect(note).toContainText('Today is The Dormition of the Theotokos in the Greek calendar');

  // A day that is not a feast and has no folders still reads exactly as it did.
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await expect(page.locator('.empty-day')).toHaveCount(0);
});

test('the fast bubble cites a source for the day, and credits it only for what it printed', async ({ page }) => {
  /*
   * Found in review, 2026-08-27: the Greek chip for 28 August 2026 reads
   * Strict Fasting, and under it stood "As printed by saint.gr". saint.gr
   * printed «Νηστεία» — *a fast*, with no grade — and *Strict* is this site's
   * default for an ungraded fast day, taken on the evening of 2026-08-26. The
   * citation was putting our reading in their mouth.
   *
   * The two jobs split. Where the calendar's own words are quoted, the
   * sentence still labels that quotation. Where they are not, it cites the
   * page as the source of the day's record, which is what it is.
   */
  await ready(page, { church: 'greek', language: 'en' });
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await page.locator('[data-liturgy] .fast').click();
  await expect(page.locator('.fast-bubble')).toBeVisible();
  await expect(page.locator('.fast-bubble .fast-source')).toContainText('The day’s record comes from');
  await expect(page.locator('.fast-bubble .fast-source')).not.toContainText('As printed by');
  // Nothing is quoted, which is the condition the citation now follows.
  await expect(page.locator('.fast-bubble .fast-note')).toHaveCount(0);

  /*
   * And the Russian bubble, which quotes its calendar's actual words, is
   * unchanged: 25 August 2026 prints «без масла» and "As printed by" is a
   * label on that quotation.
   */
  await page.evaluate(() => {
    const key = 'gos-settings';
    const now = JSON.parse(localStorage.getItem(key) ?? '{}');
    localStorage.setItem(key, JSON.stringify({ ...now, church: 'russian' }));
  });
  await page.goto('/calendar/2026-08-25', { waitUntil: 'networkidle' });
  await page.locator('[data-liturgy] .fast').click();
  await expect(page.locator('.fast-bubble .fast-note')).toContainText('без масла');
  await expect(page.locator('.fast-bubble .fast-source')).toContainText('As printed by');
});

test('the day records say where they stop, and the corpus says how far it reaches', async ({ page }) => {
  /*
   * Found in review, 2026-08-27: past 13 January 2027 the readings and the
   * hymns simply stopped. The computed lines — the fast, the tone, the week —
   * hold for any date, so a day in March 2027 printed all three and looked
   * whole, with the half that is read off a calendar silently absent.
   *
   * The second half of this is the sentence that had already gone stale. The
   * note for a day whose calendar is recorded but whose saints are not folders
   * yet said "the corpus reaches 19 September", as a literal, and had been
   * wrong for a fortnight. It is read off the index now.
   */
  await ready(page, { church: 'russian', language: 'en' });

  await page.goto('/calendar/2027-03-10', { waitUntil: 'networkidle' });
  const beyond = page.locator('.beyond-records');
  await expect(beyond).toContainText('recorded as far as 13 January 2027');
  await expect(beyond).toContainText('computed');

  // Inside the records nothing of the sort is said, because there the
  // readings are simply there.
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await expect(page.locator('.beyond-records')).toHaveCount(0);
  await expect(page.locator('[data-readings] a').first()).toBeVisible();

  // And the reach is a date read off the corpus, not a literal: the Russian
  // calendar's folders run to 20 September 2026 (7 September, Julian).
  await page.goto('/calendar/2026-09-25', { waitUntil: 'networkidle' });
  await expect(page.locator('.empty-day')).toContainText('the corpus reaches 20 September 2026');
  await expect(page.locator('.empty-day')).not.toContainText('19 September so far');
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
   * moves — the fast chip's grade is read out of a day's own note, so a panel
   * painted before they landed would have shown an ungraded chip and then
   * changed it. The packs are fetched one language at a time.
   *
   * This asserts the shape rather than a byte count, which would go stale the
   * first time a saint was added.
   */
  const scripts = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(r.url());
  });

  await ready(page, { church: 'russian', language: 'ru' });
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
  // before the panel is painted, so the chip carries its grade at first sight.
  await expect(page.locator('[data-readings] a').first()).toBeVisible();
  await expect(page.locator('[data-liturgy] .fast')).toHaveAttribute('data-grade', /.+/);
  await expect(page.locator('#church-open')).toHaveText('Русская');

  /*
   * Opening the chooser starts the other three, so that pressing one is
   * instant rather than a fetch the reader watches. Deliberately not awaited
   * by the panel itself, which must appear at once.
   */
  await page.locator('#lang-open').click();
  await expect.poll(() => new Set(scripts.map((u) => (u.match(/\/assets\/(ru|ro|el|sr)-/) ?? [])[1]).filter(Boolean)).size).toBe(4);
});

test('a returning Daily page lands where it was left, though it grows after it renders', async ({ page }) => {
  /*
   * Author, 2026-08-27, after the first fix shipped: "switching from All
   * Saints to the Daily page still transitions at the top and jumps to the
   * bottom."
   *
   * The test above pins the same claim for the Index and *passed the whole
   * time this was broken*, which is why this one exists. The Index is its
   * final height the moment it renders; the Daily page is not. Measured: at
   * the instant the transition callback runs it is **2097 px**, so a scroll to
   * 1500 clamps to 1297 — and ten milliseconds later `fillSaintHymns` lands
   * the hero saint's hymns and it is **2605 px**. The old correction could
   * only fire after that growth, which is after the fade had finished, so the
   * reader watched the fade at the wrong place and then the page jump.
   *
   * So the assertion is the position *at the transition's own `ready`* — the
   * moment the new-state snapshot has been taken and before the animation
   * runs, which is exactly what the reader's fade will show — and it is taken
   * on the page that grows.
   */
  const press = (sel) => page.evaluate((q) => document.querySelector(q).click(), sel);

  await ready(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/', { waitUntil: 'networkidle' });
  // Deep enough that a clamp against the pre-hymns height cannot reach it.
  await page.evaluate(() => window.scrollTo(0, 1500));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(1500);

  await press('nav.site-nav a[href$="/saints"]');
  await expect(page.locator('.index-controls')).toBeVisible();

  await page.evaluate(() => {
    const orig = document.startViewTransition.bind(document);
    window.__readyScrollY = undefined;
    document.startViewTransition = (cb) => {
      const t = orig(cb);
      t.ready.then(() => {
        window.__readyScrollY = window.scrollY;
      });
      return t;
    };
  });
  await press('nav.site-nav a[data-nav-daily]');

  // What the fade shows, not what the page settles to.
  await expect.poll(() => page.evaluate(() => window.__readyScrollY)).toBe(1500);
  // And it stays there once the hymns have landed and the floor is released.
  await expect(page.locator('[data-hymns]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(1500);
  // The floor is a prop for the arrival, not a permanent change to the page.
  await expect.poll(() => page.evaluate(() => document.getElementById('view').style.minHeight)).toBe('');
});
