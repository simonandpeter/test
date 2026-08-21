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
  // The line of equivalencies that used to print all three reckonings between
  // the title and the image was withdrawn when the toggle arrived; the one
  // reckoning the reader chose stands beside the buttons that choose it
  // (author, 2026-08-21).
  await expect(page.locator('.cal-reckonings')).toHaveCount(0);
  await expect(page.locator('.cal-reckoning .day-date')).toHaveText('Gregorian · 30 January 2026');
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
  await page.goto(DETAIL, { waitUntil: 'networkidle' });
  const save = page.locator('.save-button');
  await expect(save).toHaveAttribute('aria-pressed', 'false');
  await save.click();
  await expect(save).toHaveAttribute('aria-pressed', 'true');
  await expect(save).toHaveText('Saved');

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('.save-button')).toHaveAttribute('aria-pressed', 'true');

  // And the saved shelf on the habit page knows about it.
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
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
  const month = page.locator('.month-view');
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
  const step = (n) => page.locator(`.week-row:not(.strip-leaving) [data-step="${n}"]`);
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

  // Same column and same top at either grain. Not the same height: the week's
  // edge is one day and the month's is a column of them, which is the one
  // thing that legitimately differs between the two.
  for (const [w, m] of [[weekPrev, monthPrev], [weekNext, monthNext]]) {
    expect(Math.round(m.x)).toBe(Math.round(w.x));
    expect(Math.round(m.y)).toBe(Math.round(w.y));
    expect(Math.round(m.width)).toBe(Math.round(w.width));
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
  expect(name.x).toBeLessThan((await box('.month-view')).x);
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

test('a week steps sideways rather than swapping in place', async ({ page }) => {
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });

  // Sampled the moment the second copy appears rather than polled afterwards:
  // the slide is 260 ms and a poll racing it would be a flake waiting to be
  // blamed on the machine.
  const during = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const vp = document.querySelector('.cal-week');
        const observer = new MutationObserver(() => {
          const leaving = vp.querySelector('.week-row.strip-leaving');
          if (!leaving) return;
          observer.disconnect();
          const entering = vp.querySelector('.week-row.strip-entering');
          const nums = (row) => [...row.querySelectorAll('.peek .day-num')].map((e) => e.textContent);
          resolve({
            strips: vp.querySelectorAll('.week-strip').length,
            hidden: leaving.getAttribute('aria-hidden'),
            reachable: [...leaving.querySelectorAll('button')].filter((b) => b.tabIndex !== -1).length,
            entering: vp.querySelectorAll('.week-row.strip-entering').length,
            clipped: vp.classList.contains('is-sliding'),
            leavingPeeks: nums(leaving),
            enteringPeeks: entering ? nums(entering) : null,
          });
        });
        observer.observe(vp, { childList: true, subtree: true, attributes: true });
        document.querySelector('[data-step="7"]').click();
      }),
  );

  // Both weeks are in the viewport for the length of it, and the one being left
  // is scenery: the document briefly holds two of every date, and only one set
  // of them is the reader's.
  expect(during.strips).toBe(2);
  expect(during.entering).toBe(1);
  expect(during.hidden).toBe('true');
  expect(during.reachable).toBe(0);
  expect(during.clipped).toBe(true);

  // The edges travel with the week (author, 2026-08-21). What slides is the
  // whole row, so each copy carries its own peeked days out and in — 23 and 31
  // leaving with the week they belong to, 30 and 7 arriving with the week that
  // does. They used to be siblings of the viewport and repainted in place while
  // the seven days between them slid, which read as the edges switching rather
  // than as the grain continuing.
  expect(during.leavingPeeks).toEqual(['23', '31']);
  expect(during.enteringPeeks).toEqual(['30', '7']);

  // And it lands — one strip, nothing clipped, nothing left animating.
  await expect(page.locator('h1')).toHaveText(/4 September 2026/);
  await expect(page.locator('.week-strip')).toHaveCount(1);
  await expect(page.locator('.strip-leaving')).toHaveCount(0);
  await expect(page.locator('.cal-week.is-sliding')).toHaveCount(0);
});

