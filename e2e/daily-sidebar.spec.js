import { test, expect } from './fixtures.js';
import { ready, searchMode, tokenColours } from './helpers.js';

/**
 * The Daily page, the standing sidebar: the month it draws, and what each of
 * its numerals is allowed to say.
 *
 * **This file is what is left of `daily-picker.spec.js`** (rebuild plan §8,
 * §11.9's step 6a). That file was 2,579 lines about a week rail, its drag and
 * its coast, a month picker, two grains and the fade between them — every one
 * of those controls deleted on 2026-09-12, when the sidebar's static month
 * grid replaced both grains. Forty-six of its forty-eight tests describe boxes
 * that are not on the page any more and went with it.
 *
 * Two did not, because both are claims about *facts* rather than about a
 * control: no date carries a density dot and a fast or a feast carries its
 * own, and a numeral wears its own day's fast colour. Both are the author's,
 * both are dated, and the month grid inherits them whole — so both are here,
 * rewritten against `.cal-day` and against the day's own tag, with the
 * instruction that caused them carried over word for word.
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


test('no date carries a density dot, and a fast or a feast carries its own', async ({ page }) => {
  /*
   * Author, 2026-08-25 evening: "remove the dots under each date in the
   * calendar." They stood under every date at both grains from the first
   * calendar — one per commemoration, capped at five — and PLAN.md's "Dense
   * against sparse" argued them and now records the reversal in place. That
   * removal stands and is still the first half of this test.
   *
   * **Two marks came back on 2026-08-26**, and they are not those dots
   * returning: "Dots on the week strip for fast and feast days would let
   * someone plan the week at a glance." The old dots said only that a day was
   * busy. These say a thing a reader plans around, each with a source: the
   * fast from lib/liturgy.js in this church's own calendar, the feast from
   * `greatFeast` in the same file.
   *
   * **Carried onto the month grid on 2026-09-12**, when the week strip the
   * author asked for these on was deleted along with the rest of the picker.
   * The instruction survives its control: a reader still plans a week, and the
   * month is the only grain left to plan it in. What changed is where the mark
   * is drawn — the fast is the numeral's own colour and the feast a gold rule
   * under it, rather than two dots beneath a button — and what did not change
   * is that neither of them is the only carrier: both go into the cell's
   * accessible name in words, because a colour says nothing to a screen reader
   * and nothing to a reader who cannot separate hues.
   *
   * 10 August 2026 is inside the Dormition Fast and carries no feast — the
   * civil 1st to the 14th under the Gregorian reckoning `ready`'s own default
   * reads by since 2026-09-05 (`reckoningInForce`, `lib/church.js`).
   */
  await ready(page);
  await page.goto('/calendar/2026-08-10', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  // The dots are gone, and so is every box that used to carry one.
  await expect(page.locator('.density')).toHaveCount(0);
  await expect(page.locator('.week-strip')).toHaveCount(0);
  await expect(page.locator('.cal i, .cal .day-mark, .cal .day-marks')).toHaveCount(0);

  const fast = page.locator('.cal-day[data-iso="2026-08-10"]');
  await expect(fast).toHaveClass(/is-fast/);
  await expect(fast).not.toHaveClass(/is-feast/);
  await expect(fast).toHaveAttribute('aria-label', '10 August 2026 - a fast');

  /*
   * A fast-free day carries nothing at all, which is what makes a run of them
   * legible. 16 August is clear of the Dormition Fast under the reckoning this
   * month is counted in, and a reminder that "a day in August" is not a synonym
   * for "a fast" is still worth having.
   */
  const free = page.locator('.cal-day[data-iso="2026-08-16"]');
  await expect(free).not.toHaveClass(/is-fast|is-fish/);
  await expect(free).toHaveAttribute('aria-label', '16 August 2026');

  /*
   * The feast mark is the one place the calendar spends gold (author,
   * 2026-08-26: "Gold is almost unused"). 6 August is the Transfiguration, and
   * it is also the day that proves the two marks are two: a Great Feast inside
   * the Dormition Fast, fish permitted, wearing both at once.
   *
   * **A rule under the numeral, not a dot beside it.** The week strip's dot
   * was a disc in a colour; the grid's cell has no room for one, so the feast
   * is an inset shadow along the cell's foot — which is the same obligation
   * `quality-floor.spec.js` has always held this page to, met with a shape
   * rather than with a second hue.
   */
  const feast = page.locator('.cal-day[data-iso="2026-08-06"]');
  await expect(feast).toHaveClass(/is-feast/);
  await expect(feast).toHaveAttribute('aria-label', '6 August 2026 - a fast, fish permitted, a feast');
  // Both sides of the comparison are colours the browser painted: since
  // 2026-09-10 `getPropertyValue` returns a hex for an ordinary custom
  // property and a computed colour for one the theme cross-fade registered,
  // so neither side is parsed by hand.
  // `--feast`, not `--gold`: tokens.css gives the feast its own value on each
  // ground for exactly this mark, because on a month cell the rule is the only
  // thing drawing the feast and --gold does not clear the contrast floor there.
  // The grid was moved onto it on 2026-09-12 and this assertion is what caught
  // that the two had drifted apart.
  const [feastInk, strict, fish] = await tokenColours(page, '--feast', '--fast-strict', '--fast-fish');
  const underline = await feast.evaluate((el) => getComputedStyle(el).boxShadow);
  expect(underline, 'the feast wears no rule of its own').toContain(feastInk);
  // And it is not either fast's colour, which is the whole point of the pair:
  // a day can be both, and the reader has to be able to see that it is.
  expect(underline).not.toContain(strict);
  expect(underline).not.toContain(fish);
});


