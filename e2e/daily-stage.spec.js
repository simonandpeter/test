import { coldFace, test, expect } from './fixtures.js';
import { carouselMode, phone, ready, searchMode } from './helpers.js';

/**
 * The two faces of one page: Daily and All Saints in one clipped box, sliding
 * past each other rather than being torn down and rebuilt (rebuild plan §5,
 * §11.7; `src/ui/face-stage.js`).
 *
 * **Every test here is about something that does not happen.** The stage's
 * whole value is negative — All Saints is not re-rendered, not destroyed, not
 * hidden, not removed — and a negative is exactly what a suite silently stops
 * checking. Nothing in the page's markup says "this element survived"; a
 * rebuilt carousel and a parked one draw the same DOM. So the survival is
 * pinned by *stamping* the live element before the navigation and looking for
 * the stamp afterwards: a property set from the test is on the object, not in
 * the markup, and no re-render can reproduce it.
 *
 * The stage runs past 1024 px only, so these tests state their width the way
 * `helpers.js`'s `phone` argues for the picker's. Both projects then run both
 * widths, which is one more pass over the arrangement than either alone.
 */

const DESK = { width: 1280, height: 900 };
const DAY = '/calendar/2026-01-30';

/*
 * All Saints opens on the carousel, and every test here but the first is about
 * the arrangement rather than about that face. The suite states which one it
 * means rather than each test pressing the toggle (`searchMode` in
 * `helpers.js` argues it); the carousel test below re-states the opposite for
 * itself, and being registered second its init script is the one that lands.
 */
test.beforeEach(async ({ page }) => {
  await searchMode(page);
});

const stage = (page) => page.locator('.face-stage');

/** The face the stage is resting on, or `null` where there is no stage. */
const restingFace = (page) =>
  page.evaluate(() => document.querySelector('.face-stage')?.dataset.face ?? null);

/**
 * Mark the live All Saints, so that after a journey we can ask whether this is
 * the same object or a new one wearing the same markup. An expando on the
 * element itself: `dataset` would be visible to anything reading the DOM and
 * could in principle be reproduced by a render, a property cannot.
 *
 * **Not the layer.** The layer is the shell's own box and `main.js` never
 * rebuilds it — a stamp there survives a second `saints.render()` and would
 * report success on exactly the regression this file exists to catch. What is
 * stamped is what All Saints itself drew: `views/saints.js` renders by writing
 * `el.innerHTML`, so its own first child is a different object the moment the
 * view is asked to render again. The carousel's track is the second, narrower
 * witness — the one that also has to still be turning.
 */
const stampSaints = (page) =>
  page.evaluate(() => {
    const drawn = document.querySelector('.face-layer[data-layer="saints"]')?.firstElementChild;
    const track = document.querySelector('[data-carousel-track]');
    if (!drawn) return false;
    drawn.__stamp = 'the same page';
    if (track) track.__stamp = 'the same track';
    return true;
  });

const stamps = (page) =>
  page.evaluate(() => ({
    page: document.querySelector('.face-layer[data-layer="saints"]')?.firstElementChild?.__stamp ?? null,
    track: document.querySelector('[data-carousel-track]')?.__stamp ?? null,
  }));

const toDaily = (page) => page.locator('.site-nav a[data-nav-daily]').click();
const toSaints = (page) => page.locator('.site-nav a[href$="/saints"]').click();

/** `loopScroll` is not measurable until it says so (trap 8). */
const driftStarted = async (page) => {
  await expect
    .poll(() => page.evaluate(() => document.querySelector('[data-carousel-track]')?.scrollLeft ?? 0), {
      timeout: 6000,
    })
    .toBeGreaterThan(0);
  return page.evaluate(() => document.querySelector('[data-carousel-track]').scrollLeft);
};

