import { COLD, coldFace, test, expect } from './fixtures.js';
import {
  CORPUS,
  DETAIL,
  INDEX,
  POPULATED,
  carouselMode,
  chooseSort,
  chooseView,
  facet,
  onlyCalendar,
  nothingCropped,
  ready,
  searchMode,
  viewChip,
} from './helpers.js';

/**
 * All Saints, the search grid: the cards and the rows, what each prints, the window the grid keeps in the document, and the way from a card to a saint.
 *
 * Part of the browser suite, which was one file of 9,308 lines until
 * 2026-08-27 and is now one file per surface. **The tests themselves are
 * unchanged** — each carries the instruction that caused it and the date it
 * was written, which is where this suite's provenance has always lived; what
 * moved is only which file it sits in. `helpers.js` holds the shared fixtures.
 *
 * **Split again on 2026-09-05** (cleanup plan item 6, on the author's word:
 * "Items 5 and 6"), by surface *within* the page rather than by the date a
 * test was written, once the one file had reached 4,895 lines. The rule
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


test('the index opens on the whole corpus, unfiltered and unranked', async ({ page }) => {
  await page.goto(INDEX, { waitUntil: 'networkidle' });

  // 851 since the 28 September batch (2026-08-30): fifteen new martyrs of
  // four different years (1918, 1921, 1932, 1935, 1937), and the Romanian
  // day's four - Chariton the Confessor, Neophytos the Recluse, the Prophet
  // Baruch, Pimen. The Marcianopolis trio turned out to live at the Greek
  // 17/9 and were upgraded, not duplicated - the slug namespace caught what
  // the date sweep missed.
  // 832 since the 27 September batch (2026-08-30): the Exaltation day - the
  // whole Russian line is the feast, an icon, and Chrysostom's repose (his
  // folder holds 13 November), so all four arrivals are the Romanian day's:
  // Antim Ivireanul, Callistratus and his forty-nine, Aquilina of
  // Zagliveri, Epiharia.
  // 828 since the 26 September batch (2026-08-30): three new martyrs of the
  // 1937 line, and the Romanian day's five - John the Theologian at last
  // (his repose is his feast, and the apostle had no folder), Neagoe Basarab
  // and Platonida his wife, Hira, Gideon. Fourteen Greek-harvest folders
  // took Russian rows the same day - the corpus is meeting itself.
  // 820 since the 25 September batch (2026-08-30): the Serpukhov and Tiksna
  // venerables, the four new martyrs of the 1937 line, and the Romanian
  // day's three - led by Sergius of Radonezh, who arrives through the
  // Romanian calendar because his own Russian day is still past the reach.
  // 811 since the 24 September batch (2026-08-30): Silouan the Athonite (the
  // day's one shared arrival, Russian and Romanian rows both), the priests of
  // Podosinovets (1918), two thin Russian lines, and the Romanian day's five -
  // Thecla, Sven of Arboga, Stefan the First-Crowned, Peter the Aleut,
  // Copris; eight more Greek-harvest folders took Russian rows.
  // 801 since the 23 September batch (2026-08-30): eighteen of the Russian
  // 10 September - the prince-monk Joasaph of Kubensk, sixteen new martyrs
  // of 1937 and bishop Uar of Lipetsk (1938) - and the two Spanish sisters
  // of the Romanian 23 September; eleven Greek-harvest folders took Russian
  // rows the same day rather than becoming duplicates.
  // 781 since the 22 September batch (2026-08-30): the Glinsk sixteen, ten
  // new martyrs, Theodosius of Chernigov and of Brazi, and the rest of an
  // afterfeast day that named thirty-six.
  // 746 since the 21 September batch (2026-08-29): the two Georgian
  // confessors of the Russian calendar's 8 September, and the prophet Jonah
  // and apostle Quadratus of the Romanian 21 September.
  // 742 since Amendment 44's first day of saints: thirteen more for the Russian
  // calendar's 7 September, the civil 20 September.
  // 729 since the Greek harvest of 2026-08-26: the twenty-one people the Greek
  // calendar prints for 20 September, the first day past the end of the day
  // records. Sixteen entries became twenty-one folders, not sixteen — three of
  // them are icons of the Theotokos and one a synaxis, which are not folders
  // (Amendment 31), while Eustathius arrives with his wife and both sons and
  // "the two Anastasii" are two men.
  await expect(page.locator('[data-count]')).toHaveText(CORPUS);
  await expect(page.locator('.index-card').first()).toBeVisible();
  // Unranked is the load-bearing word. Breadth of veneration was offered and
  // never defaulted to, because a corpus sorted by it reads as a ranking of
  // importance; Earliest took the default from Name on 2026-08-24 (author) and
  // is the same kind of order as either — a fact about the lives, not a claim
  // about their standing. Random is the default since the same evening
  // (author: "so each time you open the site you get exposed to more
  // saints"); this test's subject is the unfiltered *set*, not the order, so
  // it chooses Earliest explicitly rather than asserting on a shuffled deal.
  await chooseSort(page, 'earliest');
  await expect(page.locator('input[name="rangeMode"][value="overlaps"]')).toBeChecked();
  await expect(page.locator('[data-clear]')).toBeHidden();
});


test('card boxes come from the manifest, not from measuring the image', async ({ page }) => {
  // A card with a picture, brought into the document by the Index's own
  // search (a hundred and forty cards, virtualised; a box without a picture
  // has no image box to measure).
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.locator('[data-query]').fill('Anthony the Great');
  await expect(page.locator('.index-card', { hasText: 'Anthony the Great' })).toHaveCount(1);
  // Anthony by name, not the first card with a picture: a card filtered out
  // keeps its box for the length of its leaving animation, so ".first()"
  // could measure whichever card the opening deal happened to put there
  // (Random has been the default since 2026-08-24 evening — the same defect
  // class the detailed-card test hit earlier that day).
  const card = page.locator('.index-card', { hasText: 'Anthony the Great' });
  const media = card.locator('.index-media');
  const [cardBox, mediaBox] = [await card.boundingBox(), await media.boundingBox()];
  // Card height is the image box plus a fixed text block, and the image box is
  // the manifest's aspect ratio applied to the column width.
  expect(cardBox.height).toBeGreaterThan(mediaBox.height);
  expect(mediaBox.width / mediaBox.height).toBeGreaterThan(0.5);
});


test('a filtered-out saint fades rather than vanishing', async ({ page }) => {
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await (await facet(page, 'historicities')).getByLabel('legendary').check();
  // Caught mid-fade: the cards on their way out are still in the document with
  // the transition running, which is the difference between a register and a
  // search engine.
  await expect(page.locator('.index-card.leaving').first()).toBeVisible();
  await expect(page.locator('.index-card')).toHaveCount(1);
});


test('under reduced motion the filtered-out are gone, not gone slower', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await searchMode(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await (await facet(page, 'historicities')).getByLabel('legendary').check();
  await expect(page.locator('.index-card')).toHaveCount(1);
  await expect(page.locator('.index-card.leaving')).toHaveCount(0);
  await ctx.close();
});


test('a card opens its saint, carrying the shared element with it', async ({ page }) => {
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  const first = page.locator('.index-card').first();
  const name = await first.locator('.index-name').textContent();
  await first.locator('.index-name').click();
  await expect(page.locator('h1.saint-name')).toHaveText(name ?? '');
});


test('the grid keeps a window of the corpus in the document, not the corpus', async ({ browser }) => {
  // Ten saints fit on a desktop screen, so virtualisation can only be observed
  // where the grid is taller than the viewport. This is that: one column, a
  // short window, and the last saint in the order well below the fold.
  const ctx = await browser.newContext({ viewport: { width: 360, height: 480 } });
  const page = await ctx.newPage();
  await searchMode(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  // Alphabetical, asked for rather than assumed: this test names the saint it
  // expects at the bottom, so it has to name the order that puts them there.
  // It rode the default until 2026-08-24, when Earliest took it and the last
  // card became whichever undated saint sorts last by name instead.
  await chooseSort(page, 'name');

  // 742 saints now; Zoticus of Tomis is last alphabetically and far below
  // a 480 px viewport. A window is far fewer than the corpus at either end.
  const last = page.locator('.index-name', { hasText: 'Zoticus of Tomis' });
  expect(await page.locator('.index-card').count()).toBeLessThan(20);
  await expect(last).toHaveCount(0);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(last).toHaveCount(1);
  // And the window still is one: what came into the document pushed something
  // else out of it.
  expect(await page.locator('.index-card').count()).toBeLessThan(20);
  await ctx.close();
});


test('the index offers two layouts, and remembers which one the reader chose', async ({ page }) => {
  /*
   * The control changed shape on 2026-08-26 evening — a chip that prints the
   * view it is showing, where it was a two-button segmented toggle carrying
   * `aria-pressed` — so what says "which view is on" is the chip's own words
   * and the radio behind them. What the test is about is unchanged: two
   * layouts, and the choice survives a reload.
   */
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  const cards = page.locator('.index-card');

  /*
   * **Which one it opens on is the screen's answer since 2026-08-27** (author:
   * "On desktop, default to card view in All Saints. On mobile, default to row
   * view"), and this file runs at both widths — so the opening state is read
   * from the viewport rather than written down. `chooseView` then puts it on
   * cards whatever it opened on, because the rest of this test is about the
   * *choice* surviving, not about the default.
   */
  const wide = page.viewportSize().width >= 700;
  await expect(viewChip(page)).toHaveText(wide ? /Cards$/ : /Rows$/);
  await chooseView(page, 'cards');
  await expect(cards.first()).not.toHaveClass(/is-row/);
  const cardHeight = (await cards.first().boundingBox()).height;

  await chooseView(page, 'rows');
  await expect(viewChip(page)).toHaveText(/Rows$/);
  await expect(cards.first()).toHaveClass(/is-row/);
  const rowHeight = (await cards.first().boundingBox()).height;
  // Tighter: that is the whole point of the second layout.
  expect(rowHeight).toBeLessThan(cardHeight);
  /*
   * **A row's height does not depend on its picture, and does depend on its
   * name.** This asserted one height for every row until 2026-08-27, which was
   * true while every row was given the tallest box; the author asked why they
   * should be ("Why not just collapse whenever there is an empty line??") and
   * they are not any more. What survives is the part that was actually being
   * defended: the image is a fixed 48 px square beside the text, so a saint
   * with an icon and a saint without get the same box. The name is the only
   * thing that moves it, and only ever to 66, 83 or 104.
   */
  const heights = await cards.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
  for (const h of heights) expect([66, 83, 104], `row height ${h}`).toContain(h);
  const byPicture = await cards.evaluateAll((els) =>
    els.map((el) => ({
      h: Math.round(el.getBoundingClientRect().height),
      lines: Math.round(
        el.querySelector('.index-name').getBoundingClientRect().height /
          parseFloat(getComputedStyle(el.querySelector('.index-name')).lineHeight),
      ),
      imaged: Boolean(el.querySelector('.index-media img')),
    })),
  );
  // Same line count, same height — whatever the picture is doing.
  const perLines = new Map();
  for (const r of byPicture) {
    if (perLines.has(r.lines)) expect(r.h, `${r.lines} lines`).toBe(perLines.get(r.lines));
    else perLines.set(r.lines, r.h);
  }

  await page.reload({ waitUntil: 'networkidle' });
  await expect(viewChip(page)).toHaveText(/Rows$/);
  await expect(page.locator('input[name="layout"]:checked')).toHaveValue('rows');
  await expect(page.locator('.index-card').first()).toHaveClass(/is-row/);
});