test("the month's numerals wear the same colour as the day's own fast", async ({ page }) => {
  /*
   * Author, 2026-08-26 evening: "in monthly view, make the text colour of
   * each day match the fasting dot colour for that day."
   *
   * The dot the instruction names was the week rail's, and the rail went on
   * 2026-09-12. What it was a mark *of* did not: the day's fast is still drawn
   * in the sidebar, as the tag above the month, and that tag is what the
   * numeral is now read against. The assertion is the instruction with the new
   * mark in the old one's place — the numeral for a day and that day's own tag
   * are compared as computed colours, so this cannot pass on two rules that
   * happen to look alike. Both come from `fastTone` in views/daily/sidebar.js,
   * which is the one place the decision is made.
   *
   * November 2026 in the Russian calendar is the month worth walking: the
   * Nativity Fast opens on the 28th (15 November, Julian), Wednesdays and
   * Fridays are strict before it, and days.pravoslavie.ru printed
   * «разрешается рыба» for the 28th and 29th — so the month holds all three
   * states at once, which no earlier month does.
   *
   * **Read from a day that is not the one being shown.** `.is-today` is the
   * selected cell and it is ink on the rubric field, which is a different fact
   * about that cell and would swallow the colour under test — so the month is
   * read whole from one standing day, and the tags are collected afterwards by
   * visiting each.
   */
  await ready(page, { church: 'russian' });
  await page.goto('/calendar/2026-11-18', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const numerals = await page.evaluate(() =>
    Object.fromEntries(
      ['2026-11-11', '2026-11-28', '2026-11-10'].map((iso) => {
        const cell = document.querySelector(`.cal-day[data-iso="${iso}"]`);
        return [iso, cell && { colour: getComputedStyle(cell).color, cls: cell.className, label: cell.getAttribute('aria-label') }];
      }),
    ),
  );
  const tagOf = async (iso) => {
    await page.goto(`/calendar/${iso}`, { waitUntil: 'networkidle' });
    return page.locator('.day-tags .tag').first().evaluate((el) => ({
      colour: getComputedStyle(el).color,
      cls: el.className,
      text: el.textContent.trim(),
    }));
  };

  // A strict fast: an ordinary Wednesday before the Nativity Fast opens.
  expect(numerals['2026-11-11'].cls, 'premise: 11 November is no longer a fast').toContain('is-fast');
  const strict = await tagOf('2026-11-11');
  expect(strict.cls).toContain('is-fast');
  expect(numerals['2026-11-11'].colour).toBe(strict.colour);

  /*
   * Fish, which is the state that used to be invisible: `kind` here is a plain
   * `fast` and only the printed note makes it fish, so before 2026-08-26
   * evening the mark *and* the numeral would have been strict red.
   */
  expect(numerals['2026-11-28'].cls, 'premise: 28 November is no longer fish').toContain('is-fish');
  const fish = await tagOf('2026-11-28');
  expect(fish.cls).toContain('is-fish');
  expect(numerals['2026-11-28'].colour).toBe(fish.colour);
  // And the two states are genuinely different colours, or the equality above
  // would be satisfied by everything being one colour.
  expect(fish.colour).not.toBe(strict.colour);

  /*
   * A day that is not a fast wears neither: no class, and the numeral is left
   * to the grid's own ink. A run of them is what makes a fast legible — and
   * the tag on such a day says No Fast in the fast-free green, which is a
   * third colour again and not the numeral's, because the numeral's job here
   * is to say *nothing*.
   */
  expect(numerals['2026-11-10'].cls).not.toMatch(/is-fast|is-fish/);
  expect(numerals['2026-11-10'].colour).not.toBe(strict.colour);
  expect(numerals['2026-11-10'].colour).not.toBe(fish.colour);

  /*
   * **The colour is never the only channel.** The rail named its marks in the
   * accessible label from the day the dots arrived; the month had no words at
   * all until it took a colour, and PLAN.md's rule is that the words say
   * which. A screen reader and a reader who cannot separate these two hues
   * both get the fast from the name.
   */
  expect(numerals['2026-11-11'].label).toContain('a fast');
  expect(numerals['2026-11-28'].label).toContain('fish permitted');
  expect(numerals['2026-11-10'].label).not.toContain('fast');
});

test('the keys step the day, from anywhere on the page and not while typing', async ({ page }) => {
  /*
   * Restored 2026-09-12. `daily-picker.spec.js` had "a day is one click, and
   * the keys step it from anywhere"; the rebuild deleted that file and no
   * arrow-key handling survived anywhere in the Daily page, which
   * `scratchpad/daily-feature-audit.md` found by reading the deleted test
   * names rather than by any test failing.
   *
   * **A fixed day, not today** (trap 4): stepping off today would make this
   * fail on exactly one day a year, and the URL assertion below depends on
   * knowing which day it landed on.
   *
   * Three claims, and the second and third are the ones worth having. That an
   * arrow moves the day is the feature; that the press works with focus down
   * among the saints is why it is bound to the document; and that it does
   * *not* move the day while a reader is typing is the guard that makes the
   * first two safe, since All Saints' search field is one route away.
   */
  await ready(page, { church: 'russian' });
  await page.goto('/calendar/2026-09-10', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/\/calendar\/2026-09-11$/);

  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(page).toHaveURL(/\/calendar\/2026-09-09$/);

  // From anywhere: focus a saint's tile far down the day and press again.
  const tile = page.locator('[data-td-scroll] a, [data-td-scroll] button').last();
  await tile.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/\/calendar\/2026-09-10$/);

  // And not while typing. A field on the page takes the arrow for its caret.
  await page.evaluate(() => {
    const input = document.createElement('input');
    input.id = 'typing-probe';
    document.body.append(input);
    input.focus();
  });
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/\/calendar\/2026-09-10$/);
});