test('the day slides in over All Saints, and the carousel parks below still drifting', async ({ page }) => {
  /*
   * Requirement 8, and the reason the whole arrangement exists. The old
   * behaviour was a cross-fade between two renders: stepping to the day
   * destroyed All Saints, and stepping back built it again from its snapshot,
   * with the carousel restarting from a standstill at whatever position the
   * snapshot had recorded.
   *
   * Two independent things are asserted, because either alone would pass on a
   * page that had quietly rebuilt (trap 14): the *same* track object is still
   * there — by a stamp a render cannot forge — and its `scrollLeft` has gone
   * on moving while it was out of sight.
   */
  await carouselMode(page);
  await ready(page);
  await page.setViewportSize(DESK);
  await page.goto('/saints', { waitUntil: 'networkidle' });
  await expect(page.locator('.cx-card').first()).toBeVisible();

  const parked = await driftStarted(page);
  expect(await stampSaints(page), 'the premise: All Saints is on a stage to begin with').toBe(true);

  await toDaily(page);
  await expect(page.locator('.face-stage[data-face="calendar"]')).toBeVisible();
  await expect(page.locator('.day-side')).toBeVisible();

  // Still in the document, still the same object, and still turning.
  await expect(page.locator('.face-layer[data-layer="saints"] [data-carousel-track]')).toHaveCount(1);
  expect(await stamps(page)).toEqual({ page: 'the same page', track: 'the same track' });
  await expect
    .poll(
      () =>
        page.evaluate(
          () => document.querySelector('.face-layer[data-layer="saints"] [data-carousel-track]').scrollLeft,
        ),
      { timeout: 6000 },
    )
    .toBeGreaterThan(parked);
});

test('coming back up, All Saints is the page that went down', async ({ page }) => {
  /*
   * The other half: the return. The scroll position is the visible claim and
   * the stamp is the one that cannot be faked — a rebuilt page restored from
   * its `remembered` snapshot would land at the same offset and carry no
   * stamp, which is exactly the false pass this is written against.
   */
  await ready(page);
  await page.setViewportSize(DESK);
  await page.goto('/saints', { waitUntil: 'networkidle' });
  await expect(page.locator('.index-card').first()).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, 1200));
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeGreaterThan(1000);
  const left = await page.evaluate(() => Math.round(window.scrollY));
  await stampSaints(page);

  await toDaily(page);
  await expect(page.locator('.face-stage[data-face="calendar"]')).toBeVisible();
  // The day owns the window while it is up: the page itself does not scroll.
  expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(0);
  expect(await page.evaluate(() => document.documentElement.dataset.fillsWindow)).toBe('');

  await toSaints(page);
  await expect(page.locator('.face-stage[data-face="saints"]')).toBeVisible();
  expect((await stamps(page)).page, 'the page that came back up is the one that went down').toBe(
    'the same page',
  );
  // The window's scroll is handed back on landing, not before, so the poll
  // waits for the slide rather than for a frame.
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 4000 }).toBeGreaterThan(
    left - 40,
  );
  expect(await page.evaluate(() => document.documentElement.dataset.fillsWindow)).toBe(undefined);
});

test('the Back button between the two faces takes the path a press takes', async ({ page }) => {
  /*
   * §11.7 c. `popstate` arrives at `show()` like every other navigation, and
   * the decision is taken in the one place they all pass through — so a Back
   * out of the day is a slide, not a cross-fade onto a rebuilt page. Stated
   * explicitly because it is the kind of thing that works by accident and
   * stops working by accident.
   */
  await ready(page);
  await page.setViewportSize(DESK);
  await page.goto('/saints', { waitUntil: 'networkidle' });
  await expect(page.locator('.index-card').first()).toBeVisible();
  await stampSaints(page);

  await toDaily(page);
  await expect(page.locator('.face-stage[data-face="calendar"]')).toBeVisible();

  await page.goBack();
  await expect(page.locator('.face-stage[data-face="saints"]')).toBeVisible();
  expect((await stamps(page)).page, 'Back parks the day rather than rebuilding All Saints').toBe(
    'the same page',
  );
});

