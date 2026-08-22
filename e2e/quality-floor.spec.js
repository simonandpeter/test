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

// 30 January 2026: Anthony the Great, Eastern Orthodox (17 Jan Julian) and
// Coptic (22 Tobi) — two traditions reaching one Gregorian day by different
// calendar arithmetic, which makes it the most load-bearing date in the corpus.
const POPULATED = '/calendar/2026-01-30';
const EMPTY = '/calendar/2026-08-20';

// Anthony carries an image, three attested communions, name forms in Greek
// and Coptic, related saints and a life; Christopher is the awkward one —
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
    await page.goto(path, { waitUntil: 'networkidle' });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations.map((v) => v.id))).toEqual([]);
  });

  test(`no horizontal overflow: ${label}`, async ({ page }) => {
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
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  expect(errors).toEqual([]);
});

test('every interactive element takes visible keyboard focus', async ({ page }) => {
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
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('H1');

  await page.locator('.site-nav a[href$="/saints"]').click();
  await expect(page.locator('h1')).toHaveText('All Saints');
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.tagName))
    .toBe('H1');
});

test('the day is reachable by keyboard through the week strip', async ({ page }) => {
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const before = await page.locator('h1').first().textContent();
  await page.locator('.week-strip button').first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('h1').first()).not.toHaveText(before ?? '');
});

