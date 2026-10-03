import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';
import { CHURCHES_BY_ID } from '../src/data/churches.js';
import { formatSubtext, todayIso } from '../src/lib/calendar-page.js';
import { feastIndexFor } from '../src/lib/feasts.js';
import { openingAt, SAME_DAY_MAX } from '../src/lib/prayer-order.js';
import { STRINGS, fill } from '../src/ui/strings.js';
import { INDEX as SAINTS_ROUTE, desk, dragGrain, phone, ready, withMentions } from './helpers.js';

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
/* `mentionedIn` is its own file since 3 October 2026 and the page merges it
   onto these same cards (`src/lib/manifest.js`), so the fixture does too. */
const CARDS = withMentions(
  Array.isArray(MANIFEST.saints) ? MANIFEST.saints : Object.values(MANIFEST.saints ?? MANIFEST),
);

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
 * A row in either aside, in either face — **All Saints' row card** since
 * 2026-10-02 (author: "The 'Recorded with' and 'Kept the same day' rows should
 * have the same design as the all saints entries advanced search mode row
 * cards… SSOT"). The names face is `.index-card.is-row` and the picture face
 * is the same card without it, which is that page's own two shapes.
 *
 * **The row and its door are two elements now**, where `.hy-link` was both:
 * the `<li class="index-card">` carries `data-slug`, and the `.index-name`
 * inside it is the `<button data-go>`, the `<a href>` or the disabled button
 * (`views/prayer/asides.js`). A test about what a row *says* reads the row; a
 * test about where it *goes* reads `DOOR` inside it.
 */
const ROW = '.hy-links .index-card';

/** The door inside a row — see `ROW`. */
const DOOR = '.index-name';

/** The church every test here reads in, and the one `ready()` seeds. */
const CHURCH = 'russian';

/**
 * **Where the book opens, computed the way the page computes it** (author,
 * 2026-10-03: "the default opening page is saint of the day"). `openingAt` is
 * imported rather than restated — the whole rule, including what it does with a
 * day the hymnal has no hymn for, is `lib/prayer-order.js`'s and is unit-tested
 * there; a copy of it here would be a second opinion to keep in step.
 *
 * It is today's date, so this moves every day and is nobody's literal. Trap 4
 * does not apply: the page reads the clock on purpose, and the premise each
 * test makes of this is asserted beside the reading.
 */
const OPENS_AT = openingAt(HYMNED, {
  saints: CARDS,
  bySlug: new Map(CARDS.map((c) => [c.slug, c])),
  churchId: CHURCH,
  churchesById: CHURCHES_BY_ID,
  iso: todayIso(),
});

/**
 * Where a test that needs a page *after* the one in hand starts from. The day's
 * saint is almost never the last page of the book, but "almost never" is one
 * day somewhere in the corpus and a book does not wrap.
 */
const STEP_FROM = OPENS_AT < HYMNED.length - 1 ? OPENS_AT : 0;

/**
 * Puts the saint at an index of the whole book in hand, from wherever the book
 * opened.
 *
 * **It was a count of presses from the first page until 2026-10-03**, when the
 * page began opening on the saint of the day (author: "the default opening page
 * is saint of the day"). A count from page one is now both the wrong arithmetic
 * and, at this corpus's length, several hundred redraws — so the field does the
 * travelling: the query narrows the book to something an arrow can walk, the
 * walk finds the saint, and the field is then emptied. `setOrder`
 * (`views/prayer/find.js`) holds the saint in hand across a change that still
 * contains them, so what this leaves behind is the whole book with the
 * asked-for saint showing, which is exactly what the press count left.
 *
 * **Each press waits for the saint to change** rather than for a fixed delay,
 * for `walkBook`'s own reason: the card swaps when its fade's `finished`
 * resolves, so a press sent too early is a press into a fade the next one
 * cancels. The presses are dispatched rather than clicked (trap 3).
 */
async function goTo(page, index) {
  const want = HYMNED[index];
  if ((await page.locator(`.hy-saint[data-slug="${want.slug}"]`).count()) === 1) return;
  await type(page, want.display_name);
  await expect
    .poll(() => page.locator('#hy-count').textContent())
    .not.toBe(fill(STRINGS.prayer.count, { n: HYMNED.length }));
  const landed = await page.evaluate(async ({ slug, limit }) => {
    const at = () => document.querySelector('.hy-saint')?.dataset.slug;
    const press = async (id) => {
      const from = at();
      document.querySelector(id).click();
      for (let t = 0; t < 60 && at() === from; t += 1) await new Promise((r) => setTimeout(r, 50));
    };
    for (let i = 0; i < limit && !document.querySelector('#hy-prev').disabled; i += 1) {
      await press('#hy-prev');
    }
    for (let i = 0; i < limit && at() !== slug; i += 1) {
      if (document.querySelector('#hy-next').disabled) break;
      await press('#hy-next');
    }
    return at();
  }, { slug: want.slug, limit: 200 });
  expect(landed, `the query for ${want.display_name} left a book holding them`).toBe(want.slug);
  await type(page, '');
  await expect(page.locator('.hy-saint')).toHaveAttribute('data-slug', want.slug);
}

/** One press onward, waited out the same way. */
async function stepOn(page) {
  const from = await page.locator('.hy-saint').getAttribute('data-slug');
  await page.evaluate(() => document.querySelector('#hy-next').click());
  await expect(page.locator('.hy-saint')).not.toHaveAttribute('data-slug', from);
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
        field: rect(document.querySelector('.index-row .search-field')),
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

/*
 * **It opened on the hymnal's own first page until 2026-10-03.** The author:
 * "And the default opening page is saint of the day" — so the assertion below
 * is `OPENS_AT` and not 0, and the two arrows are read against where that
 * lands rather than against the ends of the book.
 */
test('the page opens on the saint of the day', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  const article = page.locator('.hy-saint');
  await expect(article).toBeVisible();
  await expect(article).toHaveAttribute('data-slug', HYMNED[OPENS_AT].slug);
  /* The arrows say where in the book that is, which is the second, independent
     reading of the same fact (trap 14): a page that published the right slug
     while standing somewhere else would pass the line above and fail these. */
  await expect(page.locator('#hy-prev')).toBeEnabled({ enabled: OPENS_AT > 0 });
  await expect(page.locator('#hy-next')).toBeEnabled({ enabled: OPENS_AT < HYMNED.length - 1 });
});

/*
 * And the day's saint is the day's, not a saint of some other day: whoever the
 * book opens on is either commemorated today in this reader's church, or — on a
 * day no hymn in the corpus answers — the book's own first page.
 * `lib/prayer-order.js` carries the measurement of how often each happens.
 */
test('the saint the page opens on is kept today, or the book opened at page one', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  const slug = await page.locator('.hy-saint').getAttribute('data-slug');
  const iso = todayIso();
  const today = feastIndexFor(CARDS, Number(iso.slice(0, 4)), CHURCHES_BY_ID).get(iso) ?? [];
  const kept = today.filter((e) => e.church === CHURCH).map((e) => e.slug);
  const hymnedToday = kept.filter((s) => HYMNED.some((c) => c.slug === s));
  if (hymnedToday.length) expect(hymnedToday).toContain(slug);
  else expect(slug).toBe(HYMNED[0].slug);
});

