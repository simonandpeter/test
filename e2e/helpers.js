import { readFileSync } from 'node:fs';
import { expect } from '@playwright/test';

/**
 * The fixtures every browser spec shares: the routes the suite keeps returning
 * to, and the small helpers that press the site's own controls.
 *
 * These lived at the top of `quality-floor.spec.js` — and, as it grew, wherever
 * in it they were first needed — until the suite was refiled by surface on
 * 2026-08-27. Nothing here is new; each one is the block that was there, with
 * the comment that explained it.
 */

/**
 * **The corpus's own size, read from the build rather than typed** (2026-08-31).
 *
 * `index.spec.js` pinned `851` in twenty-six places, and the counts per church
 * beside them. Every one of those went red the moment a saint was added —
 * which is the one thing this project is *for*, so the numbers were a tax on
 * doing the work rather than a check on it. Adding eleven saints turned 24
 * tests red without a single one of them having found a defect.
 *
 * Reading `manifest.meta.json` keeps what the assertions were actually worth.
 * They were never claims about the number 851: they were claims that the Index
 * shows *the whole corpus* at rest, that a church facet narrows it to *that
 * church's own count*, and that the ratio's two halves agree. All three survive
 * a growing corpus; the literal did not.
 *
 * It is the build's own meta file, so it is the same number the page renders
 * from — if the build and the page disagreed, `npm run build:manifest` would
 * have failed first, and a test that read the corpus a second, independent way
 * would be pinning the reader against a count nobody serves.
 */
const META = JSON.parse(readFileSync(new URL('../data/manifest.meta.json', import.meta.url), 'utf8'));

/** How many saints the corpus holds, as the page prints it. */
export const CORPUS = String(META.total);

/** How many each church venerates, as the Calendar facet narrows to. */
export const VENERATED = Object.fromEntries(
  Object.entries(META.by_church).map(([church, counts]) => [church, String(counts.venerated)]),
);

const MANIFEST = JSON.parse(readFileSync(new URL('../data/manifest.json', import.meta.url), 'utf8'));
const CARDS = Array.isArray(MANIFEST.saints) ? MANIFEST.saints : Object.values(MANIFEST.saints ?? MANIFEST);

/**
 * How many saints at least one of `churches` venerates — the *union*, which is
 * what the Calendar facet computes when more than one box is ticked and is the
 * whole point of the assertion that uses it: the calendars are additive, never
 * an intersection. Russian ∪ Romanian is not Russian + Romanian, so this
 * cannot be added up from `VENERATED` and has to be counted.
 */
export const venerateUnion = (...churches) =>
  String(CARDS.filter((s) => (s.attestations ?? []).some((a) => a.status === 'venerated' && churches.includes(a.church))).length);

export // 30 January 2026: Anthony the Great in the Russian calendar — 17 January by
// the Julian reckoning, which the New Calendar churches keep on the civil 17th:
// one menologion date, two civil days, the most load-bearing date in the corpus.
const POPULATED = '/calendar/2026-01-30';

export /**
 * **All Saints opens on the carousel now** (author, 2026-08-27), and almost
 * every test in this file that visits it was written about the *other* mode —
 * the filters, the grid, the cards, the counts. Those tests are not wrong and
 * the behaviour they pin has not changed; what changed is which face the page
 * shows first.
 *
 * So the suite states which face it is testing rather than each of forty-odd
 * tests growing a line to press the toggle. The key is only written when the
 * test has not set one itself, exactly as `ready` does for church and language
 * — so `carouselMode()` below, and any test that stamps `indexMode` directly,
 * still gets the mode it asked for.
 *
 * The page's *own* default — a reader who has never chosen — is a real claim
 * and has a test of its own: "All Saints opens on the carousel".
 */
const searchMode = (page) =>
  page.addInitScript(() => {
    const key = 'gos-settings';
    const now = JSON.parse(localStorage.getItem(key) ?? '{}');
    if (typeof now.indexMode !== 'string') {
      localStorage.setItem(key, JSON.stringify({ ...now, indexMode: 'search' }));
    }
  });

export /** The opposite: a reader who is on the carousel, whatever they chose before. */
const carouselMode = (page) =>
  page.addInitScript(() => {
    const key = 'gos-settings';
    const now = JSON.parse(localStorage.getItem(key) ?? '{}');
    localStorage.setItem(key, JSON.stringify({ ...now, indexMode: 'carousel' }));
  });

export /**
 * A Daily page the machine is certainly not having today, read off its own
 * clock.
 *
 * **The Daily button's word depends on the date the runner thinks it is**, and
 * that had been invisible: until 2026-08-27 the four packs used one word for
 * both *Daily* and *Today*, so an assertion about either passed whichever
 * state the button was in. Giving Russian its own base word turned a
 * hardcoded `/calendar/2026-08-26` into a test that failed on exactly one day
 * of the year — and CI ran on that day, hours after the change.
 *
 * So any test that asserts the *Today* word navigates through this rather than
 * through a literal. Three days back is well outside a timezone's worth of
 * slop, and the calendar renders any date, so the day's own contents do not
 * matter to the assertions that use it.
 */
