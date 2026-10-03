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
  tokenColours,
} from './helpers.js';
// The records the month reads its feast mark from, so the unmarked day below is
// found in the same place the page finds it.
import { recordedDay } from '../src/data/liturgical-days.js';

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
  /* `> button`, not every button in the column: since 2026-10-03 the gutter
     also holds the month and the four names either side of it, which are
     buttons too. The claim is about the toggle, and the toggle is the direct
     child. */
  const jump = page.locator('.cal-jump > button');
  await expect(jump).toHaveCount(1);
  /*
   * **The state, not the string's length.** This asked for more than three
   * characters, which is a measurement standing in for the claim: the control
   * draws a glyph and nothing readable, so its name has to come from the
   * label. Both halves are asserted — it says nothing itself, and the label
   * says something.
   */
  const name = await jump.getAttribute('aria-label');
  expect((await jump.textContent())?.trim(), 'premise: the control draws words of its own').toBe('');
  expect((name ?? '').trim(), 'the icon-only control has no name but its glyph').not.toBe('');
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


test('past 1024 px the month carries the rail’s own two marks, as the phone does', async ({ page }) => {
  /*
   * Author, 2026-09-11: "The highlight over today on the monthly display is
   * not what the mockup had … whatever that bubble is trying to do is residual
   * from mobile and needs to be adjusted to this desktop view."
   *
   * It was residual, and in its own words: `.month-grid button.is-today
   * .day-num::before` describes itself as "the same shape at the month's
   * grain — see the week strip's own copy of this rule", the week strip being
   * the phone's control. It arrived 2026-08-26, a fortnight before the desktop
   * reference was drawn, and that reference's month marks one cell and only
   * one: `border: 1px solid var(--accent)` at radius 0 with its numeral in
   * rubric. On the page a reader opens — today, selected — the two marks
   * landed on the same cell and nested, a 4 px rounded rubric bubble inside a
   * square accent one.
   *
   * The test above this one is the phone's, and keeps the ring: the 2026-08-26
   * instruction is about the week strip and still holds where the week strip
   * is the control. This is the pair to it, which is why they are neighbours.
   *
   * **Overruled 2026-10-03**: "In weekly display I like how the current day is
   * shown and also how the selected day is shown. Match that in the calendar
   * view. And of course make sure this goes to desktop as well because desktop
   * uses the same calendar look." So the ring is drawn here too, and the cell
   * keeps the square edge the reference gave it. The one piece of the rail's
   * mark that did not come across is its `--rule` hairline, which measures
   * 1.41:1 on this ground; the border is `--accent` at both widths, which is
   * the paragraph above's own finding kept rather than re-learned.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  // A day that is today, so both marks would be competing for one cell — the
  // state the author photographed, and the one the desktop page opens on.
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('.cal-main .month-grid')).toBeVisible();

  const m = await page.evaluate(() => {
    const today = document.querySelector('.cal-main .month-grid button.is-today');
    if (!today) return { none: true };
    const ring = getComputedStyle(today.querySelector('.day-num'), '::before');
    const cell = getComputedStyle(today);
    return {
      ringContent: ring.content,
      // The mark the reference does draw is the cell's own square border.
      cellRadius: cell.borderRadius,
      cellBorder: cell.borderStyle,
      selected: today.getAttribute('aria-current'),
    };
  });

  expect(m.none, 'today is not in the month at all').toBeFalsy();
  /*
   * `content: none` is the whole assertion, and the one beneath it is why
   * there is no second: a pseudo-element that was never generated still
   * reports every other property the rule declared, so `borderStyle` comes
   * back `solid` whether the ring is drawn or not. Asserting it would have
   * been an instrument reading what the code says about itself — the trap
   * CLAUDE.md numbers 14 — and it was written that way first.
   */
  expect(m.ringContent, 'today’s ring is missing from the desktop month').not.toBe('none');
  // And the mark that stays is the reference's: a square cell border, no
  // radius anywhere near it.
  expect(m.cellRadius, 'the month cell has picked up a radius').toBe('0px');
  expect(m.cellBorder, 'the selected cell has lost its border').toBe('solid');
});