test('entering the pair from a third route paints one layer, and the first swap fills the other', async ({
  page,
}) => {
  /*
   * §11.7 b. A deep link to a day — or arrival from a saint's page — mounts
   * the stage and paints the face that was asked for; the other layer is empty
   * until the first swap towards it, which therefore renders and *then*
   * slides. There is no retained state to lose, so nothing is being preserved;
   * what is being checked is that the empty layer is not slid into view empty.
   */
  await ready(page);
  await page.setViewportSize(DESK);
  await page.goto(DAY, { waitUntil: 'networkidle' });

  await expect(page.locator('.face-stage[data-face="calendar"]')).toBeVisible();
  await expect(page.locator('.day-side')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.querySelector('.face-layer[data-layer="saints"]').childElementCount,
    ),
    'the face nobody asked for is not painted on the way in',
  ).toBe(0);

  await toSaints(page);
  await expect(page.locator('.face-stage[data-face="saints"]')).toBeVisible();
  await expect(page.locator('.face-layer[data-layer="saints"] .index-card').first()).toBeVisible();
});

test('a cold load onto the day fills the window, and gives it back on the way out', async ({ page }) => {
  /*
   * §11.7 d. `data-fills-window` is what sizes `#view` to the window less the
   * chrome, and the stage's `height: 100%` resolves against it — so a reader
   * whose first paint is the day needs it set at mount, not at the first
   * swap. The plan set it on the way in and cleared it on the way out and said
   * nothing about arriving; this is the gap, pinned.
   */
  await ready(page);
  await page.setViewportSize(DESK);
  await page.goto(DAY, { waitUntil: 'networkidle' });
  expect(await page.evaluate(() => document.documentElement.dataset.fillsWindow)).toBe('');
  expect(
    await page.evaluate(() => Math.round(document.querySelector('.face-stage').getBoundingClientRect().height)),
    'a stage with no height is a day with nowhere to draw',
  ).toBeGreaterThan(300);

  await toSaints(page);
  await expect(page.locator('.face-stage[data-face="saints"]')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.fillsWindow ?? 'gone'), { timeout: 4000 })
    .toBe('gone');
});

test('leaving the pair for a third route takes the stage down', async ({ page }) => {
  /*
   * The parked face has to be told it is leaving while its markup is still in
   * the document for it to read — All Saints takes its `remembered` snapshot
   * in `destroy()`. After this the site is back to one view in `#view` and
   * nothing on About knows the stage ever existed.
   */
  await ready(page);
  await page.setViewportSize(DESK);
  await page.goto('/saints', { waitUntil: 'networkidle' });
  await expect(page.locator('.index-card').first()).toBeVisible();
  await toDaily(page);
  await expect(page.locator('.face-stage[data-face="calendar"]')).toBeVisible();

  await page.locator('.site-nav a[href$="/about"]').click();
  await expect(page.locator('#view h1')).toBeVisible();
  await expect(stage(page)).toHaveCount(0);
  expect(await restingFace(page)).toBe(null);
  expect(await page.evaluate(() => document.documentElement.dataset.fillsWindow)).toBe(undefined);
});

test('below 1024 px there is no stage at all', async ({ page }) => {
  /*
   * Plan §7. The pair navigates by the shell's own cross-fade on a phone, and
   * the sidebar stops standing — there is no clipped box, no parked layer and
   * no second live view holding a rAF loop on a device that can least afford
   * one.
   */
  await ready(page);
  await phone(page);
  await page.goto('/saints', { waitUntil: 'networkidle' });
  await expect(page.locator('.index-card').first()).toBeVisible();
  await toDaily(page);
  await expect(page.locator('.day-side')).toBeVisible();

  await expect(stage(page)).toHaveCount(0);
  await expect(page.locator('.face-layer')).toHaveCount(0);
  expect(
    await page.evaluate(() => !!document.querySelector('#view > .today, #view .day-side')),
    'the day is mounted in #view itself, as it was before any of this',
  ).toBe(true);
});

