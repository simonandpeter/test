import { test, expect } from './fixtures.js';
import {
  EMPTY,
  POPULATED,
  answered,
  dragGrain,
  openChooser,
  phone,
  ready,
  releaseGrain,
  searchMode,
  swipe,
} from './helpers.js';

/**
 * The Daily page, the day itself: the hero, the date line and its chips, the fast and its bubble, the readings, the hymns, the feasts, the two columns and the way into the life.
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
  await expect(page.locator('[data-slot="main"] .register li')).toHaveCount(0);
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
  await phone(page);
  await page.goto(EMPTY, { waitUntil: 'networkidle' });
  await expect(page.locator('.empty-day')).toHaveCount(1);
  await expect(page.locator('.hero')).toHaveCount(0);
  // The chrome stays: an empty day must still offer a way onward. The rail
  // holds far more than seven days (2026-08-24); what matters here is that it
  // is there and populated.
  expect(await page.locator('.week-strip button').count()).toBeGreaterThan(7);
  await expect(page.locator('.week-strip')).toBeVisible();
});


test('the hero image is shown whole up to 1:1.6 on desktop, and a 3:2 band on a phone', async ({ page }) => {
  /*
   * A square from 2026-08-21, a band from 2026-08-26 morning — "Change the
   * daily saint image crop from square to a horizontal rectangle … This is to
   * reduce the height of the card to show more of what's below in the also
   * commemorated section" — both from the evening of the same day, and **the
   * icon's own shape from 2026-09-01**: "don't crop the main saint image on
   * Daily page unless it exceeds an aspect ratio of 1:1.6, that's the maximum
   * height."
   *
   * So the desktop half of this reverses: it asked for a square until then,
   * and the square is now only the fallback for a hero whose card carries no
   * dimensions. What survives untouched is the phone's band — bought to keep
   * the card short enough to show the register under it, where the image is
   * full width and *is* the card's height — and the reason there is a fixed
   * ratio at all: the box is reserved before the image decodes, so nothing
   * reflows on arrival. That is why the shape is computed per saint in
   * `daily/panel.js` from the manifest's own dimensions, and why this test
   * reads those dimensions off the element rather than hard-coding a saint.
   */
  await ready(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const img = page.locator('.hero-media img');
  await expect(img).toBeVisible();

  /** The icon's own shape as the manifest recorded it, and as it was drawn. */
  const shape = async () => {
    const natural = await img.evaluate((el) => ({ w: Number(el.getAttribute('width')), h: Number(el.getAttribute('height')) }));
    const box = await img.boundingBox();
    return { natural: natural.h / natural.w, drawn: box.height / box.width };
  };

  const whole = await shape();
  expect(whole.natural, 'premise: this hero is taller than the cap, so nothing here is uncropped').toBeLessThan(1.6);
  expect(Math.abs(whole.drawn - whole.natural), 'the icon was cropped when it fits inside 1:1.6').toBeLessThan(0.03);

  /*
   * And an icon past the cap is held at it. Lupus the Martyr is 450x1184 —
   * 1:2.63 — and leads 5 September; the premise below is what says so at run
   * time rather than trusting this comment.
   */
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await expect(img).toBeVisible();
  const tall = await shape();
  expect(tall.natural, 'premise: this day’s hero is not tall enough to be cropped').toBeGreaterThan(1.6);
  expect(Math.abs(tall.drawn - 1.6), 'a tall icon was not held to 1:1.6').toBeLessThan(0.03);

  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await expect(img).toBeVisible();

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
  await phone(page);
  await page.goto('/calendar/2026-06-22', { waitUntil: 'networkidle' });
  // By date, not by position: the rail holds 121 days (2026-08-24), so the
  // nth button is no longer the nth of this week.
  const day = (iso) => page.locator(`.week-strip [data-iso="${iso}"]`);

  await day('2026-06-27').click();
  await page.waitForTimeout(60);
  await day('2026-06-28').click();
  await expect(page.locator('h1')).toHaveText(/28 Jun(e)? 2026/);
  await expect(page.locator('[data-slot="main"] .day-panel')).toHaveCount(1);
  await expect(page.locator('.hero-name')).toHaveText('St Augustine of Hippo');
  await expect(page.locator('.empty-day')).toHaveCount(0);

  // And the day after the fast pair is clean too: the orphan used to persist.
  await day('2026-06-24').click();
  await expect(page.locator('h1')).toHaveText(/24 Jun(e)? 2026/);
  await expect(page.locator('[data-slot="main"] .day-panel')).toHaveCount(1);
  await expect(page.locator('.empty-day')).toHaveCount(1);
  await expect(page.locator('.hero')).toHaveCount(0);
});


test('a swipe on the day panel steps a day too, left for tomorrow and right for yesterday', async ({ page }) => {
  /*
   * The thumb's equivalent of the arrow keys above (2026-08-31): a touch
   * swipe left or right on the day's own panel, reusing `onGrainDrag` — the
   * week and month's own gesture primitive — rather than a bespoke listener.
   * `swipe`'s synthetic pointerdown/pointerup with no move in between is a
   * flick, per its own doc comment, which is what a fast real swipe looks
   * like once the browser coalesces its moves.
   */
  await ready(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });

  await swipe(page, '[data-slot="main"]', -80);
  await expect(page.locator('h1')).toHaveText(/29 Aug(ust)? 2026/);
  await swipe(page, '[data-slot="main"]', 80);
  await expect(page.locator('h1')).toHaveText(/28 Aug(ust)? 2026/);

  // Short of the threshold, or mostly vertical, is a scroll or a mistap, not
  // a page turn.
  await swipe(page, '[data-slot="main"]', -20);
  await swipe(page, '[data-slot="main"]', -80, 200);
  await expect(page.locator('h1')).toHaveText(/28 Aug(ust)? 2026/);
});


test('the day panel follows the finger while the swipe is still live', async ({ page }) => {
  /*
   * `swipe` above is a flick — pointerdown then pointerup with nothing in
   * between — so it never touches `wireDaySwipe`'s `move` handler at all.
   * This is the other half: a real drag, sampled mid-gesture (`dragGrain`'s
   * `release: false`) before letting go, which is what proves the panel is
   * actually being dragged rather than only reacting once the finger lifts.
   */
  await ready(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });

  await dragGrain(page, '[data-slot="main"]', -20, { release: false });
  const live = await page.locator('[data-slot="main"] .day-panel').evaluate((el) => getComputedStyle(el).transform);
  expect(live, 'the panel did not move while the finger was still down').not.toBe('none');

  // Short of the threshold: letting go here must not change the day, and the
  // panel must spring back to its own place rather than being left adrift.
  await releaseGrain(page, '[data-slot="main"]', -20);
  await expect(page.locator('h1')).toHaveText(/28 Aug(ust)? 2026/);
  await expect
    .poll(() => page.locator('[data-slot="main"] .day-panel').evaluate((el) => el.style.transform))
    .toBe('');
});