const aDayThatIsNotToday = (page) =>
  page.evaluate(() => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return `/calendar/${iso}`;
  });

export const EMPTY = '/calendar/2026-08-20';

export // Anthony carries an image, all three churches' attestations, name forms in
// Greek and Coptic, related saints and a life; Christopher is the awkward one —
// legendary, undated at birth, no image, no coordinates — so between them the
// detail page's states are covered rather than sampled.
const DETAIL = '/saints/anthony-the-great';

export const SPARSE_DETAIL = '/saints/christopher';

export /*
 * The third entry of each row is anything the route needs before the floor can
 * see it. All Saints is on the list twice since 2026-08-27: the suite's default
 * puts it in search mode, so without the second row the carousel — a full-bleed
 * row of pictures, which is exactly the shape that overflows — would never be
 * measured by the floor at all.
 */
const ROUTES = [
  ['calendar, populated', POPULATED],
  ['calendar, empty day', EMPTY],
  ['saint detail', DETAIL],
  ['saint detail, sparse', SPARSE_DETAIL],
  ['all saints', '/saints'],
  ['all saints, carousel', '/saints', carouselMode],
  ['map', '/map'],
  ['about', '/about'],
];

export const INDEX = '/saints';

/**
 * The width the day picker exists at (2026-09-02).
 *
 * The rail, its drag and its coast, the month toggle and the fade between the
 * two grains are **phone controls now**: the author's instruction of that day
 * — "on desktop daily page (ONLY ON DESKTOP) ... just display monthly only on
 * desktop, no weekly display" — leaves a desktop with a static month grid and
 * no toggle at all.
 *
 * So a test *about the picker* has to say which width it means, and this is
 * that sentence. It is not a workaround for a hidden element: the surface
 * these tests describe is a phone's, and running them at 1280 was describing
 * a page that no longer exists. Both projects run them here, which is one more
 * pass over the picker than the mobile-360 project alone would give.
 */
export const phone = (page) => page.setViewportSize({ width: 360, height: 780 });

export /** Facet groups are disclosures; a reader opens one before using it. */
const facet = async (page, name) => {
  const group = page.locator(`[data-facet="${name}"]`);
  if (!(await group.evaluate((el) => el.open))) await group.locator('summary').click();
  return group;
};

export /**
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

export /**
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

export /**
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

export const releaseGrain = (page, selector, dx) =>
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

export /** The header's control, open. */
const openChooser = async (page) => {
  await page.locator('#church-open').click();
  await expect(page.locator('#church-panel')).toBeVisible();
};

export /**
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

export /**
 * Waits for a chooser panel to finish arriving. Both header panels grew
 * instantly until 2026-08-26 evening; they now fly out of their control over
 * 160 ms, which means "where the panel is" and "what colour its text is" are
 * only meaningful questions once it has landed. Both flights leave inline
 * `opacity` and `transform` on the inner box for their duration and clear
 * them at the end, so the absence of an inline transform is the signal.
 */
/**
 * Sort and View became `.facet` chips holding radio groups on 2026-08-26
 * evening, where they had been a `<select>` and a pair of `aria-pressed`
 * buttons (author: "have it like the other drop down filters but it displays
 * the selected setting"). These two are what every test that used to call
 * `selectOption('[data-sort]')` or click `[data-layout="rows"]` calls now —
 * one place, so the next change to that control is one edit and not thirty.
 */
const chooseSort = async (page, value) => {
  const chip = page.locator('details[data-facet="sort"] > summary');
  if (!(await page.locator('details[data-facet="sort"]').evaluate((d) => d.open))) await chip.click();
  await page.locator(`input[name="sort"][value="${value}"]`).check();
};

/**
 * The Index narrowed to one calendar.
 *
 * **Narrowing is unticking since 2026-08-28** (author: "display all saints by
 * default, i.e. have all the calendars ... ticked by default, so that people
 * get exposed to the full range"). Every test that used to tick one calendar to
 * make a filtered state was ticking a box that is already ticked, and got the
 * whole corpus back. Clearing them all first is the same end state by the route
 * a reader now takes.
 */
/**
 * A flick of the week rail, dispatched **inside the page** with its own timing.
 *
 * The rail reads its release velocity from the samples of the last 120 ms
 * (`up` in views/daily/picker.js) and coasts only past `MIN_FLICK`. Driven
 * through the harness's mouse, each move is a separate round trip, and under
 * parallel load the moves stretch past that window — the fresh samples collapse
 * to one, `dt` is 0, the velocity is 0, and the rail settles instead of
 * coasting. Nothing is wrong with the rail when that happens: the gesture never
 * became a flick. That was this suite's oldest flake, and it was still 1 in 32
 * after the assertions around it stopped being fixed samples.
 *
 * The moves are spaced by a spin on `performance.now()` rather than by
 * `setTimeout`, because a spin blocks: the spacing is real elapsed time
 * whatever else the machine is doing. Four moves, 8 ms apart, 25 px each — a
 * 24 ms window well inside the rail's 120, and the same velocity on every
 * machine. The product path is untouched: pointerdown, four pointermoves,
 * pointerup, and the rail's own sampling decides what to make of them.
 *
 * **It matters as much to the test that asserts a flick does *not* coast.**
 * A gesture that fails to be a flick passes that one trivially, which is a
 * test whose sample cannot reach the case it is pinning.
 *
 * Returns the rail's position at the moment of release.
 */