test('reduced motion removes the slide and keeps the memory', async ({ browser }) => {
  /*
   * Removed, not shortened (PLAN). The pair still holds its state across the
   * step — that is memory, not motion, and a reader who asked for less
   * movement did not ask for a carousel that restarts. What goes is the 620 ms
   * itself: the face flips in the same task the press arrives in, so the next
   * read already shows the day.
   */
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: DESK });
  const page = await context.newPage();
  await coldFace(page);
  await searchMode(page);
  await ready(page);
  await page.goto('/saints', { waitUntil: 'networkidle' });
  await expect(page.locator('.index-card').first()).toBeVisible();
  await stampSaints(page);

  await toDaily(page);
  // No frame of grace: the attribute that drives the slide is already gone by
  // the time the press has been handled.
  expect(await restingFace(page)).toBe('calendar');
  expect(await page.evaluate(() => document.querySelector('.face-stage').hasAttribute('data-swapping'))).toBe(
    false,
  );

  await toSaints(page);
  expect(await restingFace(page)).toBe('saints');
  expect((await stamps(page)).page, 'less motion, not less memory').toBe('the same page');
  await context.close();
});

/* ---- the flight itself, sampled frame by frame ---------------------------
 *
 * Everything above asks what the page *is* after a navigation. The four tests
 * below ask what it *does* during one, because the sequence is only true to the
 * frame: a slide that started before the incoming face was rendered, or a
 * scroll handed back before the layer was in flow again, is a jump the reader
 * sees and a green test either way when the reading is taken afterwards.
 *
 * The instrument is a `requestAnimationFrame` sampler started *before* the
 * press and read back after it — both layers' positions on every frame, in the
 * page's own clock. Polling from the harness cannot do this: each round trip
 * costs milliseconds of its own, so the samples would be a fact about the
 * driver rather than about the stage.
 */

