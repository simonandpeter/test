import { test, expect, devices } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

/**
 * The brief's §13 quality floor, as an executable gate. Every item here is
 * non-negotiable and is meant to fail the build when it regresses.
 *
 * A day with commemorations and a day without are both checked everywhere,
 * because the empty state is a designed state (DESIGN.md §5b) and is exactly
 * the kind of thing that rots unnoticed while the populated path stays fine.
 */

// 30 January 2026: Anthony the Great in the Russian calendar — 17 January by
// the Julian reckoning, which the New Calendar churches keep on the civil 17th:
// one menologion date, two civil days, the most load-bearing date in the corpus.
const POPULATED = '/calendar/2026-01-30';
const EMPTY = '/calendar/2026-08-20';

// Anthony carries an image, all three churches' attestations, name forms in
// Greek and Coptic, related saints and a life; Christopher is the awkward one —
// legendary, undated at birth, no image, no coordinates — so between them the
// detail page's states are covered rather than sampled.
const DETAIL = '/saints/anthony-the-great';
const SPARSE_DETAIL = '/saints/christopher';

const ROUTES = [
  ['calendar, populated', POPULATED],
  ['calendar, empty day', EMPTY],
  ['saint detail', DETAIL],
  ['saint detail, sparse', SPARSE_DETAIL],
  ['all saints', '/saints'],
  ['map', '/map'],
  ['about', '/about'],
];

for (const [label, path] of ROUTES) {
  test(`no axe violations: ${label}`, async ({ page }) => {
    await ready(page);
    await page.goto(path, { waitUntil: 'networkidle' });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations.map((v) => v.id))).toEqual([]);
  });

  test(`no horizontal overflow: ${label}`, async ({ page }) => {
    await ready(page);
    await page.goto(path, { waitUntil: 'networkidle' });
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });
}

test('no console errors on load', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    // The SPA deep-link fallback makes GitHub Pages return a 404 status whose
    // body is the app shell; the resulting resource error is inherent to the
    // technique and is not a fault.
    if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text());
  });
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  expect(errors).toEqual([]);
});

test('every interactive element takes visible keyboard focus', async ({ page }) => {
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      return { tag: el.tagName, outline: s.outlineStyle, width: s.outlineWidth };
    });
    if (!focused) continue;
    expect(focused.outline, `${focused.tag} has no focus outline`).not.toBe('none');
  }
});

test('the heading takes focus on navigation but not on arrival', async ({ page }) => {
  // Moving focus to the new h1 is how a single-page app tells a screen reader
  // the page changed. On the first page of a visit there is no change to
  // announce, and Chrome scores a programmatic focus with no interaction
  // behind it as keyboard-driven — which put a focus ring around the heading
  // of every freshly loaded page until the reader clicked it away.
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('H1');

  await page.locator('.site-nav a[href$="/saints"]').click();
  await expect(page.locator('h1')).toHaveText('All Saints');
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.tagName))
    .toBe('H1');
});

test('the day is reachable by keyboard through the week strip', async ({ page }) => {
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const before = await page.locator('h1').first().textContent();
  await page.locator('.week-strip button').first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('h1').first()).not.toHaveText(before ?? '');
});

test('reduced motion removes animation rather than shortening it', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const animated = await page.evaluate(() =>
    [...document.querySelectorAll('*')].some((el) => {
      const s = getComputedStyle(el);
      const dur = (v) => v.split(',').some((d) => parseFloat(d) > 0);
      return dur(s.animationDuration) || dur(s.transitionDuration);
    }),
  );
  expect(animated, 'something still animates under prefers-reduced-motion').toBe(false);
  await ctx.close();
});

