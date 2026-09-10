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
   *
   * **Two of its assertions were rewritten on 2026-09-10, and the reason is a
   * decision rather than a drift** (docs/daily-desktop-visuals.md §10.3,
   * §10.19). This read `pictureAbove` and `pictureWidth > 100`, which were the
   * borrowed Index card: a full-width picture stacked over the name. The
   * compact face is a row now — a 60 px mat at the row's *trailing* edge — and
   * that is the one place the shipped page deliberately differs from the
   * reference, because the bookmark has nowhere else to go over a 48 px
   * thumbnail (PLAN §4). So the shape assertions say the new shape and say
   * which decision put it there; the four claims the author actually made are
   * untouched, and `§10.4`'s promise that this test protects the reader's
   * remembered choice is the part that had to survive.
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
        // At the trailing edge of the row, which is what §10.3 rules and what
        // a leading-edge mat would reverse.
        pictureTrails: thumb && body ? thumb.left >= body.right - 1 : null,
        pictureWidth: thumb ? Math.round(thumb.width) : null,
      };
    });

  const wide = await shape();
  expect(wide.columns, 'the cards are not in columns').toBeGreaterThan(1);
  expect(wide.pictureAbove, 'the picture stacked over the name again').toBe(false);
  expect(wide.pictureTrails, 'the picture is not at the row’s trailing edge').toBe(true);
  // The mat: 48 px of picture and 6 px of padding either side, fixed however
  // tall the icon is (§10.2). Wider than the list's 40 px thumbnail and a long
  // way short of the 190 px card this used to be.
  expect(wide.pictureWidth, 'the mat is not 60 px wide').toBe(60);

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

/* ---- the desktop rebuild, step 9: the register's three faces (2026-09-10) - */


test('a register mat is 60 px wide however tall its picture is', async ({ page }) => {
  /*
   * docs/daily-desktop-visuals.md §5.1 and §10.2: "fix the mat's WIDTH at
   * 60px (48 + 6px padding), let the height derive within the existing clamp".
   * `--reg-aspect` is untouched, so what a picture is *drawn* at is still the
   * clamped shape `cardCrop` writes per saint — and the test above this one
   * still holds that shape to the hero's own two limits.
   *
   * The claim is that the two are now separable: one fixed number and one
   * derived one, where before the whole box derived. A mat whose height did
   * *not* derive would pass a width check on its own, so the heights are asked
   * to differ as well.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const mats = await page.evaluate(() =>
    [...document.querySelectorAll('[data-register].is-cards .reg-card')]
      .filter((row) => row.querySelector('.reg-pic img'))
      .map((row) => {
        const mat = row.querySelector('.reg-thumb').getBoundingClientRect();
        const pic = row.querySelector('.reg-pic').getBoundingClientRect();
        return { matW: Math.round(mat.width), matH: Math.round(mat.height), picW: Math.round(pic.width) };
      }),
  );
  expect(mats.length, 'premise: this day has no pictured register rows').toBeGreaterThan(2);
  for (const m of mats) {
    expect(m.matW, 'a mat is not 60 px wide').toBe(60);
    // 48 of picture and 6 of padding either side, which is where the 60 came
    // from — asserted rather than implied, so a mat that kept its width by
    // squeezing the picture would fail.
    expect(m.picW, 'the picture inside the mat is not 48 px').toBe(48);
  }
  expect(
    new Set(mats.map((m) => m.matH)).size,
    'every mat is the same height, so the height is not deriving',
  ).toBeGreaterThan(1);
});


test('a register row with no icon shows its type as a mark, and says it in words', async ({ page }) => {
  /*
   * docs/daily-desktop-visuals.md §5.1 and §10.10: a glyph keyed off `types`
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


test('the register offers three faces, and the third is expanded rather than instead', async ({ page }) => {
  /*
   * docs/daily-desktop-visuals.md §10.4: "`registerView` becomes
   * `'cards' | 'expanded' | 'list'` … the control replaces the Cards/List
   * word-pair with THREE marks". The reference drew two because it was showing
   * two faces at once, one per theme frame; it was never an argument for
   * deleting a face the author asked for and the site promised to remember.
   *
   * **The words went, so the labels had to arrive** (§5.3). Three marks told
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
  await expect(marks, 'the control does not carry three marks').toHaveCount(3);
  for (const [mode, word] of [
    ['cards', 'Cards'],
    ['expanded', 'Expanded'],
    ['list', 'List'],
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
   * The expanded face is the day's own card repeated (§5.2): a 340 px mount in
   * the hero's own `--mount`, the name a step up, the whole lede rather than
   * two clamped lines, and a way into each life.
   */
  await page.locator('[data-reg-view="expanded"]').click();
  await expect(page.locator('[data-register]')).toHaveClass(/is-expanded/);
  await expect(page.locator('.register-view [aria-pressed="true"]')).toHaveCount(1);
  await expect(page.locator('[data-reg-view="expanded"]')).toHaveAttribute('aria-pressed', 'true');

  const big = await page.evaluate(() => {
    const row = [...document.querySelectorAll('[data-register] .reg-card')].find((r) =>
      r.querySelector('.reg-pic img'),
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
  expect(big.width, 'the expanded mount is not 340 px').toBe(340);
  expect(big.fill, 'the expanded mount is not the hero own mat colour').toBe(big.mount);
  expect(big.pad, 'the expanded mat is not the hero own').toBe(big.heroPad);
  expect(big.name, 'the expanded name is not --text-xl').toBe(21);
  expect(big.clamp, 'the expanded lede is still clamped').toBe('none');
  // Here the picture leads, as it does on the day's own card — the trailing
  // edge is the compact face's rule and its reason is a 48 px thumbnail.
  expect(big.leads, 'the expanded picture does not lead the row').toBe(true);
  expect(big.ways, 'the expanded card has no way into the life').toBe(1);
  expect(big.wayShown, 'the expanded card way into the life is not laid out').toBe(true);

  /*
   * And the list survives, which is the whole of §10.4: a reader who chose it
   * before this change still has it, and the choice outlives a reload.
   */
  await page.locator('[data-reg-view="list"]').click();
  await expect(page.locator('[data-register]')).toHaveClass(/is-list/);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('[data-register]')).toHaveClass(/is-list/);
  // The expanded face is remembered the same way; a face the store rejected
  // would come back as cards here.
  await page.locator('[data-reg-view="expanded"]').click();
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('[data-register]')).toHaveClass(/is-expanded/);
});


test('a compact row carries a line of the life, and Daily headings are serif', async ({ page }) => {
  /*
   * Two claims from the same step and one page load.
   *
   * **The line of life** (§5.1): "the register says who else is commemorated;
   * this makes it say who they were" — the life's own opening paragraph,
   * clamped to two lines. It arrives with the saint's payload, so it is polled
   * for rather than read on the first frame.
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
  expect(line.clamp, 'the line of life is not clamped to two').toBe('2');
  expect(line.lines, 'the clamped box is not two lines tall').toBeLessThanOrEqual(2);
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