/** Every frame of the next `ms`, as the page sees them. */
const filming = (page, ms) =>
  page.evaluate(
    (ms) =>
      new Promise((resolve) => {
        const frames = [];
        const until = performance.now() + ms;
        const tick = (t) => {
          const box = (sel) => {
            const el = document.querySelector(sel);
            return el ? Math.round(el.getBoundingClientRect().top) : null;
          };
          frames.push({
            t: Math.round(t),
            saints: box('.face-layer[data-layer="saints"]'),
            calendar: box('.face-layer[data-layer="calendar"]'),
            scrollY: Math.round(window.scrollY),
            face: document.querySelector('.face-stage')?.dataset.face ?? null,
            swapping: document.querySelector('.face-stage')?.hasAttribute('data-swapping') ?? null,
          });
          if (t < until) requestAnimationFrame(tick);
          else resolve(frames);
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );

/** How many distinct positions a layer was actually drawn at. */
const stops = (frames, layer) => new Set(frames.map((f) => f[layer]).filter((y) => y !== null)).size;

/** How long it spent between leaving its first position and reaching its last;
 *  null where it never moved. */
const travelMs = (frames, layer) => {
  const ys = frames.map((f) => f[layer]);
  const start = ys[0];
  const end = ys[ys.length - 1];
  const first = frames.find((f) => Math.abs(f[layer] - start) > 2);
  const last = [...frames].reverse().find((f) => Math.abs(f[layer] - end) > 2);
  return first && last ? last.t - first.t : null;
};

/**
 * `--dur-swap` in milliseconds, as the page computes it — never as this file
 * remembers it. The token is authored in seconds and `ui/face-stage.js` reads
 * it the same way; a test carrying a 620 of its own would go on passing after
 * the token changed and the flight did not, which is the one thing it must not
 * do.
 */
const swapMs = (page) =>
  page.evaluate(() => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--dur-swap').trim();
    const n = Number.parseFloat(raw);
    return raw.endsWith('ms') ? n : n * 1000;
  });

/**
 * Counts the shell's own cross-fades at the source. A view transition covers
 * the document with a snapshot for its duration (trap 14), so whether one was
 * started is not a question the frames can answer — and it is the difference
 * between a slide the reader sees and a slide nobody sees.
 */
const countFades = (page) =>
  page.addInitScript(() => {
    window.__fades = 0;
    const real = document.startViewTransition;
    if (real) {
      document.startViewTransition = function (...args) {
        window.__fades += 1;
        return real.apply(this, args);
      };
    }
  });

/** A query broad enough to leave the row longer than the window. */
const BROAD = 'martyr';

/** Waits until the row is wider than its own viewport, so that it *can* drift.
 *  All Saints packs every caption in one blocking task before it can paint a
 *  column (PLAN.md item 7), and under parallel load that task can eat a whole
 *  budget — `index-carousel.spec.js` separates the two for the same reason. */
const rowReady = (page) =>
  expect
    .poll(
      () =>
        page.evaluate(() => {
          const t = document.querySelector('[data-carousel-track]');
          return t ? t.scrollWidth - t.clientWidth : 0;
        }),
      { timeout: 20000, message: 'the row never became wider than its own viewport' },
    )
    .toBeGreaterThan(0);

test('the pair slides, and --dur-swap is what times it', async ({ page }) => {
  /*
   * Four readings, each catching a different way of being wrong:
   *
   *  - the layers are drawn at many positions rather than two, so this is a
   *    slide and not a swap with a transition declared over it;
   *  - both travel, downward, together — a stage that animated only the
   *    incoming face would read as the day landing on top of All Saints rather
   *    than as the pair moving;
   *  - they never touch, which is what the 32 px between the faces is for, and
   *    it is measured on every frame rather than at the ends: two faces that
   *    crossed through each other would still arrive correctly;
   *  - and the flight lasts about as long as the token says. The layer's own
   *    declared `transition-duration` is asserted against the same runtime
   *    reading, because a flight that happened to last 600 ms with a 300 ms
   *    transition and a slow machine underneath would satisfy the measurement
   *    on its own.
   */
  await ready(page);
  await page.setViewportSize(DESK);
  await page.goto('/saints', { waitUntil: 'networkidle' });
  await expect(stage(page)).toHaveCount(1);

  const dur = await swapMs(page);
  expect(dur, 'the page has no --dur-swap to time anything by').toBeGreaterThan(0);
  const declared = await page.evaluate(() => {
    const s = getComputedStyle(document.querySelector('.face-layer[data-layer="calendar"]'));
    return { duration: s.transitionDuration, property: s.transitionProperty };
  });
  expect(declared.property, 'the layers are not transitioning their transform').toContain('transform');
  expect(
    Math.round(Number.parseFloat(declared.duration) * 1000),
    `the layer's own transition is ${declared.duration} against a --dur-swap of ${dur}ms`,
  ).toBe(Math.round(dur));

  const film = filming(page, dur * 3);
  await toDaily(page);
  const frames = await film;

  expect(stops(frames, 'calendar'), 'the day arrived without travelling').toBeGreaterThan(8);
  expect(stops(frames, 'saints'), 'All Saints was replaced rather than pushed').toBeGreaterThan(8);
  /*
   * Down the glass, both of them, and the day comes to rest at the top of the
   * box. Where each *starts* is a fact about how tall All Saints happens to be
   * — the parked face is a whole page above or below — so the direction is the
   * claim and the landing is read off the stage itself rather than off a
   * number.
   */
  const stageTop = await page.evaluate(() =>
    Math.round(document.querySelector('.face-stage').getBoundingClientRect().top),
  );
  expect(frames[frames.length - 1].calendar).toBeGreaterThan(frames[0].calendar);
  expect(frames[frames.length - 1].saints).toBeGreaterThan(frames[0].saints);
  expect(frames[frames.length - 1].calendar, 'the day did not land on the stage').toBe(stageTop);
  const gaps = frames
    .filter((f) => f.saints !== null && f.calendar !== null)
    .map((f) => Math.abs(f.saints - f.calendar));
  expect(Math.min(...gaps), 'the two faces touched mid-flight').toBeGreaterThan(0);

  const flight = travelMs(frames, 'calendar');
  expect(flight, 'nothing moved at all').not.toBeNull();
  /*
   * A generous band, on purpose. The floor says the slide is not a jump dressed
   * as one; the ceiling says it is not a second-long crawl; and the width
   * between them is the machine's, since the last frame of a transition is
   * quantised to whenever the browser next painted — this desk measures 600 ms
   * of a 620 ms flight for that reason alone.
   */
  expect(flight, `the slide took ${flight}ms against a --dur-swap of ${dur}ms`).toBeGreaterThan(dur * 0.5);
  expect(flight, `the slide took ${flight}ms against a --dur-swap of ${dur}ms`).toBeLessThan(dur * 2);
});

test('the reader’s own work is still there on the way back', async ({ page }) => {
  /*
   * The stamp above proves the *elements* survived; this proves the state the
   * reader can see did. Three readings, and each is something a rebuilt page
   * restoring itself from a snapshot could get wrong on its own: the query is
   * still in the box, the row and the grid hold the same cards they held, and
   * the row is still where it had drifted to rather than back at its own
   * beginning.
   */
  await carouselMode(page);
  await ready(page);
  await page.setViewportSize(DESK);
  await page.goto('/saints', { waitUntil: 'networkidle' });
  /*
   * **The row is counted after the query has actually narrowed it.** `fill`
   * returns before the search has run, and the whole corpus is in the row until
   * it does — so a count taken straight afterwards is the unfiltered one, and
   * the same count taken after the round trip is the filtered one. That is a
   * test reporting a defect in the stage for a race of its own making.
   */
  const whole = await page.evaluate(() => document.querySelectorAll('.cx-card').length);
  await page.locator('[data-query]').fill(BROAD);
  await expect
    .poll(() => page.evaluate(() => document.querySelectorAll('.cx-card').length), {
      timeout: 10000,
      message: 'the query never narrowed the row',
    })
    .toBeLessThan(whole);
  await rowReady(page);
  await page.waitForTimeout(500);

  const before = await page.evaluate(() => ({
    scrollLeft: document.querySelector('[data-carousel-track]').scrollLeft,
    cx: document.querySelectorAll('.cx-card').length,
    cards: document.querySelectorAll('.index-card').length,
    query: document.querySelector('[data-query]').value,
  }));
  expect(before.cx, 'premise: the row is empty, so there is nothing to keep').toBeGreaterThan(20);

  await toDaily(page);
  await expect(page.locator('.face-stage[data-face="calendar"]')).toBeVisible();
  // A moment on the day, which is what the reader came for and what gives the
  // parked row something to have done while it was underneath.
  await expect(page.locator('.day-grid .day-tile').first()).toBeVisible();
  await page.waitForTimeout(600);

  await toSaints(page);
  await expect(page.locator('.face-stage[data-face="saints"]')).toBeVisible();
  const after = await page.evaluate(() => ({
    scrollLeft: document.querySelector('[data-carousel-track]').scrollLeft,
    cx: document.querySelectorAll('.cx-card').length,
    cards: document.querySelectorAll('.index-card').length,
    query: document.querySelector('[data-query]').value,
  }));

  expect(after.query, 'the reader’s query did not survive the round trip').toBe(before.query);
  expect(after.cx, 'the row came back with a different set of cards').toBe(before.cx);
  expect(after.cards, 'the grid came back with a different set of cards').toBe(before.cards);
  // Where it had drifted to, not where it starts: a rebuilt row opens at 0.
  expect(after.scrollLeft, 'the row came back at its own beginning').toBeGreaterThan(0);
});

test('the page comes back to the line it was left on, without a jump', async ({ page }) => {
  /*
   * The vertical half (plan §5, step 7a). The day owns the window while it is
   * up, so the position All Saints was left at has to be handed back in the
   * same block its layer returns to flow and not before: any earlier and the
   * restore clamps against a document that is not tall enough yet, and the
   * reader lands at the top.
   *
   * **A card's own place on the glass, not `window.scrollY` alone.** The grid
   * is virtualised and absolutely positioned, so a restored offset and a
   * repainted window are two claims, and the number by itself would pass a page
   * that came back to the right offset with the wrong cards in it. The frames
   * after the landing are read as well, because a restore that touched 0 on the
   * way and corrected itself a frame later is precisely the two-step this
   * sequence replaced — and it is over before any reading taken afterwards
   * could see it.
   */
  await ready(page);
  await page.setViewportSize(DESK);
  await page.goto('/saints', { waitUntil: 'networkidle' });
  await expect(page.locator('.index-card').first()).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, 2400));
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(2400);
  const pinned = await page.evaluate(() => {
    /*
     * A card the reader can actually see, so its place on the glass is a place
     * rather than an arithmetic about the page above it.
     *
     * **With a fallback, because the grid is virtualised** (trap 1): the window
     * of mounted cards is repainted from the scroll event, and a read taken
     * inside that repaint can find nothing wholly on screen. Asking for the
     * topmost card *below* the fold's edge is the same claim with one fewer
     * condition; asking for any card at all is the last resort, and by then
     * something else in this file has already failed.
     */
    const boxed = [...document.querySelectorAll('.index-card')]
      .map((c) => ({ c, box: c.getBoundingClientRect() }))
      .sort((a, b) => a.box.top - b.box.top);
    const card =
      boxed.find((x) => x.box.top > 0 && x.box.bottom < window.innerHeight) ??
      boxed.find((x) => x.box.top > 0) ??
      boxed[0];
    return { name: card.c.querySelector('.index-name').textContent.trim(), top: Math.round(card.box.top) };
  });

  await toDaily(page);
  await expect(page.locator('.face-stage[data-face="calendar"]')).toBeVisible();
  await expect(page.locator('.day-grid .day-tile').first()).toBeVisible();

  const dur = await swapMs(page);
  const film = filming(page, dur * 3);
  await toSaints(page);
  const frames = await film;

  expect(
    await page.evaluate(() => Math.round(window.scrollY)),
    'the page did not come back to where it was left',
  ).toBe(2400);
  /*
   * Polled, not read once: the grid repaints its window from the scroll event
   * the landing dispatches, so the card can be a frame late back into the
   * document — and `find` on a card that has not been mounted yet is a `null`
   * that says nothing about where the page is (trap 1, from its other side).
   */
  await expect
    .poll(
      () =>
        page.evaluate((name) => {
          const card = [...document.querySelectorAll('.index-card')].find(
            (c) => c.querySelector('.index-name')?.textContent.trim() === name,
          );
          return card ? Math.round(card.getBoundingClientRect().top) : null;
        }, pinned.name),
      { timeout: 4000, message: `${pinned.name} never came back to the grid` },
    )
    .toBeCloseTo(pinned.top, -1);

  /*
   * **And the frames say it was never at the top.** The whole flight is spent
   * at 0 legitimately — the day has the window, and the incoming layer carries
   * the reader's position as an offset of its own — so a scroll of 0 is only
   * wrong once the box has stopped swapping and the layer is back in flow.
   * There must be no such frame: the root gives the scroll back, the layer
   * returns to flow and the position is written in one block, with no paint
   * between them.
   *
   * **Backed out and watched fail**, which is how this assertion found its own
   * shape: an earlier version looked for a 0 *after* the first scrolled frame
   * and could not see the defect at all, because the two-step it was written
   * against goes 0 → 0 → 2400 and the extra zero is before the first non-zero
   * rather than after it. A patched build that reset to 0 and corrected on the
   * next frame passed that version and fails this one.
   */
  const landedFlat = frames.filter((f) => f.face === 'saints' && f.swapping === false && f.scrollY === 0);
  expect(
    landedFlat.length,
    'the page was drawn at the top of All Saints after the slide had landed',
  ).toBe(0);
  expect(
    frames.filter((f) => f.scrollY > 0).length,
    'the page never came back to a scrolled position',
  ).toBeGreaterThan(0);
});

