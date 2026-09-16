import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';
import { CHURCHES_BY_ID } from '../src/data/churches.js';
import { feastIndexFor } from '../src/lib/feasts.js';
import { SAME_DAY_MAX } from '../src/lib/prayer-order.js';
import { STRINGS, fill } from '../src/ui/strings.js';
import { desk, dragGrain, phone, ready } from './helpers.js';

/**
 * Prayer: the hymns the corpus holds, one saint at a time, with the two ways
 * out of that saint down either side.
 *
 * **Every premise is read off the build, never typed.** The page's corpus is
 * the saints the manifest says have a hymn, which is a number that moves the
 * day someone adds a folder — so a test that names it is a test that goes red
 * without having found anything.
 */

const MANIFEST = JSON.parse(readFileSync(new URL('../data/manifest.json', import.meta.url), 'utf8'));
const CARDS = Array.isArray(MANIFEST.saints) ? MANIFEST.saints : Object.values(MANIFEST.saints ?? MANIFEST);

/**
 * The page's own order, derived the same way `lib/prayer-order.js` derives it
 * — `hymnedSaints` then name order — so the two ends below are the corpus's
 * ends and not a guess about them.
 */
const HYMNED = CARDS.filter((c) => c.hymned?.length).sort((a, b) =>
  a.display_name.localeCompare(b.display_name),
);

const PRAYER = '/prayer';

/** The church every test here reads in, and the one `ready()` seeds. */
const CHURCH = 'russian';

/**
 * Steps to a named saint without a search field, which this page does not have
 * yet: the presses are dispatched rather than clicked (trap 3) and `stepBy`
 * refuses to run past either end, so a loop is safe to overshoot.
 */
async function stepTo(page, index) {
  if (index === 0) return;
  await page.evaluate((n) => {
    const next = document.querySelector('#hy-next');
    for (let i = 0; i < n; i += 1) next.click();
  }, index);
}

test.beforeEach(async ({ page }) => {
  await ready(page, { church: CHURCH });
  await desk(page);
});

test('the three columns stand side by side, and the saint is in the middle', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();

  /*
   * By geometry, never by document order (trap 1): the markup is written in the
   * phone's reading order — the saint first, then the two lists that hang off
   * them — and the desk moves the first aside back to the left with
   * `grid-column`. A `.first()` here would assert the source order and pass
   * whichever way the columns were drawn.
   */
  const box = (sel) =>
    page.evaluate((s) => {
      const el = document.querySelector(s);
      const r = el.getBoundingClientRect();
      // A hidden element reports 0 and would satisfy an ordering by accident
      // (trap 7), so the reading says whether it is drawn at all.
      return { x: r.x, y: r.y, w: r.width, h: r.height, drawn: el.clientWidth > 0 };
    }, sel);

  const [related, view, sameday] = await Promise.all([
    box('#hy-related'),
    box('#hy-view'),
    box('#hy-sameday'),
  ]);
  for (const [name, b] of [['related', related], ['view', view], ['sameday', sameday]]) {
    expect(b.drawn, `${name} is drawn`).toBe(true);
  }
  expect(related.x, 'recorded-with is left of the saint').toBeLessThan(view.x);
  expect(view.x, 'the saint is left of the same day').toBeLessThan(sameday.x);
  /*
   * **One row, and the saint's own top is what says so.** The three x
   * assertions above and a shared top between the two asides are all still true
   * of a grid that has put the saint in row 1 and both asides in row 2 — which
   * is what auto-placement does when only a column is named, and what this page
   * did until 2026-09-16. The reading that catches it is the middle column's
   * top against an aside's.
   */
  expect(Math.abs(related.y - sameday.y), 'the two asides are not on one row').toBeLessThan(2);
  expect(Math.abs(view.y - related.y), 'the saint is not on the asides’ row').toBeLessThan(2);
  expect(Math.abs(view.h - related.h), 'the saint’s column is not the asides’ height').toBeLessThan(2);
  // And the saint takes the room: the asides are the narrow pair.
  expect(view.w).toBeGreaterThan(related.w + sameday.w);
});