test('a populated day renders the hero, and each tradition in its own reckoning', async ({ page }) => {
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await expect(page.locator('.hero-name')).toHaveText('St. Anthony the Great');
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
  await expect(page.locator('.hero-name')).toHaveText('St. Anthony the Great');
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

test('the hero image box is a square, cropped from the centre and the top', async ({ page }) => {
  // The box is reserved before the image decodes either way — a square is as
  // structural a guarantee against layout shift as a measured ratio was — but
  // on the habit page every day's saint now sits in the same box (author,
  // 2026-08-21). Anthony's icon is 369x501, so this is a real crop and not a
  // ratio that happened to be square already.
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const img = page.locator('.hero-media img');
  await expect(img).toBeVisible();
  const box = await img.boundingBox();
  expect(Math.abs(box.width / box.height - 1)).toBeLessThan(0.02);

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

/* ---- Session 4a: the detail page, the store, prefetch ------------------- */

test('a saint opens with its own names, citations and life', async ({ page }) => {
  await page.goto(DETAIL, { waitUntil: 'networkidle' });

  await expect(page.locator('h1.saint-name')).toHaveText('St. Anthony the Great');
  // The "Also called" block — the multi-script name forms (Ἀντώνιος,
  // Ⲁⲛⲧⲱⲛⲓⲟⲥ) that used to stand here — was removed by the author,
  // 2026-08-24, reversing the "attest, never adjudicate" passage in
  // DESIGN.md that named this exact block; the reversal is recorded in
  // place there. The heir of this test's old assertion is negative: the
  // block is gone from the page entirely, not merely relabelled.
  await expect(page.locator('.names')).toHaveCount(0);

  // Every church in the registry appears, each with its own source and its
  // own reckoning of the one menologion date.
  await expect(page.locator('.attestations .att')).toHaveCount(4);
  for (const church of ['Russian', 'Romanian', 'Greek', 'Serbian']) {
    await expect(page.locator('.attestations .att-church', { hasText: church })).toHaveCount(1);
  }
  await expect(page.locator('.attestations')).toContainText('Basilica');
  await expect(page.locator('.attestations')).toContainText('17 January (Julian)');
  // The civil date it falls on, once: the year is in the date and was being said
  // twice ("30 January 2026 in 2026") until 2026-08-22.
  await expect(page.locator('.attestations')).toContainText('which falls on 30 January 2026');
  await expect(page.locator('.attestations')).not.toContainText('2026 in 2026');
  await expect(page.locator('.attestations')).toContainText('17 January (Revised Julian)');

  await expect(page.locator('.life p').first()).toContainText('Born to a prosperous Coptic family');
  await expect(page.locator('.life a[data-prefetch="athanasius-of-alexandria"]')).toHaveCount(1);
  await expect(page.locator('.register a[data-prefetch="paul-of-thebes"]')).toHaveCount(1);
});

test('an image says what its licence is, and never links a placeholder source', async ({ page }) => {
  await page.goto(DETAIL, { waitUntil: 'networkidle' });
  const credit = page.locator('.image-credit');

  // Public domain: no credit is owed, so the line names the licence rather
  // than apologising for a missing author.
  await expect(credit).toHaveText('Public Domain Mark 1.0');
  // The source_url in the corpus is a stand-in until the real ones are
  // recorded, and a reader must not be handed it as if it led somewhere.
  await expect(credit.locator('a')).toHaveCount(0);
});

test('dates and places read as one register, keyed by kind', async ({ page }) => {
  // The date-interval bars stood here until 2026-08-21. What a reader needed
  // from them was the years, and the years were already printed beside them;
  // what they could not get was where. DESIGN.md §6b keeps the curve for the
  // map and the timeline and records that the bars, not it, were withdrawn.
  await page.goto(DETAIL, { waitUntil: 'networkidle' });
  await expect(page.locator('.date-bar')).toHaveCount(0);
  await expect(page.locator('.date-facts')).toHaveCount(1);

  const rows = page.locator('.fact-row');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('Born');
  await expect(rows.nth(0)).toContainText('c. 251');
  // The place names are not in the manifest, so this text only exists once the
  // saint's own file has landed on top of the reserved box.
  // An ordinary hyphen since 2026-08-25 evening ("replace all emm dashes
  // with normal dashes"), across every string the site prints. The corpus's
  // own transcribed prose keeps its em dashes: those are quotations.
  await expect(rows.nth(0)).toContainText('Coma - Qiman al-Arus, Egypt');
  await expect(rows.nth(1)).toContainText('Died');
  await expect(rows.nth(1)).toContainText('356');
  await expect(rows.nth(1)).toContainText('Mount Colzim');
});

test('a place keeps the note that says how far it is really fixed', async ({ page }) => {
  // "Died during the Vandal siege of the city" is the finding that goes with
  // the coordinate. A coordinate without it looks certain, which is the one
  // thing this corpus must never do. (Nestorius carried the first such note;
  // he is in the archive now.)
  await page.goto('/saints/augustine-of-hippo', { waitUntil: 'networkidle' });
  await expect(page.locator('.fact-note')).toContainText('Vandal siege');
});

test('a saint with no life, no image and no birth date is still a whole page', async ({ page }) => {
  await page.goto(SPARSE_DETAIL, { waitUntil: 'networkidle' });
  await expect(page.locator('h1.saint-name')).toHaveText('St. Christopher');
  await expect(page.locator('.saint-media')).toHaveCount(0);
  // Removed from the General Roman Calendar in 1969 and still venerated: the
  // page must not turn that into a refusal.
  await expect(page.locator('.att').first()).toContainText('Venerated');
  // Undated at birth and dated at death: the register prints the row it has
  // and does not invent the one it does not.
  await expect(page.locator('.fact-row')).toHaveCount(1);
  await expect(page.locator('.fact-row')).toContainText('Died');
});

test('an address with no saint behind it is prose, not a red banner', async ({ page }) => {
  await page.goto('/saints/no-such-person', { waitUntil: 'networkidle' });
  await expect(page.locator('h1')).toHaveText('No such saint');
  const colours = await page.locator('.error-note p').first().evaluate((el) => getComputedStyle(el).color);
  const rubric = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--rubric').trim(),
  );
  expect(colours.replace(/\s/g, '')).not.toBe(rubric);
});

test('saving persists across a reload, and both bookmarks agree', async ({ page }) => {
  // The saint's page and the calendar hero both carry the bookmark (author,
  // 2026-08-23; the hero's text Save button is gone). Same store, one state.
  await ready(page);
  await page.goto(DETAIL, { waitUntil: 'networkidle' });
  const save = page.locator('.saint-head .bookmark');
  await expect(save).toHaveAttribute('aria-pressed', 'false');
  await save.click();
  await expect(save).toHaveAttribute('aria-pressed', 'true');
  await expect(save).toHaveAttribute('aria-label', /is saved/);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('.saint-head .bookmark')).toHaveAttribute('aria-pressed', 'true');

  // And the saved shelf on the habit page knows about it, as does the hero's
  // own bookmark — Anthony is that day's hero.
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await expect(page.locator('.hero .bookmark')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.shelves')).toContainText('Saved');
  await expect(page.locator('.shelves a[data-prefetch="anthony-the-great"]').first()).toBeVisible();
});

test('Continue reading reappears after a saint has been opened', async ({ page }) => {
  await ready(page);
  await page.goto('/saints/moses-the-hungarian', { waitUntil: 'networkidle' });
  await page.goto(EMPTY, { waitUntil: 'networkidle' });

  const shelf = page.locator('.shelves');
  await expect(shelf).toContainText('Continue reading');
  await expect(shelf.locator('a[data-prefetch="moses-the-hungarian"]')).toHaveCount(1);

  // The shelf wears the Index's own row dress (author, 2026-08-24): the same
  // card classes, so the two read as one register — the bookmark alone at the
  // trailing edge, centred on the row's height, above the link's ::after so a
  // press saves rather than opens. The × that stood over it went the same
  // evening; the row is swiped away instead, which has its own test below.
  const shelfRow = shelf.locator('.index-card.is-row.shelf-row').first();
  await expect(shelfRow).toBeVisible();
  await expect(shelfRow.locator('.index-name')).toContainText('Moses the Hungarian');
  await expect(shelfRow.locator('.bookmark')).toHaveCount(1);
  /*
   * The × came back on 2026-08-25, *on the desktop only* and to the right of
   * the bookmark: a mouse has the swipe too, but a visible control is the
   * faster hand where there is a cursor to aim it. It is the same button
   * either way — always in the markup, carrying the whole sentence as its
   * accessible name, let out of its clip by `(hover: hover) and (pointer:
   * fine)`.
   *
   * Both of this suite's projects are Desktop Chrome — mobile-360 is a narrow
   * viewport, not a touch device (playwright.config.js) — so both take the
   * hovering branch here, and the query is read at runtime rather than
   * assumed from the project's name. The touch half has a test of its own
   * below, on a real touch device, because a branch asserted only where it
   * cannot run is not asserted at all.
   */
  const placed = await shelfRow.evaluate((row) => {
    const mark = row.querySelector('.shelf-tools .bookmark').getBoundingClientRect();
    const card = row.getBoundingClientRect();
    const quiet = row.querySelector('.shelf-remove');
    const q = quiet.getBoundingClientRect();
    return {
      mark,
      card,
      quietWidth: q.width,
      quietRight: q.right,
      quietMid: q.top + q.height / 2,
      quietText: quiet.textContent.trim(),
      glyph: getComputedStyle(quiet, '::after').content,
      hovers: matchMedia('(hover: hover) and (pointer: fine)').matches,
    };
  });
  // The accessible name is the whole action in both worlds: out of the row's
  // context an "×" says nothing.
  expect(placed.quietText).toBe('Remove Moses the Hungarian from Continue reading');
  const cardMid = placed.card.top + placed.card.height / 2;
  const markMid = placed.mark.top + placed.mark.height / 2;
  expect(Math.abs(markMid - cardMid)).toBeLessThan(2);
  if (placed.hovers) {
    // Visible, an ×, beside the bookmark and after it, centred on the row.
    expect(placed.quietWidth).toBeGreaterThan(8);
    expect(placed.glyph).toContain('×');
    expect(placed.quietRight).toBeGreaterThan(placed.mark.right);
    expect(Math.abs(placed.quietMid - cardMid)).toBeLessThan(2);
    expect(placed.card.right - placed.quietRight).toBeLessThan(20);
  } else {
    // Not reached by either project today; kept so this test still says the
    // truth if one ever runs on a touch device. The touch case is asserted
    // properly below.
    expect(placed.quietWidth).toBeLessThan(3);
    expect(placed.card.right - placed.mark.right).toBeLessThan(20);
  }

  // And it can still be dismissed without a gesture: a shelf the reader
  // cannot clear is a nag, and a shelf only a swipe can clear strands
  // everyone who cannot swipe (DESIGN.md §5b). Focus reveals the control.
  await shelf.locator('.shelf-remove').first().focus();
  await expect(shelf.locator('.shelf-remove').first()).toBeVisible();
  await shelf.locator('.shelf-remove').first().click();
  await expect(shelf).not.toContainText('Continue reading');
});

test('a Continue reading row is swiped away, and a short push springs back', async ({ page }) => {
  /*
   * Author, 2026-08-24: the × goes and "if you swipe across on them they get
   * removed". Pointer events, so the mouse does it too — the same reversal
   * the week rail made when it took the desktop drag.
   *
   * The spring-back half is the one worth pinning hardest: a row that
   * vanished on any push at all would make the shelf unscrollable by touch,
   * and a row that never moved would read as a dead press. So: a short push
   * leaves the row exactly where it was and still on the shelf, and a long
   * one takes it off.
   */
  await ready(page);
  await page.goto('/saints/moses-the-hungarian', { waitUntil: 'networkidle' });
  await page.goto('/saints/anthony-the-great', { waitUntil: 'networkidle' });
  await page.goto(EMPTY, { waitUntil: 'networkidle' });

  const rows = page.locator('.shelf-row');
  await expect(rows).toHaveCount(2);
  // The push starts on the saint's *name*, which is where a reader's finger
  // or cursor lands and — as the first rendering of this gesture showed — the
  // one place it can be stolen: a row is a link with a picture in it, and
  // dragging a link starts a native drag that cancels the pointer stream.
  // Pushing from the thumbnail instead would pass with that defect present.
  const push = async (distance) => {
    const name = rows.first().locator('.index-name');
    const box = await name.boundingBox();
    const y = box.y + box.height / 2;
    const x = box.x + box.width / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 8; i += 1) await page.mouse.move(x + (distance * i) / 8, y);
    await page.mouse.up();
  };

  await push(70);
  // A real wait, and it has to be: a removal is a 200 ms flight and only then
  // a repaint, so asserting the count straight after the push passes while
  // the row is still on screen on its way out. (Caught by backing the
  // threshold out to zero and watching this test pass regardless.) Past the
  // flight, a row that was going is gone and a row that sprang back is home.
  await page.waitForTimeout(500);
  await expect(rows).toHaveCount(2);
  // Home again, not left hanging where the hand let go.
  expect(await rows.first().evaluate((r) => r.style.transform || 'none')).toBe('none');
  await expect(page).toHaveURL(/\/calendar\//); // the swipe did not open the saint

  await push(420);
  await expect(rows).toHaveCount(1);
  await expect(page.locator('.shelves')).toContainText('Continue reading');
});

test('on a touch device the shelf row carries no ×, and the swipe still clears it', async ({ browser }) => {
  /*
   * The other half of 2026-08-25's instruction: the × came back "on desktop
   * only". A phone keeps the swipe alone, because a control sized for a
   * fingertip beside a bookmark on a 48 px row is how a reader clears a shelf
   * they meant to scroll past.
   *
   * This needs a real touch device — both of the suite's own projects are
   * Desktop Chrome, one of them merely narrow, and both report a fine
   * hovering pointer — so the media query that hides the × never fires there.
   */
  const ctx = await browser.newContext({ ...devices['Pixel 5'] });
  const page = await ctx.newPage();
  await ready(page);
  await page.goto('/saints/moses-the-hungarian', { waitUntil: 'networkidle' });
  await page.goto(EMPTY, { waitUntil: 'networkidle' });

  const row = page.locator('.shelf-row').first();
  await expect(row).toBeVisible();
  const seen = await row.evaluate((r) => {
    const quiet = r.querySelector('.shelf-remove');
    return {
      hovers: matchMedia('(hover: hover) and (pointer: fine)').matches,
      width: quiet.getBoundingClientRect().width,
      name: quiet.textContent.trim(),
    };
  });
  expect(seen.hovers).toBe(false);
  expect(seen.width).toBeLessThan(3);
  // Still named in full for the screen reader that meets it.
  expect(seen.name).toBe('Remove Moses the Hungarian from Continue reading');

  // And the gesture that replaced it works with a finger.
  const name = row.locator('.index-name');
  const box = await name.boundingBox();
  const y = box.y + box.height / 2;
  const x = box.x + box.width / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i += 1) await page.mouse.move(x + (300 * i) / 8, y);
  await page.mouse.up();
  await expect(page.locator('.shelf-row')).toHaveCount(0);
  await ctx.close();
});

test('under reduced motion a swiped row goes without flying', async ({ browser }) => {
  // Removed, not shortened: the travel is an animation and goes; the row is
  // still cleared, and nothing is left mid-flight.
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await ready(page);
  await page.goto('/saints/moses-the-hungarian', { waitUntil: 'networkidle' });
  await page.goto(EMPTY, { waitUntil: 'networkidle' });
  const row = page.locator('.shelf-row').first();
  const name = row.locator('.index-name');
  const box = await name.boundingBox();
  const y = box.y + box.height / 2;
  const x = box.x + box.width / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i += 1) await page.mouse.move(x + (420 * i) / 8, y);
  await page.mouse.up();
  await expect(page.locator('.shelf-row')).toHaveCount(0);
  await expect(page.locator('.shelves')).not.toContainText('Continue reading');
  await ctx.close();
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
  await expect(page.locator('h1.saint-name')).toHaveText('St. Anthony the Great');
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
  await expect(page.locator('h1.saint-name')).toHaveText('St. Anthony the Great');
  const onDetail = await names();
  expect(onDetail).toContain('s-anthony-the-great-name');
  expect(new Set(onDetail).size).toBe(onDetail.length);
});

test('without a pointer to hover with, prefetch follows the viewport', async ({ browser }) => {
  // The mobile branch of the prefetch budget has no hover to trigger it, so it
  // is the half that can rot unnoticed while the desktop half keeps passing.
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
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

/* ---- Session 5: All Saints, Index mode --------------------------------- */

const INDEX = '/saints';

/** Facet groups are disclosures; a reader opens one before using it. */
const facet = async (page, name) => {
  const group = page.locator(`[data-facet="${name}"]`);
  if (!(await group.evaluate((el) => el.open))) await group.locator('summary').click();
  return group;
};

test('the index opens on the whole corpus, unfiltered and unranked', async ({ page }) => {
  await page.goto(INDEX, { waitUntil: 'networkidle' });

  await expect(page.locator('[data-count]')).toHaveText('708');
  await expect(page.locator('.index-card').first()).toBeVisible();
  // Unranked is the load-bearing word. Breadth of veneration was offered and
  // never defaulted to, because a corpus sorted by it reads as a ranking of
  // importance; Earliest took the default from Name on 2026-08-24 (author) and
  // is the same kind of order as either — a fact about the lives, not a claim
  // about their standing. Random is the default since the same evening
  // (author: "so each time you open the site you get exposed to more
  // saints"); this test's subject is the unfiltered *set*, not the order, so
  // it chooses Earliest explicitly rather than asserting on a shuffled deal.
  await page.selectOption('[data-sort]', 'earliest');
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

test('filtering by church narrows the corpus and the count follows', async ({ page }) => {
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await (await facet(page, 'churches')).getByLabel('Romanian').check();

  await expect(page.locator('[data-count]')).toHaveText('122');
  // The count is the corpus's answer; the DOM holds only the cards near the
  // viewport, which at 360 px is far fewer than a hundred and twenty-two.
  await expect(page.locator('.index-card:not(.leaving)').first()).toBeVisible();
  await expect(page.locator('[data-clear]')).toBeVisible();

  await page.locator('[data-clear]').click();
  await expect(page.locator('[data-count]')).toHaveText('708');
});

test('Overlaps and Entirely within are different questions, and both are offered', async ({ page }) => {
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await facet(page, 'dates');
  await page.locator('[data-from]').fill('240');
  await page.locator('[data-to]').fill('460');

  // A hundred and sixty lives touch 240–460 and a hundred and forty-eight sit
  // inside it: the Roman martyrs of 258, the Nicomedians of 305 and the
  // martyrs of the Great Persecution are inside; Paul of Thebes (born 220),
  // the third- and fourth-century bishops dated only to their century and
  // Moses the Hungarian with his open birth bound overlap it without being
  // contained. Both counts rose by two on 2026-08-25, when nine saints whose
  // *lives* stated a death year the data had never recorded were given it —
  // Hosius of Córdoba (359) and Poemen the Great (450) fall in this range.
  await expect(page.locator('[data-count]')).toHaveText('160');
  await page.locator('input[name="rangeMode"][value="within"]').check();
  await expect(page.locator('[data-count]')).toHaveText('148');
});

test('a range that matches nobody is a designed state, not a hole', async ({ page }) => {
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await facet(page, 'dates');
  await page.locator('[data-from]').fill('1320');
  await page.locator('[data-to]').fill('1330');

  // Nobody in the corpus has a dated life touching 1320–1330 (the 17th century
  // that served here until Amendment 31 now has Athanasius of Brest, Cyriacus
  // of Tazlău and the rest).
  await expect(page.locator('[data-count]')).toHaveText('0');
  await expect(page.locator('[data-empty]')).toBeVisible();
  await expect(page.locator('.index-card:not(.leaving)')).toHaveCount(0);
  // The calendars' saints often carry no dates — their pages printed none — so
  // the undated tray holds them rather than letting a range pretend to decide
  // about them (it held nobody while every saint in the corpus was dated).
  // 230, not the 239 of the day before: nine of these saints had a death year
  // stated in their own life text that the data had never recorded, and on
  // 2026-08-25 they were given it (Titus the Apostle's 105 among them). The
  // rest are undated because their sources say nothing, which is the finding
  // this tray exists to keep visible.
  await expect(page.locator('.tray')).toContainText('230 undated');
});

test('search reaches names, types, churches and regions', async ({ page }) => {
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  const query = page.locator('[data-query]');

  await query.fill('hermit');
  // The count is the corpus's answer; the DOM holds only what is near the
  // viewport, which at 360 px is a card or two of the eight.
  await expect(page.locator('[data-count]')).toHaveText('8');

  await query.fill('Alexandria');
  await expect(page.locator('.index-card').first()).toBeVisible();

  await query.fill('zzzznotasaint');
  await expect(page.locator('[data-empty]')).toBeVisible();
  await expect(page.locator('[data-count]')).toHaveText('0');

  // Every name is drawn with "St" before it (author, 2026-08-24), so typing
  // back what the screen shows must find the saint: the honorific is dropped
  // from the query, because the index holds the bare name and terms AND.
  await query.fill('St. John Chrysostom');
  await expect(page.locator('.index-card').first()).toContainText('John Chrysostom');
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
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await (await facet(page, 'historicities')).getByLabel('legendary').check();
  await expect(page.locator('.index-card')).toHaveCount(1);
  await expect(page.locator('.index-card.leaving')).toHaveCount(0);
  await ctx.close();
});

test('Random saint stays inside the reader own filters', async ({ page }) => {
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await (await facet(page, 'churches')).getByLabel('Romanian').check();
  await expect(page.locator('[data-count]')).toHaveText('122');

  await page.locator('[data-random]').click();
  await expect(page.locator('h1.saint-name')).toBeVisible();
  // Whoever it landed on, the Romanian row says Venerated: a random saint the
  // reader's own filters exclude would look like the filters had failed.
  // Scoped to .att-church, not .att's full text: a citation or note in
  // another church's row can itself contain the word "Romanian" (a
  // cross-reference in a source note), which made the looser locator match
  // two rows on an unlucky deal — found while adding the "A" key elsewhere in
  // this sitting, unseeded and pre-existing, so tightened here rather than
  // left as a known flake in a suite the house rules call a real gate.
  const romanian = page.locator('.att', { has: page.locator('.att-church', { hasText: 'Romanian' }) });
  await expect(romanian).toContainText('Venerated');
});

test('a card opens its saint, carrying the shared element with it', async ({ page }) => {
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  const first = page.locator('.index-card').first();
  const name = await first.locator('.index-name').textContent();
  await first.locator('.index-name').click();
  await expect(page.locator('h1.saint-name')).toHaveText(name ?? '');
});

test('every control on the index takes visible keyboard focus', async ({ page }) => {
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      return { tag: el.tagName, outline: s.outlineStyle };
    });
    if (!focused) continue;
    expect(focused.outline, `${focused.tag} has no focus outline`).not.toBe('none');
  }
});

test('the grid keeps a window of the corpus in the document, not the corpus', async ({ browser }) => {
  // Ten saints fit on a desktop screen, so virtualisation can only be observed
  // where the grid is taller than the viewport. This is that: one column, a
  // short window, and the last saint in the order well below the fold.
  const ctx = await browser.newContext({ viewport: { width: 360, height: 480 } });
  const page = await ctx.newPage();
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  // Alphabetical, asked for rather than assumed: this test names the saint it
  // expects at the bottom, so it has to name the order that puts them there.
  // It rode the default until 2026-08-24, when Earliest took it and the last
  // card became whichever undated saint sorts last by name instead.
  await page.selectOption('[data-sort]', 'name');

  // 708 saints now; Zoticus of Tomis is last alphabetically and far below
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

test('the feast-month filter reckons each tradition in its own calendar', async ({ page }) => {
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  // Alphabetical, so the named saint is the one the grid actually mounts. The
  // grid is virtualised and at 360 px it holds a single card: under the
  // Earliest order this became Paul of Thebes (227) and the assertion below
  // read as a filter failure when nothing was wrong with the filter. The count
  // is the claim about the corpus; this is the claim about one card, and it
  // has to say which card it means.
  await page.selectOption('[data-sort]', 'name');
  await (await facet(page, 'months')).getByLabel('January').check();

  // Anthony (17 January), Athanasius (18 January) and Paul of Thebes (15
  // January): in the Russian calendar the Julian dates land on the civil 30th,
  // 31st and 28th, in the Romanian and Greek on the days of those names —
  // all still January, arrived at by different arithmetic.
  await expect(page.locator('[data-count]')).toHaveText('3');
  await expect(page.locator('.index-name', { hasText: 'Anthony the Great' })).toHaveCount(1);
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
  await expect(page.locator('.hero-name')).toHaveText('St. Augustine of Hippo');
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

test('the two jump controls hold the left edge and carry names, not glyphs alone', async ({ page }) => {
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const jump = page.locator('.cal-jump button');
  await expect(jump).toHaveCount(2);
  // Icon-only buttons, so the name has to come from somewhere.
  for (const name of await jump.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))) {
    expect(name?.length).toBeGreaterThan(3);
  }
  const [stack, strip] = [
    await page.locator('.cal-jump').boundingBox(),
    await page.locator('.cal-span').boundingBox(),
  ];
  expect(stack.x + stack.width).toBeLessThanOrEqual(strip.x);
  // Stacked, not side by side.
  const boxes = await jump.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().y));
  expect(new Set(boxes.map(Math.round)).size).toBe(2);
});

/**
 * A touch swipe, as the listener sees it. Synthetic pointer events rather than
 * a real gesture: what is under test is the threshold and the direction, not
 * the browser's promise to deliver pointerdown before pointerup.
 */
const swipe = (page, selector, dx, dy = 0) =>
  page.evaluate(
    ([selector, dx, dy]) => {
      const el = document.querySelector(selector);
      const box = el.getBoundingClientRect();
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      const at = (px, py, pointerType) => ({
        pointerId: 1, pointerType, clientX: px, clientY: py, bubbles: true, cancelable: true,
      });
      const kind = dx === 0 ? 'mouse' : 'touch';
      el.dispatchEvent(new PointerEvent('pointerdown', at(x, y, kind)));
      el.dispatchEvent(new PointerEvent('pointerup', at(x + dx, y + dy, kind)));
    },
    [selector, dx, dy],
  );

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

/**
 * The state of a grain the moment its neighbour appears beside it. Sampled from
 * a MutationObserver rather than polled afterwards: a move is 260 ms and a poll
 * racing it would be a flake waiting to be blamed on the machine.
 */
const duringMove = (page, viewport, rowClass, act) =>
  page.evaluate(
    ([viewport, rowClass, act]) =>
      new Promise((resolve) => {
        const vp = document.querySelector(viewport);
        const observer = new MutationObserver(() => {
          const side = vp.querySelector(`.${rowClass}.grain-side`);
          if (!side) return;
          observer.disconnect();
          const live = vp.querySelector(`.${rowClass}:not(.grain-side)`);
          const peeks = (row) =>
            [...row.querySelectorAll('.peek .day-num, .peek-cell')].map((e) =>
              e.firstChild.textContent.trim(),
            );
          resolve({
            rows: vp.querySelectorAll(`.${rowClass}`).length,
            sides: [...vp.querySelectorAll('.grain-side')].map((s) => s.style.left),
            hidden: side.getAttribute('aria-hidden'),
            reachable: [...side.querySelectorAll('button')].filter((b) => b.tabIndex !== -1).length,
            reach: getComputedStyle(side).pointerEvents,
            clipped: vp.classList.contains('is-moving'),
            sidePeeks: peeks(side),
            livePeeks: peeks(live),
          });
        });
        observer.observe(vp, { childList: true, subtree: true, attributes: true });
        document.querySelector(act).click();
      }),
    [viewport, rowClass, act],
  );

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

/**
 * A hold-and-slide, as the listener sees it: pointerdown, a handful of moves,
 * and a release. Synthetic pointer events rather than a real gesture — what is
 * under test is where the grain goes, not the browser's promise to deliver them
 * in order. `fraction` is of the viewport's own width, because the settle
 * threshold is a third of a grain and not a pixel count.
 */
const dragGrain = (page, selector, dx, { release = true } = {}) =>
  page.evaluate(
    ([selector, dx, release]) => {
      const el = document.querySelector(selector);
      const box = el.getBoundingClientRect();
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      const at = (px) => ({
        pointerId: 7, pointerType: 'touch', clientX: px, clientY: y, bubbles: true, cancelable: true,
      });
      el.dispatchEvent(new PointerEvent('pointerdown', at(x)));
      for (const step of [dx / 4, dx / 2, (dx * 3) / 4, dx]) {
        el.dispatchEvent(new PointerEvent('pointermove', at(x + step)));
      }
      if (release) el.dispatchEvent(new PointerEvent('pointerup', at(x + dx)));
    },
    [selector, dx, release],
  );

const releaseGrain = (page, selector, dx) =>
  page.evaluate(
    ([selector, dx]) => {
      const el = document.querySelector(selector);
      const box = el.getBoundingClientRect();
      el.dispatchEvent(
        new PointerEvent('pointerup', {
          pointerId: 7,
          pointerType: 'touch',
          clientX: box.x + box.width / 2 + dx,
          clientY: box.y + box.height / 2,
          bubbles: true,
        }),
      );
    },
    [selector, dx],
  );

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

test('the index spends as little height as it can before the first card', async ({ page }) => {
  // This page is a list and the list is the point. Everything above it earns
  // its pixels or goes (author, 2026-08-21): one-line lede, the search label
  // inside the field, Random beside Sort instead of on a row of its own.
  // One fixed viewport, set before the load: this test is about how far down
  // the page the grid starts, and measuring that after a resize measures a
  // reflow instead.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const query = page.locator('[data-query]');
  await expect(query).toHaveAttribute('placeholder', 'Search: name, type, church, region');
  // A placeholder is not a name — it vanishes the moment anyone types, which
  // is exactly when a screen reader still needs one.
  await expect(query).toHaveAttribute('aria-label', 'Search');
  await expect(page.locator('.index-controls label:has-text("Search")')).toHaveCount(0);

  // Random sits with Sort, tight, and both are above the layout toggle's row.
  const [sort, random] = [
    await page.locator('.sort-group .sort-field').boundingBox(),
    await page.locator('.sort-group [data-random]').boundingBox(),
  ];
  expect(random.x).toBeGreaterThan(sort.x + sort.width - 1);
  expect(random.x - (sort.x + sort.width)).toBeLessThan(16);

  // "The whole corpus, filterable." stood here until 2026-08-25 evening,
  // when the author removed it: the count note under the controls already
  // says how much of the corpus this calendar keeps, and the filters are
  // visibly filters.
  await expect(page.locator('.index-lede')).toHaveCount(0);

  // The two rows this pass collapsed, measured directly. Both are one line
  // high and stay one line high in either face — unlike the grid's position,
  // which moves 31 px between them, because font-display: optional means the
  // facet summaries wrap differently in the fallback and a cold load really
  // does get the fallback.
  const heightOf = async (sel) => Math.round((await page.locator(sel).boundingBox()).height);

  expect(await heightOf('.index-row'), 'the search field has a label above it again').toBeLessThan(40);

  // And the coarse backstop. It has to clear the cold-load column on every
  // platform the suite runs on: 381 on Windows, where the fallback serif sets
  // a 580 px column and the foot still fits in Segoe UI, and 405 on
  // ubuntu-latest, where system-ui is DejaVu Sans and the foot takes two
  // lines at that column (Amendment 24; it was 400, calibrated on Windows
  // alone). Either row wrapping once more is +25 or +30 and fails it, which
  // is the point; the next test pins the foot in Arial's metrics directly.
  // The grid started at 436 before Amendment 13's pass.
  const gridTop = (await page.locator('.grid').boundingBox()).y;
  expect(gridTop, 'the controls have crept back down the page').toBeLessThan(410);
});

test('the index foot holds one line in a wide utility face at the cold-load column', async ({ page }) => {
  // What CI sees and a Windows desk does not. A cold load under
  // font-display: optional keeps the serif fallback, whose "0" makes the 72ch
  // column 580 px where Literata makes it 678; and system-ui is whatever the
  // platform says — Segoe UI on Windows, DejaVu Sans on a bare ubuntu runner —
  // a different width for the same three groups on every machine. At 580 the
  // foot — sort and Random, the layout toggle, Detailed — left 0.1 px of slack
  // in Segoe UI and wrapped in anything wider: 24.8 px more chrome above the
  // first card, the grid at 405 px against a 400 backstop, on the first CI run
  // f9a1308 ever had (2026-08-22). So the webfont is blocked here, which makes
  // the column the cold-load one everywhere; the native foot is measured and
  // printed to the run's log, so the runner says in numbers what its face
  // costs; and then the utility face is forced to Arial — which Windows and
  // macOS ship and fontconfig aliases to Liberation Sans on Linux — so the
  // assertion is one width on every machine: the row has to fit 580 in Arial's
  // metrics. Amendment 24.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.route('**/*.woff2', (route) => route.abort());
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const measureFoot = (el) => {
    const kids = [...el.children].filter((k) => k.offsetParent !== null && !k.classList.contains('sr-only'));
    const gap = parseFloat(getComputedStyle(el).columnGap);
    return {
      height: el.getBoundingClientRect().height,
      column: el.clientWidth,
      need: kids.reduce((a, k) => a + k.getBoundingClientRect().width, 0) + gap * (kids.length - 1),
      widths: kids.map((k) => `${k.className.toString().split(' ')[0]} ${k.getBoundingClientRect().width.toFixed(1)}`),
    };
  };
  const native = await page.locator('.index-foot').evaluate(measureFoot);
  console.log(
    `[index foot, native utility face] column ${native.column} px, needs ${native.need.toFixed(1)}, ` +
      `height ${native.height.toFixed(2)} — ${native.widths.join(', ')}`,
  );

  await page.addStyleTag({ content: ':root { --font-utility: Arial, sans-serif !important; }' });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const foot = await page.locator('.index-foot').evaluate(measureFoot);
  // The budget is the cold-load column whatever column this platform's
  // fallback serif happens to give: the row has to fit 580 in Arial's metrics.
  expect(foot.need, `the foot needs ${foot.need.toFixed(1)} px of a 580 px column`).toBeLessThan(580);
  expect(foot.height, `the foot wrapped at a ${foot.column} px column`).toBeLessThan(40);
  const gridTop = (await page.locator('.grid').boundingBox()).y;
  expect(gridTop, 'the grid moved down the page at the cold-load column').toBeLessThan(400);
});

test('Clear filters appears beside the search bar, never below it', async ({ page }) => {
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const clear = page.locator('[data-clear]');
  await expect(clear).toBeHidden();

  const facetsBefore = (await page.locator('.facets').boundingBox()).y;
  await page.fill('[data-query]', 'john');
  await expect(clear).toBeVisible();

  const search = await page.locator('.search-field').boundingBox();
  const box = await clear.boundingBox();
  expect(Math.round(box.y)).toBeCloseTo(Math.round(search.y), -1);
  expect(box.x).toBeGreaterThanOrEqual(search.x + search.width - 1);
  // The button appears and disappears as filters come and go; if it took a row
  // of its own it would shunt every filter below it down as the reader typed.
  expect((await page.locator('.facets').boundingBox()).y).toBe(facetsBefore);
});

test('the index offers two layouts, and remembers which one the reader chose', async ({ page }) => {
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  const cards = page.locator('.index-card');
  const rows = page.locator('[data-layout="rows"]');

  await expect(page.locator('[data-layout="cards"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(cards.first()).not.toHaveClass(/is-row/);
  const cardHeight = (await cards.first().boundingBox()).height;

  await rows.click();
  await expect(rows).toHaveAttribute('aria-pressed', 'true');
  await expect(cards.first()).toHaveClass(/is-row/);
  const rowHeight = (await cards.first().boundingBox()).height;
  // Tighter: that is the whole point of the second layout.
  expect(rowHeight).toBeLessThan(cardHeight);
  // Every row is the same height, whatever its image — or absence of one.
  const heights = await cards.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
  expect(new Set(heights).size).toBe(1);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('[data-layout="rows"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.index-card').first()).toHaveClass(/is-row/);
});

test('toggling the theme does not move the header, and the toggle is two-way', async ({ page }) => {
  // Two states, one geometry (author, 2026-08-22): the icon is the same box
  // either way, so pressing it moves nothing else on the page, and there is no
  // third, System, state to cycle through.
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const header = page.locator('header.chrome');
  const toggle = page.locator('#theme-toggle');

  const measured = [];
  for (let i = 0; i < 3; i++) {
    measured.push({
      header: Math.round((await header.boundingBox()).height),
      button: Math.round((await toggle.boundingBox()).width),
      label: await toggle.getAttribute('aria-label'),
      dark: await page.evaluate(() => document.documentElement.classList.contains('dark')),
    });
    await toggle.click();
    await page.waitForTimeout(50);
  }
  expect(new Set(measured.map((m) => m.label)).size).toBe(2);
  expect(measured[0].dark).toBe(measured[2].dark);
  expect(measured[1].dark).toBe(!measured[0].dark);
  expect(new Set(measured.map((m) => m.header)).size, JSON.stringify(measured)).toBe(1);
  expect(new Set(measured.map((m) => m.button)).size, JSON.stringify(measured)).toBe(1);
});

test('the header carries no date, and the controls keep their places at both widths', async ({ page }) => {
  /*
   * Today's date stood under the theme control from 2026-08-21 to 2026-08-22
   * and is withdrawn. Wide, the row is unchanged: the calendar control — which
   * names the church the site reads — then the language control and the icon
   * toggle, all on one line, the bar no taller than it was with the date
   * (61 px). Narrow, the author rearranged it twice: on 2026-08-24 the name
   * spanned the top with the calendar control down on the nav's line, and on
   * 2026-08-25 that became **one line of chrome** — calendar control, name,
   * language and theme — with the four pages centred on a row beneath it,
   * "in one line across all screen sizes". So the "one line" assertion is
   * the wide branch's alone, and the narrow branch pins the arrangement that
   * replaced both: the three controls level with the name and in order across
   * it, the nav centred underneath, down to a 320 px phone.
   *
   * **The wide branch is measured in a wide utility face**, Amendment 24's
   * lesson applied to the header: `--font-utility` is the reader's own system
   * stack, so the same row is a different width on every machine — Segoe UI on
   * Windows, DejaVu Sans on a bare Linux runner. This row had 6 px of slack in
   * Segoe and was 20 px over in DejaVu, so it held one line on the desk that
   * built it and wrapped to 76 px in CI, unseen, from Amendment 36 (which put
   * the language control in the corner) until CI said so at Amendment 38. The
   * face is forced here, and the native one is printed to the run's log, so
   * the assertion is one width on every machine and the runner still says in
   * numbers what its own face costs.
   */
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const nativeHeight = await page.locator('header.chrome').evaluate((h) => {
    // The nav, not the header: the header is set in the display serif and the
    // face that decides this row's width is the utility one the nav wears.
    const face = getComputedStyle(h.querySelector('.site-nav')).fontFamily.split(',')[0];
    return `${h.getBoundingClientRect().height.toFixed(2)} px, utility face ${face}`;
  });
  console.log(`[header, native utility face] ${nativeHeight}`);
  // DejaVu Sans is what a bare ubuntu runner has and is among the widest
  // faces a reader will meet; Verdana is its Windows/macOS equivalent in
  // width, and fontconfig aliases Verdana to DejaVu on Linux. Either way the
  // header is measured against the widest realistic chrome, not the local one.
  await page.addStyleTag({
    content: ':root { --font-utility: "DejaVu Sans", Verdana, sans-serif !important; }',
  });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await expect(page.locator('.chrome-today')).toHaveCount(0);
  await expect(page.locator('#church-open')).toHaveText('Russian');
  await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-label', /Switch to the (dark|light) theme/);
  const m = await page.evaluate(() => {
    const box = (sel) => document.querySelector(sel).getBoundingClientRect();
    const header = box('header.chrome');
    const open = box('#church-open');
    const theme = box('#theme-toggle');
    const lang = box('#lang-open');
    const name = box('.site-name');
    const nav = box('.site-nav');
    const mid = (r) => r.top + r.height / 2;
    return {
      header: header.height,
      sameLine: Math.abs(mid(open) - mid(theme)) < 4,
      themeAfter: theme.left >= open.right,
      wide: innerWidth >= 560,
      // Narrow: one chrome line — calendar, name, language, theme, all on
      // the same centre — with the nav centred on its own row beneath.
      chromeOneLine:
        Math.abs(mid(open) - mid(name)) < 6 &&
        Math.abs(mid(open) - mid(lang)) < 6 &&
        Math.abs(mid(open) - mid(theme)) < 6,
      chromeInOrder: open.right <= name.left + 1 && name.right <= lang.left + 1 && lang.right <= theme.left + 1,
      nameCentred: Math.abs((name.left + name.right) / 2 - (header.left + header.right) / 2) < 12,
      navBelowChrome: nav.top >= open.bottom - 1,
      navCentred: Math.abs((nav.left + nav.right) / 2 - (header.left + header.right) / 2) < 12,
    };
  });
  if (m.wide) {
    expect(m.sameLine).toBe(true);
    expect(m.themeAfter).toBe(true);
    expect(m.header, `the header wrapped in a wide utility face: ${m.header.toFixed(2)} px`).toBeLessThan(64);
  } else {
    expect(m.chromeOneLine).toBe(true);
    expect(m.chromeInOrder).toBe(true);
    expect(m.nameCentred).toBe(true);
    expect(m.navBelowChrome).toBe(true);
    expect(m.navCentred).toBe(true);
  }
});

test('the chrome line holds down to a 320 px phone, in every language', async ({ browser }) => {
  /*
   * Author, 2026-08-25: the calendar control, the name and the two toggles
   * "remain in one line across all screen sizes". 320 px is the narrowest
   * phone the site meets, and the name is the elastic part — it gives up size
   * and then tail rather than pushing a control off the line, because a
   * calendar control that says nothing is worse than a smaller masthead.
   *
   * The first cut of this layout failed here in a way worth keeping a note
   * of: the name's track was a bare `1fr`, whose automatic minimum is
   * min-content, so a long name widened the track instead of ellipsising and
   * printed straight across the controls — at 320 px in English and at 360 in
   * Russian. `minmax(0, 1fr)` is the fix, and the same trap caught the
   * month's own span at Amendment 35.
   */
  for (const [width, language] of [[320, 'en'], [360, 'ru'], [360, 'el'], [412, 'ro']]) {
    const ctx = await browser.newContext({ viewport: { width, height: 780 } });
    const page = await ctx.newPage();
    await page.addInitScript(
      (l) => localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: l })),
      language,
    );
    await page.goto('/calendar/2026-09-01', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    // The widest realistic chrome, as the header's own test measures it.
    await page.addStyleTag({
      content: ':root { --font-utility: "DejaVu Sans", Verdana, sans-serif !important; }',
    });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const m = await page.evaluate(() => {
      const b = (sel) => document.querySelector(sel).getBoundingClientRect();
      const mid = (r) => r.top + r.height / 2;
      const cal = b('#church-open');
      const name = b('.site-name');
      const lang = b('#lang-open');
      const theme = b('#theme-toggle');
      return {
        level: Math.abs(mid(cal) - mid(theme)) < 6 && Math.abs(mid(cal) - mid(lang)) < 6 && Math.abs(mid(cal) - mid(name)) < 6,
        inOrder: cal.right <= name.left + 1 && name.right <= lang.left + 1 && lang.right <= theme.left + 1,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        nameVisible: name.width > 20,
      };
    });
    expect(m.level, `${language} at ${width}: the chrome line broke`).toBe(true);
    expect(m.inOrder, `${language} at ${width}: the name overran a control`).toBe(true);
    expect(m.overflow, `${language} at ${width}: the page overflowed`).toBe(0);
    expect(m.nameVisible, `${language} at ${width}: the name was squeezed away`).toBe(true);
    await ctx.close();
  }
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

/* ---- the church chooser (author, 2026-08-22) ----------------------------- */

/** The header's control, open. */
const openChooser = async (page) => {
  await page.locator('#church-open').click();
  await expect(page.locator('#church-panel')).toBeVisible();
};

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
  await expect(
    page.locator('.week-strip [data-iso="2026-06-28"]'),
  ).toHaveAttribute('aria-label', 'Sunday, 28 June 2026');

  // And in the month, which counts the same entries.
  await page.locator('[data-month]').click();
  await page.waitForTimeout(600);
  await expect(page.locator('.density')).toHaveCount(0);

  // Where the Greek calendar does keep him: the same menologion date, on the
  // civil day of that name.
  await page.goto('/calendar/2026-06-15', { waitUntil: 'networkidle' });
  await expect(page.locator('.hero-name')).toContainText('Augustine');
});

test('the calendar is remembered, and the header changes it', async ({ page }) => {
  // One choice, written once and read everywhere (author, 2026-08-22). The
  // header's button names it, opens the three, and a press closes the panel
  // and hands the focus back.
  await answered(page);
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  await expect(page.locator('.hero-name')).toContainText('Augustine');
  const open = page.locator('#church-open');
  await expect(open).toHaveText('Russian');
  await open.click();
  await expect(open).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#church-panel [data-church]')).toHaveCount(4);
  await expect(page.locator('#church-panel [data-church="russian"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.activeElement?.dataset?.church)).toBe('russian');

  await page.locator('#church-panel [data-church="greek"]').click();
  await expect(page.locator('#church-panel')).toBeHidden();
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('church-open');
  await expect(open).toHaveText('Greek');
  await expect(page.locator('.empty-day')).toBeVisible();

  await page.reload({ waitUntil: 'networkidle' });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gos-settings')).church)).toBe('greek');
  await expect(page.locator('#church-open')).toHaveText('Greek');
  await expect(page.locator('[data-ask]')).toHaveCount(0);
});

test('an answered panel shrinks into the control that changes it', async ({ page }) => {
  /*
   * Author, 2026-08-25 evening: "have an animation showing the pop-up shrink
   * and fade into the button it comes from so people remember where to click
   * to make changes."
   *
   * It is a teaching gesture, not decoration: the site hides both answers
   * behind two small controls in the header, and a reader who answers and
   * never sees where the answer went has to hunt for it next time. So the
   * assertion is about *direction* — the panel is travelling towards the
   * control, and has not simply faded where it stood.
   */
  await ready(page);
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  const button = page.locator('#church-open');
  const before = await button.boundingBox();
  await button.click();
  const panel = page.locator('#church-panel .church-panel-inner');
  const from = await panel.boundingBox();
  await page.locator('#church-panel [data-church="greek"]').click();

  // One frame in: the flight is started in a requestAnimationFrame, so the
  // transform is not on the box the instant the press returns.
  await page.waitForTimeout(60);
  const mid = await page.evaluate(() => {
    const el = document.querySelector('#church-panel .church-panel-inner');
    if (!el) return null;
    const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
    return { dx: m.m41, dy: m.m42, scale: m.a, opacity: +getComputedStyle(el).opacity };
  });
  // Smaller, fainter, and moving up and to the right — where the control is
  // on a desktop header.
  expect(mid.scale, 'shrinking').toBeLessThan(1);
  expect(mid.opacity, 'fading').toBeLessThan(1);
  expect(mid.dy, 'towards the header').toBeLessThan(0);
  expect(Math.sign(mid.dx), 'towards the control').toBe(Math.sign(before.x - (from.x + from.width / 2)));

  // And it lands: the panel is closed, emptied, and the choice took.
  await expect(page.locator('#church-panel')).toBeHidden();
  await expect(button).toHaveText('Greek');
});

test('under reduced motion the panel does not fly, it is simply gone', async ({ browser }) => {
  // Removed, not shortened (DESIGN.md §6). The lesson the flight carried is
  // not lost with it: the control's accessible name says the whole sentence.
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await ready(page);
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  await page.locator('#church-open').click();
  await page.locator('#church-panel [data-church="greek"]').click();
  // No frame of flight at all: the panel is hidden by the time the click
  // returns, where an animated close would still be mid-transform.
  expect(await page.evaluate(() => document.querySelector('#church-panel').hidden)).toBe(true);
  await expect(page.locator('#church-open')).toHaveText('Greek');
  await expect(page.locator('#church-open')).toHaveAttribute(
    'aria-label',
    'Greek calendar - change which church’s calendar the site shows',
  );
  await ctx.close();
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

test('the first visit is asked two questions, and each is answered on its own', async ({ page }) => {
  /*
   * One question until 2026-08-25 evening, when the author added the second:
   * "same as the message to choose which church, open the language options as
   * well for first time visitors to know they can change language."
   *
   * The two are deliberately not the same kind of question, and this is where
   * the difference is pinned. The calendar has no default and the page waits
   * for it. The language has one — English, which the reader is already
   * reading — so answering the calendar alone opens the whole site, and the
   * language is asked again next visit rather than assumed. Nothing under
   * either but its own choices.
   */
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-ask]')).toBeVisible();
  await expect(page.locator('.ask-block')).toHaveCount(2);
  await expect(page.locator('[data-ask-church] [data-church]')).toHaveCount(4);
  await expect(page.locator('[data-ask-language] [data-language]')).toHaveCount(5);
  await expect(page.locator('[data-advanced]')).toHaveCount(0);
  await expect(page.locator('[data-ask-choice]')).toHaveCount(0);
  expect(await page.evaluate(() => document.querySelector('[data-cal-body]').hidden)).toBe(true);

  await page.locator('[data-ask-church] [data-church="romanian"]').click();
  // The calendar's question goes; the language's stays, because it has not
  // been answered and the page below no longer waits on it.
  await expect(page.locator('[data-ask-church]')).toHaveCount(0);
  await expect(page.locator('[data-ask-language]')).toHaveCount(1);
  expect(await page.evaluate(() => document.querySelector('[data-cal-body]').hidden)).toBe(false);
  await expect(page.locator('#church-open')).toHaveText('Romanian');
  // Focus goes somewhere that still exists: the strip's own chrome.
  expect(await page.evaluate(() => document.activeElement?.hasAttribute('data-today'))).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gos-settings')).church)).toBe('romanian');

  // English is an answer too, and answering it is what stops the asking.
  await page.locator('[data-ask-language] [data-language="en"]').click();
  await expect(page.locator('[data-ask]')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gos-settings')).language)).toBe('en');

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('[data-ask]')).toHaveCount(0);
  await expect(page.locator('#church-open')).toHaveText('Romanian');
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

test('the hero image is 85% of the width it took, and opens the saint', async ({ page }) => {
  // A tall icon at full width put the saint's own name below the fold at
  // 360 px, which is the one thing a hero cannot do (author, 2026-08-21).
  await ready(page);
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  // 85% of the width it took, which is a different measurement in each of the
  // panel's two layouts: the column narrowed from 260 to 221 where the panel
  // gives the image a column, and the image narrowed within the panel where it
  // does not.
  const m = await page.evaluate(() => {
    const hero = document.querySelector('.hero');
    const s = getComputedStyle(hero);
    // The used track sizes, which is the image's actual containing block. The
    // panel has a border as well as padding, and subtracting only the padding
    // from a bounding box is off by exactly the border.
    const tracks = s.gridTemplateColumns.split(' ').map(parseFloat).filter((n) => !Number.isNaN(n));
    return {
      tracks,
      column: hero.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight),
      width: document.querySelector('.hero-media').getBoundingClientRect().width,
    };
  });
  // Where the panel gives the image a column, the column itself narrowed from
  // 260 to 221 and the image fills it. Where it does not, the image narrowed
  // inside the panel.
  const expected = m.tracks.length === 2 ? m.tracks[0] : 0.85 * m.column;
  if (m.tracks.length === 2) expect(Math.round(m.tracks[0])).toBe(221);
  expect(Math.abs(m.width - expected)).toBeLessThan(1);

  // Clicking the image goes where clicking the name goes. It is hidden from
  // the accessibility tree and out of the tab order on purpose: the name links
  // to the same page, and a second link with no text of its own would be
  // either an unnamed link or the same one announced twice.
  const media = page.locator('.hero-media');
  await expect(media).toHaveAttribute('aria-hidden', 'true');
  await expect(media).toHaveAttribute('tabindex', '-1');

  // The bookmark sits over the image's top-right corner, exactly as on an
  // Index card (author, 2026-08-24) — a sibling of the link, because a button
  // inside an anchor is invalid and a press must save rather than open.
  const boxes = await page.evaluate(() => {
    const img = document.querySelector('.hero-figure').getBoundingClientRect();
    const mark = document.querySelector('.hero-figure > .bookmark').getBoundingClientRect();
    return { img, mark };
  });
  expect(boxes.mark.top).toBeGreaterThan(boxes.img.top);
  expect(boxes.mark.right).toBeLessThanOrEqual(boxes.img.right);
  expect(boxes.mark.top - boxes.img.top).toBeLessThan(20);
  expect(boxes.img.right - boxes.mark.right).toBeLessThan(20);
  // And nowhere else: the body carries no second bookmark for an imaged hero.
  await expect(page.locator('.hero .hero-actions')).toHaveCount(0);

  await media.click();
  await expect(page.locator('h1.saint-name')).toHaveText('St. Augustine of Hippo');
});

/**
 * A reader who has answered the first-visit question — which is every visit
 * after the first (author, 2026-08-22: one church of three, and the calendar
 * follows it, so a calendar test has to say which). Written before the page
 * loads, because the calendar decides whether to ask while it is rendering,
 * and seeded only where nothing is stored: this runs on every load including a
 * reload, and a test that reloads to check something was remembered would
 * otherwise be overwriting it on the way back in. Russian by default — the Old
 * Calendar, so POPULATED (30 January) is Anthony's day.
 */
/*
 * A reader who has been here before. Since 2026-08-25 evening that means two
 * answers, not one: the first-visit gate asks which calendar *and* which of
 * the five languages, so a `ready` page that stamped only the church would
 * still meet a question — and every test that measures where something sits
 * would measure it under one.
 */
const ready = (page, { church = 'russian', language = 'en' } = {}) =>
  page.addInitScript(
    ({ church, language }) => {
      const key = 'gos-settings';
      const now = JSON.parse(localStorage.getItem(key) ?? '{}');
      const next = { ...now };
      if (typeof next.church !== 'string') next.church = church;
      if (typeof next.language !== 'string') next.language = language;
      localStorage.setItem(key, JSON.stringify(next));
    },
    { church, language },
  );
const answered = (page) => ready(page);

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

test('on a first visit both questions clear the fold, and the day does not', async ({ page }) => {
  // The one deliberate exception to the rule above (author, 2026-08-21;
  // revised 2026-08-22). A first visit is asked which calendar it keeps, and
  // nothing weekly or daily shows until it answers: what has to be above the
  // fold on that visit is the question and every one of its answers. Every
  // visit after it is the test above.
  //
  // Two questions since 2026-08-25 evening, and *both* clear it — the second
  // is the one telling a reader the site has five languages, and a question
  // below the fold on a first visit has not been asked. On a 360x780 phone
  // the pair ends 457 px down, which is the measurement that keeps this from
  // being an aspiration.
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const ask = await page.locator('[data-ask]').boundingBox();
  const churches = await page.locator('[data-ask-church] [data-church]').last().boundingBox();
  const languages = await page.locator('[data-ask-language] [data-language]').last().boundingBox();

  expect(ask.y + ask.height).toBeLessThan(780);
  expect(churches.y + churches.height).toBeLessThan(780);
  expect(languages.y + languages.height).toBeLessThan(780);
  expect(await page.evaluate(() => document.querySelector('[data-cal-body]').hidden)).toBe(true);
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

/* ---- the 2026-08-22 ground ---------------------------------------------- */

test('the day ground is gesso, and the field is recessed into it', async ({ page }) => {
  // The author pinned the light ground at rgb(229, 228, 221) on 2026-08-22,
  // replacing the near-white #fbfaf7 DESIGN.md §3 had carried until then.
  // Three derived values moved with it and each is asserted here, because each
  // was a relationship the old near-white ground was holding up by accident.
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
  expect(seen.page).toBe('rgb(229, 228, 221)');

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

/* ---- the 2026-08-22 round, Phase 1: Index detail, the bookmark, the × ---- */

/** Every mounted card, in whichever layout, fits the box the grid gave it. */
const nothingCropped = async (page) =>
  page.locator('.index-card').evaluateAll((cards) =>
    cards
      .filter((c) => c.scrollHeight > c.clientHeight + 1 || c.scrollWidth > c.clientWidth + 1)
      .map((c) => c.querySelector('.index-name')?.textContent),
  );

test('Detailed adds the opening of the life, and every box still holds', async ({ page }) => {
  // Addendum H1. The description is the life's own first paragraph in a box
  // reserved before it arrives: the card's height is still known before
  // render, so nothing may be cropped. (Until 2026-08-22 Detailed also swapped
  // the badge for the matrix; the glyph is removed — DESIGN.md §2.)
  await page.goto(INDEX, { waitUntil: 'networkidle' });
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
  await page.locator('[data-layout="rows"]').click();
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
  await page.locator('[data-layout="cards"]').click();
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
  await page.setViewportSize({ width: 1280, height: 900 });
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

test('the bookmark stands in the image corner, takes the press, and is the Save', async ({ page }) => {
  // Addendum H2. A frameless silhouette over the picture's top-right corner,
  // above the link's ::after, so pressing it saves rather than opens; on a
  // card with no picture it stands beside the dates, where a long name cannot
  // run under it.
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // The grid is virtualised and seventy long, so a card is brought into the
  // document by searching for it rather than by scrolling a headless page
  // (Amendment 26: a scroll's repaint waits for a frame the harness may not
  // produce). The search is the Index's own; the bookmark is the same.
  const showOnly = async (name) => {
    await page.locator('[data-query]').fill(name);
    await expect(page.locator('.index-card', { hasText: name })).toHaveCount(1);
    return page.locator('.index-card', { hasText: name });
  };
  const first = await showOnly('Anthony the Great');
  const seen = await first.evaluate((card) => {
    const r = (el) => el.getBoundingClientRect();
    const image = r(card.querySelector('.index-media'));
    const button = card.querySelector('.bookmark');
    const b = r(button);
    const style = getComputedStyle(button);
    const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    const shape = getComputedStyle(card.querySelector('.bookmark .bm-shape'));
    return {
      flushRight: Math.round(image.right - b.right),
      flushTop: Math.round(b.top - image.top),
      hitIsBookmark: !!hit?.closest('.bookmark'),
      border: style.borderStyle,
      background: style.backgroundColor,
      stroke: shape.stroke,
      fill: shape.fill,
      opacity: shape.opacity,
    };
  });
  expect(seen.flushRight).toBe(0);
  expect(seen.flushTop).toBe(0);
  expect(seen.hitIsBookmark).toBe(true);
  // No frame: no border and no field behind the shape.
  expect(seen.border).toBe('none');
  expect(seen.background).toBe('rgba(0, 0, 0, 0)');
  // Ink, never gold: Save is chrome (DESIGN.md §2). Filled at both states
  // (author, 2026-08-23) — half strength when not saved, full when it is.
  const tokens = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const rgb = (hex) => {
      const n = parseInt(hex.trim().slice(1), 16);
      return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
    };
    return { ink: rgb(root.getPropertyValue('--ink')), gold: rgb(root.getPropertyValue('--gold')) };
  });
  expect(seen.stroke).toBe(tokens.ink);
  expect(seen.fill).toBe(tokens.ink);
  expect(seen.opacity).toBe('0.5');

  // A card with no picture: beside the dates. ('Christopher' alone now
  // matches two saints in the 708-saint corpus — Christopher and
  // Christopher the Roman, both imageless — so the search is narrowed.)
  const imageless = await showOnly('Christopher the Roman');
  const corner = await imageless.evaluate((card) => {
    const r = (el) => el.getBoundingClientRect();
    const b = r(card.querySelector('.bookmark'));
    const d = r(card.querySelector('.index-dates'));
    return {
      centredOnDates: Math.abs((b.top + b.bottom) / 2 - (d.top + d.bottom) / 2) < 2,
    };
  });
  expect(corner.centredOnDates).toBe(true);

  // It is the Save: pressing it writes the store, the shape fills, the name
  // says so, the page stays where it was, and a reload finds it saved.
  const button = (await showOnly('Anthony the Great')).locator('.bookmark');
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await expect(button).toHaveAttribute('aria-label', 'Save Anthony the Great');
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(button).toHaveAttribute('aria-label', /Anthony the Great is saved/);
  await expect(page).toHaveURL(/\/saints$/);
  const saved = await button.locator('.bm-shape').evaluate((el) => {
    const style = getComputedStyle(el);
    return { fill: style.fill, opacity: style.opacity };
  });
  expect(saved.fill).toBe(tokens.ink);
  expect(saved.fill).not.toBe(tokens.gold);
  expect(saved.opacity).toBe('1');
  await page.reload({ waitUntil: 'networkidle' });
  const again = await showOnly('Anthony the Great');
  await expect(again.locator('.bookmark')).toHaveAttribute('aria-pressed', 'true');
  await again.locator('.bookmark').click();
  await expect(again.locator('.bookmark')).toHaveAttribute('aria-pressed', 'false');
});

test('the × returns the reader to the Index as they left it, and so does the browser back', async ({ browser }) => {
  // Addendum H3. Filters, open facets and scroll position all come back; the
  // nav link still opens the Index fresh, because it does not ask. A short
  // viewport so there is a scroll position to lose.
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const page = await ctx.newPage();
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await (await facet(page, 'churches')).getByLabel('Romanian').check();
  await expect(page.locator('[data-count]')).toHaveText('122');
  // The order is pinned because the card this test opens has to be one that
  // fits between the header and the fold, and card heights come from each
  // icon's aspect ratio — under the Random default (2026-08-24) a deal that
  // put a tall portrait across the whole 780 px viewport left no such card
  // and the search came back empty. The subject here is what comes back
  // after a trip into a saint, not which saints are on top.
  await page.selectOption('[data-sort]', 'earliest');
  await expect(page.locator('[data-count]')).toHaveText('122');
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(200);

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
  await expect(page.locator('[data-count]')).toHaveText('122');
  await expect(page.locator('input[name="churches"][value="romanian"]')).toBeChecked();
  expect(await page.evaluate(() => document.querySelector('[data-facet="churches"]').open)).toBe(true);
  expect(await page.evaluate(() => window.scrollY)).toBe(500);

  // The browser's own back finds the same place.
  await openVisible();
  await expect(page.locator('h1.saint-name')).toBeVisible();
  await page.goBack();
  await expect(page.locator('[data-count]')).toHaveText('122');
  expect(await page.evaluate(() => window.scrollY)).toBe(500);

  // The nav link is a fresh Index.
  await page.locator('nav a[href$="/saints"]').click();
  await expect(page.locator('[data-count]')).toHaveText('708');
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await ctx.close();
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
  await expect(page.locator('.hero-name')).toHaveText('St. Anthony the Great');

  // Opened from All Saints instead, the × still returns there.
  await page.goto('/saints', { waitUntil: 'networkidle' });
  await page.locator('[data-query]').fill('Anthony the Great');
  await page.locator('.index-card .index-name', { hasText: 'Anthony the Great' }).first().click();
  await expect(page).toHaveURL(/\/saints\/anthony-the-great$/);
  await expect(page.locator('[data-back]')).toHaveAttribute('aria-label', 'Back to All Saints');
  await page.locator('[data-back]').click();
  await expect(page).toHaveURL(/\/saints$/);
});

test('a navigation lands at the top of the page it opens', async ({ browser }) => {
  // Found measuring the ×: with no scroll reset anywhere, a reader arriving
  // from a scrolled Index landed 696 px down the saint's page at 360 px. The
  // app owns scroll now (DESIGN.md §5c).
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const page = await ctx.newPage();
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

test('the saint page puts the register beside the image on desktop, the body beneath both, and the controls on the name line', async ({ page }) => {
  // Addendum H4, and the head of DESIGN.md §5c: name, bookmark, ×, then the
  // mark at the margin; at 760 px and above the image and the dates-and-places
  // register share a row and the body runs the full width under them.
  await page.goto(DETAIL, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.save-button')).toHaveCount(0);
  await expect(page.locator('.saint-head .bookmark')).toHaveCount(1);
  await expect(page.locator('.saint-head [data-back]')).toHaveAttribute('aria-label', 'Back to All Saints');

  const seen = await page.evaluate(() => {
    const r = (s) => document.querySelector(s).getBoundingClientRect();
    const h1 = r('h1.saint-name'), tools = r('.saint-tools');
    const media = r('.saint-media-col'), facts = r('.saint-intro-facts'), main = r('.saint-main'), article = r('article.saint');
    return {
      wide: innerWidth >= 760,
      toolsAfterName: tools.left >= h1.left + 10,
      toolsOnNameLine: tools.top < h1.bottom && tools.bottom > h1.top,
      factsBesideImage: facts.left >= media.right && Math.abs(facts.top - media.top) < 4,
      factsBelowImage: facts.top >= media.bottom,
      mainFullWidth: Math.round(main.width) === Math.round(article.width),
      mainBelowBoth: main.top >= Math.max(media.bottom, facts.bottom),
    };
  });
  expect(seen.toolsAfterName).toBe(true);
  expect(seen.toolsOnNameLine).toBe(true);
  expect(seen.mainFullWidth).toBe(true);
  expect(seen.mainBelowBoth).toBe(true);
  if (seen.wide) expect(seen.factsBesideImage).toBe(true);
  else expect(seen.factsBelowImage).toBe(true);
});

/* ---- the 2026-08-22 round, Phase 2: the header, the selection, one calendar -- */

test('the first visit is asked which calendar, and sees no strip until it answers', async ({ page }) => {
  // Addendum H7–H8, redrawn for one church of three (author, 2026-08-22): one
  // question, standing where the strip will stand, and the week, the date and
  // the day stay hidden until it is answered. The answer is the site's.
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-gate] [data-ask]')).toBeVisible();
  await expect(page.locator('[data-ask] [data-church]')).toHaveCount(4);
  expect(await page.evaluate(() => document.querySelector('[data-cal-body]').hidden)).toBe(true);
  await expect(page.locator('.week-strip')).toBeHidden();
  await expect(page.locator('#church-open')).toHaveText('Choose a calendar');

  await page.locator('[data-ask] [data-church="russian"]').click();
  // The calendar's question goes. The language's remains until it is answered
  // in its own right (2026-08-25 evening), and the page below no longer waits.
  await expect(page.locator('[data-ask-church]')).toHaveCount(0);
  expect(await page.evaluate(() => document.querySelector('[data-cal-body]').hidden)).toBe(false);
  await expect(page.locator('.week-strip')).toBeVisible();
  // The calendar is named and changed in the header (author, 2026-08-24);
  // nothing under the strip offers it any more.
  await expect(page.locator('[data-which]')).toHaveCount(0);
  await expect(page.locator('.hero-name')).toContainText('Augustine');
  await expect(page.locator('#church-open')).toHaveText('Russian');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('gos-settings')));
  expect(stored.church).toBe('russian');
  expect(stored.traditions).toBeUndefined();
});

test('the header control names the calendar, offers the three, and the Index follows every press', async ({ page }) => {
  // Addendum H7 redrawn: one choice in place of four switches and the plate.
  // The Index under it keeps the chosen church's saints and names what that
  // sets aside, never silently dropping anyone.
  await ready(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  // Russian keeps four hundred and five of the 708-saint corpus (Amendment
  // 31): its own week, the Russian new martyrs read off azbyka.ru, and the
  // original eight; the rest stand undocumented for it.
  await expect(page.locator('[data-count]')).toHaveText('405');
  await expect(page.locator('[data-set-aside]')).toHaveText('405/708 saints venerated in the Russian calendar.');

  const open = page.locator('#church-open');
  await expect(open).toHaveText('Russian');
  await open.click();
  await expect(open).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#church-panel [data-church]')).toHaveCount(4);
  await expect(page.locator('#church-panel [data-advanced]')).toHaveCount(0);

  // Romanian keeps a hundred and twenty-two — six of the original eight and
  // the calendars' saints of 23 August to 19 September — and the rest are
  // counted and named.
  await page.locator('#church-panel [data-church="romanian"]').click();
  await expect(page.locator('#church-panel')).toBeHidden();
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('church-open');
  await expect(open).toHaveText('Romanian');
  await expect(page.locator('[data-count]')).toHaveText('122');
  // The count says the useful number outright (author, 2026-08-25): it named
  // how many were *not* kept, which left the reader subtracting.
  await expect(page.locator('[data-set-aside]')).toHaveText('122/708 saints venerated in the Romanian calendar.');

  // Greek keeps three hundred and forty-four: the Synaxaristis lists most of
  // the four weeks, one entry per name.
  await open.click();
  await page.locator('#church-panel [data-church="greek"]').click();
  await expect(page.locator('[data-count]')).toHaveText('344');
  await expect(page.locator('[data-set-aside]')).toHaveText('344/708 saints venerated in the Greek calendar.');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gos-settings')).church)).toBe('greek');
});

test('the saint page reads the reader church first and reveals the others for that page only', async ({ page }) => {
  // Addendum H9 redrawn. Only the register filters; the reveal resets on the
  // next saint opened.
  await ready(page, { church: 'romanian' });
  await page.goto(DETAIL, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-veneration] > .attestations .att')).toHaveCount(1);
  await expect(page.locator('[data-veneration] > .attestations .att-church')).toHaveText('Romanian');
  const reveal = page.locator('[data-reveal]');
  await expect(reveal).toHaveText('See the other churches (3)');
  await expect(page.locator('.attestations-other .att')).toHaveCount(0);

  await reveal.click();
  await expect(page.locator('.attestations-other .att')).toHaveCount(3);
  await expect(page.locator('[data-reveal]')).toHaveText('Hide the other churches');
  expect(await page.evaluate(() => document.activeElement?.hasAttribute('data-reveal'))).toBe(true);

  // A saint the Romanian calendar does not keep: the row says undocumented,
  // with the check that was made, and the reveal has reset.
  await page.goto('/saints/moses-the-hungarian', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-veneration] > .attestations .att')).toHaveClass(/att-undocumented/);
  await expect(page.locator('[data-veneration] > .attestations .att-note')).toContainText('checked 2026-08-22');
  await expect(page.locator('[data-reveal]')).toHaveText('See the other churches (3)');
  await expect(page.locator('.attestations-other .att')).toHaveCount(0);
});

test('before a church is chosen the saint page shows all four, and holds nothing back', async ({ page }) => {
  // No church chosen keeps everything: a filter that hid anyone before the
  // question was answered would be adjudicating by accident.
  await page.goto(DETAIL, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-veneration] .att')).toHaveCount(4);
  await expect(page.locator('[data-reveal]')).toHaveCount(0);
  await expect(page.locator('[data-veneration] .att-church').first()).toHaveText('Russian');
});

test('the theme follows the system until it is touched, and holds once it is', async ({ browser }) => {
  // Addendum H5, answer 4. A stored 'system' from the three-way days reads as
  // untouched; the first press fixes a choice the system no longer moves.
  const ctx = await browser.newContext({ colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.goto('/about', { waitUntil: 'networkidle' });
  expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
  await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-label', 'Switch to the light theme');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gos-settings') ?? '{}').theme ?? null)).toBe(null);

  // Untouched: the system changes, the site follows, live.
  await page.emulateMedia({ colorScheme: 'light' });
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(false);
  await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-label', 'Switch to the dark theme');

  // Touched: the choice holds against the system.
  await page.locator('#theme-toggle').click();
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gos-settings')).theme)).toBe('dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
  await page.reload({ waitUntil: 'networkidle' });
  expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
  await ctx.close();
});

test('the site is named in the reader\u2019s own language, and the habit page is Daily', async ({ page }) => {
  // Author, 2026-08-23. The name in the head and the page's nav label. The
  // header's own corner reads "Orthodoxy Daily" since (author, 2026-08-23,
  // later the same day) — a second, deliberately different name from the
  // head's. The veil carried the head's name until 2026-08-24 and now carries
  // the header's; that has a test of its own below. The route stays /calendar
  // so no link breaks. Since 2026-08-25 the header's name comes from the pack
  // rather than from the markup, so it follows the chosen language — the
  // English pack says the same words the markup used to.
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await expect(page).toHaveTitle(/The Orthodox Saint/);
  await expect(page.locator('.site-name')).toHaveText('Orthodoxy Daily');
  await expect(page.locator('.site-nav a[href$="/"]').first()).toHaveText('Daily');
  await expect(page.locator('.site-nav')).not.toContainText('Calendar');
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
  await expect(page.locator('[data-liturgy]')).toContainText('12th Sunday after Pentecost · Tone 3 · Oil and wine - the Dormition Fast');
  await expect(page.locator('[data-liturgy] .fast')).toHaveAttribute('aria-haspopup', 'dialog');
  await expect(page.locator('[data-liturgy] .fast')).toHaveAttribute('data-grade', 'oil');
  // The fast carries its kind, so the three states are told apart by colour
  // as well as by their wording (author, 2026-08-24).
  await expect(page.locator('[data-liturgy] .fast')).toHaveAttribute('data-fast', 'fast');
  // A life with no recorded beginning is read from its end (author,
  // 2026-08-24): the hero of this day, Lawrence of Kaluga, said
  // "undated – 1515" until then.
  // "Entered eternal glory in 1515" until 2026-08-25, when the author
  // replaced the phrase with plain "Reposed".
  await expect(page.locator('.hero-dates')).toHaveText('Reposed 1515');
  // And Also commemorated reads as one company, not a ruled ledger: no line
  // between the saints (author, 2026-08-24; the shelves keep theirs).
  expect(
    await page.locator('.day-panel .register li').first().evaluate((li) => getComputedStyle(li).borderBottomWidth),
  ).toBe('0px');
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  // A fish-permitted day resolves to the `fish` grade, which is the one
   // grade taken from lib/liturgy.js rather than from a printed note — that
   // claim is liturgy.js's own and predates this.
  await expect(page.locator('[data-liturgy]')).toContainText('Fish permitted - a Great Feast on a Friday');
  await expect(page.locator('[data-liturgy] .fast')).toHaveAttribute('data-fast', 'fish');

  await openChooser(page);
  await page.locator('#church-panel [data-church="greek"]').click();
  // And an ordinary Friday, whose calendar printed no allowance: the line
  // says which fast and stops.
  await expect(page.locator('[data-liturgy]')).toContainText('13th week after Pentecost · Tone 3 · Fast - Friday');
  await page.goto('/calendar/2026-08-23', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-liturgy]')).toContainText('12th Sunday after Pentecost · Tone 3 · No fast');
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
  // (1 September became a recorded day with Amendment 31; the 20th is not.)
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
  await ready(page, { church: 'greek' });
  await page.goto('/calendar/2026-08-24', { waitUntil: 'networkidle' });
  await expect(page.locator('.hero-name')).toHaveText('St. Kosmas of Aetolia');
  await expect(page.locator('[data-hymns] .hymn')).toHaveCount(2);
  await expect(page.locator('[data-hymns] .hymn-text').first()).toHaveAttribute('lang', 'el');
  await expect(page.locator('[data-hymns] .hymn-text').first()).toContainText('Κοσμᾶν τὸν ἰσαπόστολον');
  await expect(page.locator('[data-hymns] .hymn-kind').first()).toContainText('Troparion · Ἦχος α΄');
  await page.goto('/calendar/2026-08-23', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-hymns] [data-feast-hymns] .hymn')).toHaveCount(2);
  await expect(page.locator('[data-hymns] .hymn-text').first()).toContainText('ἐν τὴ Κοιμήσει τὸν κόσμον οὐ κατέλιπες');

  await openChooser(page);
  await page.locator('#church-panel [data-church="romanian"]').click();
  await page.goto('/calendar/2026-08-27', { waitUntil: 'networkidle' });
  await expect(page.locator('.hero-name')).toHaveText(/Phanourios|Poemen/);
  await expect(page.locator('[data-hymns] .hymn-text').first()).toHaveAttribute('lang', 'ro');
  await expect(page.locator('[data-hymns] .hymn-kind').first()).toContainText('Glas');
  // Nothing Greek on the Romanian page, and nothing at all where nothing is recorded.
  await expect(page.locator('[data-hymns] .hymn-text[lang="el"]')).toHaveCount(0);
  await page.goto('/calendar/2026-09-20', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-hymns]:not([hidden])')).toHaveCount(0);
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
  // this day, so no grade leads the line: what a calendar has not printed,
  // the page does not say.
  await expect(page.locator('[data-liturgy]')).toContainText('12th Sunday after Pentecost · Tone 3 · Fast - the Dormition Fast');
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
  await expect(page.locator('[data-liturgy]')).toContainText('13th week after Pentecost · Tone 3 · No fast');

  // The Russian week (Amendment 29 too): the 24th is its 11 August, Euplus
  // and the Caves fathers with Church Slavonic tropars from the Patriarchate's
  // calendar, and the hero one of the saints it sings for.
  await openChooser(page);
  await page.locator('#church-panel [data-church="russian"]').click();
  await page.goto('/calendar/2026-08-24', { waitUntil: 'networkidle' });
  await expect(page.locator('.hero-name')).toHaveText(/Euplus|Theodore|Basil/);
  await expect(page.locator('[data-hymns] .hymn-text').first()).toHaveAttribute('lang', 'cu');
  await expect(page.locator('[data-hymns] .hymn-kind').first()).toContainText('глас');
  await expect(page.locator('[data-hymns] .hymn-text[lang="sr"]')).toHaveCount(0);
});

test('the veneration glyph is drawn nowhere, and gold is spent nowhere', async ({ page }) => {
  // The author's decision for the Eastern Orthodox project (2026-08-22;
  // DESIGN.md §2, and §7 superseded in full): in a one-communion corpus the
  // mark said nothing and is removed, and gold — spent only on it — is spent
  // nowhere until a new signature element is chosen. Four routes; every
  // element's computed colours. A reintroduction anywhere fails here by name.
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
        const cs = getComputedStyle(el);
        const hit = props.find((p) => cs[p] === goldRgb);
        if (hit) hits.push(`${el.tagName.toLowerCase()}.${el.getAttribute('class') || ''} ${hit}`);
      }
      return hits.slice(0, 5);
    }, gold);
    expect(golden, `${path} spends gold on ${golden.join(', ')}`).toEqual([]);
  }
});

test('no axe violations on the first visit, with the question standing', async ({ page }) => {
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-ask]')).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations, JSON.stringify(results.violations.map((v) => v.id))).toEqual([]);
  // And with the header's control open over the Index.
  await ready(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.locator('#church-open').click();
  const open = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(open.violations, JSON.stringify(open.violations.map((v) => v.id))).toEqual([]);
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
  await expect(page.locator('h1.saint-name')).toHaveText('St. Eleutherius, Monk-martyr (1937)');
  await expect(page.locator('.life p').first()).toContainText('Eleutherius Pechennikov was born in 1870');
  await expect(page.locator('.fact-row', { hasText: 'Died' })).toContainText('1937');
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
  await ready(page, { church: 'romanian' });
  await page.goto('/calendar/2026-09-08', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-readings] .readings a').first()).toHaveText('Philippians 2:5-11');
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
  await expect(page.locator('[data-readings] .readings a').first()).toHaveText('Acts 13:25-32');
  await expect(page.locator('[data-readings] .readings-source a')).toHaveAttribute('href', /days\.pravoslavie\.ru\/Days\/20260829\.html/);
  await expect(page.locator('.hero-name')).toHaveText('St. John the Baptist and Forerunner');
  await expect(page.locator('[data-hymns] .hymn-text[lang="cu"]').first()).toContainText('Память праведнаго с похвалами');

  await openChooser(page);
  await page.locator('#church-panel [data-church="serbian"]').click();
  await page.goto('/calendar/2026-09-18', { waitUntil: 'networkidle' });
  await expect(page.locator('.hero-name')).toContainText('Zacharias the Prophet');
  await expect(page.locator('[data-hymns] .hymn-text[lang="sr"]').first()).toContainText('Обучен у свештеничке одежде');
  await expect(page.locator('[data-readings] .readings a').first()).toHaveText('Ephesians 1:7-17');

  await page.goto('/saints/babylas-of-antioch', { waitUntil: 'networkidle' });
  await expect(page.locator('h1.saint-name')).toHaveText('St. Babylas, Bishop of Antioch');
  await expect(page.locator('.life p').first()).toContainText('this great and wonderful man');
  await expect(page.locator('.life em a[href*="pravoslavno.rs"]')).toHaveCount(1);
  await expect(page.locator('.saint-media img')).toBeVisible();
  const credit = page.locator('.image-credit a');
  // The harvest pipeline stores the colon percent-encoded (File%3A); both
  // forms resolve to the same Commons file page.
  await expect(credit).toHaveAttribute('href', /commons\.wikimedia\.org\/wiki\/File(:|%3A)/);
  await expect(credit).toHaveText('Public domain');
});

/* ---- the round of 2026-08-24 (Amendment 34) ----------------------------- */

test('the veil names the site the way the header does', async ({ page }) => {
  /*
   * Author, 2026-08-24. The loading veil read "The Orthodox Saint" — the
   * head's name — and now reads "Orthodoxy Daily", the header's. This narrows
   * Amendment 31's deliberate two-name split to the <title> alone: the first
   * thing a reader sees painted and the name in the corner it fades into are
   * now the same words, and the split survives only where a reader meets it
   * in a tab or a bookmark.
   *
   * The veil is removed 300 ms after the manifest lands, so it is read out of
   * the served HTML rather than raced for in a live page.
   */
  const html = await (await page.request.get('/')).text();
  expect(html).toContain('<div class="veil-name" data-site-name>Orthodoxy Daily</div>');
  expect(html).not.toContain('The Orthodox Saint</div>');
  // The head keeps its own name, which is the half of the split that stands.
  expect(html).toContain('<title>The Orthodox Saint</title>');

  /*
   * And both printed names follow the language (author, 2026-08-25). The
   * markup's English is what a reader with no stored choice gets and what
   * stands for the moment the modules take to parse; the pack paints over it
   * at boot, before the manifest — which is the long wait — has landed.
   */
  await page.addInitScript(() =>
    localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'ro' })),
  );
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await expect(page.locator('.site-name')).toHaveText('Ortodoxia Zilnică');
});

test('the site mark is the Orthodox cross, in gold by instruction', async ({ page }) => {
  /*
   * Author, 2026-08-24. The favicon was one gold cell — the attested mark of
   * the veneration badge, which was removed whole at Amendment 25, so it had
   * been standing for a thing that no longer exists. It is now the
   * eight-pointed cross: upright, titulus, crossbar, and the slanted
   * footrest, whose slant is the whole of what makes it Orthodox rather than
   * Latin.
   *
   * It was drawn in ink for exactly one day. DESIGN.md §2 reserves gold for a
   * finding about veneration and nothing else, and a site mark is not one —
   * which is why Amendment 34 took the gold out. *The author put it back on
   * 2026-08-25* ("make the site icon gold colour orthodox cross"), and §2
   * records the exception in place: gold is spent here and nowhere else on
   * the site. So this pins the two gold tokens exactly — a mark drifting to
   * some other yellow would be the failure now — and the "spent nowhere else"
   * half is still guarded by its own test over the rendered pages.
   */
  const html = await (await page.request.get('/')).text();
  const href = html.match(/<link rel="icon" href="([^"]+)"/)?.[1];
  expect(href).toBeTruthy();
  const svg = decodeURIComponent(href.replace('data:image/svg+xml,', ''));
  // Three bars and a slanted footrest: the eight points.
  expect(svg.match(/<rect/g)).toHaveLength(3);
  expect(svg).toContain('<polygon');
  // The footrest's left end sits higher than its right — the good thief was at
  // Christ's right hand, which is the viewer's left. A level bar here would be
  // a Latin cross with an extra rung.
  const points = svg
    .match(/points='([^']+)'/)[1]
    .split(' ')
    .map((pair) => pair.split(',').map(Number));
  const xs = points.map((q) => q[0]);
  const leftTop = points.find(([x]) => x === Math.min(...xs));
  const rightTop = points.find(([x]) => x === Math.max(...xs));
  expect(leftTop[1]).toBeLessThan(rightTop[1]);
  // Gold, by instruction (author, 2026-08-25), and exactly the two tokens:
  // #A98237 on a light tab strip, #C79A4B on a dark one. Ink here from
  // Amendment 34 until then.
  expect(svg.toLowerCase()).toContain('a98237');
  expect(svg.toLowerCase()).toContain('c79a4b');
  expect(svg).not.toContain('#221d19');
  // It flips rather than vanishing into a dark tab strip.
  expect(svg).toContain('prefers-color-scheme:dark');
});

