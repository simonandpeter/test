import { test, expect } from './fixtures.js';
import { ready } from './helpers.js';

/**
 * The map (Session 7, 2026-08-29). One file per surface, as the rest of the
 * suite is.
 *
 * **What this surface is has to be said before the tests make sense.** The
 * brief's §8.3 describes a `d3-geo` orthographic globe with a density-paced
 * timeline brush; the author asked for "a simple mercator projection 2d map
 * for now, something very light", and the brush stays deferred — 60 of 851
 * saints located is still not enough to verify a pacing algorithm against.
 * Collide-detected labels and per-dot decluttering shipped despite that
 * (2026-08-30 and 2026-08-31): a label overlap and two saints sharing an
 * exact coordinate are both things the corpus can already demonstrate, which
 * is the density brush's own bar and is not the same bar as "seven points".
 * So there are tests below for both, and none for the brush: there is
 * nothing yet to test there, and a green test over absent machinery is worse
 * than no test.
 *
 * What there is: the projection is pinned in `tests/mercator.test.mjs`, which is
 * arithmetic and needs no browser. These are the things only a browser can
 * answer — that the picture is drawn, that the counts agree with the drawing,
 * and that the reader can work the page by wheel, touch and keyboard alike.
 *
 * The page was stage-plus-reading until 2026-08-30, when the author asked for
 * the map alone with a small footer; the tests for the list, the tray and the
 * Index's facets went with the surfaces they tested.
 */

const MAP = '/map';

test.beforeEach(async ({ page }) => {
  await ready(page);
});

test('the map draws its coastline, and says so when it has', async ({ page }) => {
  await page.goto(MAP, { waitUntil: 'networkidle' });

  const canvas = page.locator('[data-map]');
  await expect(canvas).toBeVisible();

  /*
   * `data-land` is written only after the coastline chunk resolves and the
   * paint that uses it has run, so it is the page's own report that the fetch
   * landed — and the readiness signal every drawing assertion in this file
   * waits on, because a canvas that drew nothing and a canvas that drew the
   * sea are the same screenshot. The credit itself is static in the footer:
   * it is a fact about the data, not about this visit's network.
   */
  await expect(canvas).toHaveAttribute('data-land', 'ok');
  await expect(page.locator('[data-caption]')).toContainText('Natural Earth');

  // And it really put ink on the canvas: a blank one is every pixel identical.
  const drew = await canvas.evaluate((el) => {
    const ctx = el.getContext('2d');
    const { data } = ctx.getImageData(0, 0, el.width, el.height);
    const first = [data[0], data[1], data[2], data[3]].join();
    for (let i = 4; i < data.length; i += 4) {
      if ([data[i], data[i + 1], data[i + 2], data[i + 3]].join() !== first) return true;
    }
    return false;
  });
  expect(drew, 'the canvas is one flat colour — nothing was drawn on it').toBe(true);
});

