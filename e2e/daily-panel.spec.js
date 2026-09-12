import { test, expect } from './fixtures.js';
import { openChooser, ready, searchMode } from './helpers.js';

/**
 * The Daily page, the day itself: what the standing column says about it, the
 * saints under it as tiles and as the open card, the hymns each of them is
 * given, and the readings at the foot.
 *
 * **Rewritten on 2026-09-12** (rebuild plan §8, §11.9's step 6b). This file
 * was 4,550 lines and about ninety tests against a hero, a two-faced register,
 * a fast bubble, a `slotSwap` roll, a day-panel swipe and a `cal-bubble` whose
 * geometry nine tests measured. Every one of those boxes was deleted that day
 * and its tests went with them: a test for a control nobody can press is not a
 * test, it is a description of a page that used to exist.
 *
 * Five survived, because all five are claims about *what the day says* rather
 * than about the furniture it was said in — the date line and its facts, the
 * readings, what the boot fetches, and where a returning reader lands. Each is
 * rewritten against the new selectors and each keeps the instruction and the
 * date that caused it, which is where this suite's provenance has always
 * lived.
 *
 * The rest of this file is new, and it is the other half of the same step:
 * the rebuild introduced a press that opens a card, a rule that *only* a press
 * may, a way through to the saint's own page, and a conditional about which
 * language's hymns a reader is given. None of the four had a test, and three
 * of them are functional regressions if they are ever missed silently.
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

/* ---- what the day says about itself ------------------------------------- */