test('the calendar chooser asks its question and offers the four, with nothing between', async ({ page }) => {
  /*
   * Author, 2026-08-24: the paragraph under the heading is removed outright.
   * It named the four churches and their two calendars in prose directly
   * above four buttons each printing exactly that, so it said the choices
   * twice and put four lines between the question and the answer.
   *
   * Both hosts, because one component draws both: the first-visit gate on the
   * calendar page, and the header's panel.
   */
  await page.goto('/', { waitUntil: 'networkidle' });
  // Scoped to the calendar's own block since 2026-08-25 evening: the gate
  // holds the language question under it, and that has a heading too.
  const gate = page.locator('[data-ask-church]');
  await expect(gate.locator('.ask-heading')).toHaveText('Which calendar do you keep?');
  await expect(gate.locator('p')).toHaveCount(0);
  await expect(gate).not.toContainText('Four churches keep their calendars here');
  await expect(gate.locator('[data-church]')).toHaveCount(4);

  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await openChooser(page);
  const panel = page.locator('#church-panel');
  await expect(panel.locator('.ask-heading')).toHaveText('Which calendar do you keep?');
  await expect(panel.locator('p')).toHaveCount(0);
  await expect(panel).not.toContainText('change it whenever you like');
});

test('the header names the church with a mark, not with the word calendar', async ({ page }) => {
  /*
   * Author, 2026-08-24: the control read "{church} calendar" and now wears a
   * calendar mark and the church's name alone, to give the header its width
   * back. The mark is the same drawing as the month toggle on the calendar
   * page, one size down.
   *
   * The accessible name is the part that must not thin out with the visible
   * text: an icon says nothing to a screen reader, and the aria-label used to
   * swallow the church's name while the visible text carried it. It now says
   * which church as well as what a press does.
   */
  await ready(page, { church: 'romanian' });
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const open = page.locator('#church-open');
  await expect(open).toHaveText('Romanian');
  await expect(open.locator('svg')).toHaveCount(1);
  await expect(open).toHaveAttribute('aria-label', /Romanian calendar/);
  await expect(open).toHaveAttribute('aria-label', /change which church/i);
  // Shorter than the sentence it replaced, which was the point of the change:
  // "Romanian calendar" at this face is comfortably past 130 px.
  const box = await open.boundingBox();
  expect(box.width).toBeLessThan(130);
});

