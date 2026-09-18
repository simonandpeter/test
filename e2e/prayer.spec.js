import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';
import { CHURCHES_BY_ID } from '../src/data/churches.js';
import { feastIndexFor } from '../src/lib/feasts.js';
import { SAME_DAY_MAX } from '../src/lib/prayer-order.js';
import { STRINGS, fill } from '../src/ui/strings.js';
import { INDEX as SAINTS_ROUTE, desk, dragGrain, phone, ready } from './helpers.js';

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

/**
 * A row in either aside, in either face. The names face draws `.hy-link` and
 * the picture face past 1024 px draws the Daily shelf's own `.day-tile`
 * (stage I), so a test about what a row *says* names both and a test about
 * what one *is* names the one it means.
 */
const ROW = ':is(.hy-link, .day-tile)';

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

/**
 * Stage J, `../mockup-review/REVIEW.md` finding 15. The page's gutter is
 * charged once, inside the columns, where the mockup charges it — not once
 * outside them by `#view` and again inside them by each aside.
 *
 * **Read as three relations, not as three numbers.** `--page-pad` is a token
 * and a token does not compute (trap 9), so the gutter under test is `#view`'s
 * own computed `padding-left` in pixels, and every assertion is a distance
 * measured against it. That also keeps the test true at both widths without
 * two tables of constants: the asides' own width is `16vw` clamped, so only
 * the middle column changes between 1280 and 1440.
 */