test('the Daily page prints the civil date alone, the paschal cycle, the tone and the fast in its colour', async ({ page }) => {
  // Author, 2026-08-23, amended 2026-08-24: only the civil date is printed
  // now. Under it, where the day stands in the paschal cycle, the
  // tone, and whether it is a fast for this church — which is why the Russian
  // and the Greek disagree on the same civil day (the Dormition Fast runs to
  // 27 August on the Julian calendar). Each figure is what the church's own
  // calendar printed for the day (tests/liturgy.test.mjs has the comparison).
  /*
   * **The same four facts, in the standing column, since 2026-09-12.** The
   * date line and its chips were the hero's; the hero is gone and the column
   * that replaced it computes every one of them — `.day-date` for the date,
   * `.day-cycle` for the cycle and the tone, and one `.tag` each for the fast
   * and the feast. Nothing was dropped in the move and nothing was added, so
   * this test is the old one with its selectors changed and its assertions
   * where they were.
   */
  await ready(page, { church: 'russian', reckoning: null });
  await page.goto('/calendar/2026-08-23', { waitUntil: 'networkidle' });

  // One date, which is the whole of "the date alone": the page printed two
  // until 2026-08-24, and the reckoning the second one named is a caption
  // under this one now rather than a date beside it.
  //
  // A reader who has chosen no reckoning of their own follows their church's
  // (`reckoningInForce`, 2026-09-05), and this one's is Julian — so the date
  // printed is the day as the Russian calendar counts it, and the caption
  // under it gives the *other* reckoning, which for a Julian reader is the
  // civil date they will find on a wall.
  await expect(page.locator('.day-date')).toHaveCount(1);
  await expect(page.locator('.day-date')).toHaveText('10 August 2026');
  await expect(page.locator('.day-old')).toHaveText('23 August by the civil calendar');

  /*
   * The grade leads the tag where the church's own calendar printed one
   * (author, 2026-08-25 evening: "the fasting text should say which type of
   * fast is required"). days.pravoslavie.ru printed «разрешается пища с
   * растительным маслом» for this day, so it says Oil and wine — read off that
   * note by lib/fast-grade.js, never computed. lib/liturgy.js still refuses to
   * compute an allowance, which is why a day whose calendar printed none still
   * says only "Strict Fasting".
   *
   * **The occasion trails the grade on one line again** (2026-09-12). It had
   * been a chip of its own beside the fast chip since 2026-08-26; the column
   * has room for two tags and not four, so the fast tag carries "the Dormition
   * Fast" after a middot and the second tag is kept for the Great Feast. The
   * facts and the order are the ones the author asked for — the fast first,
   * then what it allows, then the occasion — and the suppression rule below is
   * unchanged.
   */
  await expect(page.locator('.day-tags .tag.is-fast')).toHaveText('Oil and Wine Allowed · the Dormition Fast');
  await expect(page.locator('.day-tags .tag.is-fast')).toHaveAttribute('data-fast', 'fast');
  await expect(page.locator('.day-cycle')).toHaveText('12th Sunday after Pentecost · Tone 3');
  // A day that is not one of the Twelve says so rather than leaving a gap: a
  // row of tags that loses one changes shape from day to day.
  await expect(page.locator('.day-tags .tag.is-none')).toHaveText('No Great Feast');

  // A tag, not a run of coloured words: it carries an outline and a corner of
  // its own colour, which is what makes it findable before it is read.
  const tag = await page.locator('.day-tags .tag.is-fast').evaluate((el) => {
    const cs = getComputedStyle(el);
    return { radius: parseFloat(cs.borderTopLeftRadius), border: parseFloat(cs.borderTopWidth), colour: cs.color };
  });
  expect(tag.radius).toBeGreaterThan(0);
  expect(tag.border).toBeGreaterThan(0);

  // A life with no recorded beginning is read from its end (author,
  // 2026-08-24): the day's leading saint, Lawrence of Kaluga, said
  // "undated – 1515" until then, and "Entered eternal glory in 1515" until
  // 2026-08-25, when the author replaced the phrase with plain "Reposed".
  // The office joined the line under the name on 2026-08-27, when it moved out
  // of `display_name`: the name reads "Blessed Lawrence of Kaluga" and this
  // line says what he was.
  await expect(page.locator('.day-tile.is-open .row-sub').first()).toHaveText('Fool for Christ · Reposed 1515');

  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  await expect(page.locator('.day-date')).toHaveText('15 August 2026');
  // A fish-permitted day resolves to the `fish` grade, which is the one grade
  // taken from lib/liturgy.js rather than from a printed note — that claim is
  // liturgy.js's own and predates this.
  //
  // The occasion is *not* printed beside the grade on this day: "a Great Feast
  // on a Friday" and the gold tag's "Great Feast - The Dormition of the
  // Theotokos" are the same sentence twice, so the one that names the feast
  // wins and the other is suppressed.
  await expect(page.locator('.day-tags .tag.is-fish')).toHaveText('Oil, Wine and Fish Allowed');
  await expect(page.locator('.day-tags .tag.is-fish')).toHaveAttribute('data-fast', 'fish');
  await expect(page.locator('.day-tags .tag.is-feast')).toHaveText('Great Feast - The Dormition of the Theotokos');
  await expect(page.locator('.day-tags .tag.is-none')).toHaveCount(0);

  await openChooser(page);
  await page.locator('#church-panel [data-church="greek"]').click();
  // **Each tradition in its own reckoning**, which is the same civil day
  // printed as two different dates: the Greek follow the Revised Julian, so
  // the day the Russian column called 15 August is 28 August here — and the
  // Dormition Fast that governs the one is over for the other.
  await expect(page.locator('.day-date')).toHaveText('28 August 2026');
  // An ordinary Friday, whose calendar printed no allowance. It said
  // "Fast - Friday" and stopped until the evening of 2026-08-26; it is Strict
  // Fasting by default now, and the weekday goes with the change because on
  // this day the reason *was* the weekday (PLAN.md carries the reversal).
  await expect(page.locator('.day-tags .tag.is-fast')).toHaveText('Strict Fasting');
  await expect(page.locator('.day-cycle')).toHaveText('13th week after Pentecost · Tone 3');

  await page.goto('/calendar/2026-08-23', { waitUntil: 'networkidle' });
  await expect(page.locator('.day-tags .tag.is-free')).toHaveText('No Fast');
  await expect(page.locator('.day-tags .tag.is-free')).toHaveAttribute('data-fast', 'fast-free');
  await expect(page.locator('.day-cycle')).toHaveText('12th Sunday after Pentecost · Tone 3');
  // The three states are told apart by colour as well as by their wording
  // (author, 2026-08-24), and no two of them are the same colour.
  const free = await page.locator('.day-tags .tag.is-free').evaluate((el) => getComputedStyle(el).color);
  expect(free).not.toBe(tag.colour);
});