test('About states the privacy policy, and states it as the code behaves', async ({ page }) => {
  /*
   * Author, 2026-08-24. Written against lib/settings.js and lib/store.js
   * rather than as boilerplate: the four things kept are the reading
   * position, the saved and recently-opened saints, the church and the theme,
   * and how the Index was left. A privacy policy that has drifted from the
   * code is worse than none, because a reader has no way to tell.
   */
  await ready(page);
  await page.goto('/about', { waitUntil: 'networkidle' });
  const privacy = page.locator('section.privacy');
  await expect(privacy.locator('h2')).toHaveText('Privacy');
  await expect(privacy).toContainText('Nothing about you is collected');
  await expect(privacy).toContainText('no account to make');
  // The four kept things, each named.
  await expect(privacy).toContainText('Where you were reading');
  await expect(privacy).toContainText('saints you have saved');
  await expect(privacy).toContainText('church whose calendar you chose');
  await expect(privacy).toContainText('cards or rows');
  // And what is not done.
  await expect(privacy).toContainText('No analytics');
  await expect(privacy).toContainText('no cookies');
  await expect(privacy).toContainText('clearing the site');
  // The two honest footnotes: this site does not host itself, and the
  // readings link out.
  await expect(privacy).toContainText('GitHub Pages');
  await expect(privacy).toContainText('Bible Gateway');
});

