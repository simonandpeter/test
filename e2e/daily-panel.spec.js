import { CHURCHES } from '../src/data/churches.js';
import { STRINGS } from '../src/ui/strings.js';
import { test, expect } from './fixtures.js';
import {
  EMPTY,
  POPULATED,
  aDayThatIsNotToday,
  answered,
  dragGrain,
  desk,
  keptOn,
  openChooser,
  phone,
  ready,
  releaseGrain,
  searchMode,
  swipe,
  tokenColours,
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


test('the hero is its own shape on the desk up to A4, its own shape up to 1:1.6 between, and a band on a phone', async ({ page }) => {
  /*
   * A square from 2026-08-21, a band from 2026-08-26 morning — "Change the
   * daily saint image crop from square to a horizontal rectangle … This is to
   * reduce the height of the card to show more of what's below in the also
   * commemorated section" — both from the evening of the same day, then **the
   * icon's own shape from 2026-09-01** ("don't crop the main saint image on
   * Daily page unless it exceeds an aspect ratio of 1:1.6, that's the maximum
   * height"), and **the reference's fixed crop from 2026-09-10**: the main
   * saint card takes the cropping aspect ratio of the reference, which is 3:2.
   *
   * This test said "shown whole up to 1:1.6 on desktop" until that last
   * instruction, and the title is the change. **The 1:1.6 rule is not gone
   * and is not weaker** — it governs
   * every other saint card on the site through `cardCrop`, and it governs
   * this one below 1024 px. What changed is that the desk's own card is one
   * picture alone at the top of a page the reader returns to daily, and a
   * shape that follows the saint changes the page's silhouette every morning.
   *
   * So the rule is now different at three widths and is asserted at all three
   * rather than at one. The premise each time is read off the element, not
   * hard-coded: what makes 1280 an assertion about the *box* is that two
   * saints of very different natural shapes are drawn identically there.
   *
   * The reason there is a fixed ratio at any width is unchanged and is the
   * strongest it has been: the box is reserved before the image decodes, so
   * nothing reflows on arrival, and on the desk the reservation no longer even
   * has to wait for the manifest.
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

  /*
   * **On the desk: the icon's own shape, no taller than A4** (the mockup's
   * `mainCrop`, `../mockup-review/REVIEW.md` finding 3, stage D). It was a
   * fixed 3:2 band from 2026-09-10 until the review. Anthony's icon is inside
   * A4 and Lupus the Martyr's (450x1184, 5 September) is well past it, and the
   * two premises below are what say so at run time.
   */
  const A4_TALL = 1 / 0.7071;
  const wideDesk = await shape();
  expect(wideDesk.natural, 'premise: this hero is inside A4').toBeLessThan(A4_TALL);
  expect(Math.abs(wideDesk.drawn - wideDesk.natural), 'the desk hero is not in its own shape').toBeLessThan(0.02);

  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await expect(img).toBeVisible();
  const tallDesk = await shape();
  expect(tallDesk.natural, 'premise: this day’s hero is taller than A4').toBeGreaterThan(A4_TALL);
  expect(Math.abs(tallDesk.drawn - A4_TALL), 'a tall icon is not cut to A4 on the desk').toBeLessThan(0.02);

  /*
   * **Between 620 and 1024 px the icon keeps its own shape**, held to 1:1.6.
   * The 2026-09-10 instruction is about the two-column desk; this width has a
   * column for the picture and is not that page, and it is where the derived
   * rule and `--hero-shape` still decide something. Asserted so the reversal
   * above cannot be read as the rule having been deleted.
   */
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await expect(img).toBeVisible();
  const tallMid = await shape();
  expect(Math.abs(tallMid.drawn - 1.6), 'a tall icon is not held to 1:1.6 below the desk').toBeLessThan(0.03);

  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await expect(img).toBeVisible();
  const wholeMid = await shape();
  expect(
    Math.abs(wholeMid.drawn - wholeMid.natural),
    'an icon inside 1:1.6 was cropped below the desk, where it is still shown whole',
  ).toBeLessThan(0.03);

  // And the band survives where it was bought: a phone, where the picture is
  // the card's own height and the register has to fit under it.
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await expect(img).toBeVisible();
  const phone = await img.boundingBox();
  expect(Math.abs(phone.width / phone.height - 1.5), '3:2 on a phone').toBeLessThan(0.03);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(POPULATED, { waitUntil: 'networkidle' });

  /*
   * **Where the crop is taken from, on the desk: the top** — the derived box's
   * anchor, since a picture shown whole has nothing to anchor and a tall one
   * must lose its feet rather than its face. It was 34% down while the desk
   * was a fixed band (2026-09-10 until stage D).
   *
   * The placeholder is read as well as the picture, because they are two boxes
   * and a placeholder framed differently from the picture landing over it is a
   * visible jump.
   */
  const crop = await page.evaluate(() => {
    const s = getComputedStyle(document.querySelector('.hero-media img'));
    const media = getComputedStyle(document.querySelector('.hero-media'));
    return { fit: s.objectFit, position: s.objectPosition, background: media.backgroundPosition };
  });
  expect(crop.fit).toBe('cover');
  expect(crop.position, 'the desk picture is not anchored at its top').toBe('50% 0px');
  expect(crop.background, 'the placeholder is framed differently from the picture over it').toBe(crop.position);
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

  /*
   * **The box the finger lands on, not the box that moves.** `[data-slot=
   * "main"]` is the phone's day panel and is not drawn past 1024 px since
   * 2026-09-16, so a drag aimed at it there begins on a `display: none` box
   * with no geometry and `wireDaySwipe`'s `begin` never runs. `.cal` is the
   * listener's own element at both widths. The panel read below is still the
   * main one: `begin` transforms every panel in the document, and a hidden
   * element reports the transform it was given.
   */
  /*
   * **Whichever panel this width draws.** `[data-slot="main"]` is the phone's
   * day panel and is not drawn past 1024 px since 2026-09-16, so both the
   * finger and the reading have to find a box that exists: a hidden element
   * has no geometry for `dragGrain` to aim at and nothing measurable on it
   * afterwards. `.cal` is the listener's own ground at either width.
   */
  const panel = (await page.locator('[data-slot="main"]').isVisible())
    ? '[data-slot="main"] .day-panel'
    : '[data-slot="content"] .day-panel';
  await dragGrain(page, '.cal', -20, { release: false });
  const live = await page.locator(panel).evaluate((el) => getComputedStyle(el).transform);
  expect(live, 'the panel did not move while the finger was still down').not.toBe('none');

  // Short of the threshold: letting go here must not change the day, and the
  // panel must spring back to its own place rather than being left adrift.
  await releaseGrain(page, '.cal', -20);
  await expect(page.locator('h1')).toHaveText(/28 Aug(ust)? 2026/);
  await expect.poll(() => page.locator(panel).evaluate((el) => el.style.transform)).toBe('');
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
   * bigger pictures on a bigger card, and derived per saint after that — the
   * smaller of a share of the card and the width at which this icon stands
   * exactly as tall as the card. **From 2026-09-10 that derivation is the
   * 620–1024 px band's alone** (§10.23): the desk's box is a fixed 3:2, so no
   * icon can be taller than its column asks for. Augustine's icon is 422x720,
   * taller than the 1:1.6 ceiling, which is why he is still the day chosen —
   * the two widths do different things to him.
   *
   * What is pinned either way is the relationship and not a number: the mount
   * fills whatever the first track is, and the picture fills the mount.
   */
  await ready(page);
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  /*
   * **The mount, 2026-09-10**: from
   * 1024 px the picture stands in a 14 px mat, so what fills the column is the
   * *figure* and what fills the figure is the picture. Both halves are read
   * here — a mat that quietly went to zero would otherwise pass as a smaller
   * picture in a column that still added up.
   */
  const m = await page.evaluate(() => {
    const hero = document.querySelector('.hero');
    const s = getComputedStyle(hero);
    const tracks = s.gridTemplateColumns.split(' ').map(parseFloat).filter((n) => !Number.isNaN(n));
    const figure = document.querySelector('.hero-figure').getBoundingClientRect();
    const media = document.querySelector('.hero-media').getBoundingClientRect();
    const pad = getComputedStyle(document.querySelector('.hero-figure'));
    return {
      tracks,
      column: hero.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight),
      figureWidth: figure.width,
      width: media.width,
      height: media.height,
      mat: parseFloat(pad.paddingTop),
      card: hero.getBoundingClientRect().height,
      desk: window.innerWidth >= 1024,
    };
  });
  const expected = m.tracks.length === 2 ? m.tracks[0] : m.column;
  expect(Math.abs(m.figureWidth - expected), 'the mount does not fill its column').toBeLessThan(1);
  expect(Math.abs(m.width - (expected - 2 * m.mat)), 'the picture does not fill its mount').toBeLessThan(1);
  if (m.tracks.length === 2) {
    /*
     * A tall icon is exactly as tall as the card and no taller — which is the
     * whole of the derivation, and fails in both directions that matter: a
     * column left at a hard width makes it shorter, and a column given the
     * full share of a wide card makes it overrun (662 px of Lupus over a
     * 505 px card was the version that asked for this rule).
     *
     * The card is the picture plus the mat above and below it now, which at
     * this width is 28 px and below 1024 is nothing at all — so the figure
     * carries the claim and the mat is stated rather than absorbed into a
     * tolerance.
     */
    expect(m.mat, 'the mount is not 14 px on the desk, or has appeared below 1024').toBe(m.desk ? 14 : 0);
    expect(
      Math.abs(m.height + 2 * m.mat - m.card),
      'the picture is not the height of the card it fills',
    ).toBeLessThan(2);
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
  // The movement decides, not the gesture (STRUCTURE.md). A change of
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

  await desk(page);
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
    // Whichever slot this width paints the register into — the day panel on a
    // phone, the shelf column past 1024 px. The row is the same row.
    await page.locator('.register li').first().evaluate((li) => getComputedStyle(li).borderBottomWidth),
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
  // this day the reason *was* the weekday (STRUCTURE.md carries the
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
  /*
   * **And so does the tone, since 2026-09-07** (author: the hymns "say Glasul
   * 3 (Romanian) instead of ἦχος or whatever it's supposed to be"). It was
   * «Ἦχος α΄» here — saint.gr's own polytonic spelling, quoted from the
   * source and left standing beside a heading in the reader's language, so a
   * Greek reader met a Romanian troparion under `Glasul 3`. `lib/tone.js`
   * reads the number out of any of the three notations and the pack says the
   * word: the site's own Greek is monotonic, and the numeral is a numeral.
   */
  await expect(page.locator('[data-hymns] .hymn-kind').first()).toContainText('Απολυτίκιο · Ήχος 1');
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
  /*
   * **This line pinned the defect the author reported** (2026-09-07: the
   * hymns "say Glasul 3 (Romanian) instead of ἦχος"). Here is the case
   * exactly: the calendar is Romanian, the reader is Greek, and the tone said
   * `Glasul` because it was quoted from the Romanian source and printed
   * beside a heading, a name and a church all in Greek. The *text* is still
   * Romanian and still says so in its `lang` — only the label around it
   * follows the reader now.
   */
  await expect(page.locator('[data-hymns] .hymn-kind').first()).toContainText('Ήχος');
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
  await desk(page);
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
  await expect(page.locator('[data-hymns] .hymn-text').first()).toHaveAttribute('lang', 'en');
  await expect(page.locator('[data-hymns] .hymn-text').first()).toContainText('Thy martyr Lawrence');
  /*
   * `Tone 4`, not «глас 4», since 2026-09-07: the Serbian hymn keeps its own
   * text and its own `lang`, and only the *label* around it follows the
   * reader — which closes the open item HANDOFF had twice left to the author
   * ("an English hymn still prints its tone as «глас 4»").
   */
  await expect(page.locator('[data-hymns] .hymn-kind').first()).toContainText('Troparion · Tone 4');
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
  /*
   * English. The tone beside it reads `Tone` since 2026-09-07 — it was «глас»
   * on the reasoning that a rendering does not change which church's book the
   * hymn is from, which is true of the *text* and was never true of the
   * label: the kind and the church beside it were already in the reader's
   * language, and the tone was the one word in the line still speaking
   * Slavonic. HANDOFF had left this to the author twice; the author called it.
   */
  await expect(page.locator('[data-hymns] .hymn-kind').first()).toContainText('Tone');
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


test('the hairline under the date runs full width, close to the text, in --rule', async ({ page }) => {
  /*
   * Author, 2026-08-26: "make the gold line on daily page go full width like
   * the other lines and make it closer to the date not so far down." It ran
   * 2.5em (40px at this size) and sat a full space-2 (8 px) below the
   * heading's text; now it spans the column like the register's own rules and
   * the register-heading's underline, and stands a tighter space-1 (4 px)
   * under it.
   *
   * **It is no longer gold.**
   * The rebuild pairs it with a rule under the nav and draws both in `--rule`;
   * gold survives on the page as the feast mark alone, which is the one place
   * it carries a fact. The measurements above are untouched — what changed is
   * the hue, and the assertion follows it rather than being dropped, because
   * "the rule is a token and not a literal" is the half of this worth keeping.
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
     * The column the heading actually heads, and there have been three of
     * them. On a phone the day is one column and `.day-main` is the box around
     * it; past 1024 px, since 2026-09-16, the heading stands at the top of
     * `.cal-main` — the day's own column, first of four — and `.day-main` is
     * not drawn at all. `.cal-body` is the older arrangement's box and is kept
     * in the list because a dissolved box measures zero and drops out of it by
     * itself, which is cheaper than knowing which build is being run.
     */
    const column = [
      document.querySelector('.day-main'),
      document.querySelector('.cal-main'),
      document.querySelector('.cal-body'),
    ].find((el) => el && el.getBoundingClientRect().width > 0);
    /* The measure the heading actually has, which is the column's *content*
       box: past 1024 px the day's column stands its own content off the
       hairline that divides it from the saint's, and a border box measured
       against a child that is inside that padding is 24 px out. */
    const measureOf = (el) => {
      const cs = getComputedStyle(el);
      return (
        el.getBoundingClientRect().width -
        parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) -
        parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth)
      );
    };
    const s = getComputedStyle(heading, '::after');
    return {
      headingWidth: heading.getBoundingClientRect().width,
      bodyWidth: measureOf(column),
      afterWidth: parseFloat(s.width),
      paddingBottom: parseFloat(getComputedStyle(heading).paddingBottom),
      afterBackground: s.backgroundColor,
    };
  });
  // Full column width, not the old 2.5em fixed measure.
  expect(Math.abs(m.headingWidth - m.bodyWidth)).toBeLessThan(2);
  expect(Math.abs(m.afterWidth - m.bodyWidth)).toBeLessThan(2);
  // Close to the text: one space-1 (4 px), not two (8 px).
  expect(m.paddingBottom).toBeLessThanOrEqual(4);
  // The two tokens are painted rather than parsed out of `getPropertyValue`,
  // which returns a hex for an ordinary custom property and a computed colour
  // for one the theme cross-fade registered — helpers.js says why.
  const [ruleRgb, goldRgb] = await tokenColours(page, '--rule', '--gold');
  expect(m.afterBackground).toBe(ruleRgb);
  expect(m.afterBackground, 'the date rule is gold again').not.toBe(goldRgb);
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

  await desk(page);
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
   * fills that silence, in the strict direction, and STRUCTURE.md carries
   * the reversal in place. What did *not* change, and is the reason this test
   * still earns its name: the note is still not quoted back. A grade the site
   * defaulted to was not read out of «Пост», and the bubble prints a
   * quotation only where the quotation says more than the label above it.
   */
  await ready(page, { church: 'serbian', reckoning: null });

  await desk(page);
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
  // an empty quotation would be the furniture STRUCTURE.md 5b refuses.
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

  await desk(page);
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
  // Removed, not shortened (STRUCTURE.md): no scale, no fade, no wait.
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
  // Past 1024 px the whole life is read in its own column (stage E).
  if (await page.evaluate(() => innerWidth >= 1024)) {
    await expect(page.locator('.cal-read [data-read-life]')).toContainText('Gerasim, Pitirim and Jonah were bishops of Great Perm');
    return;
  }
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
   * a published rendering where one exists and one made here where it does
   * not, and the one made here says so under the text rather than naming a
   * book it does not have.
   */
  await ready(page);
  await page.goto('/calendar/2026-09-11', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-hymns] .hymn-own')).toHaveCount(0);
  await expect(page.locator('[data-hymns] .hymn-text[lang="en"]').first())
    .toContainText('The memory of a righteous one');
  // the kontakion has no book to cite, so the rendering made here says so
  const madeHere = page.locator('[data-hymns] .hymn[data-rendered="site"]');
  await expect(madeHere.locator('.hymn-text')).toContainText('The glorious beheading of the Forerunner');

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

  await desk(page);
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
  // Four figures carry their own era. Until 2026-09-06 this read "Reposed
  // 1937"; the day's 1937 martyrs have birth years from their own lives now
  // (John Nikolsky 1878, Nicholas Dobroumov 1875 or 1876), so the card is a
  // lifespan — the point, that no AD follows a four-figure year, is unchanged.
  await expect(dates.filter({ hasText: /1937/ }).first()).toBeVisible();
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
  // Past 1024 px the card is the picture alone and its words head column 3.
  test.skip(await page.evaluate(() => innerWidth >= 1024), 'the card has no body past 1024 px');
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


test('a feast hymn is English for an English reader, on every calendar that sings one', async ({ browser }) => {
  /*
   * **The day the author saw it** (2026-09-17): Saturday 13 September, Greek
   * and Romanian, English chosen, and the hymns in Greek and Romanian. The
   * 2026-09-12 pass had given every hymn in `saints/` an English rendering and
   * left the *feast* hymns of `data/liturgical-days.js` untouched — 201 of 211
   * of them — because `scripts/hymn-english.mjs` walks the corpus folders and
   * has never seen the records. `ui/hymns.js` was choosing correctly the whole
   * time; there was nothing to choose.
   *
   * A test that stood here asserted the gap instead, on the reasoning that it
   * would "go quiet on its own the day the feast hymns are translated". It did
   * not go quiet, it went red, which is the better outcome and the reason this
   * one is written the other way round: the day is asked what it holds and
   * nothing is pinned to a slug, so it stays true as the records grow.
   */
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await searchMode(page);
  await page.addInitScript(() =>
    localStorage.setItem('gos-settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('gos-settings') ?? '{}'), church: 'greek', language: 'en' })),
  );
  for (const [church, iso] of [['greek', '2026-09-13'], ['romanian', '2026-09-13'], ['greek', '2026-09-14']]) {
    await page.addInitScript((id) =>
      localStorage.setItem('gos-settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('gos-settings') ?? '{}'), church: id, language: 'en' })),
    church);
    await page.goto(`/calendar/${iso}`, { waitUntil: 'networkidle' });
    const hymns = page.locator('[data-hymns] .hymn');
    expect(await hymns.count(), `premise: ${church} ${iso} still sings`).toBeGreaterThan(0);
    // Every text on the page is the English one, and every one of them says
    // which kind of claim it is — a book, or a rendering made here.
    await expect(page.locator('[data-hymns] .hymn-text:not([lang="en"])')).toHaveCount(0);
    for (const foot of await page.locator('[data-hymns] .hymn-source').allTextContents()) {
      expect(foot.trim(), `${church} ${iso}: a hymn says where its English came from`).toMatch(/Rendered for this site|Text from \S/);
    }
  }
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


/**
 * **Serves the page a manifest with every saint any church keeps on `iso`
 * withheld** (or on each of several — one route, since a second on the same
 * URL would shadow the first), and returns what it withheld and how often it served. A silence
 * is a state the corpus grows out of, one day per batch, so a test of what a
 * bare day says cannot wait for the corpus to leave one bare; it makes the day
 * bare instead, the same way whichever batches have landed on it (2026-09-16).
 * The day is read by `keptOn`, not by the page's feast index, and in all four
 * churches, because a folder the reader's church does not keep still changes
 * the note to "Nothing in the Russian calendar today".
 *
 * The service worker precaches the manifest and serves it on the next visit,
 * which `page.route` never sees (trap 13), so the tests using this block it,
 * and `served()` is asserted so a route that matched nothing fails shut.
 */
async function withoutSaintsOn(page, ...isos) {
  const withheld = new Set(isos.flatMap((iso) => CHURCHES.flatMap((c) => keptOn(c.id, iso))));
  let served = 0;
  await page.route('**/data/manifest.json', async (route) => {
    const response = await route.fetch();
    const cards = await response.json();
    served += 1;
    await route.fulfill({ response, json: cards.filter((s) => !withheld.has(s.slug)) });
  });
  return { withheld, served: () => served };
}

/**
 * **How far the corpus reaches for `church`, stated as the rule the page
 * prints rather than read off it**: from today, the last day of a run of kept
 * days that tolerates a fortnight of silence and stops at anything longer
 * (`views/daily/entries.js`), over the manifest less `withheld`.
 */
function reachOf(church, withheld) {
  const now = new Date();
  let day = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  let last = null;
  let empty = 0;
  for (let i = 0; i < 500; i += 1, day += 86_400_000) {
    const iso = new Date(day).toISOString().slice(0, 10);
    if (keptOn(church, iso).some((slug) => !withheld.has(slug))) {
      last = day;
      empty = 0;
    } else if (last !== null && (empty += 1) > 14) break;
  }
  return last === null
    ? ''
    : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(last);
}

test.describe('the silences, on a day made bare', () => {
test.use({ serviceWorkers: 'block' });

test('a day whose calendar is recorded but whose saints are not says which half is missing', async ({ page }) => {
  /*
   * `emptyDayNote` told two silences apart: the corpus having nothing, and
   * this church having nothing while another has something. Amendment 44 made
   * a third — the day records now run to January and the saints stop on 19
   * September — and the old wording called such a day "an empty day" directly
   * above its own readings and a dozen hymns, which said the opposite of what
   * the page showed.
   *
   * Both days are made bare by `withoutSaintsOn` (2026-09-16): they were bare
   * in the corpus, and the batches starting that day reach both of them.
   */
  const bare = await withoutSaintsOn(page, '2026-10-14', '2027-03-01');
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
  expect(bare.served(), 'the withholding route never served the page').toBeGreaterThan(0);
});
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

  await desk(page);
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
   * (lib/fast-grade.js argues the direction; STRUCTURE.md records the
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

  await desk(page);
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

  await desk(page);
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
        // `.hero-body` below 1024 px, the reading column's pinned head past it.
        const body = h2.parentElement;
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

  await desk(page);
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


test.describe('the reach, on a day made bare', () => {
test.use({ serviceWorkers: 'block' });

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
  // Made bare before anything loads: the reach sentence is only printed on a
  // day with no folders, and the day below is the next batch's.
  const bare = await withoutSaintsOn(page, '2026-09-29');
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
   * And the reach is a date read off the corpus, not a literal - and a
   * church fact: the reach walks the reader's own calendar (entries.js).
   * Until 2026-09-16 this asserted "28 September 2026", which was the right
   * answer on the day and went red on the first batch past it; the answer is
   * now worked out here from the manifest by `reachOf`, over the same
   * manifest the page was served, less the day made bare.
   */
  // Not the 27th: that is the Exaltation of the Cross, and a Great Feast day
  // prints the feast's own sentence rather than the reach.
  const reach = reachOf('russian', bare.withheld);
  expect(reach, 'premise: the Russian calendar has no run of folders from today').not.toBe('');
  await page.goto('/calendar/2026-09-29', { waitUntil: 'networkidle' });
  await expect(page.locator('.empty-day')).toContainText(`the corpus reaches ${reach} so far`);
  await expect(page.locator('.empty-day')).not.toContainText('19 September so far');
  expect(bare.served(), 'the withholding route never served the page').toBeGreaterThan(0);
});
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

  await desk(page);
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
  /*
   * **The masthead, not the strip's own Daily button** (2026-09-08). The two
   * go to the same place and only one of them still cross-fades: a press on the
   * phone's nav strip skips the transition on purpose since Amendment 108, so
   * that the strip's own glide is visible instead of frozen under a snapshot of
   * the page. This test's instrument *is* the transition — it reads `scrollY`
   * at `ready`, which is the moment the fade is composed — so it has to press
   * something that still runs one. The promise being measured is unchanged and
   * belongs to the section restore, not to either button; the strip's own path
   * is checked below, by where it lands.
   */
  await press('[data-site-home]');

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

  /*
   * **And the strip's own Daily button keeps the same promise on the path that
   * no longer fades** (2026-09-08). There is no transition to read `ready`
   * from there, so this measures the thing the reader actually cares about —
   * where the page ends up — rather than the frame the fade was composed at.
   * Without it the section restore would be unwatched on the one route a phone
   * reader takes most.
   */
  await press('nav.site-nav a[href$="/saints"]');
  await expect(page.locator('.index-controls')).toBeVisible();
  await press('nav.site-nav a[data-nav-daily]');
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeGreaterThanOrEqual(deep - 4);
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


test('the day is four columns on a desktop and one on a phone', async ({ page }) => {
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
   * **Four columns since 2026-09-16**, and they are four boxes. The day, the
   * chosen saint, what is being read of them, and the rest of the day — the
   * mockup's Today face. The wrappers are what is measured rather than the
   * panels inside them: the panels are what the roll swaps, the columns are
   * the layout, and only separate boxes can scroll and grow apart.
   */
  const day = await boxOf('.cal-main');
  const saint = await boxOf('.cal-saint');
  const read = await boxOf('.cal-read');
  const shelf = await boxOf('.cal-bubble');

  // In that order across the page, each beginning where the last one ends.
  for (const [left, right, what] of [
    [day, saint, 'the saint is not beside the day'],
    [saint, read, 'what is read is not beside the saint'],
    [read, shelf, 'the shelf is not beside what is read'],
  ]) {
    expect(right.x, what).toBeGreaterThan(left.x + left.width - 1);
  }
  /*
   * **The reading column takes the slack and is the widest of the four.** The
   * other three are a width apiece — `--side-w` twice and `--saint-w` — and
   * this one is `minmax(0, 1fr)`, which is the whole of why the prose is the
   * thing the window is spent on.
   */
  for (const [other, what] of [
    [day, 'the day column is wider than the reading column'],
    [saint, 'the saint column is wider than the reading column'],
    [shelf, 'the shelf is wider than the reading column'],
  ]) {
    expect(read.width, what).toBeGreaterThan(other.width);
  }

  /*
   * All four start under the site's bar, which spans the page here as on every
   * other route (author, 2026-09-17), and start and end on one line. Asserted
   * against the bar rather than against a number, so a column that drifted up
   * into the bar's band would fail it.
   */
  const bar = await boxOf('.chrome-bar');
  for (const [col, what] of [
    [day, 'the day column does not start under the bar'],
    [saint, 'the saint column does not start under the bar'],
    [read, 'the reading column does not start under the bar'],
    [shelf, 'the shelf does not start under the bar'],
  ]) {
    expect(col.y, what).toBeGreaterThan(bar.y + bar.height - 1);
    expect(Math.abs(shelf.y - col.y), 'the columns do not start on one line').toBeLessThan(1);
    expect(Math.abs(shelf.y + shelf.height - (col.y + col.height)), 'the columns do not end on one line').toBeLessThan(1);
  }

  /*
   * The picker moved into the day's own column on 2026-09-16, where it had
   * been the first thing in the bubble since 2026-09-10. It is above the
   * church's own readings and on the same left edge — a claim about two boxes
   * in different grids, the controls belonging to `.cal-main` and the readings
   * to the side panel inside it, so it is measured rather than read off the
   * markup.
   */
  const controls = await boxOf('.cal-controls');
  const side = await boxOf('.cal-side');
  // The column's content edge: the page's own inset is paid inside the day's
  // column since stage B of the mockup review.
  const dayInset = await page.locator('.cal-main').evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft));
  expect(Math.abs(controls.x - (day.x + dayInset)), 'the picker is not on the day’s own column').toBeLessThan(2);
  expect(controls.y, 'the picker is not above the readings').toBeLessThan(side.y);

  /*
   * **Every column scrolls itself and the page does not.** The mockup's own
   * bug is what this is against: a tightening pass left two of its four
   * columns at `overflow: visible` and a thousand pixels of saints had no way
   * to be reached. So all four are asked, not the one that happens to be
   * longest today.
   */
  const scrolling = await page.evaluate(() => {
    const boxes = ['.cal-main', '.cal-saint', '.cal-read', '.cal-bubble-scroll'].map((sel) => {
      const box = document.querySelector(sel);
      return { sel, overflowY: getComputedStyle(box).overflowY, minHeight: getComputedStyle(box).minHeight };
    });
    const shelfBox = document.querySelector('.cal-bubble-scroll');
    shelfBox.scrollTop = 150;
    return {
      boxes,
      shelfScrolled: shelfBox.scrollTop,
      page: document.documentElement.scrollHeight - window.innerHeight,
    };
  });
  for (const box of scrolling.boxes) {
    expect(box.overflowY, `${box.sel} is not a scroller of its own`).toBe('auto');
    expect(box.minHeight, `${box.sel} has no floor of 0 and will grow to its content`).toBe('0px');
  }
  expect(scrolling.shelfScrolled, 'the shelf does not scroll on its own').toBeGreaterThan(0);
  expect(scrolling.page, 'the page still scrolls behind the columns').toBeLessThanOrEqual(1);

  // What is in each, structurally rather than by looking at the picture.
  await expect(page.locator('.cal-main .cal-date')).toHaveCount(1);
  await expect(page.locator('.cal-main [data-readings]')).toHaveCount(1);
  await expect(page.locator('.cal-main [data-namedays]')).toHaveCount(1);
  await expect(page.locator('.cal-saint .hero')).toHaveCount(1);
  await expect(page.locator('.cal-saint [role="tablist"] [role="tab"]')).toHaveCount(3);
  await expect(page.locator('.cal-read [data-read-life]')).toHaveCount(1);
  await expect(page.locator('.cal-read [data-hymns]')).toHaveCount(1);
  await expect(page.locator('.cal-bubble .register-cards')).toHaveCount(1);
  // And nothing painted into the phone's own panel, which is not drawn here.
  await expect(page.locator('.cal-main .hero')).toHaveCount(0);

  /*
   * Continue reading stays at the foot of the day's own column rather than
   * moving to the shelf with the register, and the reason is the phone: the
   * document order under these wrappers is the phone's reading order, and
   * carrying the shelf into the bubble would put it after the readings and the
   * name days in what a screen reader hears. Its box is the column's.
   */
  const shelves = await boxOf('.shelves');
  await expect(page.locator('.shelves')).toContainText('Continue reading');
  expect(Math.abs(shelves.x - (day.x + dayInset)), 'Continue reading does not sit on the day’s column').toBeLessThan(2);
  expect(shelves.width, 'Continue reading runs wider than the column it belongs to').toBeLessThan(day.width + 2);

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


test('choosing a saint from the shelf fills the middle columns and moves nothing else', async ({ page }) => {
  /*
   * The selection model the four columns exist for (the mockup's Today face,
   * 2026-09-12): "choosing a saint moves nothing and reading a long life
   * carries nothing else with it". The page had one hero and a register under
   * it until 2026-09-16; it has a shelf of the whole day now, and a press on a
   * row puts that saint in the two middle columns.
   *
   * Three claims, and the third is the one that costs something to check:
   *
   * - the press changes who is in the saint column and whose life is in the
   *   reading column;
   * - the saint in the card leaves the shelf, and the one it replaced returns;
   * - nothing else moves — not the day, not the reader's place in the shelf,
   *   not the reader's place in the day's own column.
   *
   * 22 September, which carries enough saints for the shelf to overflow its
   * column, so there is a scroll position to keep.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-09-22', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const state = () =>
    page.evaluate(() => ({
      saint: document.querySelector('.cal-read .hero-name')?.textContent.trim(),
      read: document.querySelector('.cal-read [data-read-life]')?.dataset.readLife,
      hidden: [...document.querySelectorAll('[data-choose]')]
        .filter((r) => !r.offsetParent)
        .map((r) => r.dataset.choose),
      current: [...document.querySelectorAll('[data-choose][aria-current="true"]')].map((r) => r.dataset.choose),
      date: document.querySelector('h1').textContent.trim(),
      shelfTop: document.querySelector('.cal-bubble-scroll').scrollTop,
      dayTop: document.querySelector('.cal-main').scrollTop,
      kept: [...document.querySelectorAll('[data-choose]')].filter((r) => r.__wasHere !== undefined).length,
    }));

  let before = await state();
  expect(before.hidden.length, 'the day’s own saint is not marked in the shelf').toBe(1);
  expect(before.current, 'the marked row and the hidden row are not the same row').toEqual(before.hidden);

  /*
   * Somewhere to come back to, in both scrollers, and a mark on one of the
   * shelf's own rows: "nothing is rebuilt" is a claim about the elements, and
   * a property set on a node in the page survives exactly as long as the node
   * does.
   */
  await page.evaluate(() => {
    document.querySelector('.cal-bubble-scroll').scrollTop = 200;
    document.querySelector('.cal-main').scrollTop = 120;
    document.querySelectorAll('[data-choose]').forEach((row, i) => {
      row.__wasHere = i;
    });
  });
  before = await state();

  /*
   * The picture, not the name: the row carries two anchors to the saint's own
   * page and both still go there. Everything else in the row chooses.
   */
  const target = page.locator('[data-choose]:visible').nth(2);
  const chosen = await target.evaluate((row) => row.dataset.choose);
  expect(chosen, 'premise: the row pressed is the one already in the card').not.toBe(before.hidden[0]);
  // Dispatched, not clicked: `locator.click()` scrolls its target into view
  // (trap 3), which is exactly the movement this test is about to assert did
  // not happen.
  await target.locator('.reg-thumb').dispatchEvent('click');

  const after = await state();
  expect(after.saint, 'the saint column did not change').not.toBe(before.saint);
  expect(after.read, 'the reading column is not showing the chosen saint').toContain(chosen);
  expect(after.hidden, 'the chosen saint did not leave the shelf').toEqual([chosen]);
  expect(after.current, 'the chosen row is not marked as the one being read').toEqual([chosen]);

  expect(after.date, 'choosing a saint changed the day').toBe(before.date);
  expect(after.dayTop, 'the day’s own column lost the reader’s place').toBe(120);
  /*
   * **The shelf keeps its rows and its place, and its place is not a number.**
   * `scrollTop` is not stable across the press and should not be: the saint
   * that left the card comes back above the reader's position, and the
   * browser's own scroll anchoring moves `scrollTop` by that row's height so
   * that what the reader is looking at does not move — which is the promise,
   * kept by the engine rather than by us. Measured: 200 before, 321 after, and
   * the row in between grew back by the difference. So what is asserted is
   * that the shelf was not returned to its top, and that the rows in it are
   * the same elements — the mockup's "hidden rather than removed, so nothing
   * is rebuilt and no picture is fetched twice".
   */
  expect(after.shelfTop, 'the shelf was scrolled back to its top').toBeGreaterThan(100);
  expect(after.kept, 'the shelf was rebuilt rather than re-marked').toBe(before.kept);

  // And the saint it replaced is back on the shelf to be chosen again.
  await expect(page.locator(`[data-choose="${before.hidden[0]}"]`)).toBeVisible();

  // The day step puts the choice back: a choice is about a day and does not
  // survive one.
  await page.locator('.day-step-next').dispatchEvent('click');
  await expect.poll(async () => (await state()).hidden.length).toBe(1);
  await expect.poll(async () => (await state()).hidden[0]).not.toBe(chosen);
});


test('a phone has no shelf to choose from', async ({ page }) => {
  /*
   * The other half of the rule, and the one that keeps the phone out of this:
   * below 1024 px the day is one hero with the register under it, the hero is
   * the page's own choice, and there is no second column to put a chosen saint
   * in — so no row is a choosing surface and the day's own saint is not
   * printed twice.
   */
  await ready(page);
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/calendar/2026-09-22', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-choose]')).toHaveCount(0);
  const hero = await page.locator('.hero-name').textContent();
  const names = await page.locator('[data-register] .reg-name').allTextContents();
  expect(names, 'the day’s own saint is printed twice on a phone').not.toContain(hero.trim());
});


test('past 1024 px the four columns take the mockup’s widths, edge to edge', async ({ page }) => {
  /*
   * `../mockup-review/REVIEW.md` finding 5, stage B (2026-09-18). The mockup's
   * Today face is `--side-w` `--saint-w` `minmax(0, 1fr)` `--side-w`, the outer
   * two `clamp(240px, 21vw, 310px)` and the saint `clamp(230px, 23vw, 360px)`,
   * across the window's whole width with the page's 32 px inside the two outer
   * columns. Before the stage the saint column was 245 px at 1440 against the
   * mockup's 331, and the shelf a fixed 304 behind a 32 px gutter.
   *
   * Widths are asserted against the clamps worked on this window's own
   * `innerWidth` rather than against the review's numbers, which are for a
   * window with no scrollbar gutter; the reading column takes what is left,
   * which on a desk with a classic scrollbar is 15 px less than the mockup's.
   * 1024 is asked too: the narrowest desk must still leave the prose a column.
   */
  await ready(page);
  for (const [width, height] of [[1440, 900], [1280, 800], [1024, 768]]) {
    await page.setViewportSize({ width, height });
    await page.goto('/calendar/2026-09-09', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const m = await page.evaluate(() => {
      const box = (sel) => {
        const el = document.querySelector(sel);
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          left: r.left,
          right: r.right,
          width: r.width,
          padL: parseFloat(cs.paddingLeft),
          padR: parseFloat(cs.paddingRight),
          rule: parseFloat(cs.borderLeftWidth),
        };
      };
      return {
        inner: innerWidth,
        // The laid-out page, which is a reserved scrollbar gutter narrower than
        // `clientWidth` reports on a desk (base.css, `scrollbar-gutter`).
        client: document.body.getBoundingClientRect().right,
        cols: ['.cal-main', '.cal-saint', '.cal-read', '.cal-bubble'].map(box),
      };
    });
    const clamp = (lo, v, hi) => Math.min(hi, Math.max(lo, v));
    const side = clamp(240, m.inner * 0.21, 310);
    const saint = clamp(230, m.inner * 0.23, 360);
    const [day, pic, read, shelf] = m.cols;
    const at = `at ${width}`;

    expect(Math.abs(day.width - side), `the day column is ${day.width} px ${at}, not ${side}`).toBeLessThan(1);
    expect(Math.abs(shelf.width - side), `the shelf is ${shelf.width} px ${at}, not ${side}`).toBeLessThan(1);
    expect(Math.abs(pic.width - saint), `the saint column is ${pic.width} px ${at}, not ${saint}`).toBeLessThan(1);

    // Edge to edge, shoulder to shoulder: no gutter track and no gap.
    expect(Math.abs(day.left), `the grid does not start at the window’s edge ${at}`).toBeLessThan(1);
    expect(Math.abs(shelf.right - m.client), `the grid does not end at the window’s edge ${at}`).toBeLessThan(1);
    for (const [l, r, what] of [[day, pic, 'day and saint'], [pic, read, 'saint and reading'], [read, shelf, 'reading and shelf']]) {
      expect(Math.abs(r.left - l.right), `a gap between ${what} ${at}`).toBeLessThan(1);
    }
    // The page's inset is paid inside the outer two, and a hairline stands at
    // the leading edge of each of the other three.
    expect(day.padL, `the day column does not carry the page’s inset ${at}`).toBe(32);
    expect(shelf.padR, `the shelf does not carry the page’s inset ${at}`).toBe(32);
    expect([pic.rule, read.rule, shelf.rule], `a column has no hairline at its leading edge ${at}`).toEqual([1, 1, 1]);

    // The proportion the review measured, and the prose still a column.
    if (width >= 1280) {
      const ratio = pic.width / read.width;
      expect(ratio, `saint : reading is ${ratio.toFixed(2)} ${at}, the mockup's is 0.66`).toBeGreaterThan(0.6);
      expect(ratio, `saint : reading is ${ratio.toFixed(2)} ${at}, the mockup's is 0.66`).toBeLessThan(0.72);
    }
    expect(read.width, `the reading column is ${read.width} px ${at}`).toBeGreaterThan(280);
  }
});

test('the right column is a plain column: no fill, no corners, a rule at its edge', async ({ page }) => {
  /*
   * `../mockup-review/REVIEW.md` finding 7's container, stage B (2026-09-18).
   * The mockup's `.shelf-col` has no fill and no corners; the live one was a
   * `--bub` box with a 20 px bite and a cross in each corner. So: nothing is
   * painted under the shelf but the page, nothing clips it, and a point three
   * pixels in from its top corner is the shelf's own — where the bite used to
   * hand that point to whatever stood under the box (trap 14: what is drawn,
   * not what the sheet says).
   */
  await ready(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/calendar/2026-09-09', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const seen = await page.evaluate(() => {
    const bubble = document.querySelector('.cal-bubble');
    const scroll = document.querySelector('.cal-bubble-scroll');
    const b = bubble.getBoundingClientRect();
    const own = (dx, dy) => {
      const el = document.elementFromPoint(Math.round(b.left + dx), Math.round(b.top + dy));
      return !!el && bubble.contains(el);
    };
    const grid = document.querySelector('.month-grid');
    return {
      // The chain of boxes between the column and its panel; a fill on any of
      // them is a shaded box again.
      paints: [...document.querySelectorAll('.cal-bubble, .cal-bubble *')]
        .filter((el) => el === bubble || el.parentElement === bubble || el.matches('.cal-bubble-scroll > *, .cal-bubble-scroll > * > .day-panel'))
        .map((el) => getComputedStyle(el).backgroundColor)
        .filter((c) => c !== 'rgba(0, 0, 0, 0)'),
      clips: [bubble, scroll].map((el) => getComputedStyle(el).clipPath),
      decorations: document.querySelectorAll('.cal-notch, .cal-bubble-fill').length,
      cornerTL: own(3, 3),
      // Bottom-left rather than top-right: the first-visit coachmark stands
      // over the top-right corner.
      cornerBL: own(3, b.height - 3),
      rule: getComputedStyle(bubble).borderLeftColor,
      readRule: getComputedStyle(document.querySelector('.cal-read')).borderLeftColor,
      headGround: getComputedStyle(bubble.querySelector('.register-head')).backgroundColor,
      bodyGround: getComputedStyle(document.body).backgroundColor,
      gridWidth: Math.round(grid.getBoundingClientRect().width),
      monthColumn: (() => {
        const col = document.querySelector('.cal-main');
        const cs = getComputedStyle(col);
        return Math.round(
          col.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
        );
      })(),
      cellWidths: [...new Set([...grid.children].map((c) => Math.round(c.getBoundingClientRect().width)))],
      /*
       * The widest numeral the month actually draws, measured rather than
       * assumed. The floor here was 36 px while the month stood in a 272 px
       * column; it is the day's own column now, 26 px a cell at the narrow end
       * of the desk, and a number written for the old box would fail a page
       * that is drawing its dates perfectly well. What the assertion is for is
       * that a cell holds its numeral, so the numeral is what it is compared
       * against.
       */
      numeralWidth: Math.max(
        ...[...grid.querySelectorAll('.day-num')].map((n) => Math.ceil(n.getBoundingClientRect().width)),
      ),
      cellsWrap: [...grid.children].some((c) => c.getBoundingClientRect().height > 30),
    };
  });

  expect(seen.paints, 'something paints a fill under the shelf').toEqual([]);
  expect(seen.clips, 'the shelf clips its corners').toEqual(['none', 'none']);
  expect(seen.decorations, 'the corner crosses or the fill are still in the page').toBe(0);
  expect(seen.cornerTL, 'the top-left corner is still bitten out').toBe(true);
  expect(seen.cornerBL, 'the bottom-left corner is still bitten out').toBe(true);
  expect(seen.rule, 'the shelf’s hairline is not the other columns’').toBe(seen.readRule);
  expect(seen.headGround, 'the pinned head does not stand on the page’s ground').toBe(seen.bodyGround);

  expect(seen.gridWidth, 'the month grid is not the width of the column it stands in').toBe(seen.monthColumn);
  expect(seen.cellWidths.length, 'the month cells are not one width').toBe(1);
  expect(seen.numeralWidth, 'premise: the month draws no numerals to measure').toBeGreaterThan(0);
  expect(
    seen.cellWidths[0],
    `a month cell is ${seen.cellWidths[0]} px against a ${seen.numeralWidth} px numeral`,
  ).toBeGreaterThan(seen.numeralWidth + 2);
  expect(seen.cellsWrap, 'a month cell wrapped its numeral in the day’s own column').toBe(false);
});


test('past 1024 px Daily keeps the site’s whole header, its three controls in it, and still does not scroll', async ({ page }) => {
  /*
   * Author, 2026-09-17: "The header is meant to stay the same, not shorten and
   * lose the calendar/language and light toggle buttons." From 2026-09-10 the
   * bar on Daily was cut to the reading columns' width and the three controls
   * were moved into the head of the shelf; this pins the reversal.
   *
   * Asserted against All Saints rather than against numbers: the claim is
   * "the same as the rest of the site", so the bar's box and each control's
   * box are read on both routes and must agree. Each ID exists once and lives
   * in the bar.
   *
   * What the shortened bar was buying is asserted too: the four columns start
   * under the bar and end inside the window, and the document does not scroll.
   */
  await ready(page);
  const IDS = ['lang-open', 'church-open', 'theme-toggle'];
  const read = (route) =>
    page.evaluate(
      async ({ ids }) => {
        await document.fonts.ready;
        const r = (el) => {
          const b = el.getBoundingClientRect();
          return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)];
        };
        const bar = document.querySelector('.chrome-bar');
        const cols = ['.cal-main', '.cal-saint', '.cal-read', '.cal-bubble']
          .map((s) => document.querySelector(s))
          .filter((el) => el && el.clientWidth > 0)
          .map((el) => el.getBoundingClientRect());
        return {
          bar: r(bar),
          controls: ids.map((id) => r(document.getElementById(id))),
          inBar: ids.map((id) => bar.contains(document.getElementById(id))),
          counts: ids.map((id) => document.querySelectorAll(`#${CSS.escape(id)}`).length),
          barBottom: bar.getBoundingClientRect().bottom,
          cols: cols.map((b) => [b.top, b.bottom]),
          scrolls: document.documentElement.scrollHeight > innerHeight || document.body.scrollHeight > innerHeight,
          innerHeight,
        };
      },
      { ids: IDS },
    );

  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/saints', { waitUntil: 'networkidle' });
    const site = await read('/saints');
    await page.goto('/calendar/2026-09-11', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const daily = await read('/calendar');

    expect(daily.counts, `${width}: a control is drawn more than once`).toEqual([1, 1, 1]);
    expect(daily.inBar, `${width}: a control is not in the site’s bar`).toEqual([true, true, true]);
    expect(daily.bar, `${width}: Daily’s bar is not All Saints’ bar`).toEqual(site.bar);
    expect(daily.controls, `${width}: Daily’s controls do not stand where All Saints’ do`).toEqual(site.controls);

    expect(daily.cols.length, `premise: ${width} draws the four columns`).toBe(4);
    for (const [top, bottom] of daily.cols) {
      expect(top, `${width}: a column starts under the bar’s foot`).toBeGreaterThanOrEqual(daily.barBottom);
      expect(bottom, `${width}: a column runs past the window`).toBeLessThanOrEqual(daily.innerHeight);
    }
    expect(daily.scrolls, `${width}: the page scrolls`).toBe(false);
  }
});


test('past 1024 px the picture has a column and the words have the next one', async ({ page }) => {
  /*
   * The desk takes the hero apart at one seam: the picture in column 2, and
   * the name over the words in column 3 (`../mockup-review/REVIEW.md`
   * findings 3 and 4, stage D). 24 September: Theodora of Alexandria, whose
   * icon and life are both there to place.
   */
  await ready(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/calendar/2026-09-24', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // The life arrives with the payload.
  await expect(page.locator('.cal-read [data-read-life] p').first()).toBeVisible();

  const m = await page.evaluate(() => ({
    hero: document.querySelector('.hero').getBoundingClientRect(),
    mount: document.querySelector('.hero-figure').getBoundingClientRect(),
    media: document.querySelector('.hero-media').getBoundingClientRect(),
    // The reading column's own text box, which is where the life is drawn past
    // 1024 px, and the name that heads it (stage D).
    body: document.querySelector('.cal-read .read-pane:not([hidden])').getBoundingClientRect(),
    name: document.querySelector('.cal-read .hero-head .hero-name').getBoundingClientRect(),
    lede: document.querySelector('.cal-read [data-read-life]').getBoundingClientRect(),
    namesInSaint: document.querySelectorAll('.cal-saint .hero-name').length,
  }));

  expect(m.body.left, 'the words are not in the column after the picture').toBeGreaterThan(m.mount.right);
  expect(m.lede.height, 'the life is not shown').toBeGreaterThan(0);
  // The name heads the words rather than standing under the picture.
  expect(m.namesInSaint, 'the saint column still carries the name').toBe(0);
  expect(m.name.bottom, 'the name is not over the life').toBeLessThanOrEqual(m.body.top + 1);
  expect(Math.abs(m.name.left - m.body.left), 'the name is not on the life’s own edge').toBeLessThan(1);
});

test('past 1024 px the picture is the saint column’s width in its own shape, and the name heads the reading column, pinned', async ({ page }) => {
  /*
   * `../mockup-review/REVIEW.md` findings 3 and 4, stage D. The mockup's
   * `.card-media` is the column's whole width at the icon's own aspect, no
   * taller than A4 or half the window, no mat, with the credit under it and nothing drawn for a
   * saint with no icon; its `.read-head` stands at the top of the reading
   * column and stays there while the life scrolls under it. Before this the
   * picture was a fixed 3:2 inside a 14 px dark mat and the name was under it
   * in column 2.
   *
   * Three saints, one per shape the rule treats differently: Theodora of
   * Alexandria (landscape, drawn whole), Symeon the Stylite (taller than A4,
   * cut to it) and Euphrosynus the Cook (no icon). Each premise is read off
   * the manifest's own numbers, not assumed.
   */
  await ready(page, { church: 'romanian' });
  const A4 = 0.7071;
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
  ]) {
    await page.setViewportSize({ width, height });

    const picture = () =>
      page.evaluate(() => {
        const col = document.querySelector('.cal-saint');
        const figure = col.querySelector('.hero-figure');
        const media = col.querySelector('.hero-media');
        const img = media?.querySelector('img');
        const credit = col.querySelector('[data-hero-credit]');
        const cs = getComputedStyle(col);
        const inner = col.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        return {
          names: col.querySelectorAll('.hero-name').length,
          inner,
          figure: figure && { w: figure.getBoundingClientRect().width, pad: getComputedStyle(figure).paddingTop, bg: getComputedStyle(figure).backgroundColor },
          media: media && media.getBoundingClientRect().toJSON(),
          natural: img && img.width / img.height,
          file: img?.currentSrc.split('/').pop(),
          credit: credit && credit.clientWidth > 0 ? credit.getBoundingClientRect().top : null,
        };
      });

    // Theodora: a landscape icon, drawn whole at the column's width.
    await page.goto('/calendar/2026-09-11', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('.cal-read .hero-head .hero-name')).toContainText('Theodora of Alexandria');
    await expect(page.locator('.cal-saint [data-hero-credit]')).toBeVisible();
    let p = await picture();
    expect(p.names, `${width}: the saint column still carries the name`).toBe(0);
    expect(p.figure.pad, `${width}: the picture stands in a mat`).toBe('0px');
    expect(p.figure.bg, `${width}: the picture stands on a ground of its own`).toBe('rgba(0, 0, 0, 0)');
    expect(Math.abs(p.media.width - p.inner), `${width}: the picture is not the column's width`).toBeLessThanOrEqual(1);
    expect(p.natural, 'premise: Theodora’s icon is landscape').toBeGreaterThan(1);
    expect(Math.abs(p.media.width / p.media.height - p.natural), `${width}: the landscape icon is not in its own shape`).toBeLessThan(0.02);
    expect(p.file, `${width}: the column is not drawn from the card derivative`).toBe('icon-card.jpg');
    expect(p.credit, `${width}: the credit is not under the picture`).toBeGreaterThanOrEqual(p.media.bottom);

    /*
     * Pinned: the head's top does not move while the column scrolls, and the
     * life does go under it. Set on the scroller rather than wheeled, because
     * what is asserted is where the head stands at a scroll position.
     */
    const head = () =>
      page.evaluate(() => {
        const col = document.querySelector('.cal-read');
        return { col: col.getBoundingClientRect().top, top: document.querySelector('.cal-read .hero-head').getBoundingClientRect().top, scroll: col.scrollTop };
      });
    const rest = await head();
    await page.evaluate(() => {
      document.querySelector('.cal-read').scrollTop = 300;
    });
    await expect.poll(async () => (await head()).scroll, `${width}: premise: the reading column scrolls`).toBeGreaterThan(200);
    const moved = await head();
    expect(Math.abs(moved.top - rest.top), `${width}: the name scrolled away with the life (${rest.top} -> ${moved.top})`).toBeLessThanOrEqual(1);
    expect(moved.top - moved.col, `${width}: the pinned name is not at the column's top`).toBeLessThanOrEqual(1);

    // Symeon the Stylite: taller than A4, so cut to A4 at the column's width.
    await page.goto('/calendar/2026-09-01', { waitUntil: 'networkidle' });
    await expect(page.locator('.cal-read .hero-name')).toContainText('Symeon the Stylite');
    p = await picture();
    expect(p.natural, 'premise: Symeon’s icon is taller than A4').toBeLessThan(A4);
    expect(Math.abs(p.media.width - p.inner), `${width}: the tall picture is not the column's width`).toBeLessThanOrEqual(1);
    expect(Math.abs(p.media.width / p.media.height - A4), `${width}: the tall icon is not cut to A4`).toBeLessThan(0.01);
    expect(p.media.height, `${width}: the picture is taller than half the window`).toBeLessThanOrEqual(height * 0.5 + 1);

    // Euphrosynus the Cook: no icon, so no box at all — not a blank one.
    await page.goto('/calendar/2026-09-11', { waitUntil: 'networkidle' });
    const row = page.locator('.cal-bubble [data-choose*="euphrosynus"]');
    await row.evaluate((r) => r.querySelector('.reg-sub').click());
    await expect(page.locator('.cal-read .hero-name')).toContainText('Euphrosynus');
    p = await picture();
    expect(p.figure, `${width}: a saint with no icon is drawn a picture box`).toBe(null);
    expect(p.names, `${width}: the saint column carries the name`).toBe(0);
  }
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
   *
   * **The doubling is measured on `/saints` since 2026-09-10**, and only the
   * alignment on Daily. The instruction is about the *site's* masthead, and
   * Daily was merely where this test could also reach `.cal-main` and
   * `.cal-side`; but Daily's own wide mast is 22 px now
   *, so leaving the ratio here would
   * have quietly restated the author's claim as 1.29 and let one page's
   * decision redefine a rule about every page. What Daily's mast *is* has a
   * test of its own — `chrome.spec.js`, "Daily wears a smaller, quieter
   * masthead" — rather than being inferred from the number this one prints.
   */
  await ready(page);
  const measure = async (route, width) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(route, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    return page.evaluate(() => ({
      nav: parseFloat(getComputedStyle(document.querySelector('nav.site-nav a')).fontSize),
      name: parseFloat(getComputedStyle(document.querySelector('.site-name')).fontSize),
      mark: document.querySelector('.site-name').getBoundingClientRect().left,
      // The columns' content edges: since stage B of the mockup review the
      // grid runs the window's width and the page's inset is paid inside the
      // two outer columns, so the margin is where their padding ends.
      left: (() => {
        const el = document.querySelector('.cal-main');
        return el && el.getBoundingClientRect().left + parseFloat(getComputedStyle(el).paddingLeft);
      })(),
      right: (() => {
        const el = document.querySelector('.cal-bubble');
        return el && el.getBoundingClientRect().right - parseFloat(getComputedStyle(el).paddingRight);
      })(),
      end: document.querySelector('.chrome-corner').getBoundingClientRect().right,
    }));
  };

  const narrow = await measure('/saints', 900);
  const site = await measure('/saints', 1440);

  // The mark alone is twice the size; the nav went back to what it was.
  expect(site.name / narrow.name, 'the masthead is not twice the size').toBeCloseTo(2, 1);
  expect(site.nav, 'the nav did not go back to its own size').toBeCloseTo(narrow.nav, 1);

  // The mark starts where the left column starts, and the controls end where
  // the right column ends.
  const wide = await measure('/calendar/2026-09-24', 1440);
  expect(Math.abs(wide.mark - wide.left), 'the mark is not on the left column margin').toBeLessThan(2);
  expect(Math.abs(wide.end - wide.right), 'the controls do not end on the right column margin').toBeLessThan(2);
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
  /*
   * **900 px since stage E**: past 1024 px the reading column prints the whole
   * life and has no preview to end (`../mockup-review/REVIEW.md` finding 13),
   * so this preview and its way in are the 760–1023 px card's.
   */
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const more = page.locator('.hero-more').filter({ visible: true });
  await expect(more).toHaveCount(1);
  /*
   * **"Continue reading" again, 2026-09-12.** It was renamed to "Read more" on
   * 2026-09-04 ("instead of the 'continue reading' button on Daily page
   * desktop, rename it 'read more'") and renamed back when the author took the
   * desktop card to the reference wholesale — the reference writes `Continue
   * reading`, and the wording came with the position and the fade as one
   * decision. The phone's own standalone button keeps "…continue reading" with
   * its ellipsis, which was never asked to change.
   */
  await expect(more).toContainText('Continue reading');
  // Named after the saint, not a bare "Read more" on a page of them.
  await expect(more).toHaveAttribute('aria-label', /Lupus/);

  const m = await page.evaluate(() => {
    const shown = [...document.querySelectorAll('.hero-more')].find((a) => a.offsetParent !== null);
    const lede = document.querySelector('[data-hero-lede]');
    return {
      link: shown.getBoundingClientRect(),
      inLede: lede.contains(shown),
      dates: document.querySelector('.hero-dates').getBoundingClientRect(),
      // The mount, not the picture, since 2026-09-10: the mat is what the
      // reader sees the bottom edge of (§4.1).
      media: document.querySelector('.hero-figure').getBoundingClientRect(),
      lede: lede.getBoundingClientRect(),
    };
  });
  /*
   * **Flush left under the lede, 2026-09-12.** It was right-justified to the
   * text's own measure from 2026-09-04 ("right justified to the real margin of
   * the preview text, not to the margin of the space where the preview text is
   * but doesnt reach") and pinned to the card's foot from 2026-09-02. Both of
   * those read against two dissolving lines that no longer exist, and the
   * author took the card to the reference, which sets `Continue reading` on
   * its own line at the column's left edge.
   *
   * Asserted against the lede's own left rather than the column's: they are
   * the same edge here and the lede is the thing the link is under.
   */
  expect(Math.abs(m.link.left - m.lede.left), 'the way in is not flush left under the lede').toBeLessThan(2);
  /*
   * And it is its own width, not the column's. `.hero-body` is a column flex
   * container, which blockifies an `inline-flex` child and then stretches it —
   * 579 px of target for 113 px of words, so a press anywhere on that line
   * opened the life. This is what `align-self: flex-start` buys.
   */
  expect(m.link.width, 'the way in has stretched to the whole column').toBeLessThan(m.lede.width * 0.6);
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
  /*
   * **The picture's foot stopped being the budget on 2026-09-16**, when the
   * two went into columns of their own. What the trim was for — that the way
   * in is reachable without hunting for it — is carried by the two assertions
   * above and by the link being the last thing in the paragraph's own column.
   * `past 1024 px the picture has a column` is the test for the arrangement
   * itself.
   */
  expect(m.link.top, 'the way in is not under the words it ends').toBeGreaterThan(m.lede.top);

  // And it goes where the name goes.
  await more.click();
  await expect(page).toHaveURL(/\/saints\/lupus-the-martyr/);
});


test('the preview ends where it ends, with nothing fading under the way in', async ({ page }) => {
  /*
   * **This test replaces one whose subject was removed** (author, 2026-09-12:
   * "do the mockup"). From 2026-09-01 the last two lines of the life ran on
   * under the button and dissolved — "gradient fade the last two lines of
   * preview text below it" — and the test here pinned the button to the foot
   * of that tail, per 2026-09-02: "make sure the ...continue reading button is
   * lined up to the bottom line of preview text visible under the gradient …
   * move it down 2 lines."
   *
   * The reference does neither, and the author took the desktop card to the
   * reference wholesale. The two instructions were one decision: the second
   * positions the button *against* the gradient the first asked for, so
   * removing the fade leaves it nothing to line up with.
   *
   * Kept as a test rather than deleted, because a removal nothing asserts is a
   * removal the next sitting re-adds. Same day, same window, same saint as the
   * test it replaces.
   */
  await ready(page);
  /*
   * **900 px since stage E**: past 1024 px the reading column prints the whole
   * life and has no preview to end (`../mockup-review/REVIEW.md` finding 13),
   * so this preview and its way in are the 760–1023 px card's.
   */
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto('/calendar/2026-09-14', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  // Nothing builds it and nothing styles it.
  await expect(page.locator('.hero-lede-tail')).toHaveCount(0);

  const m = await page.evaluate(() => {
    const lede = document.querySelector('[data-hero-lede]');
    const more = [...document.querySelectorAll('.hero-more')].find((a) => a.offsetParent !== null);
    const cs = getComputedStyle(lede);
    return {
      // A mask anywhere on the words is the fade by another route.
      mask: cs.webkitMaskImage === 'none' ? cs.maskImage : cs.webkitMaskImage,
      ledeBottom: lede.getBoundingClientRect().bottom,
      moreTop: more.getBoundingClientRect().top,
      moreLeft: more.getBoundingClientRect().left,
      ledeLeft: lede.getBoundingClientRect().left,
      line: parseFloat(cs.lineHeight),
    };
  });

  expect(m.mask, 'the preview is still being faded out').toBe('none');
  // On the next line, not over the words: the reference sets it under the
  // paragraph rather than across its last lines.
  expect(m.moreTop, 'the way in still overlaps the preview').toBeGreaterThanOrEqual(m.ledeBottom - 1);
  expect(m.moreTop - m.ledeBottom, 'the way in has drifted a line clear of the preview').toBeLessThan(m.line);
  expect(Math.abs(m.moreLeft - m.ledeLeft), 'the way in is not flush left under the preview').toBeLessThan(2);
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


test('the day steps are half a cross each, together at the top right of the date, between its two rules', async ({ page }) => {
  /*
   * Author, 2026-09-01: "Also on Daily Page add some <Yesterday and Tomorrow>
   * Buttons to the right of today's date print in large font, right justified
   * to the margin between left and right columns" — and, in the same breath,
   * that 5, 6 and 7 are desktop only.
   *
   * **The words went on 2026-09-10 and each button became half a cross**
   *: a 1 px stem capped
   * by a diamond at each end, and one arm reaching out from the middle — left
   * on the back step, right on the forward one. So the assertions about type
   * size are gone with the type, and what replaces them is the geometry the
   * marks are actually held to.
   *
   * Of the author's three claims, two are untouched and are still measured
   * against the page rather than against a number: the forward mark is right
   * justified to the margin between the columns — a width the page works out
   * from `--day-cols` and nothing in the markup knows — and the pair is desktop
   * only. The third, "to the right of today's date", is the one the redraw
   * reversed and stage F of ../mockup-review/REVIEW.md put back: the mockup's
   * day-side head sets ‹ › together at the top right (finding 14). They sat on
   * the date's own line until 2026-09-18, when REVIEW-2's reading of the same
   * finding gave the date a row of its own — so the marks keep the top right
   * and now share it with the day's name, which is what the mockup puts there.
   * **The words themselves are not gone**, and that is asserted: both buttons
   * carry them as their accessible name and, since this commit, as a `title`.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  await expect(page.locator('.day-step-prev')).toHaveAccessibleName(/Previous day/i);
  await expect(page.locator('.day-step-next')).toHaveAccessibleName(/Next day/i);
  await expect(page.locator('.day-step-prev'), 'a pointer lost the words').toHaveAttribute('title', /Previous day/i);
  await expect(page.locator('.day-step-next'), 'a pointer lost the words').toHaveAttribute('title', /Next day/i);

  const before = await page.locator('.cal-date').textContent();
  const m = await page.evaluate(() => {
    const r = (s) => document.querySelector(s).getBoundingClientRect();
    const main = r('.cal-main');
    const head = r('.cal-head');
    const date = r('.cal-date');
    const label = r('.cal-today');
    const prev = r('.day-step-prev');
    const next = r('.day-step-next');
    /*
     * The two rules the marks run between. The nav's is the site bar's own
     * bottom border, which belongs to the chrome and not to this page; the
     * date's is `.cal-head`'s `::after`, drawn at the wrapper's foot and only
     * when there is a liturgy line under it. Both are read as edges rather
     * than as declarations, because what §2.3 promises is a distance.
     */
    const navRule = r('header.chrome').bottom;
    const dateRule = head.bottom;
    // Where the stem stands inside its own box, and how wide it is: whole
    // pixels from the box's left edge, so the two marks land on the same
    // subpixel phase at 125% and 150% scaling.
    const stem = (side) => {
      const box = r(`.day-step-${side}`);
      const line = r(`.day-step-${side} .orn-line`);
      const arm = r(`.day-step-${side} .orn-arm`);
      return {
        offset: line.left - box.left,
        width: line.width,
        armWidth: Math.round(arm.width),
        armHeight: Math.round(arm.height),
        // Negative where the arm reaches back past the stem, positive where it
        // reaches on past it.
        armReach: Math.round(arm.left - line.left),
      };
    };
    return {
      // The column's content edge: the page's inset is paid inside it since
      // stage B of the mockup review.
      columnLeft: Math.round(main.left + parseFloat(getComputedStyle(document.querySelector('.cal-main')).paddingLeft)),
      columnRight: Math.round(main.right - parseFloat(getComputedStyle(document.querySelector('.cal-main')).paddingRight)),
      dateLeft: Math.round(date.left),
      dateRight: Math.round(date.right),
      nextRight: Math.round(next.right),
      prevBeforeNext: prev.right <= next.left + 1,
      afterLabelBack: prev.left >= label.right - 1,
      afterLabel: next.left >= label.right - 1,
      sharesLine: prev.top < label.bottom && prev.bottom > label.top,
      overDate: Math.round(prev.bottom) <= Math.round(date.top),
      topClear: Math.round(prev.top - navRule),
      bottomClear: Math.round(dateRule - prev.bottom),
      sameSpan: Math.round(prev.top - next.top) === 0 && Math.round(prev.bottom - next.bottom) === 0,
      diamonds: document.querySelectorAll('.day-step-prev .orn-d').length,
      prev: stem('prev'),
      next: stem('next'),
    };
  });

  /*
   * **The label's line, then the date's** (REVIEW-2 finding 14). The two marks
   * share the label's line at the head's top right; the date has the row under
   * them and the column's whole measure, from its own left edge to the margin
   * between the columns. Until 2026-09-18 the marks shared the date's line and
   * the date had only what they left it, which is why it took two rows.
   */
  expect(m.dateLeft, 'the date is not on the column’s own edge').toBe(m.columnLeft);
  expect(Math.abs(m.dateRight - m.columnRight), 'the date does not reach the column margin').toBeLessThan(2);
  expect(Math.abs(m.nextRight - m.columnRight), 'the forward mark is not on the column margin').toBeLessThan(2);
  expect(m.afterLabelBack, 'the back mark is not after the label').toBe(true);
  expect(m.prevBeforeNext, 'the back mark is not before the forward one').toBe(true);
  expect(m.afterLabel, 'the forward mark is not after the label').toBe(true);
  expect(m.sharesLine, 'the marks are not on the label’s line').toBe(true);
  expect(m.overDate, 'the marks are not above the date').toBe(true);

  // Inside the head, not hanging off it: the marks' row is the head's first.
  expect(m.topClear, 'the marks do not start at the head’s own top').toBe(8);
  expect(m.bottomClear, 'the marks reach past the head’s foot').toBeGreaterThan(0);
  expect(m.sameSpan, 'the two marks are not the same height').toBe(true);

  /*
   * Half a cross each: a 1 px stem on a whole pixel of its own box, three
   * diamonds, and one arm — reaching back on the left mark and on past on the
   * right one. The whole-pixel offset is the anti-smear rule §2.3 records as
   * measured rather than guessed; a stem placed at `50%` of a 24 px box would
   * be 12 in both and this test would not notice the difference, so the two
   * offsets are asserted apart.
   */
  expect(m.prev.offset, 'the back mark’s stem is off the pixel grid').toBe(14);
  expect(m.next.offset, 'the forward mark’s stem is off the pixel grid').toBe(10);
  expect(m.prev.width, 'the stem is not a hairline').toBe(1);
  expect(m.next.width, 'the stem is not a hairline').toBe(1);
  expect(m.diamonds, 'the mark is not capped and tipped by three diamonds').toBe(3);
  expect([m.prev.armWidth, m.prev.armHeight], 'the back arm is not a 7 px hairline').toEqual([7, 1]);
  expect([m.next.armWidth, m.next.armHeight], 'the forward arm is not a 7 px hairline').toEqual([7, 1]);
  expect(m.prev.armReach, 'the back mark’s arm does not reach back').toBe(-7);
  expect(m.next.armReach, 'the forward mark’s arm does not reach on').toBe(1);

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
   * grid already, and no room on a 360 px line for a fourth way — so the marks
   * are not merely small there, they are not laid out at all.
   */
  await page.setViewportSize({ width: 360, height: 780 });
  await expect(page.locator('.day-step-prev')).toBeHidden();
  await expect(page.locator('.day-step-next')).toBeHidden();
});


test('the day’s head names the day over a date that keeps to one line', async ({ page }) => {
  /*
   * ../mockup-review/REVIEW-2.md finding 14, ruled by the author 2026-09-18: "the mockup has a
   * TODAY label and the date on one line at 17 px; live has no label and 21 px
   * over two lines". **The one element where the mockup's type size is taken
   * and the site's is not** — the standing rule against the mockup's sizes is
   * suspended here because the author asked for this one.
   *
   * Three things have to hold together or the finding is not fixed: the label
   * is there and is the mockup's 12 px uppercase utility word; the date is the
   * mockup's 17 px; and it is *one line*, which it can only be with the head's
   * whole measure under the label rather than the strip the marks left it.
   * Backing out any one of the three fails this: at 21 px the date wraps, in
   * the old single row it wraps, and without the label there is nothing to
   * find.
   *
   * The reading is at both of the review's widths, and the date's line count
   * comes off the text's own rectangles rather than a division of two rounded
   * numbers.
   */
  await ready(page, { church: 'romanian' });
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/calendar/2026-09-11', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const m = await page.evaluate(() => {
      const label = document.querySelector('.cal-head .cal-today');
      const date = document.querySelector('.cal-head .cal-date');
      const lines = (el) => {
        const r = document.createRange();
        r.selectNodeContents(el);
        return new Set([...r.getClientRects()].filter((b) => b.height > 0).map((b) => Math.round(b.top))).size;
      };
      // The two sizes by what they paint, not by what a property hands back
      // (trap 9): a probe in the same box takes the token's own value.
      const probe = document.createElement('span');
      document.querySelector('.cal-main').append(probe);
      const at = (token) => {
        probe.style.fontSize = `var(${token})`;
        return getComputedStyle(probe).fontSize;
      };
      const sizes = { xs: at('--text-2xs'), lg: at('--text-lg') };
      probe.remove();
      const ls = getComputedStyle(label);
      return {
        // A hidden element reports 0 and would pass every size assertion
        // silently (trap 7), so the premise is asserted first.
        drawn: label.clientWidth > 0,
        word: label.textContent.trim(),
        labelSize: ls.fontSize,
        labelCase: ls.textTransform,
        labelFamily: ls.fontFamily,
        dateSize: getComputedStyle(date).fontSize,
        dateLines: lines(date),
        labelAbove: Math.round(label.getBoundingClientRect().bottom) <= Math.round(date.getBoundingClientRect().top),
        sizes,
      };
    });
    const at = `at ${width}`;
    expect(m.drawn, `the day’s name is not drawn ${at}`).toBe(true);
    expect(m.word, `the day’s name is empty ${at}`).not.toBe('');
    expect(m.labelSize, `the label is not at --text-2xs ${at}`).toBe(m.sizes.xs);
    expect(m.sizes.xs, 'premise: --text-2xs is no longer the mockup’s 12 px').toBe('12px');
    expect(m.labelCase, `the label is not uppercased ${at}`).toBe('uppercase');
    expect(m.labelFamily, `the label is not in the utility voice ${at}`).toContain('system-ui');
    expect(m.dateSize, `the date is not at --text-lg ${at}`).toBe(m.sizes.lg);
    expect(m.sizes.lg, 'premise: --text-lg is no longer the mockup’s 17 px').toBe('17px');
    expect(m.dateLines, `the date takes more than one line ${at}`).toBe(1);
    expect(m.labelAbove, `the label is not over the date ${at}`).toBe(true);
  }

  /*
   * The word itself: the three a reader can say without counting, and the
   * day's own weekday for anything further out. `/` is today by definition, so
   * this is not a test that turns over once a year (trap 4) — and the far day
   * is taken three days back for the same reason.
   */
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('.cal-head .cal-today')).toHaveText(STRINGS.calendar.today);
  await page.goto(await aDayThatIsNotToday(page), { waitUntil: 'networkidle' });
  const far = await page.locator('.cal-head .cal-today').textContent();
  expect([STRINGS.calendar.today, STRINGS.calendar.yesterday, STRINGS.calendar.tomorrow]).not.toContain(far);
  expect(far, 'a day out of reach of the three words is not named by its weekday').toMatch(/day$/i);

  // The phone's date stands inside the picker under a rail that already names
  // the day; the label is not laid out there at all.
  await page.setViewportSize({ width: 360, height: 780 });
  await expect(page.locator('.cal-head .cal-today')).toBeHidden();
});


