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
  await expect(page.locator('.cal-reckonings')).toContainText('Coptic 22 Tobi');
});

test('an empty day is a designed state, not a hole', async ({ page }) => {
  await page.goto(EMPTY, { waitUntil: 'networkidle' });
  await expect(page.locator('.empty-day')).toHaveCount(1);
  await expect(page.locator('.hero')).toHaveCount(0);
  // The chrome stays: an empty day must still offer a way onward.
  await expect(page.locator('.week-strip button')).toHaveCount(7);
});

test('the card image box is reserved from manifest data before it loads', async ({ page }) => {
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const img = page.locator('.hero-media img');
  await expect(img).toBeVisible();
  const box = await img.boundingBox();
  const ratio = box.width / box.height;
  // Anthony's icon is 369x501; the rendered box must match its aspect, which
  // is what makes the no-layout-shift guarantee structural rather than lucky.
  expect(Math.abs(ratio - 369 / 501)).toBeLessThan(0.02);
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

test('date bars take their softness from the interval and nothing else', async ({ page }) => {
  await page.goto(DETAIL, { waitUntil: 'networkidle' });
  const blur = (i) =>
    page.locator('.date-bar').nth(i).evaluate((el) => getComputedStyle(el).filter);

  // Born c. 251 (a 2-year interval) draws softer than died 356 (exact).
  const [birth, death] = [await blur(0), await blur(1)];
  const px = (s) => parseFloat(/blur\(([\d.]+)px\)/.exec(s)[1]);
  expect(px(birth)).toBeGreaterThan(px(death));
  await expect(page.locator('.date-bars')).toHaveAttribute('aria-label', /Born c\. 251/);
});

test('an open bound runs off the window rather than taking a number', async ({ page }) => {
  await page.goto('/saints/moses-the-hungarian', { waitUntil: 'networkidle' });
  const bar = page.locator('.date-bar.open-start');
  await expect(bar).toHaveCount(1);
  await expect(page.locator('.date-bars')).toHaveAttribute('aria-label', /before 1000/);
});

test('a saint with no life, no image and no birth date is still a whole page', async ({ page }) => {
  await page.goto(SPARSE_DETAIL, { waitUntil: 'networkidle' });
  await expect(page.locator('h1.saint-name')).toHaveText('Christopher');
  await expect(page.locator('.saint-media')).toHaveCount(0);
  // Removed from the General Roman Calendar in 1969 and still venerated: the
  // page must not turn that into a refusal.
  await expect(page.locator('.att').first()).toContainText('Venerated');
  await expect(page.locator('.date-bar')).toHaveCount(1);
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
  await page.locator('[data-step="7"]').click();
  await expect(page.locator('h1')).toHaveText(/4 September 2026/);
  await page.locator('[data-step="-7"]').click();
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
  await expect(page.locator('.month-name')).toHaveText('September 2026');
  await swipe(page, '.cal-month', 120);
  await expect(page.locator('.month-name')).toHaveText('August 2026');

  // A short drag is a mistap, and a mostly-vertical one belongs to the scroll.
  await swipe(page, '.cal-month', -20);
  await swipe(page, '.cal-month', -120, 200);
  await expect(page.locator('.month-name')).toHaveText('August 2026');
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

test('the month keeps the week chevrons where they were, and names itself between them', async ({ page }) => {
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const box = async (sel) => (await page.locator(sel).first().boundingBox());
  const weekPrev = await box('.cal-week > button');
  const weekNext = await box('.cal-week > button:last-child');

  await page.locator('[data-month]').click();
  await expect(page.locator('.cal-month')).toBeVisible();
  const monthPrev = await box('.cal-month > button');
  const monthNext = await box('.cal-month > button:last-child');

  for (const [w, m] of [[weekPrev, monthPrev], [weekNext, monthNext]]) {
    expect(Math.round(m.x)).toBe(Math.round(w.x));
    expect(Math.round(m.y)).toBe(Math.round(w.y));
    expect(Math.round(m.height)).toBe(Math.round(w.height));
  }

  // The name is centred in the grid between them, not shoved against one side.
  const grid = await box('.month-view');
  const name = await box('.month-name');
  const slack = grid.x + grid.width / 2 - (name.x + name.width / 2);
  expect(Math.abs(slack)).toBeLessThan(2);
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