test('the readings of the day link to Bible Gateway and name the page they were read from', async ({ page }) => {
  // Author, 2026-08-23. Recorded per church for the week of 23 August; the
  // Russian reads the Dormition on the 28th where the Greek reads the weekday,
  // and a day nobody has recorded prints nothing.
  /*
   * **The readings stay, at the foot of the day** (rebuild plan §11.2). The
   * mockup the page was rebuilt from is silent about them, and that silence is
   * an absence of design rather than a decision to drop them: they are
   * transcribed by hand into `data/liturgical-days.js`, which is work that
   * cannot be regenerated. So `views/daily/record.js` is not deleted and its
   * markup is unchanged — it moved from a column beside the day into
   * `.day-foot`, below the last tile, and this test is the one it shipped
   * with.
   */
  await ready(page, { church: 'russian' });
  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  // Under the day's saints, not beside them: the rule above the foot is what
  // says where one kind of fact ends and the other begins.
  await expect(page.locator('.day-foot [data-readings]')).toHaveCount(1);
  const links = page.locator('[data-readings] .readings a');
  await expect(links).toHaveCount(2);
  await expect(links.first()).toHaveText('Philippians 2:5-11');
  await expect(links.first()).toHaveAttribute('href', /biblegateway\.com\/passage\/\?search=Philippians%202%3A5-11&version=NKJV/);
  await expect(page.locator('[data-readings] .readings-source a')).toHaveAttribute('href', /days\.pravoslavie\.ru\/Days\/20260815\.html/);
  await openChooser(page);
  await page.locator('#church-panel [data-church="greek"]').click();
  await expect(page.locator('[data-readings] .readings a').first()).toHaveText('2 Corinthians 11:5-21');
  // 20 September is a recorded day for the Russian and Romanian calendars
  // since — but not for the Greek, which is the church selected
  // here: saint.gr publishes about a fortnight ahead and its records stop on
  // the 19th. So this still shows nothing, and now it shows nothing for a
  // reason a reader could check.
  await page.goto('/calendar/2026-09-20', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-readings]')).toHaveCount(0);
});

/* ---- the press that opens a card (2026-09-12) ---------------------------- */