test('the page opens on the first saint the hymnal holds', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  const article = page.locator('.hy-saint');
  await expect(article).toBeVisible();
  // The pin's premise: the corpus's own first hymned saint by name.
  await expect(article).toHaveAttribute('data-slug', HYMNED[0].slug);
  await expect(page.locator('#hy-prev')).toBeDisabled();
  await expect(page.locator('#hy-next')).toBeEnabled();
});

test('stepping on changes the saint, and the drawn heading says so too', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  const article = page.locator('.hy-saint');
  await expect(article).toBeVisible();
  const before = {
    slug: await article.getAttribute('data-slug'),
    name: (await page.locator('.hy-name').textContent())?.trim(),
  };

  /*
   * **What the opacity was at the moment the card was replaced.** A poll taken
   * afterwards can only ever find the fade finished, so it would pass against
   * the mockup's own bug — a redraw on a timer aimed at a transition it does
   * not match, which paints the new saint at two thirds opacity. The observer
   * is the instrument that can see it; with nothing wrong it records 0.
   */
  await page.evaluate(() => {
    const hold = document.querySelector('#hy-hold');
    window.__swapOpacity = [];
    new MutationObserver(() => {
      window.__swapOpacity.push(Number(getComputedStyle(hold).opacity));
    }).observe(hold, { childList: true });
  });

  /*
   * **Dispatched, not clicked** (trap 3): `#hy-next` sits over a body that
   * carries its own scroll, and `locator.click()` scrolls its target into view
   * before pressing it.
   */
  await page.evaluate(() => document.querySelector('#hy-next').click());

  /*
   * **Two independent things** (trap 14): the article's `data-slug` is what the
   * page publishes about itself, and the heading is a glyph a reader could
   * have seen. The fade swaps on `transitionend`, so the third assertion is
   * that the new saint is drawn at full opacity rather than at two thirds of
   * it, which is the mockup's own bug and the one a class-watching test misses.
   */
  await expect(article).not.toHaveAttribute('data-slug', before.slug);
  await expect(page.locator('.hy-name')).not.toHaveText(before.name);
  // The heading is `saintName`, which puts the rank in front of the recorded
  // name — so the name is contained in it rather than equal to it.
  await expect(page.locator('.hy-name')).toContainText(HYMNED[1].display_name);
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector('#hy-hold')).opacity)).toBe('1');
  await expect(page.locator('#hy-prev')).toBeEnabled();

  // The card was written while the old one was gone, not while it was halfway
  // out. Anything above a hairline is the reader watching a cross-dissolve
  // nobody designed.
  const atSwap = await page.evaluate(() => window.__swapOpacity);
  expect(atSwap.length, 'the card was replaced').toBeGreaterThan(0);
  expect(Math.max(...atSwap), 'the swap happened behind a finished fade').toBeLessThan(0.05);
});

test('the hymnal is a book: neither end wraps', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();

  /*
   * Saturated rather than stepped 141 times at a fade each: `stepBy` refuses to
   * go past the last saint, and a disabled button fires no click at all, so
   * pressing more times than the corpus is long lands on the end and stays
   * there. The count comes off the manifest so it cannot fall short.
   */
  await page.evaluate((n) => {
    const next = document.querySelector('#hy-next');
    for (let i = 0; i < n; i += 1) next.click();
  }, HYMNED.length + 5);

  await expect(page.locator('#hy-next')).toBeDisabled();
  await expect(page.locator('#hy-prev')).toBeEnabled();
  await expect(page.locator('.hy-saint')).toHaveAttribute('data-slug', HYMNED[HYMNED.length - 1].slug);
});

test('the hymn column keeps the wheel: it scrolls and the page does not', async ({ page }) => {
  /*
   * **A short desk rather than a chosen saint.** Whether the opening saint's
   * troparion overflows is a fact about the corpus and moves with it, so the
   * premise is made by the window instead: past 1024 px wide the page gives up
   * its own scroll whatever its height, and at this height any hymn at all
   * overruns the column. The premise is then asserted rather than assumed.
   */
  await page.setViewportSize({ width: 1280, height: 420 });
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-hymns')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.querySelector('.hy-hymns')?.children.length ?? 0))
    .toBeGreaterThan(0);
  // A box mid-layout reports 0 and would satisfy this by accident (trap 7), so
  // the poll waits for a settled reading rather than taking the first.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const el = document.querySelector('.hy-hymns');
        return el.clientHeight > 0 ? el.scrollHeight - el.clientHeight : -1;
      }),
    )
    .toBeGreaterThan(0);

  await page.evaluate(() => {
    const el = document.querySelector('.hy-hymns');
    el.scrollTop = el.scrollHeight;
  });
  expect(await page.evaluate(() => document.querySelector('.hy-hymns').scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY), 'the page itself stayed put').toBe(0);
});