/**
 * The leading names *as the reader sees them*. The grid is virtualised and
 * absolutely positioned: paintWindow appends newly-mounted cards and leaves
 * already-mounted ones where they sit, so after a re-sort the DOM order is no
 * longer the order on screen — `.index-name` .first() is the first card
 * *mounted*, which on a fresh load is the leader and after a sort change is
 * whatever happened to survive. Every assertion about order reads geometry.
 */
const leaders = (page, n = 1) =>
  page.locator('.index-card').evaluateAll(
    (cards, count) =>
      cards
        .map((c) => ({ box: c.getBoundingClientRect(), name: c.querySelector('.index-name')?.textContent ?? '' }))
        .sort((a, b) => a.box.top - b.box.top || a.box.left - b.box.left)
        .slice(0, count)
        .map((x) => x.name)
        .join('|'),
    n,
  );

test('the Index opens shuffled, says so, and deals a new hand next visit', async ({ page }) => {
  /*
   * Author, 2026-08-24, evening — reversing the same morning's Earliest
   * default: Random opens the Index "so each time you open the site you get
   * exposed to more saints". Two halves worth pinning: the control says
   * Random over a shuffled grid (the morning's lesson — a label must not lie
   * about the list under it), and a fresh visit mints a fresh seed. The
   * reload compares the first three names, not one: two different seeds
   * agreeing on three leading cards out of 708 is not a coincidence the test
   * will ever meet, where a single card could someday tie.
   */
  await ready(page);
  await page.goto('/saints', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-sort]')).toHaveValue('random');
  await expect(page.locator('[data-sort] option:checked')).toHaveText('Random');
  const trio = () => leaders(page, 3);
  const dealt = await trio();

  // A trip into a saint's page and back (the × or the browser's own back)
  // restores the remembered grid, seed included — the nav link is different
  // on purpose (its own comment: "opens the Index fresh, because it does not
  // ask") and is not what this half tests.
  await page.locator('.index-card').first().locator('.index-name').click();
  await page.locator('[data-back]').click();
  await expect(page.locator('[data-sort]')).toHaveValue('random');
  expect(await trio()).toBe(dealt);

  await page.reload({ waitUntil: 'networkidle' });
  expect(await trio()).not.toBe(dealt);
});

