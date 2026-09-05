import { test, expect } from './fixtures.js';
import { phone, ready, searchMode } from './helpers.js';

/**
 * The Daily page, the register: the also-commemorated cards and rows, and the name days under their heading.
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

/* ---- the 2026-08-25 evening batch ---------------------------------------- */


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

/* ---- the desktop two-column day (2026-09-01) ----------------------------- */


test('the also-commemorated cards run tallest picture first, imageless last', async ({ page }) => {
  /*
   * Author, 2026-09-02: "On desktop daily page, reorder the daily saints cards
   * in order from tallest saint image to shortest to no saint image."
   *
   * Tallest is the smallest width-over-height, because a card's column is a
   * fixed width — so this reads each thumbnail's own attributes rather than
   * its drawn box, which is the same ratio and is not waiting on a decode.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const ratios = await page.evaluate(() =>
    [...document.querySelectorAll('.register-cards li.reg-card')].map((c) => {
      const img = c.querySelector('.reg-thumb img');
      return img ? Number(img.getAttribute('width')) / Number(img.getAttribute('height')) : null;
    }),
  );
  const withPicture = ratios.filter((r) => r !== null);
  expect(withPicture.length, 'premise: this day has no pictures to order').toBeGreaterThan(1);
  expect(ratios.filter((r) => r === null).length, 'premise: this day has no imageless saint').toBeGreaterThan(0);

  // Every picture before every blank.
  expect(ratios.slice(0, withPicture.length).every((r) => r !== null), 'a blank card came before a picture').toBe(true);
  // And the pictures themselves tallest first.
  for (let i = 1; i < withPicture.length; i++) {
    expect(withPicture[i], `card ${i} is taller than the one above it`).toBeGreaterThanOrEqual(withPicture[i - 1]);
  }
});


test('a phone keeps the calendar’s own order for the also-commemorated', async ({ page }) => {
  /*
   * The reordering above is the desktop's, in the author's own words. The rows
   * arrive sorted because the desktop lays them out in a block container that
   * ignores `order`; below 1024 px the register is a flex column and
   * `--reg-seq` puts the calendar's order back. Asserted by the laid-out
   * geometry rather than by the DOM, since the DOM is deliberately not the
   * reading order here.
   */
  await ready(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const seqs = await page.evaluate(() =>
    [...document.querySelectorAll('.register-cards li.reg-card')]
      .map((c) => ({ seq: Number(c.style.getPropertyValue('--reg-seq')), y: c.getBoundingClientRect().top }))
      .sort((a, b) => a.y - b.y)
      .map((r) => r.seq),
  );
  expect(seqs.length, 'premise: no register on this day').toBeGreaterThan(1);
  expect(seqs, 'the phone did not read in the calendar’s own order').toEqual(
    [...seqs].sort((a, b) => a - b),
  );
});

/* ---- the 2026-09-01 batch: the day steps, and the bars that went ---------- */


test('Also commemorated opens as cards in columns, and remembers a reader who wants a list', async ({ page }) => {
  /*
   * Author, 2026-09-01: "Make the Also Commemorated saint cards on desktop
   * behave the same as the cards view on All Saints page on desktop, separated
   * in columns depending on window size. Have an option near the 'Also
   * Commemorated' subheading to display them as a List or as Cards (Cards by
   * default), site remembers what you left it as."
   *
   * Four claims. The one worth the most here is the last: the setting has to
   * outlive a reload, and it is stored rather than held in the view — which is
   * the difference between a toggle and a preference. The third is the one that
   * is easiest to fake: "columns depending on window size" is not a fixed
   * number, so it is measured at two widths and asked to differ.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  // Ten also-commemorated saints, several with icons.
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const list = page.locator('[data-register]');
  await expect(list, 'the register did not open as cards').toHaveClass(/is-cards/);
  await expect(page.locator('[data-reg-view="cards"]')).toHaveAttribute('aria-pressed', 'true');

  /* The control is beside the heading, not somewhere else on the page. */
  const near = await page.evaluate(() => {
    const h = document.querySelector('.register-head .register-heading').getBoundingClientRect();
    const v = document.querySelector('.register-view').getBoundingClientRect();
    return { sameLine: v.top < h.bottom && v.bottom > h.top, after: v.left > h.left };
  });
  expect(near.sameLine, 'the toggle is not on the heading’s line').toBe(true);
  expect(near.after, 'the toggle is not beside the heading').toBe(true);

  const shape = () =>
    page.evaluate(() => {
      const cards = [...document.querySelectorAll('[data-register] .reg-card')];
      const withImage = cards.find((c) => c.querySelector('.reg-thumb:not(.is-blank)'));
      const thumb = withImage?.querySelector('.reg-thumb').getBoundingClientRect();
      const body = withImage?.querySelector('.reg-body').getBoundingClientRect();
      return {
        columns: new Set(cards.map((c) => Math.round(c.getBoundingClientRect().left))).size,
        // Above the name in cards, beside it in a list.
        pictureAbove: thumb && body ? thumb.bottom <= body.top + 1 : null,
        pictureWidth: thumb ? Math.round(thumb.width) : null,
      };
    });

  const wide = await shape();
  expect(wide.columns, 'the cards are not in columns').toBeGreaterThan(1);
  expect(wide.pictureAbove, 'the picture is not above the name').toBe(true);
  // Wider than the list's 40 px thumbnail: this is the Index's card picture.
  expect(wide.pictureWidth).toBeGreaterThan(100);

  // Fewer columns in a narrower window, which is what "depending on window
  // size" means and what a fixed column count would not do.
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect.poll(async () => (await shape()).columns).toBeLessThan(wide.columns);
  await page.setViewportSize({ width: 1440, height: 900 });

  // The list face: one column, and the picture back beside the name.
  await page.locator('[data-reg-view="list"]').click();
  await expect(list).toHaveClass(/is-list/);
  await expect(page.locator('[data-reg-view="list"]')).toHaveAttribute('aria-pressed', 'true');
  const rows = await shape();
  expect(rows.columns, 'the list is still in columns').toBe(1);
  expect(rows.pictureAbove, 'the list still stacks the picture').toBe(false);

  // Remembered: a reload comes back to the list, and stepping a day keeps it —
  // the panel is rebuilt on a step, so this is where a face held in the DOM
  // rather than in the setting would quietly go back to cards.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('[data-register]')).toHaveClass(/is-list/);
  /*
   * Forward and back rather than one step: not every day has a register, and
   * 5 September is the one this test knows has ten. Both panels are in the
   * document while the roll runs, so the question is asked of all of them.
   */
  await page.locator('[data-dstep="1"]').click();
  await page.waitForTimeout(600);
  await page.locator('[data-dstep="-1"]').click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const lists = [...document.querySelectorAll('[data-register]')];
        return lists.length > 0 && lists.every((el) => el.classList.contains('is-list'));
      }),
    )
    .toBe(true);

  // And there is no choice to make on a phone, where the list is the only face.
  await page.setViewportSize({ width: 360, height: 780 });
  await expect(page.locator('.register-view').first()).toBeHidden();
});