test('a real drag past the threshold changes the day, not only a flick', async ({ page }) => {
  /*
   * The dragged path (`onGrainDrag`'s `dragged: true`) is different code from
   * the flick above — `wireDaySwipe` reads the live `panel` it set in `begin`
   * rather than starting cold — so it needs its own test rather than trusting
   * the flick to stand in for it.
   */
  await ready(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await dragGrain(page, '[data-slot="main"]', -80);
  await expect(page.locator('h1')).toHaveText(/29 Aug(ust)? 2026/);
});


test('changing the calendar changes the day everywhere it is counted', async ({ page }) => {
  // 28 June 2026 is Augustine in the Russian calendar — 15 June Julian — and
  // in no other: the New Calendar churches keep him on the civil 15th. So the
  // one church answers for the whole day, which is what makes this a test of
  // the choice rather than of a coincidence.
  await answered(page);
  await phone(page);
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
   * Wide, the image still has a column of its own and still fills it. The
   * track was a hard 221 px until 2026-09-01, when the author asked for
   * bigger pictures on a bigger card; it is now derived per saint — the
   * smaller of a share of the card and the width at which this icon stands
   * exactly as tall as the card — so what is pinned is that rule rather than
   * a number. Augustine's icon is 422x720, taller than the 1:1.6 ceiling, so
   * it is the case where the card's own height decides the column.
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
      height: document.querySelector('.hero-media').getBoundingClientRect().height,
      card: hero.getBoundingClientRect().height,
    };
  });
  const expected = m.tracks.length === 2 ? m.tracks[0] : m.column;
  expect(Math.abs(m.width - expected)).toBeLessThan(1);
  if (m.tracks.length === 2) {
    /*
     * A tall icon is exactly as tall as the card and no taller — which is the
     * whole of the derivation, and fails in both directions that matter: a
     * column left at a hard width makes it shorter, and a column given the
     * full share of a wide card makes it overrun (662 px of Lupus over a
     * 505 px card was the version that asked for this rule).
     */
    expect(Math.abs(m.height - m.card), 'the picture is not the height of the card it fills').toBeLessThan(2);
  }

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
      leaving: document.querySelectorAll('[data-slot="main"] .day-panel.slot-leaving').length,
      entering: document.querySelectorAll('[data-slot="main"] .day-panel.slot-entering').length,
      panels: document.querySelectorAll('[data-slot="main"] .day-panel').length,
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
    const leaving = document.querySelector('[data-slot="main"] .day-panel.slot-leaving');
    if (!leaving) return null;
    return {
      hidden: leaving.getAttribute('aria-hidden'),
      pointer: leaving.style.pointerEvents,
      reachable: [...leaving.querySelectorAll('a, button')].filter((n) => n.tabIndex !== -1)
        .length,
    };
  });
  expect(marked).toEqual({ hidden: 'true', pointer: 'none', reachable: 0 });
  await expect(page.locator('[data-slot="main"] .day-panel')).toHaveCount(1);
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
  await ready(page, { church: 'russian', reckoning: null });
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
    await page.locator('[data-slot="main"] .register li').first().evaluate((li) => getComputedStyle(li).borderBottomWidth),
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
  await ready(page, { church: 'russian', reckoning: null });
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
  // The office comes off the localised name too, now (2026-09-04,
  // lib/saint-name.js) — "Episcopul Antiohiei" restated what card.office
  // already says, in English, on the line below.
  await expect(page.locator('h1.saint-name')).toHaveText('Sfințitul Mucenic Vavila');
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
    /*
     * **The wrapper, not the heading, since 2026-09-01.** The date shares its
     * line with the Yesterday/Tomorrow steps now, so the h1 is only as wide as
     * its own words and a rule hung off it would stop halfway across the
     * column. The rule moved up to `.cal-head`, which is the box that still has
     * the column's full measure — so this measures that, and the assertions
     * below are unchanged, which is the point: what is being pinned is that the
     * line runs the width of the column it heads, not which element draws it.
     */
    const heading = document.querySelector('.cal-head');
    /*
     * The column the heading actually heads. One page, two arrangements since
     * 2026-09-01: on a phone the day is one column and `.cal-body` is the box
     * around it, and past 1024 px `.cal-body` is `display: contents` — it has
     * no box at all — while the heading sits over the wide left column with
     * the readings beside it. Whichever of the two lays out is the one to
     * measure; asking the dissolved one returns zero and reads as the rule
     * having collapsed.
     */
    const column = [document.querySelector('.day-main'), document.querySelector('.cal-body')].find(
      (el) => el && el.getBoundingClientRect().width > 0,
    );
    const s = getComputedStyle(heading, '::after');
    return {
      headingWidth: heading.getBoundingClientRect().width,
      bodyWidth: column.getBoundingClientRect().width,
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
  await ready(page, { church: 'russian', reckoning: null });
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

  /*
   * A scroll — and the window is shortened first so that there is one to make.
   * Past 1024 px the day's two columns scroll themselves and the page does not,
   * so a wheel over a column with nothing under the fold produces no scroll
   * event and nothing to dismiss on. That is not a defect in the dismissal: it
   * is a day whose left column happens to fit, and it started fitting on
   * 2026-09-01 when *Also commemorated* became a grid of cards half the height
   * of the list it replaced. The height is what the test needs; the width is
   * left alone so the two projects still run this at their own widths.
   */
  const width = page.viewportSize().width;
  await page.setViewportSize({ width, height: 420 });
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
  await ready(page, { church: 'serbian', reckoning: null });
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
  await ready(page, { church: 'russian', reckoning: null });
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
  /*
   * Under the last thing the card carries, which since 2026-09-01 is the way
   * into the life rather than the dates: an imageless hero now ends with
   * "...continue reading", and measuring to the dates counts a control the
   * author asked for as though it were the empty margin they asked to have
   * removed. The claim is unchanged — the card's foot is close under its own
   * contents.
   */
  const foot = await page.evaluate(() => {
    const hero = document.querySelector('.hero').getBoundingClientRect();
    const last = [...document.querySelectorAll('.hero-body > *')]
      .filter((el) => el.offsetParent !== null)
      .map((el) => el.getBoundingClientRect().bottom);
    return hero.bottom - Math.max(...last);
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

/* ---- the 2026-08-26 evening batch: the ring, the name days, the fast
        types and the Great Feasts -------------------------------------- */


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
  await ready(page, { church: 'russian', reckoning: null });

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
  await ready(page, { church: 'russian', reckoning: null });
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
  await ready(page, { church: 'romanian', reckoning: null });
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
  await ready(page, { church: 'russian', language: 'en', reckoning: null });
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

  /*
   * And the reach is a date read off the corpus, not a literal. The literal
   * *here* moves with every day the corpus gains - it is the assertion that
   * the page computes the right answer, and the right answer is a corpus
   * fact - and a church fact: the reach walks the reader's own calendar
   * (entries.js). The 28 September batch put Russian folders on the 28th,
   * and the reach's fortnight gap-tolerance carries the Russian run over
   * the folderless Exaltation, so both calendars read the 28th now.
   */
  // Not the 27th: that is the Exaltation of the Cross, and a Great Feast day
  // prints the feast's own sentence rather than the reach.
  await page.goto('/calendar/2026-09-29', { waitUntil: 'networkidle' });
  await expect(page.locator('.empty-day')).toContainText('the corpus reaches 28 September 2026');
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


test('a returning Daily page lands where it was left, though it grows after it renders', async ({ page }) => {
  /*
   * **At a phone's width, since 2026-09-01.** The desktop Daily page stopped
   * scrolling that day — its two columns each carry their own scrollbar and
   * the page is fixed to the glass (author: "make the left and right columns
   * independently scrollable") — so there is no page scroll to remember there,
   * and `sectionScroll` in main.js remembers the window's. What it restores on
   * a phone is unchanged, and that is what this measures.
   *
   * The desktop case is a real gap rather than a thing this test stopped
   * caring about: a reader returning to the Daily page on a desktop now finds
   * both columns at the top. Restoring a column's own `scrollTop` would mean
   * main.js knowing which element a view scrolls, which is a bigger idea than
   * this change, and is not in it.
   */
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
  /*
   * **A short window, because the page is today's and today may be empty**
   * (2026-08-28). The Daily nav goes to `/`, which is today by definition, so
   * this test cannot pick a day with plenty in it — and the corpus's saints
   * run out before its liturgical records do. The morning the clock reached
   * 28 August the page had readings, hymns and a fast but no saints at all:
   * 1127 px, against the 2605 this was written on. A 400 px window leaves
   * enough of it below the fold to scroll deep into whatever the day holds.
   *
   * 360 wide rather than 1280 since 2026-09-01: past 1024 the page does not
   * scroll at all, its two columns doing it instead, so a claim about where
   * the *page* lands can only be made where the page is the thing that moves.
   */
  await page.setViewportSize({ width: 360, height: 400 });
  await page.goto('/', { waitUntil: 'networkidle' });
  /*
   * Deep enough that a clamp against the pre-hymns height cannot reach it —
   * and **taken from the page rather than written down** (2026-08-27). A
   * literal 1500 is a measurement of one machine's text: this page's height is
   * its hymns and its register wrapping in whatever face the machine resolved,
   * and CI's is not Literata, because a cold runner misses `font-display:
   * optional`'s window and keeps the fallback serif for the life of the page.
   * The runner's Daily page ends at 1399, so `scrollTo(0, 1500)` clamped and
   * the poll waited five seconds for a number the page could not hold. Scroll
   * as deep as asked, keep what the page gave, and require only that it is
   * deep enough for the claim to mean something.
   */
  const deep = await page.evaluate(() => {
    window.scrollTo(0, 1500);
    return Math.round(window.scrollY);
  });
  expect(deep, 'the Daily page is too short for a deep return to be a claim').toBeGreaterThan(300);
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(deep);

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

  /*
   * What the fade shows, not what the page settles to - **up to scroll
   * anchoring's own correction** (2026-08-30). This asserted `toBe(deep)` and
   * went red the day the calendar rolled to 30 August: on that day's page a
   * late arrival lands *above* the reader's position, the browser's scroll
   * anchoring adds the growth to `scrollY` to hold their reading line still,
   * and the fade honestly showed 1520 for a reader who left at 1500 - the
   * same line of text, twenty pixels of new content above it. That is the
   * promise kept, not broken; `toBe` was measuring the number instead of the
   * line. Which day has such an arrival depends on what today's page holds,
   * so this is trap 4 wearing a new coat - found because the suite ran on
   * both sides of midnight.
   *
   * The band is one card's worth. The defect this test exists for was a fade
   * at the top and a 1300 px jump after it; anchoring drift is two orders
   * smaller, and a clamp to a not-yet-grown page would land *short* of deep,
   * which the lower bound still catches.
   */
  await expect
    .poll(() => page.evaluate(() => Math.round(window.__readyScrollY)))
    .toBeGreaterThanOrEqual(deep - 4);
  const shownAt = await page.evaluate(() => Math.round(window.__readyScrollY));
  expect(shownAt - deep, 'the fade landed far from where the reader left').toBeLessThanOrEqual(120);
  /*
   * And it stays where the fade showed it once the hero's own payload has
   * landed. **The lede's `hidden` dropping is the signal, not the hymns'**
   * (2026-09-05): `fillHeroLede` and `fillSaintHymns` read the same
   * `loadDetail` promise, so they land together — but every saint has a life
   * where only some sing a hymn in a given calendar, and `hymnsMarkup` renders
   * `[data-hymns]` hidden and *leaves* it so when today's hero has none. A
   * `toBeVisible` on it here was trap 4 in one more coat: red on 5 September
   * 2026 on the unmodified tree, 5 of 5 runs, with nothing wrong on the page.
   * The lede is hidden below 760 px by CSS, so this reads the attribute the
   * script drops rather than visibility — that is the fact under test.
   */
  await expect.poll(() => page.evaluate(() => document.querySelectorAll('[data-hero-lede]:not([hidden])').length)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(shownAt);
  // The floor is a prop for the arrival, not a permanent change to the page.
  await expect.poll(() => page.evaluate(() => document.getElementById('view').style.minHeight)).toBe('');
});


test('the day leads with a sung saint who has an icon, where the day has one', async ({ page }) => {
  /*
   * Author, 2026-08-28: "Make sure all main saint cards for each day and each
   * calendar has an image in its profile."
   *
   * The hero rule is the author's own, from 2026-08-22: the saint the chosen
   * church *sings for* is the day's principal commemoration and stands as hero
   * before any image does. That is not reversed here — an imaged saint the
   * church does not sing for still does not take the day. What changed is which
   * of the *sung* leads, where before it was the date's hash alone: an icon
   * breaks that tie now.
   *
   * Measured over the days the four calendars cover: 38 of 133 day-and-church
   * combinations led with an imageless hero, and this takes it to 27. The rest
   * are days where nobody the church sings for has a picture, and no ordering
   * can conjure one.
   */
  await ready(page, { church: 'greek' });
  await page.goto('/calendar/2026-08-27', { waitUntil: 'networkidle' });
  const hero = page.locator('.hero').first();
  await expect(hero).toBeVisible();

  const day = await page.evaluate(() => {
    const heroName = document.querySelector('.hero-name')?.textContent?.trim();
    const heroHasIcon = Boolean(document.querySelector('.hero img'));
    // Everyone else the day commemorates, and whether any of them has a picture.
    const others = [...document.querySelectorAll('.reg-card')].map((c) => ({
      name: c.querySelector('.reg-name')?.textContent?.trim(),
      imaged: Boolean(c.querySelector('.reg-thumb img')),
    }));
    return { heroName, heroHasIcon, others };
  });

  // The claim, stated so it cannot pass vacuously: if the hero has no icon,
  // then nobody else on the page has one either — the day simply has none.
  if (!day.heroHasIcon) {
    const spare = day.others.find((o) => o.imaged);
    expect(spare, `${day.heroName} leads with no icon while ${spare?.name} has one`).toBeFalsy();
  } else {
    expect(day.heroName).toBeTruthy();
  }
});

/* ---- the desktop two-column day (2026-09-01) ----------------------------- */


test('the day is two columns on a desktop and one on a phone', async ({ page }) => {
  /*
   * Author, 2026-09-01: "The mobile layout on Daily page is looking great,
   * but the desktop layout needs revision ... we will have 2 columns, a wide
   * column to the left and a narrower column to the right. To the left, we
   * have the main saint of the day, with the also commemorated and name days
   * and continue reading content. On the right column, we have the readings
   * and the hymns."
   *
   * Four claims, and the fourth is the one that costs something: Continue
   * reading is not inside the day panel — the panel is replaced wholesale on
   * every day change and a shelf rebuilt with it would lose its own state —
   * so the shelf and the day are two grids that only line up because they
   * share one template and nothing between them adds padding. That is the
   * part a stray `padding-inline` would break silently, so it is measured
   * here rather than assumed.
   */
  await ready(page);
  // A saint opened is what puts anything on the Continue reading shelf.
  await page.goto('/saints/moses-the-hungarian', { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: 1280, height: 900 });
  /*
   * 5 September rather than `POPULATED`, which carries exactly one
   * commemoration in the calendar these tests keep and so has no register at
   * all — "populated" there means the day's own readings, not a second saint.
   * This day has eleven, which is what gives the left column all three of the
   * blocks the instruction names.
   */
  const CROWDED = '/calendar/2026-09-05';
  await page.goto(CROWDED, { waitUntil: 'networkidle' });

  const boxOf = (sel) => page.locator(sel).boundingBox();
  /*
   * `.cal-main` and `.cal-side`, not the panels inside them: since 2026-09-01
   * the columns are two real boxes — each its own scroll container, each
   * holding its own day panel — because only that lets one move without the
   * other. The panels are what the roll swaps; the columns are the layout.
   */
  const main = await boxOf('.cal-main');
  const side = await boxOf('.cal-side');

  // Side by side, and the left is the wider of the two.
  expect(side.x, 'the readings are not beside the day’s saints').toBeGreaterThan(main.x + main.width - 1);
  expect(main.width, 'the left column is not the wider one').toBeGreaterThan(side.width);
  /*
   * They no longer start on one line, and that is the layout rather than a
   * drift: the picker took the top of the right column on 2026-09-01, so the
   * readings begin under it while the left column starts at the top of the
   * page. What has to be level is the *picker* and the left column.
   */
  const top = await boxOf('.cal-controls');
  expect(Math.abs(top.y - main.y), 'the picker does not start level with the left column').toBeLessThan(4);
  expect(side.y, 'the readings are not under the picker').toBeGreaterThan(top.y);

  /*
   * The picker moved to the top of the narrow column on 2026-09-01 (author:
   * "move the weekly and monthly display over to the top of the small column
   * on the right"), which is a claim about two boxes that are in different
   * grids — the controls belong to `.cal`, the readings to `.day-panel` — so
   * it is measured rather than read off the markup.
   */
  const controls = await boxOf('.cal-controls');
  expect(Math.abs(controls.x - side.x), 'the picker is not on the right column').toBeLessThan(2);
  expect(controls.y, 'the picker is not above the readings').toBeLessThan(side.y);

  /*
   * Each column scrolls itself and the page does not (author: "make the left
   * and right columns independently scrollable"). The left is the one with
   * the register under the hero, so it is the one with something to scroll.
   */
  const scrolling = await page.evaluate(() => {
    const box = document.querySelector('.cal-main');
    box.scrollTop = 150;
    return {
      column: box.scrollTop,
      page: document.documentElement.scrollHeight - window.innerHeight,
    };
  });
  expect(scrolling.column, 'the left column does not scroll on its own').toBeGreaterThan(0);
  expect(scrolling.page, 'the page still scrolls behind the columns').toBeLessThanOrEqual(1);

  // What is in each, structurally rather than by looking at the picture.
  await expect(page.locator('.cal-main .hero')).toHaveCount(1);
  await expect(page.locator('.cal-main .register-cards')).toHaveCount(1);
  await expect(page.locator('.cal-side [data-readings]')).toHaveCount(1);
  await expect(page.locator('.cal-side [data-hymns]')).toHaveCount(1);
  // The name days moved across on 2026-09-01: "move Name Days to be under
  // hymns in the right column".
  await expect(page.locator('.cal-side [data-namedays]')).toHaveCount(1);

  /*
   * And Continue reading on the left column's own edge and inside its width —
   * the two-grid alignment, which is the thing that cannot be seen from the
   * markup.
   */
  const shelves = await boxOf('.shelves');
  await expect(page.locator('.shelves')).toContainText('Continue reading');
  expect(Math.abs(shelves.x - main.x), 'Continue reading does not sit on the left column').toBeLessThan(2);
  expect(shelves.width, 'Continue reading runs wider than the column it belongs to').toBeLessThan(main.width + 2);

  /*
   * A phone is one column and document order, which is what `display:
   * contents` on the two boxes buys: they have no box of their own there, so
   * there is nothing to measure and the panel lays out exactly as it did
   * before the wrappers existed.
   */
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(CROWDED, { waitUntil: 'networkidle' });
  const display = await page.locator('.cal-main').evaluate((el) => getComputedStyle(el).display);
  expect(display, 'the wrappers are still boxes on a phone').toBe('contents');

  const hero = await boxOf('.hero');
  const readings = await boxOf('[data-readings]');
  expect(readings.y, 'the readings are beside the hero on a phone rather than under it').toBeGreaterThan(
    hero.y + hero.height - 1,
  );
  expect(readings.x, 'the readings are indented into a column of their own').toBeLessThan(hero.x + 2);
});


test('the card ends where the picture does, and the words with it', async ({ page }) => {
  /*
   * Author, 2026-09-01: "make sure the text on the main saint card does not
   * go below the bottom of the image."
   *
   * **This replaces a test that pinned an eighteen-line minimum**, given the
   * round before. The two cannot both hold: a landscape icon is nothing like
   * eighteen lines tall, so a card held at that minimum with its text stopped
   * at the picture's foot is a card with a 240 px hole in it — which is what
   * it looked like. The newer instruction wins, and the eighteen lines survive
   * as what the *picture* is aimed at (--card-h sizes its column) rather than
   * as a floor the card is held to.
   *
   * 24 September because Theodora of Alexandria's icon is 939x625 — landscape,
   * so the picture is far shorter than eighteen lines and the difference
   * between the two rules is visible.
   */
  await ready(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/calendar/2026-09-24', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // The preview arrives with the payload and is trimmed once it does.
  await expect(page.locator('[data-hero-lede]')).toBeVisible();

  const m = await page.evaluate(() => ({
    hero: document.querySelector('.hero').getBoundingClientRect(),
    media: document.querySelector('.hero-media').getBoundingClientRect(),
    body: document.querySelector('.hero-body').getBoundingClientRect(),
    lede: document.querySelector('[data-hero-lede]').getBoundingClientRect(),
  }));

  expect(m.media.height, 'premise: this icon is tall enough for the question not to arise').toBeLessThan(400);
  // The words stop at the picture's foot, and the card stops with them.
  expect(m.lede.bottom, 'the preview runs past the bottom of the picture').toBeLessThan(m.media.bottom + 2);
  expect(m.body.bottom, 'the text column runs past the bottom of the picture').toBeLessThan(m.media.bottom + 2);
  expect(m.hero.height - m.media.height, 'the card is taller than the picture it holds').toBeLessThan(4);
});


test('the masthead doubles and the chrome lines up with the page', async ({ page }) => {
  /*
   * Author, 2026-09-01, revising the same day's own instruction: "revert
   * everything but the site .svg to its previous size, half of what it is
   * now. Keep the .svg the same size but line up the left with the left
   * margin of the left column. Then bring the calendar and language and light
   * mode button collection to line up before the right margin of the right
   * column."
   *
   * So the doubling is the mark's alone, and what the rest gained instead is
   * alignment — which is the part worth pinning, because it is a relationship
   * between two elements that know nothing about each other: the header is
   * chrome, the columns belong to a view.
   */
  await ready(page);
  const measure = async (width) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/calendar/2026-09-24', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    return page.evaluate(() => ({
      nav: parseFloat(getComputedStyle(document.querySelector('nav.site-nav a')).fontSize),
      name: parseFloat(getComputedStyle(document.querySelector('.site-name')).fontSize),
      mark: document.querySelector('.site-name').getBoundingClientRect().left,
      corner: document.querySelector('.chrome-corner').getBoundingClientRect().right,
      left: document.querySelector('.cal-main').getBoundingClientRect().left,
      right: document.querySelector('.cal-side').getBoundingClientRect().right,
    }));
  };

  const narrow = await measure(900);
  const wide = await measure(1440);

  // The mark alone is twice the size; the nav went back to what it was.
  expect(wide.name / narrow.name, 'the masthead is not twice the size').toBeCloseTo(2, 1);
  expect(wide.nav, 'the nav did not go back to its own size').toBeCloseTo(narrow.nav, 1);

  // The mark starts where the left column starts, and the controls end where
  // the right column ends.
  expect(Math.abs(wide.mark - wide.left), 'the mark is not on the left column margin').toBeLessThan(2);
  expect(Math.abs(wide.corner - wide.right), 'the controls do not end on the right column margin').toBeLessThan(2);
});


test('the preview ends in a way into the life, on a desktop; a phone has no second way in', async ({ page }) => {
  /*
   * Author, 2026-09-01: "On Daily main saint page, add a '...continue reading
   * >' button at the bottom right at the end of the preview text", on both —
   * **reversed on a phone, 2026-09-02: "remove the '...continue reading'
   * button from main saint card on mobile"**. What survives is the desktop
   * half: the inline copy is the last words of the preview, which only
   * exists from 760 px. Below that the standalone copy this test used to
   * pin is now hidden outright — the name above it still opens the same
   * page, so a phone reader loses a second, redundant control and nothing
   * else.
   */
  await ready(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const more = page.locator('.hero-more').filter({ visible: true });
  await expect(more).toHaveCount(1);
  // Renamed from "…continue reading" on 2026-09-04 (author: "instead of the
  // 'continue reading' button on Daily page desktop, rename it 'read more'")
  // — the phone's own standalone button below keeps the older name, since it
  // was never asked to change.
  await expect(more).toContainText('Read more');
  // Named after the saint, not a bare "Read more" on a page of them.
  await expect(more).toHaveAttribute('aria-label', /Lupus/);

  const m = await page.evaluate(() => {
    const shown = [...document.querySelectorAll('.hero-more')].find((a) => a.offsetParent !== null);
    const lede = document.querySelector('[data-hero-lede]');
    return {
      link: shown.getBoundingClientRect(),
      inLede: lede.contains(shown),
      dates: document.querySelector('.hero-dates').getBoundingClientRect(),
      media: document.querySelector('.hero-media').getBoundingClientRect(),
      lede: lede.getBoundingClientRect(),
    };
  });
  /*
   * **Right-justified to the text's own measure, not the column it sits
   * in** (2026-09-04, the author's own follow-up to the centring above,
   * reversed the same day: "the preview text does not actually r[e]ach the
   * right side margin, it has a limit on how long a line can get, so the
   * read more button read badly ... right justified to the real margin of
   * the preview text, not to the margin of the space where the preview text
   * is but doesnt reach"). `[data-hero-lede]` is `.hero-lede` itself
   * (`views/daily/panel.js`), so its own `getBoundingClientRect` is the
   * text's real, rendered width — already clamped to 68ch by the browser —
   * rather than a number this test would have to recompute by hand.
   */
  expect(Math.abs(m.link.right - m.lede.right), 'Read more is not right-justified to the text, not the column').toBeLessThan(2);
  /*
   * **Inside the paragraph where there is one** (author, 2026-09-01: "make
   * the '...continue reading' part of the actual preview paragraph"), which
   * is why this no longer asks for it to be flush with the column's right
   * edge — it ends where the sentence ends, as the last words of a
   * paragraph do.
   */
  /*
   * **Out of the paragraph and onto the card, 2026-09-02** (author: "move it so
   * the bottom of the text is lining up with the bottom of the image to the
   * left"). It could not both stay inside the preview box and reach the
   * picture's foot: that box has `overflow: hidden` for its own line clamp, so
   * anything positioned inside it is clipped to the words. The claim that
   * survives is the one the reader sees — it ends where the icon ends — and it
   * is asserted below rather than here.
   */
  expect(m.inLede, 'still nested inside the clipped preview box').toBe(false);
  expect(m.link.top, 'not below the dates').toBeGreaterThan(m.dates.bottom - 1);
  // And never past the foot of the picture, which is the rule the trim
  // exists for: the words end where the image does.
  expect(m.link.bottom, 'the preview runs below the picture').toBeLessThan(m.media.bottom + 2);

  // And it goes where the name goes.
  await more.click();
  await expect(page).toHaveURL(/\/saints\/lupus-the-martyr/);
});


test('the way in sits on the last faded line, not on the last readable one', async ({ page }) => {
  /*
   * Author, 2026-09-02: "make sure the ...continue reading button is lined up
   * to the bottom line of preview text visible under the gradient, right now
   * its floating on the last line before the 2 gradient fade out lines. So
   * move it down 2 lines."
   *
   * A day whose life is long enough that the preview really is cut, so the
   * two dissolving lines exist to line up against — where the paragraph ends
   * inside the budget there is no tail and nothing to move down past.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-09-14', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.hero-lede-tail')).not.toBeEmpty();

  const m = await page.evaluate(() => {
    const lede = document.querySelector('[data-hero-lede]');
    const tail = document.querySelector('.hero-lede-tail');
    const more = [...document.querySelectorAll('.hero-more')].find((a) => a.offsetParent !== null);
    const line = parseFloat(getComputedStyle(lede).lineHeight);
    return {
      lines: Math.round(tail.getBoundingClientRect().height / line),
      // The two are meant to overlap; what is asserted is which line of the
      // tail the pill has landed on.
      belowTailBottom: more.getBoundingClientRect().bottom - tail.getBoundingClientRect().bottom,
      line,
    };
  });
  expect(m.lines, 'the tail is not the two lines this is measured against').toBe(2);
  /*
   * Within a line of the tail's own foot, which is the claim: before this it
   * sat a whole two lines higher, so half a line of tolerance cannot pass a
   * backed-out fix.
   */
  expect(Math.abs(m.belowTailBottom), 'the pill is not on the last faded line').toBeLessThan(m.line / 2);
});


test('a phone has no continue-reading button on the main saint card', async ({ page }) => {
  /*
   * Author, 2026-09-02: "remove the '...continue reading' button frpm main
   * saint card on mobile". Both copies are still in the document — the
   * standalone one always is, the CSS just no longer shows it below 760 px
   * — so this reads what a reader actually sees rather than the markup.
   */
  await ready(page);
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  await expect(page.locator('.hero-more').filter({ visible: true })).toHaveCount(0);
  // The name is still the way in.
  await page.locator('.hero-name a').click();
  await expect(page).toHaveURL(/\/saints\/lupus-the-martyr/);
});

/* ---- the 2026-09-01 batch: the day steps, and the bars that went ---------- */


test('the day steps sit on the date line, against the margin between the columns', async ({ page }) => {
  /*
   * Author, 2026-09-01: "Also on Daily Page add some <Yesterday and Tomorrow>
   * Buttons to the right of today's date print in large font, right justified
   * to the margin between left and right columns" — and, in the same breath,
   * that 5, 6 and 7 are desktop only.
   *
   * Three claims, and the third is the one that costs something. "Right
   * justified to the margin between left and right columns" is not the window's
   * edge and not the header's: it is the right edge of the left column, which
   * is a width the page works out from `--day-cols` and nothing in the markup
   * knows. So it is measured against `.cal-main` rather than asserted about a
   * class.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const before = await page.locator('.cal-date').textContent();
  const m = await page.evaluate(() => {
    const r = (s) => document.querySelector(s).getBoundingClientRect();
    const step = r('.day-step');
    const main = r('.cal-main');
    const date = r('.cal-date');
    return {
      stepRight: step.right,
      // The column's own text edge: `.cal-main` scrolls, so its right is the
      // border box and the words stop where its padding does.
      columnRight: main.right - parseFloat(getComputedStyle(document.querySelector('.cal-main')).paddingRight),
      // The steps are beside the date, not under it: the two boxes overlap
      // vertically, and the steps start after the date's words end.
      sharesLine: step.top < date.bottom && step.bottom > date.top,
      afterDate: step.left > date.right - 1,
      /*
       * They arrived "in large font" and were **made smaller on 2026-09-02**
       * (author: "make the yesterday and tomorrow buttons smaller"), so what
       * is pinned now is the pair of bounds that reversal leaves: plainly
       * under the date they sit beside, and not shrunk into the utility type
       * of the chrome either.
       */
      size: parseFloat(getComputedStyle(document.querySelector('.day-step button')).fontSize),
      dateSize: parseFloat(getComputedStyle(document.querySelector('.cal-date')).fontSize),
      utility: parseFloat(getComputedStyle(document.querySelector('nav.site-nav a')).fontSize),
    };
  });
  expect(Math.abs(m.stepRight - m.columnRight), 'the steps are not on the column margin').toBeLessThan(2);
  expect(m.sharesLine, 'the steps are not on the date’s line').toBe(true);
  expect(m.afterDate, 'the steps are not to the right of the date').toBe(true);
  expect(m.size, 'the steps are competing with the date rather than serving it').toBeLessThan(m.dateSize / 2);
  expect(m.size, 'the steps have shrunk into the chrome').toBeGreaterThanOrEqual(m.utility);

  // And they do what they say, through the same funnel every other way of
  // changing the day goes through — so the panels roll rather than the page
  // being repainted underneath the reader.
  await page.locator('[data-dstep="1"]').click();
  await expect.poll(() => page.locator('.cal-date').textContent()).not.toBe(before);
  const forward = await page.locator('.cal-date').textContent();
  await page.locator('[data-dstep="-1"]').click();
  await expect.poll(() => page.locator('.cal-date').textContent()).toBe(before);
  expect(forward).not.toBe(before);

  /*
   * Desktop only. A phone has the rail, a swipe across the panel and the month
   * grid already, and no room on a 360 px line for a fourth way — so the nav is
   * not merely small there, it is not laid out at all.
   */
  await page.setViewportSize({ width: 360, height: 780 });
  await expect(page.locator('.day-step')).toBeHidden();
});