test('a fading card is set aside, and one brought back mid-fade is whole again', async ({ page }) => {
  // The Index's leaving cards learned Amendment 17's lesson too: a card on its
  // way out keeps its link for 200 ms, and that link must not hold the tab
  // order. Undone the moment a second filter change brings the card back.
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await facet(page, 'historicities');

  const states = await page.evaluate(() => {
    const box = document.querySelector('input[name="historicities"][value="legendary"]');
    const fire = () => box.dispatchEvent(new Event('input', { bubbles: true }));
    box.checked = true;
    fire();
    const leaving = document.querySelector('.index-card.leaving');
    const during = leaving && {
      hidden: leaving.getAttribute('aria-hidden'),
      tab: leaving.querySelector('.index-name').tabIndex,
    };
    box.checked = false;
    fire();
    // The same node, asked again: a different card passing would prove nothing.
    return {
      during,
      after: leaving && {
        back: leaving.isConnected && !leaving.classList.contains('leaving'),
        hidden: leaving.getAttribute('aria-hidden'),
        tab: leaving.querySelector('.index-name').tabIndex,
      },
    };
  });
  expect(states.during).toEqual({ hidden: 'true', tab: -1 });
  expect(states.after).toEqual({ back: true, hidden: null, tab: 0 });
});

/* ---- the 2026-08-22 ground ---------------------------------------------- */


test('the day ground is gesso, and the field is recessed into it', async ({ page }) => {
  // The author pinned the light ground at rgb(229, 228, 221) on 2026-08-22,
  // replacing the near-white #fbfaf7 DESIGN.md §3 had carried until then, and
  // warmed it again to #ECE5D6 — rgb(236, 229, 214) — on 2026-09-01. Three
  // derived values moved with it and each is asserted below, because each was
  // a relationship the old near-white ground was holding up by accident: the
  // second move re-derived `--field` and `--veil` for the same reason rather
  // than leaving a grey panel let into a cream page.
  await page.goto('/saints', { waitUntil: 'networkidle' });

  const lum = (rgb) => {
    const [r, g, b] = rgb.match(/\d+/g).map(Number).map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => {
    const [hi, lo] = lum(a) > lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)];
    return (hi + 0.05) / (lo + 0.05);
  };

  const seen = await page.evaluate(() => {
    const panel = document.querySelector('.index-card.panel');
    const ps = getComputedStyle(panel);
    const dates = getComputedStyle(panel.querySelector('.index-dates'));
    return {
      page: getComputedStyle(document.body).backgroundColor,
      field: ps.backgroundColor,
      border: ps.borderTopColor,
      soft: dates.color,
    };
  });

  // The ground itself, exactly as asked.
  expect(seen.page).toBe('rgb(236, 229, 214)');

  // A card is a kovcheg: the field sits *below* the page tone (DESIGN.md §1,
  // §3). Darkening the page without re-deriving the field would have inverted
  // that silently — the old #f4f1ea is lighter than this ground, so the panel
  // would have stood proud of the page instead of recessing into it.
  expect(lum(seen.field)).toBeLessThan(lum(seen.page));

  // The integral border has to stay visible against both the page it sits on
  // and the field it encloses. Against the new ground the old --rule was
  // 1.14:1 and 1.06:1 — a border indistinguishable from its own interior.
  expect(ratio(seen.border, seen.page)).toBeGreaterThan(1.3);
  expect(ratio(seen.border, seen.field)).toBeGreaterThan(1.2);

  // Secondary text on the *field* is the worst case, not on the page, and it
  // is what axe failed at 4.34:1 when only the ground had moved.
  expect(ratio(seen.soft, seen.field)).toBeGreaterThan(4.5);
});


test('Detailed adds the opening of the life, and every box still holds', async ({ page }) => {
  // Addendum H1. The description is the life's own first paragraph in a box
  // reserved before it arrives: the card's height is still known before
  // render, so nothing may be cropped. (Until 2026-08-22 Detailed also swapped
  // the badge for the matrix; the glyph is removed — DESIGN.md §2.)
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  // A *card's* box is what this measures, and a phone opens on rows since
  // 2026-08-27 — whose description is clamped to two lines, not three.
  await chooseView(page, 'cards');
  const box = page.locator('[data-detailed]');
  await expect(box).not.toBeChecked();
  await expect(page.locator('.index-desc')).toHaveCount(0);

  /*
   * One saint, measured twice. This narrowed to Anthony before the plain
   * measurement on 2026-08-24, having compared the unfiltered first card
   * against Anthony's since it was written: a card's height comes from its own
   * picture's aspect ratio, so the two were never the same box, and the
   * assertion below only held while the first card happened to be a saint
   * without a picture. Changing the default order to Earliest put a tall icon
   * there and "taller by what was added" started reading as a shrink — a
   * defect in the test, not in the boxes.
   */
  await page.locator('[data-query]').fill('Anthony the Great');
  const first = page.locator('.index-card', { hasText: 'Anthony the Great' });
  await expect(first).toHaveCount(1);
  const plain = (await first.boundingBox()).height;

  await box.check();
  await expect(page.locator('.index-card').first()).toHaveClass(/is-detailed/);
  await expect(first).toHaveCount(1);
  await expect(first.locator('.index-desc')).toContainText('Born to a prosperous Coptic family');
  // Still the manifest's numbers: three lines of description, and a taller
  // card by exactly what was added.
  const geometry = await first.evaluate((card) => {
    const r = (el) => el.getBoundingClientRect();
    const desc = card.querySelector('.index-desc');
    return { descLines: Math.round((r(desc).height / 19.575) * 10) / 10 };
  });
  expect(geometry.descLines).toBe(3);
  expect((await first.boundingBox()).height).toBeGreaterThan(plain + 60);
  expect(await nothingCropped(page)).toEqual([]);

  // Rows take it too, at two lines, and nothing in a row is cropped either.
  await chooseView(page, 'rows');
  await expect(page.locator('.index-card').first()).toHaveClass(/is-row/);
  await expect(page.locator('.index-card').first().locator('.index-desc')).toBeVisible();
  expect(await nothingCropped(page)).toEqual([]);
  const rowHeights = await page.locator('.index-card').evaluateAll((els) =>
    els.map((el) => Math.round(el.getBoundingClientRect().height)),
  );
  expect(new Set(rowHeights).size).toBe(1);

  // Remembered, like the layout.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('[data-detailed]')).toBeChecked();
  await expect(page.locator('.index-card').first().locator('.index-desc')).toBeVisible();
  await page.locator('[data-detailed]').uncheck();
  await chooseView(page, 'cards');
});