test('the count on a kind button is the count the picture draws', async ({ page }) => {
  /*
   * The list under the picture is gone (author, 2026-08-30: "remove everything
   * on the map page outside of the map itself"), so the kind counts in the
   * legend are the one place the page still states what it is showing — and
   * `data-dots`, written by the draw pass itself, is what they must agree
   * with. At scale 1 the whole world is inside the box, so nothing is culled
   * and the drawn dots *are* the kind's points; a count that drifted from the
   * picture would be the page lying about its own drawing.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  const pressed = page.locator('.map-kind[aria-pressed="true"]');
  await expect(pressed).toHaveCount(1);
  const claimed = Number(await pressed.locator('.map-kind-count').textContent());
  expect(claimed).toBeGreaterThan(0);
  const drawn = JSON.parse(await canvas.getAttribute('data-dots'));
  expect(drawn.length).toBe(claimed);
});

test('the four kinds are four different questions, and the map answers one at a time', async ({ page }) => {
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  // Death is the default (§8.3), and exactly one kind is ever current.
  await expect(page.locator('.map-kind[aria-pressed="true"]')).toHaveText(/Died/);

  const born = page.locator('.map-kind[data-kind="birth"]');
  const claimed = Number(await born.locator('.map-kind-count').textContent());
  await born.click();

  await expect(born).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.map-kind[aria-pressed="true"]')).toHaveCount(1);
  // The picture followed the button rather than the button merely lighting up.
  await expect
    .poll(async () => JSON.parse(await canvas.getAttribute('data-dots')).length)
    .toBe(claimed);
});

test('the current kind is not told by colour alone', async ({ page }) => {
  await page.goto(MAP, { waitUntil: 'networkidle' });
  /*
   * Brief §13: all colour information duplicated in text or shape. The pressed
   * kind is the reader's place on this page, which is exactly what the nav's
   * current item is, and it carries weight and a field as well as
   * `aria-pressed` — the same three channels, for the same reason.
   */
  const marks = await page.locator('.map-kind').evaluateAll((els) =>
    els.map((el) => {
      const s = getComputedStyle(el);
      return { pressed: el.getAttribute('aria-pressed'), weight: s.fontWeight, field: s.backgroundColor };
    }),
  );
  const on = marks.find((m) => m.pressed === 'true');
  const off = marks.find((m) => m.pressed === 'false');
  expect(Number(on.weight)).toBeGreaterThanOrEqual(700);
  expect(Number(on.weight)).toBeGreaterThan(Number(off.weight));
  expect(on.field, 'the pressed kind has no field behind it').not.toBe(off.field);
});

