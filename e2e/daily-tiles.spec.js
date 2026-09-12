import { test, expect } from './fixtures.js';
import { ready, searchMode } from './helpers.js';

/**
 * The Daily page, the day's saints: the tiles they are folded into, and the
 * names the day gives.
 *
 * **This file is what is left of `daily-register.spec.js`** (rebuild plan §8,
 * §11.9's step 6a). The register — the "also commemorated" cards, their two
 * faces, their mats and their tallest-picture-first order — was replaced on
 * 2026-09-12 by one `article.day-tile` per saint of the day, which is the same
 * element folded and open. Nine of that file's thirteen tests measured boxes
 * that went with it.
 *
 * Four did not. Three are the name days, which moved from the register's foot
 * into the standing sidebar and are otherwise the same fact stated the same
 * way; the fourth is the mark a saint with no icon wears, which moved from a
 * register row onto a tile. Each carries the instruction that caused it and
 * the date it was written, which is where this suite's provenance has always
 * lived; what changed is the selector and, where the shape of the box changed
 * under the claim, the measurement.
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


test('the day says whose name day it is, and links only the names one saint bears', async ({ page }) => {
  /*
   * Author, 2026-08-26: "add name days". In Orthodox practice a name day is the
   * feast of the saint whose name you bear, and in Greece, Romania, Russia and
   * Serbia alike it is the day that is actually kept.
   *
   * Nothing here is looked up or invented: every name is the first word of a
   * commemoration already printed beside it, cut at the first comma or bracket
   * (lib/name-days.js). 20 September in the Russian calendar is the case worth
   * pinning, because it holds both halves — a long list of names from a longer
   * list of saints, several of them shared.
   *
   * The block moved into the sidebar on 2026-09-12 and the rule did not: a
   * name is a link where exactly one of the day's saints bears it, and stands
   * as text where two or more do, because a link would be the site choosing
   * between them.
   */
  await ready(page, { church: 'russian' });
  await page.goto('/calendar/2026-09-20', { waitUntil: 'networkidle' });

  const names = page.locator('[data-names] .name-day');
  await expect(page.locator('[data-names-heading]')).toHaveText('Name days');
  // The day's leading saint counts: he is one of the day's saints, not a
  // separate thing standing over them.
  await expect(names.filter({ hasText: 'Sozon' })).toHaveCount(1);
  await expect(names.filter({ hasText: 'Serapion' })).toHaveCount(1);

  // A name one saint bears opens that saint.
  await expect(page.locator('[data-names] a[data-prefetch="serapion-of-pskov"]')).toHaveCount(1);
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
  await expect(page.locator('[data-names-heading]')).toHaveText('Именины');
  await expect(page.locator('[data-names]')).toContainText('Иоанн');
});