test('a card lifespan is one line, ending in an ellipsis where three across would wrap it', async ({ page }) => {
  // Found by looking, not by the suite (Amendment 26): with Literata applied
  // the 72ch column is 678 px and the grid lays three cards across at 213 px,
  // where "13 November 354 – 28 August 430" wrapped and the reserved block cut
  // the second line off. The Detailed test's crop check never saw it because a
  // fresh context is a cold load — 580 px, two columns, nothing wraps. So this
  // one warms the font cache on another route first, which is every visit
  // after the first. Rows had the one-line rule from Amendment 22; cards did
  // not.
  //
  // The one test with no meaning under COLD_FACE: its subject *is* the warm
  // 678 px column, and a rehearsal that refuses the webfont cannot have one.
  // It says so through its own premise check rather than being told twice.
  test.skip(!!process.env.COLD_FACE, 'the warm column does not exist with the webfont refused');
  /*
   * 900 rather than 1280 since 2026-09-01, when every route took the Daily
   * page's own wide measure (author: "make the All Saints Page left and right
   * margin wider to match the Daily Page"). At 1280 the cards are 290 px and
   * the lifespan no longer wraps at all — which is a better page and a worse
   * test, the subject here being what happens when it *would*. Below the
   * 1024 px breakpoint the 72ch column and its three 213 px cards are exactly
   * as they were, so the wrap this pins still has somewhere to happen.
   */
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto('/about', { waitUntil: 'networkidle' });
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // The column stays the warm 678 and the grid three across; the search only
  // brings his card into the virtualised document.
  await page.locator('[data-query]').fill('Augustine');
  await expect(page.locator('.index-card', { hasText: 'Augustine of Hippo' })).toHaveCount(1);
  const seen = await page.locator('.index-card', { hasText: 'Augustine of Hippo' }).evaluate((card) => {
    const d = card.querySelector('.index-dates');
    return {
      cardW: card.clientWidth,
      lines: Math.round(d.getBoundingClientRect().height / 19.575),
      ellipsis: getComputedStyle(d).textOverflow,
      over: card.scrollHeight - card.clientHeight,
    };
  });
  // The premise first: if the column is still the cold 580 here, the grid is
  // two across and this proves nothing — say so rather than pass by accident.
  expect(seen.cardW, 'the warm column lays three cards across').toBeLessThan(240);
  expect(seen.lines, 'the lifespan wrapped').toBe(1);
  expect(seen.ellipsis).toBe('ellipsis');
  expect(seen.over, 'the card crops its block').toBeLessThanOrEqual(0);
  expect(await nothingCropped(page)).toEqual([]);
});



test('the grid follows its column, not only the window', async ({ page }) => {
  // Literata arriving inside font-display: optional's window widens the 72ch
  // column from 580 to 678 px after the grid has counted its columns, and a
  // cold load at 1280 laid two columns into a three-column width (Amendment
  // 26). That race cannot be staged on demand, so the column is widened by
  // hand after load — the same event: a container that moves while the window
  // does not — and the grid has to re-count without a resize event.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const before = await page.locator('.index-card').first().evaluate((c) => c.clientWidth);
  await page.addStyleTag({ content: 'main.chrome { max-width: 900px !important; }' });
  // Polled, not slept: the observer is delivered at the rendering update the
  // style change causes, and a headless page produces no further frames on
  // its own — a fixed wait and then a read was racing that (Amendment 26).
  await expect
    .poll(() => page.locator('.index-card').first().evaluate((c) => c.clientWidth), {
      message: `cards are still ${before} px wide after the column grew`,
      timeout: 3000,
    })
    .toBeLessThan(before);
  const after = await page.evaluate(() => {
    const grid = document.querySelector('[data-grid]');
    const cards = [...grid.querySelectorAll('.index-card')];
    const right = Math.max(...cards.map((c) => c.getBoundingClientRect().right));
    return { col: grid.clientWidth, w: cards[0].clientWidth, rightGap: Math.round(grid.getBoundingClientRect().right - right) };
  });
  expect(after.col).toBeGreaterThan(800);
  // More columns in more room: narrower cards, and the last column ending at
  // the column's own edge rather than leaving the new width empty.
  expect(after.w, `cards still ${after.w} px wide in a ${after.col} px column`).toBeLessThan(before);
  expect(after.rightGap, `the grid leaves ${after.rightGap} px of its column unused`).toBeLessThan(2);
});



test('the × returns the reader to the Index as they left it, and so does the browser back', async ({ browser }) => {
  // Addendum H3. Filters, open facets and scroll position all come back; the
  // nav link still opens the Index fresh, because it does not ask. A short
  // viewport so there is a scroll position to lose.
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const page = await ctx.newPage();
  await searchMode(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await onlyCalendar(page, 'Romanian');
  await expect(page.locator('[data-count]')).toHaveText('160');
  // The order is pinned because the card this test opens has to be one that
  // fits between the header and the fold, and card heights come from each
  // icon's aspect ratio — under the Random default (2026-08-24) a deal that
  // put a tall portrait across the whole 780 px viewport left no such card
  // and the search came back empty. The subject here is what comes back
  // after a trip into a saint, not which saints are on top.
  await chooseSort(page, 'earliest');
  await expect(page.locator('[data-count]')).toHaveText('160');
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(200);
  /*
   * **Where it actually landed, not the number that was asked for** (2026-09-02).
   * The subject is the round trip — the reader comes back to where they were —
   * and 500 was only ever this test's way of getting somewhere. The phone's own
   * margins above the row moved by 4 px that afternoon and the page settled at
   * 504, which failed an assertion about a constant while the thing being
   * tested was working perfectly.
   */
  const left = await page.evaluate(() => window.scrollY);
  expect(left, 'premise: the page did not scroll at all').toBeGreaterThan(100);

  // Opened from the page as it stands — a Playwright click would scroll the
  // card into view first and move the very position this test is about.
  const openVisible = () =>
    page.evaluate(() => {
      const a = [...document.querySelectorAll('.index-card .index-name')].find((el) => {
        const r = el.getBoundingClientRect();
        return r.top > 60 && r.bottom < innerHeight;
      });
      if (!a) throw new Error('no card sits wholly between the header and the fold');
      a.click();
      return a.textContent;
    });
  const opened = await openVisible();
  await expect(page.locator('h1.saint-name')).toHaveText(opened);
  await page.locator('[data-back]').click();
  await expect(page).toHaveURL(/\/saints$/);
  await expect(page.locator('[data-count]')).toHaveText('160');
  await expect(page.locator('input[name="churches"][value="romanian"]')).toBeChecked();
  expect(await page.evaluate(() => document.querySelector('[data-facet="churches"]').open)).toBe(true);
  expect(await page.evaluate(() => window.scrollY)).toBe(left);

  // The browser's own back finds the same place.
  await openVisible();
  await expect(page.locator('h1.saint-name')).toBeVisible();
  await page.goBack();
  await expect(page.locator('[data-count]')).toHaveText('160');
  expect(await page.evaluate(() => window.scrollY)).toBe(left);

  // The nav link is a fresh Index. Landing at the top now eases there
  // (2026-08-27) rather than jumping, so the scroll check polls like the
  // count check beside it instead of reading a single instant.
  await page.locator('nav a[href$="/saints"]').click();
  await expect(page.locator('[data-count]')).toHaveText(CORPUS);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await ctx.close();
});


test('a navigation lands at the top of the page it opens', async ({ browser }) => {
  // Found measuring the ×: with no scroll reset anywhere, a reader arriving
  // from a scrolled Index landed 696 px down the saint's page at 360 px. The
  // app owns scroll now (DESIGN.md §5c).
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const page = await ctx.newPage();
  await searchMode(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight - innerHeight - 100));
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
  await page.evaluate(() => {
    const a = [...document.querySelectorAll('.index-card .index-name')].find((el) => {
      const r = el.getBoundingClientRect();
      return r.top > 60 && r.bottom < innerHeight;
    });
    a.click();
  });
  await expect(page.locator('h1.saint-name')).toBeVisible();
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await ctx.close();
});


test('the veneration glyph is drawn nowhere, and gold is spent only where it was asked for', async ({ page }) => {
  /*
   * The author's decision for the Eastern Orthodox project (2026-08-22;
   * DESIGN.md §2, and §7 superseded in full): in a one-communion corpus the
   * mark said nothing and is removed, and gold — spent only on it — is spent
   * nowhere until a new signature element is chosen. Four routes; every
   * element's computed colours. A reintroduction anywhere fails here by name.
   *
   * **The die is the first exception, and it is an exception rather than a
   * loosening** (author, 2026-08-26 evening: "make the icon gold to draw
   * attention"). Every gold on these four routes since has been a *finding* —
   * the rail's feast dot, the feast chip, the hairline under the date — and
   * this is the first control to wear it. It is allowed here **by name**, so
   * a second one anywhere still fails, which is the whole value of the test.
   * DESIGN.md §2 carries the reversal and the cost: --gold on gesso is
   * 2.78:1, under the 3:1 WCAG asks of a meaningful non-text graphic.
   *
   * The allowance is `el.closest('.random-die')` in the sweep below, and the
   * assertion at the end is what keeps it honest — an exception nobody
   * exercises would let the die lose its gold with this test still green.
   */
  await ready(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  const gold = await page.evaluate(() => {
    const hex = getComputedStyle(document.documentElement).getPropertyValue('--gold').trim();
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
  });
  for (const path of [POPULATED, INDEX, DETAIL, '/about']) {
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.locator('svg.badge'), `${path} draws the mark`).toHaveCount(0);
    await expect(page.locator('.glyph-matrix'), `${path} draws the matrix`).toHaveCount(0);
    const golden = await page.evaluate((goldRgb) => {
      const props = ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'fill', 'stroke', 'outlineColor'];
      const hits = [];
      for (const el of document.querySelectorAll('body *')) {
        // The die and the icon inside it: named, so nothing else may.
        if (el.closest('.random-die')) continue;
        const cs = getComputedStyle(el);
        const hit = props.find((p) => cs[p] === goldRgb);
        if (hit) hits.push(`${el.tagName.toLowerCase()}.${el.getAttribute('class') || ''} ${hit}`);
      }
      return hits.slice(0, 5);
    }, gold);
    expect(golden, `${path} spends gold on ${golden.join(', ')}`).toEqual([]);
  }

  // The one that is allowed is also *there*: an exception nobody exercises
  // would let the die quietly lose its gold and this test go on passing.
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await expect(page.locator('.random-die')).toHaveCSS('color', gold);
});