test('neither Daily column draws a scrollbar, and both still scroll', async ({ page }) => {
  /*
   * Author, 2026-09-01: "Remove the scroll bar from the Daily page columns."
   *
   * The bar, not the scrolling — which is the whole of what makes this worth a
   * test. `overflow: hidden` would satisfy the words and break the page, so the
   * assertion is in two halves: nothing is drawn, and the column still moves
   * when it is asked to.
   */
  await ready(page);
  /*
   * A short window on a day whose left column is a crowd of saints and whose
   * right one carries a long set of hymns, because a column with nothing to
   * scroll would pass the second half of this test by having no bar to draw.
   * 2026-08-25 overflows both by about 400 px at this height.
   */
  await page.setViewportSize({ width: 1280, height: 500 });
  await page.goto('/calendar/2026-08-25', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  for (const col of ['.cal-main', '.cal-side']) {
    const seen = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      const cs = getComputedStyle(el);
      return {
        hidden: cs.scrollbarWidth,
        overflow: cs.overflowY,
        // The gutter a drawn bar would take out of the content box.
        gutter: el.offsetWidth - el.clientWidth,
        scrollable: el.scrollHeight - el.clientHeight,
      };
    }, col);
    expect(seen.hidden, `${col} still reserves a bar`).toBe('none');
    expect(seen.gutter, `${col} still draws a bar`).toBeLessThan(1);
    // Still a scroll container, not a clipped one.
    expect(seen.overflow, `${col} stopped scrolling`).toBe('auto');
    expect(seen.scrollable, `${col} has nothing to scroll`).toBeGreaterThan(0);

    const moved = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      el.scrollTop = 120;
      return el.scrollTop;
    }, col);
    expect(moved, `${col} would not scroll`).toBeGreaterThan(0);
  }
});


