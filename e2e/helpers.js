import { readFileSync } from 'node:fs';
import { expect } from '@playwright/test';

/**
 * The fixtures every browser spec shares: the routes the suite keeps returning
 * to, and the small helpers that press the site's own controls.
 *
 * History and the decisions behind these: docs/E2E-DECISIONS.md#helpersjs
 */

/**
 * **The corpus's own size, read from the build rather than typed** — never a
 * literal, which a new saint turns red without having found a defect.
 * The build's own meta file, so it is the number the page renders from.
 * docs/E2E-DECISIONS.md#helpersjs
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
 * How many saints at least one of `churches` venerates — the *union*. Russian
 * ∪ Romanian is not Russian + Romanian, so this cannot be added up from
 * `VENERATED` and has to be counted.
 */
export const venerateUnion = (...churches) =>
  String(CARDS.filter((s) => (s.attestations ?? []).some((a) => a.status === 'venerated' && churches.includes(a.church))).length);

/**
 * The slugs whose card carries a `track`. A press on one of these flies the map
 * out to frame the whole rail, so a test that needs a press to *keep* the
 * reader's zoom has to pick a saint who is not here.
 */
export const TRACKED = new Set(CARDS.filter((s) => (s.track ?? []).length > 1).map((s) => s.slug));

/**
 * A saint the corpus has no Russian name for — the case where the English one
 * has to stand under a Russian honorific rather than a blank or an invention.
 * Read from the manifest rather than named, so filling a name in does not turn
 * a test red. A company is skipped because its heading is a list, not a name.
 */
export const NO_RU_NAME = CARDS.find(
  (s) => !(s.names ?? {}).ru && !/\band\b|,|&|\d/.test(s.display_name ?? ''),
);

export // 30 January 2026: Anthony the Great in the Russian calendar — 17 January by
// the Julian reckoning, which the New Calendar churches keep on the civil 17th:
// one menologion date, two civil days, the most load-bearing date in the corpus.
const POPULATED = '/calendar/2026-01-30';

export /**
 * The suite's standing seed: All Saints in its search face, which is what most
 * specs were written about. Written **only when the test has not set one
 * itself**, so `carouselMode()` and any test that stamps `indexMode` directly
 * still gets the mode it asked for. The page's own default is a separate claim
 * with its own test, "All Saints opens on the carousel".
 * docs/E2E-DECISIONS.md#helpersjs
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
 * clock — trap 4. Any test that asserts the *Today* word navigates through this
 * rather than through a literal, which fails on exactly one day of the year.
 * Three days back is outside a timezone's worth of slop, and the calendar
 * renders any date. docs/E2E-DECISIONS.md#helpersjs
 */
const aDayThatIsNotToday = (page) =>
  page.evaluate(() => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return `/calendar/${iso}`;
  });

export const EMPTY = '/calendar/2026-08-20';

export // Anthony carries an image, all three churches' attestations, Greek and Coptic
// name forms, related saints and a life; Christopher is the awkward one —
// legendary, undated, no image, no coordinates. Between them the detail page's
// states are covered rather than sampled.
const DETAIL = '/saints/anthony-the-great';

export const SPARSE_DETAIL = '/saints/christopher';

export /*
 * The third entry of each row is anything the route needs before the floor can
 * see it. All Saints is listed twice on purpose: the suite's default puts it in
 * search mode, so without the second row the carousel — a full-bleed row of
 * pictures, exactly the shape that overflows — is never measured by the floor.
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
 * The width the day picker exists at. The rail, its drag and coast, the month
 * toggle and the grain fade are phone controls; a desktop has a static month
 * grid and no toggle, so a test *about the picker* has to say which width it
 * means. Not a workaround for a hidden element.
 * docs/E2E-DECISIONS.md#helpersjs
 */
export const phone = (page) => page.setViewportSize({ width: 360, height: 780 });

export /** Facet groups are disclosures; a reader opens one before using it. */
const facet = async (page, name) => {
  const group = page.locator(`[data-facet="${name}"]`);
  if (!(await group.evaluate((el) => el.open))) await group.locator('summary').click();
  return group;
};

export /**
 * A touch swipe, as the listener sees it. Synthetic pointer events: what is
 * under test is the threshold and the direction, not the browser's promise to
 * deliver pointerdown before pointerup.
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
 * A hold-and-slide, as the listener sees it: pointerdown, a handful of moves,
 * and a release. Synthetic, for the same reason as `swipe`. The settle
 * threshold is a third of a grain, not a pixel count.
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
 * A reader who has answered the first-visit question — church *and* language,
 * both, or the page still meets a gate. Written before load, because the
 * calendar decides whether to ask while it renders; seeded only where nothing
 * is stored, so a test that reloads to check something was remembered is not
 * overwritten on the way back in.
 *
 * **`reckoning` defaults to `'gregorian'` explicitly, not left unset**: the
 * suite's default church is Russian, whose own reckoning is Julian, and every
 * test written against the civil date would shift thirteen days. A test that
 * wants the true "nothing chosen" state asks for it: `{ reckoning: null }`.
 * docs/E2E-DECISIONS.md#helpersjs
 */