test('every saint opens on a life from the synaxarion, with its source linked', async ({ page }) => {
  // Amendment 30. The corpus went from eight lives to a hundred and forty-nine
  // in one sitting, each written after the synaxarion of a church that keeps
  // the saint, each closing with the source it was read from. Lawrence carries
  // the Russian life and the Serbian Prologue; a link to a companion prefetches
  // like any other route into a page; the source line links out. The renamed
  // new martyr (the calendar's 1927 was a slip for 1937) opens under his
  // corrected name and year, and the Index's Detailed grain reads the same
  // opening paragraph the page does.
  await ready(page);
  await page.goto('/saints/lawrence-of-rome', { waitUntil: 'networkidle' });
  await expect(page.locator('.life p').first()).toContainText('Lawrence, archdeacon of Rome, suffered in 258');
  await expect(page.locator('.life')).not.toContainText('No life has been written');
  await expect(page.locator('.life a[data-prefetch="sixtus-ii-of-rome"]')).toHaveCount(1);
  await expect(page.locator('.life em a[href*="days.pravoslavie.ru"]')).toHaveCount(1);
  await expect(page.locator('.life em a[href*="pravoslavno.rs"]')).toHaveCount(1);
  await expect(page.locator('.life em a[rel="noopener noreferrer"]')).toHaveCount(2);

  await page.goto('/saints/eleutherius-monk-martyr-1937', { waitUntil: 'networkidle' });
  await expect(page.locator('h1.saint-name')).toHaveText('Venerable Martyr Eleutherius');
  await expect(page.locator('.life p').first()).toContainText('Eleutherius Pechennikov was born in 1870');
  // The year, in the line under the name: his register is a lone dated death
  // with no place, which ui/datefacts.js stopped drawing on 2026-08-26 because
  // it only ever repeated the subtitle.
  await expect(page.locator('.saint-facts')).toContainText('1937');
  await expect(page.locator('.life em a[href*="azbyka.ru"]')).toHaveCount(1);

  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.locator('[data-detailed]').check();
  // (The Index is the Russian calendar's here, so a Russian saint: Stamatios
  // would be set aside as Serbian-only.)
  await page.locator('[data-query]').fill('Kaluga');
  const card = page.locator('.index-card', { hasText: 'Lawrence of Kaluga' });
  await expect(card).toHaveCount(1);
  await expect(card.locator('.index-desc')).toContainText('The blessed Lawrence, fool for Christ and wonderworker of Kaluga');
  await page.locator('[data-detailed]').uncheck();
});

/* ---- the 2026-08-24 evening round: rows, one bookmark, the narrow header -- */


test('Also commemorated is a column of saint cards, not a list of links', async ({ page }) => {
  /*
   * Author, 2026-08-24: "display the saint card row layout instead of the
   * text only". The rest of the day now shows what it always was — a picture,
   * a lifespan, and Save where every other card on the site keeps it — in the
   * Index's own row dress, so the Daily page and All Saints read as one
   * register. The church's title for the day ("Venerable, the Great") is what
   * these rows carry that no other card does, and it survives the change.
   *
   * 1 September 2026 in the Russian calendar: Pitirim of Perm is the hero and
   * six more are commemorated under him.
   */
  await ready(page);
  await page.goto('/calendar/2026-09-01', { waitUntil: 'networkidle' });
  const cards = page.locator('.register-cards .reg-card');
  await expect(cards).toHaveCount(6);

  /*
   * **Pinned by name rather than read off the first card** (2026-09-02). The
   * register is ordered tallest-picture-first now (author: "reorder the daily
   * saints cards in order from tallest saint image to shortest to no saint
   * image"), so which saint is first is a fact about the icons rather than
   * about this test's subject — which is that a saint here is a card with a
   * lifespan on it, whoever they are and wherever they fall.
   */
  const agapius = cards.filter({ hasText: 'Martyr Agapius of Gaza' });
  await expect(agapius, 'premise: Agapius is not in this day’s register').toHaveCount(1);
  await expect(agapius.locator('.reg-sub')).toContainText('304–306');

  /*
   * **Every row keeps its picture's slot, and none of them keeps a mark**
   * (author, 2026-08-27, of the row cards: "remove the bookmark entirely, and
   * just have the image square to the right side, giving more space for the
   * text").
   *
   * One of the six has an icon. The other five hold the slot without drawing
   * in it, which is not the empty frame the author struck out on 2026-08-26
   * ("remove the empty frame and just print the text all the way to the left
   * margin of the card") — that one stood *before* the name and pushed every
   * title in from the margin. This one is after the name, at the trailing
   * edge, so the names still start at the card's own margin while the pictures
   * that do exist still hold one column.
   */
  await expect(cards.locator('.reg-thumb img')).toHaveCount(1);
  await expect(cards.locator('.reg-thumb')).toHaveCount(6);
  await expect(cards.locator('.bookmark')).toHaveCount(0);
  // The hero is not repeated among them.
  await expect(page.locator('.register-cards')).not.toContainText('Pitirim');

  // The row still opens the saint, which is now the only thing it does.
  await agapius.locator('.reg-name').click();
  await expect(page.locator('h1.saint-name')).toHaveText('Martyr Agapius of Gaza');
  // Save is still there, on the page the author sent anyone who wants it.
  await expect(page.locator('.saint-head .bookmark')).toHaveCount(1);
});


test('there is one bookmark drawing, and one place left that draws it', async ({ page }) => {
  /*
   * Author, 2026-08-24: "There are two bookmark visuals. One with an outline,
   * one that is 50% opacity... Replace the former with the latter in all
   * cases, remove the outline version completely." There never were two
   * components — there was one mark with a gesso halo under it, and over a
   * dark icon the halo was all that showed, so the reader met an outlined
   * bookmark on a card with a picture and a filled one everywhere else.
   *
   * **Read off the saint's own page since 2026-08-28**, which is the third
   * place this test has lived and the last one available: it was the Daily
   * register until that register lost its marks, then the Index's cards until
   * the author took the mark off those too ("Remove the bookmark from the
   * normal Cards in the All Saints view"). Save exists on the saint's page and
   * nowhere else now.
   *
   * **The drop-shadow half of this test is gone with the same instruction.**
   * It asserted that a mark over a picture is given a shadow and one on the
   * page's own ground is not; there is no mark over a picture anywhere on the
   * site any more, so the rule it checked matched nothing. base.css records
   * the withdrawal where the rule stood rather than deleting it silently.
   */
  await ready(page);
  await page.goto(DETAIL, { waitUntil: 'networkidle' });
  const mark = page.locator('.saint-head .bookmark');
  await expect(mark).toHaveCount(1);
  await expect(page.locator('.bm-halo')).toHaveCount(0);

  const drawing = await mark.evaluate((button) => {
    const svg = button.querySelector('.bookmark-mark');
    const paths = svg.querySelectorAll('path');
    const style = getComputedStyle(paths[0]);
    return {
      paths: paths.length,
      opacity: style.opacity,
      fill: style.fill,
      stroke: style.stroke,
      filter: getComputedStyle(svg).filter,
    };
  });
  // One path, one fill, one opacity — no second rendering left anywhere.
  expect(drawing.paths).toBe(1);
  expect(drawing.opacity).toBe('0.5');
  expect(drawing.fill).toBe(drawing.stroke);
  // On the page's own ground, where the mark has all the contrast it needs.
  expect(drawing.filter).toBe('none');

  // And it fills to full strength when saved — the second of the two states,
  // which is all the states there are.
  await mark.click();
  await expect
    .poll(() => mark.locator('.bm-shape').evaluate((p) => getComputedStyle(p).opacity))
    .toBe('1');

  // The Index draws none, in either shape: that is the instruction, asserted
  // where a reintroduction would show up first.
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await chooseView(page, 'cards');
  await expect(page.locator('.index-card').first()).toBeVisible();
  await expect(page.locator('.index-card .bookmark')).toHaveCount(0);
  await chooseView(page, 'rows');
  await expect(page.locator('.index-card.is-row').first()).toBeVisible();
  await expect(page.locator('.index-card .bookmark')).toHaveCount(0);
});


test('a lifespan with nothing at either end says Undated, capitalised', async ({ page }) => {
  // Author, 2026-08-25 evening: "instead of lowercase 'undated', replace it
  // with uppercase, 'Undated'". Standing alone under a name it is a label
  // rather than a word in a sentence — the same departure the dates' capitals
  // are, and made in all five packs so none of them disagrees with itself.
  await ready(page, { church: 'russian' });
  await page.goto('/calendar/2026-08-25', { waitUntil: 'networkidle' });
  const dates = page.locator('.reg-card .reg-sub');
  await expect(dates.filter({ hasText: 'Undated' }).first()).toBeVisible();
  await expect(dates.filter({ hasText: /^undated$/ })).toHaveCount(0);
});