/*
 * **'The full-screen calendar is a list on a phone, so the words still fit'
 * was removed on 2026-09-02**, and it is worth saying why rather than leaving
 * a hole in the dates.
 *
 * Its subject was how that dialog reflows at 360 px — one column of days with
 * the words still legible. The author took the way in away the same day
 * ("remove the 'Full Screen Calendar' button completely from mobile - this was
 * only ever supposed to be a desktop only addition"), so there is no longer a
 * press on a phone that opens it, and a test that reaches past the missing
 * control to the dialog behind it would be testing a screen no reader can get
 * to. What survives is the claim that the control is not there, which is 'the
 * full-screen calendar is a desktop control and is not on a phone' below.
 *
 * The dialog's own narrow styles are left in calendar.css: a desktop window
 * narrowed while it is open still reaches them.
 */

test('the way into the life is a white button with the life fading out under it', async ({ page }) => {
  /*
   * Author, 2026-09-01: "Make the 'continue reading' button white so you can
   * tell its a button for more, and gradient fade the last two lines of preview
   * text below it."
   *
   * Two halves that answer one complaint. The link was the last words of the
   * paragraph in the paragraph's own ink - which is what the *previous*
   * instruction asked for ("make the '...continue reading' part of the actual
   * preview paragraph") and is exactly how it stopped looking like a control.
   * White is the one surface the page has nowhere else, so nothing on the card
   * can be mistaken for it; and the two lines running on underneath say the
   * paragraph was cut by showing it rather than by claiming it.
   *
   * A window narrow enough that the paragraph really is cut: on a wide one the
   * whole first paragraph fits and there is nothing to fade.
   */
  await ready(page);
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const more = page.locator('.hero-more').filter({ visible: true });
  await expect(more).toHaveCount(1);
  const seen = await page.evaluate(() => {
    const link = [...document.querySelectorAll('.hero-more')].find((a) => a.offsetParent !== null);
    const tail = document.querySelector('.hero-lede-tail');
    // The readable half of the preview, which the faded pair follows.
    const head = document.querySelector('[data-hero-lede]');
    const cs = getComputedStyle(link);
    const media = document.querySelector('.hero-media').getBoundingClientRect();
    return {
      background: cs.backgroundColor,
      shadow: cs.boxShadow,
      tail: tail ? tail.textContent.trim() : '',
      tailLines: tail
        ? Math.round(tail.getBoundingClientRect().height / parseFloat(getComputedStyle(tail).lineHeight))
        : 0,
      masked: tail ? getComputedStyle(tail).maskImage : 'none',
      /*
       * **What is left of "the life goes on under the button".**
       *
       * It has been rewritten twice in two days as the button moved, and the
       * claim has to move with it or it stops meaning anything. It sat at the
       * end of the last readable line with the faded pair running on beneath
       * (2026-09-01); it moved down onto the last faded line (2026-09-02,
       * morning); and it now sits at the foot of the *card*, level with the
       * icon beside it (2026-09-02, afternoon: "move it so the bottom of the
       * text is lining up with the bottom of the image to the left").
       *
       * Through all three the thing worth pinning is the same and is about the
       * *paragraph*, not the button: the preview does not stop dead at the
       * last readable word — there are faded lines after it, and they are what
       * say the life carries on. So this measures the tail against the
       * readable text it follows rather than against a control that has been
       * three places this week.
       */
      below: tail && head ? tail.getBoundingClientRect().top >= head.getBoundingClientRect().top - 1 : false,
      // And still inside the picture's height, which the rule before this one
      // asked for and this must not have broken.
      fits: document.querySelector('.hero-body').getBoundingClientRect().bottom <= media.bottom + 2,
    };
  });

  /*
   * **The pill went on 2026-09-02** (author: "the ...continue reading button
   * should not be white, it should not have a bubble. The text should be white
   * instead on dark mode, or black on a light mode"), reversing the white
   * surface this line was written for the day before. What the instruction
   * before it was really after — that the way in reads as a control rather
   * than as the last words of a sentence — is carried by contrast now: the
   * ground's own opposite, against a paragraph set in `--ink-soft`.
   */
  expect(seen.background, 'the way in still wears a surface').toBe('rgba(0, 0, 0, 0)');
  expect(seen.shadow, 'the way in still wears a shadow').toBe('none');
  expect(seen.tail.length, 'the life does not go on under the button').toBeGreaterThan(10);
  expect(seen.tailLines, 'the fading tail is not two lines').toBe(2);
  expect(seen.masked, 'the tail does not fade').toContain('gradient');
  expect(seen.below, 'the life stops at the button rather than running past it').toBe(true);
  expect(seen.fits, 'the card now runs below its own picture').toBe(true);

  /*
   * The words under the button are the ones the life goes on with, not a repeat
   * of the ones above it - a tail that showed the reader the same sentence
   * twice would be decoration rather than a continuation.
   */
  const repeated = await page.evaluate(() => {
    const box = document.querySelector('[data-hero-lede]');
    const tail = document.querySelector('.hero-lede-tail').textContent.trim();
    const head = box.firstChild.nodeValue.trim();
    return head.includes(tail.split(' ').slice(0, 4).join(' '));
  });
  expect(repeated, 'the tail repeats the preview instead of continuing it').toBe(false);
});