test('the day’s column reads in the mockup’s order, with the name days last and at its size', async ({ page }) => {
  /*
   * Stage F of ../mockup-review/REVIEW.md (findings 2 and 14). The mockup's
   * day column, top to bottom: the date on the column's edge with ‹ › at its
   * top right, the cycle, the fast, the month, the readings, and the name days
   * last, at 13 px — the one size the author asked to take from the mockup
   * ("The left sidebar Name Days are meant to be smaller font as per the
   * mockup"). The head is not pinned there, and is not here.
   *
   * Before the stage the name days sat above the readings at 17 px, the date
   * stood between the two marks 40 px in from the edge, and the fast chip came
   * before the cycle. The pinning claim held before the stage too: it is a
   * guard, not a fix.
   */
  await ready(page, { church: 'russian' });
  for (const [width, height] of [[1440, 900], [1280, 800]]) {
    await page.setViewportSize({ width, height });
    await page.goto('/calendar/2026-09-25', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const m = await page.evaluate(() => {
      const box = (el) => {
        const b = el.getBoundingClientRect();
        return { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
      };
      const q = (s) => document.querySelector(s);
      const main = q('.cal-main');
      // The token by what it paints, not by what the property hands back (trap 9).
      const probe = document.createElement('span');
      probe.style.fontSize = 'var(--text-sm)';
      main.append(probe);
      const sm = getComputedStyle(probe).fontSize;
      probe.remove();
      return {
        edge: main.getBoundingClientRect().left + parseFloat(getComputedStyle(main).paddingLeft),
        date: box(q('.cal-head .cal-date')),
        label: box(q('.cal-head .cal-today')),
        prev: box(q('.day-step-prev')),
        cycle: box(q('.cal-liturgy .cal-cycle')),
        fast: box(q('.cal-liturgy .fast-chip')),
        month: box(q('.cal-controls')),
        readings: box(q('.cal-main [data-readings]')),
        names: box(q('.cal-main [data-namedays]')),
        size: getComputedStyle(q('.cal-main [data-namedays] .namedays li')).fontSize,
        sm,
      };
    });
    const at = `at ${width}`;
    expect(Math.abs(m.date.left - m.edge), `the date is not on the column’s edge ${at}`).toBeLessThan(1);
    expect(m.prev.bottom, `the marks are not above the date ${at}`).toBeLessThanOrEqual(m.date.top + 1);
    expect(m.prev.left, `the marks are not to the right of the day’s name ${at}`).toBeGreaterThanOrEqual(
      m.label.right - 1,
    );
    expect(m.cycle.bottom, `the cycle is not above the fast ${at}`).toBeLessThanOrEqual(m.fast.top + 1);
    expect(m.fast.bottom, `the fast is not above the month ${at}`).toBeLessThanOrEqual(m.month.top + 1);
    expect(m.month.bottom, `the month is not above the readings ${at}`).toBeLessThanOrEqual(m.readings.top + 1);
    expect(m.readings.bottom, `the name days are not after the readings ${at}`).toBeLessThanOrEqual(m.names.top + 1);
    expect(m.sm, 'premise: --text-sm is no longer the mockup’s 13 px').toBe('13px');
    expect(m.size, `the name days are not at --text-sm ${at}`).toBe(m.sm);
  }

  // Not pinned: the head travels with the column when the column scrolls.
  const moved = await page.evaluate(async () => {
    const main = document.querySelector('.cal-main');
    const date = document.querySelector('.cal-head .cal-date');
    const room = main.scrollHeight - main.clientHeight;
    const y0 = date.getBoundingClientRect().top;
    main.scrollTop = 60;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return { room, scrolled: main.scrollTop, travelled: Math.round(y0 - date.getBoundingClientRect().top) };
  });
  expect(moved.room, 'premise: the day’s column no longer overflows at 1280 × 800').toBeGreaterThan(60);
  expect(moved.travelled, 'the day’s head is pinned while the column scrolls').toBe(moved.scrolled);
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

  /*
   * **`.cal-bubble-scroll` is the right column's scroller since 2026-09-10**,
   * where it was `.cal-side`. The column became a filled box with its corners
   * bitten out and a corner cut off a
   * scroller is a corner the reader can scroll away from, so the clipped box
   * stays put and the scrolling happens in a child of it. The author's
   * instruction is unchanged and so is this test's claim; only the box in
   * column two that carries it has moved.
   */
  for (const col of ['.cal-main', '.cal-bubble-scroll']) {
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
 * **Every column reaches its last line** (`../mockup-review/REVIEW.md`
 * finding 12, stage C, 2026-09-18). The review wheeled over the reading column
 * at 1440 × 900 and nothing moved: its `.slot-viewport` had shrunk to the
 * column and clipped the life and the hymns, so the column that carried
 * `overflow-y: auto` had nothing to scroll. `overflow` computing to `auto` was
 * true the whole time, which is why this reads `scrollTop` after a real wheel,
 * a real key and a real touch drag rather than a style.
 */
const COLUMNS = { '.cal-main': 16, '.cal-saint': 24, '.cal-read': 24, '.cal-bubble-scroll': 24 };

/** Wheel over a column until it stops; its scrollTop before, after one turn, and at rest. */
const wheelToEnd = async (page, sel) => {
  const box = await page.locator(sel).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const top = () => page.evaluate((s) => document.querySelector(s).scrollTop, sel);
  const before = await top();
  await page.mouse.wheel(0, 200);
  await expect.poll(top).toBeGreaterThan(before);
  const once = await top();
  let last = -1;
  for (let i = 0; i < 40 && last !== (await top()); i++) {
    last = await top();
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(80);
  }
  return { before, once, end: await top() };
};

/** How far above the column's foot its content ends, the column scrolled wherever it is. */
const footGap = (page, sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    const kids = [...el.children].filter((k) => k.clientHeight > 0);
    return {
      gap: el.getBoundingClientRect().bottom - Math.max(...kids.map((k) => k.getBoundingClientRect().bottom)),
      atEnd: el.scrollHeight - el.clientHeight - el.scrollTop < 1,
      page: [document.scrollingElement.scrollHeight, innerHeight, scrollY],
    };
  }, sel);

test('past 1024 px the reading column scrolls to the end of Theodora of Alexandria’s life, and the page does not', async ({ page }) => {
  await ready(page, { church: 'romanian' });
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/calendar/2026-09-11', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);

    // The review's saint, and since stage E her whole life: its end below the window's foot.
    await expect(page.locator('.cal-read .hero-head')).toContainText('Theodora of Alexandria');
    const end = page.locator('.cal-read [data-read-life] > :last-child');
    await expect(end).toBeAttached();
    const below = await end.evaluate((h) => h.clientWidth > 0 && h.getBoundingClientRect().top > innerHeight);
    expect(below, `premise: ${width} puts the end of the life under the fold`).toBe(true);

    const { before, once, end: stops } = await wheelToEnd(page, '.cal-read');
    expect(once, `${width}: a wheel over the reading column moved nothing`).toBeGreaterThan(before);
    const foot = await footGap(page, '.cal-read');
    expect(foot.atEnd, `${width}: the wheel stopped short of the end`).toBe(true);
    const last = await end.evaluate((h) => h.getBoundingClientRect().bottom);
    expect(last, `${width}: the life ends below the window`).toBeLessThanOrEqual(height);
    expect(foot.gap, `${width}: the last line is flush with the column's foot (${stops})`).toBeGreaterThanOrEqual(23);
    expect(foot.page[0], `${width}: the page scrolls`).toBe(foot.page[1]);
    expect(foot.page[2]).toBe(0);
  }
});

test('past 1024 px each of the four columns reaches its last line by wheel, key and touch', async ({ page, browser }) => {
  /*
   * 14 September in the Russian calendar at 1024 × 250: a short window, so
   * that all four columns overflow at once — the saint's column is the one
   * that needs it, since stage D it holds only a picture capped at half
   * the window and its credit, and fits any taller window. The premise is
   * asserted, not assumed.
   */
  const size = { width: 1024, height: 250 };
  const open = async (p) => {
    await ready(p);
    await p.setViewportSize(size);
    await p.goto('/calendar/2026-09-14', { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
  };
  await open(page);

  for (const [sel, pad] of Object.entries(COLUMNS)) {
    const over = await page.evaluate((s) => {
      const el = document.querySelector(s);
      return el.clientWidth > 0 ? el.scrollHeight - el.clientHeight : -1;
    }, sel);
    expect(over, `premise: ${sel} overflows at 1024 × 250`).toBeGreaterThan(0);

    const { before, once } = await wheelToEnd(page, sel);
    expect(once, `${sel}: a wheel moved nothing`).toBeGreaterThan(before);
    const foot = await footGap(page, sel);
    expect(foot.atEnd, `${sel}: the wheel stopped short of the end`).toBe(true);
    expect(foot.gap, `${sel}: the last line is flush with the column's foot`).toBeGreaterThanOrEqual(pad - 1);
    expect(foot.page[0], `${sel}: the page scrolls`).toBe(foot.page[1]);
  }

  /** A point on text in the column's first screenful — for a press, not a link, a button or the month. */
  const textPoint = (p, sel, pressable = true) =>
    p.evaluate(([s, pressable]) => {
      const el = document.querySelector(s);
      el.scrollTop = 0;
      const col = el.getBoundingClientRect();
      // What is under the point, not what was queried: a card's link can be
      // stretched over its text.
      const inert = (x, y) =>
        el.contains(document.elementFromPoint(x, y)) &&
        !(pressable && document.elementFromPoint(x, y).closest('a, button, [role="button"], [data-choose], .cal-controls, [tabindex]'));
      for (const t of el.querySelectorAll('p, h1, h2, h3, figcaption, span')) {
        const r = t.getBoundingClientRect();
        const at = { x: r.left + 4, y: Math.max(r.top, col.top) + Math.min(r.height / 2, 6) };
        if (t.clientWidth > 0 && r.bottom > at.y && at.y < col.bottom && inert(at.x, at.y)) return at;
      }
      return null;
    }, [sel, pressable]);
  const top = (p, sel) => p.evaluate((s) => document.querySelector(s).scrollTop, sel);

  for (const sel of Object.keys(COLUMNS)) {
    const at = await textPoint(page, sel);
    await page.evaluate(() => document.activeElement?.blur());
    if (at) await page.mouse.click(at.x, at.y);
    // The saint's column is one link, which a press would follow: Tab's way in.
    else await page.evaluate((s) => document.querySelector(s).querySelector('a[href]').focus({ preventScroll: true }), sel);
    await page.keyboard.press('PageDown');
    await expect.poll(() => top(page, sel), { message: `${sel}: PageDown moved nothing` }).toBeGreaterThan(0);
  }

  // Trap 11: a dispatched PointerEvent is not a touch; CDP's touch events are.
  const ctx = await browser.newContext({ viewport: size, hasTouch: true });
  const touch = await ctx.newPage();
  await open(touch);
  const cdp = await ctx.newCDPSession(touch);
  for (const sel of Object.keys(COLUMNS)) {
    const at = await textPoint(touch, sel, false);
    expect(at, `premise: ${sel} shows text to touch`).not.toBeNull();
    const pt = (y) => [{ x: Math.round(at.x), y: Math.round(y) }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(at.y) });
    for (let i = 1; i <= 8; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(at.y - 10 * i) });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => top(touch, sel), { message: `${sel}: a touch drag moved nothing` }).toBeGreaterThan(0);
  }
  expect(await touch.evaluate(() => scrollY), 'a touch drag scrolled the page').toBe(0);
  await ctx.close();
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

test('the way into the life reads as a control without wearing a surface', async ({ page }) => {
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
   *
   * **1060 px, where it was 1100 until 2026-09-10.** The right column went
   * from 28 rem to 19 rem that day, which
   * handed 144 px to the left column and let Anthony's first paragraph fit
   * whole at 1100 — so this failed on `tail.length` with no hint that its
   * premise had gone. The premise is asserted below now, in words, so the next
   * change to either column says what it did rather than leaving a zero.
   */
  await ready(page);
  /*
   * **900 px since stage E**: past 1024 px the reading column prints the whole
   * life and has no preview to end (`../mockup-review/REVIEW.md` finding 13),
   * so this preview and its way in are the 760–1023 px card's.
   */
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const more = page.locator('.hero-more').filter({ visible: true });
  await expect(more).toHaveCount(1);
  const seen = await page.evaluate(() => {
    const link = [...document.querySelectorAll('.hero-more')].find((a) => a.offsetParent !== null);
    const cs = getComputedStyle(link);
    return {
      background: cs.backgroundColor,
      shadow: cs.boxShadow,
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
  /*
   * **The fade half of the 2026-09-01 instruction was removed on 2026-09-12**
   * (author: "do the mockup") along with the button's position, which had been
   * measured against it. What that instruction was really after — that the way
   * in reads as a control rather than as the last words of a sentence — is
   * carried by the two assertions above and by contrast, and is untouched.
   * `the preview ends where it ends` is the test for the removal, and the
   * `below` reading this line used to make was the tail's own position.
   */


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
   *
   * **The ceiling is a `max-height: 50vh` on the saint column's picture**
   * (stage D, 2026-09-18). The mockup draws the icon at the column's width in
   * its own shape and caps it at 58vh; this instruction is the author's own
   * and is the tighter of the two, so it stands.
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
    const box = await media.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { share: r.height / window.innerHeight, width: r.width };
    });
    const share = box.share;
    expect(
      share,
      `the picture takes ${(share * 100).toFixed(0)}% of a ${size.width}x${size.height} window`,
    ).toBeLessThanOrEqual(0.51);
    /*
     * And it has not been capped into a stamp: half a window is the ceiling,
     * not the target, and a picture that fell to a tenth would be a different
     * defect.
     *
     * **Read as a width**: the height is the icon's shape or the cap, so
     * width is the dimension a shrinking picture loses.
     *
     * **Derived from the column since 2026-09-16, where it was a flat 300.**
     * The picture has a column of the page to itself now — `--saint-w`, a
     * clamp on `vw` — so what says it has not been capped into a stamp is that
     * it fills that column, at every window. A number would be a
     * number for one of them.
     */
    const column = await page.evaluate(() => {
      const figure = document.querySelector('.hero-figure');
      const cs = getComputedStyle(figure);
      return (
        figure.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      );
    });
    expect(
      box.width,
      `the picture shrank to ${box.width.toFixed(0)} px inside a ${column.toFixed(0)} px column at ${size.width}x${size.height}`,
    ).toBeCloseTo(column, 0);
    expect(column, `the saint column collapsed at ${size.width}x${size.height}`).toBeGreaterThan(130);
  }
});


test('a tall icon is cropped from the top where the shape is still its own', async ({ page }) => {
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
   *
   * **Measured at 900 px since 2026-09-10, where it was 1280** (§10.23). The
   * desk's own card is the reference's fixed 3:2 at `50% 34%` now, so at 1280
   * this rule decides nothing about the hero and a test standing there would
   * be asserting a constant. Between 620 and 1024 the picture has a column and
   * the shape is still the icon's own, which is where the instruction above is
   * still executed on this page - and `cardCrop` executes it on every other
   * page, which `index-grid.spec.js` and `daily-register.spec.js` hold.
   *
   * Moved rather than deleted, and the width is the reason: an anchor at the
   * top is only meaningful where something is being cropped *to* a shape the
   * picture did not have, and that is now this band and not the desk.
   */
  await ready(page);
  await page.setViewportSize({ width: 900, height: 900 });
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
  /*
   * **900 px since stage E**: past 1024 px the reading column prints the whole
   * life and has no preview to end (`../mockup-review/REVIEW.md` finding 13),
   * so this preview and its way in are the 760–1023 px card's.
   */
  await page.setViewportSize({ width: 900, height: 900 });
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


/* ---- the desktop rebuild, step 8: the hero's mount (2026-09-10) ---------- */


test('the hero picture stands on the page’s own ground, with no mount and no outline', async ({ page }) => {
  /*
   * A 14 px mat in `--mount` from 2026-09-10 until the mockup review
   * (`../mockup-review/REVIEW.md` finding 3, stage D): the mockup draws the
   * picture at the column's width on the page itself. Still no outline, which
   * was the older instruction and stands.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-09-24', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.cal-read [data-read-life] p').first()).toBeVisible();

  const m = await page.evaluate(() => {
    const figure = document.querySelector('.hero-figure');
    const media = document.querySelector('.hero-media');
    const edges = (el) => {
      const s = getComputedStyle(el);
      return [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth].map(parseFloat);
    };
    const s = getComputedStyle(figure);
    const col = document.querySelector('.cal-saint');
    const cs = getComputedStyle(col);
    return {
      fill: s.backgroundColor,
      mat: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map(parseFloat),
      borders: [...edges(figure), ...edges(media), ...edges(media.querySelector('img'))],
      media: media.getBoundingClientRect().width,
      saintColumn: col.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
      nameSize: parseFloat(getComputedStyle(document.querySelector('.hero-name')).fontSize),
    };
  });

  expect(m.mat, 'the picture still stands in a mat').toEqual([0, 0, 0, 0]);
  expect(m.fill, 'the picture still stands on a mount').toBe('rgba(0, 0, 0, 0)');
  expect(m.borders, 'a picture on this page is wearing an outline').toEqual(new Array(12).fill(0));
  expect(Math.abs(m.media - m.saintColumn), 'the picture does not fill the saint column').toBeLessThan(1);
  // 26, the scale's own h2 step, where the reference drew 27 (§10.8).
  expect(m.nameSize, 'the hero name is off the type scale').toBe(26);
});


/* ---- the picture's column grows with the window (2026-09-10) ------------- */


test('the picture grows with its own column as the window widens', async ({ page }) => {
  /*
   * Author, 2026-09-10: the picture's width should grow with the window rather
   * than staying at 340 px with more and more text beside it.
   *
   * **The share it was measured by is gone, and the growth is not** (2026-09-16).
   * The proportion asserted here — 340 : 476, five twelfths of the two tracks
   * the picture and the lede shared — was a fact about a card in two halves.
   * The picture has a column of the page now and the life has the next one, so
   * there are no two tracks to take a share of; what the author was actually
   * looking at, a picture that follows the window instead of standing still,
   * is a fact about `--saint-w` and is asserted against that.
   *
   * 1280, 1440 and 1920 are the three widths the author asked for. The first
   * two are inside the band where neither end of the clamp binds; 1920 is past
   * the mockup's 360 px ceiling (stage B, 2026-09-18), which is why the last step is asked to be flat rather
   * than to keep growing — a ceiling is the point.
   */
  await ready(page);

  const read = async (width) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/calendar/2026-09-24', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    return page.evaluate(() => {
      const col = document.querySelector('.cal-saint');
      const cs = getComputedStyle(col);
      const figure = document.querySelector('.hero-figure');
      return {
        // The track itself, which is what `--saint-w` names, and the measure
        // inside it, which is what the picture fills.
        track: col.getBoundingClientRect().width,
        column:
          col.getBoundingClientRect().width -
          parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - parseFloat(cs.borderLeftWidth),
        figure: figure.getBoundingClientRect().width,
        media: document.querySelector('.hero-media').getBoundingClientRect().width,
        mat: parseFloat(getComputedStyle(figure).paddingLeft),
        // The words are the next column, which is the whole of what replaced
        // the share: they are not beside the picture inside one card.
        wordsLeft: document.querySelector('.cal-read .hero-head').getBoundingClientRect().left,
        pictureRight: figure.getBoundingClientRect().right,
      };
    });
  };

  const seen = [];
  for (const width of [1280, 1440, 1920]) {
    const m = await read(width);
    seen.push({ width, ...m });
    // The picture is the column: no mat since stage D.
    expect(Math.abs(m.figure - m.column), `at ${width} the picture does not fill the saint column`).toBeLessThan(1);
    expect(Math.abs(m.media - m.figure), 'the picture is inset in its figure').toBeLessThan(1);
    expect(m.mat, 'the picture stands in a mat again').toBe(0);
    expect(m.wordsLeft, `at ${width} the life is still beside the picture`).toBeGreaterThan(m.pictureRight);
  }

  /*
   * And it really is growing, which is the half of the instruction a shape
   * alone cannot say — then stopping, which is what the 360 px ceiling is for:
   * past it the picture would start competing with the life rather than
   * introducing it.
   */
  expect(seen[1].figure, 'the picture did not grow between 1280 and 1440').toBeGreaterThan(seen[0].figure + 20);
  // 360 px, the mockup clamp's own ceiling.
  expect(seen[2].track, 'the saint column ran past its own 360 px ceiling at 1920').toBeCloseTo(360, 0);
});


test('the columns do not shake when the window is resized', async ({ page }) => {
  /*
   * Author, 2026-09-04: "when resizing the window on desktop, the columns
   * shake ... make sure the right hand column margins are always fixed and the
   * left hand column is the only thing that is resized." That report was
   * against `clamp(25rem, 28%, 30rem)` on the *right* column, which recomputed
   * on every resize frame inside the band where the percentage bound, and fed
   * back into its own scrollbar appearing and disappearing.
   *
   * The picture's column is a percentage again as of 2026-09-10, so this is
   * the test that says the shape has not come back. Three claims, and the
   * first two are what the instruction actually asked for:
   *
   * - the right column's margin off the window never moves (its *width* is
   *   the mockup's clamp on `vw` since stage B of the mockup review,
   *   2026-09-18, and is asserted smooth below with the others);
   * - the reading column takes the largest share of the slack;
   * - the picture's track is a continuous function of the window width — a
   *   scrollbar appearing, a reflow feeding back, or any other oscillation is
   *   a jump, and a sweep at 4 px is fine enough to find one.
   *
   * A crowded day (22 September, 36 saints) so the left column certainly
   * overflows and its scroller is certainly live; an empty one would be
   * measuring the easy case.
   */
  await ready(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/calendar/2026-09-22', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.hero-figure')).toBeVisible();

  const readings = [];
  for (let width = 1280; width <= 1400; width += 4) {
    await page.setViewportSize({ width, height: 900 });
    readings.push(
      await page.evaluate((w) => {
        const hero = document.querySelector('.hero');
        const bubble = document.querySelector('.cal-bubble').getBoundingClientRect();
        return {
          width: w,
          track: parseFloat(getComputedStyle(hero).gridTemplateColumns.split(' ')[0]),
          side: bubble.width,
          margin: document.documentElement.clientWidth - bubble.right,
          left: document.querySelector('.cal-main').getBoundingClientRect().width,
          saint: document.querySelector('.cal-saint').getBoundingClientRect().width,
          read: document.querySelector('.cal-read').getBoundingClientRect().width,
        };
      }, width),
    );
  }

  const first = readings[0];
  for (const r of readings) {
    expect(r.margin, `the right column margin moved to ${r.margin} px at ${r.width}`).toBeCloseTo(first.margin, 1);
  }

  /*
   * Monotone and smooth, and **the reading column is what takes the slack**
   * (2026-09-16). Three of the four columns are a width apiece — clamps on
   * `vw`, so each 4 px of window is 0.84, 0.92 and 0.84 of them — and the
   * fourth is `minmax(0, 1fr)`, which takes what is left. So the four steps
   * sum to the window's, none of them goes backwards, and the reading column
   * has the largest share: a "shake" is a step that oscillates, and a sweep at
   * 4 px is fine enough to find one.
   */
  for (let i = 1; i < readings.length; i += 1) {
    const steps = {
      day: readings[i].left - readings[i - 1].left,
      saint: readings[i].saint - readings[i - 1].saint,
      read: readings[i].read - readings[i - 1].read,
      side: readings[i].side - readings[i - 1].side,
    };
    for (const [name, step] of Object.entries(steps)) {
      expect(step, `the ${name} column went backwards by ${step.toFixed(2)} px at ${readings[i].width}`).toBeGreaterThan(-0.01);
      expect(step, `the ${name} column jumped ${step.toFixed(2)} px at ${readings[i].width}`).toBeLessThan(4.5);
    }
    expect(
      steps.day + steps.saint + steps.read + steps.side,
      `the four columns did not divide the 4 px the window gained at ${readings[i].width}`,
    ).toBeCloseTo(4, 0);
    expect(steps.read, 'the reading column did not take the largest share of the slack').toBeGreaterThan(steps.day);
  }
});


/* ---- stage E: Life, Hymns, Writings (2026-09-18) ------------------------- */

/*
 * `../mockup-review/REVIEW.md` findings 6 and 13. The mockup's `nav.toc`: three
 * lines under the picture's credit over one rule, the section being read in ink
 * with the rubric at its edge, one the saint lacks in `--rule` and not
 * pressable; the reading column shows the chosen section alone, and Life is the
 * whole life. The choice outlives the saint, falling back to Life.
 */
const readTabs = (page) =>
  page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.cal-saint [role="tablist"] [role="tab"]')];
    return {
      tabs: tabs.map((t) => ({
        key: t.dataset.readTab,
        selected: t.getAttribute('aria-selected'),
        disabled: t.getAttribute('aria-disabled') === 'true',
        tabindex: t.tabIndex,
        color: getComputedStyle(t).color,
        edge: getComputedStyle(t).borderLeftColor,
        edgeWidth: getComputedStyle(t).borderLeftWidth,
      })),
      shown: [...document.querySelectorAll('.cal-read [role="tabpanel"]')]
        .filter((p) => !p.hidden && p.clientWidth > 0)
        .map((p) => p.dataset.readPane),
      focused: document.activeElement?.dataset?.readTab ?? null,
    };
  });

test('past 1024 px Life, Hymns and Writings stand under the picture, and the reading column shows the one chosen', async ({ page }) => {
  const { readFileSync } = await import('node:fs');
  const [ink, inkSoft, rule, rubric] = await (async () => {
    await ready(page, { church: 'romanian' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/calendar/2026-09-11', { waitUntil: 'networkidle' });
    return tokenColours(page, '--ink', '--ink-soft', '--rule', '--rubric');
  })();

  // The life as the folder holds it: body paragraphs, not the title.
  const md = readFileSync('saints/theodora-of-alexandria/life.md', 'utf8');
  const paragraphs = md.split(/\n\s*\n/).filter((b) => b.trim() && !/^#\s/.test(b.trim())).length;
  expect(paragraphs, 'premise: Theodora’s life is more than one paragraph').toBeGreaterThan(1);

  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/calendar/2026-09-11', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('.cal-read .hero-head')).toContainText('Theodora of Alexandria');
    await expect(page.locator('.cal-saint .hero-credit')).toBeVisible();
    await expect(page.locator('.cal-read [data-read-life] p').last()).toBeAttached();

    // Under the credit, over one rule, on the picture's own edge.
    const g = await page.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      const list = document.querySelector('.cal-saint [role="tablist"]');
      return {
        credit: r('.cal-saint .hero-credit'),
        media: r('.cal-saint .hero-media'),
        list: list.getBoundingClientRect(),
        rule: getComputedStyle(list).borderTopWidth,
        words: r('.cal-saint [role="tab"]').left + parseFloat(getComputedStyle(document.querySelector('.cal-saint [role="tab"]')).paddingLeft),
      };
    });
    expect(g.list.top, `${width}: the list is not under the credit`).toBeGreaterThan(g.credit.bottom);
    expect(g.list.top - g.credit.bottom, `${width}: the list has drifted from the credit`).toBeLessThan(25);
    expect(g.rule, `${width}: no rule over the list`).toBe('1px');
    expect(Math.abs(g.words - g.media.left), `${width}: the words are not on the picture’s edge`).toBeLessThan(1.5);

    // Life chosen, Hymns there to press, Writings offered and not pressable.
    let s = await readTabs(page);
    expect(s.tabs.map((t) => t.key)).toEqual(['life', 'hymns', 'writings']);
    expect(s.tabs.map((t) => t.selected)).toEqual(['true', 'false', 'false']);
    expect(s.tabs.map((t) => t.tabindex), 'more than one tab stop in the list').toEqual([0, -1, -1]);
    expect(s.tabs.map((t) => t.disabled)).toEqual([false, false, true]);
    expect([s.tabs[0].color, s.tabs[0].edge, s.tabs[0].edgeWidth], 'the chosen section is not marked').toEqual([ink, rubric, '2px']);
    expect(s.tabs[1].color).toBe(inkSoft);
    expect(s.tabs[2].color, 'the empty section is not in the rule colour').toBe(rule);
    expect(s.shown).toEqual(['life']);

    // The whole life, every paragraph, where only the first used to be.
    const drawn = await page.locator('.cal-read [data-read-life] > p').count();
    expect(drawn, `${width}: the life is cut`).toBeGreaterThanOrEqual(paragraphs);
    await expect(page.locator('.cal-read .hero-more').filter({ visible: true })).toHaveCount(0);

    // Hover answers in ink.
    const hymnsBox = await page.locator('.cal-saint [data-read-tab="hymns"]').boundingBox();
    await page.mouse.move(hymnsBox.x + 20, hymnsBox.y + hymnsBox.height / 2);
    await expect.poll(() => page.locator('.cal-saint [data-read-tab="hymns"]').evaluate((t) => getComputedStyle(t).color)).toBe(ink);
    await page.mouse.move(0, 0);

    // A press on Hymns shows the hymns alone, from the top.
    await page.evaluate(() => (document.querySelector('.cal-read').scrollTop = 200));
    await page.locator('.cal-saint [data-read-tab="hymns"]').dispatchEvent('click');
    s = await readTabs(page);
    expect(s.tabs.map((t) => t.selected)).toEqual(['false', 'true', 'false']);
    expect(s.shown).toEqual(['hymns']);
    await expect(page.locator('.cal-read [data-read-pane="hymns"] .hymn').last()).toBeVisible();
    expect(await page.evaluate(() => document.querySelector('.cal-read').scrollTop)).toBe(0);

    // A press on the empty section does nothing.
    await page.locator('.cal-saint [data-read-tab="writings"]').dispatchEvent('click');
    expect((await readTabs(page)).shown).toEqual(['hymns']);

    // The keyboard: one stop, arrows move and choose, skip the empty one and wrap.
    await page.locator('.cal-saint [data-read-tab="hymns"]').focus();
    await page.keyboard.press('ArrowDown');
    s = await readTabs(page);
    expect([s.focused, s.shown[0]], 'ArrowDown did not wrap past the empty section to Life').toEqual(['life', 'life']);
    await page.keyboard.press('ArrowUp');
    s = await readTabs(page);
    expect([s.focused, s.shown[0]]).toEqual(['hymns', 'hymns']);
    await page.keyboard.press('Home');
    expect((await readTabs(page)).focused).toBe('life');
    await page.keyboard.press('End');
    s = await readTabs(page);
    expect([s.focused, s.shown[0], s.tabs[1].tabindex]).toEqual(['hymns', 'hymns', 0]);
  }
});

test('past 1024 px the section chosen is kept for the next saint, and a saint without it opens on Life', async ({ page }) => {
  /*
   * 4 September in the Romanian calendar: Babylas of Antioch and Moses the
   * Prophet have hymns, Hermione has none, and the day itself carries no
   * Romanian hymns of its own (which would give every saint a Hymns section).
   */
  await ready(page, { church: 'romanian' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-09-04', { waitUntil: 'networkidle' });
  await expect(page.locator('.cal-read .hero-head')).toBeVisible();
  const reading = page.locator('.cal-read [data-read-life]');
  const hero = await reading.getAttribute('data-read-life');
  expect(['moses-the-prophet', 'babylas-of-antioch'], 'premise: the day opens on one of the two').toContain(hero);
  const other = hero === 'moses-the-prophet' ? 'babylas-of-antioch' : 'moses-the-prophet';
  await expect(page.locator('.cal-read [data-feast-hymns] .hymn'), 'premise: the day has hymns of its own').toHaveCount(0);

  await page.locator('.cal-saint [data-read-tab="hymns"]').dispatchEvent('click');
  await page.locator(`[data-choose="${other}"]`).dispatchEvent('click');
  await expect(reading).toHaveAttribute('data-read-life', other);
  let s = await readTabs(page);
  expect(s.tabs[1].disabled, `premise: ${other} has hymns`).toBe(false);
  expect(s.shown, 'the choice did not outlive the saint').toEqual(['hymns']);

  await page.locator('[data-choose="hermione-daughter-of-philip"]').dispatchEvent('click');
  await expect(reading).toHaveAttribute('data-read-life', 'hermione-daughter-of-philip');
  s = await readTabs(page);
  expect(s.tabs[1].disabled, 'premise: Hermione has no hymns').toBe(true);
  expect(s.shown, 'a saint without hymns did not open on Life').toEqual(['life']);

  // The fall-back is the choice now, as in the mockup's `pick`.
  await page.locator(`[data-choose="${hero}"]`).dispatchEvent('click');
  await expect(reading).toHaveAttribute('data-read-life', hero);
  expect((await readTabs(page)).shown).toEqual(['life']);
});

test('past 1024 px Writings opens the saint’s own source texts, where the folder has one', async ({ page }) => {
  /*
   * Writings are `text.sources`: two saints in the corpus, Anthony the Great
   * and Paul of Thebes. Fetched when chosen, never before.
   */
  const { readFileSync } = await import('node:fs');
  const heading = /^#\s+(.+)$/m.exec(readFileSync('saints/anthony-the-great/sources/athanasius-life-of-antony.md', 'utf8'))[1];
  let fetched = 0;
  page.on('request', (r) => {
    if (r.url().includes('athanasius-life-of-antony')) fetched += 1;
  });
  await ready(page, { church: 'romanian' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2027-01-17', { waitUntil: 'networkidle' });
  await expect(page.locator('.cal-read .hero-head')).toContainText('Anthony the Great');
  const writings = page.locator('.cal-saint [data-read-tab="writings"]');
  await expect(writings).not.toHaveAttribute('aria-disabled', 'true');
  expect(fetched, 'the source was fetched before anyone asked for it').toBe(0);

  await writings.dispatchEvent('click');
  await expect(page.locator('.cal-read [data-read-pane="writings"] h3')).toHaveText(heading);
  expect((await readTabs(page)).shown).toEqual(['writings']);
  expect(fetched).toBeGreaterThan(0);
});

test('past 1024 px the chosen section’s rubric bar is painted, not clipped away', async ({ page }) => {
  /*
   * `../mockup-review/REVIEW-2.md` N1. The marker is the tab's own
   * `border-left`, hung `--space-3` left of the words so the words keep the
   * picture's edge; it fell outside `.slot-viewport`'s clip and the selection
   * survived as ink alone. Asserted against every clipping ancestor rather
   * than against that one box, and beside the geometry it must not have
   * bought it with (finding 5's columns, finding 6's edge).
   */
  await ready(page, { church: 'romanian' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-09-11', { waitUntil: 'networkidle' });
  const [rubric] = await tokenColours(page, '--rubric');

  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/calendar/2026-09-11', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('.cal-saint [data-read-tab="life"]')).toHaveAttribute('aria-selected', 'true');

    const g = await page.evaluate(() => {
      const tab = document.querySelector('.cal-saint [role="tab"][aria-selected="true"]');
      const cs = getComputedStyle(tab);
      const b = tab.getBoundingClientRect();
      const bar = { left: b.left, right: b.left + parseFloat(cs.borderLeftWidth), colour: cs.borderLeftColor };
      // Every box between the bar and the page that cuts what leaves it.
      const clips = [];
      for (let el = tab.parentElement; el && el !== document.documentElement; el = el.parentElement) {
        const s = getComputedStyle(el);
        if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
        const r = el.getBoundingClientRect();
        clips.push({
          what: el.className,
          left: r.left + parseFloat(s.borderLeftWidth),
          right: r.right - parseFloat(s.borderRightWidth),
        });
      }
      const media = document.querySelector('.cal-saint .hero-media').getBoundingClientRect();
      const col = document.querySelector('.cal-saint').getBoundingClientRect();
      const colStyle = getComputedStyle(document.querySelector('.cal-saint'));
      return {
        bar,
        clips,
        words: b.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft),
        media: { left: media.left, width: media.width },
        col: { left: col.left, width: col.width },
        colInset: parseFloat(colStyle.borderInlineStartWidth) + parseFloat(colStyle.paddingInlineStart),
        colPadEnd: parseFloat(colStyle.paddingInlineEnd),
        listLeft: document.querySelector('.cal-saint .read-tabs').getBoundingClientRect().left,
      };
    });

    expect(g.bar.colour, `${width}: the chosen section is not marked in the rubric`).toBe(rubric);
    expect(g.bar.right - g.bar.left, `${width}: the marker is not 2 px`).toBeCloseTo(2, 1);
    expect(g.clips.length, `${width}: premise — something between the bar and the page clips`).toBeGreaterThan(0);
    for (const c of g.clips) {
      expect(g.bar.left, `${width}: ${c.what} cuts the marker's outer edge`).toBeGreaterThanOrEqual(c.left - 0.5);
      expect(g.bar.right, `${width}: ${c.what} cuts the marker`).toBeLessThanOrEqual(c.right + 0.5);
    }

    // And the columns the marker had to fit inside have not moved for it.
    expect(g.media.left - g.col.left, `${width}: the picture has left the column's padding`).toBeCloseTo(g.colInset, 1);
    expect(g.media.width, `${width}: the picture no longer fills the column`).toBeCloseTo(g.col.width - g.colInset - g.colPadEnd, 0);
    expect(g.listLeft, `${width}: the list has left the picture's edge`).toBeCloseTo(g.media.left, 1);
    expect(g.words, `${width}: the words are not on the picture's edge`).toBeCloseTo(g.media.left + 2, 1);
  }

  // The day's roll is drawn in the same place: the leaving panel is positioned
  // against the clip box, which now starts `--space-3` further out.
  const rolling = await page.evaluate(() => {
    const panel = document.querySelector('.cal-saint > .slot-viewport > .day-panel');
    panel.classList.add('slot-leaving');
    const r = panel.getBoundingClientRect();
    const media = document.querySelector('.cal-saint .hero-media').getBoundingClientRect();
    panel.classList.remove('slot-leaving');
    return { left: r.left, width: r.width, mediaLeft: media.left, mediaWidth: media.width };
  });
  expect(rolling.left, 'a day change would shift the picture').toBeCloseTo(rolling.mediaLeft, 1);
  expect(rolling.width, 'a day change would widen the picture').toBeCloseTo(rolling.mediaWidth, 1);
});

test('past 1024 px no band of the life shows between the pinned head and its first line', async ({ page }) => {
  /*
   * `../mockup-review/REVIEW-2.md` N4. The `--space-3` under the head is the
   * head's margin and paints nothing, so the life slid through it while the
   * column scrolled. The gap stays — closing it would carry the rule down and
   * the head is measured at its height — and the head covers it.
   */
  await ready(page, { church: 'romanian' });
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/calendar/2026-09-11', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('.cal-read .hero-head')).toContainText('Theodora of Alexandria');

    const g = await page.evaluate(() => {
      const col = document.querySelector('.cal-read');
      const head = document.querySelector('.cal-read .hero-head');
      const first = document.querySelector('.cal-read [data-read-life] > p');
      const resting = first.getBoundingClientRect().top - head.getBoundingClientRect().bottom;
      col.scrollTop = 300;
      const hb = head.getBoundingClientRect();
      const band = { top: hb.bottom, bottom: hb.bottom + parseFloat(getComputedStyle(head).marginBottom) };
      const crossing = [...document.querySelectorAll('.cal-read [data-read-life] > p')].filter((p) => {
        const r = p.getBoundingClientRect();
        return r.top < band.bottom - 1 && r.bottom > band.top + 1;
      }).length;
      const mid = (band.top + band.bottom) / 2;
      const at = (x) => {
        const el = document.elementFromPoint(x, mid);
        return el ? el.closest('.hero-head') !== null : null;
      };
      return {
        scrolled: col.scrollTop,
        resting,
        band: band.bottom - band.top,
        crossing,
        headOwnsBand: [at(hb.left + 4), at(hb.left + hb.width / 2), at(hb.right - 4)],
        headHeight: hb.height,
        rule: getComputedStyle(head).borderBottomWidth,
      };
    });

    expect(g.scrolled, `${width}: the reading column did not scroll`).toBeGreaterThan(0);
    expect(g.band, `${width}: the gap under the head is no longer the mockup's`).toBeCloseTo(12, 1);
    expect(g.resting, `${width}: the first line has moved off the head`).toBeCloseTo(12, 1);
    expect(g.rule, `${width}: the head has lost its rule`).toBe('1px');
    expect(g.crossing, `${width}: premise — nothing of the life is passing through the band`).toBeGreaterThan(0);
    expect(g.headOwnsBand, `${width}: the life shows in the band under the head`).toEqual([true, true, true]);
  }
});