test('every row starts its name at the card margin, picture or no picture', async ({ page }) => {
  /*
   * Author, 2026-08-26: "where a saint has no icon, in the row card, remove
   * the empty frame and just print the text all the way to the left margin of
   * the card." An empty 48 px box is a promise of a picture that is not
   * coming, and 721 of the 851 have none.
   *
   * **Superseded in its mechanism, kept in its point** (author, 2026-08-27:
   * "Reformat all row cards, put the image to the right side, to the left of
   * the bookmark, and start the text on the left edge"). The frame is back,
   * but at the *trailing* end — so the name starts at the margin on every row
   * rather than only on the ones with nothing to show, which is more than the
   * first instruction asked for and is why it supersedes rather than reverses
   * it. What this test asserted for a day and a half — that an imageless row
   * carries no `.index-media` at all, and that an imaged one indents past it —
   * was the old arrangement's way of getting there and is now false of both.
   *
   * **And superseded once more in its subject** (author, 2026-08-27: "don't do
   * it in the exact same row style anymore"). These are the Daily page's
   * register rows, which stopped being the Index's row cards that afternoon
   * and now carry `.reg-name` and a 40 px `.reg-thumb` of their own. The point
   * outlived both mechanisms, which is why the test is still here and still on
   * this page: whatever dresses a row, every name starts at the same left edge
   * and a saint with no icon does not pull the column about.
   */
  await ready(page, { church: 'greek' });
  await page.goto('/calendar/2026-08-25', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  /*
   * **The list face, asked for by its own control** (2026-09-01). *Also
   * commemorated* opens as a grid of cards now, and everything below is about
   * the other face: a card has no held slot to keep and no shared left edge to
   * start its name at, because it is a column rather than a row. So the test
   * presses the toggle instead of assuming which face is showing — which is
   * also a small assertion that the toggle does what it says.
   */
  const asList = page.locator('[data-reg-view="list"]');
  if (await asList.isVisible()) {
    await asList.click();
    await expect(page.locator('[data-register]')).toHaveClass(/is-list/);
  }
  const seen = await page.evaluate(() => {
    const withPicture = document.querySelector('.reg-card:has(.reg-thumb img)');
    const without = document.querySelector('.reg-card:not(:has(.reg-thumb img))');
    const inset = (row) => {
      const card = row.getBoundingClientRect();
      const name = row.querySelector('.reg-name').getBoundingClientRect();
      const media = row.querySelector('.reg-thumb');
      return {
        gap: name.left - card.left,
        height: card.height,
        mediaLeft: media ? media.getBoundingClientRect().left : null,
        nameRight: name.right,
      };
    };
    return { withPicture: inset(withPicture), without: inset(without) };
  });
  // The name begins at the card's own padding on both, which is the whole
  // point of the reformat: one left edge down a scrolling register.
  expect(seen.without.gap).toBeLessThan(16);
  expect(seen.withPicture.gap).toBeLessThan(16);
  expect(Math.abs(seen.without.gap - seen.withPicture.gap)).toBeLessThan(2);
  // And the picture is past the name, not in front of it.
  expect(seen.withPicture.mediaLeft).toBeGreaterThan(seen.withPicture.gap);
  // Both rows are still the same height. This list is not virtualised — that
  // was the Index's reason and it left with the Index's row — but a register
  // whose rows change height depending on whether a saint has an icon reads as
  // ragged, and the held slot is what stops it.
  expect(Math.abs(seen.without.height - seen.withPicture.height)).toBeLessThan(2);
});


test('a card is only as tall as its name needs, like a row', async ({ page }) => {
  /*
   * Author, 2026-08-28: "my request to make the text / frame margins of the
   * saint card view equal to the margins in the row view was not addressed ...
   * the extra line is printed instead of being collapsed as we discussed."
   *
   * A card reserved two lines of name whatever the name was, so a one-line
   * saint left an empty line between the name and the dates and stood taller
   * than the same saint's row. Rows have been sized to their own line count
   * since Amendment 56; `cardHeights` in views/index/grid.js now does the same
   * arithmetic for cards, and `.index-card .name-line` gave up its fixed 42 px.
   *
   * Pinned by name rather than off the deal, which is this suite's oldest trap:
   * the Index opens in Random order and a screenful is a property of the
   * shuffle. Anthony the Great wraps to two lines in the card column; Apostle
   * Titus does not.
   */
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await chooseView(page, 'cards');
  await page.evaluate(() => document.fonts.ready);

  /*
   * **The residual, not two card heights.** Comparing one card with another
   * measures their pictures more than their names — the first version of this
   * did, and passed with the fix backed out. What is claimed is that the text
   * block under the picture is *base plus the lines the name needs*, so the
   * quantity to hold constant is `height - media - lines x lineHeight`. With a
   * fixed two-line box that residual is a whole line bigger for a one-line
   * name, which is the empty line the author was pointing at.
   */
  const residuals = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('.index-card')) {
      const nameEl = el.querySelector('.index-name');
      const media = el.querySelector('.index-media');
      const line = parseFloat(getComputedStyle(nameEl).lineHeight);
      const lines = Math.round(nameEl.getBoundingClientRect().height / line);
      out.push({
        text: nameEl.textContent.trim(),
        lines,
        line,
        residual:
          el.getBoundingClientRect().height -
          (media ? media.getBoundingClientRect().height : 0) -
          lines * line,
      });
    }
    return out;
  });

  const byLines = new Map();
  for (const r of residuals) {
    if (!byLines.has(r.lines)) byLines.set(r.lines, []);
    byLines.get(r.lines).push(r);
  }
  /*
   * The premise: the screenful holds names of more than one length, or there is
   * nothing to compare and a fixed box would satisfy this as happily as a
   * collapsing one.
   *
   * **Two *or more*, since 2026-09-01**, where this used to require exactly one-
   * and two-line names. The card's clamp was lifted that day (author: "display
   * the full name and don't do any '...' at the end"), so a screenful now holds
   * three- and four-line names as well and `toEqual([1, 2])` began failing on
   * the deals that included one — a change in what the page may do, not in
   * whether it collapses. What is claimed is unchanged and is now claimed of
   * every length present rather than of two of them.
   */
  const lengths = [...byLines.keys()].sort((a, b) => a - b);
  expect(lengths.length, 'the window should hold names of more than one length').toBeGreaterThan(1);

  const mean = (rs) => rs.reduce((a, r) => a + r.residual, 0) / rs.length;
  const residualOf = new Map(lengths.map((n) => [n, mean(byLines.get(n))]));
  const first = residualOf.get(lengths[0]);
  for (const n of lengths) {
    expect(
      Math.abs(residualOf.get(n) - first),
      `a ${lengths[0]}-line card reserves ${first.toFixed(1)} px beyond its name and a ${n}-line one ${residualOf.get(n).toFixed(1)}`,
    ).toBeLessThan(4);
  }

  const card = await page.locator('.index-card').first().evaluate((el) => {
    const s = getComputedStyle(el);
    return { padLeft: s.paddingLeft, padRight: s.paddingRight };
  });

  // And the frame's own margins are the row's: the same rule sets both, which
  // is the other half of what was asked for.
  await chooseView(page, 'rows');
  await page.locator('[data-query]').fill('Apostle Titus');
  const row = page.locator('.index-card.is-row').first();
  await expect(row).toBeVisible();
  const rowPad = await row.evaluate((el) => {
    const s = getComputedStyle(el);
    return { padLeft: s.paddingLeft, padRight: s.paddingRight };
  });
  expect(rowPad.padLeft).toBe(card.padLeft);
  expect(rowPad.padRight).toBe(card.padRight);
});