test('stepping on changes the saint, and the drawn heading says so too', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  const article = page.locator('.hy-saint');
  await expect(article).toBeVisible();
  // A page with a page after it: see `STEP_FROM`. A no-op on all but one day.
  await goTo(page, STEP_FROM);
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
  // One page on from wherever the day put the reader (2026-10-03: the page
  // opens on the saint of the day, so this was `HYMNED[1]`).
  await expect(page.locator('.hy-name')).toContainText(HYMNED[STEP_FROM + 1].display_name);
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
 * The same, and one more condition: the saint their margin names must be
 * somebody a query of the subject's own name does not reach. `revealSlug`
 * clears the field only where the press widens the book, so a subject whose
 * query still holds the target leaves the query narrowing and nothing to clear.
 *
 * **The index makes that harder than it looks** (`views/prayer/find.js`): a
 * card is indexed on its name, its subtext *and* its companions' names, with
 * MiniSearch combining the terms with AND and matching on prefixes. So where a
 * relation is mutual the target carries the subject's own name in its
 * `companions` field and the query reaches it however narrow it is — «Abachum,
 * son of Marius and Martha», whose margin names Marius and Martha, was the
 * first hymned saint with a back-reference when the Greek wave landed, and it
 * broke the premise rather than the page. The reach below is that index in
 * miniature, which is enough to pick a subject the press really does widen for.
 */
const reaches = (card, query) => {
  const text = [
    card.display_name,
    ...Object.values(card.names ?? {}).map((n) => n.form ?? n),
    formatSubtext(card),
    ...(card.mentionedIn ?? []).map((slug) => CARDS.find((c) => c.slug === slug)?.display_name ?? ''),
  ]
    .join(' ')
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 2)
    .every((word) => text.includes(word));
};

const IN_HYMNAL = new Set(HYMNED.map((c) => c.slug));

const HIDDEN_MENTION = (() => {
  for (const [at, card] of HYMNED.entries()) {
    for (const slug of card.mentionedIn ?? []) {
      if (!IN_HYMNAL.has(slug)) continue;
      const target = CARDS.find((c) => c.slug === slug);
      if (target && !reaches(target, card.display_name)) return { at, slug };
    }
  }
  return null;
})();

/**
 * A hymned saint whose margins name somebody the hymnal does **not** hold: the
 * dim tile, which is drawn for company that has no page here to open. Read off
 * the manifest for the reason every fixture on this page now is — the first
 * eight saints of the hymnal have no such company since the Greek wave.
 */
const WITH_UNHYMNED_COMPANY = HYMNED.findIndex((card) =>
  [...(card.related ?? []), ...(card.mentionedIn ?? [])].some((slug) => !IN_HYMNAL.has(slug)),
);

/**
 * Every hymned saint with an icon, by their place in the book: the picture
 * frame, the credit and the lede. **A list and not the first of them**, because
 * a long enough life is the other half of that test's premise and the manifest
 * does not carry it — eighty-eight of the hymnal's 887 saints have an icon and
 * they are scattered through it, so the test walks the list rather than the
 * saints between them.
 */
const WITH_PICTURE = HYMNED.map((card, at) => (card.image ? at : null)).filter((at) => at !== null);

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
 * A hymned saint the reader's calendar keeps **with somebody else** on his day:
 * the same-day aside's premise. Read off the feast index above rather than
 * looked for in the first eight saints of the hymnal, which on 1 October 2026
 * had no company between them — the Greek wave put a run of solitary
 * neomartyrs at the head of the book.
 */