/* ---- the round of 2026-09-02, late -------------------------------------- */


test('a register card crops to the hero own limits', async ({ page }) => {
  /*
   * Author, 2026-09-02: "apply the same aspect ratio limitations to crop any
   * saint card display (on daily page and on all saints page) in the same way
   * it applies to the main saint card on Daily page desktop."
   *
   * Eleven of the 130 icons are taller than 1:1.6 and one is 3.1:1, which drew
   * a card three times the height of its neighbours in a column of them.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const shapes = await page.evaluate(() =>
    [...document.querySelectorAll('.register-cards.is-cards .reg-thumb')]
      .filter((t) => t.querySelector('img'))
      .map((t) => {
        const r = t.getBoundingClientRect();
        const img = t.querySelector('img');
        return {
          drawn: r.height / r.width,
          file: Number(img.getAttribute('height')) / Number(img.getAttribute('width')),
          fit: getComputedStyle(img).objectFit,
        };
      }),
  );
  expect(shapes.length, 'premise: this day has no pictured register cards').toBeGreaterThan(0);
  for (const s of shapes) {
    expect(s.drawn, 'a register card is taller than 1:1.6').toBeLessThan(1.62);
    expect(s.drawn, 'a register card is wider than 2:1').toBeGreaterThan(0.49);
    expect(s.fit, 'the picture fits inside its box rather than filling it').toBe('cover');
  }
  /*
   * And at least one of them is actually being cropped, or this passes on a
   * day whose icons all happened to be inside the limits anyway - the shape of
   * green-by-absence this suite has been caught by before.
   */
  expect(shapes.some((s) => s.file > 1.62), 'premise: nothing on this day needed cropping').toBe(true);
});