test('a saint is named by rank, and what they held is on the line below', async ({ page }) => {
  /*
   * Author, 2026-08-27: "Add the rank Hieromartyr or Righteous if it applies
   * to the saint, and if there is no special rank, print 'St.' prefixed, and
   * then strip the ." — which reverses Amendment 32's blanket honorific.
   *
   * 28 August on the Greek calendar is the day the addendum names for the
   * check, because the corpus and OCA's own listing for it share three
   * figures and OCA prints all three the way this now does: *Venerable Moses
   * the Ethiopian*, *Righteous Hezekiah*, and Anna as a prophetess. It is
   * also a day with six commemorations, so the hero and the register are both
   * exercised on one page.
   *
   * The office is the other half. It came out of `display_name` in the same
   * sitting — the names used to read "Hezekiah the Righteous, King of Judah"
   * — and it is drawn on the subtext line beside the dates, never in the
   * name: the rank is short and is how a saint is named, the office is long
   * and is a fact about them, so the long half sits on the line that can
   * truncate without losing the identity.
   */
  await ready(page, { church: 'greek', language: 'en' });
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });

  await expect(page.locator('.hero-name')).toHaveText('Venerable Moses the Ethiopian');

  const register = page.locator('.day-panel .register .reg-name');
  await expect(register.filter({ hasText: 'Hezekiah' })).toHaveText('Righteous Hezekiah');
  await expect(register.filter({ hasText: 'Anna' })).toHaveText('Prophetess Anna, daughter of Phanuel');
  // Not "Hezekiah the Righteous, King of Judah": the rank leads, the office
  // has moved down a line, and the death year is read off `dates.death`.
  const hezekiah = page.locator('.day-panel .register .reg-card', { hasText: 'Hezekiah' });
  await expect(hezekiah.locator('.reg-sub')).toHaveText('King of Judah · Reposed 696 BC');

  /*
   * And "St" is the marked case now — 58 of 781, the hierarchs and the
   * theologians — carrying no stop, which is the second half of the same
   * instruction. Athanasius is one of the seven saints who have an icon, so
   * this is a page a reader actually reaches.
   */
  await page.goto('/saints/john-chrysostom', { waitUntil: 'networkidle' });
  await expect(page.locator('h1.saint-name')).toHaveText('St John Chrysostom');

  /*
   * 2026-08-27, a reader: "st John Chrysostom does not display 'Archbishop
   * of Constantinople' on his saint card rank like others." He is one of the
   * eight saints left over from the original ten-saint seed corpus, whose
   * attestations still carry a per-church `titles` array (`Hierarch`,
   * `Archbishop of Constantinople`) from a schema `office` later replaced —
   * a genuine miss, not a display bug, closed by giving him and 22 others an
   * `office` the same audit found missing. Fixing it uncovered a second,
   * real bug: the facts line's old titles-dedup only checked `card.types`,
   * never `card.office`, so a title repeating the office in the same words
   * printed twice. Both the card and the page are pinned here.
   */
  const facts = (await page.locator('.saint-facts').innerText()).trim();
  expect(facts.match(/Archbishop of Constantinople/g)?.length, facts).toBe(1);
  expect(facts).toContain('Hierarch');

  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.locator('[data-query]').fill('John Chrysostom');
  await expect(page.locator('.index-card', { hasText: 'John Chrysostom' }).locator('.index-dates')).toContainText(
    'Archbishop of Constantinople',
  );

  // The office is printed on the facts line, and the type that says the same
  // word is not printed twice beside it.
  await page.goto('/saints/gorazd-of-bohemia', { waitUntil: 'networkidle' });
  await expect(page.locator('h1.saint-name')).toHaveText('Hieromartyr Gorazd');
  await expect(page.locator('.saint-facts')).toContainText('Bishop of Bohemia and Moravia-Silesia');
  await expect(page.locator('.saint-facts')).not.toContainText('Silesia · Bishop');

  /*
   * The rank follows the reader's language and declines with the saint's sex,
   * which the old abbreviation-only honorific existed to avoid: «Άγ.» dodged
   * the question, «Οσία» answers it. Greek page, Greek calendar.
   */
  await page.evaluate(() => {
    const key = 'gos-settings';
    const now = JSON.parse(localStorage.getItem(key) ?? '{}');
    localStorage.setItem(key, JSON.stringify({ ...now, language: 'el' }));
  });
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await expect(page.locator('.hero-name')).toContainText('Όσιος');

  /*
   * **And Athanasius reads the same way** (author, 2026-08-28: "do hierarch
   * for athanasius"), which he did not until that morning: his record carried
   * `bishop, theologian, confessor`, and `confessor` is a rank in the
   * precedence walk while the hierarchical types are not — they fall through
   * to the `honorific` fallback on purpose, because "St" *is* how both major
   * English calendars print a hierarch and this file's header argues it at
   * length. So he was announced as a Confessor over a page about the
   * archbishop who wrote against the Arians.
   *
   * **The code was doing what it was told, so the fix is the record**: the
   * word came out of his types and nothing in the walk changed. Seven other
   * saints carry the same pair and are deliberately left alone — for several
   * of them, Martin the Pope and Nicholas of Alma-Ata among them, *Confessor*
   * is the epithet the calendars actually print, so the collision is only
   * wrong where the tradition says it is. That is a judgement per saint, and
   * the count is in HANDOFF for the author.
   */
  // Back into English first: the block above left the reader in Greek, and
  // this claim is about which rank he resolves to, not how it is spelt.
  await page.evaluate(() => {
    const key = 'gos-settings';
    const now = JSON.parse(localStorage.getItem(key) ?? '{}');
    localStorage.setItem(key, JSON.stringify({ ...now, language: 'en' }));
  });
  await page.goto('/saints/athanasius-of-alexandria', { waitUntil: 'networkidle' });
  await expect(page.locator('h1.saint-name')).toHaveText('St Athanasius of Alexandria');
  await expect(page.locator('h1.saint-name')).not.toContainText('Confessor');
  // What the quiet rank does not say, the line below still does — including
  // the word *Hierarch*, which his Greek and Russian rows both print.
  await expect(page.locator('.saint-facts')).toContainText('Bishop, Theologian');
  await expect(page.locator('.saint-facts')).toContainText('Hierarch');
});

/* ---- the round of 2026-08-27 evening ------------------------------------- */


test('a row reads name-first, with the picture at the trailing end and no mark', async ({ page }) => {
  /*
   * Author, 2026-08-27, morning: "For all row cards without images, move the
   * text back in line with the other row cards with images... Reformat all row
   * cards, put the image to the right side, to the left of the bookmark, and
   * start the text on the left edge."
   *
   * And that evening, the third part of it withdrawn: "on all row cards,
   * remove the bookmark entirely, and just have the image square to the right
   * side, giving more space for the text." So the row is two columns where it
   * was three, and the picture now holds the trailing edge the mark held.
   *
   * The point is unchanged and is the column: every name begins at the same x
   * whether or not the saint has an icon, and the pictures line up down the
   * register.
   */
  await ready(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await chooseView(page, 'rows');
  /*
   * Pinned, because the Index opens in **random order** and this test needs
   * both kinds of row on screen at once — it failed on a deal that happened to
   * put no icon in the first screenful, which is a test measuring its own luck.
   * Earliest is deterministic and its opening rows carry both.
   */
  await chooseSort(page, 'earliest');
  await expect(page.locator('.index-card.is-row').first()).toBeVisible();

  const rows = await page.evaluate(() => {
    const out = [];
    for (const card of document.querySelectorAll('.index-card.is-row')) {
      const body = card.querySelector('.row-body');
      const media = card.querySelector('.index-media');
      if (!body || !media) continue;
      const box = media.getBoundingClientRect();
      out.push({
        hasImage: !media.classList.contains('is-blank'),
        marks: card.querySelectorAll('.bookmark').length,
        bodyLeft: Math.round(body.getBoundingClientRect().left),
        mediaLeft: Math.round(box.left),
        mediaRight: Math.round(box.right),
        cardRight: Math.round(card.getBoundingClientRect().right),
        square: Math.abs(box.width - box.height) < 1,
      });
    }
    return out;
  });
  expect(rows.length).toBeGreaterThan(3);

  for (const r of rows) {
    const where = JSON.stringify(r);
    // The order across a row: text, then picture, and nothing after it.
    expect(r.bodyLeft, where).toBeLessThan(r.mediaLeft);
    expect(r.marks, where).toBe(0);
    // Square, and holding the trailing edge the mark used to hold.
    expect(r.square, where).toBe(true);
    expect(r.cardRight - r.mediaRight, where).toBeLessThan(20);
  }
  // And both are columns - the same x down the register, imaged or not.
  const one = (key) => new Set(rows.map((r) => r[key])).size;
  expect(one('bodyLeft'), 'names do not share a left edge').toBe(1);
  expect(one('mediaLeft'), 'pictures do not share a column').toBe(1);
  // The columns are only a claim if both kinds of row were among them.
  expect(rows.some((r) => !r.hasImage), 'no imageless row in view').toBe(true);

  /*
   * And an imaged row, named rather than hoped for: two saints who certainly
   * have icons, so the picture's own placement is asserted against a real
   * thumbnail rather than whichever rows the deal produced.
   */
  await page.locator('[data-query]').fill('Anthony');
  await expect(page.locator('.index-card.is-row').first()).toBeVisible();
  const imaged = await page.evaluate(() =>
    [...document.querySelectorAll('.index-card.is-row')]
      .filter((c) => c.querySelector('.index-media img'))
      .map((c) => ({
        bodyLeft: Math.round(c.querySelector('.row-body').getBoundingClientRect().left),
        mediaLeft: Math.round(c.querySelector('.index-media').getBoundingClientRect().left),
        marks: c.querySelectorAll('.bookmark').length,
      })),
  );
  expect(imaged.length, 'no row with a picture to check').toBeGreaterThan(0);
  for (const r of imaged) {
    expect(r.bodyLeft, JSON.stringify(r)).toBeLessThan(r.mediaLeft);
    expect(r.marks, JSON.stringify(r)).toBe(0);
  }
});

/* ---- the evening of 2026-08-27, seven instructions ------------------------ */


test('the Index opens on cards at a desk and on rows on a phone', async ({ browser }) => {
  /*
   * Author, 2026-08-27: "On desktop, default to card view in All Saints. On
   * mobile, default to row view."
   *
   * Both widths in one test, in their own contexts, because this is a decision
   * taken once at render from `matchMedia` — a `setViewportSize` after the page
   * is up would be asking a question that has already been answered.
   *
   * **The stored default had to go for this to be possible at all.** Settings
   * carried `indexLayout: 'cards'` until now, so the fallback in views/saints.js
   * was unreachable and the phone opened on cards no matter what the screen
   * said. It is null until the reader chooses, and that is the point of it
   * being null: a stored value cannot say "whichever suits the screen".
   */
  for (const [width, expected] of [[1280, 'cards'], [360, 'rows']]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const p = await ctx.newPage();
    await p.addInitScript(() => {
      localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'en', indexMode: 'search' }));
    });
    await p.goto(INDEX, { waitUntil: 'networkidle' });
    await expect(p.locator('input[name="layout"]:checked'), `${width}px`).toHaveValue(expected);
    await expect(p.locator('.index-card.is-row'), `${width}px`).toHaveCount(
      expected === 'rows' ? await p.locator('.index-card').count() : 0,
    );
    await ctx.close();
  }

  // And a reader who has chosen keeps their choice at either width, which is
  // the older instruction this must not have broken: "a view control that
  // forgets is one the reader has to set every time".
  const ctx = await browser.newContext({ viewport: { width: 360, height: 900 } });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    localStorage.setItem(
      'gos-settings',
      JSON.stringify({ church: 'russian', language: 'en', indexMode: 'search', indexLayout: 'cards' }),
    );
  });
  await p.goto(INDEX, { waitUntil: 'networkidle' });
  await expect(p.locator('input[name="layout"]:checked')).toHaveValue('cards');
  await ctx.close();
});