const WITH_SAME_DAY = HYMNED.findIndex((card) => {
  const iso = dayOf(card.slug, CHURCH);
  return iso !== null && (INDEX.get(iso) ?? []).filter((e) => e.church === CHURCH).length > 1;
});

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
  await goTo(page, WITH_MENTIONS);
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
    [...el.querySelectorAll('.hy-links .index-card')].map((b) => ({
      slug: b.dataset.slug,
      reachable: !!b.querySelector('.index-name')?.dataset.go,
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
   *
   * **The walk is sent to page one first** (2026-10-03: the page opens on the
   * saint of the day, so the first forty of the book is no longer where it
   * opens), which keeps the pin on every step.
   */
  await goTo(page, 0);
  let target = null;
  for (let i = 0; i < Math.min(HYMNED.length, 40) && !target; i += 1) {
    if (i > 0) await stepOn(page);
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
  await goTo(page, SPLIT_DAY);
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
    [...el.querySelectorAll('.hy-links .index-card')].map((b) => b.dataset.slug),
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
    const field = document.querySelector('[data-query]');
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
  expect(HIDDEN_MENTION, 'the corpus holds a hymned saint whose margin their own name hides').not.toBeNull();
  const subject = HYMNED[HIDDEN_MENTION.at];
  await goTo(page, HIDDEN_MENTION.at);
  await expect(page.locator('.hy-saint')).toHaveAttribute('data-slug', subject.slug);

  const target = HIDDEN_MENTION.slug;
  await expect(page.locator(`[data-go="${target}"]`)).toHaveCount(1);

  /* A query that narrows to the saint in hand and therefore excludes whoever
     their margin names. The relation is a fact about the saint and not about
     the search, so the press has to widen the book rather than refuse. */
  await type(page, subject.display_name);
  await expect
    .poll(() => page.locator('#hy-count').textContent())
    .not.toBe(fill(STRINGS.prayer.count, { n: HYMNED.length }));
  await page.evaluate((slug) => document.querySelector(`[data-go="${slug}"]`)?.click(), target);

  await expect(page.locator('.hy-saint')).toHaveAttribute('data-slug', target);
  // And the field says what it is doing: nothing, now.
  await expect(page.locator('[data-query]')).toHaveValue('');
  await expect(page.locator('#hy-count')).toHaveText(fill(STRINGS.prayer.count, { n: HYMNED.length }));
});

test('the two faces are two drawings, not two class names', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  await goTo(page, WITH_MENTIONS);
  await expect(page.locator(`#hy-related ${ROW}`).first()).toBeVisible();

  /* The face chip is All Saints' own View chip since 2026-10-02 — the same
     `choiceGroup` radio pair in `.index-foot` — so the two faces are asked for
     by `cards` and `rows` rather than by this page's old two words. */
  const plate = page.locator('.index-foot input[name="layout"][value="cards"]');
  const rows = page.locator('.index-foot input[name="layout"][value="rows"]');
  /* **The desk opens on the pictures**, which is the mockup's own default and
     is affordable since stage G: a tile whose saint has no icon has no box at
     all here, so the face no longer opens on empty mats. The phone still opens
     on the names — the 360 px block below asserts that half. */
  await expect(plate).toBeChecked();
  await expect(page.locator('#hy-related .index-card:not(.is-row)').first()).toBeVisible();
  await expect(page.locator(`#hy-related .index-card.is-row`)).toHaveCount(0);

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
      const el = document.querySelector('#hy-related .hy-links .index-card');
      // A hidden element reports 0 and would satisfy "shorter" by accident.
      return el && el.clientWidth > 0 ? el.getBoundingClientRect().height : 0;
    });

  const asPlate = await rowHeight();
  expect(asPlate, 'the picture face is drawn').toBeGreaterThan(0);

  await page.evaluate(() => document.querySelector('input[name="layout"][value="rows"]').click());
  await expect(rows).toBeChecked();
  await expect(plate).not.toBeChecked();
  await expect(page.locator('#hy-related .index-card:not(.is-row)')).toHaveCount(0);
  await expect(page.locator('#hy-related .index-card.is-row').first()).toBeVisible();

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
  // Stepped to off the manifest: see `WITH_SAME_DAY`.
  await goTo(page, WITH_SAME_DAY);
  await expect(page.locator(`#hy-sameday ${ROW}`).first()).toBeVisible();

  const hymned = new Set(HYMNED.map((c) => c.slug));
  const read = () =>
    page.evaluate(() =>
      ['#hy-related', '#hy-sameday'].flatMap((id) =>
        [...document.querySelectorAll(`${id} .hy-links .index-card`)].map((b) => ({
          slug: b.dataset.slug,
          ...((d) => ({
            tag: d.tagName,
            go: d.dataset.go ?? null,
            href: d.getAttribute('href'),
            inert: d.hasAttribute('disabled'),
          }))(b.querySelector('.index-name')),
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
    if (step > 0) await stepOn(page);
    /*
     * **Waited for by the heading, not by the row count.** The columns are
     * emptied on a step and redrawn when the saint's own folder answers
     * (`clearAsides` / `fillAsides`), so the `<h2>` is exactly the signal that
     * what is being read belongs to the saint in hand — and it is a signal a
     * saint with no company at all still gives. One such saint is three steps
     * into this walk, which is a fact about the corpus and not a defect: the
     * claim here is that every name that *is* drawn opens something, and the
     * floor on how many names that was is `seen` at the end.
     */
    await expect(page.locator('#hy-related h2')).toBeVisible();
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
  // Stepped to off the manifest: see `WITH_SAME_DAY`.
  expect(WITH_SAME_DAY, 'the corpus holds a hymned saint with company on his day').toBeGreaterThanOrEqual(0);
  await goTo(page, WITH_SAME_DAY);
  await expect(page.locator(`#hy-sameday ${ROW}`).first()).toBeVisible();

  /* The first dimmed row in either column, found by walking: which saints have
     un-hymned company is a fact about the corpus and not a literal. */
  let target = null;
  for (let i = 0; i < 8 && !target; i += 1) {
    if (i > 0) await stepOn(page);
    await expect.poll(() => page.locator(`.hy-body ${ROW}`).count()).toBeGreaterThanOrEqual(0);
    target = await page.evaluate(
      () => document.querySelector('.hy-body .hy-links .index-card.is-dim')?.dataset.slug ?? null,
    );
  }
  expect(target, 'some saint in the first eight has un-hymned company').not.toBeNull();

  await page.evaluate((slug) => {
    document.querySelector(`.hy-body [data-slug="${slug}"] .index-name`).click();
  }, target);

  // Two independent things (trap 14): the address the router settled on, and a
  // drawn name on the page it opened.
  await expect.poll(() => new URL(page.url()).pathname).toContain(`/saints/${target}`);
  await expect(page.locator('h1')).not.toHaveText('');
});

/**
 * **No picture, no box** — finding 16's "solid dark or grey 174x116 box", which
 * was `--mount` painted under every saint in these columns who has no icon,
 * and most of them have none.
 *
 * **These columns draw All Saints' card, not Daily's tile** (measured
 * 2026-10-03): `views/index/grid.js` emits `.index-media` only where the saint
 * has an image, so there is no blank mat to hide and nothing in
 * `calendar.css`'s drawing is reached. `.reg-thumb` and the 3:2 plate were
 * Daily's tile and were never on this page; the plate here is as wide as the
 * card and as tall as the saint's own `cardCrop` makes it, which is why the
 * shape is read off the box rather than written here as a number.
 */
test('a tile with no icon has no box, and one with an icon has a plate', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  // Stepped to off the manifest: see `WITH_SAME_DAY`.
  expect(WITH_SAME_DAY, 'the corpus holds a hymned saint with company on his day').toBeGreaterThanOrEqual(0);
  await goTo(page, WITH_SAME_DAY);
  await expect(page.locator('#hy-sameday .index-card:not(.is-row)').first()).toBeVisible();

  /* A walk, because whether the day in hand holds both a pictured and an
     unpictured saint is a fact about the corpus. */
  let both = null;
  for (let i = 0; i < 10 && !both; i += 1) {
    if (i > 0) await stepOn(page);
    both = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('.hy-body .index-card:not(.is-row)')];
      /* `present: false` rather than `null`, because the absence of the
         element is the finding on this page and `{ ...null }` is `{}`, which
         reports every assertion below as `undefined`. */
      const box = (row) => {
        const plate = row.querySelector('.index-media');
        if (!plate) return { present: false, w: 0, h: 0, painted: false, declared: null };
        const r = plate.getBoundingClientRect();
        return {
          present: true,
          w: r.width,
          h: r.height,
          painted: getComputedStyle(plate).display !== 'none',
          /* What the box says it is. The reading above is what it drew, and
             the two are asserted against each other (trap 14). */
          declared: plate.style.aspectRatio || null,
          inner: row.clientWidth - 2 * parseFloat(getComputedStyle(row).paddingLeft),
        };
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

  expect(both.pic.present, 'the pictured tile has its plate').toBe(true);
  expect(both.pic.painted, 'and the plate is drawn').toBe(true);
  // The plate spans the card's content box, which is the whole of its measure.
  expect(Math.abs(both.pic.w - both.pic.inner), 'the plate is as wide as the card').toBeLessThan(1);
  /* The shape is the saint's own crop rather than a constant, so the claim is
     that the drawn box is the box it declared — a reserved height that the
     picture then fills, which is what stops the column jumping as icons land. */
  expect(both.pic.declared, 'the plate declares a shape').not.toBeNull();
  expect(both.pic.w / both.pic.h, 'and it drew the shape it declared')
    .toBeCloseTo(parseFloat(both.pic.declared), 1);

  expect(both.blank.present, 'the unpictured tile has no box at all').toBe(false);
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
  // Stepped to off the manifest: see `WITH_SAME_DAY`.
  await goTo(page, WITH_SAME_DAY);
  await expect(aside.locator('.index-card:not(.is-row)').first()).toBeVisible();
  await expect.poll(() => aside.getAttribute('data-iso')).not.toBeNull();

  const iso = await aside.getAttribute('data-iso');
  /* `en-GB`, which is the tag `lib/i18n.js` gives English: the day before the
     month, which is what this site has always printed and what the mockup
     draws. Node's bare `en` is `en-US` and would say "September 3". */
  const said = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  );
  const subs = await aside.evaluate((el) =>
    [...el.querySelectorAll('.index-card .index-dates')].map((s) => s.textContent.trim()),
  );
  expect(subs.length, 'the column has tiles').toBeGreaterThan(0);
  for (const sub of subs) expect(sub, 'every tile says the day the column is').toBe(said);

  // And the names column still says who they were, which is the other reading.
  const related = await page.evaluate(() =>
    [...document.querySelectorAll('#hy-related .index-card .index-dates')].map((s) => s.textContent.trim()),
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

  expect(WITH_UNHYMNED_COMPANY, 'the corpus holds a hymned saint with un-hymned company').toBeGreaterThanOrEqual(0);
  await goTo(page, WITH_UNHYMNED_COMPANY);
  await expect
    .poll(() => page.locator('.hy-body .index-card.is-dim').count())
    .toBeGreaterThan(0);

  for (const theme of ['day', 'vigil']) {
    await page.evaluate((t) => document.documentElement.classList.toggle('dark', t === 'vigil'), theme);
    const read = await page.evaluate(() => {
      const tile = document.querySelector('.hy-body .index-card.is-dim');
      /* The ground is painted, never parsed: `--gesso` hands back its own
         `clamp`-free literal here, but the fifteen tokens the theme cross-fade
         animates are registered and hand back a computed colour instead, so
         the only honest way to read one is to paint it (trap 9). */
      const probe = document.createElement('span');
      probe.style.position = 'fixed';
      probe.style.left = '-9999px';
      /* The card's own ground, not the page's: these rows are `.panel` index
         cards since 2026-10-02 and a panel stands on `--field`. */
      probe.style.backgroundColor = 'var(--field)';
      document.body.append(probe);
      const ground = getComputedStyle(probe).backgroundColor;
      probe.remove();
      const of = (sel) => getComputedStyle(tile.querySelector(sel)).color;
      return {
        opacity: parseFloat(getComputedStyle(tile).opacity),
        ground,
        name: of('.index-name'),
        sub: of('.index-dates'),
      };
    });
    expect(read.opacity, `${theme}: the mockup's fade, at a legible depth`).toBeCloseTo(0.65, 2);

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

  /*
   * A card with a picture, a life long enough to fill the preview, and a hymn.
   * The saints with icons are listed off the manifest and stepped to one by
   * one, because the twelve at the head of the hymnal hold no icon between them
   * since the Greek wave, and how long a life is is not in the manifest. The
   * window is 24 rather than 12 because the image programme keeps changing who
   * is at the head of that list.
   */
  expect(WITH_PICTURE.length, 'the corpus holds hymned saints with icons').toBeGreaterThan(0);
  let found = false;
  for (const at of WITH_PICTURE.slice(0, 24)) {
    if (found) break;
    await page.goto(PRAYER, { waitUntil: 'networkidle' });
    /* The card has to be on the page before the arrow is pressed: `#hy-next`
       exists in the markup from the first paint and does nothing until the
       hymnal behind it is built, so a press before this line is swallowed and
       the walk reads the first saint twelve times over. */
    await expect(page.locator('.hy-saint')).toBeVisible();
    await goTo(page, at);
    await expect(page.locator('.hy-saint')).toHaveAttribute('data-slug', HYMNED[at].slug);
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
      /*
       * **The walk looks for the state N2 asserts, not a proxy for it.** This
       * read `scrollHeight > 120`, which let Abercius of Hierapolis through on
       * `cab93377` — a 4,157-character life whose opening paragraph draws five
       * of the clamp's six lines — and then N2 asked for six and got five.
       * Clamped alone is not enough either: a lede can overflow its box at five
       * lines. Six lines *and* clamped is the premise, measured at whichever
       * viewport the project is running.
       */
      found = await page.evaluate(() => {
        const lede = document.querySelector('.hy-line[data-hy-lede]');
        if (!lede) return false;
        const lines = Math.round(lede.getBoundingClientRect().height / parseFloat(getComputedStyle(lede).lineHeight));
        return lines === 6 && lede.scrollHeight > lede.clientHeight;
      });
    }
  }
  expect(found, 'none of the first twelve hymned saints with an icon has a long life too').toBe(true);

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
 * **Every name is reachable from the keyboard, and the press is the row.**
 * One stop per saint and not one per word, and a dimmed row is in the order
 * with the rest of them now that it has somewhere to go.
 *
 * **The control is the name and the press is the whole row**, which is All
 * Saints' own arrangement: `.index-name::after` covers the card, so there is
 * one focusable element per row and pressing anywhere on it opens the saint.
 * That is what replaced a `<button>` wrapping the whole tile.
 */
test('every name in a margin is a keyboard stop, and Enter opens it', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  // Stepped to off the manifest: see `WITH_SAME_DAY`.
  await goTo(page, WITH_SAME_DAY);
  await expect(page.locator(`#hy-sameday ${ROW}`).first()).toBeVisible();

  const stops = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(`.hy-body .hy-links .index-card`)];
    return rows.map((row) => ({
      slug: row.dataset.slug,
      // A negative tabindex, a `disabled`, or a non-control element would each
      // take the row out of the order; the tag is what puts it in.
      ...((b) => ({
        tab: b.getAttribute('tabindex'),
        tag: b.tagName,
        inert: b.hasAttribute('disabled'),
      }))(row.querySelector('.index-name')),
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
    const row = document.querySelector('.hy-body .hy-links .index-card .index-name[data-go]');
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
    await goTo(page, WITH_MENTIONS);
    await expect(page.locator('#hy-related .index-card.is-row').first()).toBeVisible();

    const boxes = await page.evaluate(() =>
      ['.index-controls', '.hy-saint', '#hy-related', '#hy-sameday'].map((sel) => {
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
    /* The page opens on the saint of the day since 2026-10-03, which on one day
       of the corpus is the book's last page and has nothing after it to swipe
       to — so the swipe is made from `STEP_FROM`, which is that page on every
       other day and page one on that one. */
    await goTo(page, STEP_FROM);
    await expect(article).toHaveAttribute('data-slug', HYMNED[STEP_FROM].slug);
    const first = (await page.locator('.hy-name').textContent())?.trim();

    // Leftward is onward, which is the direction the Daily page turns a day.
    await dragGrain(page, '.hymnal', -80);
    // Two independent things (trap 14): the published slug and a drawn glyph.
    await expect(article).toHaveAttribute('data-slug', HYMNED[STEP_FROM + 1].slug);
    await expect
      .poll(async () => (await page.locator('.hy-name').textContent())?.trim())
      .not.toBe(first);

    await dragGrain(page, '.hymnal', 80);
    await expect(article).toHaveAttribute('data-slug', HYMNED[STEP_FROM].slug);
  });

  test('a swipe inside the field is not a page turn', async ({ page }) => {
    await page.goto(PRAYER, { waitUntil: 'networkidle' });
    // The page the day opened on (2026-10-03), which is the thing that must
    // still be in hand afterwards.
    await expect(page.locator('.hy-saint')).toHaveAttribute('data-slug', HYMNED[OPENS_AT].slug);
    /* A finger dragging through the field is selecting text in it. The gesture
       is refused there by name (`ignore`), and this is the reading that says so
       rather than the absence of a complaint. */
    await dragGrain(page, '[data-query]', -80);
    await page.waitForTimeout(150);
    await expect(page.locator('.hy-saint')).toHaveAttribute('data-slug', HYMNED[OPENS_AT].slug);
  });

  test('nothing in the page reaches past its own width', async ({ page }) => {
    await page.goto(PRAYER, { waitUntil: 'networkidle' });
    await expect(page.locator('.hy-saint')).toBeVisible();
    await goTo(page, WITH_MENTIONS);
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

test('on a phone it is the same field, which it was not until 2026-10-02', async ({ page }) => {
  /* Prayer kept its own 46 px box on `--field` below 1024 px, because the
     ruling that unified the two was scoped to the desk. The author lifted that
     scope — "it shouldnt look different. I dont care if the functinality is
     different thats fine, but it should look the same" — so this is the desk's
     comparison run at 360, and the exception it used to assert is gone rather
     than loosened. */
  await phone(page);
  await page.goto(SAINTS_ROUTE, { waitUntil: 'networkidle' });
  await expect(page.locator('.search-field')).toBeVisible();
  const saints = await fieldDress(page);
  expect(saints.count).toBe(1);

  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  const prayer = await fieldDress(page);

  expect(prayer).toEqual(saints);
});

/* ---- the page's name, and Advanced as an option ---------------------------
   The author, 2026-10-03: "In Prayer tab, we need the exact same search
   function as saints except the carousel mode is just normal mode i.e. Advanced
   search OFF. So instead of Saints it says Prayer as the text at the top, and
   when you search you get a search exactly like Saints, but when you click in
   this mode it just shows the hymns thats the idea."

   Two readings are made of "normal mode". All Saints has two faces and the
   button beside its heading names the one a press would take you to; its off
   face is the carousel, and `index.css` folds the facet panel away under
   `.is-carousel` so that face is the field and nothing else. **"Just normal
   mode" is that off face on a page with no carousel in it**: the hymnal itself,
   with the facets folded and one word to open them. So the class names, the
   fold and the word are All Saints' own — TODO item 6's "Advanced is an
   *option*, not the default… Same control, same wording, same place on both
   pages" — and what Prayer adds is only the word for the way back. */

const FACETS = '.index-controls .filter-drop';

test('the page says its own name at the top, where All Saints says its', async ({ page }) => {
  await page.goto(SAINTS_ROUTE, { waitUntil: 'networkidle' });
  /**
   * **A box as tall as its own line**, which is the reading that separates a
   * drawn heading from an `sr-only` one. `clientWidth > 0` does not: the
   * `sr-only` recipe clips the element to a single pixel rather than removing
   * it, so a hidden heading answers 1 and passes. The line height is the
   * element's own, so this is a mechanism and not a layout number.
   */
  const measure = () =>
    page.evaluate(() => {
      const h1 = document.querySelector('.index-head h1');
      if (!h1) return { text: null, drawn: false };
      const box = h1.getBoundingClientRect();
      const size = parseFloat(getComputedStyle(h1).fontSize);
      return { text: h1.textContent.trim(), drawn: box.height >= size && box.width > size };
    });
  const saintsHead = await measure();

  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  /* Two independent things (trap 14): the word the page publishes, and that the
     box holding it has width — an `sr-only` heading reads the same and is the
     state this page was in until 2026-10-03. */
  await expect(page.locator('.hymnal .index-head h1')).toHaveText(STRINGS.prayer.title);
  expect(await measure()).toEqual({ text: STRINGS.prayer.title, drawn: true });
  // It is still the element `main.js` moves focus to, so it has to be the first.
  expect(await page.evaluate(() => document.querySelector('#view h1')?.textContent.trim())).toBe(
    STRINGS.prayer.title,
  );
  // The same row, drawn the same way, with the other page's own name in it.
  expect(saintsHead.drawn).toBe(true);
  expect(saintsHead.text).toBe(STRINGS.saints.title);
});

test('Advanced is off when the page opens, and one word opens it', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();

  // Off: the field is there and the facets are not. The panel keeps its DOM —
  // folded is not emptied — so this is `toBeHidden` and not `toHaveCount(0)`.
  await expect(page.locator('.search-field')).toBeVisible();
  await expect(page.locator(FACETS)).toBeHidden();
  const word = page.locator('[data-mode-toggle]');
  await expect(word).toHaveText(STRINGS.saints.modeToSearch);

  await word.click();
  await expect(page.locator(FACETS)).toBeVisible();
  // Every chip All Saints offers, and the die with them.
  await expect(page.locator('.index-controls .facets .facet')).toHaveCount(7);
  await expect(page.locator('.index-controls [data-random]')).toBeVisible();
  await expect(word).toHaveText(STRINGS.saints.modeToNormal);

  await word.click();
  await expect(page.locator(FACETS)).toBeHidden();
  await expect(word).toHaveText(STRINGS.saints.modeToSearch);
});

test('the word that opens the facets is All Saints’ own word', async ({ page }) => {
  await page.goto(SAINTS_ROUTE, { waitUntil: 'networkidle' });
  const saints = await page.locator('[data-mode-toggle]').textContent();
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  /* Read off the two pages rather than off the pack, for `fieldDress`'s reason:
     two tests each reading one page would agree only by a copied literal. All
     Saints opens on its carousel, so both are in their off face here. */
  expect((await page.locator('[data-mode-toggle]').textContent())?.trim()).toBe(saints?.trim());
});

test('folding the facets does not clear what they narrowed', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  const whole = fill(STRINGS.prayer.count, { n: HYMNED.length });
  await expect(page.locator('#hy-count')).toHaveText(whole);

  await page.locator('[data-mode-toggle]').click();
  /* One month of the twelve, which narrows the book whatever the corpus holds —
     where a single church would not, with the Romanian year written in full.
     The chip is a `<details>`, so it is opened before its box can be ticked,
     and the box is read back: a facet that did not take fails the premise
     rather than the assertion. */
  await page.locator('.index-controls .facet[data-facet="months"] > summary').click();
  const box = page.locator('.index-controls input[name="months"][value="1"]');
  await box.check();
  await expect(box).toBeChecked();
  await expect.poll(() => page.locator('#hy-count').textContent()).not.toBe(whole);
  const narrowed = await page.locator('#hy-count').textContent();

  await page.locator('[data-mode-toggle]').click();
  await expect(page.locator(FACETS)).toBeHidden();
  // The facets are the filter set's source of truth, so folding the panel must
  // not hand the reader a book they did not ask for.
  await expect(page.locator('#hy-count')).toHaveText(narrowed);
  // And the way back is outside the fold, as it is on All Saints.
  await expect(page.locator('[data-clear]')).toBeVisible();
});

test('with Advanced folded, a press in a margin still opens the hymns here', async ({ page }) => {
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  await expect(page.locator(FACETS)).toBeHidden();

  /* A saint with a reachable name in a margin, found by walking from page one:
     which saints have hymned company is a fact about the corpus. The same walk
     `pressing a reachable name in an aside turns to that saint` makes. */
  await goTo(page, 0);
  let target = null;
  for (let i = 0; i < 40 && !target; i += 1) {
    if (i > 0) await stepOn(page);
    await expect.poll(() => page.locator(`.hy-body ${ROW}`).count()).toBeGreaterThanOrEqual(0);
    target = await page.evaluate(() => document.querySelector('[data-go]')?.dataset.go ?? null);
  }
  /* The whole of this page's idea (author: "when you click in this mode it just
     shows the hymns"): a saint the hymnal holds opens *here*, with the hymns,
     and the address does not move to their profile. */
  expect(target, 'some saint in the first forty has reachable company').not.toBeNull();
  const where = new URL(page.url()).pathname;
  await page.evaluate((slug) => document.querySelector(`[data-go="${slug}"]`).click(), target);
  await expect(page.locator('.hy-saint')).toHaveAttribute('data-slug', target);
  // Two independent things: the card is theirs, and it is carrying a hymn.
  await expect(page.locator('.hy-hymns .hymn-text').first()).toBeVisible();
  expect(new URL(page.url()).pathname, 'the press left the page').toBe(where);
  await expect(page.locator(FACETS)).toBeHidden();
});

/**
 * **The phone keeps the face it opens on and the door it had.** The review, the
 * mockup and the author's instruction are all the desk, so below 1024 px a
 * saint the hymnal does not hold is still the inert button rather than a link
 * out. `STRUCTURE.md` §6 carries that half as open rather than as finished.
 *
 * What the phone no longer keeps is a *drawing* of its own: both faces are All
 * Saints' row card at both widths since 2026-10-02, which is the whole of what
 * "SSOT" asked for.
 */
test('below the desk the margins open on the names and keep the door they had', async ({ page }) => {
  await phone(page);
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await expect(page.locator('.hy-saint')).toBeVisible();
  // Stepped to off the manifest: see `WITH_SAME_DAY`.
  await goTo(page, WITH_SAME_DAY);
  await expect(page.locator('#hy-sameday .index-card.is-row').first()).toBeVisible();

  await expect(page.locator('.index-foot input[name="layout"][value="rows"]')).toBeChecked();
  await expect(page.locator('.hy-body .index-card:not(.is-row)')).toHaveCount(0);

  /* The picture face is the card shape, here as at the desk, and **no picture
     means no box** — the stage G ruling, which the shared card keeps by
     emitting no media at all for a saint with no icon. So there are never more
     plates than rows, and at least one. */
  await page.evaluate(() => document.querySelector('input[name="layout"][value="cards"]').click());
  await expect.poll(() => page.locator(`#hy-sameday ${ROW}`).count()).toBeGreaterThan(0);
  await expect(page.locator('.hy-body .index-card.is-row')).toHaveCount(0);
  const plates = await page.locator('#hy-sameday .index-card .index-media').count();
  expect(plates, 'the picture face is drawn').toBeGreaterThan(0);
  expect(plates, 'and no saint without an icon is given a box').toBeLessThanOrEqual(
    await page.locator(`#hy-sameday ${ROW}`).count(),
  );

  // And a name the hymnal does not hold is the inert button it has always been.
  const inert = await page.evaluate(
    () => document.querySelectorAll('.hy-body .index-name[disabled]').length,
  );
  const doors = await page.evaluate(() => document.querySelectorAll('.hy-body .index-name[data-go]').length);
  expect(inert + doors, 'every row is one or the other').toBe(
    await page.locator(`.hy-body ${ROW}`).count(),
  );
  expect(await page.locator('.hy-body a.index-name').count(), 'and none of them is a link out').toBe(0);
});

/**
 * **The sticky controls block is opaque where the page passes under it.**
 *
 * Author, 2026-10-03, with a screenshot: the saint's name read straight
 * through the facet chips. `.index-controls` carried `background: none` and the
 * ground was on `.index-row` alone, which is the search bar — so the chips
 * below that bar, and the gap above them, were a window onto whatever the page
 * had scrolled under them.
 *
 * **Nothing in the suite saw it, and the reason is a shape.** Every assertion
 * about this block is about where a thing *is*: the block sticks, the chips are
 * in it, the register runs under it, the outer height never moves. A
 * transparent band is in exactly the right place. So is an opaque one.
 *
 * `elementFromPoint` cannot answer this either, and that is trap 14 in one
 * line: hit-testing does not care what was painted, so the block wins every
 * point in its own band whether it has a ground or not — an instrument that
 * returns the same answer with the fix backed out.
 *
 * What a reader sees is pixels, so the instrument is pixels, and the claim is
 * made **differentially**: the block is stuck, the page is scrolled under it
 * twice, and the band it occupies has to come back byte for byte the same. A
 * ground that is there cannot be scrolled; one that is not, cannot be anything
 * else. Three premises are asserted beside it, because each one of them would
 * make the comparison pass while measuring nothing: the block is stuck and has
 * not moved between the two shots, the page *did* move under it, and the same
 * comparison **fails** with `background: none` put back.
 */
test('the sticky controls block is opaque where the page scrolls under it', async ({ page }) => {
  /* 446, which is the width the report was made at — and a phone width, where
     the document is the scroller. Past 1024 the page does not scroll at all. */
  await page.setViewportSize({ width: 446, height: 800 });
  await ready(page);
  await page.goto(PRAYER, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  /* Two frames and the stuck shadow's own duration: the hairline and shadow
     arrive with a transition, and a shot taken mid-way through one differs
     from the next for a reason that is not the page showing through. */
  const settle = () =>
    page.evaluate(
      () =>
        new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 160)))),
    );

  const band = async () => {
    const box = await page.evaluate(() => {
      const r = document.querySelector('.index-controls').getBoundingClientRect();
      return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
    });
    return { box, shot: await page.screenshot({ clip: box }) };
  };

  /* The strip of page immediately below the block, which is the control: it has
     to differ between the two scrolls or nothing moved under the band either. */
  const below = async () => {
    const box = await page.evaluate(() => {
      const r = document.querySelector('.index-controls').getBoundingClientRect();
      return { x: Math.round(r.left), y: Math.round(r.bottom) + 2, width: Math.round(r.width), height: 60 };
    });
    return page.screenshot({ clip: box });
  };

  const at = async (y) => {
    await page.evaluate((to) => window.scrollTo(0, to), y);
    await settle();
    return { ...(await band()), under: await below() };
  };

  const first = await at(260);
  /* `is-stuck` is All Saints' own class and `views/index/sticky.js` is not
     mounted here (STRUCTURE.md: the sentinel is inert on this page), so the
     premise is the one this page does keep — the block is sticky, and the page
     has actually scrolled. */
  expect(
    await page.evaluate(() => getComputedStyle(document.querySelector('.index-controls')).position),
    'premise: the block is not sticky, so nothing passes under it',
  ).toBe('sticky');
  expect(
    await page.evaluate(() => window.scrollY),
    'premise: the page did not scroll, so there is nothing under the block',
  ).toBeGreaterThan(100);
  expect(first.box.height, 'premise: the block has no band to be opaque in').toBeGreaterThan(40);

  const second = await at(320);
  // Premise: the block held still, so the two shots are of the same band.
  expect(second.box, 'premise: the sticky block moved between the two shots').toEqual(first.box);
  // Premise: the page moved under it, so there was something to show through.
  expect(
    second.under.equals(first.under),
    'premise: the page did not move under the block, so this proves nothing',
  ).toBe(false);

  expect(
    second.shot.equals(first.shot),
    'the page shows through the sticky controls block: its band changed when the page scrolled under it',
  ).toBe(true);

  /*
   * And the back-out, in the test: with the block's own ground taken away the
   * comparison above has to fail, or it was never reading the ground.
   */
  await page.addStyleTag({ content: '.index-controls { background: none !important; }' });
  const bare = await at(260);
  const bareAgain = await at(320);
  expect(
    bareAgain.shot.equals(bare.shot),
    'the instrument: with `background: none` back the band still did not change, so it measures nothing',
  ).toBe(false);
});

test("Prayer stands on All Saints' margin, not a wider one", async ({ page }) => {
  /*
   * Author, 2026-10-03: "That whole page is also a different edge margin width
   * than the Saints page". It was. `main.chrome` pays the page's gutter on
   * every route, and this page's shell, head row, count line and asides each
   * paid it a second time, so its field began 16 px further in than All
   * Saints' at every width below the desk.
   *
   * The assertion is the other page rather than a number: the complaint is
   * that the two differ, and a number here would go stale the day the page's
   * gutter changes while leaving the two pages just as far apart.
   */
  await ready(page);
  const edgeOf = async (route) => {
    await page.goto(route, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    return page.evaluate(() => {
      const r = document.querySelector('.search-field').getBoundingClientRect();
      return { left: Math.round(r.left), right: Math.round(innerWidth - r.right) };
    });
  };
  for (const width of [360, 768]) {
    await page.setViewportSize({ width, height: 800 });
    const saints = await edgeOf(SAINTS_ROUTE);
    const prayer = await edgeOf('/prayer');
    expect(prayer, `at ${width} px`).toEqual(saints);
  }
});