for (const width of [1440, 1280]) {
  test(`at ${width} px the page gutter is charged once, inside the columns`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(PRAYER, { waitUntil: 'networkidle' });
    await expect(page.locator('.hy-saint')).toBeVisible();

    const m = await page.evaluate(() => {
      const view = document.getElementById('view');
      const body = document.querySelector('.hy-body');
      const asides = [...document.querySelectorAll('.hy-side')];
      const rect = (el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, right: r.right, w: r.width, drawn: el.clientWidth > 0 };
      };
      /* The heading is the column's first drawn line, so its left edge is where
         the aside's own padding has put the content. */
      const head = (aside) => rect(aside.querySelector('h2'));
      return {
        pad: parseFloat(getComputedStyle(view).paddingLeft),
        viewBox: view.clientWidth,
        body: rect(body),
        left: rect(asides[0]),
        leftHead: head(asides[0]),
        right: rect(asides[asides.length - 1]),
        rightHead: head(asides[asides.length - 1]),
        view: rect(document.getElementById('hy-view')),
        field: rect(document.querySelector('.hy-find .search-field')),
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    });

    expect(m.pad, 'the route still pays a page gutter to measure against').toBeGreaterThan(0);
    for (const [name, b] of [['body', m.body], ['left aside', m.left], ['right aside', m.right]]) {
      expect(b.drawn, `${name} is drawn`).toBe(true);
    }

    // The body spans its parent's whole box, not the box inside its padding.
    expect(Math.abs(m.body.w - m.viewBox), 'the body is not full-bleed').toBeLessThan(1);
    expect(Math.abs(m.body.x - m.left.x), 'the first aside does not stand on the body’s edge').toBeLessThan(1);
    expect(Math.abs(m.body.right - m.right.right), 'the last aside does not reach the body’s edge').toBeLessThan(1);

    // And the gutter is inside the asides, once each, at exactly `--page-pad`.
    expect(Math.abs(m.leftHead.x - m.body.x - m.pad), 'the left column’s content is not one gutter in').toBeLessThan(1);
    expect(Math.abs(m.body.right - m.rightHead.right - m.pad), 'the right column’s content is not one gutter in').toBeLessThan(1);
    // The field above the columns starts on the same line as that content.
    expect(Math.abs(m.field.x - m.leftHead.x), 'the field does not stand on the first column’s content').toBeLessThan(1);

    /* The middle column is what the recovered gutter goes to — the asides are
       measured off the viewport and do not grow — and the negative margin buys
       it without pushing the page sideways. */
    expect(m.view.w, 'the middle column did not take the recovered gutter').toBeGreaterThan(
      m.body.w - m.left.w - m.right.w - 1,
    );
    expect(m.scrollW, 'the page overflows sideways').toBeLessThanOrEqual(m.clientW);
  });
}

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
   * The saint in hand, the one after them — because a step should be a cache
   * hit rather than a fetch the reader waits through — **and the saints the two
   * margins name**, whose tiles carry three lines of their life past 1024 px
   * (stage I). The third group is this width's own cost and the same one
   * Daily's shelf pays for the same drawing: four requests at a time, and none
   * of it below 1024 px, where the margins are names and dates. Lighthouse's
   * run is a 360 px phone, so the gate is untouched.
   *
   * The ceiling is read off the columns rather than typed, with slack for a
   * retry. The number this test exists to refuse is still the length of the
   * hymnal.
   */
  const named = await page.evaluate(
    () => new Set([...document.querySelectorAll('.hy-body [data-slug]')].map((b) => b.dataset.slug)).size,
  );
  expect(payloads.length, 'the shown saint and its neighbour').toBeGreaterThanOrEqual(2);
  expect(payloads.length, 'and nobody the page is not drawing').toBeLessThanOrEqual(named + 3);
  expect(named + 3, 'and not the whole hymnal').toBeLessThan(HYMNED.length);
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
  await expect(aside.locator(ROW).first()).toBeVisible();
  /*
   * **A relationship, not a number.** The aside merges `mentionedIn` with the
   * `related` the folder carries, and the second half is a fetch away — so what
   * is asserted is that every saint the manifest says names this one is drawn,
   * that the drawn set is no wider than the corpus allows, and that the saint
   * themself is not in their own margin.
   */
  await expect
    .poll(() => aside.locator(ROW).count())
    .toBeGreaterThanOrEqual((subject.mentionedIn ?? []).length);

  const drawn = await aside.evaluate((el) =>
    [...el.querySelectorAll(':is(.hy-link, .day-tile)')].map((b) => ({
      slug: b.dataset.slug,
      reachable: !!b.dataset.go,
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
    await expect.poll(() => page.locator(`.hy-body ${ROW}`).count()).toBeGreaterThanOrEqual(0);
    target = await page.evaluate(() => document.querySelector('[data-go]')?.dataset.go ?? null);
  }
  expect(target, 'some saint in the first forty has reachable company').not.toBeNull();

  const before = await page.locator('.hy-saint').getAttribute('data-slug');
  await page.evaluate((slug) => document.querySelector(`[data-go="${slug}"]`).click(), target);
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
    [...el.querySelectorAll(':is(.hy-link, .day-tile)')].map((b) => b.dataset.slug),
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
 *
 * **Each press waits for the saint to change, not for a fixed 80 ms.** The card
 * swaps when its fade's `finished` resolves (`views/prayer/card.js`), which is
 * `DUR.move` later, so a fixed wait read the old saint again and pressed on
 * into a fade the next press cancelled: a book of two walked as four, «John V»
 * three times and then Varlaam. It passed while the pinned subject's book held
 * one saint and failed the day corpus growth moved the pin to one of two. A
 * stepper that does not move still shows, as the same slug read twice.
 */
async function walkBook(page, cap = 60) {
  return page.evaluate(async (limit) => {
    const at = () => document.querySelector('.hy-saint')?.dataset.slug;
    const press = async (id) => {
      const from = at();
      document.querySelector(id).click();
      for (let t = 0; t < 60 && at() === from; t += 1) await new Promise((r) => setTimeout(r, 50));
    };
    for (let i = 0; i < limit && !document.querySelector('#hy-prev').disabled; i += 1) {
      await press('#hy-prev');
    }
    const slugs = [];
    for (let i = 0; i < limit; i += 1) {
      const slug = at();
      if (!slug) break;
      slugs.push(slug);
      if (document.querySelector('#hy-next').disabled) break;
      await press('#hy-next');
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
  await expect(page.locator(`#hy-related ${ROW}`)).toHaveCount(0);
  await expect(page.locator(`#hy-sameday ${ROW}`)).toHaveCount(0);
  await expect(page.locator('#hy-prev')).toBeDisabled();
  await expect(page.locator('#hy-next')).toBeDisabled();
});

test('a name pressed in an aside is reached even when the query is hiding it', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  await stepTo(page, WITH_MENTIONS);
  await expect(page.locator('.hy-saint')).toHaveAttribute('data-slug', HYMNED[WITH_MENTIONS].slug);

  const target = await page.evaluate(() => document.querySelector('[data-go]')?.dataset.go ?? null);
  expect(target, 'this saint has reachable company to press').not.toBeNull();

  /* A query that narrows to the saint in hand and therefore excludes whoever
     their margin names. The relation is a fact about the saint and not about
     the search, so the press has to widen the book rather than refuse. */
  await type(page, HYMNED[WITH_MENTIONS].display_name);
  await expect
    .poll(() => page.locator('#hy-count').textContent())
    .not.toBe(fill(STRINGS.prayer.count, { n: HYMNED.length }));
  await page.evaluate((slug) => document.querySelector(`[data-go="${slug}"]`)?.click(), target);

  await expect(page.locator('.hy-saint')).toHaveAttribute('data-slug', target);
  // And the field says what it is doing: nothing, now.
  await expect(page.locator('#hy-q')).toHaveValue('');
  await expect(page.locator('#hy-count')).toHaveText(fill(STRINGS.prayer.count, { n: HYMNED.length }));
});

test('the two faces are two drawings, not two class names', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  await stepTo(page, WITH_MENTIONS);
  await expect(page.locator(`#hy-related ${ROW}`).first()).toBeVisible();

  const plate = page.locator('#hy-views [data-hy-view="plate"]');
  const rows = page.locator('#hy-views [data-hy-view="rows"]');
  /* **The desk opens on the pictures**, which is the mockup's own default and
     is affordable since stage G: a tile whose saint has no icon has no box at
     all here, so the face no longer opens on empty mats. The phone still opens
     on the names — the 360 px block below asserts that half. */
  await expect(plate).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#hy-related .day-tile').first()).toBeVisible();
  await expect(page.locator(`#hy-related .hy-link`)).toHaveCount(0);

  /*
   * **Geometry, not the class** (the whole point of this test): a row in the
   * picture face is the shelf's tile — a plate, a name, a line and three lines
   * of the life — and is therefore taller than the same saint as a name and a
   * date. Measured on the row the page happens to draw first in that column —
   * its identity does not matter, only that it is the same saint before and
   * after.
   */
  const rowHeight = () =>
    page.evaluate(() => {
      const el = document.querySelector('#hy-related :is(.hy-link, .day-tile)');
      // A hidden element reports 0 and would satisfy "shorter" by accident.
      return el && el.clientWidth > 0 ? el.getBoundingClientRect().height : 0;
    });

  const asPlate = await rowHeight();
  expect(asPlate, 'the picture face is drawn').toBeGreaterThan(0);

  await page.evaluate(() => document.querySelector('[data-hy-view="rows"]').click());
  await expect(rows).toHaveAttribute('aria-pressed', 'true');
  await expect(plate).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#hy-related .day-tile')).toHaveCount(0);
  await expect(page.locator('#hy-related .hy-link').first()).toBeVisible();

  const asRows = await rowHeight();
  expect(asRows, 'the names face is drawn').toBeGreaterThan(0);
  expect(asPlate, 'and the tile is taller by a picture and a life').toBeGreaterThan(asRows);
});

/**
 * **Every name opens something** — the author, 2026-09-17 ("in the prayer
 * section clicking on the names does nothing"), and the ruling in
 * `../mockup-review/BRIEF.md`, stage I. The review walked twelve saints and
 * found 84 of 116 names inert, 13 of the 14 on the saint the page opens on.
 *
 * The two doors are two elements, which is what makes this assertable without
 * pressing 116 of them: a saint the hymnal holds is a `<button>` carrying
 * `data-go`, and one it does not is an `<a>` to their own page. Nothing is
 * `disabled`, in either face, in either column.
 */
test('every name in a margin opens something past 1024 px', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  await expect(page.locator(`#hy-sameday ${ROW}`).first()).toBeVisible();

  const hymned = new Set(HYMNED.map((c) => c.slug));
  const read = () =>
    page.evaluate(() =>
      ['#hy-related', '#hy-sameday'].flatMap((id) =>
        [...document.querySelectorAll(`${id} :is(.hy-link, .day-tile)`)].map((b) => ({
          slug: b.dataset.slug,
          tag: b.tagName,
          go: b.dataset.go ?? null,
          href: b.getAttribute('href'),
          inert: b.hasAttribute('disabled'),
          // A hidden row reports 0 and would pass every claim below by not
          // being there at all (trap 7).
          drawn: b.clientWidth > 0,
        })),
      ),
    );

  let seen = 0;
  /* Six consecutive saints rather than one, because "most names are inert" was
     a claim about a walk and not about a page. */
  for (let step = 0; step < 6; step += 1) {
    if (step > 0) await stepTo(page, 1);
    await expect.poll(async () => (await read()).length).toBeGreaterThan(0);
    for (const r of await read()) {
      seen += 1;
      expect(r.drawn, `${r.slug} is drawn`).toBe(true);
      expect(r.inert, `${r.slug} is not inert`).toBe(false);
      if (hymned.has(r.slug)) {
        expect(r.tag, `${r.slug} is in the hymnal and opens here`).toBe('BUTTON');
        expect(r.go).toBe(r.slug);
      } else {
        expect(r.tag, `${r.slug} is not in the hymnal and opens its own page`).toBe('A');
        expect(r.href, `${r.slug}'s door`).toContain(`/saints/${r.slug}`);
        expect(r.go, 'and this page does not claim to hold them').toBeNull();
      }
    }
  }
  expect(seen, 'the walk read a corpus-sized number of names').toBeGreaterThan(20);
});

test('a name the hymnal does not hold opens that saint’s own page', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  await expect(page.locator(`#hy-sameday ${ROW}`).first()).toBeVisible();

  /* The first dimmed row in either column, found by walking: which saints have
     un-hymned company is a fact about the corpus and not a literal. */
  let target = null;
  for (let i = 0; i < 8 && !target; i += 1) {
    if (i > 0) await stepTo(page, 1);
    await expect.poll(() => page.locator(`.hy-body ${ROW}`).count()).toBeGreaterThanOrEqual(0);
    target = await page.evaluate(
      () => document.querySelector('.hy-body :is(.hy-link, .day-tile).is-dim')?.dataset.slug ?? null,
    );
  }
  expect(target, 'some saint in the first eight has un-hymned company').not.toBeNull();

  await page.evaluate((slug) => {
    document.querySelector(`.hy-body [data-slug="${slug}"]`).click();
  }, target);

  // Two independent things (trap 14): the address the router settled on, and a
  // drawn name on the page it opened.
  await expect.poll(() => new URL(page.url()).pathname).toContain(`/saints/${target}`);
  await expect(page.locator('h1')).not.toHaveText('');
});

/**
 * **No picture, no box** — finding 16's "solid dark or grey 174x116 box", which
 * is `--mount` painted under every saint in these columns who has no icon, and
 * most of them have none. The fix is not written here: the tile is
 * `calendar.css`'s one drawing and stage G took the blank mat out of it, so
 * what this asserts is that Prayer reaches that rule — the box is emitted, in
 * the shelf's own markup, and the shared sheet is what hides it.
 */
test('a tile with no icon has no box, and one with an icon has a 3:2 plate', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  await expect(page.locator('#hy-sameday .day-tile').first()).toBeVisible();

  /* A walk, because whether the day in hand holds both a pictured and an
     unpictured saint is a fact about the corpus. */
  let both = null;
  for (let i = 0; i < 10 && !both; i += 1) {
    if (i > 0) await stepTo(page, 1);
    both = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('.hy-body .day-tile')];
      const box = (row) => {
        const thumb = row.querySelector('.reg-thumb');
        if (!thumb) return null;
        const r = thumb.getBoundingClientRect();
        return { w: r.width, h: r.height, painted: getComputedStyle(thumb).display !== 'none' };
      };
      const pic = rows.find((r) => r.querySelector('img'));
      const blank = rows.find((r) => !r.querySelector('img'));
      if (!pic || !blank) return null;
      return {
        pic: { ...box(pic), tile: pic.getBoundingClientRect().height },
        blank: { ...box(blank), tile: blank.getBoundingClientRect().height },
      };
    });
  }
  expect(both, 'a day in the first ten holds a saint with an icon and one without').not.toBeNull();

  expect(both.pic.painted, 'the pictured tile has its plate').toBe(true);
  expect(both.pic.w).toBeGreaterThan(100);
  expect(both.pic.h / both.pic.w, 'and it is 3:2').toBeCloseTo(2 / 3, 2);

  expect(both.blank.painted, 'the unpictured tile has no box at all').toBe(false);
  expect(both.blank.w, 'so it occupies nothing').toBe(0);
  expect(both.blank.tile, 'and the tile is shorter by the plate').toBeLessThan(both.pic.tile);
});