test('latest runs the other way from earliest', async ({ page }) => {
  /*
   * Author, 2026-08-24, and this is the defect behind the instruction: both
   * date orders were ascending and keyed only on a different bound of the
   * life, so *Latest date* opened on Moses and Joshua exactly as *Earliest*
   * did and read as a control that did nothing. Latest now means the most
   * recently reposed first, which in the Russian calendar is a confessor of
   * 1972.
   */
  await ready(page);
  await page.goto('/saints', { waitUntil: 'networkidle' });
  // Random is the default since the same evening; the two date orders are
  // this test's subject, so it chooses them explicitly — and reads the leader
  // off the screen, because a re-sort does not reorder the DOM.
  await page.selectOption('[data-sort]', 'earliest');
  await expect.poll(() => leaders(page)).toBe('St. Moses the Prophet and God-seer');
  await page.selectOption('[data-sort]', 'latest');
  await expect.poll(() => leaders(page)).toBe('St. Peter (Cheltsov), Archpriest, Confessor (1972)');
  await page.selectOption('[data-sort]', 'earliest');
  await expect.poll(() => leaders(page)).toBe('St. Moses the Prophet and God-seer');
});

test('random deals an order, and holds it still under the reader', async ({ page }) => {
  /*
   * Author, 2026-08-24. The Index is virtualised and re-filters on every
   * keystroke in the search box, so the order cannot be a shuffled array — it
   * would be re-dealt mid-scroll. It is derived from a seed and the slug
   * instead, and the seed is kept for as long as Random stays chosen.
   *
   * The second half is the part a shuffle usually gets wrong, so it is forced
   * here: two spaces typed into the search box trim to an empty query, which
   * changes nothing about which saints match but runs the whole filter pass
   * again.
   */
  await ready(page);
  await page.goto('/saints', { waitUntil: 'networkidle' });
  // Random is the default now; stepping through Earliest first keeps this
  // test what it was — proof that choosing Random deals and then holds.
  await page.selectOption('[data-sort]', 'earliest');
  await expect.poll(() => leaders(page)).toBe('St. Moses the Prophet and God-seer');
  const earliest = await leaders(page);

  await page.selectOption('[data-sort]', 'random');
  await expect.poll(() => leaders(page)).not.toBe(earliest);
  const dealt = await leaders(page);
  // The count is untouched: an order is not a filter.
  await expect(page.locator('[data-count]')).toHaveText('405');

  await page.locator('[data-query]').fill('  ');
  await expect(page.locator('[data-count]')).toHaveText('405');
  expect(await leaders(page)).toBe(dealt);
});