test('the page fetches the saint it is showing and its neighbours, not the corpus', async ({ page }) => {
  /*
   * Observed rather than intercepted: the suite runs with the service worker
   * registered, and a `page.route` pattern it never sees fails open (trap 13).
   * A cached answer can only *lower* this count, so the ceiling below holds
   * either way — and the floor is the answer to "what would this look like if
   * it were doing nothing", which is zero.
   */
  const payloads = [];
  page.on('request', (r) => {
    if (/\/saints\/[^/]+\/saint\.json(\?|$)/.test(r.url())) payloads.push(r.url());
  });

  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  await page.waitForTimeout(600);

  /*
   * Two: the saint in hand and the one after them, because a step should be a
   * cache hit rather than a fetch the reader waits through. There is nobody
   * before the first saint, so two is both the floor and — with one of slack
   * for a retry — most of the ceiling. The number this test exists to refuse is
   * the length of the hymnal.
   */
  expect(payloads.length, 'the shown saint and its neighbour').toBeGreaterThanOrEqual(2);
  expect(payloads.length, 'and not the whole hymnal').toBeLessThanOrEqual(3);
  expect(payloads.length).toBeLessThan(HYMNED.length);
});

/* ---- the two asides ------------------------------------------------------ */

/**
 * The saint this page can prove something about: one the hymnal holds *and*
 * whose `mentionedIn` names somebody, so the aside has a premise. Read off the
 * manifest rather than named, because the corpus's cross-references move.
 */
const WITH_MENTIONS = HYMNED.findIndex((c) => (c.mentionedIn ?? []).length > 0);

/**
 * The feast index this year, built the same way the page builds it — one walk
 * over the corpus, every church in it at once, keyed by civil day.
 */
const INDEX = feastIndexFor(CARDS, new Date().getFullYear(), CHURCHES_BY_ID);

/** Which civil day one church keeps one saint on, or null. */
const dayOf = (slug, church) => {
  for (const [iso, entries] of INDEX) {
    if (entries.some((e) => e.slug === slug && e.church === church)) return iso;
  }
  return null;
};

/**
 * A hymned saint the Russian and Greek calendars put on different civil days —
 * an Old Calendar feast, which is what makes "the same day" a question the page
 * has to answer rather than a date it can read off.
 */
const SPLIT_DAY = HYMNED.findIndex((c) => {
  const ru = dayOf(c.slug, CHURCH);
  const el = dayOf(c.slug, 'greek');
  return ru && el && ru !== el;
});

test('recorded-with names the saints the corpus records this one with', async ({ page }) => {
  expect(WITH_MENTIONS, 'the corpus holds a hymned saint with a back-reference').toBeGreaterThanOrEqual(0);
  const subject = HYMNED[WITH_MENTIONS];

  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  await stepTo(page, WITH_MENTIONS);
  await expect(page.locator('.hy-saint')).toHaveAttribute('data-slug', subject.slug);

  const aside = page.locator('#hy-related');
  await expect(aside.locator('h2')).toBeVisible();
  // Drawn, not merely present: a list the sheet has hidden reads the same to
  // `querySelectorAll` and to nobody else.
  await expect(aside.locator('.hy-link').first()).toBeVisible();
  /*
   * **A relationship, not a number.** The aside merges `mentionedIn` with the
   * `related` the folder carries, and the second half is a fetch away — so what
   * is asserted is that every saint the manifest says names this one is drawn,
   * that the drawn set is no wider than the corpus allows, and that the saint
   * themself is not in their own margin.
   */
  await expect
    .poll(() => aside.locator('.hy-link').count())
    .toBeGreaterThanOrEqual((subject.mentionedIn ?? []).length);

  const drawn = await aside.evaluate((el) =>
    [...el.querySelectorAll('.hy-link')].map((b) => ({
      slug: b.dataset.slug,
      reachable: !b.disabled,
      text: b.textContent.trim(),
    })),
  );
  expect(drawn.every((r) => r.text.length > 0), 'every row is named').toBe(true);
  expect(drawn.some((r) => r.slug === subject.slug), 'a saint is not in their own margin').toBe(false);
  // Every reachable row is one this page can actually go to.
  const hymned = new Set(HYMNED.map((c) => c.slug));
  for (const row of drawn.filter((r) => r.reachable)) {
    expect(hymned.has(row.slug), `${row.slug} is in the hymnal`).toBe(true);
  }
});