/**
 * **The day, under a name kept on the same day** (finding 9: the mockup's sub
 * prints "3 September", where this page printed the lifespan). Asserted
 * against the day the aside itself published in `data-iso`, formatted the way
 * the page formats it — not against a literal, which would be wrong the next
 * time the reckoning leaps and on one day a year besides (trap 4).
 */
test('a tile in the same-day column prints the day, not the lifespan', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  const aside = page.locator('#hy-sameday');
  await expect(aside.locator('.day-tile').first()).toBeVisible();
  await expect.poll(() => aside.getAttribute('data-iso')).not.toBeNull();

  const iso = await aside.getAttribute('data-iso');
  /* `en-GB`, which is the tag `lib/i18n.js` gives English: the day before the
     month, which is what this site has always printed and what the mockup
     draws. Node's bare `en` is `en-US` and would say "September 3". */
  const said = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  );
  const subs = await aside.evaluate((el) =>
    [...el.querySelectorAll('.day-tile .reg-sub')].map((s) => s.textContent.trim()),
  );
  expect(subs.length, 'the column has tiles').toBeGreaterThan(0);
  for (const sub of subs) expect(sub, 'every tile says the day the column is').toBe(said);

  // And the names column still says who they were, which is the other reading.
  const related = await page.evaluate(() =>
    [...document.querySelectorAll('#hy-related .day-tile .reg-sub')].map((s) => s.textContent.trim()),
  );
  for (const sub of related) expect(sub, 'a recorded-with tile is not dated by the day').not.toBe(said);
});