test('the name days run on with a separator, and a name wider than the column is broken rather than drawn outside it', async ({ page }) => {
  /*
   * Author, 2026-09-10, by the reference: two columns in the sidebar and no
   * separator dot on a desk, the run of names with its dots on a phone.
   *
   * **The two columns went on 2026-09-12 and the run stayed**, at both widths.
   * The names are in the standing sidebar now rather than under the register,
   * and the sidebar is a 260 px column that holds one name to a line: two
   * tracks inside it would be two words wide, which is a list nobody can read.
   * So the face the author picked for a phone is the face the page keeps, and
   * what carries over from that instruction is the half that was always about
   * the reading and never about the layout — the names run in one flow, in
   * order, with a separator between them and none after the last.
   *
   * **The separator carries its own spaces, and that is load-bearing.** Joined
   * by a bare middot the whole list is one word to a line-breaker and
   * «Abraham·Adrian·Agathonicus» runs out of the side of the column instead of
   * wrapping down it — which is the same fault, in the same place, that the
   * two-column version was written against.
   *
   * Twelve names on 25 September in the Russian calendar.
   */
  await ready(page, { church: 'russian' });

  const read = () =>
    page.evaluate(() => {
      const flow = document.querySelector('[data-names]');
      const items = [...flow.querySelectorAll('.name-day')];
      const box = flow.getBoundingClientRect();
      return {
        n: items.length,
        // A separator between every pair and none trailing the last.
        seps: flow.querySelectorAll('.sep').length,
        // The reading order is the list's order, top to bottom then left to
        // right — which is what a run of names promises and a two-track grid
        // would quietly break.
        inOrder: items.every((el, i, all) =>
          i === 0 || el.getBoundingClientRect().top >= all[i - 1].getBoundingClientRect().top - 1,
        ),
        // A word wider than its column, drawn past the box that holds it.
        overrun: Math.max(...items.map((el) => Math.round(el.getBoundingClientRect().right - box.right))),
      };
    });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/calendar/2026-09-25', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const desk = await read();
  expect(desk.n, 'premise: 25 September no longer gives twelve name days').toBe(12);
  expect(desk.seps, 'the names are not separated, or the last one trails a separator').toBe(desk.n - 1);
  expect(desk.inOrder, 'the names do not read in the order they are listed in').toBe(true);
  expect(desk.overrun, 'a name is drawn outside the column that holds it').toBeLessThanOrEqual(1);

  /*
   * **One name, which is a list of one and not a layout that has failed.**
   * 11 September gives fourteen; a day that gives one has to draw it with no
   * separator at all, and the arithmetic above is what says so.
   */
  await page.goto('/calendar/2026-09-11', { waitUntil: 'networkidle' });
  const other = await read();
  expect(other.seps).toBe(other.n - 1);

  /*
   * **A name too wide for its column is broken, not clipped.** The corpus's
   * widest is Ανδροπελαγία, which the sidebar holds, so this is a guard rather
   * than a live defect — and it was shot before it was written:
   * «Константинопольский» drew through the column and off the bubble's edge.
   * Injected, because the corpus has no such name and a test that waits for one
   * to be written is not a test.
   *
   * **Longer than any word could be, and that is the point of the length.**
   * Measured against the 212 px column: «Константинопольский» alone overruns
   * by 14 px on one day and fits on the next, because whether an unbreakable
   * word escapes its box depends on how much of the line was left when it
   * arrived — so a guard using it passes half the time with the rule taken
   * out. Doubled, it overruns by 106 px wherever it lands, and the guard is
   * about the rule rather than about the day.
   */
  await page.evaluate(() => {
    const flow = document.querySelector('[data-names]');
    flow.insertAdjacentHTML(
      'beforeend',
      '<span class="sep" aria-hidden="true"> · </span><span class="name-day">КонстантинопольскийКонстантинопольский</span>',
    );
  });
  const long = await read();
  expect(long.overrun, 'a long name is drawn outside the column that holds it').toBeLessThanOrEqual(1);

  /*
   * **And the phone keeps the same run**, which is the whole of what the two
   * widths now have to agree on: the sidebar stops standing below 1024 px and
   * becomes the first block in the flow, and the names are the same list in
   * the same order with the same separators.
   */
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/calendar/2026-09-25', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const phone = await read();
  expect(phone.n).toBe(desk.n);
  expect(phone.seps).toBe(phone.n - 1);
  expect(phone.inOrder, 'the phone does not read the names in the order they are listed in').toBe(true);
  expect(phone.overrun, 'a name is drawn outside the phone column that holds it').toBeLessThanOrEqual(1);
});


test('name days say "today" only on the day that is today', async ({ page }) => {
  /*
   * Author, 2026-08-26 evening: replace "Name Days" with "Today's Name Days".
   * Taken at its word on the day it is true and refused on every other,
   * because the Daily page is a day browser - the sidebar's month reaches
   * either side of today and the steps reach further - and the heading would
   * be a plain falsehood on all but one of them. The rest of this column says
   * "this day" for the same reason.
   */
  await ready(page, { church: 'russian' });
  await page.goto('/', { waitUntil: 'networkidle' });
  const heading = page.locator('[data-names-heading]');
  await expect(heading).toHaveText("Today's name days");

  // 20 September is not today and says so. (It is also the day the older
  // name-days test uses, for the same reason: it is the richest one.)
  await page.goto('/calendar/2026-09-20', { waitUntil: 'networkidle' });
  await expect(heading).toHaveText('Name days');
});