test('pressing a reachable name in an aside turns to that saint', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();

  /*
   * The first saint with a reachable row in either aside — found by walking
   * rather than named, since which saints have hymned company is a fact about
   * the corpus. The walk is bounded so a corpus with none fails the premise
   * rather than hanging.
   */
  let target = null;
  for (let i = 0; i < Math.min(HYMNED.length, 40) && !target; i += 1) {
    if (i > 0) await stepTo(page, 1);
    await expect(page.locator('.hy-saint')).toHaveAttribute('data-slug', HYMNED[i].slug);
    await expect.poll(() => page.locator('.hy-body .hy-link').count()).toBeGreaterThanOrEqual(0);
    target = await page.evaluate(() => document.querySelector('.hy-link[data-go]')?.dataset.go ?? null);
  }
  expect(target, 'some saint in the first forty has reachable company').not.toBeNull();

  const before = await page.locator('.hy-saint').getAttribute('data-slug');
  await page.evaluate((slug) => document.querySelector(`.hy-link[data-go="${slug}"]`).click(), target);
  // Two independent things (trap 14): the published slug and a drawn glyph.
  await expect(page.locator('.hy-saint')).toHaveAttribute('data-slug', target);
  expect(target).not.toBe(before);
  await expect(page.locator('.hy-name')).not.toHaveText('');
});

test('the same day holds only the saints this reader’s church keeps that day', async ({ page }) => {
  /*
   * **The subject is a saint whose two churches disagree about the day.** Most
   * do not: a feast recorded against the Revised Julian calendar falls on the
   * same civil date for everybody, and a page that had dropped the church
   * filter entirely would still be right about such a saint. So the premise is
   * the disagreement itself, found by walking the corpus rather than named —
   * and the test fails on the premise, not on the claim, if the corpus ever
   * stops holding one.
   */
  expect(SPLIT_DAY, 'the corpus holds a hymned saint whose churches keep different days').toBeGreaterThanOrEqual(0);
  const subject = HYMNED[SPLIT_DAY].slug;

  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  await stepTo(page, SPLIT_DAY);
  await expect(page.locator('.hy-saint')).toHaveAttribute('data-slug', subject);

  const aside = page.locator('#hy-sameday');
  await expect(aside.locator('h2')).toBeVisible();

  /*
   * The aside publishes the day it resolved, so this reads that rather than
   * doing the same arithmetic twice and calling the agreement a check. It can
   * never be a literal date — that would be wrong the next time the reckoning
   * leaps, and on one day a year besides (trap 4).
   */
  await expect.poll(() => aside.getAttribute('data-iso')).toBe(dayOf(subject, CHURCH));
  const iso = await aside.getAttribute('data-iso');
  expect(iso, 'and not the day another church keeps').not.toBe(dayOf(subject, 'greek'));

  const expected = INDEX.get(iso)
    .filter((e) => e.church === CHURCH)
    .map((e) => e.slug);
  expect(expected, 'the saint stands on the day the aside published').toContain(subject);

  // Every row says who it names, whether or not this page can go there.
  const drawn = await aside.evaluate((el) =>
    [...el.querySelectorAll('.hy-link')].map((b) => b.dataset.slug),
  );
  const shouldBe = new Set(expected.filter((s) => s !== subject));
  expect(drawn.length, 'no more rows than the day holds').toBeLessThanOrEqual(shouldBe.size);
  /*
   * Under the cap the two sets are the same set, which is what makes this a
   * test of the church filter and not only of its direction: a day resolved in
   * somebody else's calendar is a different list, and a subset check would pass
   * on any saint whose two calendars happen to agree.
   */
  if (shouldBe.size <= SAME_DAY_MAX) {
    expect([...drawn].sort(), `exactly the ${CHURCH} church’s ${iso}`).toEqual([...shouldBe].sort());
  } else {
    for (const slug of drawn) expect(shouldBe.has(slug), `${slug} is kept on ${iso}`).toBe(true);
  }

  /*
   * And the overflow line appears exactly when the cap has hidden somebody —
   * read by its own hook and not by `.hy-line`, which is also what "None
   * recorded." is drawn as, so counting the class would call an empty day an
   * overflowing one.
   */
  const over = await aside.locator('[data-hy-more]').count();
  expect(over > 0, 'the “and N more” line matches the cap').toBe(shouldBe.size > drawn.length);
});