/**
 * **The dim is live, so it has to be legible** (finding 16; the ruling's own
 * condition). The mockup fades the whole tile to .45, which its inert tile can
 * afford and a link cannot: `--ink` at .45 is 2.69:1 on gesso in day and
 * 3.60:1 in vigil. The author ruled on 2026-09-18 that the mockup's value be
 * taken if the floor allows it; it does not, so the page takes the lowest
 * hundredth that passes both themes — .64, re-measured that day (4.60:1 and
 * 6.02:1; .63 is 4.46:1 in day and fails). The two small lines take `--ink`
 * inside a dim tile because `--ink-soft` cannot be carried at any useful
 * depth.
 *
 * **The 4.5 floor below is the assertion, and the opacity is the reading.**
 * Lowering one to let the other pass is the one move this test exists to
 * prevent.
 *
 * Composited by hand from painted colours (trap 9), and asserted in both
 * themes, because the browser suite ran in light only until 2026-08-22 and a
 * contrast defect sat in `STRUCTURE.md` for weeks behind it.
 */
test('a dimmed name is faded, not faint: it clears 4.5:1 in both themes', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();

  let found = false;
  for (let i = 0; i < 8 && !found; i += 1) {
    if (i > 0) await stepTo(page, 1);
    await expect.poll(() => page.locator(`.hy-body ${ROW}`).count()).toBeGreaterThanOrEqual(0);
    found = (await page.locator('.hy-body .day-tile.is-dim').count()) > 0;
  }
  expect(found, 'some saint in the first eight has un-hymned company').toBe(true);

  for (const theme of ['day', 'vigil']) {
    await page.evaluate((t) => document.documentElement.classList.toggle('dark', t === 'vigil'), theme);
    const read = await page.evaluate(() => {
      const tile = document.querySelector('.hy-body .day-tile.is-dim');
      /* The ground is painted, never parsed: `--gesso` hands back its own
         `clamp`-free literal here, but the fifteen tokens the theme cross-fade
         animates are registered and hand back a computed colour instead, so
         the only honest way to read one is to paint it (trap 9). */
      const probe = document.createElement('span');
      probe.style.position = 'fixed';
      probe.style.left = '-9999px';
      probe.style.backgroundColor = 'var(--gesso)';
      document.body.append(probe);
      const ground = getComputedStyle(probe).backgroundColor;
      probe.remove();
      const of = (sel) => getComputedStyle(tile.querySelector(sel)).color;
      return {
        opacity: parseFloat(getComputedStyle(tile).opacity),
        ground,
        name: of('.reg-name'),
        sub: of('.reg-sub'),
      };
    });
    expect(read.opacity, `${theme}: the mockup's fade, at a legible depth`).toBeCloseTo(0.64, 2);

    const rgb = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number);
    const lum = (c) => {
      const f = c.map((v) => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
    };
    const ground = rgb(read.ground);
    const ratio = (colour) => {
      const fg = rgb(colour).map((v, i) => v * read.opacity + ground[i] * (1 - read.opacity));
      const [hi, lo] = [lum(fg), lum(ground)].sort((a, b) => b - a);
      return (hi + 0.05) / (lo + 0.05);
    };
    expect(ratio(read.name), `${theme}: the dimmed name clears AA`).toBeGreaterThanOrEqual(4.5);
    expect(ratio(read.sub), `${theme}: and so does its date`).toBeGreaterThanOrEqual(4.5);
  }
});