export const throwRail = (
  strip,
  { moves = 4, step = 25, gap = 8, within = 60, tries = 8 } = {},
) =>
  strip.evaluate(
    (el, { moves: n, step: dx, gap: ms, within: limit, tries: attempts }) => {
      const rect = el.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const from = rect.left + rect.width / 2;
      const fire = (type, x) =>
        el.dispatchEvent(
          new PointerEvent(type, {
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true,
            button: type === 'pointerdown' ? 0 : -1,
            buttons: type === 'pointerup' ? 0 : 1,
            clientX: x,
            clientY: midY,
            bubbles: true,
            cancelable: true,
          }),
        );
      const spin = (wait) => {
        const until = performance.now() + wait;
        while (performance.now() < until);
      };
      /*
       * **A spin bounds the gap from below, not from above**, and that is the
       * suite's oldest flake (2026-08-28). `spin(8)` says "at least 8 ms"; on a
       * preempted machine one of these gaps can be tens of milliseconds, and
       * the rail prunes its samples at 80 ms per move and 120 ms at the
       * release. Stretch the gesture past those and the fresh samples collapse,
       * the velocity is computed over nothing, and the rail settles instead of
       * coasting — so the test reports a rail that did not coast when what
       * happened is that nobody ever threw it.
       *
       * Reproduced at last on 2026-08-28 with CDP CPU throttling rather than
       * with parallel load: at 150x the *first* gesture spans 140 ms and does
       * not coast, while every one after it spans 26 ms and does. That is the
       * shape of it on CI too, where this test runs once, cold, per job — 2 of
       * the last 9 runs touched it and one went red through the retry.
       *
       * So the gesture is *measured and re-thrown* until it is genuinely a
       * flick. The product path is untouched — pointerdown, four pointermoves,
       * pointerup, and the rail's own sampling decides — and a fresh
       * `pointerdown` cancels any coast a slow attempt may have started. What
       * changes is that the helper now knows whether it delivered what it
       * promised, and says so, so a caller can assert its own premise instead
       * of inferring it from the rail's behaviour.
       */
      let span = Infinity;
      let used = 0;
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        const ts = [];
        fire('pointerdown', from);
        for (let i = 1; i <= n; i += 1) {
          spin(ms);
          ts.push(performance.now());
          fire('pointermove', from - i * dx);
        }
        fire('pointerup', from - n * dx);
        span = ts.at(-1) - ts[0];
        used = attempt;
        if (span <= limit) break;
      }
      return { released: el.scrollLeft, span, attempts: used, delivered: span <= limit };
    },
    { moves, step, gap, within, tries },
  );

export const onlyCalendar = async (page, name) => {
  const group = await facet(page, 'churches');
  // Attached, not visible: at 360 the filter panel can be folded away, and the
  // state below is set on the elements rather than through the pointer.
  await group.locator('input[name="churches"]').first().waitFor({ state: 'attached' });
  /*
   * Dispatched rather than clicked, which is this file's own idiom for setting
   * up a filter state (the row test does the same to clear the calendars). The
   * facet drops open on a transition, so a click on the fourth checkbox raced
   * the panel and Playwright refused a target that was still moving — "element
   * is not stable", once, in a full run. The click path is asserted by the
   * tests that are *about* these controls; here the state is the fixture, and a
   * fixture should not be a timing question.
   */
  await group.evaluate((root, wanted) => {
    for (const box of root.querySelectorAll('input[name="churches"]')) {
      const label = box.closest('label')?.textContent?.trim();
      const on = label === wanted;
      if (box.checked !== on) {
        box.checked = on;
        box.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }, name);
};

export const chooseView = async (page, value) => {
  const chip = page.locator('details[data-facet="layout"] > summary');
  if (!(await page.locator('details[data-facet="layout"]').evaluate((d) => d.open))) await chip.click();
  await page.locator(`input[name="layout"][value="${value}"]`).check();
};

export /** What the Sort chip is advertising, which is the grid's own order. */
const sortChip = (page) => page.locator('details[data-facet="sort"] > summary');

export const viewChip = (page) => page.locator('details[data-facet="layout"] > summary');

export const panelSettled = (page, sel = '#church-panel') =>
  page.waitForFunction(
    (s) => {
      const inner = document.querySelector(`${s} .church-panel-inner`);
      return Boolean(inner) && !inner.style.transform && getComputedStyle(inner).opacity === '1';
    },
    sel,
    { timeout: 2000 },
  );

export const answered = (page) => ready(page);

export /** Every mounted card, in whichever layout, fits the box the grid gave it. */
const nothingCropped = async (page) =>
  page.locator('.index-card').evaluateAll((cards) =>
    cards
      .filter((c) => c.scrollHeight > c.clientHeight + 1 || c.scrollWidth > c.clientWidth + 1)
      .map((c) => c.querySelector('.index-name')?.textContent),
  );

export /**
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