/* ---- the field, the count and the two faces -------------------------------
   `ready()` seeds English, so `STRINGS` read here is the pack the page is
   drawn in — the count line is compared against the site's own words rather
   than against a copy of them typed into this file. */

/** What is in the field, set and announced the way a keystroke would. */
async function type(page, query) {
  await page.evaluate((q) => {
    const field = document.querySelector('#hy-q');
    field.value = q;
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }, query);
}

/**
 * Every saint the book holds right now, walked with the arrow rather than read
 * off anything the page publishes about itself. The walk steps back to the
 * first saint before it starts, so it is the whole book and not the tail of it;
 * it is bounded, so a stepper that stopped disabling itself fails the premise
 * instead of hanging.
 */
async function walkBook(page, cap = 60) {
  return page.evaluate(async (limit) => {
    const press = (id) => document.querySelector(id).click();
    const settle = () => new Promise((r) => setTimeout(r, 80));
    for (let i = 0; i < limit && !document.querySelector('#hy-prev').disabled; i += 1) {
      press('#hy-prev');
      await settle();
    }
    const slugs = [];
    for (let i = 0; i < limit; i += 1) {
      const at = document.querySelector('.hy-saint')?.dataset.slug;
      if (!at) break;
      slugs.push(at);
      if (document.querySelector('#hy-next').disabled) break;
      press('#hy-next');
      await settle();
    }
    return slugs;
  }, cap);
}

test('the count line says how many saints the book holds, and it is the corpus own number', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  /*
   * Read off the manifest, never typed: 142 is a number that moves the day
   * somebody adds a folder with a hymn in it, and a test naming it goes red
   * without having found anything.
   */
  await expect(page.locator('#hy-count')).toHaveText(fill(STRINGS.prayer.count, { n: HYMNED.length }));
});

test('the field narrows the book itself, and the count is the book own length', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();

  /*
   * The pin and its premise (trap 5): a saint the hymnal holds, searched for by
   * the whole of the name the page prints for them, so the query cannot fail to
   * reach them for a reason this test cannot see.
   */
  const subject = HYMNED[Math.floor(HYMNED.length / 2)];
  await type(page, subject.display_name);

  /*
   * The index arrives after the paint (`views/prayer/find.js` imports MiniSearch
   * on demand), so the narrowing is polled for rather than assumed — and what is
   * asserted is a relationship: fewer than the whole hymnal, and not none.
   */
  await expect
    .poll(() => page.locator('#hy-count').textContent())
    .not.toBe(fill(STRINGS.prayer.count, { n: HYMNED.length }));

  /*
   * **The count line is the book's own length**, walked with the arrow. Two
   * independent readings of one fact (trap 14): the line the page prints, and
   * the saints a reader can actually reach by stepping. A count that came from
   * somewhere other than the shown list would pass the first and fail this.
   */
  const slugs = await walkBook(page);
  expect(slugs.length, 'the query found somebody').toBeGreaterThanOrEqual(1);
  expect(slugs.length, 'and not the whole hymnal').toBeLessThan(HYMNED.length);
  expect(slugs, 'the saint searched for is in the book the query left').toContain(subject.slug);
  const line = await page.locator('#hy-count').textContent();
  const said = slugs.length === 1 ? STRINGS.prayer.countOne : fill(STRINGS.prayer.count, { n: slugs.length });
  expect(line.trim()).toBe(said);
});