test('reduced motion removes animation rather than shortening it', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
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

test('a populated day renders hero, badge and each tradition in its own reckoning', async ({ page }) => {
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await expect(page.locator('.hero-name')).toHaveText('Anthony the Great');
  await expect(page.locator('.empty-day')).toHaveCount(0);

  // The hero carries the rite x communion matrix, not the communion badge:
  // thirteen cells, three of them attested in Anthony's case, and the count
  // in the label is the matrix's thirteen rather than the badge's four.
  const badge = page.locator('.hero svg.badge');
  await expect(badge).toHaveClass(/glyph-matrix/);
  await expect(badge).toHaveAttribute('aria-label', /Venerated in 3 of 13: /);
  await expect(badge.locator('circle')).toHaveCount(13);
  // Attested cells at full size and undocumented marks at a fraction of one:
  // the states have to stay apart by size and value, not by colour.
  await expect(badge.locator('circle[data-state="attested"]')).toHaveCount(3);
  const undocumented = badge.locator('circle[data-state="undocumented"]');
  await expect(undocumented).toHaveCount(10);
  const [attestedBox, undocumentedBox] = [
    await badge.locator('circle[data-state="attested"]').first().boundingBox(),
    await undocumented.first().boundingBox(),
  ];
  expect(undocumentedBox.width).toBeLessThan(attestedBox.width / 2);
  // Every mark is centred in its own cell rather than corner-anchored, so two
  // states in the same row share a vertical centre and the row reads as one
  // line instead of a stagger. Both of these are in Catholic's row.
  expect(Math.round(undocumentedBox.y + undocumentedBox.height / 2)).toBe(
    Math.round(attestedBox.y + attestedBox.height / 2),
  );

  const feasts = await page.locator('.hero-feasts li').allTextContents();
  expect(feasts.join(' | ')).toContain('17 January (Julian)');
  expect(feasts.join(' | ')).toContain('22 Tobi');
  // Nothing under the strip prints the day in another reckoning any more. The
  // line of equivalencies went when the toggle arrived, and the toggle went
  // when the tradition filter took its place (author, 2026-08-21).
  await expect(page.locator('.cal-reckonings')).toHaveCount(0);
  await expect(page.locator('.cal-reckoning')).toHaveCount(0);
  await expect(page.locator('.day-date')).toHaveCount(0);
});

test('an empty day is a designed state, not a hole', async ({ page }) => {
  await page.goto(EMPTY, { waitUntil: 'networkidle' });
  await expect(page.locator('.empty-day')).toHaveCount(1);
  await expect(page.locator('.hero')).toHaveCount(0);
  // The chrome stays: an empty day must still offer a way onward.
  await expect(page.locator('.week-strip button')).toHaveCount(7);
});

test('the hero image box is a square, cropped from the centre and the top', async ({ page }) => {
  // The box is reserved before the image decodes either way — a square is as
  // structural a guarantee against layout shift as a measured ratio was — but
  // on the habit page every day's saint now sits in the same box (author,
  // 2026-08-21). Anthony's icon is 369x501, so this is a real crop and not a
  // ratio that happened to be square already.
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

  await expect(page.locator('h1.saint-name')).toHaveText('Anthony the Great');
  // Multi-script name forms are how "attest, never adjudicate" appears on
  // screen (Addendum C3), so their presence is a requirement, not a detail.
  await expect(page.locator('.names span[lang="grc"]')).toHaveText('Ἀντώνιος');
  await expect(page.locator('.names span[lang="cop"]')).toHaveText('Ⲁⲛⲧⲱⲛⲓⲟⲥ');

  // Every church in the registry appears, including the ones we have not
  // sourced: an unchecked tradition is visible rather than absent.
  await expect(page.locator('.attestations .att')).toHaveCount(8);
  await expect(page.locator('.att-undocumented')).not.toHaveCount(0);
  await expect(page.locator('.attestations')).toContainText('Coptic Synaxarium');
  await expect(page.locator('.attestations')).toContainText('22 Tobi');

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
  // "the place of his death is not more closely fixed" is the finding. A
  // coordinate without it looks certain, which is the one thing this corpus
  // must never do.
  await page.goto('/saints/nestorius', { waitUntil: 'networkidle' });
  await expect(page.locator('.fact-note')).toContainText('not more closely fixed');
});

test('a saint with no life, no image and no birth date is still a whole page', async ({ page }) => {
  await page.goto(SPARSE_DETAIL, { waitUntil: 'networkidle' });
  await expect(page.locator('h1.saint-name')).toHaveText('Christopher');
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

test('saving persists across a reload, and both Save buttons agree', async ({ page }) => {
  // The saint's page carries the bookmark (author, 2026-08-22); the calendar
  // hero still carries the text button. Same store, one state.
  await page.goto(DETAIL, { waitUntil: 'networkidle' });
  const save = page.locator('.saint-head .bookmark');
  await expect(save).toHaveAttribute('aria-pressed', 'false');
  await save.click();
  await expect(save).toHaveAttribute('aria-pressed', 'true');
  await expect(save).toHaveAttribute('aria-label', /is saved/);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('.saint-head .bookmark')).toHaveAttribute('aria-pressed', 'true');

  // And the saved shelf on the habit page knows about it, as does the hero's
  // own Save button — Anthony is that day's hero.
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await expect(page.locator('.hero .save-button')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.shelves')).toContainText('Saved');
  await expect(page.locator('.shelves a[data-prefetch="anthony-the-great"]').first()).toBeVisible();
});

test('Continue reading reappears after a saint has been opened', async ({ page }) => {
  await page.goto('/saints/nestorius', { waitUntil: 'networkidle' });
  await page.goto(EMPTY, { waitUntil: 'networkidle' });

  const shelf = page.locator('.shelves');
  await expect(shelf).toContainText('Continue reading');
  await expect(shelf.locator('a[data-prefetch="nestorius"]')).toHaveCount(1);

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

  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const link = page.locator('.hero-name a');
  await link.hover();
  await page.waitForTimeout(300);
  const afterHover = fetched.length;
  expect(afterHover).toBe(1);

  await link.click();
  await expect(page.locator('h1.saint-name')).toHaveText('Anthony the Great');
  // The click reuses what the hover fetched rather than asking again.
  expect(fetched.length).toBe(afterHover);
});

test('the shared element is named once, on both sides of the navigation', async ({ page }) => {
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
  await expect(page.locator('h1.saint-name')).toHaveText('Anthony the Great');
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

  await expect(page.locator('[data-count]')).toHaveText('10');
  await expect(page.locator('.index-card').first()).toBeVisible();
  // Breadth of veneration is offered but is never the order the reader arrives
  // in: a corpus sorted by it would read as a ranking of importance.
  await expect(page.locator('[data-sort]')).toHaveValue('name');
  await expect(page.locator('input[name="rangeMode"][value="overlaps"]')).toBeChecked();
  await expect(page.locator('[data-clear]')).toBeHidden();
});

test('card boxes come from the manifest, not from measuring the image', async ({ page }) => {
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  const card = page.locator('.index-card').first();
  const media = card.locator('.index-media');
  const [cardBox, mediaBox] = [await card.boundingBox(), await media.boundingBox()];
  // Card height is the image box plus a fixed text block, and the image box is
  // the manifest's aspect ratio applied to the column width.
  expect(cardBox.height).toBeGreaterThan(mediaBox.height);
  expect(mediaBox.width / mediaBox.height).toBeGreaterThan(0.5);
});

test('filtering by church narrows the corpus and the count follows', async ({ page }) => {
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await (await facet(page, 'churches')).getByLabel('Coptic Orthodox').check();

  await expect(page.locator('[data-count]')).toHaveText('3');
  // The count is the corpus's answer; the DOM holds only the cards near the
  // viewport, which at 360 px is fewer than three.
  await expect(page.locator('.index-card:not(.leaving)').first()).toBeVisible();
  await expect(page.locator('[data-clear]')).toBeVisible();

  await page.locator('[data-clear]').click();
  await expect(page.locator('[data-count]')).toHaveText('10');
});

test('Overlaps and Entirely within are different questions, and both are offered', async ({ page }) => {
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await facet(page, 'dates');
  await page.locator('[data-from]').fill('240');
  await page.locator('[data-to]').fill('460');

  // Nine lives touch 240–460; seven of them sit inside it. Paul of Thebes was
  // born in 220 and Moses the Hungarian has an open birth bound, so neither is
  // contained by a range both of them overlap.
  await expect(page.locator('[data-count]')).toHaveText('9');
  await page.locator('input[name="rangeMode"][value="within"]').check();
  await expect(page.locator('[data-count]')).toHaveText('7');
});

test('a range that matches nobody is a designed state, not a hole', async ({ page }) => {
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await facet(page, 'dates');
  await page.locator('[data-from]').fill('1500');
  await page.locator('[data-to]').fill('1600');

  // Nobody in the corpus lived in the 16th century.
  await expect(page.locator('[data-count]')).toHaveText('0');
  await expect(page.locator('[data-empty]')).toBeVisible();
  await expect(page.locator('.index-card:not(.leaving)')).toHaveCount(0);
  // The undated tray has nothing to hold either: every saint in this corpus of
  // ten carries at least a death interval. Its behaviour is covered by the
  // unit tests, which can pose an undated saint without inventing a folder.
  await expect(page.locator('.tray')).toHaveCount(0);
});

test('search reaches names, types, churches and regions', async ({ page }) => {
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  const query = page.locator('[data-query]');

  await query.fill('hermit');
  // The count is the corpus's answer; the DOM holds only what is near the
  // viewport, which at 360 px is one card of the two.
  await expect(page.locator('[data-count]')).toHaveText('2');

  await query.fill('Alexandria');
  await expect(page.locator('.index-card').first()).toBeVisible();

  await query.fill('zzzznotasaint');
  await expect(page.locator('[data-empty]')).toBeVisible();
  await expect(page.locator('[data-count]')).toHaveText('0');
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
  await (await facet(page, 'churches')).getByLabel('Coptic Orthodox').check();
  await expect(page.locator('[data-count]')).toHaveText('3');

  await page.locator('[data-random]').click();
  await expect(page.locator('h1.saint-name')).toBeVisible();
  // Whoever it landed on, the Coptic row says Venerated: a random saint the
  // reader's own filters exclude would look like the filters had failed.
  const coptic = page.locator('.att', { hasText: 'Coptic Orthodox' });
  await expect(coptic).toContainText('Venerated');
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

  const last = page.locator('.index-name', { hasText: 'Paul of Thebes' });
  expect(await page.locator('.index-card').count()).toBeLessThan(10);
  await expect(last).toHaveCount(0);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(last).toHaveCount(1);
  // And the window still is one: what came into the document pushed something
  // else out of it.
  expect(await page.locator('.index-card').count()).toBeLessThan(10);
  await ctx.close();
});

test('the feast-month filter reckons each tradition in its own calendar', async ({ page }) => {
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await (await facet(page, 'months')).getByLabel('January').check();

  // Anthony (17 January, Roman Catholic), Athanasius (18 January, Coptic
  // 22 Tobi) and Paul of Thebes (15 January). Anthony's Julian feast lands on
  // 30 January and Athanasius's Coptic one on 26 January, both still January,
  // both arrived at by different arithmetic.
  await expect(page.locator('[data-count]')).toHaveText('3');
  await expect(page.locator('.index-name', { hasText: 'Anthony the Great' })).toHaveCount(1);
});

/* ---- the veneration glyph's place on the page --------------------------- */

/**
 * The glyph follows the name it belongs to, everywhere a name appears. DOM
 * order is the contract and is checked at both widths; the geometry only holds
 * where the line does not wrap, so it is checked on the wide viewport.
 *
 * One context is missing here and cannot be added honestly: the calendar's
 * "also commemorated" register never renders, because no day in a corpus of
 * ten has two saints on it.
 */
const glyphFollowsName = async (page, container, nameSelector) => {
  const line = page.locator(container).first();
  await expect(line.locator(`${nameSelector} + svg.badge`)).toHaveCount(1);

  const viewport = page.viewportSize();
  if (!viewport || viewport.width < 700) return;

  // Literata is font-display: optional, so on a cold load the fallback face
  // renders and the name is a different width until font loading settles.
  // Measuring before that is a coin toss about which face was on screen.
  await page.evaluate(() => document.fonts.ready);
  const name = await line.locator(nameSelector).first().boundingBox();
  const badge = await line.locator('svg.badge').first().boundingBox();
  expect(badge.x, `name box ${JSON.stringify(name)}, glyph box ${JSON.stringify(badge)}`)
    .toBeGreaterThan(name.x + name.width - 1);
  // On the same line, not stacked under it.
  expect(badge.y).toBeLessThan(name.y + name.height);
};

test('the glyph follows the saint own name on their page', async ({ page }) => {
  await page.goto(DETAIL, { waitUntil: 'networkidle' });
  await glyphFollowsName(page, '.saint-head .name-line', 'h1.saint-name');
  // The name carries the only glyph in the header, and the veneration section
  // below is now the church-by-church register alone — the standalone badge
  // that used to head it would have been the same mark printed twice.
  await expect(page.locator('.saint-head svg.badge')).toHaveCount(1);
  await expect(page.locator('[data-veneration] svg.badge')).toHaveCount(0);
});

test('the glyph follows the name in the calendar hero', async ({ page }) => {
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await glyphFollowsName(page, '.hero .name-line', 'h2.hero-name');
});

test('the glyph follows the name on an index card', async ({ page }) => {
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await glyphFollowsName(page, '.index-card .name-line', 'a.index-name');
});

test('the glyph follows the name on a shelf row', async ({ page }) => {
  await page.goto('/saints/nestorius', { waitUntil: 'networkidle' });
  await page.goto(EMPTY, { waitUntil: 'networkidle' });
  await expect(page.locator('.shelves')).toContainText('Continue reading');
  await glyphFollowsName(page, '.shelf li', 'a.reg-name');
});

test('the name carries the rite x communion matrix, and a dense row does not', async ({ page }) => {
  // Two views, one dataset (brief §9.2). The matrix is four rows tall, so it
  // can only sit beside a name that has the height for it: the saint's own h1
  // and the calendar hero take it, and every dense context keeps the badge.
  // DESIGN.md §7 records the measurements.
  await page.goto(DETAIL, { waitUntil: 'networkidle' });
  await expect(page.locator('.saint-head svg.glyph-matrix circle')).toHaveCount(13);
  // Seven columns beside a name is the width that could push a 360 px page
  // sideways. It does not: the name shrinks and wraps within itself, which is
  // what the nowrap line is for.
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
  ).toBe(0);
  await expect(page.locator('.register svg.badge:not(.glyph-matrix) circle').first()).toBeVisible();
  await expect(page.locator('.register svg.glyph-matrix')).toHaveCount(0);

  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await expect(page.locator('.index-card svg.glyph-matrix')).toHaveCount(0);
  await expect(page.locator('.index-card svg.badge').first().locator('circle')).toHaveCount(4);
});

test('the East Syriac column puts a refusal directly above an attestation', async ({ page }) => {
  // The brief's worked reason for building this view at all: Eastern Catholic
  // refuses Nestorius and the Assyrian Church of the East venerates him, and
  // both keep the same rite. The badge cannot show that; one column of the
  // matrix does, and only because the six Eastern Catholic cells are filled
  // rather than left blank.
  await page.goto('/saints/nestorius', { waitUntil: 'networkidle' });
  const marks = await page.locator('.saint-head svg.glyph-matrix circle').evaluateAll((els) =>
    els.map((el) => ({
      state: el.dataset.state,
      x: Math.round(el.getBoundingClientRect().x),
      y: Math.round(el.getBoundingClientRect().y),
      title: el.querySelector('title')?.textContent ?? '',
    })),
  );

  const eastSyriac = marks.filter((m) => m.title.includes('East Syriac rite'));
  expect(eastSyriac.map((m) => m.state).sort()).toEqual(['attested', 'refused']);
  // One column: same x, different y.
  expect(new Set(eastSyriac.map((m) => m.x)).size).toBe(1);
  expect(new Set(eastSyriac.map((m) => m.y)).size).toBe(2);

  // And the coarse cell admits what it is standing in for.
  const catholic = eastSyriac.find((m) => m.state === 'refused');
  expect(catholic.title).toContain('Eastern Catholic');
  expect(catholic.title).toContain('coarser than it looks');
});

test('clicking through days faster than the roll leaves one panel, not two', async ({ page }) => {
  // The day panel rolls for 300 ms. A second click inside that window used to
  // find the *leaving* panel and append beside the entering one, so the day
  // showed an empty-day notice and a hero at once and the orphan outlived
  // every navigation after it. 28 August is Augustine; 26 and 27 are empty.
  await page.goto('/calendar/2026-08-24', { waitUntil: 'networkidle' });
  const days = page.locator('.week-strip button');

  await days.nth(3).click();
  await page.waitForTimeout(60);
  await days.nth(4).click();
  await expect(page.locator('h1')).toHaveText(/28 August 2026/);
  await expect(page.locator('.day-panel')).toHaveCount(1);
  await expect(page.locator('.hero-name')).toHaveText('Augustine of Hippo');
  await expect(page.locator('.empty-day')).toHaveCount(0);

  // And the day after the fast pair is clean too: the orphan used to persist.
  await days.nth(2).click();
  await expect(page.locator('h1')).toHaveText(/26 August 2026/);
  await expect(page.locator('.day-panel')).toHaveCount(1);
  await expect(page.locator('.empty-day')).toHaveCount(1);
  await expect(page.locator('.hero')).toHaveCount(0);
});

test('the glyph is pinned to the right margin, not trailing the name', async ({ page }) => {
  // Position encodes identity, so the mark holds one column down a page rather
  // than ranging in and out with the length of each name (author, 2026-08-21).
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const edges = await page.locator('.index-card .name-line').evaluateAll((lines) =>
    lines.map((line) => {
      const glyph = line.querySelector('svg.badge').getBoundingClientRect();
      const name = line.querySelector('.index-name').getBoundingClientRect();
      return {
        gap: Math.round(line.getBoundingClientRect().right - glyph.right),
        clearsName: glyph.left >= name.right - 1,
      };
    }),
  );
  expect(edges.length).toBeGreaterThan(1);
  // Every card's glyph ends the same distance from its line's right edge, and
  // names of different lengths do not move it.
  expect(new Set(edges.map((e) => e.gap)).size).toBe(1);
  expect(edges.every((e) => e.clearsName)).toBe(true);
});

test('the month replaces the week rather than opening beneath it', async ({ page }) => {
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

test('the chevrons move a week, and a day is chosen by clicking it', async ({ page }) => {
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  // Scoped to the row that is current. The edges travel inside it now, so for
  // the length of a slide the document holds two of every step button and only
  // one of them is the reader's (Amendment 9's lesson, applied again).
  const step = (n) => page.locator(`.week-row:not(.grain-side) [data-step="${n}"]`);
  await step(7).click();
  await expect(page.locator('h1')).toHaveText(/4 September 2026/);
  await step(-7).click();
  await expect(page.locator('h1')).toHaveText(/28 August 2026/);

  // Days are still one click each.
  await page.locator('.week-strip button').first().click();
  await expect(page.locator('h1')).toHaveText(/24 August 2026/);
});

test('the two jump controls hold the left edge and carry names, not glyphs alone', async ({ page }) => {
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
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });

  // A flick left is forward in time, at either grain.
  await swipe(page, '.cal-week', -120);
  await expect(page.locator('h1')).toHaveText(/4 September 2026/);
  await swipe(page, '.cal-week', 120);
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
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const box = async (sel) => (await page.locator(sel).first().boundingBox());
  const weekPrev = await box('.cal-week .peek');
  const weekNext = await box('.cal-week .peek-next');

  await page.locator('[data-month]').click();
  await expect(page.locator('.cal-month')).toBeVisible();
  const monthPrev = await box('.cal-month .peek');
  const monthNext = await box('.cal-month .peek-next');

  // Same column at either grain, which is what keeps anything from moving
  // sideways as the two swap. Not the same height, and — since the month's
  // edges came inside the track so that they travel with the grid (author,
  // 2026-08-21) — no longer the same top either: the month's button now starts
  // under the day-name line, where its first cell is. What has to line up is
  // the ink, and the peeked cell sharing the grid's first row is asserted
  // directly in the test below.
  for (const [w, m] of [[weekPrev, monthPrev], [weekNext, monthNext]]) {
    expect(Math.round(m.x)).toBe(Math.round(w.x));
    expect(Math.round(m.width)).toBe(Math.round(w.width));
    expect(m.y).toBeGreaterThan(w.y);
  }

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

  const week = await text('.week-strip .day-name');
  await page.locator('[data-month]').click();
  await expect(page.locator('.cal-month')).toBeVisible();
  await page.waitForTimeout(600);

  expect(week).toHaveLength(7);
  // Scoped to the day-name row: the peeked column beside the grid carries a
  // spacer in the same class, because it takes the same metrics from it.
  expect(await text('.month-days .month-day-name')).toEqual(week);
});

test('the month spends its height on dates rather than on leading', async ({ page }) => {
  // January 2026 is five rows. Nothing in the grid is set in the serif — the
  // dates and the day names are both the utility face — so these measure the
  // same in either face, and an absolute assertion is safe here where one on
  // the index would be flaky.
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

test('a week travels sideways rather than swapping in place, edges and all', async ({ page }) => {
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  const during = await duringMove(page, '.cal-week', 'week-row', '.week-row [data-step="7"]');

  // Both weeks are on the track for the length of it, and the one being left is
  // scenery: the document briefly holds two of every date, and only one set of
  // them is the reader's. Out of reach as well as out of the accessibility
  // tree — a copy laid over the live row swallows the next click otherwise.
  expect(during.rows).toBe(2);
  expect(during.sides).toEqual(['-100%']);
  expect(during.hidden).toBe('true');
  expect(during.reachable).toBe(0);
  expect(during.reach).toBe('none');
  expect(during.clipped).toBe(true);

  // The edges travel with the week (author, 2026-08-21). Each copy carries its
  // own peeked days out and in — 23 and 31 leaving with the week they belong
  // to, 30 and 7 arriving with the week that does. They used to be siblings of
  // the viewport, repainting in place while the seven days between them slid,
  // which read as the edges switching rather than as the grain continuing.
  expect(during.sidePeeks).toEqual(['23', '31']);
  expect(during.livePeeks).toEqual(['30', '7']);

  // And it lands — one row, nothing clipped, no transform left on the track.
  await expect(page.locator('h1')).toHaveText(/4 September 2026/);
  await expect(page.locator('.week-row')).toHaveCount(1);
  await expect(page.locator('.grain-side')).toHaveCount(0);
  await expect(page.locator('.cal-week.is-moving')).toHaveCount(0);
  expect(await page.locator('.cal-week .grain-track').evaluate((el) => el.style.transform)).toBe('');
});

test('a month travels sideways with its own edges, and its day names do not', async ({ page }) => {
  // The week got this on 2026-08-21 and the month did not, because the month's
  // column could not travel while the day names above it sat inside the same
  // button. The names moved to a line of their own so that it could.
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

test('picking a day inside the week showing does not move it', async ({ page }) => {
  // The movement decides, not the gesture: there is nothing to travel to when
  // the week under the strip is the same week.
  await page.goto('/calendar/2026-08-24', { waitUntil: 'networkidle' });
  const moved = await page.evaluate(() => {
    const vp = document.querySelector('.cal-week');
    let seen = false;
    const observer = new MutationObserver(() => {
      if (vp.querySelector('.grain-side')) seen = true;
    });
    observer.observe(vp, { childList: true, subtree: true, attributes: true });
    vp.querySelectorAll('[data-iso]')[3].click();
    observer.disconnect();
    return seen;
  });
  expect(moved).toBe(false);
  await expect(page.locator('h1')).toHaveText(/27 August 2026/);
});

test('under reduced motion a week step leaves no second copy behind', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await page.locator('.week-row [data-step="7"]').click();
  await expect(page.locator('h1')).toHaveText(/4 September 2026/);
  // Removed, not shortened: no trip to sit through, and so no copy to clean up
  // after one.
  await expect(page.locator('.grain-side')).toHaveCount(0);
  await expect(page.locator('.cal-week.is-moving')).toHaveCount(0);
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

test('the week follows the finger, and lets go into the grain it is nearest', async ({ page }) => {
  // Hold-and-slide (author, 2026-08-21). The state does not move while the
  // reader is still holding it: what is under the finger is the chrome, and the
  // day only changes once they have let go somewhere.
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await dragGrain(page, '.cal-week', -24, { release: false });

  const held = await page.evaluate(() => {
    const vp = document.querySelector('.cal-week');
    return {
      rows: vp.querySelectorAll('.week-row').length,
      sides: [...vp.querySelectorAll('.grain-side')].map((s) => s.style.left).sort(),
      transform: vp.querySelector('.grain-track').style.transform,
      clipped: vp.classList.contains('is-moving'),
      heading: document.querySelector('h1').textContent,
    };
  });
  // Both neighbours are parked either side, so there is something to drag into
  // view in either direction without waiting for a repaint mid-gesture.
  expect(held.rows).toBe(3);
  expect(held.sides).toEqual(['-100%', '100%']);
  expect(held.transform).toMatch(/^translateX\(-\d/);
  expect(held.clipped).toBe(true);
  expect(held.heading).toContain('28 August 2026');

  // Let go short of a finger's travel — under SETTLE — and the week the reader
  // started in is still the nearest one, so it settles back and nothing has
  // happened.
  await releaseGrain(page, '.cal-week', -24);
  await expect(page.locator('.grain-side')).toHaveCount(0);
  await expect(page.locator('h1')).toHaveText(/28 August 2026/);
  expect(await page.locator('.cal-week .grain-track').evaluate((el) => el.style.transform)).toBe('');

  // Past it — and 48 px is a small swipe, not a haul — and it lets go into the
  // next week. Measured in pixels rather than as a fraction of the grain, which
  // is what the threshold is: the same swipe has to work at 1280 and at 360,
  // and it used to need a third of the width, which was 210 px on a laptop.
  await dragGrain(page, '.cal-week', -48);
  await expect(page.locator('h1')).toHaveText(/4 September 2026/);
  await expect(page.locator('.grain-side')).toHaveCount(0);
  await expect(page.locator('.cal-week .peek-prev .day-num')).toHaveText('30');
  await expect(page.locator('.cal-week .peek-next .day-num')).toHaveText('7');
});

test('the month follows the finger too, and takes its height with it', async ({ page }) => {
  // September 2026 is five rows and August is six, so dragging back from one to
  // the other is the case where the month arriving is taller than the viewport
  // holding it and would be cut off at the bottom for the length of the drag.
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

test('under reduced motion a drag lets go into place with nothing to sit through', async ({ browser }) => {
  // Removed, not shortened. Following the finger is direct manipulation and
  // stays; the settle is an animation and goes, so the grain is simply there
  // the moment the reader lets go.
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });

  await dragGrain(page, '.cal-week', -48, { release: false });
  expect(await page.locator('.grain-side').count()).toBe(2);
  await releaseGrain(page, '.cal-week', -48);

  // Read on the very next turn, with nothing awaited that could hide a wait.
  expect(await page.locator('h1').textContent()).toContain('4 September 2026');
  expect(await page.locator('.grain-side').count()).toBe(0);
  expect(await page.locator('.cal-week .grain-track').evaluate((el) => el.style.transform)).toBe('');
  await ctx.close();
});

test('a month steps sideways and carries its height with it', async ({ page }) => {
  // August 2026 is six rows and September is five, so stepping between them is
  // the case where the page below would otherwise jump between two frames.
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

  // And the coarse backstop, which has to clear the fallback face's 381: the
  // grid started at 436 before this pass.
  const gridTop = (await page.locator('.grid').boundingBox()).y;
  expect(gridTop, 'the controls have crept back down the page').toBeLessThan(400);
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

test('Breadth of veneration names the churches it counts, Eastern Catholic expanded', async ({ page }) => {
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.locator('[data-facet="breadth"] summary').click();
  const roster = page.locator('.breadth-roster');
  await expect(roster).toBeVisible();
  await expect(roster.locator('li')).toHaveCount(4);

  const catholic = roster.locator('li', { hasText: 'Catholic' }).first();
  await expect(catholic).toContainText('Roman Catholic');
  // The six rites the one Eastern Catholic entry stands for, named.
  for (const rite of ['Byzantine', 'Alexandrian', "Ge'ez", 'Armenian', 'West Syriac', 'East Syriac']) {
    await expect(catholic).toContainText(rite);
  }
  await expect(roster).toContainText('Assyrian Church of the East');
});

test('About explains the mark, with circles drawn by the component itself', async ({ page }) => {
  await page.goto('/about', { waitUntil: 'networkidle' });
  await expect(page.locator('h2', { hasText: 'Reading the mark' })).toBeVisible();

  // One swatch per state, and each is a real circle from cellMark rather than
  // a picture of one that could drift from what the site draws.
  const states = await page
    .locator('.glyph-legend .badge circle')
    .evaluateAll((els) => els.map((e) => e.dataset.state));
  expect(states).toEqual(['attested', 'refused', 'undocumented']);

  // Both views of a real saint: the row of four, and the same findings opened
  // out into the plate — thirteen positions, each with the church that holds it
  // named beneath (author's diagram, 2026-08-21). The plate is the calendar
  // filter's own component, so About cannot teach a shape the filter lacks.
  await expect(page.locator('.glyph-example .glyph-example-marks .badge circle')).toHaveCount(4);
  await expect(page.locator('.glyph-example .plate .plate-mark circle')).toHaveCount(13);
  await expect(page.locator('.glyph-example .plate .plate-label')).toHaveCount(8);
  await expect(page.locator('.glyph-example figcaption')).toContainText('Nestorius');
  await expect(page.locator('.glyph-example figcaption')).toContainText('the actual shape');

  // Nestorius is the worked example because of one column: the Assyrian Church
  // of the East venerates him and the Catholic communion directly above refuses
  // him, in the same rite. The plate is where a reader can see that it is one
  // column, because the column is named.
  const east = await page
    .locator('.glyph-example .plate .plate-mark circle')
    .evaluateAll((els) => els.map((e) => e.dataset.state));
  expect(east).toContain('attested');
  expect(east).toContain('refused');
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
  // And the glyph still follows the name.
  await glyphFollowsName(page, '.index-card .name-line', 'a.index-name');

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('[data-layout="rows"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.index-card').first()).toHaveClass(/is-row/);
});

test('cycling the theme does not move the header', async ({ page }) => {
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
    });
    await toggle.click();
  }

  // Three different themes, one geometry: the longest label reserves the width
  // for all of them, so "System" cannot wrap the header onto a second line.
  expect(new Set(measured.map((m) => m.label)).size).toBe(3);
  expect(new Set(measured.map((m) => m.header)).size, JSON.stringify(measured)).toBe(1);
  expect(new Set(measured.map((m) => m.button)).size, JSON.stringify(measured)).toBe(1);
});

test('the glyph holds no colour of its own, and the states survive greyscale', async ({ page }) => {
  await page.goto(DETAIL, { waitUntil: 'networkidle' });
  const marks = await page.locator('.saint-head svg.badge circle').evaluateAll((els) =>
    els.map((el) => {
      const style = getComputedStyle(el);
      return {
        state: el.dataset.state,
        fill: style.fill,
        opacity: parseFloat(style.fillOpacity),
        r: parseFloat(el.getAttribute('r')),
      };
    }),
  );

  const attested = marks.find((m) => m.state === 'attested');
  const undocumented = marks.find((m) => m.state === 'undocumented');

  // Every fill resolves through a custom property, so the two states resolve
  // to two different colours without either being written into the component.
  expect(attested.fill).not.toBe(undocumented.fill);
  // Value and size both separate them; either alone would be a single point of
  // failure in greyscale or at a small size.
  expect(undocumented.opacity).toBeLessThan(attested.opacity);
  expect(undocumented.r).toBeLessThan(attested.r / 2);
});

/* ---- the 2026-08-21 refinements ---------------------------------------- */

test('the header carries today without taking a line for it', async ({ page }) => {
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const today = page.locator('.chrome-today');
  // Abbreviated, machine-readable underneath, and never wrapped.
  await expect(today).toHaveText(/^\w{3} \d{1,2} \w{3}$/);
  await expect(today).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/);

  const m = await page.evaluate(() => {
    const header = document.querySelector('header.chrome');
    const stampEl = document.querySelector('.chrome-today');
    const name = document.querySelector('.site-name').getBoundingClientRect();
    const stamp = stampEl.getBoundingClientRect();
    const theme = document.querySelector('#theme-toggle').getBoundingClientRect();
    const s = getComputedStyle(header);
    return {
      header: header.getBoundingClientRect().height,
      name: name.height,
      padding: parseFloat(s.paddingTop) + parseFloat(s.paddingBottom),
      lines: Math.round(stamp.height / parseFloat(getComputedStyle(stampEl).lineHeight)),
      under: stamp.y >= theme.y + theme.height,
      aligned: Math.round(stamp.x + stamp.width) === Math.round(theme.x + theme.width),
      // Below 560 px the nav takes a row of its own, so the bar is two rows
      // tall before the corner is counted at all.
      stacked: document.querySelector('.site-nav').getBoundingClientRect().y >= name.bottom,
    };
  });

  expect(m.lines).toBe(1);
  expect(m.under, 'the date sits under the theme control').toBe(true);
  expect(m.aligned, 'both hold the same right edge').toBe(true);
  // The bar measured 61.3 px on one row and 88.8 px on two before the date
  // existed; it measures 60.5 and 88.0 with it. The corner grew by a line and
  // the bar's own padding paid for it. This is the assertion that fails if
  // anyone takes the padding back without taking the line back too. Safe as an
  // absolute: the height is driven by the corner, which is set in the system
  // stack, not by the serif site name whose face is not ours to choose.
  expect(m.header).toBeLessThan(m.stacked ? 90 : 62);
});

test('the arrows are gone and the grain itself stands at each edge', async ({ page }) => {
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });

  // Nothing in the row draws a chevron any more (author, 2026-08-21).
  const glyphs = await page.locator('.cal-controls button').allTextContents();
  expect(glyphs.join('')).not.toMatch(/[‹›]/);

  // What stands there is the week continuing: the day behind it and the day
  // ahead of it, on the same lines as the days between.
  await expect(page.locator('.cal-week .peek-prev .day-num')).toHaveText('23');
  await expect(page.locator('.cal-week .peek-next .day-num')).toHaveText('31');
  const fades = await page.locator('.cal-week .peek').evaluateAll((els) =>
    els.map((el) => getComputedStyle(el).maskImage),
  );
  expect(fades.every((f) => f.includes('gradient'))).toBe(true);

  // The swipe is touch and pen only, so the edge has to stay clickable or a
  // reader with a mouse has no way through the weeks at all.
  const current = '.week-row:not(.grain-side)';
  await page.locator(`${current} .peek-next`).click();
  await expect(page.locator('h1')).toHaveText(/4 September 2026/);
  await page.locator(`${current} .peek-prev`).click();
  await expect(page.locator('h1')).toHaveText(/28 August 2026/);
});

test('the peeked numbers clear the contrast floor rather than being a faded wash', async ({ page }) => {
  // A flat 50% opacity over --ink-soft is 2.1:1 and axe failed it on sight.
  // The fade is a mask instead, so the ink stays at full strength wherever
  // there is still a glyph to read.
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  // Both edges. A first draft of this checked only the trailing one, and a
  // backout that washed out just the leading one walked straight past it.
  const peeks = await page.locator('.cal-week .peek').evaluateAll((els) =>
    els.map((el) => {
      const s = getComputedStyle(el);
      return { color: s.color, opacity: s.opacity };
    }),
  );
  const soft = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.week-strip button')).color,
  );
  expect(peeks).toHaveLength(2);
  for (const peek of peeks) {
    expect(peek.opacity).toBe('1');
    expect(peek.color).toBe(soft);
  }
});

test('the month peeks a column of the neighbouring month, on the grid own rows', async ({ page }) => {
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

/* ---- the tradition filter (author, 2026-08-21) -------------------------- */

const openFilter = async (page) => {
  await page.locator('[data-filter-open]').click();
  await expect(page.locator('.filter-panel')).toBeVisible();
};

test('turning a tradition off empties the days it was the only one keeping', async ({ page }) => {
  // 28 August 2026 is Augustine, and in this corpus he is Roman Catholic and
  // nothing else. So the one church answers for the whole day, which is what
  // makes this a test of the filter rather than of a coincidence.
  await answered(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await expect(page.locator('.hero-name')).toContainText('Augustine');
  await openFilter(page);

  await page.locator('[data-plate] [data-church="roman-catholic"]').click();

  // The day, the hero, and the density dots under that date in the strip: one
  // filter, read everywhere, rather than in the one place someone remembered.
  await expect(page.locator('.hero')).toHaveCount(0);
  await expect(page.locator('.empty-day')).toHaveCount(1);
  await expect(
    page.locator('.week-row:not(.grain-side) [data-iso="2026-08-28"] .density i'),
  ).toHaveCount(0);

  // And in the month, which counts the same filtered entries.
  await page.locator('[data-month]').click();
  await page.waitForTimeout(600);
  await expect(page.locator('.month-row:not(.grain-side) [data-iso="2026-08-28"] .density i'))
    .toHaveCount(0);

  // The button names what is left rather than the invitation it started as.
  await expect(page.locator('[data-filter-open]')).toContainText('Showing:');
  await expect(page.locator('[data-filter-open]')).not.toContainText('Roman Catholic');
});

test('a communion turns its whole row and a rite its whole column', async ({ page }) => {
  await answered(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await openFilter(page);

  const pressed = (sel) => page.locator(`[data-plate] ${sel}`).getAttribute('aria-pressed');
  const headState = (sel) => page.locator(`[data-plate] ${sel}`).getAttribute('data-state');

  // A row, off and on again. Oriental Orthodox holds four churches.
  await page.locator('[data-plate] [data-communion="oriental-orthodox"]').click();
  for (const id of ['coptic', 'armenian', 'ethiopian-eritrean', 'syriac-malankara']) {
    expect(await pressed(`[data-church="${id}"]`)).toBe('false');
  }
  expect(await headState('[data-communion="oriental-orthodox"]')).toBe('off');
  // Nothing else moved: a row toggle is a row toggle.
  expect(await pressed('[data-church="eastern-orthodox"]')).toBe('true');

  // A column, across communions. Byzantine is Eastern Catholic and Eastern
  // Orthodox — one rite either side of a communion boundary, which is the
  // adjacency the grid exists to show.
  await page.locator('[data-plate] [data-rite="byzantine"]').click();
  expect(await pressed('[data-church="eastern-orthodox"]')).toBe('false');
  expect(
    await page.locator('[data-plate] [data-church="eastern-catholic"]').first().getAttribute('aria-pressed'),
  ).toBe('false');
  expect(await pressed('[data-church="roman-catholic"]')).toBe('true');

  // A row that is half on says so, and not in a third colour: Catholic still
  // holds Roman Catholic and has lost Eastern Catholic.
  expect(await headState('[data-communion="catholic"]')).toBe('some');
});

test('Eastern Catholic six cells are one switch', async ({ page }) => {
  // Six positions from one registry entry (DESIGN.md §7b). Six independent
  // switches would be six findings where the registry has one.
  await answered(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await openFilter(page);

  const cells = page.locator('[data-plate] [data-church="eastern-catholic"]');
  await expect(cells).toHaveCount(6);
  await cells.first().click();
  for (let i = 0; i < 6; i++) {
    await expect(cells.nth(i)).toHaveAttribute('aria-pressed', 'false');
  }
  // And it is named once, under the run, rather than six times.
  await expect(
    page.locator('[data-plate] .plate-label', { hasText: 'Eastern Catholic' }),
  ).toHaveCount(1);
});

test('the filter cells are a control, not the veneration mark', async ({ page }) => {
  // Gold appears in exactly one place on this site and that place is a finding
  // about a saint (DESIGN.md §2). A control shaped like the lattice is drawn in
  // the register's own two values, and aria-pressed carries the state for
  // anyone not reading them.
  await answered(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await openFilter(page);

  await expect(page.locator('[data-plate] circle')).toHaveCount(0);
  const tokens = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const on = document.querySelector('[data-plate] [aria-pressed="true"] .plate-disc');
    return {
      ink: root.getPropertyValue('--ink').trim(),
      rule: root.getPropertyValue('--rule').trim(),
      gold: root.getPropertyValue('--gold').trim(),
      onColour: getComputedStyle(on).backgroundColor,
    };
  });
  const rgb = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
  };
  expect(tokens.onColour).toBe(rgb(tokens.ink));
  expect(tokens.onColour).not.toBe(rgb(tokens.gold));

  await page.locator('[data-plate] [data-church="roman-catholic"]').click();
  const off = await page
    .locator('[data-plate] [data-church="roman-catholic"] .plate-disc')
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(off).toBe(rgb(tokens.rule));
});

test('a filter press leaves the focus on the cell that was pressed', async ({ page }) => {
  // The plate is rebuilt on every press, which takes the focus off whatever was
  // just pressed. A filter a keyboard reader can only press once is not a
  // filter.
  await answered(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await openFilter(page);

  await page.locator('[data-plate] [data-church="coptic"]').focus();
  await page.keyboard.press('Enter');
  const focused = await page.evaluate(() => document.activeElement?.dataset?.church);
  expect(focused).toBe('coptic');
  await expect(page.locator('[data-plate] [data-church="coptic"]')).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

test('the filter is remembered, and Show all puts it back', async ({ page }) => {
  await answered(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await openFilter(page);
  await page.locator('[data-plate] [data-communion="catholic"]').click();
  await expect(page.locator('[data-filter-open]')).not.toContainText('Catholic');

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('[data-filter-open]')).toContainText('Showing:');
  await expect(page.locator('.empty-day')).toHaveCount(1);

  await openFilter(page);
  await page.locator('[data-filter-reset]').click();
  await expect(page.locator('[data-filter-open]')).toHaveText(
    'Filter by Catholic/Orthodox/Oriental/Assyrian',
  );
  await expect(page.locator('.hero-name')).toContainText('Augustine');
});

test('an empty day says which of the three silences it is', async ({ page }) => {
  // Three different facts, and a reader is owed the difference between them.
  // The corpus having nothing for a day is a statement about our sourcing; a
  // day the reader has filtered away is not, and printing the sourcing notice
  // over it would be a claim about our sourcing that is untrue. Prose in ink in
  // every case — an empty is never a banner here.
  await answered(page);
  await page.goto(EMPTY, { waitUntil: 'networkidle' });
  await expect(page.locator('.empty-day')).toContainText('The corpus grows folder by folder');

  // Filtered away: 28 August has Augustine, and he is Roman Catholic here.
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await openFilter(page);
  await page.locator('[data-plate] [data-communion="catholic"]').click();
  await expect(page.locator('.empty-day')).toContainText('traditions you are showing');
  await expect(page.locator('.empty-day')).toContainText('One commemoration here');
  await expect(page.locator('.empty-day')).not.toContainText('The corpus grows folder by folder');

  // A day with nothing on it is still about the sourcing, even while filtered.
  await page.goto(EMPTY, { waitUntil: 'networkidle' });
  await expect(page.locator('.empty-day')).toContainText('The corpus grows folder by folder');
});

test('nothing selected is its own silence', async ({ page }) => {
  await answered(page, []);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await expect(page.locator('.empty-day')).toContainText('Nothing is selected');
  await expect(page.locator('[data-filter-open]')).toHaveText('No tradition selected');

  await page.goto(EMPTY, { waitUntil: 'networkidle' });
  await expect(page.locator('.empty-day')).toContainText('Nothing is selected');
});

test('the question is asked once, and answering it is choosing', async ({ page }) => {
  // "Everything, because I chose everything" and "everything, because nobody
  // has asked yet" look identical on the calendar and only one of them should
  // raise the question — so Show all is an answer, not a dismissal.
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await expect(page.locator('.tradition-ask')).toBeVisible();
  await expect(page.locator('[data-ask-choice]')).toHaveCount(5);

  await page.locator('[data-ask-choice="all"]').click();
  await expect(page.locator('.tradition-ask')).toHaveCount(0);
  // Focus goes somewhere that still exists, and it is where the answer now lives.
  expect(await page.evaluate(() => document.activeElement?.dataset?.filterOpen)).toBe('');
  await expect(page.locator('[data-filter-open]')).toHaveText(
    'Filter by Catholic/Orthodox/Oriental/Assyrian',
  );

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('.tradition-ask')).toHaveCount(0);
});

test('choosing one communion at the question filters the calendar to it', async ({ page }) => {
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await page.locator('[data-ask-choice="eastern-orthodox"]').click();
  await expect(page.locator('.tradition-ask')).toHaveCount(0);
  // Augustine is Roman Catholic in this corpus, so an Eastern Orthodox reader's
  // 28 August is empty — which is a fact about the corpus, stated plainly.
  await expect(page.locator('.empty-day')).toHaveCount(1);
  await expect(page.locator('[data-filter-open]')).toHaveText('Showing: Eastern Orthodox');
});

test('the plate keeps its shape at 360 px and scrolls instead', async ({ page }) => {
  // A grid that becomes a list on a phone is a second diagram to learn, and the
  // shape is the thing being taught (author, 2026-08-21). So the lattice holds
  // at every width and the reader moves along it — with the communion's name
  // held at the edge, because a row whose head you have scrolled past is a row
  // you cannot identify.
  await page.setViewportSize({ width: 360, height: 780 });
  await answered(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await openFilter(page);

  const shape = await page.evaluate(() => {
    const plate = document.querySelector('.plate');
    const scroll = document.querySelector('.plate-scroll');
    const side = document.querySelector('.plate-side');
    return {
      display: getComputedStyle(plate).display,
      columns: getComputedStyle(plate).gridTemplateColumns.split(' ').length,
      wider: plate.scrollWidth > scroll.clientWidth,
      scrollable: getComputedStyle(scroll).overflowX,
      sticky: getComputedStyle(side).position,
      labels: document.querySelectorAll('.plate-label').length,
    };
  });
  // Seven rite columns and the communion's own, still a grid, still labelled.
  expect(shape.display).toBe('grid');
  expect(shape.columns).toBe(8);
  expect(shape.labels).toBe(8);
  expect(shape.wider).toBe(true);
  expect(shape.scrollable).toBe('auto');
  expect(shape.sticky).toBe('sticky');

  // And the page itself does not overflow because of it: the scrolling is the
  // region's, not the document's.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
  expect(overflow).toBe(true);
});

test('the peeked day sits on the same line as the days beside it', async ({ page }) => {
  // The peek is not inside a day button, so it inherits neither that button's
  // one transparent border nor its --space-1 of padding, and both its name and
  // its numeral printed 5 px high (author, 2026-08-21). Measured on the text
  // rather than on the boxes, which legitimately differ: the day name is a flex
  // item in a bordered button on one side and a span in the peek on the other.
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const lines = await page.evaluate(() => {
    const top = (sel) => Math.round(document.querySelector(sel).getBoundingClientRect().top);
    return {
      prevName: top('.cal-week .peek-prev .day-name'),
      nextName: top('.cal-week .peek-next .day-name'),
      dayName: top('.week-strip .day-name'),
      prevNum: top('.cal-week .peek-prev .day-num'),
      nextNum: top('.cal-week .peek-next .day-num'),
      dayNum: top('.week-strip .day-num'),
    };
  });
  // Both edges. A backout that fixed only the leading one would otherwise walk
  // straight past this, which is how the contrast check on these was written.
  expect(lines.prevName).toBe(lines.dayName);
  expect(lines.nextName).toBe(lines.dayName);
  expect(lines.prevNum).toBe(lines.dayNum);
  expect(lines.nextNum).toBe(lines.dayNum);
});

test('the hero image is 85% of the width it took, and opens the saint', async ({ page }) => {
  // A tall icon at full width put the saint's own name below the fold at
  // 360 px, which is the one thing a hero cannot do (author, 2026-08-21).
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
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
  await media.click();
  await expect(page.locator('h1.saint-name')).toHaveText('Augustine of Hippo');
});

/**
 * A reader who has already answered the first-visit question — which is every
 * visit after the first. Written before the page loads, because the calendar
 * decides whether to ask while it is rendering.
 */
const answered = (page, traditions = null) =>
  page.addInitScript((value) => {
    const key = 'gos-settings';
    const now = JSON.parse(localStorage.getItem(key) ?? '{}');
    // Seeded only if the reader has not answered, because this runs on every
    // load including a reload — and a test that reloads to check the answer
    // was remembered would otherwise be overwriting it on the way back in.
    if (Array.isArray(now.traditions)) return;
    localStorage.setItem(key, JSON.stringify({ ...now, traditions: value ?? [
      'roman-catholic', 'eastern-catholic', 'eastern-orthodox', 'coptic',
      'armenian', 'ethiopian-eritrean', 'syriac-malankara',
      'assyrian-church-of-the-east',
    ] }));
  }, traditions);

test('the saint name clears the fold at 360 px on a tall icon', async ({ page }) => {
  // The reason the image came down to 85%. Augustine is the tallest icon in
  // the corpus and 28 August is his day, so this is the worst case the corpus
  // actually holds rather than one constructed for the test.
  await page.setViewportSize({ width: 360, height: 780 });
  await answered(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const name = await page.locator('.hero-name').boundingBox();
  expect(name.y).toBeLessThan(780);
});

test('on a first visit the question clears the fold, and the day does not', async ({ page }) => {
  // The one deliberate exception to the rule above (author, 2026-08-21). A
  // first visit is asked which calendar the reader keeps, and the question is
  // 433 px of a 780 px phone: what has to be above the fold on that visit is
  // the question and the way past it, not the hero. Every visit after it is
  // the test above. Asserted rather than left to be noticed, because the fold
  // is exactly where this would go wrong quietly.
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const ask = await page.locator('.tradition-ask').boundingBox();
  const choices = await page.locator('[data-ask-choice]').last().boundingBox();
  const strip = await page.locator('.week-row').boundingBox();
  const heading = await page.locator('h1.cal-date').boundingBox();

  // The question, all of its answers, the strip and the day's own heading.
  expect(ask.y + ask.height).toBeLessThan(780);
  expect(choices.y + choices.height).toBeLessThan(780);
  expect(strip.y + strip.height).toBeLessThan(780);
  expect(heading.y).toBeLessThan(780);
});

/* ---- one swap primitive (src/ui/swap.js) -------------------------------- */

test('a filter press repaints the day in place rather than rolling it', async ({ page }) => {
  // The movement decides, not the gesture (DESIGN.md §5b). A filter change has
  // not travelled anywhere in time, so the panel repaints where it stands —
  // it used to roll upward as if the reader had stepped forward a day.
  await answered(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await expect(page.locator('.hero-name')).toContainText('Augustine');
  await openFilter(page);

  // Read synchronously after the click, inside the window a roll would occupy.
  const after = await page.evaluate(() => {
    document.querySelector('[data-plate] [data-church="roman-catholic"]').click();
    return {
      leaving: document.querySelectorAll('.day-panel.slot-leaving').length,
      entering: document.querySelectorAll('.day-panel.slot-entering').length,
      panels: document.querySelectorAll('.day-panel').length,
    };
  });
  expect(after).toEqual({ leaving: 0, entering: 0, panels: 1 });
  // The repaint itself still happened: Augustine is filtered away.
  await expect(page.locator('.empty-day')).toHaveCount(1);
});

test('the rolling day leaves an inert copy behind it', async ({ page }) => {
  // Amendment 17's corollary, applied to the roll it had never reached: for
  // 300 ms the document holds two day panels, and the leaving one is laid over
  // the same spot — aria-hidden, out of the tab order, out of the pointer's
  // reach, or its links swallow the click meant for the arriving day.
  await answered(page);
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await expect(page.locator('.hero-name')).toContainText('Augustine');

  const marked = await page.evaluate(() => {
    document.querySelector('.week-strip [data-iso="2026-08-26"]').click();
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

test('Detailed swaps the badge for the matrix, adds the opening of the life, and every box still holds', async ({ page }) => {
  // Addendum H1. The matrix on a card is by the reader's choice and unscaled
  // — the same 30.6 px mark as beside the h1 — and the description is the
  // life's own first paragraph in a box reserved before it arrives: the card's
  // height is still known before render, so nothing may be cropped.
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  const box = page.locator('[data-detailed]');
  await expect(box).not.toBeChecked();
  await expect(page.locator('.index-card svg.glyph-matrix')).toHaveCount(0);
  await expect(page.locator('.index-desc')).toHaveCount(0);
  const plain = (await page.locator('.index-card').first().boundingBox()).height;

  await box.check();
  await expect(page.locator('.index-card').first().locator('svg.glyph-matrix circle')).toHaveCount(13);
  await expect(page.locator('.index-card').first()).toHaveClass(/is-detailed/);
  const first = page.locator('.index-card', { hasText: 'Anthony the Great' });
  await expect(first.locator('.index-desc')).toContainText('Born to a prosperous Coptic family');
  // Still the manifest's numbers: matrix inside the name line, three lines of
  // description, and a taller card by exactly what was added.
  const geometry = await first.evaluate((card) => {
    const r = (el) => el.getBoundingClientRect();
    const desc = card.querySelector('.index-desc');
    return {
      matrixInsideLine: r(card.querySelector('svg.badge')).bottom <= r(card.querySelector('.name-line')).bottom + 0.5,
      descLines: Math.round((r(desc).height / 19.575) * 10) / 10,
    };
  });
  expect(geometry.matrixInsideLine).toBe(true);
  expect(geometry.descLines).toBe(3);
  expect((await page.locator('.index-card').first().boundingBox()).height).toBeGreaterThan(plain + 60);
  expect(await nothingCropped(page)).toEqual([]);

  // Rows take it too, at two lines, and nothing in a row is cropped either.
  await page.locator('[data-layout="rows"]').click();
  await expect(page.locator('.index-card').first()).toHaveClass(/is-row/);
  await expect(page.locator('.index-card').first().locator('svg.glyph-matrix')).toHaveCount(1);
  await expect(page.locator('.index-card').first().locator('.index-desc')).toBeVisible();
  expect(await nothingCropped(page)).toEqual([]);
  const rowHeights = await page.locator('.index-card').evaluateAll((els) =>
    els.map((el) => Math.round(el.getBoundingClientRect().height)),
  );
  expect(new Set(rowHeights).size).toBe(1);

  // Remembered, like the layout.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('[data-detailed]')).toBeChecked();
  await expect(page.locator('.index-card').first().locator('svg.glyph-matrix')).toHaveCount(1);
  await page.locator('[data-detailed]').uncheck();
  await page.locator('[data-layout="cards"]').click();
});

test('the bookmark stands in the image corner, takes the press, and is the Save', async ({ page }) => {
  // Addendum H2. A frameless silhouette over the picture's top-right corner,
  // above the link's ::after, so pressing it saves rather than opens; on a
  // card with no picture it stands beside the dates, clear of the glyph.
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const first = page.locator('.index-card', { hasText: 'Anthony the Great' });
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
    };
  });
  expect(seen.flushRight).toBe(0);
  expect(seen.flushTop).toBe(0);
  expect(seen.hitIsBookmark).toBe(true);
  // No frame: no border and no field behind the shape.
  expect(seen.border).toBe('none');
  expect(seen.background).toBe('rgba(0, 0, 0, 0)');
  // Ink, never gold: Save is chrome (DESIGN.md §2).
  const tokens = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const rgb = (hex) => {
      const n = parseInt(hex.trim().slice(1), 16);
      return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
    };
    return { ink: rgb(root.getPropertyValue('--ink')), gold: rgb(root.getPropertyValue('--gold')) };
  });
  expect(seen.stroke).toBe(tokens.ink);
  expect(seen.fill).toBe('none');

  // A card with no picture: beside the dates, and never over the glyph. The
  // grid is virtualised, so at 360 px he has to be scrolled into the window
  // before he exists to be measured.
  const imageless = page.locator('.index-card', { hasText: 'Christopher' });
  for (let y = 0; y < 4000 && (await imageless.count()) === 0; y += 300) {
    await page.evaluate((to) => window.scrollTo(0, to), y);
    await page.waitForTimeout(50);
  }
  const corner = await imageless.evaluate((card) => {
    const r = (el) => el.getBoundingClientRect();
    const g = r(card.querySelector('svg.badge'));
    const b = r(card.querySelector('.bookmark'));
    const d = r(card.querySelector('.index-dates'));
    return {
      overlapsGlyph: !(b.right < g.left || b.left > g.right || b.bottom < g.top || b.top > g.bottom),
      centredOnDates: Math.abs((b.top + b.bottom) / 2 - (d.top + d.bottom) / 2) < 2,
    };
  });
  expect(corner.overlapsGlyph).toBe(false);
  expect(corner.centredOnDates).toBe(true);

  // It is the Save: pressing it writes the store, the shape fills, the name
  // says so, the page stays where it was, and a reload finds it saved.
  const button = first.locator('.bookmark');
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await expect(button).toHaveAttribute('aria-label', 'Save Anthony the Great');
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(button).toHaveAttribute('aria-label', /Anthony the Great is saved/);
  await expect(page).toHaveURL(/\/saints$/);
  const filled = await button.locator('.bm-shape').evaluate((el) => getComputedStyle(el).fill);
  expect(filled).toBe(tokens.ink);
  expect(filled).not.toBe(tokens.gold);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('.index-card', { hasText: 'Anthony the Great' }).locator('.bookmark')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.index-card', { hasText: 'Anthony the Great' }).locator('.bookmark').click();
  await expect(page.locator('.index-card', { hasText: 'Anthony the Great' }).locator('.bookmark')).toHaveAttribute('aria-pressed', 'false');
});

test('the × returns the reader to the Index as they left it, and so does the browser back', async ({ browser }) => {
  // Addendum H3. Filters, open facets and scroll position all come back; the
  // nav link still opens the Index fresh, because it does not ask. A short
  // viewport so there is a scroll position to lose.
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const page = await ctx.newPage();
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await (await facet(page, 'churches')).getByLabel('Coptic Orthodox').check();
  await expect(page.locator('[data-count]')).toHaveText('3');
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
  await expect(page.locator('[data-count]')).toHaveText('3');
  await expect(page.locator('input[name="churches"][value="coptic"]')).toBeChecked();
  expect(await page.evaluate(() => document.querySelector('[data-facet="churches"]').open)).toBe(true);
  expect(await page.evaluate(() => window.scrollY)).toBe(500);

  // The browser's own back finds the same place.
  await openVisible();
  await expect(page.locator('h1.saint-name')).toBeVisible();
  await page.goBack();
  await expect(page.locator('[data-count]')).toHaveText('3');
  expect(await page.evaluate(() => window.scrollY)).toBe(500);

  // The nav link is a fresh Index.
  await page.locator('nav a[href$="/saints"]').click();
  await expect(page.locator('[data-count]')).toHaveText('10');
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await ctx.close();
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
    const h1 = r('h1.saint-name'), tools = r('.saint-tools'), glyph = r('.saint-head svg.badge'), line = r('.saint-head .name-line');
    const media = r('.saint-media-col'), facts = r('.saint-intro-facts'), main = r('.saint-main'), article = r('article.saint');
    return {
      wide: innerWidth >= 760,
      toolsAfterName: tools.left >= h1.left + 10,
      toolsOnNameLine: tools.top < h1.bottom && tools.bottom > h1.top,
      toolsBeforeGlyph: tools.right <= glyph.left,
      glyphAtMargin: Math.round(line.right - glyph.right),
      factsBesideImage: facts.left >= media.right && Math.abs(facts.top - media.top) < 4,
      factsBelowImage: facts.top >= media.bottom,
      mainFullWidth: Math.round(main.width) === Math.round(article.width),
      mainBelowBoth: main.top >= Math.max(media.bottom, facts.bottom),
    };
  });
  expect(seen.toolsAfterName).toBe(true);
  expect(seen.toolsOnNameLine).toBe(true);
  expect(seen.toolsBeforeGlyph).toBe(true);
  expect(seen.glyphAtMargin).toBe(0);
  expect(seen.mainFullWidth).toBe(true);
  expect(seen.mainBelowBoth).toBe(true);
  if (seen.wide) expect(seen.factsBesideImage).toBe(true);
  else expect(seen.factsBelowImage).toBe(true);
});