test('picking a day inside the week showing does not slide it', async ({ page }) => {
  // The movement decides, not the gesture: there is nothing to travel to when
  // the week under the strip is the same week.
  await page.goto('/calendar/2026-08-24', { waitUntil: 'networkidle' });
  const slid = await page.evaluate(() => {
    const vp = document.querySelector('.cal-week');
    let seen = false;
    const observer = new MutationObserver(() => {
      if (vp.querySelector('.strip-leaving')) seen = true;
    });
    observer.observe(vp, { childList: true, subtree: true, attributes: true });
    vp.querySelectorAll('[data-iso]')[3].click();
    observer.disconnect();
    return seen;
  });
  expect(slid).toBe(false);
  await expect(page.locator('h1')).toHaveText(/27 August 2026/);
});

test('under reduced motion a week step leaves no second copy behind', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await page.locator('[data-step="7"]').click();
  await expect(page.locator('h1')).toHaveText(/4 September 2026/);
  // Removed, not shortened: no slide to sit through, and so no clone to clean
  // up after one.
  await expect(page.locator('.strip-leaving')).toHaveCount(0);
  await expect(page.locator('.cal-week.is-sliding')).toHaveCount(0);
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

  // Both views of a real saint, side by side: four cells and thirteen.
  await expect(page.locator('.glyph-example .badge:not(.glyph-matrix) circle')).toHaveCount(4);
  await expect(page.locator('.glyph-example .glyph-matrix circle')).toHaveCount(13);
  await expect(page.locator('.glyph-example figcaption')).toContainText('Nestorius');
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
  const current = '.week-row:not(.strip-leaving)';
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

test('the reckoning is the reader choice, and it is remembered', async ({ page }) => {
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const line = page.locator('.day-date');
  await expect(line).toHaveText('Gregorian · 30 January 2026');

  await page.locator('[data-reckoning="coptic"]').click();
  await expect(line).toHaveText('Coptic · 22 Tobi 1742');
  await expect(page.locator('[data-reckoning="coptic"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-reckoning="gregorian"]')).toHaveAttribute('aria-pressed', 'false');

  // The strip and the grid stay in the civil calendar the URL is in: choosing
  // a reckoning relabels the day, it does not move the reader to another one.
  await expect(page.locator('h1')).toHaveText(/30 January 2026/);

  // Remembered across a visit, like the theme and the index layout.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('.day-date')).toHaveText('Coptic · 22 Tobi 1742');
});

test('the chosen reckoning stands beside the buttons that choose it', async ({ page }) => {
  // Reversed on 2026-08-21: it used to stand inside the day panel above the
  // hero image and roll with the day. It now sits in the chrome, on the
  // reckoning row's own line, pinned to that row's trailing margin so it holds
  // one column whichever of the four is lit.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const where = await page.evaluate(() => {
    const date = document.querySelector('.day-date').getBoundingClientRect();
    const row = document.querySelector('.cal-reckoning').getBoundingClientRect();
    const last = document.querySelector('[data-reckoning="ethiopian"]').getBoundingClientRect();
    const h1 = document.querySelector('h1.cal-date').getBoundingClientRect();
    return {
      inRow: !!document.querySelector('.cal-reckoning .day-date'),
      inPanel: !!document.querySelector('.day-panel .day-date'),
      sameLine: Math.abs(date.top + date.height / 2 - (last.top + last.height / 2)) < 4,
      afterButtons: date.left > last.right,
      pinned: Math.abs(date.right - row.right) < 1,
      aboveTheTitle: date.bottom <= h1.top,
    };
  });
  expect(where).toEqual({
    inRow: true,
    inPanel: false,
    sameLine: true,
    afterButtons: true,
    pinned: true,
    aboveTheTitle: true,
  });

  // It is the chrome's now, so it repaints with the day rather than rolling
  // with it — and it still names the day the strip is on.
  await page.locator('.week-strip button').first().click();
  await expect(page.locator('.cal-reckoning .day-date')).toHaveText(/26 January 2026/);
  await expect(page.locator('.day-panel .day-date')).toHaveCount(0);
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

test('the saint name clears the fold at 360 px on a tall icon', async ({ page }) => {
  // The reason the image came down to 85%. Augustine is the tallest icon in
  // the corpus and 28 August is his day, so this is the worst case the corpus
  // actually holds rather than one constructed for the test.
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const name = await page.locator('.hero-name').boundingBox();
  expect(name.y).toBeLessThan(780);
});