/**
 * **The card the mockup draws**: the hymn at 19 px italic (finding 17), the
 * preview running to six lines and not four (N2), and the picture's credit
 * under it (N3) — the three of `../mockup-review/REVIEW-2.md` the author ruled
 * on 2026-09-18 to be matched to the mockup.
 *
 * All three are past 1024 px only, so the phone is read at the end of the same
 * test: it keeps the reading voice for the hymn, the four-line clamp, and no
 * credit at all. That second half is what stops the fix reaching a width it
 * was never meant to.
 *
 * The saint is stepped to rather than taken off the opening screen (trap 5):
 * the first card in the book need not have a picture, and a credit cannot be
 * asserted on a card that has none.
 */
test('the saint in hand wears the mockup’s hymn, preview and credit', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();

  // A card with a picture, a life long enough to fill the preview, and a hymn.
  let found = false;
  for (let i = 0; i < 12 && !found; i += 1) {
    if (i > 0) await stepTo(page, 1);
    await expect(page.locator('.hy-saint')).toBeVisible();
    found = await page
      .locator('.hy-saint .hy-pic-frame')
      .count()
      .then((n) => n > 0);
    if (found) {
      // The credit and the hymn arrive with the saint's own folder.
      await expect
        .poll(() => page.locator('.hy-pic [data-hy-credit]').textContent())
        .not.toBe('');
      await expect(page.locator('.hy-hymns .hymn-text').first()).toBeVisible();
      found = await page.evaluate(
        () => (document.querySelector('.hy-line[data-hy-lede]')?.scrollHeight ?? 0) > 120,
      );
    }
  }
  expect(found, 'no saint in the first twelve has a picture and a long life').toBe(true);

  const read = () =>
    page.evaluate(() => {
      const q = (s) => document.querySelector(s);
      // The tokens by what they paint, not by what a property hands back (trap 9).
      const probe = document.createElement('span');
      q('.hy-pic').append(probe);
      const at = (token) => {
        probe.style.fontSize = `var(${token})`;
        return getComputedStyle(probe).fontSize;
      };
      const sizes = { xs: at('--text-2xs'), lg: at('--text-lg'), lede: at('--text-lede') };
      probe.remove();

      const credit = q('.hy-pic [data-hy-credit]');
      const frame = q('.hy-pic .hy-pic-frame');
      const name = q('.hy-pic .hy-name');
      const lede = q('.hy-line[data-hy-lede]');
      const hymn = q('.hy-hymns .hymn-text');
      const box = (el) => (el ? el.getBoundingClientRect() : null);
      const cs = (el) => (el ? getComputedStyle(el) : null);
      const lc = cs(lede);
      const cc = cs(credit);
      return {
        sizes,
        // A hidden element reports 0 and would pass a size assertion in
        // silence (trap 7), so every premise is a reading of its own.
        creditDrawn: credit ? credit.clientWidth > 0 : false,
        creditText: credit ? credit.textContent.trim() : null,
        creditSize: cc?.fontSize ?? null,
        creditUnderPicture: credit && frame ? Math.round(box(frame).bottom) <= Math.round(box(credit).top) : false,
        creditOverName: credit && name ? Math.round(box(credit).bottom) <= Math.round(box(name).top) : false,
        ledeLines: lede ? Math.round(box(lede).height / parseFloat(lc.lineHeight)) : null,
        ledeClamped: lede ? lede.scrollHeight > lede.clientHeight : false,
        hymnSize: cs(hymn)?.fontSize ?? null,
        hymnStyle: cs(hymn)?.fontStyle ?? null,
      };
    });

  const desktop = await read();
  expect(desktop.sizes, 'premise: the three tokens are no longer the mockup’s sizes').toEqual({
    xs: '12px',
    lg: '17px',
    lede: '19px',
  });

  // 17: the hymn is sung, not read — the mockup's 19 px italic.
  expect(desktop.hymnSize, 'the hymn is not at --text-lede').toBe(desktop.sizes.lede);
  expect(desktop.hymnStyle, 'the hymn is not italic').toBe('italic');

  // N2: six lines of the life, as the mockup shows, and actually clamped.
  expect(desktop.ledeLines, 'the preview is not six lines deep').toBe(6);
  expect(desktop.ledeClamped, 'premise: this life is shorter than the clamp').toBe(true);

  // N3: the credit, under the picture and over the name, in the same 12 px
  // utility voice Daily's column-2 credit takes.
  expect(desktop.creditDrawn, 'the picture has no credit line').toBe(true);
  expect(desktop.creditText, 'the credit line is empty').not.toBe('');
  expect(desktop.creditSize, 'the credit is not at --text-2xs').toBe(desktop.sizes.xs);
  expect(desktop.creditUnderPicture, 'the credit is not under the picture').toBe(true);
  expect(desktop.creditOverName, 'the credit is not over the name').toBe(true);

  /*
   * And the phone keeps what it had. Same saint — the page is not reloaded, so
   * nothing is re-sourced; only the width changes.
   */
  await phone(page);
  await expect(page.locator('.hy-saint')).toBeVisible();
  const small = await read();
  expect(small.hymnSize, 'the phone’s hymn left the reading voice').toBe(small.sizes.lg);
  expect(small.hymnStyle, 'the phone’s hymn was set in italic').toBe('normal');
  expect(small.ledeLines, 'the phone’s preview changed depth').toBe(4);
  expect(small.creditDrawn, 'the phone grew a credit line').toBe(false);
});

