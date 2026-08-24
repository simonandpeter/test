import { test, expect } from '@playwright/test';
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
  await expect(page.locator('.hero-name')).toHaveText('St Anthony the Great');
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
  await expect(page.locator('.hero-name')).toHaveText('St Anthony the Great');
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

  await expect(page.locator('h1.saint-name')).toHaveText('St Anthony the Great');
  // Multi-script name forms are how "attest, never adjudicate" appears on
  // screen (Addendum C3), so their presence is a requirement, not a detail.
  await expect(page.locator('.names span[lang="grc"]')).toHaveText('Ἀντώνιος');
  await expect(page.locator('.names span[lang="cop"]')).toHaveText('Ⲁⲛⲧⲱⲛⲓⲟⲥ');

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
  await expect(rows.nth(0)).toContainText('Coma — Qiman al-Arus, Egypt');
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
  await expect(page.locator('h1.saint-name')).toHaveText('St Christopher');
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
  // card classes, so the two read as one register — with the × stacked over
  // the bookmark at the trailing edge, and both above the link's ::after so
  // a press removes or saves rather than opens.
  const shelfRow = shelf.locator('.index-card.is-row.shelf-row').first();
  await expect(shelfRow).toBeVisible();
  await expect(shelfRow.locator('.index-name')).toContainText('Moses the Hungarian');
  await expect(shelfRow.locator('.bookmark')).toHaveCount(1);
  const stack = await shelfRow.evaluate((row) => {
    const x = row.querySelector('.shelf-tools .shelf-remove').getBoundingClientRect();
    const mark = row.querySelector('.shelf-tools .bookmark').getBoundingClientRect();
    const card = row.getBoundingClientRect();
    return { x, mark, card };
  });
  expect(stack.x.bottom).toBeLessThanOrEqual(stack.mark.top + 1); // × above the bookmark
  expect(stack.card.right - stack.x.right).toBeLessThan(20); // in the top right
  expect(stack.x.top - stack.card.top).toBeLessThan(20);

  // And it can be dismissed: a shelf the reader cannot clear is a nag.
  await shelf.locator('.shelf-remove').first().click();
  await expect(shelf).not.toContainText('Continue reading');
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
  await expect(page.locator('h1.saint-name')).toHaveText('St Anthony the Great');
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
  await expect(page.locator('h1.saint-name')).toHaveText('St Anthony the Great');
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
  // about their standing.
  await expect(page.locator('[data-sort]')).toHaveValue('earliest');
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
  const card = page.locator('.index-card:has(.index-media)').first();
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

  // A hundred and fifty-eight lives touch 240–460 and a hundred and forty-six
  // sit inside it (the counts of the 708-saint corpus of Amendment 31,
  // recomputed with .tmp/counts2.mjs): the Roman martyrs of 258, the
  // Nicomedians of 305 and the martyrs of the Great Persecution are inside;
  // Paul of Thebes (born 220), the third- and fourth-century bishops dated
  // only to their century and Moses the Hungarian with his open birth bound
  // overlap it without being contained.
  await expect(page.locator('[data-count]')).toHaveText('158');
  await page.locator('input[name="rangeMode"][value="within"]').check();
  await expect(page.locator('[data-count]')).toHaveText('146');
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
  await expect(page.locator('.tray')).toContainText('239 undated');
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
  await query.fill('St John Chrysostom');
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
  const romanian = page.locator('.att', { hasText: 'Romanian' });
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
  await expect(page.locator('h1')).toHaveText(/28 June 2026/);
  await expect(page.locator('.day-panel')).toHaveCount(1);
  await expect(page.locator('.hero-name')).toHaveText('St Augustine of Hippo');
  await expect(page.locator('.empty-day')).toHaveCount(0);

  // And the day after the fast pair is clean too: the orphan used to persist.
  await day('2026-06-24').click();
  await expect(page.locator('h1')).toHaveText(/24 June 2026/);
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
   * until then, which meant they worked only after tabbing into it.
   */
  await ready(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });

  // Days are one click each.
  await page.locator('.week-strip [data-iso="2026-08-24"]').click();
  await expect(page.locator('h1')).toHaveText(/24 August 2026/);

  // The arrows, from the page body — no focus in the strip.
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('h1')).toHaveText(/25 August 2026/);
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('h1')).toHaveText(/24 August 2026/);

  // S and D beside them, for a hand that is not on the arrows.
  await page.keyboard.press('d');
  await expect(page.locator('h1')).toHaveText(/25 August 2026/);
  await page.keyboard.press('s');
  await expect(page.locator('h1')).toHaveText(/24 August 2026/);

  // A modifier means the key is the browser's: ctrl+D must stay a bookmark.
  await page.keyboard.press('Control+d');
  await expect(page.locator('h1')).toHaveText(/24 August 2026/);
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
  await expect(page.locator('h1')).toHaveText(/28 August 2026/);

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
  await expect(page.locator('h1')).toHaveText(/8 August 2026/);
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
  await expect(page.locator('h1')).toHaveText(/31 August 2026/);

  // Scrolling the rail is not a selection.
  await page.evaluate(() => {
    document.querySelector('.week-strip').scrollBy({ left: 200, behavior: 'instant' });
  });
  await page.waitForTimeout(300);
  await expect(page.locator('h1')).toHaveText(/31 August 2026/);
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
  await expect(page.locator('h1')).toHaveText(/27 August 2026/);
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
  await expect(page.locator('h1')).toHaveText(/31 August 2026/);
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
  await expect(page.locator('h1')).toHaveText(/28 August 2026/);
  expect(await strip.evaluate((el) => el.classList.contains('is-dragging'))).toBe(true);

  await page.mouse.up();
  await page.waitForTimeout(450);
  // Released: it settles onto a day — any day, not a Monday — and the click
  // that ended the drag chose nothing.
  await expect(page.locator('h1')).toHaveText(/28 August 2026/);
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

  await expect(page.locator('.index-lede')).toHaveText('The whole corpus, filterable.');

  // The two rows this pass collapsed, measured directly. Both are one line
  // high and stay one line high in either face — unlike the grid's position,
  // which moves 31 px between them, because font-display: optional means the
  // facet summaries wrap differently in the fallback and a cold load really
  // does get the fallback.
  const heightOf = async (sel) => Math.round((await page.locator(sel).boundingBox()).height);
  expect(await heightOf('.index-lede'), 'the lede is back to two lines').toBeLessThan(34);
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