test('a tile opens on a press, comes to the head of the day, and takes the scroller to the top', async ({ page }) => {
  /*
   * Author, 2026-09-12, twice over and in his own words. First: "You have to
   * click on an entry to expand it." Then, when the first draft left the
   * opened card wherever its tile had been: "Tiles do not go above the open
   * card, they always stay at the bottom of the page."
   *
   * Three claims and they are one gesture. A press opens the tile it was made
   * on; the day's order is rewritten so the open saint is first and everyone
   * else follows in the day's own order — which also drops the saint that
   * *was* open back among the tiles rather than leaving it stranded; and the
   * scroller returns to the top, because the card is now the first thing in
   * the day and the reader should be looking at it rather than at where the
   * tile used to be.
   *
   * **The elements are moved, not rebuilt** (`views/daily/open.js`), so a
   * picture that has arrived stays arrived and a life that has landed stays
   * landed. That is asserted here by the tile keeping the identity it had: the
   * element that was the fourth tile *is* the element that is now the card.
   *
   * At a desk, where the strip is the thing that scrolls. Below 1024 px the
   * page scrolls instead and `.td-scroll` is a plain block with no scroll of
   * its own to return, so the second half of this runs at 360 and asserts the
   * half that is true there.
   */
  await ready(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const order = () => page.locator('.day-grid > .day-tile').evaluateAll((t) => t.map((x) => x.dataset.slug));
  const opened = () => page.locator('.day-tile.is-open').evaluateAll((t) => t.map((x) => x.dataset.slug));

  // The day opens on its first saint, which `views/calendar.js` has already
  // put first by `pickHero` — so the reader is given a card without asking.
  const day = await order();
  expect(day.length, 'premise: 5 September no longer holds a day of saints').toBeGreaterThan(4);
  expect(await opened()).toEqual([day[0]]);

  // Scrolled away from the top, so the return is a movement and not a state
  // the page was already in.
  await page.locator('[data-td-scroll]').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect.poll(() => page.locator('[data-td-scroll]').evaluate((el) => el.scrollTop)).toBeGreaterThan(100);

  const wanted = day[3];
  const tile = page.locator(`.day-tile[data-slug="${wanted}"]`);
  // Stamped so the assertion below is about *this element* rather than about
  // an element that happens to carry the same slug: a rebuild would lose it.
  await tile.evaluate((el) => {
    el.dataset.sameElement = 'yes';
  });
  await tile.locator('.row-sub').click();

  await expect(page.locator('.day-tile.is-open')).toHaveAttribute('data-slug', wanted);
  await expect(page.locator('.day-tile.is-open')).toHaveAttribute('data-same-element', 'yes');
  expect(await opened(), 'two cards are open at once').toEqual([wanted]);
  // The open card leads and the day's own order closes up behind it.
  expect(await order()).toEqual([wanted, ...day.filter((s) => s !== wanted)]);
  // The scroller goes home, over `--dur-move` rather than in one jump, so this
  // polls rather than reading once.
  await expect.poll(() => page.locator('[data-td-scroll]').evaluate((el) => Math.round(el.scrollTop))).toBe(0);

  /*
   * **And on a phone, where there is no strip to return.** The press and the
   * re-forming of the day are the same; what is missing is the scroll, because
   * the page owns it below 1024 px and `views/daily/open.js` deliberately does
   * not reach for the window — a reader who has scrolled the page has scrolled
   * *the page*, and yanking it to the top under them is the fault this whole
   * control was written to avoid.
   */
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  const phoneDay = await order();
  const phoneWanted = phoneDay[2];
  await page.locator(`.day-tile[data-slug="${phoneWanted}"] .row-sub`).click();
  await expect(page.locator('.day-tile.is-open')).toHaveAttribute('data-slug', phoneWanted);
  expect(await order()).toEqual([phoneWanted, ...phoneDay.filter((s) => s !== phoneWanted)]);
});


test('scrolling the day opens nothing — only a press does', async ({ page }) => {
  /*
   * Author, 2026-09-12, as a correction: "Make it so scrolling DOES NOT expand
   * it. You have to click on an entry to expand it."
   *
   * The fold that preceded this was scroll-driven, and it had two faults a
   * reader felt: a saint opened because they happened to stop there, and the
   * page changed height under them while they were reading it. So
   * `views/daily/open.js` has one delegated click listener and nothing else —
   * no scroll listener, no `IntersectionObserver`, no `scroll-snap` — and this
   * is the test of that absence.
   *
   * **Stated as a negative, which means the premise has to be stated too.**
   * The scroll below has to be a scroll that *could* have opened something: it
   * has to move, and it has to move far enough that a different saint is under
   * the eye at the end of it. Both are asserted, or this passes on a page that
   * never scrolled.
   *
   * Run at whichever width the project is, because the two widths scroll
   * different things — the strip at a desk, the page on a phone — and the rule
   * is about both.
   */
  await ready(page);
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const state = () =>
    page.evaluate(() => ({
      open: [...document.querySelectorAll('.day-tile.is-open')].map((t) => t.dataset.slug),
      order: [...document.querySelectorAll('.day-grid > .day-tile')].map((t) => t.dataset.slug),
    }));

  const before = await state();
  expect(before.open.length, 'premise: the day opened on nothing').toBe(1);
  expect(before.order.length, 'premise: this day has too few saints to scroll past').toBeGreaterThan(4);

  // Whichever box actually holds the scroll at this width, taken as far as it
  // goes — and the distance is checked, so a page that refused to move cannot
  // report itself as a page that moved and stayed shut.
  const travelled = await page.evaluate(() => {
    const strip = document.querySelector('[data-td-scroll]');
    const scrolls = strip.scrollHeight > strip.clientHeight + 1;
    const from = scrolls ? strip.scrollTop : window.scrollY;
    if (scrolls) strip.scrollTop = strip.scrollHeight;
    else window.scrollTo(0, document.body.scrollHeight);
    return (scrolls ? strip.scrollTop : window.scrollY) - from;
  });
  expect(travelled, 'premise: the day did not scroll, so nothing was asked of it').toBeGreaterThan(200);
  // A moment for a listener that does not exist to have fired.
  await page.waitForTimeout(400);

  const after = await state();
  expect(after.open, 'a saint opened because the reader scrolled past it').toEqual(before.open);
  expect(after.order, 'the day re-formed itself under a reader who only scrolled').toEqual(before.order);
});


test("the open card's name is the way through to the saint's own page", async ({ page }) => {
  /*
   * Rebuild plan §11.7a, found in review rather than in the mockup: making a
   * press *open the card* took the register row's link to `/saints/<slug>`
   * with it, and the Daily page became a dead end — the one page a reader
   * arrives on by habit, with no way from a saint's name to that saint's life.
   * Nothing in the reference would have caught it, and
   * `e2e/index-grid.spec.js` is testing exactly that path from the other side.
   *
   * So the name carries the anchor from the first paint, and the two states
   * are different on purpose: folded, the press opens the tile and the
   * anchor's default is cancelled, because the name is the tile's own
   * affordance and not a trapdoor to another page; open, the anchor is live
   * and is the reader's way to the whole life.
   */
  await ready(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const openSlug = await page.locator('.day-tile.is-open').getAttribute('data-slug');
  // Both names on the card point at the same saint — the one over the picture
  // and the one that heads the life column where there is no picture to head
  // it — so which of the two the layout shows cannot change where it goes.
  const hrefs = await page.locator('.day-tile.is-open a.row-link').evaluateAll((a) => a.map((x) => x.getAttribute('href')));
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) expect(href).toMatch(new RegExp(`/saints/${openSlug}$`));

  // A folded tile's name is not a way out: the press opens it instead, which
  // is the whole of what makes the tile pressable anywhere on its face.
  const folded = page.locator('.day-tile:not(.is-open)').first();
  const foldedSlug = await folded.getAttribute('data-slug');
  await folded.locator('a.row-link').first().click();
  await expect(page).toHaveURL(/\/calendar\/2026-09-05$/);
  await expect(page.locator('.day-tile.is-open')).toHaveAttribute('data-slug', foldedSlug);

  // And now that it is open, the same anchor goes where it says it goes.
  await page.locator('.day-tile.is-open a.row-link').locator('visible=true').first().click();
  await expect(page).toHaveURL(new RegExp(`/saints/${foldedSlug}$`));
  await expect(page.locator('h1').first()).toBeVisible();
});

/* ---- which language's hymns a reader is given (2026-09-12) --------------- */


test('an English reader is given English hymns only, and a column with none says so', async ({ page }) => {
  /*
   * Author, 2026-09-12: "When English is the language, I only want English
   * hymns showing." A conditional, not a blanket — the other half is the test
   * below — and the reason is plain: a reader who has chosen English and meets
   * Church Slavonic has been given nothing.
   *
   * **A column that has nothing keeps its place and says so.** A column that
   * vanished would move the other three and would tell the reader nothing
   * about whether the hymn exists; the line is drawn into the box before the
   * payload lands and redrawn with the same words after it, which is also how
   * the four columns keep their width through the fetch.
   *
   * 23 August in the Russian calendar holds both halves at once: Lawrence of
   * Kaluga's troparion and kontakion both carry an English rendering, and
   * Agapitus the Deacon has no Russian hymn at all.
   */
  await ready(page, { church: 'russian' });
  await page.goto('/calendar/2026-08-23', { waitUntil: 'networkidle' });

  const card = page.locator('.day-tile.is-open');
  await expect(card).toHaveAttribute('data-slug', 'lawrence-of-kaluga');
  // Both columns, filled — polled, because the life and the hymns arrive with
  // the saint's own payload rather than with the paint.
  await expect.poll(() => card.locator('.hymn-text').count()).toBe(2);

  const hymns = await card.locator('.hymn-text').evaluateAll((els) =>
    els.map((el) => ({ lang: el.getAttribute('lang'), text: el.textContent.trim() })),
  );
  for (const hymn of hymns) {
    // The reader's own tongue, said so on the element, so a screen reader is
    // never handed English in a Slavonic voice.
    expect(hymn.lang, 'a hymn on an English page is not marked as English').toBe('en');
    // And it is genuinely the rendering rather than the original: the source
    // text for both of these is Church Slavonic, so a single Cyrillic letter
    // here is the filter having failed open.
    expect(hymn.text, 'the original was printed to an English reader').not.toMatch(/[Ѐ-ӿ]/);
  }

  /*
   * And the saint with no hymn in this calendar keeps two columns that admit
   * it — in the English form of the admission, which is the half that says
   * *English* rather than "your language". The two forms are two strings
   * because the rule above them is conditional; one line could not say both
   * without naming English to a reader who never asked for it.
   */
  const bare = page.locator('.day-tile[data-slug="agapitus-the-deacon"]');
  await expect(bare.locator('[data-hymn="troparion"] .row-none')).toHaveText('No English rendering recorded');
  await expect(bare.locator('[data-hymn="kontakion"] .row-none')).toHaveText('No English rendering recorded');
  await expect(bare.locator('.hymn-text')).toHaveCount(0);

  /*
   * **And the case the conditional was actually written for**: a hymn that
   * exists, in a tradition's own tongue, with nobody's English rendering
   * behind it. Alexander Nevsky's troparion in the Serbian calendar is the
   * corpus's one such hymn — 30 August Julian, the translation of his relics —
   * and before this rule an English reader met it in Serbian, which is the
   * whole of what the author was objecting to. The column says there is no
   * English instead, which is true, and says nothing about a text it is not
   * showing.
   */
  await page.evaluate(() => {
    const key = 'gos-settings';
    localStorage.setItem(key, JSON.stringify({ ...JSON.parse(localStorage.getItem(key)), church: 'serbian' }));
  });
  await page.goto('/calendar/2026-09-12', { waitUntil: 'networkidle' });
  const nevsky = page.locator('.day-tile[data-slug="alexander-nevsky"]');
  await expect(nevsky, 'premise: 30 August Julian no longer keeps Alexander Nevsky').toHaveCount(1);
  await expect(nevsky.locator('[data-hymn="troparion"] .row-none')).toHaveText('No English rendering recorded');
  await expect(nevsky.locator('[data-hymn="kontakion"] .row-none')).toHaveText('No English rendering recorded');
  // Nothing at all, rather than the Serbian text under an English heading.
  await expect(nevsky.locator('.hymn-text')).toHaveCount(0);
});


test("a reader in another language is given that tradition's own text", async ({ page }) => {
  /*
   * The other half of the same conditional (rebuild plan §11.1, and
   * `e2e/daily-panel.spec.js`'s own "a Greek reader keeps the Greek" from
   * 2026-08-26, which this replaces). Reading Greek, Russian, Romanian or
   * Serbian, the tradition's own text is shown exactly as `hymnMarkup` prints
   * it — because an English reader meeting Church Slavonic has been given
   * nothing and a Russian reader meeting it has been given the hymn.
   *
   * Two languages rather than one, because one would pass on a rule that
   * simply never filters: the Russian reader gets the Church Slavonic, the
   * Greek reader gets the Greek, and each of them gets the empty column's
   * admission in their own language naming their own tongue.
   */
  await ready(page, { church: 'russian', language: 'ru' });
  await page.goto('/calendar/2026-08-23', { waitUntil: 'networkidle' });

  const russian = page.locator('.day-tile[data-slug="lawrence-of-kaluga"]');
  await expect.poll(() => russian.locator('.hymn-text').count()).toBe(2);
  const slavonic = await russian.locator('.hymn-text').first().evaluate((el) => ({
    lang: el.getAttribute('lang'),
    text: el.textContent.trim(),
  }));
  // Church Slavonic, said so, and not the English rendering the same folder
  // also carries.
  expect(slavonic.lang).toBe('cu');
  expect(slavonic.text).toMatch(/[Ѐ-ӿ]/);
  // Each pack names its own language outright — "no Russian text" — where the
  // English base can only say "yours", having no other language to point at.
  await expect(page.locator('.day-tile[data-slug="agapitus-the-deacon"] [data-hymn="troparion"] .row-none')).toHaveText(
    'Русский текст не записан',
  );

  /*
   * The second reader is written into the store rather than stamped by
   * `ready`, which only seeds a key nobody has set: this page has already
   * answered for a Russian reader, so a second `ready` would be a no-op and
   * the Greek half would quietly run in Russian.
   */
  await page.evaluate(() => {
    const key = 'gos-settings';
    localStorage.setItem(
      key,
      JSON.stringify({ ...JSON.parse(localStorage.getItem(key)), church: 'greek', language: 'el' }),
    );
  });
  await page.goto('/calendar/2026-08-24', { waitUntil: 'networkidle' });
  const greek = page.locator('.day-tile[data-slug="kosmas-of-aetolia"]');
  await expect.poll(() => greek.locator('.hymn-text').count()).toBeGreaterThan(0);
  const apolytikion = await greek.locator('.hymn-text').first().evaluate((el) => ({
    lang: el.getAttribute('lang'),
    text: el.textContent.trim(),
  }));
  expect(apolytikion.lang).toBe('el');
  expect(apolytikion.text).toMatch(/[Ͱ-Ͽἀ-῿]/);
  await expect(
    page.locator('.day-tile[data-slug="aristokles-the-athonite"] [data-hymn="troparion"] .row-none'),
  ).toHaveText('Δεν έχει καταγραφεί ελληνικό κείμενο');

  /*
   * **The hymn the English reader is not shown, shown.** Alexander Nevsky's
   * Serbian troparion has no English rendering behind it, and it is the one
   * hymn in the corpus that does not — so it is the only place the conditional
   * can be seen doing two different things with the same data, which is what
   * makes it the pair's own test rather than two tests about two saints.
   */
  await page.evaluate(() => {
    const key = 'gos-settings';
    localStorage.setItem(
      key,
      JSON.stringify({ ...JSON.parse(localStorage.getItem(key)), church: 'serbian', language: 'sr' }),
    );
  });
  await page.goto('/calendar/2026-09-12', { waitUntil: 'networkidle' });
  const nevsky = page.locator('.day-tile[data-slug="alexander-nevsky"]');
  await expect.poll(() => nevsky.locator('.hymn-text').count()).toBe(1);
  const tropar = await nevsky.locator('.hymn-text').first().evaluate((el) => ({
    lang: el.getAttribute('lang'),
    text: el.textContent.trim(),
  }));
  expect(tropar.lang).toBe('sr');
  expect(tropar.text).toMatch(/[Ѐ-ӿ]/);
  // And the kontakion nobody has recorded says so in Serbian, naming Serbian.
  await expect(nevsky.locator('[data-hymn="kontakion"] .row-none')).toHaveText('Српски текст није записан');
});

test('a returning Daily page lands where it was left, though it grows after it renders', async ({ page }) => {
  /*
   * Author, 2026-08-27, after the first fix shipped: "switching from All
   * Saints to the Daily page still transitions at the top and jumps to the
   * bottom."
   *
   * The Index's version of this claim *passed the whole time this was broken*,
   * which is why this one exists. The Index is its final height the moment it
   * renders; the Daily page is not. It renders its tiles and then grows as
   * `views/daily/lives.js` fills each one — the two-line preview, the life and
   * the two hymn columns all arrive per saint, after paint — so a scroll
   * applied at the moment the markup lands clamps against a page shorter than
   * the one the reader is about to see, and the correction arrives after the
   * fade has finished. That is the jump.
   *
   * So the assertion is the position *at the transition's own `ready`* — the
   * moment the new-state snapshot has been taken and before the animation
   * runs, which is exactly what the reader's fade will show — and it is taken
   * on the page that grows.
   *
   * **At a phone's width.** Past 1024 px the Daily page gives up the window's
   * scroll altogether: `.td-scroll` carries its own and the column beside it
   * does not move, so there is no page scroll to remember there and
   * `sectionScroll` in main.js remembers the window's. The strip's own
   * `scrollTop` is a real gap rather than a thing this test stopped caring
   * about — restoring it would mean main.js knowing which element a view
   * scrolls, which is a bigger idea than this change and is not in it.
   */
  const press = (sel) => page.evaluate((q) => document.querySelector(q).click(), sel);

  await ready(page);
  /*
   * **A short window, because the page is today's and today may be empty**
   * (2026-08-28). The Daily nav goes to `/`, which is today by definition, so
   * this test cannot pick a day with plenty in it — and the corpus's saints
   * run out before its liturgical records do. A 400 px window leaves enough of
   * whatever the day holds below the fold to scroll deep into.
   */
  await page.setViewportSize({ width: 360, height: 400 });
  await page.goto('/', { waitUntil: 'networkidle' });
  /*
   * Deep enough that a clamp against the pre-lives height cannot reach it —
   * and **taken from the page rather than written down** (2026-08-27). A
   * literal 1500 is a measurement of one machine's text: this page's height is
   * its lives and its hymns wrapping in whatever face the machine resolved,
   * and CI's is not Literata, because a cold runner misses `font-display:
   * optional`'s window and keeps the fallback serif for the life of the page.
   * Scroll as deep as asked, keep what the page gave, and require only that it
   * is deep enough for the claim to mean something.
   */
  const deep = await page.evaluate(() => {
    window.scrollTo(0, 1500);
    return Math.round(window.scrollY);
  });
  expect(deep, 'the Daily page is too short for a deep return to be a claim').toBeGreaterThan(300);
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(deep);

  await press('nav.site-nav a[href$="/saints"]');
  await expect(page.locator('.index-controls')).toBeVisible();

  await page.evaluate(() => {
    const orig = document.startViewTransition.bind(document);
    window.__readyScrollY = undefined;
    document.startViewTransition = (cb) => {
      const t = orig(cb);
      t.ready.then(() => {
        window.__readyScrollY = window.scrollY;
      });
      return t;
    };
  });
  /*
   * **The masthead, not the strip's own Daily button** (2026-09-08). The two
   * go to the same place and only one of them still cross-fades: a press on the
   * phone's nav strip skips the transition on purpose since, so
   * that the strip's own glide is visible instead of frozen under a snapshot of
   * the page. This test's instrument *is* the transition — it reads `scrollY`
   * at `ready`, which is the moment the fade is composed — so it has to press
   * something that still runs one. The promise being measured is unchanged and
   * belongs to the section restore, not to either button; the strip's own path
   * is checked below, by where it lands.
   */
  await press('[data-site-home]');

  /*
   * What the fade shows, not what the page settles to - **up to scroll
   * anchoring's own correction** (2026-08-30). This asserted `toBe(deep)` and
   * went red the day the calendar rolled to 30 August: on that day's page a
   * late arrival lands *above* the reader's position, the browser's scroll
   * anchoring adds the growth to `scrollY` to hold their reading line still,
   * and the fade honestly showed 1520 for a reader who left at 1500 - the
   * same line of text, twenty pixels of new content above it. That is the
   * promise kept, not broken.
   *
   * The band is one card's worth. The defect this test exists for was a fade
   * at the top and a 1300 px jump after it; anchoring drift is two orders
   * smaller, and a clamp to a not-yet-grown page would land *short* of deep,
   * which the lower bound still catches.
   */
  await expect
    .poll(() => page.evaluate(() => Math.round(window.__readyScrollY)))
    .toBeGreaterThanOrEqual(deep - 4);
  const shownAt = await page.evaluate(() => Math.round(window.__readyScrollY));
  expect(shownAt - deep, 'the fade landed far from where the reader left').toBeLessThanOrEqual(120);
  /*
   * And it stays where the fade showed it once the day's own payloads have
   * landed. **A life line filling is the signal** (2026-09-12): `lives.js`
   * fetches the open card's payload first and the rest on an idle callback,
   * and each arrival writes the two-line preview, the life column and the two
   * hymn columns. The hymns alone would be trap 4 in one more coat — every
   * saint has a life where only some sing a hymn in a given calendar, so a day
   * whose saints have none would wait forever for a box that is honestly
   * empty.
   */
  await expect
    .poll(() =>
      page.evaluate(() => [...document.querySelectorAll('.day-tile [data-line]')].filter((p) => p.textContent.trim()).length),
    )
    .toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(shownAt);
  // The floor is a prop for the arrival, not a permanent change to the page.
  await expect.poll(() => page.evaluate(() => document.getElementById('view').style.minHeight)).toBe('');

  /*
   * **And the strip's own Daily button keeps the same promise on the path that
   * no longer fades** (2026-09-08). There is no transition to read `ready`
   * from there, so this measures the thing the reader actually cares about —
   * where the page ends up — rather than the frame the fade was composed at.
   * Without it the section restore would be unwatched on the one route a phone
   * reader takes most.
   */
  await press('nav.site-nav a[href$="/saints"]');
  await expect(page.locator('.index-controls')).toBeVisible();
  await press('nav.site-nav a[data-nav-daily]');
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeGreaterThanOrEqual(deep - 4);
});