/**
 * **Every name is reachable from the keyboard, and the press is the tile.**
 * The whole tile is the control, so the tile is the element that takes focus —
 * one stop per saint and not one per word — and a dimmed row is in the order
 * with the rest of them now that it has somewhere to go.
 */
test('every name in a margin is a keyboard stop, and Enter opens it', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  await expect(page.locator(`#hy-sameday ${ROW}`).first()).toBeVisible();

  const stops = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(`.hy-body :is(.hy-link, .day-tile)`)];
    return rows.map((b) => ({
      slug: b.dataset.slug,
      // A negative tabindex, a `disabled`, or a non-control element would each
      // take the row out of the order; the tag is what puts it in.
      tab: b.getAttribute('tabindex'),
      tag: b.tagName,
      inert: b.hasAttribute('disabled'),
    }));
  });
  expect(stops.length).toBeGreaterThan(0);
  for (const s of stops) {
    expect(['A', 'BUTTON'], `${s.slug} is a control`).toContain(s.tag);
    expect(s.tab, `${s.slug} is not taken out of the tab order`).toBeNull();
    expect(s.inert).toBe(false);
  }

  /* Focus, then a real key: the tile is what the ring is drawn on, and the
     press it answers is the same one the pointer makes.

     A `Tab` first, because `:focus-visible` is a statement about *how* the
     focus arrived: a programmatic `focus()` with no keyboard in the page's
     history draws no ring, and asserting the ring without it would be
     asserting the wrong thing. */
  await page.keyboard.press('Tab');
  const target = await page.evaluate(() => {
    const row = document.querySelector('.hy-body :is(.hy-link, .day-tile)[data-go]');
    row.focus();
    const cs = getComputedStyle(row);
    return {
      slug: row.dataset.go,
      focused: document.activeElement === row,
      ring: row.matches(':focus-visible'),
      width: parseFloat(cs.outlineWidth),
      style: cs.outlineStyle,
    };
  });
  expect(target.focused, 'the tile takes the focus itself').toBe(true);
  expect(target.ring, 'and the ring is its own').toBe(true);
  expect(target.style, 'drawn, not suppressed').not.toBe('none');
  expect(target.width, 'with a width').toBeGreaterThan(0);

  await page.keyboard.press('Enter');
  await expect(page.locator('.hy-saint')).toHaveAttribute('data-slug', target.slug);
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