const ready = (page, { church = 'russian', language = 'en', reckoning = 'gregorian' } = {}) =>
  page.addInitScript(
    ({ church, language, reckoning }) => {
      const key = 'gos-settings';
      const now = JSON.parse(localStorage.getItem(key) ?? '{}');
      const next = { ...now };
      if (typeof next.church !== 'string') next.church = church;
      if (typeof next.language !== 'string') next.language = language;
      if (next.reckoning === undefined) next.reckoning = reckoning;
      localStorage.setItem(key, JSON.stringify(next));
    },
    { church, language, reckoning },
  );

export /**
 * Sort, through the `.facet` chip that replaced the old `<select>`. One place,
 * so the next change to that control is one edit and not thirty.
 * docs/E2E-DECISIONS.md#helpersjs
 */
const chooseSort = async (page, value) => {
  const chip = page.locator('details[data-facet="sort"] > summary');
  if (!(await page.locator('details[data-facet="sort"]').evaluate((d) => d.open))) await chip.click();
  await page.locator(`input[name="sort"][value="${value}"]`).check();
};

/**
 * A flick of the week rail, dispatched **inside the page** with its own timing.
 * The rail reads its release velocity from the samples of the last 120 ms and
 * coasts only past `MIN_FLICK`; driven through the harness's mouse each move is
 * a round trip, and under load the gesture stretches past that window and stops
 * being a flick at all. The moves are therefore spaced by a *spin* on
 * `performance.now()`, which blocks, rather than by `setTimeout`.
 *
 * The product path is untouched: pointerdown, four pointermoves, pointerup, and
 * the rail's own sampling decides. Returns the rail's position at release, plus
 * `delivered` — the caller asserts its own premise rather than inferring it.
 * docs/E2E-DECISIONS.md#helpersjs
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
       * **A spin bounds the gap from below, not from above**, so on a preempted
       * machine the gesture can still stretch past the rail's sample window and
       * stop being a flick. It is therefore *measured and re-thrown* until it
       * is one; a fresh `pointerdown` cancels any coast a slow attempt started.
       * Re-derive the throttled numbers: scripts/throttle-probe.mjs
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

/**
 * The Index narrowed to one calendar. **Narrowing is unticking**: every
 * calendar starts ticked, so ticking one is a no-op that hands back the whole
 * corpus. docs/E2E-DECISIONS.md#helpersjs
 */
export const onlyCalendar = async (page, name) => {
  const group = await facet(page, 'churches');
  // Attached, not visible: at 360 the filter panel can be folded away, and the
  // state below is set on the elements rather than through the pointer.
  await group.locator('input[name="churches"]').first().waitFor({ state: 'attached' });
  /*
   * Dispatched rather than clicked: the facet drops open on a transition, and a
   * click on a checkbox that is still moving is refused as "not stable". The
   * click path is asserted by the tests that are *about* these controls; here
   * the state is a fixture, and a fixture should not be a timing question.
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

/**
 * Waits for a chooser panel to finish flying out of its control — until then
 * "where it is" and "what colour its text is" are not meaningful questions.
 * The flight leaves inline `opacity` and `transform` on the inner box and
 * clears them at the end, so the *absence* of an inline transform is the signal.
 */
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
 * The leading names *as the reader sees them* — trap 1. The grid is virtualised
 * and absolutely positioned, so after a re-sort DOM order is not screen order
 * and `.first()` is the first card *mounted*. Order is read as geometry.
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

export /**
 * A colour token as the browser paints it, `rgb(r, g, b)`.
 *
 * **Not `getPropertyValue`** — trap 9, in both directions: an ordinary custom
 * property hands back the literal it was typed as, while a registered
 * `<color>` hands back the computed one, and a parser written for either is
 * silently wrong about the other. Painting it asks the question the reader's
 * eye asks and survives the next registration.
 * docs/E2E-DECISIONS.md#helpersjs
 */
const tokenColours = (page, ...names) =>
  page.evaluate((tokens) => {
    const probe = document.createElement('span');
    probe.style.position = 'fixed';
    probe.style.left = '-9999px';
    document.body.append(probe);
    const out = tokens.map((t) => {
      probe.style.color = `var(${t})`;
      return getComputedStyle(probe).color;
    });
    probe.remove();
    return out;
  }, names);