test('the page is the map, a small footer, and nothing else read', async ({ page }) => {
  /*
   * Author, 2026-08-30: "remove everything on the map page outside of the map
   * itself except for leaving a small footer with the coastline map credit and
   * scroll to zoom hint." That reverses Amendment 76's below-map reading — the
   * lede, the Index's facets, the Places register and the unlocated tray all
   * go — so this is the assertion that they stay gone, and that what the
   * instruction kept is actually there: the credit and the hint, in a footer.
   *
   * The timeline (same evening, later instruction) is not a return of the
   * reading: it is drawn *on the stage*, over the picture the same way the
   * zoom controls are, not printed prose below it — so its presence here does
   * not contradict "nothing else", and the test now checks for it rather than
   * against it.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });

  for (const gone of ['.map-below', '.map-places', '.map-unlocated', '[data-map-facets]', '[data-map-lede]']) {
    await expect(page.locator(gone)).toHaveCount(0);
  }

  await expect(page.locator('.map-timeline')).toBeVisible();

  const foot = page.locator('.map-foot');
  await expect(foot).toBeVisible();
  await expect(foot).toContainText('Natural Earth');
  await expect(foot).toContainText(/[Ss]croll/);
});

test('the map is the window, and holds that size before the coastline arrives', async ({ page }) => {
  /*
   * **The map is the whole window under the header** (author, 2026-08-29: "make
   * sure on mobile and desktop the map is the whole window, under the header,
   * not just a predefined window"), which is two claims worth pinning: it fills
   * the viewport's width and the space under the sticky bar, and it is that
   * size before the coastline lands as well as after — brief §13's
   * no-layout-shift, on the one view whose picture is fetched.
   *
   * `domcontentloaded`, not `networkidle`: the point is to be looking before
   * the coastline has had a chance to arrive.
   */
  await page.goto(MAP, { waitUntil: 'domcontentloaded' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toBeVisible();
  const before = await canvas.boundingBox();

  await expect(canvas).toHaveAttribute('data-land', 'ok');
  const after = await canvas.boundingBox();

  expect(after.height).toBeCloseTo(before.height, 0);
  expect(after.width).toBeCloseTo(before.width, 0);

  /*
   * The whole window, measured rather than assumed: the full viewport width,
   * and the height left under the bar, above the footer, and above the
   * timeline — three strips outside the picture now, each measured rather
   * than guessed, the same "no number here has to agree with any number
   * there" rule the footer's own CSS already keeps. `--chrome-h-reserve` is
   * where the bar's number comes from, so this is also what catches the two
   * drifting apart — a header that grew without the token growing would leave
   * the map hanging off the bottom of the screen with nothing else to say so.
   */
  const room = await page.evaluate(() => ({
    vw: document.documentElement.clientWidth,
    vh: window.innerHeight,
    bar: document.querySelector('.chrome-bar').getBoundingClientRect().height,
    foot: document.querySelector('.map-foot').getBoundingClientRect().height,
    timeline: document.querySelector('.map-timeline')?.getBoundingClientRect().height ?? 0,
  }));
  expect(after.width).toBeCloseTo(room.vw, 0);
  expect(after.height).toBeCloseTo(room.vh - room.bar - room.foot - room.timeline, 0);

  // And the window is all there is: nothing on this page can scroll away.
  const scroll = await page.evaluate(() => ({
    room: document.documentElement.scrollHeight - document.documentElement.clientHeight,
  }));
  expect(scroll.room, 'the map page has vertical scroll room').toBeLessThanOrEqual(0);
});

/* ---- zoom and pan (2026-08-29) ----------------------------------------- */

const zoomLevel = (page) => page.locator('[data-zoom-level]').textContent();

/**
 * A cheap fingerprint of what the canvas is actually showing.
 *
 * Asserting "the map moved" needs the *drawing* to change, not the state the
 * page reports about itself — a handler that updates a number and forgets to
 * repaint would satisfy every other assertion here. Sampling a grid rather than
 * hashing every pixel keeps it quick and is still far more than enough to tell
 * one framing from another.
 */
const mapInk = (page) =>
  page.locator('[data-map]').evaluate((el) => {
    const { data } = el.getContext('2d').getImageData(0, 0, el.width, el.height);
    let out = '';
    for (let i = 0; i < 400; i++) {
      const px = Math.floor((i / 400) * (data.length / 4)) * 4;
      out += `${data[px]},${data[px + 1]},${data[px + 2]};`;
    }
    return out;
  });

test('the whole world is the way out, and the map says so before you move', async ({ page }) => {
  await page.goto(MAP, { waitUntil: 'networkidle' });

  await expect(page.locator('[data-zoom-level]')).toHaveText('1.0×');
  /*
   * At rest the box *is* the world, so there is nowhere further out and nowhere
   * to pan to. The controls say that rather than accepting presses that do
   * nothing — a button that looks live and is inert teaches the reader the map
   * is broken.
   */
  await expect(page.locator('[data-zoom="out"]')).toBeDisabled();
  await expect(page.locator('[data-zoom="home"]')).toBeDisabled();
  await expect(page.locator('[data-zoom="in"]')).toBeEnabled();
});

test('the buttons zoom, and Reset comes home', async ({ page }) => {
  await page.goto(MAP, { waitUntil: 'networkidle' });

  await page.locator('[data-zoom="in"]').click();
  await page.locator('[data-zoom="in"]').click();
  expect(await zoomLevel(page)).not.toBe('1.0×');
  await expect(page.locator('[data-zoom="out"]')).toBeEnabled();

  // And the picture actually changed, rather than only the number.
  const zoomed = await mapInk(page);

  await page.locator('[data-zoom="home"]').click();
  await expect(page.locator('[data-zoom-level]')).toHaveText('1.0×');
  const home = await mapInk(page);
  expect(zoomed, 'the canvas drew the same thing zoomed in as zoomed out').not.toBe(home);
});

test('a bare wheel zooms the map, in and out, no modifier held', async ({ page }) => {
  /*
   * The reversal of this file's oldest rule, by the author (2026-08-30:
   * "have the mouse scroll zoom in or out smoothly without having to hold
   * Ctrl at all"). The old rule — bare wheel scrolls, only Ctrl zooms —
   * existed so a reader scrolling *past* the map could not be trapped by it;
   * with everything below the map removed there is no page to scroll past,
   * so the wheel has exactly one honest meaning left and it takes it.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');
  const box = await canvas.boundingBox();
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

  await page.mouse.move(centre.x, centre.y);
  await page.mouse.wheel(0, -400);
  expect(await zoomLevel(page), 'a bare wheel did not zoom the map').not.toBe('1.0×');

  // And back out: a long spin down runs into the floor and stops at the world.
  await page.mouse.wheel(0, 1200);
  await expect(page.locator('[data-zoom-level]')).toHaveText('1.0×');
});

test('touch belongs to the map, because there is no page left to scroll', async ({ page }) => {
  /*
   * While the map sat in a scrolling article, `touch-action: pan-y` kept a
   * thumb-swipe the page's until the reader had zoomed in on purpose. The
   * page below is gone (author, 2026-08-30), so the gesture has nothing to be
   * reserved for — the map takes touch always, and the header above it is
   * still the way out.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveCSS('touch-action', 'none');

  // Zooming in and coming home never hands the gesture anywhere else.
  await page.locator('[data-zoom="in"]').click();
  await expect(canvas).toHaveCSS('touch-action', 'none');
  await page.locator('[data-zoom="home"]').click();
  await expect(canvas).toHaveCSS('touch-action', 'none');
});

test('the keyboard works the map, not only the pointer', async ({ page }) => {
  /*
   * §13 wants every interactive element reachable, and a canvas that answers
   * only to a dragged pointer is not. The panning assertion is on the drawn
   * pixels rather than on any state the page reports, because "the arrow key
   * was handled" and "the map moved" are different claims.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');

  await canvas.focus();
  await expect(canvas).toBeFocused();

  await page.keyboard.press('+');
  await page.keyboard.press('+');
  expect(await zoomLevel(page)).not.toBe('1.0×');

  const before = await mapInk(page);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  expect(await mapInk(page), 'the arrow keys did not move the map').not.toBe(before);

  await page.keyboard.press('Home');
  await expect(page.locator('[data-zoom-level]')).toHaveText('1.0×');
});

test('zooming does not move the page under the reader', async ({ page }) => {
  /*
   * Zooming redraws inside a box that does not change — brief §13's
   * no-layout-shift, which a control that resized its own picture would break
   * on every press.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  const before = await canvas.boundingBox();

  /*
   * The gap between the picture and the footer, not either one's position on
   * screen. `locator.click()` scrolls its target into view (CLAUDE.md trap 3),
   * and the distance between two boxes is a fact about the layout that
   * survives any amount of scrolling — the lesson this test learned when the
   * list still lived below and a click read as a 456 px layout shift.
   */
  const gap = async () => {
    const c = await canvas.boundingBox();
    const foot = await page.locator('.map-foot').boundingBox();
    return foot.y - (c.y + c.height);
  };
  const gapBefore = await gap();

  await page.locator('[data-zoom="in"]').click();
  await page.locator('[data-zoom="in"]').click();

  const after = await canvas.boundingBox();
  expect(after.height).toBeCloseTo(before.height, 0);
  expect(after.width).toBeCloseTo(before.width, 0);
  expect(await gap()).toBeCloseTo(gapBefore, 0);
});

test('the world is not stretched to fit the window', async ({ page }) => {
  /*
   * The bug this exists for: the stage became the browser window on 2026-08-29
   * and the painter went on sizing its backing store to the projection's own
   * 1.1243, so the browser scaled a 1.12:1 bitmap into whatever shape the
   * window was. Egypt was visibly taller than Egypt, and **every other test
   * here still passed** — the coastline drew, the dots landed, the list matched.
   * Only looking at it caught it.
   *
   * So: the canvas's pixels are its CSS box's shape, and a degree of longitude
   * measures the same as a degree of latitude at the equator, which is the one
   * thing Mercator guarantees and the one thing a stretch would break.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });

  const shape = await page.locator('[data-map]').evaluate((el) => {
    const box = el.getBoundingClientRect();
    return { css: box.width / box.height, pixels: el.width / el.height };
  });
  expect(shape.pixels, 'the backing store is a different shape from the box, so it is being stretched').toBeCloseTo(shape.css, 2);
});

/* ---- labels and pressable dots (2026-08-30) ----------------------------- */

test('names arrive with the zoom, and not before', async ({ page }) => {
  /*
   * §8.3: "Zoom in to reveal more dots, then labels." At rest the world fits
   * the box and sixteen names would be sixteen collisions; past the threshold
   * there is room, and a label that would overlap one already drawn is
   * dropped rather than drawn over it - the brief's own words, at the only
   * density the corpus can exercise.
   */
  await ready(page);
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  await expect(canvas).toHaveAttribute('data-labels', '0');

  /*
   * Zoomed *at a dot*, not at the box's centre: the + button anchors mid-box,
   * and three presses of it march the eastern-Mediterranean cluster clean out
   * of a 1280 px frame - the probe found one surviving dot, 48 px above the
   * top edge, and a label for an off-screen dot is rightly never drawn. The
   * wheel anchors under the pointer (the map's own promise), so the dot the
   * pointer sits on stays put while the world grows around it.
   */
  const at = await canvas.evaluate((el) => {
    const b = el.getBoundingClientRect();
    const d = JSON.parse(el.dataset.dots)[0];
    return { x: b.x + d.x, y: b.y + d.y };
  });
  await page.mouse.move(at.x, at.y);
  await page.mouse.wheel(0, -400);
  await page.mouse.wheel(0, -400);
  await expect
    .poll(() => canvas.getAttribute('data-labels'), { message: 'no labels appeared zoomed at a dot' })
    .not.toBe('0');
});

/*
 * A label's 300ms fade-in (`stepLabelOpacity`, map.js, 2026-08-31) is real —
 * confirmed by hand, sampling the canvas's own ink at the same spot several
 * times a frame apart and watching it rise from nothing to full darkness —
 * but is deliberately not pinned here. Anything that has to catch a real
 * animation mid-flight needs at least two samples a known distance apart in
 * wall-clock time, and under this suite's own parallel load that distance
 * is not reliable: the tab driving one test is not guaranteed a rendering
 * frame on any particular schedule while seven others compete for the same
 * machine, so "sampled early" and "sampled once settled" can land on the
 * same already-finished frame. Pinning it properly wants a mocked clock
 * rather than a real one; a flaky proof of a real thing is worse than no
 * proof, so this stays a documented manual check instead of a red herring
 * in CI's own results.
 */

test('the map can zoom well past what the coastline itself can back', async ({ page }) => {
  // §8.3's own reason to zoom this far is reading two close names apart
  // (`declutter`'s spread is a fixed number of screen pixels, so only more
  // zoom makes it read as more room), not finer coastline detail — MAX_SCALE
  // is raised (2026-08-31) even though the land data was not.
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const zoomIn = page.locator('[data-zoom="in"]');
  for (let i = 0; i < 12 && !(await zoomIn.isDisabled()); i++) await zoomIn.click();
  await expect(page.locator('[data-zoom-level]')).toHaveText('60.0×');
  await expect(zoomIn).toBeDisabled();
});

test('a dot is a door: a press opens the saint, a drag does not', async ({ page }) => {
  await ready(page);
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  const { dot, box } = await canvas.evaluate((el) => {
    const dots = JSON.parse(el.dataset.dots ?? '[]');
    const b = el.getBoundingClientRect();
    // One safely inside the box - the first may sit at an edge.
    const inside = dots.find((d) => d.x > 20 && d.y > 60 && d.x < b.width - 20 && d.y < b.height - 60);
    return { dot: inside, box: { x: b.x, y: b.y } };
  });
  expect(dot, 'premise: no dot drawn inside the box').toBeTruthy();

  /*
   * The drag first, while we are still on the page: press on the dot, pull
   * 40 px, release. A haul across the map must never be read as a press -
   * the same rule the carousel's click-swallow keeps.
   */
  await page.mouse.move(box.x + dot.x, box.y + dot.y);
  await page.mouse.down();
  await page.mouse.move(box.x + dot.x + 40, box.y + dot.y + 25, { steps: 4 });
  await page.mouse.up();
  await expect(page).toHaveURL(/\/map$/);

  // The dot moved with the drag; re-read its position before the true press.
  const { dot: dot2 } = await canvas.evaluate((el) => ({ dot: JSON.parse(el.dataset.dots ?? '[]')[0] }));
  await page.mouse.click(box.x + dot2.x, box.y + dot2.y);
  await expect(page).toHaveURL(new RegExp(`/saints/${dot2.slug}$`));
  await expect(page.locator('h1')).not.toHaveText('Map');

  /*
   * And the door swings both ways (author, 2026-08-30: "if you close a saint
   * page from the map page, make sure you go back to the map page not the all
   * saints page"). The calendar earned the same courtesy on 2026-08-23; the
   * map gets it the same way — the × returns to where the reader was, and its
   * label says so rather than promising All Saints.
   */
  // The × carries its promise as an accessible name, not visible text.
  const back = page.locator('[data-back]');
  await expect(back).toHaveAttribute('aria-label', /map/i);
  await back.click();
  await expect(page).toHaveURL(/\/map$/);
});

/* ---- the timeline (2026-08-30 evening) ---------------------------------- */

/**
 * The readout is the one auditable channel for what the timeline is doing —
 * `{from}–{to}: {shown}/{total} shown` — so tests read the numbers back out
 * of it rather than re-deriving them, the same way the kind buttons' own
 * counts are read rather than recomputed.
 */
const timelineReadout = async (page) => {
  const text = await page.locator('[data-timeline-readout]').textContent();
  const m = /(-?\d+)–(-?\d+): (\d+)\/(\d+) shown/.exec(text);
  if (!m) throw new Error(`readout did not parse: "${text}"`);
  return { from: Number(m[1]), to: Number(m[2]), shown: Number(m[3]), total: Number(m[4]) };
};

test("the timeline spans the located corpus's own years, unfiltered at rest", async ({ page }) => {
  await page.goto(MAP, { waitUntil: 'networkidle' });

  const timeline = page.locator('.map-timeline');
  await expect(timeline).toBeVisible();

  const bounds = await page.locator('.map-timeline-bound').allTextContents();
  expect(bounds).toHaveLength(2);
  const min = Number(bounds[0]);
  const max = Number(bounds[1]);
  expect(min).toBeLessThan(max);

  // At rest the two handles sit at the two bounds, and nothing is excluded —
  // the readout says so in numbers rather than only looking unfiltered.
  const read = await timelineReadout(page);
  expect(read.from).toBe(min);
  expect(read.to).toBe(max);
  expect(read.shown).toBe(read.total);
  expect(read.total).toBeGreaterThan(0);

  // A control that cannot narrow anything further is disabled, the same
  // language the zoom's own "Whole world" speaks at scale 1.
  await expect(page.locator('[data-timeline-reset]')).toBeDisabled();
});

test('dragging a handle narrows the map, kind counts and picture together — and Whole span undoes it', async ({ page }) => {
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  const before = await timelineReadout(page);
  const claimedBefore = Number(await page.locator('.map-kind[aria-pressed="true"] .map-kind-count').textContent());
  const dotsBefore = JSON.parse(await canvas.getAttribute('data-dots'));
  expect(dotsBefore.length).toBe(claimedBefore);

  /*
   * `Home` on the upper handle jumps it to the range's own minimum — a real
   * keyboard interaction, not a value assigned from the outside, so this is
   * also the a11y proof: the slider is a native `<input type="range">` and
   * needs nothing extra to answer to a keyboard. Squeezing the upper bound
   * down to the corpus's own earliest year excludes anyone whose life had
   * not yet begun by then, which — at any density the located corpus has
   * today — is worth checking as a strict decrease rather than a fixed
   * count that would go stale the day an eighth location arrives.
   */
  const toHandle = page.locator('[data-timeline-to]');
  await toHandle.focus();
  await toHandle.press('Home');

  await expect
    .poll(async () => (await timelineReadout(page)).shown, { message: 'the timeline did not narrow anything' })
    .toBeLessThan(before.total);

  const after = await timelineReadout(page);
  expect(after.to).toBe(after.from); // squeezed to a single year
  expect(after.shown).toBeGreaterThan(0); // and not everyone was born after it

  // The kind count and the picture's own dots agree under the filter too —
  // the same invariant the unfiltered map already holds.
  const claimedAfter = Number(await page.locator('.map-kind[aria-pressed="true"] .map-kind-count').textContent());
  const dotsAfter = JSON.parse(await canvas.getAttribute('data-dots'));
  expect(dotsAfter.length).toBe(claimedAfter);
  expect(claimedAfter).toBeLessThanOrEqual(claimedBefore);

  // Whole span undoes it, and disables itself the moment it has.
  const reset = page.locator('[data-timeline-reset]');
  await expect(reset).toBeEnabled();
  await reset.click();
  await expect(reset).toBeDisabled();
  const restored = await timelineReadout(page);
  expect(restored.shown).toBe(restored.total);
  expect(restored.total).toBe(before.total);
});

test('the thumb answers to a mouse drag, not only the keyboard', async ({ page }) => {
  /*
   * The two range inputs overlap the same rail, and the trick that lets both
   * be grabbed — `pointer-events: none` on the input's own body, restored on
   * the thumb pseudo-element alone — is exactly the kind of CSS that looks
   * right and silently is not: a click on the empty track (the input's own
   * geometric centre, which `locator.click()` would use) correctly hits
   * nothing, since only the rendered thumb re-claims pointer events. A drag
   * has to land on the thumb itself, which is where a real mouse would put
   * it, so this reads the thumb's own position from the input's value rather
   * than guessing where on the track it currently sits.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const toInput = page.locator('[data-timeline-to]');
  const box = await toInput.boundingBox();

  // At rest the "to" handle sits at the range's maximum, which is the
  // rail's own right edge.
  await expect(toInput).toHaveValue(/\d+/);
  const before = Number(await toInput.inputValue());
  const thumbY = box.y + box.height / 2;

  await page.mouse.move(box.x + box.width - 8, thumbY);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, thumbY, { steps: 5 });
  await page.mouse.up();

  const after = Number(await toInput.inputValue());
  expect(after).toBeLessThan(before);

  // And the drag reached the same wiring the keyboard does — the readout and
  // the picture moved with it, not just the input's own value.
  const read = await timelineReadout(page);
  expect(read.to).toBe(after);
  expect(read.shown).toBeLessThanOrEqual(read.total);
});

test('the timeline holds the range for the visit, the way the kind does', async ({ page }) => {
  await page.goto(MAP, { waitUntil: 'networkidle' });

  const toHandle = page.locator('[data-timeline-to]');
  await toHandle.focus();
  await toHandle.press('Home');
  const narrowed = await timelineReadout(page);
  expect(narrowed.shown).toBeLessThan(narrowed.total);

  // Leave for another page and come back by the site's own nav, not a fresh
  // load — the module state this depends on is a live-session thing, the
  // same as the kind selector's, and a `page.goto` would reset both.
  await page.locator('.site-nav a[href$="/saints"]').click();
  await expect(page).toHaveURL(/\/saints$/);
  await page.locator('.site-nav a[href$="/map"]').click();
  await expect(page).toHaveURL(/\/map$/);

  const returned = await timelineReadout(page);
  expect(returned.to).toBe(narrowed.to);
  expect(returned.shown).toBe(narrowed.shown);
});

test('dragging the highlighted span moves both handles together, and keeps their width', async ({ page }) => {
  /*
   * The fill's own drag (`wireTimeline`, 2026-08-31): a third grab target
   * besides the two handles, for panning the same-length window across the
   * years rather than resizing it one edge at a time.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });

  // Narrow both handles first so the span sits clear of both walls —
  // dragging with either edge still pinned at its bound would correctly go
  // nowhere in that direction, which is the next test's premise, not this
  // one's.
  const fromHandle = page.locator('[data-timeline-from]');
  const toHandle = page.locator('[data-timeline-to]');
  await fromHandle.focus();
  for (let i = 0; i < 5; i++) await fromHandle.press('ArrowRight');
  await toHandle.focus();
  for (let i = 0; i < 5; i++) await toHandle.press('ArrowLeft');

  const before = await timelineReadout(page);
  const width = before.to - before.from;
  expect(width, 'premise: narrowing the from handle should leave a real span to drag').toBeGreaterThan(0);

  const fill = page.locator('[data-timeline-fill]');
  const box = await fill.boundingBox();
  const midY = box.y + box.height / 2;

  await page.mouse.move(box.x + box.width / 2, midY);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 40, midY, { steps: 5 });
  await page.mouse.up();

  const after = await timelineReadout(page);
  expect(after.to - after.from, 'the span widened or narrowed instead of sliding').toBe(width);
  expect(after.from, 'dragging right did not move the window forward').toBeGreaterThan(before.from);
  expect(after.to).toBeGreaterThan(before.to);

  // And it reached the same wiring the handles' own drag does.
  expect(after.shown).toBeLessThanOrEqual(after.total);
});

test('dragging the highlighted span past a bound stops there, still holding the width', async ({ page }) => {
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const bounds = (await page.locator('.map-timeline-bound').allTextContents()).map(Number);
  const [min] = bounds;

  const fromHandle = page.locator('[data-timeline-from]');
  await fromHandle.focus();
  for (let i = 0; i < 5; i++) await fromHandle.press('ArrowRight');
  const before = await timelineReadout(page);
  const width = before.to - before.from;

  const fill = page.locator('[data-timeline-fill]');
  const box = await fill.boundingBox();
  const midY = box.y + box.height / 2;

  // Dragged far past the left edge — there is nowhere further to go, and the
  // span holds its own width against the wall rather than being squashed.
  await page.mouse.move(box.x + box.width / 2, midY);
  await page.mouse.down();
  await page.mouse.move(box.x - box.width * 3, midY, { steps: 5 });
  await page.mouse.up();

  const after = await timelineReadout(page);
  expect(after.from).toBe(min);
  expect(after.to).toBe(min + width);
});

/* ---- water (2026-08-31) -------------------------------------------------- */

test('the map draws its rivers and lakes alongside the coastline', async ({ page }) => {
  /*
   * `data/water.js` loads in parallel with `data/land.js` (`drawWhenReady`),
   * and `data-water` is this pass's own report that the fetch landed and the
   * paint used it — the same rule `data-land` already keeps.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');
  await expect(canvas).toHaveAttribute('data-water', 'ok');

  const caption = page.locator('[data-caption]');
  await expect(caption).toContainText(/rivers?/i);
  await expect(caption).toContainText(/lakes?/i);
});

test('the rest view is centred on the corpus, not on the equator and the prime meridian', async ({ page }) => {
  /*
   * `HOME`'s `cx`/`cy` of 0.5 is mid-ocean — nowhere this corpus has a
   * saint. Zooming in with the + button anchors on the screen's own centre
   * (predictable by design, `lib/map-view.js`'s own `zoomAbout`), so a rest
   * view centred there zoomed a reader toward empty sea and away from every
   * dot within two or three presses — Martha of Diveyevo, reported gone at
   * "zoomed all the way in", was reproducibly off the top of the screen by
   * the second press. `defaultView` (map.js, 2026-08-31) centres the rest
   * view on the corpus's own mean position instead, so the same presses
   * zoom toward it. This does not claim every dot survives arbitrarily deep
   * zoom — only that the ordinary case, a reader who presses + a few times
   * without first panning, still has a map with saints on it.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  const atRest = JSON.parse(await canvas.getAttribute('data-dots'));
  expect(atRest.length, 'premise: the corpus has located saints to begin with').toBeGreaterThan(1);

  for (let i = 0; i < 3; i++) await page.locator('[data-zoom="in"]').click();

  const zoomed = JSON.parse(await canvas.getAttribute('data-dots'));
  expect(zoomed.length, 'three presses of + emptied the map of every saint').toBeGreaterThan(0);
});

/* ---- declutter (2026-08-31) ----------------------------------------------- */

test('two saints who share an exact spot get their own dot each, not one stacked on the other', async ({ page }) => {
  /*
   * John the Long-Suffering and Moses the Hungarian both die at the Caves in
   * Kyiv, at the same rounded coordinate — the case `declutter`
   * (`lib/map-view.js`) exists for. No zoom level would ever separate two
   * identical points, so this is checked at rest rather than by zooming in.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  const dots = JSON.parse(await canvas.getAttribute('data-dots'));
  const john = dots.find((d) => d.slug === 'john-the-long-suffering');
  const moses = dots.find((d) => d.slug === 'moses-the-hungarian');
  expect(john, 'premise: John the Long-Suffering has no drawn death point').toBeTruthy();
  expect(moses, 'premise: Moses the Hungarian has no drawn death point').toBeTruthy();

  const apart = Math.hypot(john.x - moses.x, john.y - moses.y);
  expect(apart, 'the two dots still land on the same pixel').toBeGreaterThan(3);
});