test('a query that matches nobody says so, and the page holds no saint', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();

  await type(page, 'qzxwvj');
  await expect(page.locator('#hy-count')).toHaveText(STRINGS.prayer.countNone);
  // The three regions agree with the line: no saint, and no margins around one.
  await expect(page.locator('.hy-saint')).toHaveCount(0);
  await expect(page.locator('#hy-related .hy-link')).toHaveCount(0);
  await expect(page.locator('#hy-sameday .hy-link')).toHaveCount(0);
  await expect(page.locator('#hy-prev')).toBeDisabled();
  await expect(page.locator('#hy-next')).toBeDisabled();
});

test('a name pressed in an aside is reached even when the query is hiding it', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  await stepTo(page, WITH_MENTIONS);
  await expect(page.locator('.hy-saint')).toHaveAttribute('data-slug', HYMNED[WITH_MENTIONS].slug);

  const target = await page.evaluate(() => document.querySelector('.hy-link[data-go]')?.dataset.go ?? null);
  expect(target, 'this saint has reachable company to press').not.toBeNull();

  /* A query that narrows to the saint in hand and therefore excludes whoever
     their margin names. The relation is a fact about the saint and not about
     the search, so the press has to widen the book rather than refuse. */
  await type(page, HYMNED[WITH_MENTIONS].display_name);
  await expect
    .poll(() => page.locator('#hy-count').textContent())
    .not.toBe(fill(STRINGS.prayer.count, { n: HYMNED.length }));
  await page.evaluate((slug) => document.querySelector(`.hy-link[data-go="${slug}"]`)?.click(), target);

  await expect(page.locator('.hy-saint')).toHaveAttribute('data-slug', target);
  // And the field says what it is doing: nothing, now.
  await expect(page.locator('#hy-q')).toHaveValue('');
  await expect(page.locator('#hy-count')).toHaveText(fill(STRINGS.prayer.count, { n: HYMNED.length }));
});

test('the two faces are two drawings, not two class names', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  await stepTo(page, WITH_MENTIONS);
  await expect(page.locator('#hy-related .hy-link').first()).toBeVisible();

  const plate = page.locator('#hy-views [data-hy-view="plate"]');
  const rows = page.locator('#hy-views [data-hy-view="rows"]');
  /* The page opens on the names, because most of the corpus has no icon and a
     Pictures face of empty mats reads as a page that failed to load. */
  await expect(rows).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#hy-related .hy-plate')).toHaveCount(0);

  /*
   * **Geometry, not the class** (the whole point of this test): a row in the
   * picture face carries a plate above the name and is therefore taller than
   * the same row without one. Measured on the row the page happens to draw
   * first in that column — its identity does not matter, only that it is the
   * same element before and after.
   */
  const rowHeight = () =>
    page.evaluate(() => {
      const el = document.querySelector('#hy-related .hy-link');
      // A hidden element reports 0 and would satisfy "shorter" by accident.
      return el && el.clientWidth > 0 ? el.getBoundingClientRect().height : 0;
    });

  const asRows = await rowHeight();
  expect(asRows, 'the names face is drawn').toBeGreaterThan(0);

  await page.evaluate(() => document.querySelector('[data-hy-view="plate"]').click());
  await expect(plate).toHaveAttribute('aria-pressed', 'true');
  await expect(rows).toHaveAttribute('aria-pressed', 'false');
  // Every row gains a plate, the ones with no icon included: a face with holes
  // in it would have the reader reading the holes as something meant.
  await expect
    .poll(() => page.locator('#hy-related .hy-plate').count())
    .toBe(await page.locator('#hy-related .hy-link').count());

  const asPlate = await rowHeight();
  expect(asPlate, 'the picture face is drawn').toBeGreaterThan(0);
  expect(asPlate, 'and is taller by a picture').toBeGreaterThan(asRows);
});

/* ---- the phone ------------------------------------------------------------
   One column, in the document's own order, and no arrows: the page turns by
   being swiped. The nested `beforeEach` runs after the file's, so it takes the
   viewport back off the desk for these five and leaves the rest alone. */