/* ---- one search field, two pages ------------------------------------------
   The author, 2026-09-17: "the search bar should be the exact same as the All
   Saints page, not any different. SSOT, repeating designed elements." It was
   not: Prayer drew its own `input.hy-q` at 46 px on `--field` with 12/16
   padding against All Saints' 35 px on `--gesso` with 4/8. Both pages mount
   `ui/search-field.js` now and the drawing is `styles/search-field.css`,
   imported by both per-route sheets.

   **Read off the two pages rather than off the stylesheet**, which is the half
   `tests/search-field.test.mjs` cannot do: that one holds the sheets apart, and
   this one is what says the reader sees one control. Both routes are visited in
   one test for the same reason — two tests each measuring one page would agree
   with each other only by the numbers a human copied between them. */

const fieldDress = (page) =>
  page.evaluate(() => {
    /* Not `.first()` (trap 1): the count is part of the reading, so a second
       field appearing on either page fails here rather than being measured
       past. */
    const all = document.querySelectorAll('.search-field');
    if (all.length !== 1) return { count: all.length };
    const el = all[0];
    const c = getComputedStyle(el);
    return {
      count: 1,
      tag: el.tagName,
      type: el.type,
      height: Math.round(el.getBoundingClientRect().height),
      padding: `${c.paddingTop} ${c.paddingRight} ${c.paddingBottom} ${c.paddingLeft}`,
      background: c.backgroundColor,
      border: `${c.borderTopWidth} ${c.borderTopStyle} ${c.borderTopColor}`,
      radius: c.borderTopLeftRadius,
      font: `${c.fontSize} ${c.fontFamily}`,
      lineHeight: c.lineHeight,
      color: c.color,
      /* The two spacing tokens the phone's exception below is written in,
         resolved by the element itself so the assertion cannot go stale the day
         a token moves. */
      space3: c.getPropertyValue('--space-3').trim(),
      space4: c.getPropertyValue('--space-4').trim(),
    };
  });