test('a row prints its name whole and is only as tall as that name needs', async ({ page }) => {
  /*
   * Two instructions, and the second undid the way the first was answered.
   *
   * Author, 2026-08-27: "Don't cut off names with '…', display them in full."
   * The first answer clamped at two lines and gave *every* row the two-line
   * box, on the reasoning that a virtualised row must know its height before it
   * exists. Then: "Why not just collapse whenever there is an empty line??"
   *
   * It can, and the reasoning was wrong. views/index/grid.js measures each name
   * in the row's own face with canvas `measureText` — no layout, no render —
   * and lays each row out to 66, 83 or 104. Checked against the browser's real
   * wrapping over all 734 names before it was built and again after: the count
   * agrees exactly, in both directions.
   *
   * The clamp also turned out to be hiding five names that need a *third* line
   * at 360 px, so "in full" was not yet true when it was first called done.
   *
   * 360 px is where names wrap at all; at 1280 none of them do, which the last
   * assertion here is about.
   */
  await page.setViewportSize({ width: 360, height: 780 });
  await ready(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await chooseView(page, 'rows');
  await chooseSort(page, 'name');
  await expect(page.locator('.index-card.is-row').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const read = (target = page) =>
    target.evaluate(() => {
      const line = parseFloat(
        getComputedStyle(document.querySelector('.index-card.is-row .index-name')).lineHeight,
      );
      return [...document.querySelectorAll('.index-card.is-row')].map((row) => {
        const name = row.querySelector('.index-name');
        return {
          text: name.textContent.trim(),
          height: Math.round(row.getBoundingClientRect().height),
          lines: Math.round(name.getBoundingClientRect().height / line),
          // Content taller than the box it was laid into is a cropped row.
          overflow: row.scrollHeight - Math.round(row.getBoundingClientRect().height),
          /*
           * **Clipped means the clamp truncated the name**, measured against
           * the clamp's own allowance rather than against the element's box.
           *
           * It was `scrollHeight > clientHeight + 1`, and that is not a test of
           * clipping at all: with a 21.25 px line box a *one-line* name reports
           * scrollHeight 23 against clientHeight 21, so every row in Literata
           * answers "clipped". It only ever passed because the rows were being
           * read before the webfont arrived — which is why it fired as a
           * load-sensitive flake naming a different saint each run, and why
           * preloading the Latin subsets turned it red every time. The names
           * were never cut off; the ruler was wrong.
           */
          clipped: name.scrollHeight > Math.ceil(3 * line) + 2,
        };
      });
    });

  const byLines = { 1: 66, 2: 83, 3: 104 };
  /*
   * **Waited for, because the grid lays out twice on a cold load** (2026-08-28).
   *
   * A row's height is worked out from the name measured in the face that was
   * *resolved at layout time*, and on a cold load that is the fallback. When
   * the webfont lands, `wireGrid`'s `document.fonts.ready` hook re-measures and
   * lays the rows out again — the site repairs itself, and this test was
   * reading between the two. `await document.fonts.ready` in the page does not
   * order the test after the app's own `.then` on the same promise, let alone
   * after the repaint it schedules.
   *
   * It failed under load on three different commits and named a *different
   * saint each time*, which is the signature: not one row being wrong, but
   * whichever row the two faces disagree about most. The third of this suite's
   * load-sensitive family and the first about text rather than timing.
   *
   * So the window is polled until every row agrees with its own line count. A
   * layout that is genuinely wrong never agrees and the poll still fails; one
   * that is mid-repair is given the frame it needs.
   */
  await expect
    .poll(
      async () =>
        (await read())
          .filter((r) => r.height !== byLines[r.lines] || r.clipped)
          .map((r) => `${r.lines} lines at ${r.height}px: ${r.text}`),
      { timeout: 5000 },
    )
    .toEqual([]);

  const rows = await read();
  expect(rows.length).toBeGreaterThan(5);
  for (const r of rows) {
    // Not one name in the mounted window is cut off, in either sense.
    expect(r.clipped, r.text).toBe(false);
    expect(r.overflow, r.text).toBeLessThanOrEqual(1);
    // And the box is the one its line count calls for — this is the assertion
    // that fails if the collapse is removed and the tallest box comes back.
    expect(r.height, `${r.lines} lines: ${r.text}`).toBe(byLines[r.lines]);
  }
  // The window has to hold both shapes, or the line above proves nothing: a
  // page of one-line names agrees with a single constant of 66 just as well.
  expect(new Set(rows.map((r) => r.height)).size, 'no wrapped row in view').toBeGreaterThan(1);

  /*
   * **The three-line case, by name.** Five saints in the corpus need a third
   * line at 360 px, and the mounted window is ten rows — so this cannot be left
   * to whichever rows the sort deals out. Backing the clamp down to 2 with this
   * absent passed the test, which is the whole reason it is here: the earlier
   * assertions all hold for a page of one- and two-line names.
   *
   * This is also the case that showed "in full" was not yet true when the first
   * answer was called done: at a clamp of 2 this name ends in an ellipsis.
   */
  /* The Calendar facet opens on the reader's own church and this saint is
     Romanian, so it comes off first — the claim is about the corpus, not about
     what one calendar happens to keep. */
  await page.evaluate(() => {
    for (const box of document.querySelectorAll('input[name="churches"]:checked')) {
      box.checked = false;
      box.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.locator('[data-query]').fill('Macarius the New');
  const long = page.locator('.index-card.is-row', { hasText: 'Macarius the New' }).first();
  await expect(long).toBeVisible();
  /*
   * **The column is narrowed until this name takes three lines, rather than
   * three being written down** (2026-08-27, after CI). "This name needs a
   * third line at 360 px" is true in Literata and false on a runner that never
   * got Literata: `font-display: optional` gives the webfont a few frames and
   * then keeps the fallback for the life of the page, and the fallback serif on
   * a bare ubuntu box is narrower — so the name fitted two lines and the pin
   * that was there to catch a cropped name reported one itself. The rendered
   * page stayed correct throughout, because grid.js measures whatever face was
   * actually resolved; only the number in the test was a fact about this desk.
   *
   * Which face the machine has now decides *how narrow* the column must be,
   * not whether the case exists. The browser is the oracle at every step: set a
   * width, let the grid repaint, read the line count back off the DOM.
   */
  const threeLines = await (async () => {
    const full = await page.locator('[data-grid-inner], .grid').first().evaluate((g) => g.clientWidth);
    // Widest first: on a desk with Literata the name already needs three at the
    // phone's own column and the first pass takes it. A narrower face is walked
    // down until it does, and a width that pushes it past three is not an
    // answer — a fourth line is the clamp's ellipsis, which is the failure this
    // is here to catch, not the case it is looking for.
    for (const share of [1, 0.9, 0.8, 0.72, 0.65, 0.6, 0.55, 0.5, 0.45]) {
      const width = Math.round(full * share);
      await page.addStyleTag({
        content: `.grid, [data-grid-inner] { max-width: ${width}px !important; }`,
      });
      // A repaint the grid owns: the search re-runs and rowHeights() measures
      // the new column in the face this machine actually resolved.
      await page.locator('[data-query]').fill('Macarius the Ne');
      await page.locator('[data-query]').fill('Macarius the New');
      await expect(long).toBeVisible();
      const row = (await read()).find((r) => r.text.includes('Macarius the New'));
      if (row?.lines === 3 && !row.clipped) return { ...row, width };
    }
    return null;
  })();
  expect(threeLines, 'no column width made this name take three lines').toBeTruthy();
  // Three lines are given the three-line box, whole: this is what a clamp of
  // two turns into an ellipsis, and why the clamp and ROW_NAME_LINES_MAX are
  // one decision in two files.
  expect(threeLines.height, threeLines.text).toBe(104);
  expect(threeLines.clipped, threeLines.text).toBe(false);
  expect(threeLines.overflow, threeLines.text).toBeLessThanOrEqual(1);
  await page.locator('[data-query]').fill('');

  /*
   * And at a desk nothing wraps, so nothing pays for a second line. This is
   * the whole of what the collapse bought: the corpus's longest name fits the
   * 72ch column on one line, and before this every row here was 83 px.
   *
   * A fresh context rather than a resize and a reload — the layout is a stored
   * setting written through IndexedDB, and a test that reloads is testing that
   * write's timing as much as anything it means to.
   */
  const wideCtx = await page.context().browser().newContext({ viewport: { width: 1280, height: 900 } });
  const widePage = await wideCtx.newPage();
  /*
   * **The rehearsal has to be carried across by hand** (2026-08-28). The
   * COLD_FACE fixture decorates the injected `page`, and this context is opened
   * by the test, so under `COLD_FACE=1` everything above ran in the forced face
   * and this block — which is a text measurement, and the only one here about
   * the desktop column — ran in whatever this desk resolved: measured, Times
   * New Roman with Literata refused above, Literata at the warm 678 px column
   * below. A rehearsal that exempts a block silently is the failure mode
   * fixtures.js's own header warns about, because it is green either way.
   */
  await coldFace(widePage);
  await widePage.addInitScript(() => {
    localStorage.setItem(
      'gos-settings',
      JSON.stringify({ church: 'russian', language: 'en', indexMode: 'search', indexLayout: 'rows' }),
    );
  });
  await widePage.goto(INDEX, { waitUntil: 'networkidle' });
  await widePage.evaluate(() => document.fonts.ready);
  await expect(widePage.locator('.index-card.is-row').first()).toBeVisible();
  /*
   * And it says so. Backing the call above out leaves every assertion in this
   * block green, because Literata is the face the numbers were written in — so
   * the only thing that tells the rehearsal from a page that quietly refused it
   * is asking the page. Only sayable under COLD_FACE: in the ordinary gate the
   * webfont is meant to arrive, and asserting that it did would be an assertion
   * about `font-display: optional`'s window rather than about this test.
   */
  if (COLD) {
    expect(
      await widePage.evaluate(() => document.fonts.check('1em Literata')),
      'the cold-face rehearsal did not reach the context this test opened itself',
    ).toBe(false);
  }
  const wide = await read(widePage);
  expect(wide.length).toBeGreaterThan(5);
  for (const r of wide) {
    expect(r.clipped, r.text).toBe(false);
    expect(r.height, r.text).toBe(66);
  }
  await wideCtx.close();
});


test('a card carries no mark, and its text sits as close as a row does', async ({ page }) => {
  /*
   * Author, 2026-08-28: "Remove the bookmark from the normal Cards in the All
   * Saints view", and "Make the card view cards match the row view cards in
   * terms of margins between name, subtext and frame."
   *
   * The row lost its mark the day before; the card kept it, along with the
   * 40 px an imageless card's name and dates reserved for it. Both are gone,
   * and the gap between the name and the dates is the row's 2 px rather than
   * the card's 6 — the padding was already the same on both.
   */
  await searchMode(page);
  await ready(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await chooseView(page, 'cards');
  await expect(page.locator('.index-card').first()).toBeVisible();
  await expect(page.locator('.index-card .bookmark')).toHaveCount(0);

  const gaps = await page.evaluate(() => {
    const card = document.querySelector('.index-card:not(.is-row)');
    const name = card.querySelector('.name-line').getBoundingClientRect();
    const dates = card.querySelector('.index-dates').getBoundingClientRect();
    const box = card.getBoundingClientRect();
    const style = getComputedStyle(card);
    return {
      nameToDates: Math.round(dates.top - name.bottom),
      // Nothing is held clear for a mark that is not there.
      nameInset: Math.round(box.right - name.right - parseFloat(style.paddingRight)),
    };
  });
  expect(gaps.nameToDates, 'the card keeps the row 2 px between name and dates').toBeLessThanOrEqual(3);
  expect(gaps.nameInset, 'the name still reserves the mark footprint').toBeLessThan(8);
});

/* ---- Session 6's three survivors (2026-08-29) --------------------------- */


test('a card prints the whole name, however many lines it takes, and a row still does not', async ({ page }) => {
  /*
   * Author, 2026-09-01: "Make sure all the CARD view cards, NOT row view cards,
   * display the full name and don't do any '...' at the end."
   *
   * Two lines were the card's budget, and a card's column is 190 px at its
   * narrowest against a row's whole width — so a third of the corpus was cut in
   * a card that a row printed whole. The clamp is gone from the card and stays
   * on the row, which is the "NOT row view cards" half and is worth pinning
   * because one rule serves both.
   *
   * The bound that remains is `CARD_NAME_LINES_MAX` (views/index/grid.js): the
   * grid is virtualised, so a card's height is decided before the card exists
   * and a name that overran it would be drawn over its neighbour rather than
   * merely cut. That is what the overflow half of this measures.
   */
  await searchMode(page);
  await ready(page);
  // Narrow enough for three columns of about the grid's minimum, which is where
  // names wrap hardest and where the corpus was measured.
  await page.setViewportSize({ width: 820, height: 900 });
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.index-card').first()).toBeVisible();

  // The longest name the site prints: five lines in a card's column.
  await page.locator('[data-query]').fill('Theodulus');
  const long = page.locator('.index-card:not(.is-row)').filter({ hasText: 'executioner converted by Hermione' }).first();
  await expect(long).toBeVisible();

  const m = await long.evaluate((card) => {
    const name = card.querySelector('.index-name');
    const cs = getComputedStyle(name);
    return {
      text: name.textContent.trim(),
      lines: Math.round(name.getBoundingClientRect().height / parseFloat(cs.lineHeight)),
      clipped: name.scrollHeight - name.clientHeight,
      clamp: cs.webkitLineClamp,
      // Nothing in the card reaches past the box the virtualiser reserved.
      overflow: card.lastElementChild.getBoundingClientRect().bottom - card.getBoundingClientRect().bottom,
    };
  });
  expect(m.text, 'the name was shortened').toContain('executioner converted by Hermione');
  expect(m.lines, 'the card still stops at two lines').toBeGreaterThan(2);
  /*
   * Three, not one: with no clamp the box is `overflow: visible`, so
   * `scrollHeight` is the union of the line boxes and rounds up against a
   * `clientHeight` that rounds down — two pixels of that on a five-line name is
   * arithmetic, not a cut. Anything a reader could see is a whole line, 21 px.
   */
  expect(m.clipped, 'the name is cut inside its box').toBeLessThan(3);
  expect(m.clamp, 'the card still clamps its name').toMatch(/none/);
  expect(m.overflow, 'the name overran the box the grid reserved for it').toBeLessThan(2);

  /*
   * And no card anywhere in the corpus overruns, which is the claim that makes
   * the cap a measurement rather than a hope. Scrolled rather than sampled: the
   * grid is virtualised, so only what is near the viewport exists.
   */
  await page.locator('[data-query]').fill('');
  const problems = await page.evaluate(async () => {
    const bad = [];
    for (let y = 0; y < 14000; y += 700) {
      window.scrollTo(0, y);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      for (const card of document.querySelectorAll('.index-card:not(.is-row)')) {
        const name = card.querySelector('.index-name');
        if (!name) continue;
        if (name.scrollHeight - name.clientHeight > 3) bad.push(`cut: ${name.textContent.trim()}`);
        const over = card.lastElementChild.getBoundingClientRect().bottom - card.getBoundingClientRect().bottom;
        if (over > 1) bad.push(`over by ${Math.round(over)}: ${name.textContent.trim()}`);
      }
    }
    return bad.slice(0, 5);
  });
  expect(problems, 'a card cut or overran its name').toEqual([]);

  // The row keeps its own clamp: this was scoped to cards, in those words.
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await expect(page.locator('.index-card.is-row').first()).toBeVisible();
  const rowClamp = await page
    .locator('.index-card.is-row .index-name')
    .first()
    .evaluate((el) => getComputedStyle(el).webkitLineClamp);
  expect(rowClamp, 'the row lost its clamp too').toBe('3');
});

/* ---- the round of 2026-09-02, late -------------------------------------- */


test('an index card and a carousel column crop to the hero own limits', async ({ page }) => {
  /*
   * Author, 2026-09-02: "apply the same aspect ratio limitations to crop any
   * saint card display (on daily page and on all saints page) in the same way
   * it applies to the main saint card on Daily page desktop."
   *
   * Pulcheria's icon is 3.1:1 - the tallest of the 130 - and drew a card three
   * times the height of the ones beside it. The packer reads the same clamped
   * shape the box is drawn at, which is the half that keeps the carousel's
   * columns honest: budgeting one shape while the browser draws another is the
   * defect the caption height taught this file on 2026-09-02 already.
   */
  await searchMode(page);
  await ready(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  await page.locator('[data-query]').fill('Pulcheria');
  /*
   * Pinned by name, not read off the first card: the grid is virtualised, so
   * DOM order is not screen order and the first `.index-card` in the document
   * is whichever one the mounted window happens to start with (CLAUDE.md traps
   * 1 and 5). Found this the honest way - the premise below failed.
   */
  const media = page
    .locator('.index-card:not(.is-row)')
    .filter({ hasText: 'Pulcheria' })
    .first()
    .locator('.index-media');
  await expect(media).toBeVisible();
  const card = await media.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const img = el.querySelector('img');
    return {
      drawn: r.height / r.width,
      file: Number(img.getAttribute('height')) / Number(img.getAttribute('width')),
      fit: getComputedStyle(img).objectFit,
      pos: getComputedStyle(img).objectPosition,
    };
  });
  expect(card.file, 'premise: this saint no longer has the tall icon').toBeGreaterThan(2);
  expect(card.drawn, 'the card was not clamped to 1:1.6').toBeLessThan(1.62);
  expect(card.fit).toBe('cover');
  // Cropped from the top, where a standing figure keeps their face.
  expect(card.pos, 'a tall icon is not cropped from the top').toMatch(/^50% 0/);

  // And the carousel, whose packer has to agree with what is drawn.
  await carouselMode(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await expect(page.locator('.cx-card').first()).toBeVisible();
  const row = await page.evaluate(() =>
    [...document.querySelectorAll('.cx-media')]
      .filter((m) => m.querySelector('img'))
      .map((m) => {
        const r = m.getBoundingClientRect();
        const img = m.querySelector('img');
        return {
          drawn: r.height / r.width,
          file: Number(img.getAttribute('height')) / Number(img.getAttribute('width')),
        };
      })
      .filter((x) => x.drawn > 0),
  );
  expect(row.length, 'premise: no pictured columns in the row').toBeGreaterThan(10);
  for (const c of row) {
    expect(c.drawn, 'a carousel picture is taller than 1:1.6').toBeLessThan(1.62);
  }
  expect(row.some((c) => c.file > 1.62), 'premise: nothing in the row needed cropping').toBe(true);
});