test.describe('at 360 px', () => {
  test.beforeEach(async ({ page }) => {
    await phone(page);
  });

  test('the three regions are one column, in the order they are written', async ({ page }) => {
    await page.goto(PRAYER, { waitUntil: 'networkidle' });
    await expect(page.locator('.hy-saint')).toBeVisible();
    await stepTo(page, WITH_MENTIONS);
    await expect(page.locator('#hy-related .hy-link').first()).toBeVisible();

    const boxes = await page.evaluate(() =>
      ['.hy-find', '.hy-saint', '#hy-related', '#hy-sameday'].map((sel) => {
        const el = document.querySelector(sel);
        const r = el.getBoundingClientRect();
        // A hidden element reports 0 and would satisfy an ordering by accident
        // (trap 7), so the reading says whether it is drawn at all.
        return { sel, x: r.x, y: r.y, w: r.width, drawn: el.clientWidth > 0 };
      }),
    );
    for (const b of boxes) expect(b.drawn, `${b.sel} is drawn`).toBe(true);

    /*
     * **Down the page, not across it** (trap 1: geometry, never document
     * order). The four tops ascend in the order the markup writes them, and
     * each region is the page's own width rather than a column of it — which is
     * the difference between one column and three narrow ones.
     */
    for (let i = 1; i < boxes.length; i += 1) {
      expect(boxes[i].y, `${boxes[i].sel} is below ${boxes[i - 1].sel}`).toBeGreaterThan(boxes[i - 1].y);
    }
    const width = await page.evaluate(() => window.innerWidth);
    for (const b of boxes) {
      expect(b.w, `${b.sel} has the page's width`).toBeGreaterThan(width * 0.8);
    }
  });

  test('the two arrows are not drawn', async ({ page }) => {
    await page.goto(PRAYER, { waitUntil: 'networkidle' });
    await expect(page.locator('.hy-saint')).toBeVisible();
    // Present in the document and drawn nowhere: the phone's way to turn the
    // page is the swipe below, and an absolutely placed arrow has no column to
    // be absolute inside at this width.
    await expect(page.locator('#hy-prev')).toHaveCount(1);
    await expect(page.locator('#hy-prev')).toBeHidden();
    await expect(page.locator('#hy-next')).toBeHidden();
  });

  test('a swipe turns the page, and back', async ({ page }) => {
    await page.goto(PRAYER, { waitUntil: 'networkidle' });
    const article = page.locator('.hy-saint');
    await expect(article).toBeVisible();
    await expect(article).toHaveAttribute('data-slug', HYMNED[0].slug);
    const first = (await page.locator('.hy-name').textContent())?.trim();

    // Leftward is onward, which is the direction the Daily page turns a day.
    await dragGrain(page, '.hymnal', -80);
    // Two independent things (trap 14): the published slug and a drawn glyph.
    await expect(article).toHaveAttribute('data-slug', HYMNED[1].slug);
    await expect
      .poll(async () => (await page.locator('.hy-name').textContent())?.trim())
      .not.toBe(first);

    await dragGrain(page, '.hymnal', 80);
    await expect(article).toHaveAttribute('data-slug', HYMNED[0].slug);
  });

  test('a swipe inside the field is not a page turn', async ({ page }) => {
    await page.goto(PRAYER, { waitUntil: 'networkidle' });
    await expect(page.locator('.hy-saint')).toHaveAttribute('data-slug', HYMNED[0].slug);
    /* A finger dragging through the field is selecting text in it. The gesture
       is refused there by name (`ignore`), and this is the reading that says so
       rather than the absence of a complaint. */
    await dragGrain(page, '#hy-q', -80);
    await page.waitForTimeout(150);
    await expect(page.locator('.hy-saint')).toHaveAttribute('data-slug', HYMNED[0].slug);
  });

  test('nothing in the page reaches past its own width', async ({ page }) => {
    await page.goto(PRAYER, { waitUntil: 'networkidle' });
    await expect(page.locator('.hy-saint')).toBeVisible();
    await stepTo(page, WITH_MENTIONS);
    /* The floor `quality-floor.spec.js` walks every route with, asserted here
       too because `/prayer` is the route whose three columns become one and the
       one width at which a column that failed to dissolve would show. */
    const overflow = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      win: window.innerWidth,
    }));
    expect(overflow.doc).toBeLessThanOrEqual(overflow.win + 1);
  });
});
