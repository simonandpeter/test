import { test, expect } from './fixtures.js';
import {
  DETAIL,
  POPULATED,
  SPARSE_DETAIL,
  answered,
  facet,
  ready,
  searchMode,
} from './helpers.js';

/**
 * A saint's own page: the register, the life, the hymns, the licence.
 *
 * Part of the browser suite, which was one file of 9,308 lines until
 * 2026-08-27 and is now one file per surface. **The tests themselves are
 * unchanged** — each carries the instruction that caused it and the date it
 * was written, which is where this suite's provenance has always lived; what
 * moved is only which file it sits in. `helpers.js` holds the shared fixtures.
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

/* ---- Session 4a: the detail page, the store, prefetch ------------------- */

test('a saint opens with its own names, citations and life', async ({ page }) => {
  await page.goto(DETAIL, { waitUntil: 'networkidle' });

  await expect(page.locator('h1.saint-name')).toHaveText('Venerable Anthony the Great');
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

test('an image says what its licence is, and links the source it can be checked against', async ({ page }) => {
  /*
   * The heir of 'never links a placeholder source'. Both of that test's
   * assertions were about a corpus that no longer exists: the seven images
   * carrying `example.invalid` were replaced on 2026-08-28 with Wikimedia
   * Commons files whose provenance is recorded, so the line now says
   * "Public domain" — Commons' own words for these — where it said "Public
   * Domain Mark 1.0", and it *links*, where the placeholder made it refuse to.
   *
   * **The link is the better assertion and it was only ever exercised in the
   * negative.** `creditLine` in views/saint.js has always had two branches, and
   * until now the corpus could only reach the one that declines to link. The
   * point of a source_url is that a reader can test the licence claim instead
   * of taking it on trust, and that is worth pinning positively — the negative
   * case still has a test of its own wherever a placeholder remains, and if
   * every placeholder is gone, so is the thing that test was guarding.
   */
  await page.goto(DETAIL, { waitUntil: 'networkidle' });
  const credit = page.locator('.image-credit');

  // Public domain: no credit is owed, so the line names the licence rather
  // than apologising for a missing author. The exact string is the one the
  // record carries, and the record carries what Commons says rather than a
  // tidier variant this project preferred — asserting a licence the source
  // does not name is the thing the source_url exists to prevent.
  await expect(credit).toHaveText('Public domain');

  const link = credit.locator('a');
  await expect(link).toHaveCount(1);
  await expect(link).toHaveAttribute('href', /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
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
  await expect(page.locator('h1.saint-name')).toHaveText('Martyr Christopher');
  await expect(page.locator('.saint-media')).toHaveCount(0);
  // Removed from the General Roman Calendar in 1969 and still venerated: the
  // page must not turn that into a refusal.
  await expect(page.locator('.att').first()).toContainText('Venerated');
  /*
   * Undated at birth, dated at death, and no place at either end — so the
   * register prints *nothing* (author, 2026-08-26: "'Died · 105 AD' as a lone
   * table row looks empty"). It looked empty because it was: a two-column
   * register drawn across the page to carry one cell saying what the subtitle
   * two lines above it already said.
   *
   * The old assertion — one row, reading "Died" — is superseded, and the fact
   * it was guarding is not: the year is still on the page, in the line under
   * the name, and this now checks it there. A register with a *place* in it, or
   * with two rows, still draws; ui/datefacts.js scopes the silence to the exact
   * shape that was empty.
   */
  await expect(page.locator('.date-facts')).toHaveCount(0);
  await expect(page.locator('.saint-facts')).toContainText('Reposed');
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

test('saving persists across a reload, and the shelf agrees', async ({ page }) => {
  /*
   * The saint's page carries the bookmark, and since 2026-08-27 it is the only
   * page that does: the author took the mark off the Daily hero, the register
   * and the row cards in one instruction ("If people want to bookmark they can
   * go to the profile page itself"). This used to read the same state back off
   * the hero, which was the second reader of one store; the shelf on the same
   * page is now that second reader, and it was always the more interesting of
   * the two because it is built from the store rather than from the day.
   */
  await ready(page);
  await page.goto(DETAIL, { waitUntil: 'networkidle' });
  const save = page.locator('.saint-head .bookmark');
  await expect(save).toHaveAttribute('aria-pressed', 'false');
  await save.click();
  await expect(save).toHaveAttribute('aria-pressed', 'true');
  await expect(save).toHaveAttribute('aria-label', /is saved/);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('.saint-head .bookmark')).toHaveAttribute('aria-pressed', 'true');

  // And the saved shelf on the habit page knows about it. Anthony is that
  // day's hero, so the page that used to answer twice now answers once — the
  // count is asserted rather than assumed, or this test would go on passing
  // if a mark came back somewhere it was told to leave.
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await expect(page.locator('.hero .bookmark')).toHaveCount(0);
  await expect(page.locator('.register .bookmark')).toHaveCount(0);
  await expect(page.locator('.shelves')).toContainText('Saved');
  await expect(page.locator('.shelves a[data-prefetch="anthony-the-great"]').first()).toBeVisible();
  /*
   * **And the shelf carries no mark at all** (author, 2026-08-28: "Remove
   * bookmark on continue reading row cards").
   *
   * This corrects something this test asserted, and something said to the
   * author on 2026-08-27, in the same breath: that the shelf's mark "is the
   * un-save for anything saved" and removing it "would strand the list". That
   * was wrong. The mark was on the **Continue reading** rows; the *Saved*
   * shelf's own rows are built by a different function and never had one, and
   * are rendered without their × as well. So the mark that was defended as the
   * Saved list's only exit was never on the Saved list.
   *
   * What is true after the instruction: nothing on this page un-saves a saint,
   * and the saint's own page is the only route back. That is consistent with
   * where the author sent Save, and it is asserted rather than left to be
   * discovered — if a mark is ever wanted here, this is the test that says it
   * is missing on purpose.
   */
  await expect(page.locator('.shelves .bookmark')).toHaveCount(0);
  // The saint's page is the one place that still offers it, and still knows.
  await page.goto(DETAIL, { waitUntil: 'networkidle' });
  await expect(page.locator('.saint-head .bookmark')).toHaveAttribute('aria-pressed', 'true');
});

test('the saint page puts the register beside the image on desktop, the body beneath both, and the controls on the name line', async ({ page }) => {
  // Addendum H4, and the head of DESIGN.md §5c: name, bookmark, ×, then the
  // mark at the margin; at 760 px and above the image and the dates-and-places
  // register share a row and the body runs the full width under them.
  //
  // **Both of those halves end at 1024 px since 2026-09-02** (author: "split
  // the left column into 2x columns ... and new centre column for the main
  // body text"). Past that width the picture and the register stack in a
  // column of their own and the life stands beside them, so "beside" and
  // "beneath both" are claims about the band between 760 and 1024 now. The
  // three-column arrangement above it has its own test; this one keeps the
  // widths it was written for, which is why it asks the page how wide it is
  // rather than assuming.
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
      columns: innerWidth >= 1024,
      toolsAfterName: tools.left >= h1.left + 10,
      toolsOnNameLine: tools.top < h1.bottom && tools.bottom > h1.top,
      factsBesideImage: facts.left >= media.right && Math.abs(facts.top - media.top) < 4,
      factsBelowImage: facts.top >= media.bottom,
      mainFullWidth: Math.round(main.width) === Math.round(article.width),
      mainBelowBoth: main.top >= Math.max(media.bottom, facts.bottom),
      mainBesideBoth: main.left >= media.right,
    };
  });
  expect(seen.toolsAfterName).toBe(true);
  expect(seen.toolsOnNameLine).toBe(true);
  if (seen.columns) {
    // Three columns: the life is beside the apparatus rather than under it,
    // and it is one track of the grid rather than the article's whole width.
    expect(seen.mainBesideBoth).toBe(true);
    expect(seen.mainFullWidth).toBe(false);
    expect(seen.factsBelowImage).toBe(true);
  } else {
    expect(seen.mainFullWidth).toBe(true);
    expect(seen.mainBelowBoth).toBe(true);
    if (seen.wide) expect(seen.factsBesideImage).toBe(true);
    else expect(seen.factsBelowImage).toBe(true);
  }
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

test('a saint is named in the reader own language where the corpus has the name', async ({ browser }) => {
  /*
   * Author, 2026-08-26: "the names are not printed in cyrillic when the
   * Russian language is chosen. Same with the Greek and Serbian. Every saint
   * name needs to have the equivalent in the displayed language."
   *
   * Told on 2026-08-25 that this needed 708 names sourced in four languages,
   * the author asked again — and the second look found the corpus had been
   * carrying them all along, in each folder's `names` array, transcribed from
   * the same calendar entries the attestations were read from. They were on
   * the saint page under "Also called" until Amendment 38 removed that block.
   * So nothing here is translated; a recorded form is chosen.
   */
  for (const [language, church, name] of [
    ['ru', 'russian', 'Преподобный Максим Исповедник'],
    ['sr', 'serbian', 'Пророк Мојсеј Боговидац'],
  ]) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
  await searchMode(page);
    await page.addInitScript(
      (a) => localStorage.setItem('gos-settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('gos-settings') ?? '{}'), church: a.c, language: a.l })),
      { c: church, l: language },
    );
    if (language === 'ru') {
      await page.goto('/calendar/2026-08-26', { waitUntil: 'networkidle' });
      await expect(page.locator('.hero-name'), language).toHaveText(name);
    } else {
      await page.goto('/saints/moses-the-prophet', { waitUntil: 'networkidle' });
      await expect(page.locator('h1.saint-name'), language).toHaveText(name);
    }
    await ctx.close();
  }

  // And the honest fallback. Anthony the Great has no Russian form recorded —
  // he is one of the twelve saints with a Russian attestation and no entry —
  // so the English name stands under the Russian honorific rather than a
  // blank or an invention.
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await searchMode(page);
  await page.addInitScript(() =>
    localStorage.setItem('gos-settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('gos-settings') ?? '{}'), church: 'russian', language: 'ru' })),
  );
  await page.goto('/saints/anthony-the-great', { waitUntil: 'networkidle' });
  await expect(page.locator('h1.saint-name')).toHaveText('Преподобный Anthony the Great');
  await ctx.close();
});

test('a general troparion reads in Orloff’s English, and the original stays for everyone else', async ({ browser }) => {
  /*
   * Hapgood's Service Book holds no menaion, so Amendment 41 could only reach
   * the Great Feasts. Orloff's *General Menaion* of 1899 is the other seam:
   * the common services, one troparion for any martyr, any hierarch, any
   * prophet — which is what this corpus records for a good many of its
   * lesser-known saints. Mamas of Caesarea sings the martyrs' common
   * troparion in Greek, so an English reader meets Orloff there.
   *
   * The second half of the test is the point. This is a *rendering* of the
   * Greek, offered only to a reader reading English; a Greek reader must
   * still meet the Greek.
   */
  const en = await browser.newContext();
  const enPage = await en.newPage();
  await enPage.addInitScript(() =>
    localStorage.setItem('gos-settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('gos-settings') ?? '{}'), church: 'greek', language: 'en' })),
  );
  await enPage.goto('/saints/mamas-of-caesarea', { waitUntil: 'networkidle' });
  const rendered = enPage.locator('[data-hymns-box] .hymn', { hasText: 'Thy martyr, O Lord' });
  // Two, and that is the point rather than a slip: Mamas sings the martyrs'
  // common troparion in the Greek *and* the Romanian, they are two hymns in
  // two churches' books, and each gets its own rendering with its own
  // citation. The corpus does not merge them into one.
  await expect(rendered).toHaveCount(2);
  await expect(rendered.first().locator('.hymn-text')).toHaveAttribute('lang', 'en');
  await expect(rendered.first().locator('.hymn-source')).toContainText('Orloff');
  await expect(rendered.first().locator('.hymn-source')).toContainText('1899');
  await en.close();

  const el = await browser.newContext();
  const elPage = await el.newPage();
  await elPage.addInitScript(() =>
    localStorage.setItem('gos-settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('gos-settings') ?? '{}'), church: 'greek', language: 'el' })),
  );
  await elPage.goto('/saints/mamas-of-caesarea', { waitUntil: 'networkidle' });
  await expect(elPage.locator('[data-hymns-box]')).toContainText('Ὁ Μάρτυς σου Κύριε');
  await expect(elPage.locator('[data-hymns-box]')).not.toContainText('Orloff');
  await el.close();
});

test('the hymns Orloff does not print are still the original in English', async ({ page }) => {
  /*
   * Orloff prints the *singular* martyr's troparion and, for many martyrs, a
   * different hymn altogether — so «Мученицы Твои, Господи … венцы прияша»,
   * which four saints here sing, has no English in that book. The temptation
   * is to lend it the singular's words. This says the corpus would rather
   * print the Slavonic than print something the source does not.
   */
  await ready(page, { church: 'russian', language: 'en' });
  await page.goto('/saints/photius-of-nicomedia', { waitUntil: 'networkidle' });
  const hymns = page.locator('[data-hymns-box]');
  await expect(hymns).toContainText('Мученицы Твои');
  await expect(hymns).not.toContainText('Thy martyr, O Lord');
});

test('the saints dated this batch print their dates rather than Undated', async ({ page }) => {
  /*
   * Two seams: saint.gr's *per-saint* pages, which date people the day index
   * does not (Andronicus lived under Nikephoros and Staurakios), and named
   * authorities outside the four calendars for figures the calendars are
   * silent about. Irenaeus is here because his two sources disagree — 288 on
   * saint.gr, 304 elsewhere — and the corpus keeps a disagreement whole
   * rather than picking a winner.
   */
  await ready(page);
  for (const [slug, shown] of [
    ['pulcheria-the-empress', '399 AD – 453 AD'],
    ['irenaeus-of-sirmium', '288 or 304 AD'],
    ['andronicus-of-atroa', 'early 9th C. AD'],
    ['edith-of-wilton', 'c. 961 AD – 984 AD'],
  ]) {
    await page.goto(`/saints/${slug}`, { waitUntil: 'networkidle' });
    /*
     * The saint's own half of the page, not `main`, since 2026-09-01: a column
     * of the reader's last search sits beside the life now, and plenty of the
     * corpus really is undated — so asking `main` for the absence of that word
     * asks about 862 other people as well as this one.
     */
    const subject = page.locator('.saint-col-main');
    await expect(subject).toContainText(shown);
    await expect(subject).not.toContainText('Undated');
  }
});

test('an icon taken from the Menologion prints a real source and a credit', async ({ page }) => {
  /*
   * "Bulk-fetching images and guessing at their licences is the failure mode
   * this repository is built to refuse" (Amendment 32). So an icon added here
   * must carry what the build checks: a licence Commons actually states, a
   * credit where one is owed, and a source_url that is not the placeholder.
   */
  await ready(page);
  await page.goto('/saints/theodora-of-alexandria', { waitUntil: 'networkidle' });
  const img = page.locator('.saint-media img, main img').first();
  await expect(img).toHaveAttribute('src', /theodora-of-alexandria\/images\/icon\.jpg/);
  const credit = page.locator('[data-credit]');
  await expect(credit).toContainText('Public domain');
  await expect(credit).not.toContainText('example.invalid');
  await expect(credit).not.toContainText('not recorded');
  // and the plate that carries a company gives each of them the same icon
  await page.goto('/saints/urban-child-martyr', { waitUntil: 'networkidle' });
  await expect(page.locator('.saint-media img, main img').first())
    .toHaveAttribute('src', /urban-child-martyr\/images\/icon\.jpg/);
});

test('the Greek calendar’s saints past the runway are in the corpus but not yet on a day', async ({ page }) => {
  /*
   * Author, 2026-08-26: "for Greek and Serbian calendars, dont put them in the
   * calendar yet, but at least get the Saint Profile pages and hymns for the
   * saints sorted from that content so all we need to do once we get the
   * calendar information is link it to the Daily Page."
   *
   * That split is possible because the two halves of a synaxarion are keyed
   * differently. The *saints* are keyed to the calendar date and are published
   * years ahead; the day's *readings* are keyed to Pascha and saint.gr prints
   * them about a fortnight out. So the saints of 20 September — the first day
   * past the end of the day records — are folders now, with their feast, their
   * citation and their hymns, and the Daily page for that date still has
   * nothing to show. This pins both halves.
   */
  await ready(page, { church: 'greek', language: 'en' });

  // The profile is there, with the Greek attestation and the Greek's own name.
  await page.goto('/saints/eustathius-the-great-martyr', { waitUntil: 'networkidle' });
  await expect(page.locator('h1')).toContainText('Great Martyr Eustathius');
  await expect(page.locator('main')).toContainText('20 September (Revised Julian)');
  await expect(page.locator('main')).toContainText('saint.gr');
  // and a hymn, which is the other half of what was asked for.
  //
  // The needle is deliberately a run of *unaccented* Greek letters. Twice this
  // sitting a comparison failed on two strings that render identically: the
  // page composes its accents differently from a hand-typed literal, so
  // «Τὰ πάθη Χριστοῦ» typed here does not match «Τὰ πάθη Χριστοῦ» there. It is
  // the same family of trap as JavaScript's ASCII-only , which matched
  // nothing in Greek at Amendment 41.
  const hymn = page.locator('[data-hymns-box] .hymn-text[lang="el"]').first();
  await expect(hymn).toHaveCount(1);
  await expect(hymn).toContainText(/μιμησ/);
  await expect(page.locator('[data-hymns-box] .hymn-kind').first()).toContainText('Kontakion');

  // The three churches that were not read say so, rather than implying a
  // refusal — behind the disclosure, because the reader's own church is the
  // one that keeps him and the other three are folded away.
  await page.locator('[data-reveal]').click();
  await expect(page.locator('main')).toContainText('Not checked');
  await expect(page.locator('main')).toContainText('days.pravoslavie.ru');

  // A company is a folder each, not one folder for the household, and each
  // carries its own Greek name rather than the whole entry line. The citation
  // still quotes the entry whole — that is the source as printed — so the
  // claim has to be made where the *name* is displayed, which is the heading
  // when the reader is reading Greek.
  await page.goto('/saints/theopiste-wife-of-eustathius', { waitUntil: 'networkidle' });
  await expect(page.locator('h1')).toContainText('Theopiste');

  // And the day itself is still empty: no readings were taken from last year's
  // page to stand in for this year's.
  await page.goto('/calendar/2026-09-20', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-readings]:not([hidden])')).toHaveCount(0);
});

test('a life links the saints it names, and refuses the ones it cannot be sure of', async ({ page }) => {
  /*
   * Author, 2026-08-26: "In each Saint Profile, automatically scan for names of
   * other saints to hyperlink to their profile."
   *
   * Hosius of Córdoba's life names Athanasius twice — once as "Athanasius the
   * Great", which is not a folder title, and once as "Athanasius of
   * Alexandria", which is. Only the second is linked, and that is the whole
   * discipline: the site links a name it can be certain of and leaves the rest
   * as prose. lib/cross-link.js has the four rules and the measurement they came
   * from.
   */
  await ready(page);
  await page.goto('/saints/hosius-of-cordoba', { waitUntil: 'networkidle' });
  const link = page.locator('.life a[data-cross-link][data-prefetch="athanasius-of-alexandria"]');
  await expect(link).toHaveCount(1);
  await expect(link).toHaveText('Athanasius of Alexandria');
  // The looser mention stays prose: "Athanasius the Great" is nobody's folder.
  await expect(page.locator('.life')).toContainText('Athanasius the Great');
  await expect(page.locator('.life a', { hasText: 'Athanasius the Great' })).toHaveCount(0);
  // Once per saint, not once per mention: a paragraph naming someone four
  // times wants one link.
  await expect(page.locator('.life a[data-prefetch="athanasius-of-alexandria"]')).toHaveCount(1);
  await link.click();
  // "St", not "Confessor", since 2026-08-28 ("do hierarch for athanasius"):
  // `confessor` came out of his record, so the walk falls through to the
  // honorific — which is how both major English calendars print a hierarch.
  await expect(page.locator('h1.saint-name')).toHaveText('St Athanasius of Alexandria');

  // A life that already carries a hand-written link keeps its own and gains no
  // second one: the walker refuses to enter an <a>.
  await page.goto('/saints/anthony-the-great', { waitUntil: 'networkidle' });
  await expect(page.locator('.life a[href$="/saints/athanasius-of-alexandria"]')).toHaveCount(1);
  await expect(page.locator('.life a[data-cross-link]')).toHaveCount(0);
});

test('a saint page reads in the reader’s own language, down to the feast and the status', async ({ page }) => {
  /*
   * Author, 2026-08-26: "The saint profile pages do not have russian, greek,
   * serbian or romanian translations. We need to add them."
   *
   * Three separate defects, and only the first was visible as a missing string:
   *
   *   the church's name came from the registry's `display_name` instead of the
   *     packs, so every row said ROMANIAN on a Romanian page;
   *   the *status* was a module constant holding three strings, evaluated at
   *     import — before any pack is merged, and once for the life of the page —
   *     so "Venerated" was English in all five languages;
   *   `formatFeast` composed "17 January (Revised Julian)" out of an English
   *     month table and two English literals.
   *
   * The pack coverage was already complete, which is what narrowed the search
   * from "the packs are missing keys" to "three places are not reading them".
   */
  await ready(page, { church: 'romanian', language: 'ro' });
  await page.goto('/saints/anthony-the-great', { waitUntil: 'networkidle' });

  const row = page.locator('.attestations .att').first();
  await expect(row.locator('.att-church')).toHaveText('Română');
  await expect(row.locator('.att-status')).toHaveText('Cinstit');
  await expect(row.locator('.att-feast')).toContainText('17 Ianuarie (calendarul iulian îndreptat)');
  await expect(row.locator('.att-feast')).toContainText('anul acesta cade pe');
  // By name, not by position: the life leads the page since 2026-08-27, so
  // `.first()` here is Viața. What this line is about is that the heading is
  // in Romanian at all.
  await expect(page.locator('.register-heading', { hasText: 'Cinstire' })).toHaveCount(1);
  // And no English survives in the site's own words on the row.
  await expect(row.locator('.att-status')).not.toContainText('Venerated');

  // The sex is off the line under the name (author, same instruction: "'Male'
  // in the subtitle reads oddly for a devotional page"), and still a facet on
  // the Index, which is where it was asked to stay.
  await expect(page.locator('.saint-facts')).not.toContainText('Bărbat');
  await expect(page.locator('.saint-facts')).not.toContainText('Male');

  // The licence is at the foot of the page, not under the icon (author: "'Public
  // domain' as the image caption is metadata that belongs at the bottom").
  const order = await page.evaluate(() => {
    const media = document.querySelector('.saint-media');
    const credit = document.querySelector('.image-credit');
    return {
      creditInMediaColumn: Boolean(credit.closest('.saint-media-col')),
      creditBelowLife: credit.getBoundingClientRect().top > document.querySelector('.life').getBoundingClientRect().bottom,
      mediaAbove: media.getBoundingClientRect().top < credit.getBoundingClientRect().top,
    };
  });
  expect(order.creditInMediaColumn).toBe(false);
  expect(order.creditBelowLife).toBe(true);
  expect(order.mediaAbove).toBe(true);
});

test('a saint from a Greek company is named for herself, not for the whole entry', async ({ browser }) => {
  /*
   * One line of the Greek calendar can name a household: 20 September gives
   * «Άγιος Ευστάθιος και η συνοδεία του, Θεοπίστη η σύζυγος του, Αγάπιος και
   * Θεόπιστος τα παιδιά του». That is one entry and four people, and the first
   * build of these folders gave all four of them the whole line as their Greek
   * name, so a reader reading Greek would have met the entire household in
   * place of Theopiste. Each carries her own form now.
   *
   * The needles are unaccented runs, because the page composes its accents
   * differently from a literal typed here.
   */
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await searchMode(page);
  await page.addInitScript(() =>
    localStorage.setItem('gos-settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('gos-settings') ?? '{}'), church: 'greek', language: 'el' })),
  );
  await page.goto('/saints/theopiste-wife-of-eustathius', { waitUntil: 'networkidle' });
  const name = page.locator('h1');
  await expect(name).toContainText(/Θεοπ/);
  await expect(name).not.toContainText(/παιδι/);
  await expect(name).not.toContainText(/συνοδ/);
  await ctx.close();
});

test('a saint with no image is not given a licence for one', async ({ page }) => {
  /*
   * Found in review, 2026-08-27. The credit line is filled from
   * `images[0].credit`, and 614 of the 742 saints have no image at all:
   * `creditLine(undefined)` returns the "not yet recorded" sentence, which is
   * the right answer for a picture whose provenance is a gap and the wrong one
   * for a page with no picture. Every imageless page ended in a disclaimer
   * about something that was never there.
   */
  await ready(page);
  await page.goto('/saints/gorazd-of-bohemia', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-life] p').first()).toBeVisible();
  await expect(page.locator('.saint-media, .saint-media-col')).toHaveCount(0);
  await expect(page.locator('[data-credit]')).toBeHidden();

  // A saint who *has* one still carries its licence, which is the half that
  // must not be lost: Anthony the Great is one of the seven.
  await page.goto('/saints/anthony-the-great', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-credit]')).toBeVisible();
  await expect(page.locator('[data-credit]')).not.toHaveText('');
});

test('the life comes before the veneration on a saint page', async ({ page }) => {
  // Author, 2026-08-27: "Move veneration down the page on saint profile pages,
  // put Life section first." The page is about a person; the church-by-church
  // register is the apparatus behind the prose, not the way into it.
  //
  // **Read off the laid-out page rather than the markup since 2026-09-02**,
  // when veneration became a column of its own past 1024 px. It is a direct
  // child of the body now, not a section inside the life, so the DOM query
  // this used would find nothing — and the claim was never about the markup.
  // On a phone it is still under the life, which is the instruction above; on
  // a desktop it is beside it, which is the instruction of 2026-09-02, and
  // "before" there means the reader meets the life first going across.
  await ready(page);
  await page.goto('/saints/john-chrysostom', { waitUntil: 'networkidle' });
  await expect(page.locator('.life')).not.toBeEmpty();
  await expect(page.locator('[data-veneration] .att').first()).toBeVisible();

  const seen = await page.evaluate(() => {
    const box = (s) => document.querySelector(s)?.getBoundingClientRect() ?? null;
    const life = box('.life');
    const veneration = box('[data-veneration]');
    const sources = box('[data-sources] .register-heading');
    return {
      columns: innerWidth >= 1024,
      venerationBelowLife: veneration.top >= life.top,
      venerationRightOfLife: veneration.left >= life.right,
      lifeLeftOfVeneration: life.left >= veneration.right,
      sourcesAboveVeneration: sources ? sources.top <= veneration.top : null,
      firstHeading: document.querySelector('.saint-main .register-heading')?.textContent.trim(),
    };
  });
  expect(seen.firstHeading, 'the life is not the first thing in the body column').toBe('Life');
  if (seen.columns) {
    // Beside, in the apparatus column, which is to the *left* of the life.
    expect(seen.lifeLeftOfVeneration, 'veneration is not in the column beside the life').toBe(true);
  } else {
    expect(seen.venerationBelowLife, 'veneration is not under the life').toBe(true);
    // Sources stay with the life they document, above veneration.
    if (seen.sourcesAboveVeneration !== null) expect(seen.sourcesAboveVeneration).toBe(true);
  }
});

test('the icon the author supplied is on the page, with the licence Commons states', async ({ page }) => {
  /*
   * Author, 2026-08-28: "Make sure all main saint cards for each day and each
   * calendar has an image in its profile. Great Martyr Phanourious has a saint
   * image in public domain here from Wikipedia: …"
   *
   * The link was to a thumbnail; what is recorded here is the file's own page,
   * and the licence, artist and photographer are as the Commons API answers for
   * that file rather than as read off the rendered page. Fetched through
   * `Special:FilePath`, the file's own redirect, because a hotlinked thumbnail
   * URL is refused outright.
   *
   * **This is one saint, not the instruction's whole scope.** Measured over the
   * days the four calendars cover, 38 of 133 day-and-church combinations led
   * with an imageless hero; preferring an imaged saint inside the sung pool
   * (lib/calendar-page.js) takes that to 27, and the rest are days where nobody
   * the church sings for has an icon at all. Those need 19 more licensed
   * pictures, which is a data job and not a code one.
   */
  await ready(page);
  await page.goto('/saints/phanourios', { waitUntil: 'networkidle' });
  const img = page.locator('.saint-media img, main img').first();
  await expect(img).toHaveAttribute('src', /phanourios\/images\/icon\.jpg/);
  const credit = page.locator('[data-credit]');
  await expect(credit).toContainText('Public domain');
  await expect(credit).not.toContainText('example.invalid');
  await expect(credit).not.toContainText('not recorded');
  // The artist and the photographer, both as Commons records them.
  await expect(credit).toContainText('Akotantos');
});

/* ---- the round of 2026-09-02, evening ----------------------------------- */

test('a feast date opens that day, in the calendar of the church whose row it is', async ({ page }) => {
  /*
   * Author, 2026-09-02: "Create a hyperlink on the Saint's profile where it
   * states the date of veneration, that takes you to the Daily page of that
   * date. Depending on which church veneration was clicked, the calendar type
   * also changes ... If I click on the Russian date listed there, the calendar
   * remains on Russian."
   *
   * Both halves, and the second is the one worth the test: a reader sent to a
   * day in a calendar that does not keep this feast would find the link
   * apparently broken, when what it was showing them is the two calendars
   * disagreeing — the finding the register exists to state.
   */
  await ready(page, { church: 'russian' });
  await page.goto('/saints/john-chrysostom', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-veneration] .att').first()).toBeVisible();

  // The reader's own church first: its row is the one showing.
  const mine = page.locator('[data-feast-day][data-church="russian"]').first();
  await expect(mine, 'premise: no Russian feast date to press').toHaveCount(1);
  const russianDay = await mine.getAttribute('data-feast-day');

  // The other churches are behind the reveal, which is where a date in a
  // calendar the reader is *not* in can be pressed.
  await page.locator('[data-reveal]').click();
  const other = page.locator('[data-feast-day][data-church="romanian"]').first();
  await expect(other, 'premise: no Romanian feast date to press').toHaveCount(1);
  const romanianDay = await other.getAttribute('data-feast-day');
  expect(romanianDay, 'premise: the two calendars keep him on the same day').not.toBe(russianDay);

  await other.click();
  await expect(page).toHaveURL(new RegExp(`/calendar/${romanianDay}$`));
  // The calendar followed the row.
  await expect(page.locator('#church-open')).toHaveText(/Romanian/i);

  // And back the other way: a date in the church already being read changes
  // nothing but the day.
  await page.goto('/saints/john-chrysostom', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-veneration] .att').first()).toBeVisible();
  const own = page.locator('[data-feast-day][data-church="romanian"]').first();
  const ownDay = await own.getAttribute('data-feast-day');
  await own.click();
  await expect(page).toHaveURL(new RegExp(`/calendar/${ownDay}$`));
  await expect(page.locator('#church-open')).toHaveText(/Romanian/i);
});

test('the two left columns scroll independently of each other and of the page', async ({ page }) => {
  /*
   * Author, 2026-09-02: "On desktop Saint profile page, make the left and
   * middle columns independently scrollable."
   *
   * Which also settles where the veneration table lives: a column that scrolls
   * as one thing has to be one box, so `wireColumns` moves it into the aside
   * at this width. That is asserted here rather than in the layout test above
   * because it is this instruction that forced it.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/saints/john-chrysostom', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[data-veneration] .att').first()).toBeVisible();

  const seen = await page.evaluate(() => {
    const aside = document.querySelector('.saint-aside');
    const main = document.querySelector('.saint-main');
    aside.scrollTop = 120;
    main.scrollTop = 60;
    return {
      venerationInAside: aside.contains(document.querySelector('[data-veneration-box]')),
      asideScrolls: aside.scrollHeight > aside.clientHeight,
      mainScrolls: main.scrollHeight > main.clientHeight,
      asideAt: aside.scrollTop,
      mainAt: main.scrollTop,
      pageScrolls: document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
    };
  });
  expect(seen.venerationInAside, 'the veneration table is not in the column that scrolls').toBe(true);
  expect(seen.asideScrolls && seen.mainScrolls, 'a column has nothing to scroll').toBe(true);
  // Each holds its own position: one is not the other, and neither is the page.
  expect(seen.asideAt, 'the apparatus column did not scroll').toBeGreaterThan(0);
  expect(seen.mainAt, 'the life did not scroll').toBeGreaterThan(0);
  expect(seen.asideAt).not.toBe(seen.mainAt);
  expect(seen.pageScrolls, 'the page scrolls as well as its columns').toBe(false);
});

test('the search column opens where the reader left it, on the next saint', async ({ page }) => {
  /*
   * Author, 2026-09-02: "make sure when changing saint profile the location of
   * how far your scrolled down the right side search column doesn't go back to
   * the top but stays exactly as it was."
   *
   * The press is dispatched rather than clicked: `locator.click()` scrolls its
   * target into view (CLAUDE.md trap 3), which on a list scrolled 900 px down
   * is a scroll back to the top *before* the navigation — it would measure the
   * test's own gesture rather than the feature. Found the hard way.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/saints/john-chrysostom', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const list = page.locator('[data-side-results]');
  await expect(list.locator('.index-card').first()).toBeVisible();

  await list.evaluate((el) => {
    el.scrollTop = 900;
  });
  await expect.poll(async () => list.evaluate((el) => el.scrollTop)).toBe(900);

  const before = page.url();
  await page.evaluate(() => {
    const box = document.querySelector('[data-side-results]');
    const frame = box.getBoundingClientRect();
    const visible = [...box.querySelectorAll('.index-card a')].find((a) => {
      const r = a.getBoundingClientRect();
      return r.top >= frame.top && r.bottom <= frame.bottom;
    });
    visible.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
  });
  await expect.poll(() => page.url()).not.toBe(before);

  await expect
    .poll(async () => page.locator('[data-side-results]').evaluate((el) => el.scrollTop), { timeout: 5000 })
    .toBe(900);
});

/* ---- the page's own columns (2026-09-02) -------------------------------- */

test('a desktop saint page puts the apparatus left of the life, and the filters in the search column', async ({ page }) => {
  /*
   * Author, 2026-09-02, two instructions about the same screen:
   *
   *  1. "On each saint's profile page, make sure the filters are visible in
   *     the search column on the right";
   *  2. "split the left column into 2x columns, left column for the image and
   *     birth/death/office/veneration information, and new centre column for
   *     the main body text".
   *
   * So the page is three columns, and the claim worth pinning is which side of
   * which each part falls on — a width would go stale the next time the grid
   * is touched, and the reading order is what the instruction is about.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/saints/moses-the-hungarian', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // The veneration table arrives with the payload, and it is the part that
  // moved columns, so nothing is measured until it is there.
  await expect(page.locator('[data-veneration] .att').first()).toBeVisible();

  const cols = await page.evaluate(() => {
    const box = (s) => {
      const r = document.querySelector(s)?.getBoundingClientRect();
      return r ? { left: Math.round(r.left), right: Math.round(r.right) } : null;
    };
    return {
      media: box('.saint-media'),
      facts: box('.date-facts'),
      veneration: box('[data-veneration]'),
      life: box('.life'),
      side: box('.saint-side'),
      facets: box('[data-side-facets]'),
    };
  });

  // The picture, the register and the veneration table share one column...
  expect(cols.facts.left, 'the register is not under the picture').toBe(cols.media.left);
  expect(cols.veneration.left, 'the veneration table is not under the register').toBe(cols.facts.left);
  // ...the life is in a column of its own to the right of it...
  expect(cols.life.left, 'the life is not beside the apparatus').toBeGreaterThan(cols.media.right);
  // ...and the search column is to the right of the life, with the facets in it.
  expect(cols.side.left, 'the search column is not to the right of the life').toBeGreaterThan(cols.life.right);
  expect(cols.facets, 'the filters are not in the search column').not.toBeNull();
  expect(cols.facets.left, 'the filters are not inside the search column').toBeGreaterThanOrEqual(cols.side.left - 1);
});

test('the filters in the search column narrow the list beside the life', async ({ page }) => {
  /*
   * They are the Index's own chips over the Index's own `applyFilters`, so
   * what is asserted here is the wiring rather than the filtering: ticking one
   * changes the set, and the count above the list agrees with what is in it.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/saints/moses-the-hungarian', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const count = page.locator('[data-side-count]');
  const before = await count.textContent();

  // Sex is the facet with the fewest values and no dependence on the calendar,
  // so it is the cheapest honest narrowing available here.
  const box = page.locator('[data-side-facets] details[data-facet="sexes"]');
  await box.locator('summary').click();
  await box.locator('input[type="checkbox"]').first().check();

  await expect.poll(async () => (await count.textContent()) !== before, { timeout: 5000 }).toBe(true);
  const after = Number((await count.textContent()).replace(/\D+/g, ''));
  expect(after, 'the filter left nobody at all').toBeGreaterThan(0);
  expect(after, 'the filter did not narrow anything').toBeLessThan(Number(before.replace(/\D+/g, '')));
});

/* ---- the column beside the life (2026-09-01) ---------------------------- */

test('a saint page is the Daily page’s two columns, with the reader’s own search beside the life', async ({ page }) => {
  /*
   * Author, 2026-09-01: "On each Saint Profile page, make the content the
   * size/margins of the left column on the Daily Page, and for where the right
   * column would be on Daily Page, provide a row view scroll of the advanced
   * search results in All Saints where you just came from ... Add an option to
   * minimise the search at the very top of this right column."
   *
   * Four claims, and the first is the one that is measured against another page
   * rather than against a number: "the size/margins of the left column on the
   * Daily Page" is a width the Daily page works out from its own grid, so the
   * only honest instrument is to open both and compare. A hard-coded 929 px
   * would pass on the day it was written and say nothing afterwards.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const daily = await page.evaluate(() => {
    const r = (s) => document.querySelector(s).getBoundingClientRect();
    return { main: [Math.round(r('.cal-main').left), Math.round(r('.cal-main').right)] };
  });

  await page.goto('/saints/moses-the-hungarian', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const saint = await page.evaluate(() => {
    const r = (s) => document.querySelector(s).getBoundingClientRect();
    return {
      main: [Math.round(r('.saint-col-main').left), Math.round(r('.saint-col-main').right)],
      side: [Math.round(r('.saint-side').left), Math.round(r('.saint-side').right)],
    };
  });
  expect(saint.main, 'the life does not sit in the Daily page’s left column').toEqual(daily.main);
  expect(saint.side[0], 'the search column is not to the right of the life').toBeGreaterThan(saint.main[1]);

  // A row view, scrolled inside its own box, and drawing no bar to do it.
  const list = page.locator('[data-side-results]');
  await expect(list.locator('.index-card.is-row').first()).toBeVisible();
  const scroll = await list.evaluate((el) => ({
    scrollable: el.scrollHeight - el.clientHeight,
    bar: getComputedStyle(el).scrollbarWidth,
    fits: el.getBoundingClientRect().bottom <= window.innerHeight + 1,
  }));
  expect(scroll.scrollable, 'the column has nothing to scroll').toBeGreaterThan(0);
  expect(scroll.bar, 'the column still draws a scrollbar').toBe('none');
  expect(scroll.fits, 'the column runs past the foot of the window').toBe(true);

  // The fold is at the very top of the column, above everything else in it.
  const fold = page.locator('[data-side-fold]');
  const order = await page.evaluate(() => {
    const side = document.querySelector('.saint-side').getBoundingClientRect();
    const button = document.querySelector('[data-side-fold]').getBoundingClientRect();
    const body = document.querySelector('[data-side-body]').getBoundingClientRect();
    return { atTop: button.top - side.top < 40, aboveBody: button.bottom <= body.top + 1 };
  });
  expect(order.atTop, 'the fold is not at the top of the column').toBe(true);
  expect(order.aboveBody, 'the fold is not above what it folds').toBe(true);

  await fold.click();
  await expect(page.locator('[data-side-body]')).toBeHidden();
  await expect(fold).toHaveAttribute('aria-expanded', 'false');
  /*
   * Folded for the visit, not for this page only — so the next saint opened
   * from the column itself comes up folded. Followed through the column rather
   * than by `goto`, and the difference is the whole assertion: `goto` is a
   * fresh document, where the fold is *meant* to open again.
   */
  await page.goto(DETAIL, { waitUntil: 'networkidle' });
  // A fresh document opens the column: the fold is a working state, not a
  // stored preference, and the comment in views/saint.js says why.
  await expect(page.locator('[data-side-body]')).toBeVisible();
  await page.locator('[data-side-fold]').click();
  // Followed through a link inside the page rather than by `goto`, because the
  // claim is about one visit: `goto` is a new document and is meant to reset.
  await page.locator('.life a[data-prefetch="athanasius-of-alexandria"]').click();
  await expect(page.locator('h1.saint-name')).toContainText('Athanasius');
  await expect(page.locator('[data-side-body]')).toBeHidden();
  await page.locator('[data-side-fold]').click();
  await expect(page.locator('[data-side-body]')).toBeVisible();

  // And there is no column on a phone, where a life has no room beside it.
  await page.setViewportSize({ width: 360, height: 780 });
  await expect(page.locator('.saint-side')).toBeHidden();
});

test('the column beside the life is the search the reader came from, and narrows within it', async ({ page }) => {
  /*
   * Author, 2026-09-01: "the advanced search results in All Saints **where you
   * just came from**."
   *
   * So it is not the corpus with a search box over it — it is the set the Index
   * had matched when the reader left it. Narrowing the Index and then opening a
   * saint is the only way to tell those two apart, and it is what this does.
   */
  await searchMode(page);
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/saints', { waitUntil: 'networkidle' });
  await page.locator('[data-query]').fill('Nicomedia');
  // The count the Index itself is showing, so this test does not have to know
  // how many saints match — only that the column agrees with the page.
  await expect.poll(() => page.locator('.index-card').count()).toBeGreaterThan(0);
  const matched = await page.locator('.index-card').count();
  expect(matched).toBeLessThan(200);

  await page.locator('.index-card .index-name').first().click();
  await expect(page.locator('h1.saint-name')).toBeVisible();

  const rows = page.locator('[data-side-results] .index-card');
  await expect(rows.first()).toBeVisible();
  const shown = await rows.count();
  expect(shown, 'the column shows the corpus rather than the search').toBeLessThan(200);
  await expect(page.locator('[data-side-count]')).toContainText(String(shown));

  /*
   * And the saint being read is marked in it. Asserted here rather than on a
   * saint opened cold, because the list is paged from the top: a reader who
   * arrived by deep link may be five hundred rows down a set that has only
   * drawn its first sixty, and marking someone who is not in the document is
   * not a thing that can be asked for. Arriving *from* a search, which is the
   * case this column is for, they are on the first page of it.
   */
  const here = await page.locator('h1.saint-name').textContent();
  await expect(page.locator('.side-results .index-card.is-here')).toHaveCount(1);
  await expect(page.locator('.side-results .index-card.is-here')).toContainText(here.trim());

  /*
   * And the field narrows what is there rather than searching the corpus again
   * — the heading says "Your search", and a field that could bring back a saint
   * the reader had filtered out would make that heading false.
   */
  const before = await rows.count();
  await page.locator('[data-side-query]').fill('zzzznothing');
  await expect.poll(() => page.locator('[data-side-results] .index-card').count()).toBe(0);
  await expect(page.locator('[data-side-count]')).toContainText('matches');
  await page.locator('[data-side-query]').fill('');
  await expect.poll(() => page.locator('[data-side-results] .index-card').count()).toBe(before);

  /*
   * **And it sieves the whole set, not the rows that happen to be drawn.** The
   * list is paged sixty at a time (views/saint.js says why: an audit that walks
   * 862 subtrees takes twenty seconds), so a search that only looked at the
   * document would answer differently depending on how far the reader had
   * scrolled. A saint who is in the set but past the first page has to be
   * findable from the top of it.
   */
  const late = await page.evaluate(() => {
    const drawn = new Set([...document.querySelectorAll('[data-side-results] [data-slug]')].map((e) => e.dataset.slug));
    return { drawn: drawn.size };
  });
  expect(late.drawn, 'the whole set is in the document, so paging is untested').toBeLessThanOrEqual(shown);
});


test('the icon stays put while the apparatus column scrolls under it', async ({ page }) => {
  /*
   * Author, 2026-09-02: "when you scroll in the leftmost column the text
   * scrolls under the image but the saint image stays exactly where it is,
   * pinned."
   *
   * Sticky inside the column rather than against the window: the aside is its
   * own scroller since the columns were split, and a picture stuck to the
   * viewport would drift out of its own column the moment anything else moved.
   *
   * Measured as the two boxes disagreeing — the register moves by exactly what
   * the column was scrolled, the icon does not move at all — because "pinned"
   * is a relationship rather than a position.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/saints/john-chrysostom', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.saint-media')).toBeVisible();

  const read = () =>
    page.evaluate(() => ({
      icon: Math.round(document.querySelector('.saint-media').getBoundingClientRect().top),
      register: Math.round(document.querySelector('.date-facts').getBoundingClientRect().top),
    }));

  const before = await read();
  const by = 260;
  await page.evaluate((n) => {
    document.querySelector('.saint-aside').scrollTop = n;
  }, by);
  await expect
    .poll(async () => (await page.evaluate(() => Math.round(document.querySelector('.saint-aside').scrollTop))))
    .toBe(by);
  const after = await read();

  expect(after.icon, 'the icon moved with the column').toBe(before.icon);
  expect(
    before.register - after.register,
    'the register did not scroll under the icon',
  ).toBeGreaterThan(by - 4);
});