/* ---- the site's language (Amendment 36) --------------------------------- */

test('the language control offers five, each naming itself in its own tongue', async ({ page }) => {
  /*
   * Author, 2026-08-24. A globe mark and the current code between the
   * calendar control and the theme toggle; the panel offers each language in
   * its own name — «Русский», not "Russian" — because the reader who needs
   * the control is precisely the one who may not read the language the site
   * is currently in. Each choice carries its own lang attribute so a screen
   * reader pronounces it in that language.
   */
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const open = page.locator('#lang-open');
  await expect(open).toHaveText('EN');
  await expect(open.locator('svg')).toHaveCount(1);
  await expect(open).toHaveAttribute('aria-label', /English/);

  await open.click();
  const choices = page.locator('#lang-panel [data-language]');
  await expect(choices).toHaveCount(5);
  await expect(choices.locator('.choice-name')).toHaveText([
    'English', 'Русский', 'Română', 'Ελληνικά', 'Српски',
  ]);
  await expect(choices.nth(1)).toHaveAttribute('lang', 'ru');
  // The author's codes — GR and RS, not the BCP tags.
  await expect(choices.locator('.choice-calendar')).toHaveText(['EN', 'RU', 'RO', 'GR', 'RS']);
});

test('choosing Russian redraws the page in Russian, dates included, and it holds across a reload', async ({ page }) => {
  await ready(page);
  await page.goto('/calendar/2026-08-26', { waitUntil: 'networkidle' });
  await page.locator('#lang-open').click();
  await page.locator('#lang-panel [data-language="ru"]').click();

  // The whole chrome, live, with no reload: the document's language, the
  // nav, the header's church control (through the same STRINGS the packs
  // merge over), the date through Intl — which is why the formatters are a
  // per-language cache and not module constants — and the title.
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('ru');
  await expect(page.locator('.site-nav a').first()).toHaveText('Сегодня');
  await expect(page.locator('#church-open')).toHaveText('Русская');
  // Capitalised, and the month's own abbreviation dot dropped (author,
  // 2026-08-25). Said plainly because it is a departure: lower case is
  // correct Russian orthography for a weekday and a month, and «авг.» wants
  // its dot; the author asked for capitals and no dot, and only the weekday
  // and month parts are touched — the literal «2026 г.» keeps the dot that
  // belongs to a different word.
  await expect(page.locator('h1')).toHaveText('Среда, 26 Авг 2026 г.');
  await expect(page).toHaveTitle(/Православный святой/);
  // The fast line: label and recurring reason translated, the cycle line
  // deliberately not — it is composed in English by lib/liturgy.js, the
  // recorded seam of Amendment 36.
  // 26 August: days.pravoslavie.ru printed «Успенский пост; сухоядение», so
  // the grade leads the line, in Russian, from the pack's own vocabulary.
  await expect(page.locator('[data-liturgy]')).toContainText('Сухоядение - Успенский пост');
  await expect(page.locator('[data-liturgy]')).toContainText('Глас 3');

  // And it is a setting, not a session: the reload comes back Russian.
  await page.reload({ waitUntil: 'networkidle' });
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('ru');
  await expect(page.locator('.site-nav a').first()).toHaveText('Сегодня');
  await expect(page.locator('#lang-open')).toHaveText('RU');
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
    await page.addInitScript(
      (l) => localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: l })),
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

test('the Index speaks the chosen language, saints excepted', async ({ page }) => {
  // The boundary of Amendment 36, asserted from both sides: the chrome is
  // Serbian, the corpus is not — names and lives stay English by decision
  // (a machine-translated life is Amendment 2's forbidden invention), and
  // the source-language material is already on the page elsewhere.
  await ready(page);
  await page.addInitScript(() =>
    localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'sr' })),
  );
  await page.goto('/saints', { waitUntil: 'networkidle' });
  await expect(page.locator('h1')).toHaveText('Сви светитељи');
  // Pinned in a known order, because the Random default would hand this
  // assertion a different first card each run. The leader is read off the
  // screen: a re-sort repositions the cards without reordering the DOM.
  await page.selectOption('[data-sort]', 'earliest');
  await expect(page.locator('[data-sort] option:checked')).toHaveText('Најранији прво');
  await expect(page.locator('[data-set-aside]')).toContainText('Руска');
  /*
   * And here is exactly where the boundary now falls, which is worth being
   * blunt about: **the honorific translates and the name does not.** The
   * author asked on 2026-08-25 for the saints' names themselves to be
   * Romanian in Romanian, Russian in Russian ("St Titus the Apostle should be
   * Sf Apostol Tit"). The honorific is chrome and is a closed set of five
   * words, so it moved; the 708 names are corpus, and there is no source in
   * this repository that gives them in four languages. Inventing them would
   * be Amendment 2's forbidden content, so what ships is the honest halfway
   * house — «Св.» before an English name — and the rest is sourcing work
   * recorded in HANDOFF's queue.
   */
  await expect.poll(() => leaders(page)).toBe('Св. Moses the Prophet and God-seer');
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

  const first = cards.first();
  await expect(first.locator('.index-name')).toHaveText('St. Agapius of Gaza');
  await expect(first.locator('.index-dates')).toContainText('304–306');
  // Every row is a card: a media box even with no picture, so the column of
  // names stays a column, and its own Save.
  await expect(cards.locator('.index-media')).toHaveCount(6);
  await expect(cards.locator('.bookmark')).toHaveCount(6);
  // The hero is not repeated among them.
  await expect(page.locator('.register-cards')).not.toContainText('Pitirim');

  // Saving from a register row is the same Save as everywhere else, and the
  // saint's own page agrees without a reload.
  await first.locator('.bookmark').click();
  await expect(first.locator('.bookmark')).toHaveAttribute('aria-pressed', 'true');
  await first.locator('.index-name').click();
  await expect(page.locator('h1.saint-name')).toHaveText('St. Agapius of Gaza');
  await expect(page.locator('.saint-head .bookmark')).toHaveAttribute('aria-pressed', 'true');
});

test('there is one bookmark drawing, on an icon and on the page alike', async ({ page }) => {
  /*
   * Author, 2026-08-24: "There are two bookmark visuals. One with an outline,
   * one that is 50% opacity... Replace the former with the latter in all
   * cases, remove the outline version completely." There never were two
   * components — there was one mark with a gesso halo under it, and over a
   * dark icon the halo was all that showed, so the reader met an outlined
   * bookmark on a card with a picture and a filled one everywhere else.
   *
   * The halo is gone from the markup, which is what makes this checkable:
   * every bookmark on the site is now one path, at half opacity until saved.
   * Legibility over an image is a drop shadow — the ground pushed away from
   * the shape rather than a second shape drawn around it.
   */
  await ready(page);
  await page.goto('/calendar/2026-09-01', { waitUntil: 'networkidle' });
  await expect(page.locator('.bm-halo')).toHaveCount(0);
  const shapes = await page.locator('.bookmark-mark').evaluateAll((marks) =>
    marks.map((m) => {
      const paths = m.querySelectorAll('path');
      const style = getComputedStyle(paths[0]);
      return { paths: paths.length, opacity: style.opacity, fill: style.fill, stroke: style.stroke };
    }),
  );
  expect(shapes.length).toBeGreaterThan(3);
  // One path each, one fill, one opacity — no second rendering anywhere.
  expect(new Set(shapes.map((s) => s.paths))).toEqual(new Set([1]));
  expect(new Set(shapes.map((s) => s.opacity))).toEqual(new Set(['0.5']));
  expect(new Set(shapes.map((s) => s.fill)).size).toBe(1);
  expect(new Set(shapes.map((s) => s.stroke)).size).toBe(1);
  // The shadow is only where a picture is under it; on the page's own ground
  // the mark has all the contrast it needs and a shadow would be furniture.
  const filters = await page.evaluate(() => {
    const on = (sel) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el.querySelector('.bookmark-mark')).filter : null;
    };
    return {
      overImage: on('.index-card:has(.index-media img) '),
      onGround: on('.register-cards .reg-card:has(.index-media.is-empty)'),
    };
  });
  expect(filters.onGround).toBe('none');

  // And it fills to full strength when saved — the second of the two states,
  // which is all the states there are.
  const mark = page.locator('.register-cards .bookmark').first();
  await mark.click();
  await expect
    .poll(() => mark.locator('.bm-shape').evaluate((p) => getComputedStyle(p).opacity))
    .toBe('1');
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
  await expect(bubble.locator('.fast-allows')).toHaveText('Oil and wine are permitted.');
  await expect(bubble).not.toContainText('Xerophagy');
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

test('a day whose calendar named no allowance says that much and stops', async ({ page }) => {
  /*
   * The honest silence, which is the whole reason the grade is read and not
   * computed. 25 August in the Serbian calendar is a fast — the Dormition
   * Fast — and pravoslavno.rs printed «Пост (означен у календару)» beside it,
   * which says *that* it is a fast and not what it allows. So the line says
   * "Fast" with no grade in front of it, and the bubble says what every fast
   * sets aside and refuses to guess the rest.
   */
  await ready(page, { church: 'serbian' });
  await page.goto('/calendar/2026-08-25', { waitUntil: 'networkidle' });
  const fast = page.locator('[data-liturgy] .fast');
  await expect(fast).toHaveAttribute('data-grade', '');
  await expect(page.locator('[data-liturgy]')).toContainText('Fast - the Dormition Fast');
  await fast.click();
  const bubble = page.locator('.fast-bubble');
  await expect(bubble.locator('.fast-allows')).toContainText('Meat, dairy and eggs are set aside');
  await expect(bubble.locator('.fast-allows')).toContainText('no finer rule');
  await expect(bubble.locator('.fast-note')).toHaveText('пост (as marked on the month calendar)');
});

test('a fast-free day says so, and quotes nothing it was not given', async ({ page }) => {
  // The other side: a day with no fast opens the same bubble and prints no
  // quotation at all, because for that day nobody printed one. A heading over
  // an empty quotation would be the furniture DESIGN.md 5b refuses.
  await ready(page, { church: 'russian' });
  await page.goto('/calendar/2026-09-01', { waitUntil: 'networkidle' });
  await page.locator('[data-liturgy] .fast').click();
  const bubble = page.locator('.fast-bubble');
  await expect(bubble.locator('.fast-allows')).toContainText('Not a fast.');
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
  await page.addInitScript(() =>
    localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'ru' })),
  );
  await page.goto('/calendar/2026-08-24', { waitUntil: 'networkidle' });
  // «Успенский пост; сухоядение» → the xerophagy grade, in Russian.
  await expect(page.locator('[data-liturgy]')).toContainText('Сухоядение - Успенский пост');
  await page.locator('[data-liturgy] .fast').click();
  const bubble = page.locator('.fast-bubble');
  await expect(bubble.locator('.fast-allows')).toHaveText('Неварёная пища, без масла и вина.');
  await expect(bubble.locator('.fast-note')).toHaveAttribute('lang', 'ru');
  await ctx.close();
});

test('under reduced motion the bubble does not pop, it is simply there', async ({ browser }) => {
  // Removed, not shortened (DESIGN.md §6): no scale, no fade, no wait.
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
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

test('a saint page carries the saint own hymns, the reader church first', async ({ page }) => {
  /*
   * Author, 2026-08-25: "on each Saint Profile page, add their hymns at the
   * bottom." Adrian of Nicomedia has nine, from all four calendars - 50 of
   * the 132 saints with hymns have them from more than one - so the church is
   * named on each, which on the Daily page it never needs to be. The reader's
   * own church leads, because that is the calendar the site is read in.
   */
  await ready(page, { church: 'greek' });
  await page.goto('/saints/adrian-of-nicomedia', { waitUntil: 'networkidle' });
  const hymns = page.locator('.saint-hymns .hymn');
  await expect(hymns).toHaveCount(9);
  await expect(hymns.first().locator('.hymn-kind')).toContainText('Greek');
  // Untranslated, in the source's own tongue, tagged so a screen reader knows.
  await expect(hymns.first().locator('.hymn-text')).toHaveAttribute('lang', 'el');
  // And a saint the corpus has no hymns for prints no heading over nothing.
  await page.goto(DETAIL, { waitUntil: 'networkidle' });
  await expect(page.locator('.saint-hymns')).toHaveCount(0);
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
    await page.addInitScript(
      (a) => localStorage.setItem('gos-settings', JSON.stringify({ church: a.c, language: a.l })),
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
  await page.addInitScript(() =>
    localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'ro' })),
  );
  await page.goto('/calendar/2026-08-23', { waitUntil: 'networkidle' });
  await expect(page.locator('.readings .reading-label').first()).toHaveText('Apostol');
  await expect(page.locator('.readings-source')).toContainText('Cornilescu');
  await ctx.close();
});