test('at the desk the field on Prayer is the field All Saints draws', async ({ page }) => {
  await desk(page);
  await page.goto(SAINTS_ROUTE, { waitUntil: 'networkidle' });
  await expect(page.locator('.search-field')).toBeVisible();
  const saints = await fieldDress(page);
  expect(saints.count).toBe(1);
  expect(saints.height).toBeGreaterThan(0);

  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  const prayer = await fieldDress(page);

  /* Every quantity the review measured the two apart on — height, padding,
     ground — and the rest of the dress with them, in one comparison. */
  expect(prayer).toEqual(saints);
});

test('below the desk Prayer keeps the field it shipped with', async ({ page }) => {
  await phone(page);
  await page.goto(SAINTS_ROUTE, { waitUntil: 'networkidle' });
  await expect(page.locator('.search-field')).toBeVisible();
  const saints = await fieldDress(page);

  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  const prayer = await fieldDress(page);

  /* The one place the component draws two ways, and it is deliberate: the
     ruling is about the desk and mobile does not move in this pass. All three
     declarations of the exception are read, because the third — the UA's own
     `normal` line box, which `font: inherit` would replace with the root's —
     is worth 5 px of the field's height and nothing else names it. */
  expect(prayer.padding).toBe(`${prayer.space3} ${prayer.space4} ${prayer.space3} ${prayer.space4}`);
  expect(prayer.background).not.toBe(saints.background);
  expect(prayer.lineHeight).toBe('normal');
  expect(saints.lineHeight).not.toBe('normal');
  // Geometry, not a stylesheet: the taller tap target the phone has always had.
  expect(prayer.height).toBeGreaterThan(saints.height + 8);
});

/**
 * **The phone did not move in this pass.** The review, the mockup and the
 * author's instruction are all the desk, so below 1024 px the two columns keep
 * the face they open on and the row they draw — including the inert one a
 * saint the hymnal does not hold gets. `STRUCTURE.md` §6 carries that half as
 * open rather than as finished.
 */
test('below the desk the margins open on the names and keep the row they had', async ({ page }) => {
  await phone(page);
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  await expect(page.locator('#hy-sameday .hy-link').first()).toBeVisible();

  await expect(page.locator('#hy-views [data-hy-view="rows"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.hy-body .day-tile')).toHaveCount(0);

  /* The picture face is still the phone's own plate, mat and all: a face with
     holes in it would have the reader reading the holes as something meant,
     and the corpus behind that reading has not changed below 1024 px. */
  await page.evaluate(() => document.querySelector('[data-hy-view="plate"]').click());
  await expect.poll(() => page.locator('#hy-sameday .hy-plate').count()).toBeGreaterThan(0);
  await expect(page.locator('.hy-body .day-tile')).toHaveCount(0);
  await expect
    .poll(() => page.locator('#hy-sameday .hy-plate').count())
    .toBe(await page.locator('#hy-sameday .hy-link').count());

  // And a name the hymnal does not hold is the inert button it has always been.
  const inert = await page.evaluate(
    () => document.querySelectorAll('.hy-body .hy-link[disabled]').length,
  );
  const doors = await page.evaluate(() => document.querySelectorAll('.hy-body .hy-link[data-go]').length);
  expect(inert + doors, 'every row is one or the other').toBe(
    await page.locator('.hy-body .hy-link').count(),
  );
  expect(await page.locator('.hy-body a.hy-link').count(), 'and none of them is a link out').toBe(0);
});
