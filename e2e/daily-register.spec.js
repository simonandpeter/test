import { test, expect } from './fixtures.js';
import { phone, ready, searchMode, tokenColours } from './helpers.js';

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

test('name days stand in two columns at a desk and run on with dots on a phone', async ({ page }) => {
  /*
   * Author, 2026-09-10, by the reference: two columns in the sidebar and no
   * separator dot. Desktop only — the phone keeps the run of names, which is
   * what a 360 px column can hold.
   *
   * **The reading order is the assertion, not the column count.** `columns: 2`
   * fills the first column and then the second, so the leading column holds a
   * *prefix* of the list; a two-track grid would draw the same two columns and
   * put the names in 1 2 / 3 4 order, where reading down a column reads every
   * other name. A test that counted columns would pass on both.
   *
   * Nine names on 25 September in the Russian calendar, which is also the odd
   * count: five in the first column and four in the second.
   */
  await ready(page, { church: 'russian' });

  const read = () =>
    page.evaluate(() => {
      const list = document.querySelector('[data-namedays] .namedays');
      const items = [...list.querySelectorAll('li')];
      const lefts = items.map((i) => Math.round(i.getBoundingClientRect().left));
      const first = Math.min(...lefts);
      return {
        n: items.length,
        columns: new Set(lefts).size,
        leading: lefts.map((x, k) => (x === first ? k : -1)).filter((k) => k >= 0),
        /*
         * **Every item's ::after, not the list's text.** The separator is a
         * pseudo-element, so it never reaches `textContent` — a first version
         * of this asked the list's text for a dot and would have passed
         * identically on both faces, which is what backing it out showed.
         */
        dots: items.map((i) => getComputedStyle(i, '::after').content),
        // A word wider than its column, drawn past the box that holds it.
        overrun: Math.max(
          ...items.map((i) =>
            Math.round(i.querySelector('.name-day').getBoundingClientRect().right - i.getBoundingClientRect().right),
          ),
        ),
      };
    });

  /*
   * 1440 rather than 1280 since stage B of the mockup review: the day's column
   * is the mockup's 269 px at 1280, 6 px narrower than it was, and under the
   * runner's DejaVu Sans one of the nine names then wraps at 17 px and the
   * balancer puts four in the leading column. The claim here is the fill
   * order, not the width; the size itself is stage F's (13 px, ../mockup-review/REVIEW.md
   * finding 2).
   */
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-09-25', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const desk = await read();
  expect(desk.n, 'premise: 25 September no longer gives nine name days').toBe(9);
  expect(desk.columns, 'the name days are not in two columns').toBe(2);
  expect(desk.leading, 'the columns are filled across rather than down').toEqual([0, 1, 2, 3, 4]);
  expect(desk.dots.filter((d) => d !== 'none'), 'a separator dot survived in the columns').toEqual([]);

  /*
   * **One name, which is a column of one and not a layout that has failed.**
   * 11 September gives exactly John, and it is asked because `columns: 2` has
   * to be allowed to draw one.
   */
  await page.goto('/calendar/2026-09-11', { waitUntil: 'networkidle' });
  const alone = await read();
  expect(alone.n, 'premise: 11 September no longer gives exactly one name').toBe(1);
  expect(alone.columns, 'a single name did not take the leading column').toBe(1);

  /*
   * **A name too wide for its column is broken, not clipped.** The corpus's
   * widest is Ανδροπελαγία at 117 px against a 124 px column, so this is a
   * guard rather than a live defect — and it was shot before it was written:
   * «Константинопольский» drew through the second column and off the bubble's
   * edge. Injected, because the corpus has no such name and a test that waits
   * for one to be written is not a test.
   */
  await page.evaluate(() => {
    const li = document.createElement('li');
    li.innerHTML = '<span class="name-day">Константинопольский</span>';
    document.querySelector('[data-namedays] .namedays').append(li);
  });
  const long = await read();
  expect(long.overrun, 'a long name is drawn outside the column that holds it').toBeLessThanOrEqual(1);

  /*
   * **And the phone keeps the run**, which is the scope: the same list, one
   * flowing line, with the middle dot between its names.
   */
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/calendar/2026-09-25', { waitUntil: 'networkidle' });
  const phone = await read();
  // Eight dots between nine names: every item but the last carries one.
  expect(
    phone.dots.filter((d) => d.includes('·')).length,
    'the phone lost the separator the desktop rule gave up',
  ).toBe(8);
  expect(phone.dots.at(-1), 'the last name carries a dot after it').toBe('none');
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


test('the register opens compact in columns, remembers the other face, and lands a stored list on cards', async ({ page }) => {
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
   *
   * **Two of its assertions were rewritten on 2026-09-10, and the reason is a
   * decision rather than a drift**. This read `pictureAbove` and `pictureWidth > 100`, which were the
   * borrowed Index card: a full-width picture stacked over the name. The
   * compact face is a row now — a 60 px mat at the row's *trailing* edge — and
   * that is the one place the shipped page deliberately differs from the
   * reference, because the bookmark has nowhere else to go over a 48 px
   * thumbnail (PLAN §4).
   *
   * **And the face it remembers changed later the same day** (author: §10.4
   * reversed). The list is gone; the two marks the reference draws are the
   * whole control. The author's four claims are all still here — cards by
   * default, columns that depend on the window, a choice that outlives a
   * reload and a day step, and no choice to make on a phone — and the *rule*
   * this test now states is the one the removal created:
   *
   * - the remembered face is **expanded**, which is the other face there is;
   * - a reader whose storage still says `list` opens on **cards**, and the
   *   control they meet is a working one rather than two marks with none of
   *   them live.
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
      /*
       * **Drawn rows only** (2026-09-16). Past 1024 px the shelf lists the
       * whole day and hides the saint standing in the card, so the row of the
       * chosen saint is in the document with every box on it reporting zero —
       * trap 7 — and it is the first row of the list. Read before this filter
       * it made the picture look stacked over the name and the single column
       * look like two, both off a rectangle that is not on the screen.
       */
      const cards = [...document.querySelectorAll('[data-register] .reg-card')].filter((c) => c.offsetParent);
      const withImage = cards.find((c) => c.querySelector('.reg-thumb:not(.is-blank)'));
      const thumb = withImage?.querySelector('.reg-thumb').getBoundingClientRect();
      const body = withImage?.querySelector('.reg-body').getBoundingClientRect();
      return {
        columns: new Set(cards.map((c) => Math.round(c.getBoundingClientRect().left))).size,
        // Above the name in cards, beside it in a list.
        pictureAbove: thumb && body ? thumb.bottom <= body.top + 1 : null,
        // At the trailing edge of the row, which is what §10.3 rules and what
        // a leading-edge mat would reverse.
        pictureTrails: thumb && body ? thumb.left >= body.right - 1 : null,
        pictureWidth: thumb ? Math.round(thumb.width) : null,
      };
    });

  const wide = await shape();
  /*
   * **One column, at every width past 1024 px** (2026-09-16). This read "the
   * cards are not in columns — more than one" and asked for fewer of them in a
   * narrower window, which is what "separated in columns depending on window
   * size" asked for when the register had the width of the page under the
   * hero. It is the fourth column of four now, `--side-w` wide, and a card
   * grid whose floor is 340 px in a 272 px box lays a 340 px row into it — so
   * the packing is not narrowed here, it is gone, and what is asserted instead
   * is that it is gone. The faces themselves are unchanged and are what stage
   * two dresses.
   */
  expect(wide.columns, 'the shelf is packing rows across itself again').toBe(1);
  /*
   * **And the tile is a plate, not a row** (2026-09-16, stage two). These two
   * read `false` and `true` from 2026-09-10, when the compact face was a row
   * with a 60 px mat at its trailing edge. The shelf wears the mockup's
   * `day-grid` tile now — the picture the width of the column and the name
   * under it — so the two reverse, and the shape itself is held by "a shelf
   * tile is a plate of the saint above their name" below.
   */
  expect(wide.pictureAbove, 'the plate is not above the name').toBe(true);
  expect(wide.pictureTrails, 'the plate is inset from the column rather than filling it').toBe(false);
  expect(wide.pictureWidth, 'the plate is still a mat rather than the column').toBeGreaterThan(200);

  // And still one at the narrow end of the desk, where the shelf is at its
  // own floor: the column does not pack rows across itself at any width.
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect.poll(async () => (await shape()).columns).toBe(1);
  await page.setViewportSize({ width: 1440, height: 900 });

  // The other face: one column of repeated day cards, picture leading.
  await page.locator('[data-reg-view="expanded"]').click();
  await expect(list).toHaveClass(/is-expanded/);
  await expect(page.locator('[data-reg-view="expanded"]')).toHaveAttribute('aria-pressed', 'true');
  const rows = await shape();
  expect(rows.columns, 'the expanded face is still in columns').toBe(1);

  // Remembered: a reload comes back to it, and stepping a day keeps it — the
  // panel is rebuilt on a step, so this is where a face held in the DOM rather
  // than in the setting would quietly go back to cards.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('[data-register]')).toHaveClass(/is-expanded/);
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
        return lists.length > 0 && lists.every((el) => el.classList.contains('is-expanded'));
      }),
    )
    .toBe(true);

  /*
   * **A stored face that is no longer legal lands on cards** (§10.4, as
   * reversed). The value is written on every load rather than once, so the
   * page never gets to quietly correct the storage and then pass — what is
   * asserted is that an illegal value is survivable every time it is read,
   * which is what `REGISTER_LAYOUTS` filtering at each of its three readers
   * buys. Then the control is pressed, because "does not throw" and "is not
   * wedged" are two claims and only the second needs a press.
   */
  await page.addInitScript(() => {
    const key = 'gos-settings';
    const now = JSON.parse(localStorage.getItem(key) ?? '{}');
    localStorage.setItem(key, JSON.stringify({ ...now, registerLayout: 'list' }));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await expect(list, 'a stored list did not land on cards').toHaveClass(/is-cards/);
  await expect(page.locator('[data-reg-view="list"]'), 'there is still a list mark to press').toHaveCount(0);
  await expect(page.locator('.register-view [aria-pressed="true"]'), 'no mark is live').toHaveCount(1);
  await expect(page.locator('[data-reg-view="cards"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-reg-view="expanded"]').click();
  await expect(list, 'the control was wedged by the stored value').toHaveClass(/is-expanded/);

  // And there is no choice to make on a phone, where the rows are the only face.
  await page.setViewportSize({ width: 360, height: 780 });
  await expect(page.locator('.register-view').first()).toBeHidden();
});

test('the register heading is Also today at a desk and Also commemorated on a phone', async ({ page }) => {
  /*
   * Author, 2026-09-10: rename *Also Commemorated* to the reference's own
   * "Also today", desktop only. Both halves are the assertion — the desk's
   * word is the change, and the phone's word is the *scope*, which is the
   * part a rename done in one place would silently take away.
   *
   * **The capitalisation is the reference's**: `Also today`, one capital.
   * `toHaveText` is exact, so a stray title case fails here.
   *
   * **Asked at two loads rather than at one resize**, because that is what the
   * page does: the heading is chosen when the panel paints
   * (views/daily/panel.js), so a window dragged across the breakpoint keeps
   * the word it arrived with until something repaints the day. Testing it by
   * resizing would pin behaviour the implementation does not claim.
   *
   * **And in a pack, at both widths.** A new key that reached only
   * `ui/strings.js` would pass every English assertion above and print
   * English to a Russian reader; `locale-coverage.mjs` counts the gap but no
   * browser test would have seen it.
   */
  await ready(page, { church: 'russian' });
  const heading = page.locator('.register-head .register-heading');

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await expect(heading, 'the desk heading is not the reference’s words').toHaveText('Also today');

  await page.setViewportSize({ width: 360, height: 780 });
  await page.reload({ waitUntil: 'networkidle' });
  await expect(heading, 'the phone lost the wording the rename was scoped away from').toHaveText(
    'Also commemorated',
  );

  await page.evaluate(() => {
    const key = 'gos-settings';
    localStorage.setItem(key, JSON.stringify({ ...JSON.parse(localStorage.getItem(key)), language: 'ru' }));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await expect(heading, 'the phone’s heading fell back to English').toHaveText('Также совершается память');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.reload({ waitUntil: 'networkidle' });
  await expect(heading, 'the desk’s heading fell back to English').toHaveText('Также сегодня');
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
   *
   * **Asked of the other face since 2026-09-16.** The shelf's default face is
   * the mockup's plate now and every plate in it is 3:2 — inside these limits
   * by construction, and therefore no longer a test of them. `--reg-aspect` is
   * the clamp `cardCrop` writes per saint, and the face that still reads it is
   * the expanded one, so that is where the instruction is held.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('[data-reg-view="expanded"]').click();
  await expect(page.locator('[data-register]')).toHaveClass(/is-expanded/);

  const shapes = await page.evaluate(() =>
    [...document.querySelectorAll('.register-cards.is-expanded .reg-pic')]
      // Drawn rows only: the shelf hides the saint in the card and a hidden
      // box measures zero, which divides into NaN rather than into a shape.
      .filter((t) => t.querySelector('img') && t.offsetParent)
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

/* ---- the desktop rebuild, step 9: the register's two faces (2026-09-10) -- */


test('a shelf tile is a plate of the saint above their name, cropped at 3:2', async ({ page }) => {
  /*
   * **Stage two of the Daily desktop redesign** (2026-09-16): the shelf's rows
   * wear the mockup's `day-grid` tile. This test replaces "a register mat is
   * 60 px wide however tall its picture is", which held the *row* face's mat —
   * 48 px of picture and 6 either side, at the row's trailing edge — and that
   * shape is not what the column draws any more.
   *
   * Four claims, and the first two are the redraw:
   *
   * - the plate takes the column's whole width and stands *above* the name,
   *   where the mat took 60 px of it and stood after it;
   * - it is 3:2, the mockup's own shape, and every tile in the column is the
   *   same 3:2 — which is the point of a fixed ratio and what the per-saint
   *   `--reg-aspect` could not give;
   * - the picture fills it rather than fitting inside it, cropped at 34% of
   *   its height, "where a face sits in a panel once the halo and the frame
   *   are allowed for";
   * - a hairline stands above each tile and there is none between them, which
   *   is the mockup's `border-top` and keeps "one company, not a ruled
   *   ledger" (author, 2026-08-24) true of the gaps.
   *
   * **Drawn rows only** (trap 7): past 1024 px the shelf hides the saint
   * standing in the card, and every box on that row reports zero.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const tiles = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('[data-register].is-cards .reg-card')].filter(
      (row) => row.querySelector('.reg-pic img') && row.offsetParent,
    );
    const list = document.querySelector('[data-register]');
    return {
      listWidth: Math.round(list.getBoundingClientRect().width),
      rows: rows.map((row) => {
        const plate = row.querySelector('.reg-thumb').getBoundingClientRect();
        const body = row.querySelector('.reg-body').getBoundingClientRect();
        const img = row.querySelector('.reg-pic img');
        const own = getComputedStyle(row);
        return {
          w: Math.round(plate.width),
          ratio: plate.width / plate.height,
          above: plate.bottom <= body.top + 1,
          fit: getComputedStyle(img).objectFit,
          from: getComputedStyle(img).objectPosition,
          top: own.borderTopWidth,
          bottom: own.borderBottomWidth,
        };
      }),
    };
  });

  expect(tiles.rows.length, 'premise: this day has no pictured shelf tiles').toBeGreaterThan(2);
  for (const t of tiles.rows) {
    expect(t.above, 'the plate is not above the name').toBe(true);
    // The column's own width, not a mat's: the list box, less nothing, because
    // the tile carries no side padding.
    expect(t.w, 'the plate is not the width of the column').toBe(tiles.listWidth);
    expect(t.ratio, 'the plate is not 3:2').toBeCloseTo(1.5, 1);
    expect(t.fit, 'the picture fits inside the plate rather than filling it').toBe('cover');
    expect(t.from, 'the crop is not taken at 34%').toBe('50% 34%');
    expect(t.top, 'a tile has no hairline above it').toBe('1px');
    expect(t.bottom, 'a tile has a second hairline below it').toBe('0px');
  }
  // Every plate the same shape, which a per-saint aspect ratio would not give
  // — and the day has icons of several shapes, or this proves nothing.
  expect(new Set(tiles.rows.map((t) => Math.round(t.ratio * 100))).size, 'the plates are not one shape').toBe(1);
  const files = await page.evaluate(() =>
    [...document.querySelectorAll('[data-register].is-cards .reg-pic img')]
      .filter((img) => img.offsetParent)
      .map((img) => Number(img.getAttribute('height')) / Number(img.getAttribute('width'))),
  );
  expect(new Set(files.map((r) => Math.round(r * 10))).size, 'premise: every icon on this day is one shape').toBeGreaterThan(1);
});


test('a register row with no icon shows its type as a mark, and says it in words', async ({ page }) => {
  /*
   * A glyph keyed off `types`
   * where there is no picture, drawn in `--rule` and `aria-hidden` — "its
   * 1.41:1 is then not a legibility failure because it is not the carrier:
   * make sure the entry's accessible text names the saint's type in words".
   *
   * Both halves, because either alone is the bug: a mark nobody can read with
   * no words behind it, or words with no mark, which is what this list was
   * yesterday.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const rows = await page.evaluate(() =>
    [...document.querySelectorAll('[data-register].is-cards .reg-card')].map((row) => {
      const glyph = row.querySelector('.reg-glyph');
      return {
        name: row.querySelector('.reg-name').textContent.trim(),
        // `textContent` takes the sr-only span with it, which is the point:
        // this is what a screen reader is given, not what is drawn.
        spoken: row.textContent.replace(/\s+/g, ' ').trim(),
        hasPicture: Boolean(row.querySelector('.reg-pic img')),
        glyph: glyph ? getComputedStyle(glyph).width : null,
        hidden: glyph?.getAttribute('aria-hidden'),
      };
    }),
  );
  const marked = rows.filter((r) => r.glyph);
  expect(marked.length, 'premise: every saint on this day has a picture').toBeGreaterThan(2);
  expect(rows.some((r) => r.hasPicture), 'premise: no picture on this day to lose the row to').toBe(true);
  // A real icon always wins the row: no row carries both.
  expect(rows.every((r) => !(r.hasPicture && r.glyph)), 'a picture and a glyph in one row').toBe(true);

  for (const row of marked) {
    expect(row.glyph, `${row.name} mark is not 30 px`).toBe('30px');
    expect(row.hidden, `${row.name} mark is not hidden from the accessibility tree`).toBe('true');
  }

  /*
   * And the words. Callinicus is the case worth naming: the corpus has him as
   * a `hierarch` and a `patriarch`, and the visible subtext says only
   * "Patriarch of Constantinople" — so "Hierarch" is what the mark is carrying
   * and what the row has to say out loud. Eutychius is the other half: no
   * office at all in the subtext, so the whole type arrives from the sr-only
   * span.
   */
  const callinicus = rows.find((r) => r.name.includes('Callinicus'));
  expect(callinicus, 'premise: Callinicus is not on this day any more').toBeTruthy();
  expect(callinicus.spoken, 'the mark on Callinicus is not backed by a word').toContain('Hierarch');
  const eutychius = rows.find((r) => r.name.includes('Eutychius'));
  expect(eutychius.spoken, 'a row with no office does not say what kind of saint it is').toContain('Venerable');
});


test('the register offers the two faces the reference draws, and no third', async ({ page }) => {
  /*
   * **As reversed by the author on
   * 2026-09-10**. It had ruled that `expanded` was a third face beside `cards`
   * and `list`, reading the reference's two marks as two frames of one
   * three-mark control. The author has ruled that the two marks are the
   * control: compact and expanded, and nothing else.
   *
   * So the count is the assertion. Two marks is a claim a `toHaveCount(2)`
   * makes and a per-mode loop does not — a loop over the modes that exist
   * passes on a control carrying a fourth.
   *
   * **The words went, so the labels had to arrive** (§5.3). Two marks told
   * apart by shape and colour are nothing to a screen reader, so each carries
   * the word it stands for and the group keeps its `role` and its
   * `aria-pressed`. That is asserted here by accessible name rather than by
   * looking for an `sr-only` class, which would pass on a span nobody can
   * reach.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const group = page.locator('.register-view');
  await expect(group).toHaveAttribute('role', 'group');
  const marks = page.locator('.register-view button');
  await expect(marks, 'the control does not carry exactly two marks').toHaveCount(2);
  for (const [mode, word] of [
    ['cards', 'Cards'],
    ['expanded', 'Expanded'],
  ]) {
    const button = page.locator(`[data-reg-view="${mode}"]`);
    await expect(button, `the ${mode} mark has no accessible name`).toHaveAccessibleName(word);
    // The mark is the whole of what is drawn: `sr-only` is off-screen rather
    // than merely small, so the button's own ink is a 13 px box.
    const drawn = await button.evaluate((b) => b.querySelector('.vt').getBoundingClientRect().width);
    expect(drawn, `the ${mode} mark is not a 13 px box`).toBe(13);
  }

  // Only one is pressed, and it is the default.
  await expect(page.locator('[data-reg-view="cards"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.register-view [aria-pressed="true"]')).toHaveCount(1);

  /*
   * The expanded face is the day's own card repeated (§5.2): the hero's own
   * mount and `--mount`, the name a step up, the whole lede rather than two
   * clamped lines, and a way into each life.
   *
   * **The width is read off the hero, not written down.** It was pinned at the
   * reference's 340 until 2026-09-11, and by then the hero had not been 340
   * for a day: §10.24 made the day's picture five twelfths of what it shares
   * with the words, so it ran 244 → 568 px across the window while this face
   * stood still. The two agreed at one width and the test passed at every
   * width, because it was asking each of them a different question. The rule
   * the reference actually states is "every saint in the shape of the day's
   * own card", and a shape is a comparison.
   */
  await page.locator('[data-reg-view="expanded"]').click();
  await expect(page.locator('[data-register]')).toHaveClass(/is-expanded/);
  await expect(page.locator('.register-view [aria-pressed="true"]')).toHaveCount(1);
  await expect(page.locator('[data-reg-view="expanded"]')).toHaveAttribute('aria-pressed', 'true');

  const big = await page.evaluate(() => {
    const row = [...document.querySelectorAll('[data-register] .reg-card')].find(
      (r) => r.querySelector('.reg-pic img') && r.offsetParent,
    );
    const hero = document.querySelector('.hero-figure');
    const probe = document.createElement('span');
    probe.style.backgroundColor = 'var(--mount)';
    row.append(probe);
    const mount = getComputedStyle(probe).backgroundColor;
    probe.remove();
    const mat = row.querySelector('.reg-thumb');
    return {
      width: Math.round(mat.getBoundingClientRect().width),
      // The day's own card, measured in the same pass: the claim is that these
      // two are one shape, so neither number is worth having on its own.
      heroWidth: Math.round(hero.getBoundingClientRect().width),
      fill: getComputedStyle(mat).backgroundColor,
      mount,
      // The same mat as the day's own card, read off the hero rather than
      // written down twice.
      pad: parseFloat(getComputedStyle(mat).paddingTop),
      heroPad: parseFloat(getComputedStyle(hero).paddingTop),
      name: parseFloat(getComputedStyle(row.querySelector('.reg-name')).fontSize),
      clamp: getComputedStyle(row.querySelector('.reg-life')).webkitLineClamp,
      leads: mat.getBoundingClientRect().left < row.querySelector('.reg-body').getBoundingClientRect().left,
      ways: row.querySelectorAll('.reg-more').length,
      wayShown: row.querySelector('.reg-more').offsetParent !== null,
    };
  });
  /*
   * **The two are no longer one width, and cannot be** (2026-09-16). This read
   * `big.width === big.heroWidth` on the strength of "every saint in the shape
   * of the day's own card", which held while the shelf and the hero were the
   * same column. They are two columns of the four now — the hero in
   * `--saint-w`, the shelf in `--side-w` — so one number can no longer stand
   * for both. What survives is the half that was ever a shape rather than a
   * coincidence: the mount fills whatever column it is in, and wears the
   * hero's own mat.
   */
  /*
   * 200 px is `--card-pic`'s own floor and it is what binds here: five
   * twelfths of a 272 px column is 100, so the clamp holds the picture at the
   * width below which "a very tall icon is a sliver" — measured at 1440, where
   * the fraction used to give 244.
   */
  expect(big.width, 'the expanded mount is not filling its column at all').toBeGreaterThanOrEqual(200);
  expect(big.heroWidth, 'premise: the day card has no picture to compare against').toBeGreaterThan(0);
  expect(big.fill, 'the expanded mount is not the hero own mat colour').toBe(big.mount);
  expect(big.pad, 'the expanded mat is not the hero own').toBe(big.heroPad);
  expect(big.name, 'the expanded name is not --text-xl').toBe(21);
  expect(big.clamp, 'the expanded lede is still clamped').toBe('none');
  // Here the picture leads, as it does on the day's own card — the trailing
  // edge is the compact face's rule and its reason is a 48 px thumbnail.
  expect(big.leads, 'the expanded picture does not lead the row').toBe(true);
  expect(big.ways, 'the expanded card has no way into the life').toBe(1);
  expect(big.wayShown, 'the expanded card way into the life is not laid out').toBe(true);

  // Remembered, and reversible: a face the store rejected would come back as
  // cards after the reload, and a control with one live mark and no way back
  // would fail the return press.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('[data-register]')).toHaveClass(/is-expanded/);
  await page.locator('[data-reg-view="cards"]').click();
  await expect(page.locator('[data-register]')).toHaveClass(/is-cards/);
  await expect(page.locator('[data-register]'), 'the face it came from is still on the list').not.toHaveClass(
    /is-expanded/,
  );
});


test('a compact row carries a line of the life, and Daily headings are serif', async ({ page }) => {
  /*
   * Two claims from the same step and one page load.
   *
   * **The line of life** (§5.1): "the register says who else is commemorated;
   * this makes it say who they were" — the life's own opening paragraph,
   * clamped. It arrives with the saint's payload, so it is polled for rather
   * than read on the first frame.
   *
   * **One line since 2026-09-16, and it was two.** The shelf wears the
   * mockup's plate now and the mockup's own note is the trade: "the written
   * line drops to one on a tile this size — the second line was the first
   * thing the wider stamp took". What is asserted is unchanged in kind — a box
   * that stops, and more life than fits it — and the expanded face is where
   * two lines still live.
   *
   * **The serif headings**, per the author and the reference's own note that
   * this is a deliberate departure from base.css's site utility. Scoped: the
   * Saint page draws `.register-heading` too and was not asked about, so the
   * second half of this loads one and finds the small caps still there. That
   * is the assertion a route-less rule would fail.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  await expect
    .poll(
      () => page.evaluate(() => document.querySelectorAll('[data-register] .reg-life:not([hidden])').length),
      { message: 'no register row ever received a line of its life' },
    )
    .toBeGreaterThan(2);

  /*
   * The faces are read through a probe rather than by looking for "Literata":
   * `COLD_FACE=1` refuses the webfont and forces Times, and this suite runs
   * that way on anything that measures text. What is being asserted is that
   * the reading face is in use, whichever face that is on the machine.
   */
  const line = await page.evaluate(() => {
    const probe = (property) => {
      const el = document.createElement('span');
      el.style.fontFamily = `var(${property})`;
      document.body.append(el);
      const family = getComputedStyle(el).fontFamily;
      el.remove();
      return family;
    };
    const box = [...document.querySelectorAll('[data-register] .reg-life')].find((b) => !b.hidden);
    const s = getComputedStyle(box);
    return {
      clamp: s.webkitLineClamp,
      lines: Math.round(box.getBoundingClientRect().height / parseFloat(s.lineHeight)),
      words: box.textContent.trim().split(/\s+/).length,
      serif: s.fontFamily,
      reading: probe('--font-serif'),
    };
  });
  expect(line.clamp, 'the line of life is not clamped to one').toBe('1');
  expect(line.lines, 'the clamped box is not one line tall').toBeLessThanOrEqual(1);
  /*
   * And there is more life than fits, or the clamp is being asked about a
   * paragraph that was two lines anyway — the shape of green-by-absence this
   * suite has been caught by before.
   */
  expect(line.words, 'premise: this life is too short for the clamp to bite').toBeGreaterThan(20);
  expect(line.serif, 'the line of life is not set in the reading face').toBe(line.reading);

  const heads = await page.evaluate(() => {
    const probe = (property) => {
      const el = document.createElement('span');
      el.style.fontFamily = `var(${property})`;
      document.body.append(el);
      const family = getComputedStyle(el).fontFamily;
      el.remove();
      return family;
    };
    const read = (el) => {
      const s = getComputedStyle(el);
      return { family: s.fontFamily, caps: s.fontVariantCaps, size: parseFloat(s.fontSize) };
    };
    return {
      reading: probe('--font-serif'),
      apparatus: probe('--font-utility'),
      register: read(document.querySelector('.register-head .register-heading')),
      side: read(document.querySelector('.cal-side .register-heading')),
    };
  });
  expect(heads.register.family, 'the register heading is not serif').toBe(heads.reading);
  expect(heads.register.caps, 'the register heading is still in small caps').toBe('normal');
  expect(heads.register.size, 'the register heading is not --text-lede').toBe(19);
  expect(heads.side.family, 'a sidebar section heading is not serif').toBe(heads.reading);
  expect(heads.side.size, 'a sidebar section heading is not --text-lg').toBe(17);
  /* The two faces really are two, or the comparison above says nothing —
     `COLD_FACE=1` hands out Verdana and Times, and a machine with neither
     would collapse both probes onto the same fallback. */
  expect(heads.reading, 'premise: the two faces resolve alike here').not.toBe(heads.apparatus);

  // And nothing behind it moved: the Saint page keeps base.css's utility.
  await page.goto('/saints/lupus-the-martyr', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const saint = await page.evaluate(() => {
    const el = document.querySelector('.register-heading');
    const s = getComputedStyle(el);
    return { family: s.fontFamily, caps: s.fontVariantCaps };
  });
  expect(saint.caps, 'the Saint page lost its small caps to a Daily rule').toBe('all-small-caps');
  expect(saint.family, 'the Saint page heading went serif with Daily own').toBe(heads.apparatus);
});

/* ---- the desktop redesign, stage two: the shelf's own face (2026-09-16) --- */


test('the view toggle is two stroked marks at one size, and the live one is the accent', async ({ page }) => {
  /*
   * The mockup's own note beside `.views`: "two marks rather than two words —
   * a square for the pictures, four lines for the rows, drawn at the same size
   * so the pair reads as one control."
   *
   * Four 5 px diamonds and one larger diamond stood here until today, and they
   * said *small* and *large* rather than what either face draws. What the pair
   * has to be is two drawings of the same size, in the same weight of line,
   * differing only in what they draw — so the size is asserted as *equal*
   * rather than as a number, which is the claim "one control" actually makes.
   *
   * **The ink is on the button and the marks read `currentColor`.** A stroked
   * outline has no fill to colour, so the colour has to travel; that it does
   * is what the last two assertions are for. Trap 9: the tokens are painted,
   * never parsed.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const [accent, rule] = await tokenColours(page, '--accent', '--rule');

  const marks = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('.register-view button')].map((b) => {
        const svg = b.querySelector('svg.vt');
        const box = svg.getBoundingClientRect();
        return {
          view: b.dataset.regView,
          live: b.getAttribute('aria-pressed'),
          w: Math.round(box.width),
          h: Math.round(box.height),
          // A rect for the pictures and four lines for the rows: two drawings,
          // not one drawn twice.
          draws: [...svg.children].map((c) => c.tagName.toLowerCase()).join(','),
          lines: (svg.querySelector('path')?.getAttribute('d') ?? '').split('M').length - 1,
          weight: getComputedStyle(svg).strokeWidth,
          fill: getComputedStyle(svg).fill,
          ink: getComputedStyle(svg).stroke,
          // The word the mark stands for is still in the accessibility tree.
          word: b.textContent.trim(),
        };
      }),
    );

  const pair = await marks();
  expect(pair.length, 'the control is not a pair').toBe(2);
  expect(pair.map((m) => m.view)).toEqual(['cards', 'expanded']);
  // Drawn at the same size, which is what makes the two one control.
  expect(pair[0].w, 'the marks are not the same width').toBe(pair[1].w);
  expect(pair[0].h, 'the marks are not the same height').toBe(pair[1].h);
  expect(pair[0].w, 'a mark is not square').toBe(pair[0].h);
  // A square for the pictures and four lines for the rows.
  expect(pair[0].draws, 'the pictures mark is not a plate').toBe('rect');
  expect(pair[1].draws, 'the rows mark is not a line drawing').toBe('path');
  expect(pair[1].lines, 'the rows mark is not four lines').toBe(4);
  for (const m of pair) {
    expect(m.fill, `the ${m.view} mark is filled rather than stroked`).toBe('none');
    expect(m.weight, `the ${m.view} mark is not drawn at the pair's weight`).toBe(pair[0].weight);
    expect(m.word.length, `the ${m.view} mark lost the word it stands for`).toBeGreaterThan(0);
  }

  // The live one carries the accent and the other the rule, and the colour is
  // on the drawing because the button's own ink is what it reads.
  expect(pair.find((m) => m.view === 'cards').live, 'the shelf did not open on the plate').toBe('true');
  expect(pair.find((m) => m.view === 'cards').ink, 'the live mark is not the accent').toBe(accent);
  expect(pair.find((m) => m.view === 'expanded').ink, 'the quiet mark is not the rule').toBe(rule);

  /*
   * And it moves. Dispatched rather than clicked — trap 3: the control stands
   * in a sticky head inside the shelf's own scroller, and `click()` scrolls
   * its target into view, which is a scroll this test did not ask for.
   */
  await page.evaluate(() =>
    document.querySelector('[data-reg-view="expanded"]').dispatchEvent(new MouseEvent('click', { bubbles: true })),
  );
  await expect(page.locator('[data-register]')).toHaveClass(/is-expanded/);
  /*
   * Polled, because the ink is a `--dur-answer` transition and a read taken on
   * the frame after the press lands in the middle of it: the first run of this
   * test measured `rgb(168, 160, 142)`, which is neither token and is both.
   */
  await expect
    .poll(async () => (await marks()).find((m) => m.view === 'expanded').ink, {
      message: 'the accent did not move to the pressed mark',
    })
    .toBe(accent);
  expect((await marks()).find((m) => m.view === 'cards').ink, 'the mark that was live did not go quiet').toBe(rule);
});


test('the shelf head is pinned and its rule runs the width of the column', async ({ page }) => {
  /*
   * The mockup's `.shelf-head`, and its own note: pinned "while the saints go
   * under it — the same pinning the name has, so the two right-hand columns
   * behave alike".
   *
   * **The rule is the head's, not the heading's**, and that is the half of
   * this that stage one left. `.register-heading` carries its own underline
   * (base.css) which stops where the marks begin and sits *above* the head's
   * padding, so a row scrolling under a pinned head was visible in the gap
   * between the line and the head's bottom edge. One rule across the column at
   * the foot of the head is what the saints go under.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  // 22 September carries enough saints for the shelf to overflow its column.
  await page.goto('/calendar/2026-09-22', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const read = () =>
    page.evaluate(() => {
      const scroller = document.querySelector('.cal-bubble-scroll');
      const head = document.querySelector('.cal-bubble .register-head');
      const heading = head.querySelector('.register-heading');
      const list = document.querySelector('.cal-bubble [data-register]');
      const tile = [...document.querySelectorAll('.cal-bubble .reg-card')].find((r) => r.offsetParent);
      return {
        scrollTop: scroller.scrollTop,
        headTop: head.getBoundingClientRect().top,
        headWidth: Math.round(head.getBoundingClientRect().width),
        listWidth: Math.round(list.getBoundingClientRect().width),
        tileTop: tile.getBoundingClientRect().top,
        headRule: getComputedStyle(head).borderBottomWidth,
        headingRule: getComputedStyle(heading).borderBottomWidth,
        ground: getComputedStyle(head).backgroundColor,
      };
    });

  const before = await read();
  expect(before.listWidth, 'premise: the shelf has no width to measure').toBeGreaterThan(100);
  // One rule, across the whole head, and the heading has given its own up.
  expect(before.headRule, 'the head draws no rule of its own').toBe('1px');
  expect(before.headingRule, 'the heading still draws the rule the head should').toBe('0px');
  expect(before.headWidth, 'the head is narrower than the column it heads').toBe(before.listWidth);
  expect(before.ground, 'the head is not opaque, so the saints pass through it').not.toMatch(/, 0\)$/);

  /*
   * Scrolled by the shelf's own scroller rather than by a wheel: trap 17's
   * sibling — what is being asserted is where the head lands, and the page
   * itself has given up its scroll past 1024 px.
   */
  await page.evaluate(() => {
    document.querySelector('.cal-bubble-scroll').scrollTop = 240;
  });
  await expect.poll(async () => (await read()).scrollTop).toBeGreaterThan(200);
  const after = await read();

  expect(after.tileTop, 'premise: the shelf did not actually move under the head').toBeLessThan(before.tileTop - 100);
  expect(Math.abs(after.headTop - before.headTop), 'the head went up with the saints').toBeLessThan(1);
});