test('About offers a way to write, and it goes to the repository', async ({ page }) => {
  /*
   * Author, 2026-08-25: a contact option, "or even better if they can be
   * stored in the github repo by some built-in affordance so my name doesn't
   * get too involved". Issues are that affordance: no address is printed, no
   * form is posted anywhere, and a static site needs no server to receive
   * one. The trade - that an issue is public - is told to the reader before
   * they open one rather than after.
   */
  await ready(page);
  await page.goto('/about', { waitUntil: 'networkidle' });
  const contact = page.locator('section.contact');
  await expect(contact.locator('h2')).toHaveText('Contact');
  const link = contact.locator('a');
  await expect(link).toHaveAttribute('href', /github\.com\/.+\/issues\/new/);
  await expect(contact).toContainText('can be read by anyone');
  // No address of the author's anywhere on the page, which is the whole point.
  expect(await page.content()).not.toContain('mailto:');
  expect(await page.locator('body').textContent()).not.toMatch(/@[\w.-]+\.(com|org|ro)/);
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
   * it"). The decision it announced still stands — the hymns are the source's
   * own language, untranslated — so what this heir pins is both halves: the
   * note is gone in every language, and the hymns under it are still the
   * source's own text, which is the thing the note was talking about.
   */
  await ready(page);
  await page.goto('/calendar/2026-09-11', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-hymns] .hymn-own')).toHaveCount(0);
  await expect(page.locator('[data-hymns] .hymn-text[lang="cu"]').first()).toContainText('Память праведнаго');

  await page.locator('#lang-open').click();
  await page.locator('#lang-panel [data-language="ru"]').click();
  await expect(page.locator('[data-hymns] .hymn-own')).toHaveCount(0);
  await expect(page.locator('[data-hymns] .hymn-text[lang="cu"]').first()).toContainText('Память праведнаго');
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

test('no date carries dots, at either grain', async ({ page }) => {
  /*
   * Author, 2026-08-25 evening: "remove the dots under each date in the
   * calendar." They stood under every date at both grains from the first
   * calendar; DESIGN.md's "Dense against sparse" argued them and now records
   * the reversal in place.
   *
   * The count they drew is not gone, and this says where it went: the day
   * button's accessible name. That is a divergence between what is seen and
   * what is spoken, and it is deliberate — a reader who cannot glance at the
   * register has no other way to learn a day's weight before opening it.
   */
  await ready(page);
  await page.goto('/calendar/2026-08-25', { waitUntil: 'networkidle' });
  await expect(page.locator('.density')).toHaveCount(0);
  await expect(page.locator('.week-strip i')).toHaveCount(0);
  await expect(page.locator('.week-strip [data-iso="2026-08-25"]')).toHaveAttribute(
    'aria-label',
    /^Tuesday, 25 August 2026 - \d+ commemorations$/,
  );

  await page.locator('[data-month]').click();
  await page.waitForTimeout(600);
  await expect(page.locator('.density')).toHaveCount(0);
  await expect(page.locator('.month-grid i')).toHaveCount(0);
});

test('a register row keeps its bookmark on the row, however long the name', async ({ page }) => {
  /*
   * Author, 2026-08-25 evening: "the row card for St Bartholomew on mobile
   * pushes the bookmark to the next line instead of remaining pinned to the
   * right side as it should be."
   *
   * The cause was inherited, not written: Also commemorated became *cards*
   * the evening before (Amendment 38) and picked up the text register's
   * narrow rule, `.register li { flex-wrap: wrap }`, which is there so a
   * feast date can drop under a name. A card row is a fixed three-part shape
   * and its body is the elastic one; the mark holds the trailing edge and the
   * name clips instead.
   */
  await page.setViewportSize({ width: 360, height: 780 });
  await ready(page, { church: 'greek' });
  await page.goto('/calendar/2026-08-25', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const row = page.locator('.reg-card', { hasText: 'Bartholomew' }).first();
  await expect(row).toBeVisible();
  const placed = await row.evaluate((li) => {
    const card = li.getBoundingClientRect();
    const mark = li.querySelector('.bookmark').getBoundingClientRect();
    const name = li.querySelector('.index-name').getBoundingClientRect();
    return { card, mark, name };
  });
  // One line: the mark's middle is the card's middle, not a row below it.
  expect(Math.abs(placed.mark.top + placed.mark.height / 2 - (placed.card.top + placed.card.height / 2)))
    .toBeLessThan(2);
  // At the trailing edge, and to the right of the name rather than under it.
  expect(placed.card.right - placed.mark.right).toBeLessThan(20);
  expect(placed.mark.left).toBeGreaterThan(placed.name.right - 1);
  // And the row is still one thumbnail tall.
  expect(placed.card.height).toBeLessThan(80);
});

test('the four pages hold one line in every pack, at every width', async ({ browser }) => {
  /*
   * Author, 2026-08-25 evening: switching to Russian "the buttons for Daily,
   * All Saints, Map and About pages go into two rows because the content
   * column on the screen is too narrow. Make sure this never displays like
   * that."
   *
   * The header's wide grid used to hand the nav the *leftovers* of a `1fr`
   * track, and in Russian, Greek and Serbian what was left was narrower than
   * the four labels. Which of the two gives way is the whole decision, and
   * the nav wins: the four pages are how the site is used, the masthead is a
   * constant learnt once. So the nav has its own `auto` track and the name
   * pays in lines — «Ορθοδοξία / Καθημερινά», every word intact.
   *
   * The arithmetic is why there is no third option: at the 72ch column the
   * one-line row needs 678 px in Russian, 695 in Greek and 672 in Serbian
   * where 580 exist. Those three cannot hold one line at any gap.
   */
  // One context per pack, resized across the widths, rather than thirty cold
  // loads: the header is laid out from the same stylesheet either way, and
  // thirty of them do not fit a test's budget.
  for (const [language, church] of [
    ['en', 'russian'],
    ['ru', 'russian'],
    ['ro', 'romanian'],
    ['el', 'greek'],
    ['sr', 'serbian'],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(
      (a) => localStorage.setItem('gos-settings', JSON.stringify({ church: a.c, language: a.l })),
      { c: church, l: language },
    );
    await page.goto('/calendar/2026-08-25', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    for (const width of [320, 360, 480, 560, 700, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const seen = await page.evaluate(() => {
        const nav = document.querySelector('.site-nav');
        const links = [...nav.querySelectorAll('a')];
        const box = nav.getBoundingClientRect();
        return {
          rows: new Set(links.map((a) => Math.round(a.getBoundingClientRect().top))).size,
          // Each label on one line of its own, too: `nowrap` on the row is
          // honoured by shrinking the anchors unless the anchors refuse.
          tallest: Math.max(...links.map((a) => a.getBoundingClientRect().height)),
          overhang: Math.max(...links.map((a) => a.getBoundingClientRect().right)) - box.right,
          doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      const where = `${language} at ${width}`;
      expect(seen.rows, where).toBe(1);
      expect(seen.tallest, where).toBeLessThan(28);
      expect(seen.overhang, where).toBeLessThan(1);
      expect(seen.doc, where).toBe(0);
    }
    await ctx.close();
  }
});

test('the chrome prints no em dashes, in any language', async ({ browser }) => {
  /*
   * Author, 2026-08-25 evening: "replace all emm dashes with normal dashes."
   * Swept across every string the site prints — ui/strings.js, the four
   * packs, the phrases lib/liturgy.js composes, the document title — by a
   * scanner that knows a string literal from a comment, so the house's own
   * prose keeps its em dashes and the reader gets none.
   *
   * What is deliberately *not* swept is the corpus. Those em dashes are
   * inside quoted source text and citation lines transcribed from four
   * synaxaria — 3,638 of them — and editing a quotation for typography is the
   * one thing Amendment 2 forbids. So this reads the chrome, element by
   * element, rather than the whole page: the exception is real and is named
   * here rather than left to be discovered.
   */
  for (const [language, church] of [
    ['en', 'russian'],
    ['ru', 'russian'],
    ['ro', 'romanian'],
    ['el', 'greek'],
    ['sr', 'serbian'],
  ]) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.addInitScript(
      (a) => localStorage.setItem('gos-settings', JSON.stringify({ church: a.c, language: a.l })),
      { c: church, l: language },
    );
    for (const url of ['/calendar/2026-08-25', '/saints', '/about']) {
      await page.goto(url, { waitUntil: 'networkidle' });
      const dashed = await page.evaluate(() => {
        const chrome = [
          'header.chrome',
          '.site-nav',
          '[data-liturgy]',
          '.index-controls',
          '.tray',
          '.hero-dates',
          '.index-dates',
          '.reg-title',
          'h1',
          'h2',
        ];
        const found = [];
        for (const sel of chrome) {
          for (const el of document.querySelectorAll(sel)) {
            if (el.textContent.includes('—')) found.push(`${sel}: ${el.textContent.slice(0, 60)}`);
          }
        }
        return found;
      });
      expect(dashed, `${language} ${url}`).toEqual([]);
      expect(await page.title(), `${language} ${url}`).not.toContain('—');
    }
    await ctx.close();
  }
});

test('a lifespan with nothing at either end says Undated, capitalised', async ({ page }) => {
  // Author, 2026-08-25 evening: "instead of lowercase 'undated', replace it
  // with uppercase, 'Undated'". Standing alone under a name it is a label
  // rather than a word in a sentence — the same departure the dates' capitals
  // are, and made in all five packs so none of them disagrees with itself.
  await ready(page, { church: 'russian' });
  await page.goto('/calendar/2026-08-25', { waitUntil: 'networkidle' });
  const dates = page.locator('.reg-card .index-dates');
  await expect(dates.filter({ hasText: 'Undated' }).first()).toBeVisible();
  await expect(dates.filter({ hasText: /^undated$/ })).toHaveCount(0);
});

test('All Saints says what it is by being it, with no line under the heading', async ({ page }) => {
  // Author, 2026-08-25 evening: "remove 'The whole corpus, filterable.' from
  // under the All Saints page." The count note under the controls already
  // says how much of the corpus this calendar keeps, and a search box over a
  // grid of saints is not improved by a sentence saying it is one.
  await ready(page);
  await page.goto('/saints', { waitUntil: 'networkidle' });
  await expect(page.locator('h1')).toHaveText('All Saints');
  await expect(page.locator('.index-lede')).toHaveCount(0);
  await expect(page.locator('#view')).not.toContainText('The whole corpus');
  // And the heading still has the controls straight under it.
  const [h1, controls] = [
    await page.locator('h1').boundingBox(),
    await page.locator('.index-controls').boundingBox(),
  ];
  expect(controls.y - (h1.y + h1.height)).toBeLessThan(24);
});

test('the type filter is named in words, in the reader own language', async ({ browser }) => {
  /*
   * Author, 2026-08-25 evening: "add the other language equivalents of the
   * search terms like 'abbot', and make all the search terms have a capital
   * letter at the start, like 'Abbot'."
   *
   * The corpus keeps the slug, because the filter matches on it; what changes
   * is that a slug is no longer what a reader is shown. The 44 types are
   * named in ui/strings.js and in each pack, and lib/saint-types.js is the
   * one crossing between key and name — including the fallback that turns a
   * type nobody has named yet into a word rather than a slug.
   */
  for (const [language, first, sample] of [
    ['en', 'Abbess', 'Abbot'],
    ['ru', 'Апологет', 'Игумен'],
    ['ro', 'Apologet', 'Stareț'],
    ['el', 'Αγιογράφος', 'Ηγούμενος'],
    ['sr', 'Апологета', 'Игуман'],
  ]) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.addInitScript(
      (l) => localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: l })),
      language,
    );
    await page.goto('/saints', { waitUntil: 'networkidle' });
    // A closed disclosure: the chips are the summaries, the labels are inside.
    await page.locator('[data-facet="types"] > summary').click();
    const labels = page.locator('[data-facet="types"] label');
    await expect(labels.filter({ hasText: sample }).first(), language).toBeVisible();
    // Every one of them starts with a capital, which is the instruction, and
    // none of them is the slug underneath. Not "no hyphens": "Passion-bearer"
    // is a hyphenated *word*, and a rule that banned the mark would ban the
    // English for παθοφόρος along with `fool-for-christ`.
    const seen = await labels.allTextContents();
    for (const text of seen) {
      const word = text.trim();
      // Not a round trip through toLocaleUpperCase: Greek drops the tonos in
      // upper case, so «Όσιος» would have to equal «Ο» to pass. The claim is
      // simply that the first letter is not a lower-case one, in any script.
      expect(word, `${language}: ${word}`).not.toMatch(/^\p{Ll}/u);
    }
    for (const slug of ['venerable-martyr', 'fool-for-christ', 'equal-to-the-apostles']) {
      expect(seen.map((t) => t.trim()), `${language}: ${slug}`).not.toContain(slug);
    }
    // Collated in the reader's own language, not by the slug underneath: the
    // list read Игумения, Игумен, Апологет, Апостол until it was.
    expect(seen[0].trim(), language).toBe(first);
    await ctx.close();
  }
});

test('a saint is found by the type name in any of the five languages', async ({ page }) => {
  /*
   * The other half of the same instruction. The index is built once and the
   * chrome's language can change under it, so every language's name for a
   * type goes in at once rather than the current one — a reader who switches
   * would otherwise be searching a Russian grid with Romanian words.
   */
  await ready(page);
  await page.goto('/saints', { waitUntil: 'networkidle' });
  // Ordered by name, because the grid is virtualised: only the cards near the
  // viewport are in the DOM at all, so "is he on the page" is a question about
  // where he sorts as much as about whether he matched. Alexander of Svir is
  // the second abbot alphabetically, which puts him in the first window of any
  // result set that holds him.
  await page.selectOption('[data-sort]', 'name');
  const query = page.locator('[data-query]');
  const abbot = page.locator('.index-name', { hasText: 'Alexander of Svir' });
  // A retrying assertion, not a fixed wait: the search index is imported and
  // built lazily, and a timeout long enough on this machine is a flake on a
  // loaded runner.
  const finds = async (text, count) => {
    await query.fill(text);
    await expect(abbot, text).toHaveCount(count);
  };
  /*
   * Alexander of Svir is `venerable, abbot` in the manifest, and he is
   * reached by the English name, the Russian, the Greek and by the slug
   * underneath — which is what keeps an old bookmarked query working.
   *
   * Presence rather than an equal count, and the difference is the test's
   * own honesty: MiniSearch runs prefix and fuzzy matching, so «игумен» also
   * reaches «Игумения», the abbesses. The claim being made is that each name
   * finds the abbots, not that four different queries are the same query.
   */
  for (const term of ['Abbot', 'abbot', 'игумен', 'Ηγούμενος', 'Stareț']) {
    await finds(term, 1);
  }
  // And a word from no vocabulary at all finds nothing, so the five above are
  // matching something rather than everything.
  await finds('zzzzq', 0);
});