test('the week takes a sideways swipe and the month an up-and-down one', async ({ page }) => {
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

  /*
   * **The month's own gesture turned on 2026-10-03**, and turned again the
   * same day. The two arrows above and below the heading were replaced by the
   * months themselves, stacked in the gutter in order down the column
   * (author: "replace the arrows with faded months above and below ... make
   * them animated, the month abbreviations move down the same way the calendar
   * days move down or up").
   *
   * That settles the sign for the finger too: the stack runs forward in time
   * downward, so a drag upward brings the month *after* this one into view,
   * the way a scroll does, and the names roll with the grid rather than
   * against it. `SPIN` in views/daily/picker.js is the one place it is
   * written.
   */
  await page.locator('[data-month]').click();
  await expect(page.locator('.cal-month')).toBeVisible();
  await swipe(page, '.cal-month', 0, -120);
  await expect(page.locator('.month-name')).toHaveText('Sep');
  await swipe(page, '.cal-month', 0, 120);
  await expect(page.locator('.month-name')).toHaveText('Aug');

  // A short drag is a mistap, and a mostly-sideways one belongs to the day.
  await swipe(page, '.cal-month', 0, -20);
  await swipe(page, '.cal-month', 200, -120);
  await expect(page.locator('.month-name')).toHaveText('Aug');
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


test('the month runs the control\'s full width, and its name heads its own line', async ({ page }) => {
  /*
   * **The peeked columns went on 2026-10-03** and the month's grid took the
   * width they stood in, because the phone's month and the desk's are one
   * drawing now and the desk's had given them up in 2026-09-10. So the two
   * grains no longer share column centres: the rail keeps its own snap inset
   * at each edge, for the half-cut neighbours that are the whole of what the
   * fade is hinting at, and the month runs edge to edge inside the same box.
   */
  await ready(page);
  await phone(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const box = async (sel) => (await page.locator(sel).first().boundingBox());
  const strip = await box('.week-strip');

  await page.locator('[data-month]').click();
  await expect(page.locator('.cal-month')).toBeVisible();
  await expect(page.locator('.cal-month .peek')).toHaveCount(0);

  const grid = await box('.month-grid');
  expect(Math.round(grid.x)).toBe(Math.round(strip.x));
  expect(Math.round(grid.x + grid.width)).toBe(Math.round(strip.x + strip.width));

  /*
   * **The name went back to the gutter on 2026-10-03** (author: "Reformat
   * October 2026 to just Oct, then move it to the left-side space under the
   * button that toggles calendar and weekly displays"), and took its stepping
   * with it: the month before and the month after stand above and below it in
   * the same column, and the two hairline marks are gone.
   *
   * So the three are stacked beside the grid rather than above it, which is
   * what takes the head's height out of the row — and out of the close, where
   * it used to be dropped on one tick. The grid's own top is above all three.
   */
  const name = await box('.month-name');
  const up = await box('.mpick-prev');
  const down = await box('.mpick-next');
  expect(up.y + up.height).toBeLessThanOrEqual(name.y + 1);
  expect(name.y + name.height).toBeLessThanOrEqual(down.y + 1);
  // Beside the grid, not above it: the gutter is left of the column.
  expect(up.x + up.width).toBeLessThanOrEqual(grid.x + 1);
  expect(grid.y).toBeLessThanOrEqual(up.y + 1);
  /* Measured on the rows, not on `.month-name`: that is the inner span the
     month's own word sits in, centred inside its row, so its x is the text's
     and not the column's. */
  const now = await box('.mpick-now');
  expect(Math.round(now.x)).toBe(Math.round(up.x));
  expect(Math.round(up.x)).toBe(Math.round(down.x));
});


test('the month\'s day names stand over the month\'s own columns', async ({ page }) => {
  /*
   * The names sat on the week rail's columns to the pixel until 2026-10-03,
   * which is what made toggling grain read as rows unfurling from under them
   * (author, 2026-08-21). The month gave up the peeked columns that inset it
   * to the rail's seven, so the two grains part company here and the names
   * follow the grain they belong to — they are inside `.cal-month` and are
   * drawn only while it is open.
   *
   * Measured on the text rather than on the boxes: a name is a grid cell
   * carrying its own padding and a date is a flex column inside a button, so
   * the two boxes differ exactly where the glyphs do not.
   */
  await ready(page);
  await phone(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('[data-month]').click();
  await expect(page.locator('.cal-month')).toBeVisible();
  await page.waitForTimeout(600);

  const centres = await page.evaluate(() => {
    const range = document.createRange();
    const mid = (el) => {
      range.selectNodeContents(el);
      const r = range.getBoundingClientRect();
      return Math.round(r.x + r.width / 2);
    };
    const names = [...document.querySelectorAll('.month-days .month-day-name')].map(mid);
    // The grid's first seven cells are its first row, whatever they hold:
    // a leading day of the month before is a column of this month all the same.
    const cells = [...document.querySelectorAll('.month-grid > *')]
      .slice(0, 7)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return Math.round(r.x + r.width / 2);
      });
    return { names, cells };
  });

  expect(centres.names).toHaveLength(7);
  expect(centres.cells).toHaveLength(7);
  for (let i = 0; i < 7; i += 1) {
    expect(Math.abs(centres.names[i] - centres.cells[i])).toBeLessThanOrEqual(1);
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

  /*
   * The grid itself is what must not spend height on leading. The control
   * around it grew a head on 2026-10-03 — the month's name with a step above
   * and below it — and that is a declared cost, not drift: 32 px a step and
   * the name's own line.
   */
  const grid = await page.locator('.month-grid').boundingBox();
  expect(grid.height).toBeLessThan(140);
  const head = await page.locator('.month-head').boundingBox();
  expect(head.height).toBeLessThan(90);
  const controls = await page.locator('.cal-controls').boundingBox();
  expect(controls.height).toBeLessThan(250);
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


test('a month travels up and down, and its day names do not', async ({ page }) => {
  // The week got this on 2026-08-21 and the month did not, because the month's
  // column could not travel while the day names above it sat inside the same
  // button. The names moved to a line of their own so that it could, and on
  // 2026-10-03 the travel turned a quarter: the grain is on the other axis and
  // the names still do not move.
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

  const during = await duringMove(page, '.month-body', 'month-row', '.mpick-next');
  expect(during.rows).toBe(2);
  /* Parked in pixels and by `top`, not by a percentage of `left`. The step
     *down* the stack is the month after this one, and since 2026-10-03 it
     arrives from below — the stack runs forward in time downward and the grid
     travels with it — so the month being left is parked above. */
  expect(during.sides).toEqual(['']);
  expect(during.sideTops).toHaveLength(1);
  expect(parseFloat(during.sideTops[0])).toBeLessThan(0);
  expect(during.hidden).toBe('true');
  expect(during.reach).toBe('none');
  expect(during.clipped).toBe(true);

  await expect(page.locator('.month-name')).toHaveText('Sep');
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
  // The movement decides, not the gesture (STRUCTURE.md, unchanged by the
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
  // September 2026 is five rows and August is six, so dragging between them is
  // the case where the month arriving is taller than the viewport
  // holding it and would be cut off at the bottom for the length of the drag.
  await ready(page);
  await phone(page);
  await page.goto('/calendar/2026-09-04', { waitUntil: 'networkidle' });
  await page.locator('[data-month]').click();
  await page.waitForTimeout(600);
  const fiveRows = (await page.locator('.month-body').boundingBox()).height;

  // Up is back: September to August, and the finger goes the way the arrow
  // above the name points (author, 2026-10-03).
  /* **Downward, which is backward in time** since 2026-10-03: the stack runs
     forward down the gutter and the grid travels with it, so August - the
     six-row month this test needs arriving - is reached by dragging down. */
  await dragGrain(page, '.cal-month', 60, { release: false, axis: 'y' });
  const held = await page.evaluate(() => {
    const body = document.querySelector('.month-body');
    return {
      rows: body.querySelectorAll('.month-row').length,
      pinned: body.style.height,
      transform: body.querySelector('.grain-track').style.transform,
    };
  });
  expect(held.rows).toBe(3);
  // The grid goes where the finger goes.
  expect(held.transform).toMatch(/^translateY\(\d/);
  // The body takes the tallest of the three and holds it for as long as the
  // reader does, so August's sixth row is there to be dragged into view.
  expect(parseFloat(held.pinned)).toBeGreaterThan(fiveRows);

  await releaseGrain(page, '.cal-month', 60, { axis: 'y' });
  await expect(page.locator('.month-name')).toHaveText('Aug');
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


test('a month steps up and down and carries its height with it', async ({ page }) => {
  // August 2026 is six rows and September is five, so stepping between them is
  // the case where the page below would otherwise jump between two frames.
  await ready(page);
  await phone(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await page.locator('[data-month]').click();
  await page.waitForTimeout(600);
  const six = await page.locator('.month-body').boundingBox();

  await page.locator('.mpick-next').click();
  await expect(page.locator('.month-name')).toHaveText('Sep');
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
   * calendar — one per commemoration, capped at five — and STRUCTURE.md's "Dense
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

  /*
   * The feast mark is the one place the calendar spends gold (author,
   * 2026-08-26: "Gold is almost unused"). 21 September is the Nativity of the
   * Theotokos in the Russian calendar and its record carries the day's hymns.
   *
   * **`--feast`, not `--gold`, since 2026-09-10.** The month grid grows a
   * feast mark of its own and the two grains cannot say one thing in two
   * golds, so the dot moved onto a token that clears the 3:1 a mark carrying
   * information alone has to — `--gold` here was 2.62:1 on the field.
   * `tests/contrast.test.mjs` holds the number; this holds the wiring.
   */
  await page.goto('/calendar/2026-09-21', { waitUntil: 'networkidle' });
  const feast = page.locator('.week-strip [data-iso="2026-09-21"] .mark-feast');
  await expect(feast).toHaveCount(1);
  // Both sides of the comparison are colours the browser painted, since
  // 2026-09-10: `getPropertyValue` returns a hex for an ordinary custom
  // property and a computed colour for one the theme cross-fade registered,
  // and this converted the painted mark to hex to meet the first of those.
  const [feastToken, goldToken] = await tokenColours(page, '--feast', '--gold');
  const painted = await feast.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(painted).toBe(feastToken);
  // And it is a different gold from the decorative one, which is the whole
  // point of the pair: a token that carries a fact takes a floor.
  expect(painted).not.toBe(goldToken);

  /*
   * **And the month says the same two things in its own idiom**, at both
   * widths since 2026-10-03: the feast as a diamond in the cell's corner, the
   * fast as the numeral's own colour, and both in the cell's accessible name.
   * The density dots are gone from it as well.
   */
  await page.locator('[data-month]').click();
  await page.waitForTimeout(600);
  await expect(page.locator('.density')).toHaveCount(0);
  await expect(page.locator('.month-grid .day-mark')).toHaveCount(0);
  const cell = page.locator('.month-grid [data-iso="2026-09-21"]');
  await expect(cell.locator('.month-feast')).toHaveCount(1);
  await expect(cell).toHaveAttribute('aria-label', /a feast$/);

  /*
   * **A Sunday carries no diamond** (author, 2026-10-03): every Sunday has
   * resurrection hymns, so a mark drawn on hymns alone lands on all of them
   * and stops telling the reader anything. 20 September 2026 is a Sunday whose
   * record carries hymns, and it is the case the rule was written for.
   */
  const sundayCell = page.locator('.month-grid [data-iso="2026-09-20"]');
  await expect(sundayCell.locator('.month-feast')).toHaveCount(0);
  await expect(sundayCell).not.toHaveAttribute('aria-label', /a feast$/);
  await expect(page.locator('.week-strip [data-iso="2026-09-20"] .mark-feast')).toHaveCount(0);
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
    await page.locator('.mpick-next').click();
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
   * all until it took a colour, and STRUCTURE.md's rule is that the words say
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
      document.querySelector('.mpick-prev').click();
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

  /*
   * In the month's head, and still carrying its words — **as its accessible
   * name, since 2026-09-10**. The
   * control is a four-corner mark now, because at 19 rem the head is 272 px
   * and the words took about a hundred of them; the author's own instruction
   * ("change to 'Open Fullscreen'", 2026-09-02) is about what this button
   * says, and it still says it to a screen reader and to a pointer. So the
   * assertion moved from the text to the name rather than being dropped —
   * a mark with no name would be a control nobody can identify.
   *
   * This asked "is it under `.cal-week`" until 2026-09-10, which had been
   * vacuous since 2026-09-02: the rail is `display: none` at this width, so
   * its rect is all zeros and any button anywhere on the page cleared it. The
   * real relationship is to the month, which is the desktop's picker — the
   * button sits on the month's own heading, above the grid.
   */
  const open = page.locator('[data-fullcal]');
  await expect(open).toHaveAccessibleName(/Open Fullscreen/i);
  await expect(open, 'the words are not offered to a pointer').toHaveAttribute(
    'title',
    /Open Fullscreen/i,
  );
  const placed = await page.evaluate(() => {
    const button = document.querySelector('[data-fullcal]');
    const grid = document.querySelector('.month-grid').getBoundingClientRect();
    return {
      inHead: Boolean(button.closest('.month-head')),
      aboveGrid: button.getBoundingClientRect().bottom <= grid.top + 1,
    };
  });
  expect(placed.inHead, 'the button is not in the month head').toBe(true);
  expect(placed.aboveGrid, 'the button is not above the grid it opens').toBe(true);

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
  await expect(page.locator('.cal-date')).toHaveText(/16 Apr(il)? 2026/);
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

  /*
   * And the tablet keeps the long month, which is the other half of it. It
   * was the desk that kept it until 2026-09-18, when REVIEW-2's finding 14
   * put the date in a 213-246 px column at 17 px and the long month stopped
   * fitting on the line the finding asks for. Between 560 and 1023.98 the day
   * panel is still the width of the window and the month is still spelled.
   */
  await page.setViewportSize({ width: 900, height: 900 });
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
  await expect(page.locator('.month-grid [data-iso]:not(.month-out)').first()).toBeVisible();

  const m = await page.evaluate(() => {
    const controls = document.querySelector('.cal-controls').getBoundingClientRect();
    const month = document.querySelector('.cal-month').getBoundingClientRect();
    const grid = document.querySelector('.month-grid').getBoundingClientRect();
    const full = document.querySelector('[data-fullcal]');
    const fullBox = full.getBoundingClientRect();
    return {
      spare: Math.round(month.left - controls.left),
      gridLeft: Math.round(grid.left),
      inHead: Boolean(full.closest('.month-head')),
      fullWords: full.getAttribute('aria-label'),
      fullMark: Boolean(full.querySelector('svg')),
      fullAboveGrid: fullBox.bottom <= grid.top + 1,
    };
  });
  /*
   * **A column is held open, and it is no longer the toggle's** (author,
   * 2026-10-03: "move it to the left-side space under the button that toggles
   * calendar and weekly displays ... replace the arrows with faded months
   * above and below"). The toggle itself is hidden at this width - there is no
   * week to toggle to - and what stands in the gutter is the month's name
   * between the two it steps to. The 2026-09-02 instruction this test carries
   * was about not reserving space for a control that had been removed; the
   * space is occupied again, by the control that replaced it.
   */
  expect(m.spare, 'the gutter is not holding the month names').toBeGreaterThan(4);
  await expect(page.locator('.mpick-prev'), 'the step back is not in the gutter').toBeVisible();
  await expect(page.locator('.mpick-next'), 'the step on is not in the gutter').toBeVisible();
  /*
   * **It moved into the month's own head on 2026-09-10**
   *, from the column's right margin under
   * the grid where the author put it on 2026-09-02 ("move it right justified
   * to the rightmost column margin and change to 'Open Fullscreen'"). The head
   * grew two steppers and a reckoning in the same step and the calendar's own
   * way out belongs on the calendar's own heading.
   *
   * **The words are unchanged**, and that is asserted rather than assumed: the
   * instruction quoted above is about what this button *says*, and only its
   * placement is what the rebuild reconsidered. **Since 2026-09-10 it says
   * them as its accessible name** and draws a four-corner mark instead
   * (§10.13) — the head is 272 px at 19 rem and the words took about a hundred
   * of them, which collapsed the two steppers either side to nothing.
   */
  expect(m.inHead, 'the fullscreen control is not in the month head').toBe(true);
  expect(m.fullWords, 'the fullscreen control lost its words').toBe('Open Fullscreen');
  expect(m.fullMark, 'the fullscreen control is not a mark').toBe(true);
  expect(m.fullAboveGrid, 'the button is not above the grid it opens').toBe(true);

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

  /*
   * **The head was rebuilt on 2026-09-10**: the name and its reckoning stand together between two steppers
   * rather than on the column's two margins, and the reckoning reads as a
   * bracket after the month it counts — "September 2026 (Julian)".
   *
   * So what is pinned is what the instruction was actually about — the two
   * facts about this grid, which month and by whose arithmetic, on one row
   * and reading as a heading — plus the new relationship: the reckoning
   * follows the name immediately rather than being thrown to a margin, and
   * the brackets are drawn rather than typed into five locale packs.
   */
  const head = await page.evaluate(() => {
    const nameEl = document.querySelector('.month-name');
    const recEl = document.querySelector('[data-reckoning]');
    const grid = document.querySelector('.month-grid').getBoundingClientRect();
    const name = nameEl.getBoundingClientRect();
    const rec = recEl.getBoundingClientRect();
    const btn = document.querySelector('[data-reckoning-btn]');
    const before = getComputedStyle(btn, '::before').content;
    const after = getComputedStyle(btn, '::after').content;
    return {
      /* **The name left this row on 2026-10-03** for the gutter beside the
         grid (author: "move it to the left-side space under the button that
         toggles calendar and weekly displays"), so "on the same row" is no
         longer true of these two and asserting it would be asserting the old
         arrangement. What the 2026-09-02 instruction was for survives: the
         reckoning is drawn with the month it counts, at the head of that
         month's own column, and the two do not collide. */
      headsTheGrid: rec.top < grid.top + 1 && Math.round(rec.left) === Math.round(grid.left),
      gap: Math.round(rec.left - name.right),
      brackets: `${before}${after}`,
      size: getComputedStyle(btn).fontSize,
      fullName: nameEl.textContent.trim(),
    };
  });
  expect(head.headsTheGrid, 'the reckoning does not head the month it counts').toBe(true);
  /* The gutter is 34 px and sits left of the grid, so the distance from the
     name to the reckoning is now a column's width rather than a word's. What
     must not happen is the two overlapping. */
  expect(head.gap, 'the reckoning is on top of the month name').toBeGreaterThan(0);
  expect(head.brackets, 'the reckoning is not in brackets').toBe('"("")"');
  // 12 px, --text-2xs: the quietest fact in the head (§10.8). Never 14.
  expect(head.size, 'the reckoning is not at --text-2xs').toBe('12px');
  // The civil 14 September is the Julian 1 September, by the church's own
  // default reckoning now in force before any explicit choice.
  /* **Abbreviated at both widths since 2026-10-03** (author: "Reformat October
     2026 to just Oct"). The claim this was making — the desk has room for the
     whole word and should print it — was overturned when the name moved into a
     34 px gutter, where the whole word does not fit and the year says nothing
     the three rows around it do not. What is still asserted is that it is this
     month's name and not another's. */
  expect(head.fullName, 'the gutter is not naming the month the grid draws').toBe('Sep');

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
  /*
   * **"R. Julian" printed, "Revised Julian" spoken** (2026-09-10). The head
   * has a stepper either side of these words now and 19 rem to hold all of it
   * two steps from here, and this is the one of the three names that does not
   * fit; the abbreviation is a layout's need, so the accessible name keeps the
   * calendar's whole name and the chooser's rows below keep it too.
   */
  await expect(button).toHaveText('R. Julian');
  await expect(button).toHaveAttribute('aria-label', /Revised Julian$/);
  await expect(page.locator('[data-reckoning-pop] [data-pick="revised-julian"]')).toHaveText('Revised Julian');
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
  await expect(page.locator('.cal-date')).toHaveText(/14 Sep(tember)?/);
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
   * page is still written in. STRUCTURE.md's "civil date and only the civil
   * date" rule now holds only for a reader whose church actually keeps
   * Gregorian, or who has chosen it outright (checked below).
   */
  await expect(heading).toHaveText(/Wednesday, 20 Aug(ust)? 2026/);
  const civilHero = await hero.textContent();

  const pick = async (id) => {
    await page.locator('[data-reckoning-btn]').click();
    await page.locator(`[data-reckoning-pop] [data-pick="${id}"]`).click();
  };

  // Gregorian, chosen outright: the civil date the URL was always written
  // in, and still nothing re-sourced — the same saints as every other
  // reckoning shows for this same real day.
  await pick('gregorian');
  await expect(heading).toHaveText(/Wednesday, 2 Sep(tember)? 2026/);
  await expect(hero).toHaveText(civilHero);

  // Julian, the Russian church's own: the day is renamed, and there is
  // nothing to re-source — the same saints, thirteen days earlier in the
  // reader's own reckoning.
  await pick('julian');
  await expect(heading).toHaveText(/Wednesday, 20 Aug(ust)? 2026/);
  await expect(monthName).toHaveText('Aug');
  await expect(hero).toHaveText(civilHero);

  // The month grid is the Julian month, and the cell for the day the reader is
  // standing on carries the Julian numeral against the civil date the URL and
  // every link on the page are still written in.
  const grid = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.month-grid [data-iso]:not(.month-out)')];
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
  await expect(heading).toHaveText(/Wednesday, 2 Sep(tember)? 2026/);
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
  await expect(heading).toHaveText(/Wednesday, 20 Aug(ust)? 2026/);
  await expect(monthName).toHaveText('Aug');
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


/* ---- the month redesigned for the desk, 2026-09-10 ---------------------- */

/*
 * Three claims, three tests,
 * because they fail independently: the grid's own shape, the mark it grew, and
 * the control that steps it. Each was backed out and watched to fail.
 */

test('the month fills its own corners, and the days there are days like any other', async ({ page }) => {
  /*
   * The peeked columns — two columns of a neighbouring month standing
   * *outside* the seven, there since 2026-08-21 — are what kept the right
   * column above 400 px. They went past 1024 px on 2026-09-10 and at every
   * width on 2026-10-03, when the author ruled the phone's month and the
   * desk's one drawing; the days either side come inside the grid on its own
   * rows instead: numbered, marked, tinted toward the field.
   *
   * **And they are buttons, since 2026-10-03** (author: "They are unclickable.
   * Retarded mistake - fix"). They were `aria-hidden` spans on §10.6's
   * reasoning that the tint they then carried would be out of axe's reach;
   * measured, it is not — axe matches on `isVisibleOnScreen` — so the tint
   * went and `--ink-soft` took its place, and with the tint gone the
   * `aria-hidden` was buying nothing but unreachability. Picking one selects
   * that date and carries the grid to the month it belongs to.
   *
   * The premise is checked rather than assumed: September 2026 by the
   * Gregorian reckoning `ready` sets starts on a Tuesday and ends on a
   * Wednesday, so there is exactly one day of August in front of it and four
   * of October behind.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-09-14', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  // Gone from the markup, not merely hidden: the month is stepped from the two
  // marks in its own head at both widths now.
  await expect(page.locator('.cal-month .peek')).toHaveCount(0);

  await expect(page.locator('.month-grid [data-iso]:not(.month-out)'), 'September is 30 days').toHaveCount(30);
  const out = page.locator('.month-grid .month-out');
  await expect(out).toHaveText(['31', '1', '2', '3', '4']);

  const shape = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.month-grid .month-out')];
    const inMonth = document.querySelector('.month-grid [data-iso]:not(.month-out) .day-num');
    /*
     * **Through a canvas, because `color-mix` does not compute to `rgb()`.**
     * Chrome resolves a mix declared `in oklab` to an `oklab(...)` computed
     * value, so a regex over the string reads 0.6/0.01/0.03 as if they were
     * channels and calls the palest tint the darkest thing on the page — which
     * is exactly what this said on its first run. The 2d context converts
     * whatever the browser hands it into the sRGB bytes a reader would see.
     */
    const ctx = document.createElement('canvas').getContext('2d');
    const lum = (c) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    return {
      tags: [...new Set(cells.map((el) => el.tagName))],
      hidden: cells.every((el) => el.getAttribute('aria-hidden') === 'true'),
      focusable: cells.some((el) => el.hasAttribute('tabindex') || el.tagName === 'BUTTON'),
      // The first row's out-day and the first real day share a row, which is
      // the whole of "inside the grid rather than beside it".
      sameRow:
        Math.round(cells[0].getBoundingClientRect().top) ===
        Math.round(document.querySelector('.month-grid [data-iso]').getBoundingClientRect().top),
      outLum: lum(getComputedStyle(cells[0]).color),
      inkLum: lum(getComputedStyle(inMonth).color),
      groundLum: lum(getComputedStyle(document.body).backgroundColor),
      ratio: (() => {
        const rel = (c) => {
          ctx.fillStyle = c;
          ctx.fillRect(0, 0, 1, 1);
          const [r, g, b] = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map((n) => {
            const v = n / 255;
            return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const [hi, lo] = [rel(getComputedStyle(cells[0]).color), rel(getComputedStyle(document.body).backgroundColor)].sort(
          (a, b) => b - a,
        );
        return (hi + 0.05) / (lo + 0.05);
      })(),
      // The fast hue is this month's alone now: an out-of-month Wednesday is
      // a soft numeral, not a rubric one.
      outColours: [...new Set(cells.map((el) => getComputedStyle(el).color))],
      softColour: (() => {
        const probe = document.createElement('span');
        document.body.append(probe);
        probe.style.color = getComputedStyle(document.documentElement).getPropertyValue('--ink-soft').trim();
        const c = getComputedStyle(probe).color;
        probe.remove();
        return c;
      })(),
    };
  });
  expect(shape.tags, 'an out-of-month day is not a button').toEqual(['BUTTON']);
  expect(shape.hidden, 'an out-of-month day is still hidden from the accessibility tree').toBe(false);
  expect(shape.focusable, 'an out-of-month day cannot be reached by the keyboard').toBe(true);
  expect(shape.sameRow, 'the out-of-month days are not on the grid’s own rows').toBe(true);
  /*
   * **Stepped back, and still legible — and the second half is the assertion
   * that matters.** §3.3 drew these tinted 38% toward the field on the
   * reasoning that `aria-hidden` puts them beyond axe; it does not, because
   * axe's colour-contrast rule matches on whether a node is visible *on
   * screen*. That tint raised 128 violations at 1.71–2.61:1 and would have
   * taken the Lighthouse accessibility floor with it.
   *
   * So the ratio is asserted here by name, rather than left for an axe dump to
   * discover: whatever colour these end up wearing, a numeral a sighted reader
   * can see has to clear 4.5:1 on the ground it sits on.
   */
  expect(shape.outLum, 'the out days are at full ink, not stepped back').toBeGreaterThan(shape.inkLum);
  expect(shape.outLum, 'the out days have been tinted out of existence').toBeLessThan(shape.groundLum);
  expect(shape.ratio, 'an out-of-month numeral is under the 4.5:1 a legible numeral takes').toBeGreaterThanOrEqual(4.5);

  expect(shape.outColours, 'an out-of-month day wears more than one ink').toHaveLength(1);
  expect(shape.outColours[0], 'an out-of-month day is not --ink-soft').toBe(shape.softColour);

  /* **Pressing one is the whole of what changed** (author, 2026-10-03: "They
     are unclickable. Retarded mistake - fix"): it selects that date and
     carries the grid to the month the date belongs to, so the selection and
     the grid cannot disagree. */
  const before = await page.locator('.cal-date').textContent();
  const box = await out.first().boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(300);
  expect(
    await page.locator('.cal-date').textContent(),
    'an out-of-month day did not change the day',
  ).not.toBe(before);
  // And the grid followed it: the 31st of August belongs to August.
  await expect(page.locator('.month-name'), 'the grid stayed on the month it left').toHaveText('Aug');
  await page.goto('/calendar/2026-09-14', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  /*
   * **And the phone's month is the same month** (author, 2026-10-03: "Mobile
   * monthly and desktop monthly: one implementation, one look"). Opened from
   * the toggle, which is the phone's own way into it, so this is the state a
   * reader actually meets rather than a width with a grain forced open.
   */
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/calendar/2026-09-14', { waitUntil: 'networkidle' });
  await page.locator('[data-month]').click();
  await expect(page.locator('.cal-month')).toBeVisible();
  await page.waitForTimeout(600);
  await expect(page.locator('.cal-month .peek')).toHaveCount(0);
  await expect(page.locator('.month-grid [data-iso]:not(.month-out)')).toHaveCount(30);
  await expect(page.locator('.month-grid .month-out')).toHaveText(['31', '1', '2', '3', '4']);
  const phoneOut = await page.evaluate(() => {
    const cell = document.querySelector('.month-grid .month-out');
    return {
      tag: cell.tagName,
      hidden: cell.getAttribute('aria-hidden'),
      colour: getComputedStyle(cell).color,
      ink: getComputedStyle(document.querySelector('.month-grid [data-iso]:not(.month-out) .day-num')).color,
    };
  });
  expect(phoneOut.tag).toBe('BUTTON');
  expect(phoneOut.hidden).toBe(null);
  expect(phoneOut.colour, 'the phone out-day is not one step back in ink').not.toBe(phoneOut.ink);
});

test('the day the reader is on is told apart from the box it sits in', async ({ page }) => {
  /*
   * Found by the sweep, 2026-09-10, and it is a class of bug rather than a
   * value: **a mark can be correct everywhere and invisible in one box.**
   *
   * The month's selected day was given `background: var(--field)` and a
   * `--rule` border in August, on a page whose ground is `--gesso`, and the
   * rule beside it says the field and the border are together what carry the
   * selection. Then step 5 moved the month inside the bubble, whose fill is
   * `--bub` — and `--bub` *is* `--field` in the day theme. The field came out
   * at 1.00:1 against its own surround: the same three bytes either side of
   * the border. Nothing failed, because nothing had ever asked what the mark
   * was drawn *against*.
   *
   * So this asks exactly that, in both themes, and asks it of whatever the
   * mark happens to be rather than of a token name — a later change that put
   * the fill back and dropped the border would pass a `border-color` check and
   * fail this one. The floor is 2:1, comfortably under the 2.64 and 2.84 the
   * `--accent` border measures and comfortably over the 1.31 of the hairline
   * it replaced and the 1.08 a `--gesso` fill would have given.
   *
   * `--accent` is a rule and a border and never a word, which is the exemption
   * `tests/contrast.test.mjs` writes out for `--gold`; the day's *name* is in
   * the button's accessible name and `aria-current="date"` besides, so no
   * reader is left with the border alone.
   */
  await ready(page);
  for (const dark of [false, true]) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/calendar/2026-09-14', { waitUntil: 'networkidle' });
    if (dark) {
      await page.locator('#theme-toggle').click();
      await page.waitForTimeout(400);
    }
    await page.evaluate(() => document.fonts.ready);

    const seen = await page.evaluate(() => {
      // The same canvas trick the out-of-month test above uses, and for the
      // same reason: a computed colour here may be an `oklab(...)` or a
      // `color-mix`, and the 2d context is what turns any of them into the
      // sRGB bytes a reader actually sees.
      const ctx = document.createElement('canvas').getContext('2d');
      const rgb = (c) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = c;
        ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data];
      };
      const lum = ([r, g, b]) => {
        const f = (v) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const ratio = (a, b) => {
        const [hi, lo] = [lum(a), lum(b)].sort((p, q) => q - p);
        return (hi + 0.05) / (lo + 0.05);
      };
      const sel = document.querySelector('.month-grid button[aria-current="date"]');
      const plain = document.querySelector('.month-grid button:not([aria-current]):not(.month-out)');
      /*
       * **The ground the cell actually stands on, walked to rather than
       * named.** It was the bubble's fill until 2026-09-16, when the month
       * moved into the day's own column and the surround became the page's
       * own — and a mark scored against a box it is no longer in is a number
       * about nothing. Walked up from the cell because the column paints
       * nothing itself: the first ancestor with a paint is the answer at
       * either width.
       */
      const groundOf = (el) => {
        for (let n = el.parentElement; n; n = n.parentElement) {
          const c = rgb(getComputedStyle(n).backgroundColor);
          if (c[3] > 0) return c;
        }
        return [255, 255, 255, 255];
      };
      const fill = groundOf(sel);
      const s = getComputedStyle(sel);
      const paints = [s.borderTopColor, s.backgroundColor]
        .map(rgb)
        // A transparent paint is not a mark: the canvas gives it alpha 0 and
        // reading its channels would score the surround against itself.
        .filter((c) => c[3] > 0);
      return {
        marks: paints.length,
        strongest: Math.max(...paints.map((c) => ratio(c, fill))),
        // The premise: the ordinary cell beside it carries no mark at all, so
        // the number above is about being *chosen* rather than about a grid.
        plainMark: [getComputedStyle(plain).borderTopColor, getComputedStyle(plain).backgroundColor]
          .map(rgb)
          .some((c) => c[3] > 0),
        named: sel.getAttribute('aria-current'),
      };
    });

    const where = dark ? 'vigil' : 'day';
    expect(seen.named, `premise: no day is marked current in ${where}`).toBe('date');
    expect(seen.plainMark, `premise: an ordinary cell paints a mark of its own in ${where}`).toBe(false);
    expect(seen.marks, `the selected day paints nothing at all in ${where}`).toBeGreaterThan(0);
    expect(
      seen.strongest,
      `the selected day's mark is ${seen.strongest.toFixed(2)}:1 against its own ground in ${where}`,
    ).toBeGreaterThan(2);
  }
});

/**
 * A day of September 2026 the month leaves unmarked: its own record carries no
 * hymns for `church`, which is the fact `hasFeast` reads (`views/daily/picker.js`).
 *
 * **Computed, because the reading waves move it.** 22 September was typed here
 * as the unmarked half of the pair below; the Russian wave is taking that
 * calendar from 63 recorded days to all 366, and a record arriving on that day
 * would have failed this test with the page unchanged and nothing found. Read
 * off the same module the page reads, and it throws rather than returning a day
 * of the wrong shape: a test that has lost its premise must not pass.
 */
const unmarkedInSeptember = (church, except) => {
  const iso = Array.from({ length: 30 }, (unused, k) => `2026-09-${String(k + 1).padStart(2, '0')}`).find(
    (d) => d !== except && !recordedDay(d, church)?.hymns?.length,
  );
  if (!iso) throw new Error(`every day of September 2026 carries hymns in the ${church} record`);
  return iso;
};

test('the month marks a feast, in the rail’s own gold and with the word beside it', async ({ page }) => {
  /*
   * The month has never carried one. It reads the same fact from the same
   * place the rail's dot does — the day's own record holding hymns for this
   * church, which is the rank the calendar itself printed — so the two grains
   * cannot say different things about one day, which is `picker.js`'s own rule
   * about the fast tone applied to the other mark.
   *
   * 21 September is the Nativity of the Theotokos in the Russian calendar and
   * its record carries the day's hymns; the day without a mark is found rather
   * than typed (`unmarkedInSeptember` above). Both halves are asserted, because
   * a mark on every cell would satisfy the first alone.
   *
   * **`--feast`, and the word as well as the mark.** A diamond is nothing to a
   * screen reader, so the day's accessible name says it — the rule the rail's
   * dots have followed since they arrived.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-09-21', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const feast = page.locator('.month-grid [data-iso="2026-09-21"] .month-feast');
  await expect(feast).toHaveCount(1);
  const plain = unmarkedInSeptember('russian', '2026-09-21');
  await expect(page.locator(`.month-grid [data-iso="${plain}"] .month-feast`)).toHaveCount(0);
  await expect(page.locator('.month-grid [data-iso="2026-09-21"]')).toHaveAttribute(
    'aria-label',
    /a feast$/,
  );
  await expect(feast).toHaveAttribute('aria-hidden', 'true');

  const paint = await page.evaluate(() => {
    const el = document.querySelector('.month-grid [data-iso="2026-09-21"] .month-feast');
    const s = getComputedStyle(el);
    return {
      colour: s.backgroundColor,
      // A diamond by clip-path, never a rotated square: a 5 px square turned
      // 45 degrees measures 7.07 px corner to corner and would push its row.
      clip: s.clipPath,
      transform: s.transform,
      size: [s.width, s.height],
    };
  });
  // Painted against painted: `getPropertyValue('--feast')` gave a hex until
  // the theme cross-fade registered the colour tokens on 2026-09-10 and gives
  // a computed colour now, which is what the hand-rolled conversion here was
  // written to meet. helpers.js's `tokenColours` is indifferent to which.
  const [feastToken] = await tokenColours(page, '--feast');
  expect(paint.colour).toBe(feastToken);
  expect(paint.clip, 'the feast mark is not a clipped diamond').toContain('polygon');
  expect(paint.transform, 'the feast mark is a rotated square, which grows its row').toBe('none');
  expect(paint.size).toEqual(['5px', '5px']);
});

test('the month steps from the two names above and below its own', async ({ page }) => {
  /*
   * The peeked columns were the month's step control as well as its edge, and
   * both go together. What replaces them is a mark above the month's name and
   * one below it: a hairline closed by a diamond, pointing away from the month
   * it leaves. The pair stood either side of the name from 2026-09-10 until
   * the author turned the stepping a quarter on 2026-10-03 — "an arrow or
   * swipe up above the Oct 2026 print, and conversely an arrow down underneath
   * it" — and the pieces are the same five, rotated.
   *
   * **And on 2026-10-03 the marks were replaced by the months themselves**
   * (author: "replace the arrows with faded months above and below"). There is
   * nothing left that needs an exemption: the control is a word, it says which
   * month it reaches, and it is `--ink-soft` — the same step back the days
   * either side of the month take, and legible on its own account rather than
   * by the rule that lets a mark be faint.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-09-14', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const name = page.locator('.month-name');
  await expect(name).toHaveText('Sep');
  await expect(page.locator('.mpick-prev')).toHaveAttribute('aria-label', 'Previous month');
  await expect(page.locator('.mpick-next')).toHaveAttribute('aria-label', 'Next month');

  await page.locator('.mpick-next').click();
  await page.waitForTimeout(600);
  await expect(name).toHaveText('Oct');
  await page.locator('.mpick-prev').click();
  await page.waitForTimeout(600);
  await expect(name).toHaveText('Sep');

  /*
   * Off the control before reading its colour: `.mstep:hover` is `--ink-soft`,
   * and the press above leaves the pointer sitting on the button — which read
   * the hover state as the rest state on this test's first run.
   */
  await page.mouse.move(0, 0);
  const marks = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const probe = document.createElement('span');
    document.body.append(probe);
    probe.style.color = root.getPropertyValue('--accent').trim();
    const accent = getComputedStyle(probe).color;
    probe.remove();
    probe.style.color = root.getPropertyValue('--ink-soft').trim();
    document.body.append(probe);
    const soft = getComputedStyle(probe).color;
    probe.remove();
    const prev = document.querySelector('.mpick-prev');
    const now = document.querySelector('.mpick-now');
    const next = document.querySelector('.mpick-next');
    const r = (el) => el.getBoundingClientRect();
    return {
      accent,
      soft,
      prevInk: getComputedStyle(prev).color,
      nextInk: getComputedStyle(next).color,
      nowInk: getComputedStyle(now).color,
      // One above and one below, with this month between them, on one column.
      stacked: r(prev).bottom <= r(now).top + 1 && r(now).bottom <= r(next).top + 1,
      oneColumn: Math.round(r(prev).left) === Math.round(r(next).left),
      // Equidistant by their words, which is what a reader sees - the boxes
      // were on a 24 px pitch while the text was on 21.8 / 26.2 for one commit.
      pitchTop: Math.round(r(now).top - r(prev).top),
      pitchBottom: Math.round(r(next).top - r(now).top),
    };
  });
  expect(marks.prevInk, 'the month before is not one step back in ink').toBe(marks.soft);
  expect(marks.nextInk, 'the month after is not one step back in ink').toBe(marks.soft);
  expect(marks.nowInk, 'the month being read is as faint as its neighbours').not.toBe(marks.soft);
  expect(marks.stacked, 'the three months are not stacked in order').toBe(true);
  expect(marks.oneColumn, 'the three months do not share a column').toBe(true);
  expect(marks.pitchTop, 'the three months are not equidistant').toBe(marks.pitchBottom);

  /*
   * **The step up is the month before.** It is the whole of the instruction's
   * direction and the one thing a spinner can get backwards, so it is asserted
   * rather than inferred from the markup's order.
   */
  await page.locator('.mpick-prev').click();
  await page.waitForTimeout(600);
  await expect(name).toHaveText('Aug');

  // And the phone's month wears the same pair, in the same gutter: one drawing
  // at both widths (author, 2026-10-03, "I want the same calendar look between
  // mobile and desktop now").
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/calendar/2026-09-14', { waitUntil: 'networkidle' });
  await page.locator('[data-month]').click();
  await expect(page.locator('.cal-month')).toBeVisible();
  await page.waitForTimeout(600);
  await expect(page.locator('.cal-month .peek')).toHaveCount(0);
  await expect(page.locator('.mpick-prev')).toBeVisible();
  await expect(page.locator('.mpick-next')).toBeVisible();
  const phoneStep = await page.evaluate(() => {
    const up = document.querySelector('.mpick-prev').getBoundingClientRect();
    const down = document.querySelector('.mpick-next').getBoundingClientRect();
    const now = document.querySelector('.mpick-now').getBoundingClientRect();
    return {
      up: Math.round(up.height),
      down: Math.round(down.height),
      between: up.bottom <= now.top + 1 && down.top >= now.bottom - 1,
    };
  });
  /* One row each, the same row the desk draws: the target is the whole width
     of the gutter rather than a 32 px box built for a thumb, because the
     control is a word now and the word is the same at both widths. */
  expect(phoneStep.up, 'the phone step is not one row').toBe(20);
  expect(phoneStep.down).toBe(20);
  expect(phoneStep.between, 'this month is not between the two it steps to').toBe(true);
  await page.locator('.mpick-prev').click();
  await page.waitForTimeout(600);
  await expect(page.locator('.month-name')).toHaveText('Aug');
});