test('the hero picture is never more than half the window, on any monitor', async ({ page }) => {
  /*
   * Author, 2026-09-01: "on my laptop the saint image is way bigger than on my
   * pc monitor. It should be more consistent. Where it was just over half the
   * window height on my pc monitor, now its almost the whole height for the
   * tall icons. Make sure for the full window size possible on any monitor, its
   * no more than half the window height."
   *
   * The card was eighteen lines tall whatever the screen - about 504 px, which
   * is a third of a 1440 px monitor and nearly three quarters of a laptop's
   * 700. Not two bugs but one number that was not a share of anything. Five
   * windows, two of them larger than this suite otherwise runs at, because the
   * defect was invisible at the sizes it did run at.
   */
  await ready(page);
  for (const size of [
    { width: 1280, height: 720 },
    { width: 1440, height: 700 },
    { width: 1680, height: 900 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
  ]) {
    await page.setViewportSize(size);
    await page.goto(POPULATED, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const media = page.locator('.hero-media');
    await expect(media).toBeVisible();
    const share = await media.evaluate((el) => el.getBoundingClientRect().height / window.innerHeight);
    expect(
      share,
      `the picture takes ${(share * 100).toFixed(0)}% of a ${size.width}x${size.height} window`,
    ).toBeLessThanOrEqual(0.51);
    // And it has not been capped into a stamp: half a window is the ceiling,
    // not the target, but a picture that fell to a tenth would be a different
    // defect and this is where it would show.
    expect(share, `the picture shrank to ${(share * 100).toFixed(0)}%`).toBeGreaterThan(0.2);
  }
});


test('a tall icon is cropped from the top, and its drawn shape stays inside the two limits', async ({ page }) => {
  /*
   * Author, 2026-09-01: "For really tall images, crop them favouring the top
   * edge, and for really wide images crop them favouring the centre. Tallest
   * aspect ratio allowed for this main saint card would be 1:1.6, and widest
   * would be 2:1."
   *
   * Only the tall half can be reached from the corpus - the widest icon of the
   * 130 is 0.62 down, comfortably inside 2:1 - so the wide half is pinned in
   * tests/hero-crop.test.mjs, where the arithmetic can be asked about a picture
   * no folder holds yet. What this adds is that the arithmetic reaches the
   * page: the box really is that shape and the crop really is anchored.
   */
  await ready(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const shape = await page.evaluate(() => {
    const media = document.querySelector('.hero-media');
    const box = media.getBoundingClientRect();
    const img = media.querySelector('img');
    return {
      ratio: box.height / box.width,
      focus: getComputedStyle(media).backgroundPosition,
      imageFocus: getComputedStyle(img).objectPosition,
      fit: getComputedStyle(img).objectFit,
    };
  });
  expect(shape.ratio, 'the box is taller than 1:1.6').toBeLessThanOrEqual(1.61);
  expect(shape.ratio, 'the box is wider than 2:1').toBeGreaterThanOrEqual(0.49);
  expect(shape.fit).toBe('cover');
  // Zero resolves to `0px` in one property and `0%` in the other; what is
  // asserted is centred across and hard against the top.
  expect(shape.focus, 'the crop is not anchored to the top').toMatch(/^50% 0(px|%)$/);
  expect(shape.imageFocus, 'the picture is not anchored to the top').toMatch(/^50% 0(px|%)$/);
});

/* ---- the round of 2026-09-02, night ------------------------------------- */


test('the civil date in a veneration row says it is the Gregorian one', async ({ page }) => {
  /*
   * Author, 2026-09-02: "just state which falls on '28 January 2026
   * (Gregorian)' and that always stays the same."
   *
   * St Paul is the example the instruction was written about: all three
   * churches keep him on 15 January in their own calendar, so the Russian row
   * lands on the civil 28th and the other two on the civil 15th. The second
   * date is arithmetic from what the source states and does not move with
   * anything the reader chooses, which is why naming it is worth a word.
   */
  await ready(page, { church: 'russian' });
  await page.goto('/saints/paul-of-thebes', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-veneration] .att').first()).toBeVisible();

  const russian = page.locator('[data-veneration] .att-feast').first();
  await expect(russian).toContainText('15 January (Julian)');
  await expect(russian).toContainText('28 January 2026 (Gregorian)');

  /*
   * And the row where the two agree repeats itself, which the author has
   * already said is not a fault: those two dates being the same *is* the
   * finding for a New Calendar church.
   */
  await page.locator('[data-reveal]').click();
  const romanian = page.locator('.attestations-other .att-feast').first();
  await expect(romanian).toContainText('15 January (Revised Julian)');
  await expect(romanian).toContainText('15 January 2026 (Gregorian)');
});


test('a hero with no picture offers one way into the life, not two', async ({ page }) => {
  /*
   * Author, 2026-09-02: "weird bug on desktop showing 2x continue reading
   * buttons on main saint cards without images".
   *
   * Two exist in the document by design — the one that ends the preview, and
   * the standalone one for the widths and cards that have no preview to end —
   * and exactly one was ever laid out, because the inline one lived *inside*
   * the preview box and inherited its `display: none`. Moving it onto the card
   * that morning, so it could reach the picture's foot, took that away: on a
   * hero with no image the preview is not drawn but the link beside it now
   * was, and the standalone one was showing too, because the rule that hides
   * that one asks for `.has-media`.
   *
   * 6 September in the Romanian calendar is the author's own case: Eudoxius of
   * Melitene, who has no icon.
   */
  await ready(page, { church: 'romanian' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-09-06', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const hero = page.locator('.hero');
  await expect(hero, 'premise: this day’s hero has a picture after all').not.toHaveClass(/has-media/);
  await expect(page.locator('.hero-more').filter({ visible: true })).toHaveCount(1);

  // And a hero *with* one still has exactly one, which is the other half of it.
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await expect(page.locator('.hero')).toHaveClass(/has-media/);
  await expect(page.locator('.hero-more').filter({ visible: true })).toHaveCount(1);
});


test('a feast prints its day and month in the reader’s own grammar, and links in every language', async ({ page }) => {
  /*
   * Author, 2026-09-02: "sometimes the veneration date is listed in Romanian
   * '2 septembrie' ... run an audit for all other languages in a similar
   * fashion. And hyperlink them in the other languages as well, not just in
   * English."
   *
   * The audit found the link already working in all five — it is built from
   * the formatted date whatever the pack — and found a real fault beside it:
   * the feast's own day-and-month was glued together from a *standalone* month
   * name, so Russian read "2 Сентябрь" (nominative) while the civil date four
   * words later correctly read "15 Сентября" (genitive). One sentence, one
   * day, two cases. Serbian had it too.
   *
   * Theodosius of Totma is the saint the report named.
   */
  for (const [lang, wanted] of [
    ['en', /2 September \(Julian\)/],
    ['ru', /2 Сентября/],
    ['ro', /2 Septembrie/],
  ]) {
    /*
     * Written straight into the store rather than through `ready`, which only
     * fills a setting that is *absent* — so the second and third turns of this
     * loop would keep the first one's English and the test would pass by
     * reading the same page three times.
     */
    await page.addInitScript((l) => {
      const key = 'gos-settings';
      const now = JSON.parse(localStorage.getItem(key) ?? '{}');
      localStorage.setItem(key, JSON.stringify({ ...now, church: 'russian', language: l }));
    }, lang);
    await page.goto('/saints/theodosius-of-totma', { waitUntil: 'networkidle' });
    await expect(page.locator('[data-veneration] .att').first()).toBeVisible();
    const row = page.locator('[data-veneration] .att-feast').first();
    await expect(row, `the feast reads wrongly in ${lang}`).toHaveText(wanted);
    // The civil date is a link to that day in every language, not only English.
    await expect(
      page.locator('[data-veneration] [data-feast-day]').first(),
      `no link in ${lang}`,
    ).toHaveAttribute('href', /\/calendar\/2026-09-15$/);
  }
});


test('a phone turns the day from anywhere on it except the picker', async ({ page }) => {
  /*
   * Author, 2026-09-02: "make sure on mobile you can swipe on daily page
   * across the whole page except the weekly display, e.g. subheadings
   * included."
   *
   * The gesture was bound to the left day panel — the hero and the register,
   * which is most of a phone's screen but not all of it. A finger starting on
   * *Also commemorated*, on the name days, on the liturgy line, or on the
   * ground below a short day found nothing to take it.
   *
   * The picker keeps its own: the week rail is a horizontal scroller and the
   * month has a grain drag, and an outer listener would drive two gestures
   * from one finger.
   */
  await ready(page);
  await phone(page);
  const from = (sel, dx) =>
    page.evaluate(
      ([s, d]) => {
        const el = document.querySelector(s);
        if (!el) throw new Error(`nothing to swipe from: ${s}`);
        const box = el.getBoundingClientRect();
        const x = Math.min(Math.max(box.x + box.width / 2, 40), 320);
        const y = Math.min(Math.max(box.y + Math.min(box.height / 2, 40), 40), 740);
        const at = (px) => ({ pointerId: 1, pointerType: 'touch', clientX: px, clientY: y, bubbles: true, cancelable: true });
        el.dispatchEvent(new PointerEvent('pointerdown', at(x)));
        el.dispatchEvent(new PointerEvent('pointermove', at(x + d * 0.5)));
        el.dispatchEvent(new PointerEvent('pointermove', at(x + d)));
        el.dispatchEvent(new PointerEvent('pointerup', at(x + d)));
      },
      [sel, dx],
    );

  /*
   * **The listener reaching a box is only half of it.** A synthetic
   * `PointerEvent` is delivered whatever `touch-action` says, so the loop
   * below passed on every one of these while a real thumb could still only
   * swipe from the day panel and the week — the browser claimed the drag as a
   * scroll before the handler ever ran. That is what the author reported the
   * next morning ("can you also swipe on today's date on mobile?"), and this
   * is the assertion that would have caught it: `pan-y` has to be the
   * *computed* value at each of them, which under a dispatched gesture is
   * unobservable.
   */
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  const touch = await page.evaluate(
    (sels) =>
      Object.fromEntries(
        sels.map((s) => {
          const el = document.querySelector(s);
          if (!el) return [s, 'MISSING'];
          /*
           * `touch-action` does not inherit, so reading it off the target
           * itself answers `auto` at every one of these however the page is
           * written — the browser instead intersects the values from the hit
           * element up through its ancestors, which is what lets one
           * declaration on `.cal` govern the whole page. Walking to the
           * nearest declared value is that intersection here, nothing under
           * `.cal` narrowing it a second time.
           */
          for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
            const value = getComputedStyle(n).touchAction;
            if (value !== 'auto') return [s, value];
          }
          return [s, 'auto'];
        }),
      ),
    ['.cal-date', '.hero-name', '.register-heading', '.cal-liturgy'],
  );
  for (const [sel, value] of Object.entries(touch)) {
    expect(value, `${sel} lets the browser claim a sideways drag`).toBe('pan-y');
  }

  // Every one of these is somewhere the old binding did not reach.
  for (const sel of ['.cal-date', '.hero-name', '.register-heading', '.cal-liturgy']) {
    await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
    await expect(page.locator('.cal-date')).toContainText('5 Sep');
    await from(sel, -170);
    await expect(page.locator('.cal-date'), `a swipe from ${sel} did not turn the day`).toContainText('6 Sep');
  }

  /*
   * And the rail does not, because it is a scroller: a finger there is
   * scrolling the week, and the day it lands on is the reader's own press.
   */
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await expect(page.locator('.cal-date')).toContainText('5 Sep');
  await from('.week-strip', -170);
  await page.waitForTimeout(600);
  await expect(page.locator('.cal-date'), 'a swipe on the rail turned the day too').toContainText('5 Sep');
});


test('a swipe on the continue-reading shelf clears the row and does not turn the day', async ({ page }) => {
  /*
   * Author, 2026-09-04: "probably because of the swipe left right yesterday
   * tomorrow functionality on daily page on mobile, the swipe to remove on
   * the continue reading section isnt working." It was: `wireDaySwipe`
   * (`daily/picker.js`) binds to the whole page and only excludes
   * `.cal-controls`, and the shelf's own row-swipe (`wireSwipe`,
   * `ui/shelf.js`) sits underneath that same page, on `[data-shelves]`. A
   * touch pointer starting on a row is not a mouse, so `onGrainDrag`'s own
   * mouse-only exclusion (`grain-drag.js`) does not save it — both listeners
   * track the same finger, one dragging the row and the other dragging the
   * day panel out from under it.
   *
   * `.shelf-row` swiping is already covered on a real device profile in
   * chrome.spec.js — but with `page.mouse`, which fires `pointerType:
   * 'mouse'` even under touch emulation, a pointer type `onGrainDrag` was
   * already ignoring on its own. It could not have caught this: the
   * conflict only exists for a genuine touch pointer, dispatched here the
   * way the day-swipe test above does.
   */
  await ready(page);
  await phone(page);
  // Seed a reading entry the ordinary way, then land on a day.
  await page.goto('/saints/moses-the-hungarian', { waitUntil: 'networkidle' });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await expect(page.locator('.cal-date')).toContainText('5 Sep');

  const row = page.locator('.shelf-row').first();
  await row.scrollIntoViewIfNeeded();
  await expect(row).toBeVisible();
  const box = await row.locator('.index-name').boundingBox();
  const y = box.y + box.height / 2;
  await row.evaluate(
    (el, y) => {
      const at = (px) => ({ pointerId: 1, pointerType: 'touch', clientX: px, clientY: y, bubbles: true, cancelable: true });
      const x0 = el.getBoundingClientRect().x + el.getBoundingClientRect().width / 2;
      el.dispatchEvent(new PointerEvent('pointerdown', at(x0)));
      el.dispatchEvent(new PointerEvent('pointermove', at(x0 + 90)));
      el.dispatchEvent(new PointerEvent('pointermove', at(x0 + 180)));
      el.dispatchEvent(new PointerEvent('pointerup', at(x0 + 180)));
    },
    y,
  );

  await expect(page.locator('.shelf-row'), 'the row did not clear').toHaveCount(0);
  await expect(page.locator('.cal-date'), 'the shelf swipe also turned the day').toContainText('5 Sep');
});


test('the wordmark is centred on a phone and unmoved on a desktop', async ({ page }) => {
  /*
   * Author, 2026-09-02: "daily dox svg not centred on mobile header, left
   * justified."
   *
   * The narrow header stretches the name's track and centres it with
   * `text-align: center`, which is the right instruction for text and does
   * nothing to a block-level SVG — and the mark became one on 2026-08-28, so
   * the centring quietly stopped applying to the thing it was written for.
   */
  await ready(page);
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const gaps = () =>
    page.evaluate(() => {
      const mark = document.querySelector('.brand-mark').getBoundingClientRect();
      const track = document.querySelector('.site-name').getBoundingClientRect();
      return { left: Math.round(mark.left - track.left), right: Math.round(track.right - mark.right) };
    });

  const narrow = await gaps();
  expect(narrow.left, 'the mark is not centred in its track').toBeGreaterThan(2);
  expect(Math.abs(narrow.left - narrow.right), 'the mark sits off-centre').toBeLessThan(3);

  // Wide, the track is the mark's own width and nothing has moved.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => document.fonts.ready);
  const wide = await gaps();
  expect(wide.left, 'the wide masthead gained a margin it did not have').toBeLessThan(3);
});