test('the header carries no date, and the corner holds two controls', async ({ page }) => {
  // Today's date stood under the theme control from 2026-08-21 to 2026-08-22
  // and is withdrawn; the corner is the calendar control — which names the
  // church the site reads — and the icon toggle, one line, and the bar is no
  // taller than it was with the date (61 px desktop).
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.chrome-today')).toHaveCount(0);
  await expect(page.locator('#church-open')).toHaveText('Russian');
  await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-label', /Switch to the (dark|light) theme/);
  const m = await page.evaluate(() => {
    const header = document.querySelector('header.chrome').getBoundingClientRect();
    const open = document.querySelector('#church-open').getBoundingClientRect();
    const theme = document.querySelector('#theme-toggle').getBoundingClientRect();
    return {
      header: header.height,
      sameLine: Math.abs(open.top + open.height / 2 - (theme.top + theme.height / 2)) < 4,
      themeAfter: theme.left >= open.right,
      wide: innerWidth >= 560,
    };
  });
  expect(m.sameLine).toBe(true);
  expect(m.themeAfter).toBe(true);
  if (m.wide) expect(m.header).toBeLessThan(64);
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
  await expect(page.locator('h1')).toHaveText(/31 August 2026/);
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
  await expect(
    page.locator('.week-row:not(.grain-side) [data-iso="2026-06-28"] .density i'),
  ).toHaveCount(0);

  // And in the month, which counts the same entries.
  await page.locator('[data-month]').click();
  await page.waitForTimeout(600);
  await expect(page.locator('.month-row:not(.grain-side) [data-iso="2026-06-28"] .density i'))
    .toHaveCount(0);

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

test('the question is asked once, and answering it is choosing', async ({ page }) => {
  // One question, not two (author, 2026-08-22): which calendar, by church —
  // three choices and nothing under them. Pressing one is the answer: the
  // question goes, the strip shows, and the choice is the site's.
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-ask]')).toBeVisible();
  await expect(page.locator('[data-ask] [data-church]')).toHaveCount(4);
  await expect(page.locator('[data-advanced]')).toHaveCount(0);
  await expect(page.locator('[data-ask-choice]')).toHaveCount(0);
  expect(await page.evaluate(() => document.querySelector('[data-cal-body]').hidden)).toBe(true);

  await page.locator('[data-ask] [data-church="romanian"]').click();
  await expect(page.locator('[data-ask]')).toHaveCount(0);
  expect(await page.evaluate(() => document.querySelector('[data-cal-body]').hidden)).toBe(false);
  await expect(page.locator('#church-open')).toHaveText('Romanian');
  // Focus goes somewhere that still exists: the strip's own chrome.
  expect(await page.evaluate(() => document.activeElement?.hasAttribute('data-today'))).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gos-settings')).church)).toBe('romanian');

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
  await expect(page.locator('h1.saint-name')).toHaveText('St Augustine of Hippo');
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
const ready = (page, { church = 'russian' } = {}) =>
  page.addInitScript(
    ({ church }) => {
      const key = 'gos-settings';
      const now = JSON.parse(localStorage.getItem(key) ?? '{}');
      if (typeof now.church !== 'string') localStorage.setItem(key, JSON.stringify({ ...now, church }));
    },
    { church },
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

test('on a first visit the question clears the fold, and the day does not', async ({ page }) => {
  // The one deliberate exception to the rule above (author, 2026-08-21;
  // revised 2026-08-22). A first visit is asked which calendar it keeps, and
  // nothing weekly or daily shows until it answers: what has to be above the
  // fold on that visit is the question and all three of its answers. Every
  // visit after it is the test above.
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const ask = await page.locator('[data-ask]').boundingBox();
  const choices = await page.locator('[data-ask] [data-church]').last().boundingBox();

  expect(ask.y + ask.height).toBeLessThan(780);
  expect(choices.y + choices.height).toBeLessThan(780);
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
  await expect(page.locator('.hero-name')).toHaveText('St Anthony the Great');

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
  await expect(page.locator('[data-ask]')).toHaveCount(0);
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
  await expect(page.locator('[data-set-aside]')).toContainText('303 saints are not in the Russian calendar');

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
  await expect(page.locator('[data-set-aside]')).toContainText('586 saints are not in the Romanian calendar');

  // Greek keeps three hundred and forty-four: the Synaxaristis lists most of
  // the four weeks, one entry per name.
  await open.click();
  await page.locator('#church-panel [data-church="greek"]').click();
  await expect(page.locator('[data-count]')).toHaveText('344');
  await expect(page.locator('[data-set-aside]')).toContainText('364 saints are not in the Greek calendar');
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

test('the site is The Orthodox Saint, and the habit page is Daily', async ({ page }) => {
  // Author, 2026-08-23. The name in the head and the page's nav label. The
  // header's own corner reads "Orthodoxy Daily" since (author, 2026-08-23,
  // later the same day) — a second, deliberately different name from the
  // head's. The veil carried the head's name until 2026-08-24 and now carries
  // the header's; that has a test of its own below. The route stays /calendar
  // so no link breaks.
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
  await expect(page.locator('[data-liturgy]')).toHaveText('12th Sunday after Pentecost · Tone 3 · Fast — the Dormition Fast');
  // The fast carries its kind, so the three states are told apart by colour
  // as well as by their wording (author, 2026-08-24).
  await expect(page.locator('[data-liturgy] .fast')).toHaveAttribute('data-fast', 'fast');
  // A life with no recorded beginning is read from its end (author,
  // 2026-08-24): the hero of this day, Lawrence of Kaluga, said
  // "undated – 1515" until then.
  await expect(page.locator('.hero-dates')).toHaveText('Entered eternal glory in 1515');
  // And Also commemorated reads as one company, not a ruled ledger: no line
  // between the saints (author, 2026-08-24; the shelves keep theirs).
  expect(
    await page.locator('.day-panel .register li').first().evaluate((li) => getComputedStyle(li).borderBottomWidth),
  ).toBe('0px');
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-liturgy]')).toContainText('Fast, fish permitted — a Great Feast on a Friday');
  await expect(page.locator('[data-liturgy] .fast')).toHaveAttribute('data-fast', 'fish');

  await openChooser(page);
  await page.locator('#church-panel [data-church="greek"]').click();
  await expect(page.locator('[data-liturgy]')).toHaveText('13th week after Pentecost · Tone 3 · Fast — Friday');
  await page.goto('/calendar/2026-08-23', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-liturgy]')).toHaveText('12th Sunday after Pentecost · Tone 3 · No fast');
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
  await expect(page.locator('.hero-name')).toHaveText('St Kosmas of Aetolia');
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
  await expect(page.locator('[data-liturgy]')).toHaveText('12th Sunday after Pentecost · Tone 3 · Fast — the Dormition Fast');
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
  await expect(page.locator('[data-liturgy]')).toHaveText('13th week after Pentecost · Tone 3 · No fast');

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
  await expect(page.locator('h1.saint-name')).toHaveText('St Eleutherius, Monk-martyr (1937)');
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
  await expect(page.locator('.hero-name')).toHaveText('St John the Baptist and Forerunner');
  await expect(page.locator('[data-hymns] .hymn-text[lang="cu"]').first()).toContainText('Память праведнаго с похвалами');

  await openChooser(page);
  await page.locator('#church-panel [data-church="serbian"]').click();
  await page.goto('/calendar/2026-09-18', { waitUntil: 'networkidle' });
  await expect(page.locator('.hero-name')).toContainText('Zacharias the Prophet');
  await expect(page.locator('[data-hymns] .hymn-text[lang="sr"]').first()).toContainText('Обучен у свештеничке одежде');
  await expect(page.locator('[data-readings] .readings a').first()).toHaveText('Ephesians 1:7-17');

  await page.goto('/saints/babylas-of-antioch', { waitUntil: 'networkidle' });
  await expect(page.locator('h1.saint-name')).toHaveText('St Babylas, Bishop of Antioch');
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
  expect(html).toContain('<div class="veil-name">Orthodoxy Daily</div>');
  expect(html).not.toContain('<div class="veil-name">The Orthodox Saint</div>');
  // The head keeps its own name, which is the half of the split that stands.
  expect(html).toContain('<title>The Orthodox Saint</title>');
});

test('the site mark is the Orthodox cross, and it spends no gold', async ({ page }) => {
  /*
   * Author, 2026-08-24. The favicon was one gold cell — the attested mark of
   * the veneration badge, which was removed whole at Amendment 25, so it had
   * been standing for a thing that no longer exists. It is now the
   * eight-pointed cross: upright, titulus, crossbar, and the slanted
   * footrest, whose slant is the whole of what makes it Orthodox rather than
   * Latin.
   *
   * Gold is the assertion that matters. DESIGN.md §2 reserves it for a
   * finding about veneration and nothing else, and a site mark is not one —
   * so the cross is drawn in ink, and this fails if anyone re-spends the
   * token here.
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
  // Ink, not gold, in either theme.
  expect(svg).toContain('#221d19');
  expect(svg.toLowerCase()).not.toContain('a98237');
  expect(svg.toLowerCase()).not.toContain('c79a4b');
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
  const gate = page.locator('[data-ask]');
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

test('the Index opens in earliest order, and says so', async ({ page }) => {
  /*
   * Author, 2026-08-24: Earliest took the default from Name. The control is
   * the half worth pinning — the <select> was written out option by option
   * with the default implied by their order, so it read "Name" while the grid
   * was already in Earliest order, and the label was lying about the list
   * under it.
   */
  await ready(page);
  await page.goto('/saints', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-sort]')).toHaveValue('earliest');
  await expect(page.locator('[data-sort] option:checked')).toHaveText('Earliest date');
  await expect(page.locator('.index-name').first()).toHaveText('St Moses the Prophet and God-seer');
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
  const first = page.locator('.index-name').first();
  await expect(first).toHaveText('St Moses the Prophet and God-seer');
  await page.selectOption('[data-sort]', 'latest');
  await expect(first).toHaveText('St Peter (Cheltsov), Archpriest, Confessor (1972)');
  await page.selectOption('[data-sort]', 'earliest');
  await expect(first).toHaveText('St Moses the Prophet and God-seer');
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
  const first = page.locator('.index-name').first();
  const earliest = await first.textContent();

  await page.selectOption('[data-sort]', 'random');
  const dealt = await first.textContent();
  expect(dealt).not.toBe(earliest);
  // The count is untouched: an order is not a filter.
  await expect(page.locator('[data-count]')).toHaveText('405');

  await page.locator('[data-query]').fill('  ');
  await expect(page.locator('[data-count]')).toHaveText('405');
  expect(await first.textContent()).toBe(dealt);
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
  await expect(page.locator('h1')).toHaveText('среда, 26 августа 2026 г.');
  await expect(page).toHaveTitle(/Православный святой/);
  // The fast line: label and recurring reason translated, the cycle line
  // deliberately not — it is composed in English by lib/liturgy.js, the
  // recorded seam of Amendment 36.
  await expect(page.locator('[data-liturgy]')).toContainText('Пост — Успенский пост');
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
  await expect(page.locator('[data-sort] option:checked')).toHaveText('Најранији прво');
  await expect(page.locator('[data-set-aside]')).toContainText('Руска');
  // The saint is still English, honorific included.
  await expect(page.locator('.index-name').first()).toHaveText('St Moses the Prophet and God-seer');
});