test('a tile with no icon shows its type as a mark, and says it in words', async ({ page }) => {
  /*
   * docs/daily-desktop-visuals.md §5.1 and §10.10: a glyph keyed off `types`
   * where there is no picture, drawn in `--rule` and `aria-hidden` — "its
   * 1.41:1 is then not a legibility failure because it is not the carrier:
   * make sure the entry's accessible text names the saint's type in words".
   *
   * Both halves, because either alone is the bug: a mark nobody can read with
   * no words behind it, or words with no mark, which is what this list was
   * before it had either.
   *
   * **The row became a tile on 2026-09-12** and the rule came with it,
   * `panel.js`'s `GLYPH_PATHS` salvaged into `views/daily/tiles.js` ahead of
   * the delete. What the tile added is a seventh mark this view chooses at the
   * point of drawing — the site's own eight-pointed cross, for a saint whose
   * types the corpus knows no mark for — because a mat with nothing in it
   * reads as a picture that failed to load. `tests/type-glyph.test.mjs:56`
   * still pins that `typeGlyph` itself answers *no mark*, and it is not
   * touched by that choice.
   *
   * Read off the folded tiles only: the open card's mat is a different width
   * by design, and every folded one is the same, which is what makes the
   * equality below a claim.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const tiles = await page.evaluate(() =>
    [...document.querySelectorAll('.day-tile:not(.is-open)')].map((tile) => {
      const glyph = tile.querySelector('.row-glyph');
      return {
        name: tile.querySelector('.row-name').textContent.trim(),
        // `textContent` takes the sr-only span with it, which is the point:
        // this is what a screen reader is given, not what is drawn.
        spoken: tile.textContent.replace(/\s+/g, ' ').trim(),
        hasPicture: Boolean(tile.querySelector('.row-media img')),
        glyph: glyph ? Math.round(glyph.getBoundingClientRect().width) : null,
        mat: Math.round(tile.querySelector('.row-media').getBoundingClientRect().width),
        hidden: glyph?.getAttribute('aria-hidden'),
      };
    }),
  );
  const marked = tiles.filter((t) => t.glyph);
  expect(marked.length, 'premise: every saint on this day has a picture').toBeGreaterThan(2);
  expect(tiles.some((t) => t.hasPicture), 'premise: no picture on this day to lose the mark to').toBe(true);
  // A real icon always wins the mat: no tile carries both.
  expect(tiles.every((t) => !(t.hasPicture && t.glyph)), 'a picture and a mark in one tile').toBe(true);

  for (const tile of marked) {
    // Drawn, and drawn at one size across the day — the mark is a share of the
    // mat, so a tile that derived its own would be a tile drawn differently
    // from its neighbours.
    expect(tile.glyph, `${tile.name} has no mark drawn in its mat`).toBeGreaterThan(0);
    expect(tile.glyph, `${tile.name} mark is not the size of every other`).toBe(marked[0].glyph);
    expect(tile.mat, `${tile.name} mat is not the tile's own picture width`).toBe(marked[0].mat);
    expect(tile.hidden, `${tile.name} mark is not hidden from the accessibility tree`).toBe('true');
  }

  /*
   * And the words. Callinicus is the case worth naming: the corpus has him as
   * a `hierarch` and a `patriarch`, and the visible subtext says only
   * "Patriarch of Constantinople" — so "Hierarch" is what the mark is carrying
   * and what the tile has to say out loud. Eutychius is the other half: no
   * office at all in the subtext, so the whole type arrives from the sr-only
   * span.
   */
  const callinicus = tiles.find((t) => t.name.includes('Callinicus'));
  expect(callinicus, 'premise: Callinicus is not on this day any more').toBeTruthy();
  expect(callinicus.spoken, 'the mark on Callinicus is not backed by a word').toContain('Hierarch');
  const eutychius = tiles.find((t) => t.name.includes('Eutychius'));
  expect(eutychius.spoken, 'a tile with no office does not say what kind of saint it is').toContain('Venerable');
});

test('the day puts its pictures first and its imageless saints last, and the strip says what it is', async ({ page }) => {
  /*
   * **The order** is the author's rule, lost in the 2026-09-12 rebuild and
   * restored the same day (`lib/calendar-page.js`'s `dayOrder`). 130 of the
   * 862 folders carry an icon, so a day left in the corpus's own order opens
   * as a wall of glyph mats with the pictures scattered down it.
   *
   * **The name** is the other half of the heading that went missing. "Also
   * today" headed the saints *besides* the hero and this strip holds the hero
   * too, so the words are gone; what a screen reader was left with was a run
   * of articles under nothing at all. `commemorationsFor` is the name they get
   * instead, and what is *drawn* above the day is the desktop redesign's.
   *
   * **Both premises are asserted**, because both claims pass on a day that
   * cannot test them: an order claim is vacuous on a day whose saints all
   * carry icons or none do, and the `.no-pic` marker is the tile's own word
   * for which it is (`views/daily/tiles.js`).
   */
  await ready(page);
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const pictures = await page
    .locator('.day-grid > .day-tile')
    .evaluateAll((tiles) => tiles.map((t) => !t.classList.contains('no-pic')));

  expect(pictures.filter(Boolean).length, 'premise: no saint of 5 September has an icon').toBeGreaterThan(0);
  expect(pictures.filter((p) => !p).length, 'premise: every saint of 5 September has an icon').toBeGreaterThan(0);

  /*
   * **Past the hero**, which leads whatever it carries: `pickHero` prefers an
   * icon but ranks the saint the church sings for above one, so the day's
   * first tile is a mat on the days where nobody sung for has a picture. That
   * is the 2026-08-22 rule and this one does not overturn it.
   *
   * After it: pictured, then imageless, nothing interleaved — read down the
   * strip, once a mat has appeared no picture follows it.
   */
  const rest = pictures.slice(1);
  expect(rest).toEqual([...rest].sort((a, b) => Number(b) - Number(a)));

  const label = await page.locator('.day-grid').getAttribute('aria-label');
  expect(label).toContain('Commemorations for');
  expect(label).toContain('September');
});