test('Back slides and is not faded over, and a phone fades instead', async ({ page }) => {
  /*
   * §11.7 c, measured rather than inferred. The test above proves Back parked
   * the day rather than rebuilding All Saints; this proves it took the *same
   * road* a press takes — it slid, over the token's own span, with no view
   * transition started across it. That last half is not decoration: a
   * cross-fade covers the document with a snapshot for its duration, so one
   * started here would hide the very movement the first half asserts and the
   * frames would not know the difference (trap 14).
   *
   * And the mirror below 1024 px, where there is no stage to slide: the same
   * Back must use the shell's own cross-fade. It is asserted on **Back** at
   * both widths on purpose — a press on the phone's nav strip glides the strip
   * and deliberately skips the fade (`main.js`'s `skipFade`), so a press is the
   * one navigation that would prove nothing either way.
   */
  await ready(page);
  await countFades(page);
  await page.setViewportSize(DESK);
  await page.goto('/saints', { waitUntil: 'networkidle' });
  await toDaily(page);
  await expect(page.locator('.face-stage[data-face="calendar"]')).toBeVisible();
  await expect(page.locator('.day-grid .day-tile').first()).toBeVisible();

  const dur = await swapMs(page);
  const fadesBefore = await page.evaluate(() => window.__fades);
  /*
   * **The first swap has to have landed before the second is asked for.** The
   * day's first tile becomes visible while the slide toward it is still
   * running, so a Back pressed on that signal alone lands the flight in
   * progress early (`settle` in `ui/face-stage.js`) and the transition this
   * test is about begins from a cut-short one — which reported a 32 ms slide
   * and read as a defect. The box says when it is at rest.
   */
  await expect
    .poll(() => page.evaluate(() => document.querySelector('.face-stage').hasAttribute('data-swapping')), {
      timeout: 4000,
    })
    .toBe(false);
  /*
   * **The transition's own `elapsedTime`, not a film, for this one.** A
   * transform transition runs on the compositor, so it goes on animating
   * through a busy main thread while `requestAnimationFrame` is starved — and
   * the day's first paint is exactly such a moment. A sampler whose first frame
   * lands mid-flight sees two positions and calls a slide a jump, which is a
   * test reporting the machine's load as a defect (it did, under six workers,
   * before this was changed). `transitionend` carries how long the transition
   * actually ran, measured by the engine, and is immune to that: it is the
   * strongest available statement that the pair travelled over `--dur-swap`
   * rather than being swapped.
   */
  const slid = page.evaluate(
    (ms) =>
      new Promise((resolve) => {
        const layer = document.querySelector('.face-layer[data-layer="saints"]');
        const done = (e) => {
          // The layer's own transition, not one bubbling up from a card inside
          // it — `transitionend` bubbles, and the page under this is full of
          // elements with transforms of their own. `ui/face-stage.js` guards
          // its own listener the same way.
          if (e.target !== layer || e.propertyName !== 'transform') return;
          layer.removeEventListener('transitionend', done);
          resolve(Math.round(e.elapsedTime * 1000));
        };
        layer.addEventListener('transitionend', done);
        setTimeout(() => resolve(null), ms * 4);
      }),
    dur,
  );
  await page.goBack();
  const elapsed = await slid;

  expect(elapsed, 'Back changed the face without a transition on the pair').not.toBeNull();
  expect(elapsed, `Back slid for ${elapsed}ms against a --dur-swap of ${dur}ms`).toBeCloseTo(dur, -2);
  await expect(page.locator('.face-stage[data-face="saints"]')).toBeVisible();
  await expect(page).toHaveURL(/\/saints$/);
  expect(await page.evaluate(() => window.__fades), 'a view transition was started over the slide').toBe(
    fadesBefore,
  );

  // The phone, where the pair is two pages and the fade is how they change.
  await phone(page);
  await page.goto('/saints', { waitUntil: 'networkidle' });
  await expect(page.locator('.index-card').first()).toBeVisible();
  await toDaily(page);
  await expect(page.locator('.day-side')).toBeVisible();
  await expect(stage(page)).toHaveCount(0);
  const narrowBefore = await page.evaluate(() => window.__fades);
  await page.goBack();
  await expect(page.locator('.index-card').first()).toBeVisible();
  expect(
    await page.evaluate(() => window.__fades),
    'the narrow pair did not use the shell’s own cross-fade',
  ).toBeGreaterThan(narrowBefore);
});
