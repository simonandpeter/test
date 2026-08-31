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
 * Index's facets went with the surfaces they tested. The footer itself went a
 * day later — Natural Earth asks for no credit, and the About page carries it
 * anyway — so the page is the picture and the timeline under it.
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
  // And the note reserved for a coastline that did *not* load stays silent.
  await expect(page.locator('[data-caption]')).toBeHidden();

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

test('one dot per located saint, and the picture says so', async ({ page }) => {
  /*
   * **The four kind buttons are gone** (author, 2026-08-31), and with them
   * the counts that used to be the page's one statement of what it shows.
   * What replaced them is `pointAt`: one dot per saint, the *kind* of place
   * chosen by where the timeline's upper handle stands rather than by a
   * button everyone shares. So the invariant worth pinning is no longer
   * "the count matches the picture" but "every located saint is on it" —
   * the timeline dims rather than removes, so at rest that is all of them.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  await expect(page.locator('.map-kind')).toHaveCount(0);

  const drawn = JSON.parse(await canvas.getAttribute('data-dots'));
  expect(drawn.length).toBeGreaterThan(0);
  // One dot per saint, never two: a saint with both a death and a relics
  // place used to contribute a point to each of two kinds.
  const slugs = new Set(drawn.map((d) => d.slug));
  expect(slugs.size).toBe(drawn.length);

  // Every one of them is inside the corpus's own span at rest, so every one
  // is drawn live — the range starts as wide as the rail can go.
  const readout = await timelineReadout(page);
  expect(readout.shown).toBe(drawn.length);
});

test('the timeline dims what it excludes rather than removing it', async ({ page }) => {
  /*
   * Author, 2026-08-31: "if the timeline bar filter does not include the
   * saint's life, if it is after, they are greyed but still visible, and if
   * their life hasn't happened yet, they are also greyed out but greyed out
   * twice as much." So narrowing the range must leave the dot count alone
   * and change only how the dots are drawn — the exact opposite of what the
   * timeline did when it shipped, which is why this is worth pinning.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  const before = JSON.parse(await canvas.getAttribute('data-dots')).length;
  const wide = await timelineReadout(page);
  expect(wide.shown).toBe(wide.total);

  // Squeeze to the earliest years the corpus has: most saints are now
  // "not yet born" and must still be drawn.
  await page.locator('[data-timeline-preset]').selectOption('apostolic');
  await expect.poll(async () => (await timelineReadout(page)).shown).toBeLessThan(wide.total);

  const after = JSON.parse(await canvas.getAttribute('data-dots')).length;
  expect(after, 'the timeline removed dots instead of dimming them').toBe(before);
  // Every dot carries which side of the range it falls on, so the drawing
  // has three states to dim by rather than one.
  const states = new Set(JSON.parse(await canvas.getAttribute('data-dots')).map((d) => d.state));
  expect(states.size, 'every dot is in the same state, so nothing is being dimmed').toBeGreaterThan(1);
});

test('the page is the map and its timeline, and nothing else read', async ({ page }) => {
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

  /*
   * **The footer went too** (author, 2026-08-31: "Remove the 'Coastline,
   * rivers and lakes...', not needed legally? If needed place in About
   * page"). Natural Earth asks for no attribution, so nothing in that strip
   * was owed; the credit is on the About page now, and the map is the map.
   */
  await expect(page.locator('.map-foot')).toHaveCount(0);
  await expect(page.locator('[data-map]').locator('..').locator('[data-caption]')).toBeHidden();
});

test('the coastline credit is on the About page, where the rest of the sourcing is', async ({ page }) => {
  await page.goto('/about', { waitUntil: 'networkidle' });
  const sourcing = page.locator('section', { has: page.locator('#sourcing') });
  await expect(sourcing).toContainText('Natural Earth');
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
   * and the height left under the bar and above the timeline — two strips
   * outside the picture since the footer went (2026-08-31), each measured
   * rather than guessed, the same "no number here has to agree with any
   * number there" rule the timeline's own CSS keeps. `--chrome-h-reserve` is
   * where the bar's number comes from, so this is also what catches the two
   * drifting apart — a header that grew without the token growing would leave
   * the map hanging off the bottom of the screen with nothing else to say so.
   */
  const room = await page.evaluate(() => ({
    vw: document.documentElement.clientWidth,
    vh: window.innerHeight,
    bar: document.querySelector('.chrome-bar').getBoundingClientRect().height,
    timeline: document.querySelector('.map-timeline')?.getBoundingClientRect().height ?? 0,
  }));
  expect(after.width).toBeCloseTo(room.vw, 0);
  expect(after.height).toBeCloseTo(room.vh - room.bar - room.timeline, 0);

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
   * At rest the box *is* the world, so there is nowhere further out. The
   * control says that rather than accepting presses that do nothing — a
   * button that looks live and is inert teaches the reader the map is
   * broken. **"Whole world" is gone** (author, 2026-08-31: "Remove the zoom
   * + and - and 'Whole world' buttons"); the + and - survive on a pointer
   * device, the readout survives everywhere, and Home or 0 still comes back
   * from the keyboard.
   */
  await expect(page.locator('[data-zoom="out"]')).toBeDisabled();
  await expect(page.locator('[data-zoom="home"]')).toHaveCount(0);
  await expect(page.locator('[data-zoom="in"]')).toBeEnabled();
});

test('the buttons zoom, and the keyboard comes home', async ({ page }) => {
  await page.goto(MAP, { waitUntil: 'networkidle' });

  await page.locator('[data-zoom="in"]').click();
  await page.locator('[data-zoom="in"]').click();
  expect(await zoomLevel(page)).not.toBe('1.0×');
  await expect(page.locator('[data-zoom="out"]')).toBeEnabled();

  // And the picture actually changed, rather than only the number.
  const zoomed = await mapInk(page);

  // Home, from the canvas — the button that used to do this is gone, and
  // this is the way back that replaced it.
  await page.locator('[data-map]').focus();
  await page.keyboard.press('Home');
  await expect(page.locator('[data-zoom-level]')).toHaveText('1.0×');
  const home = await mapInk(page);
  expect(zoomed, 'the canvas drew the same thing zoomed in as zoomed out').not.toBe(home);
});

test('the scale readout is the whole of the indicator, and reads like a scale', async ({ page }) => {
  // Author, 2026-08-31: "Display instead a small scale indicator e.g. '4.9x'".
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const level = page.locator('[data-zoom-level]');
  await expect(level).toBeVisible();
  await expect(level).toHaveText(/^\d+\.\d×$/);
  await page.locator('[data-zoom="in"]').click();
  await expect(level).not.toHaveText('1.0×');
  await expect(level).toHaveText(/^\d+\.\d×$/);
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
  await canvas.focus();
  await page.keyboard.press('Home');
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
   * The gap between the picture and the timeline below it, not either one's
   * position on screen. `locator.click()` scrolls its target into view
   * (CLAUDE.md trap 3), and the distance between two boxes is a fact about
   * the layout that survives any amount of scrolling — the lesson this test
   * learned when the list still lived below and a click read as a 456 px
   * layout shift. It measured against `.map-foot` until that strip went
   * (2026-08-31); the timeline is the box below the picture now.
   */
  const gap = async () => {
    const c = await canvas.boundingBox();
    const below = await page.locator('.map-timeline').boundingBox();
    return below.y - (c.y + c.height);
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
  for (let i = 0; i < 20 && !(await zoomIn.isDisabled()); i++) await zoomIn.click();
  await expect(page.locator('[data-zoom-level]')).toHaveText('120.0×');
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
 * What the timeline is doing, read off the two channels a reader has.
 *
 * The `{from}-{to}: {shown}/{total} shown` line these numbers used to come
 * from went on 2026-08-31 at the author's instruction, and nothing replaced
 * it: the range is what the two year buttons print, and the count of saints
 * inside the range is the count of dots the draw pass marked `live` — which
 * `data-dots` has carried since the timeline began dimming rather than
 * removing. Both are things the page already had to be right about, so this
 * reads them rather than adding an instrument that exists for the suite.
 */
const timelineReadout = async (page) => {
  const [from, to] = await yearButtons(page);
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-dots', /\[.+\]/);
  const dots = JSON.parse(await canvas.getAttribute('data-dots'));
  return { from, to, shown: dots.filter((d) => d.state === 'live').length, total: dots.length };
};

test("the timeline spans the located corpus's own years, unfiltered at rest", async ({ page }) => {
  await page.goto(MAP, { waitUntil: 'networkidle' });

  const timeline = page.locator('.map-timeline');
  await expect(timeline).toBeVisible();

  /*
   * The printed bounds became year buttons (author, 2026-08-31), so the
   * range's own ends are read off those rather than from two spans — and
   * they are the same two numbers the readout prints, which is the
   * agreement worth checking.
   */
  const boxes = await yearButtons(page);
  expect(boxes).toHaveLength(2);
  expect(boxes[0]).toBeLessThan(boxes[1]);

  const read = await timelineReadout(page);
  expect(read.from).toBe(boxes[0]);
  expect(read.to).toBe(boxes[1]);
  expect(read.shown).toBe(read.total);
  expect(read.total).toBeGreaterThan(0);

  // "Whole span" is the preset list's own first entry now, and is what the
  // list rests on before the reader chooses a period.
  await expect(page.locator('[data-timeline-preset]')).toHaveValue('');
});

test('dragging a handle narrows the range, and Whole span undoes it', async ({ page }) => {
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  const before = await timelineReadout(page);

  /*
   * `Home` on the upper handle jumps it to the range's own minimum — a real
   * keyboard interaction, not a value assigned from the outside, so this is
   * also the a11y proof: the slider is a native `<input type="range">` and
   * needs nothing extra to answer to a keyboard.
   */
  const toHandle = page.locator('[data-timeline-to]');
  await toHandle.focus();
  await toHandle.press('Home');

  await expect
    .poll(async () => (await timelineReadout(page)).shown, { message: 'the timeline did not narrow anything' })
    .toBeLessThan(before.total);

  const after = await timelineReadout(page);
  expect(after.to).toBe(after.from); // squeezed to a single year
  // The year buttons followed the handle rather than keeping a stale year.
  const boxes = await yearButtons(page);
  expect(boxes[0]).toBe(after.from);
  expect(boxes[1]).toBe(after.to);

  // Whole span undoes it, from the preset list where that button's job went.
  await page.locator('[data-timeline-preset]').selectOption('');
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
  // The range's own floor, read off the handle rather than a printed bound
  // (the bounds became typed year boxes on 2026-08-31).
  const min = Number(await page.locator('[data-timeline-from]').getAttribute('min'));

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

/* ---- the search (2026-08-31) ---------------------------------------------- */

const searchBox = (page) => page.locator('[data-search-input]');
const searchRows = (page) => page.locator('.map-search-row');

/**
 * Sets one end of the timeline the way a reader does since 2026-08-31: press
 * the fixed-width button, type into the panel it opens, and press Enter —
 * which commits and puts the panel away. `era` is the panel's own select,
 * left alone unless a test is about BC.
 */
const typeYear = async (page, side, year, era) => {
  await page.locator(`[data-year-btn="${side}"]`).click();
  await expect(page.locator(`[data-year-pop="${side}"]`)).toBeVisible();
  if (era) await page.locator(`[data-year-era="${side}"]`).selectOption(era);
  const num = page.locator(`[data-year-num="${side}"]`);
  await num.fill(year);
  await num.press('Enter');
  await expect(page.locator(`[data-year-pop="${side}"]`)).toBeHidden();
};

/**
 * Both ends as the buttons print them, signed the way a year is stored.
 *
 * It waits for the pair rather than reading whatever is in the document
 * right now: since the readout went (2026-08-31) this is what every timeline
 * assertion reads, including one that navigates back to the map and would
 * otherwise measure the page it came from — which is exactly how it failed,
 * once, under a full parallel run.
 */
const yearButtons = async (page) => {
  const buttons = page.locator('[data-year-btn]');
  await expect(buttons).toHaveCount(2);
  return buttons.evaluateAll((els) =>
    els.map((e) => {
      const [n, era] = e.textContent.trim().split(/\s+/);
      return era === 'BC' ? -Number(n) : Number(n);
    }),
  );
};

test('the search finds a place and flies the map to it', async ({ page }) => {
  /*
   * Author, 2026-08-31: "Add a search bar that takes you to certain locations
   * on the map ... You can also search for places, e.g. ukraine, russia,
   * romania, france, constantinople, antioch, alexandria, damascus."
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-map]')).toHaveAttribute('data-land', 'ok');
  await expect(page.locator('[data-zoom-level]')).toHaveText('1.0×');

  await searchBox(page).fill('constantin');
  await expect(searchRows(page).first()).toContainText('Constantinople');
  await searchBox(page).press('Enter');

  // The view moved, and the chrome moved with it — a search that assigned
  // the view directly left the readout saying 1.0× while the picture flew.
  await expect(page.locator('[data-zoom-level]')).not.toHaveText('1.0×');
  // And it moved the map rather than leaving the page: a dot is already the
  // door to a saint, and the search is not a second one.
  await expect(page).toHaveURL(/\/map$/);
});

test('the search finds a saint by name, and says so for a reader who cannot see the map', async ({ page }) => {
  await page.goto(MAP, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-map]')).toHaveAttribute('data-land', 'ok');

  await searchBox(page).fill('moses the hung');
  await expect(searchRows(page).first()).toContainText(/Moses/);
  await searchBox(page).press('Enter');

  await expect(page.locator('[data-zoom-level]')).not.toHaveText('1.0×');
  // The canvas is one opaque image to a screen reader, so the flight is
  // announced rather than only drawn.
  await expect(page.locator('[data-map-say]')).toContainText(/Moses/);
});

test('the search is a real combobox: arrows move, Escape closes', async ({ page }) => {
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const box = searchBox(page);
  await expect(box).toHaveAttribute('aria-expanded', 'false');

  await box.fill('a');
  await expect(box).toHaveAttribute('aria-expanded', 'true');
  await box.press('ArrowDown');
  // The active row is named for the assistive tech, not only highlighted.
  await expect(box).toHaveAttribute('aria-activedescendant', /map-search-row-/);
  await expect(page.locator('.map-search-row.is-active')).toHaveCount(1);

  await box.press('Escape');
  await expect(box).toHaveAttribute('aria-expanded', 'false');
  await expect(searchRows(page)).toHaveCount(0);
});

/* ---- the typed years and the presets (2026-08-31) ------------------------- */

test('the two ends swap themselves when an earlier year is typed on the right', async ({ page }) => {
  /*
   * Author, 2026-08-31: "If an earlier date is typed in the right side than
   * the left side, the timeline adjusts so that right side entry goes to the
   * left and vice versa."
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });

  // Typing is behind the button now (author, same day: "make the start and
  // end date a button of fixed width and make the AD BC selector part of
  // the pop up from the button"), so each edit opens its own panel first.
  await typeYear(page, 'from', '1000');
  await expect.poll(async () => (await timelineReadout(page)).from).toBe(1000);

  // Now the right-hand end is given a year earlier than the left-hand one.
  await typeYear(page, 'to', '500');

  const after = await timelineReadout(page);
  expect(after.from, 'the ends did not swap').toBe(500);
  expect(after.to).toBe(1000);
  // And both buttons print the swapped pair, not what was typed into them.
  await expect(page.locator('[data-year-btn="from"]')).toHaveText('500 AD');
  await expect(page.locator('[data-year-btn="to"]')).toHaveText('1000 AD');
});

test('the year buttons hold one width whatever year they show', async ({ page }) => {
  /*
   * Author, 2026-08-31: "make the start and end date a button of fixed
   * width". The boxes this replaced sized to their own content, so the rail
   * between them jumped every time a year gained or lost a digit — which is
   * the thing a fixed width is for, and the thing worth measuring.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const from = page.locator('[data-year-btn="from"]');
  const to = page.locator('[data-year-btn="to"]');

  /*
   * At rest the two ends already differ in digit count — the corpus runs 66
   * to 1938 — so they are the pair to compare, and no interaction is needed
   * to make the point.
   */
  await expect(from).toHaveText('66 AD');
  await expect(to).toHaveText('1938 AD');
  const narrow = (await from.boundingBox()).width;
  const wide = (await to.boundingBox()).width;
  expect(wide, 'a four-digit year made its button wider than a two-digit one').toBeCloseTo(narrow, 0);

  // And it holds when a year actually changes, which is when the rail used
  // to jump. 1500 is inside the corpus's own span, so it is not clamped.
  await typeYear(page, 'from', '1500');
  await expect(from).toHaveText('1500 AD');
  expect((await from.boundingBox()).width, 'the button resized to its year').toBeCloseTo(narrow, 0);
});

test('the year panel carries the BC/AD choice, and a press elsewhere puts it away', async ({ page }) => {
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const btn = page.locator('[data-year-btn="from"]');
  const pop = page.locator('[data-year-pop="from"]');

  await expect(pop).toBeHidden();
  await expect(btn).toHaveAttribute('aria-expanded', 'false');

  await btn.click();
  await expect(pop).toBeVisible();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  // The era lives in the panel rather than beside the rail.
  await expect(pop.locator('[data-year-era="from"]')).toBeVisible();

  // A press on the picture is a press elsewhere.
  await page.locator('[data-map]').click({ position: { x: 10, y: 10 } });
  await expect(pop).toBeHidden();
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
});

test('a preset span sets both ends, and an event becomes its own window', async ({ page }) => {
  /*
   * "Whole span" became a list of periods and events (author, 2026-08-31),
   * an event being read as its year ±50 (`EVENT_MARGIN`). Nicaea is 325, so
   * choosing it must land on 275–375 — the clearest proof the margin is
   * applied rather than the year being used as both ends.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  await page.locator('[data-timeline-preset]').selectOption('nicaea');

  const read = await timelineReadout(page);
  expect(read.from).toBe(275);
  expect(read.to).toBe(375);
  expect(read.shown).toBeLessThan(read.total);
});

/* ---- labels: leader lines and the edge (2026-08-31) ----------------------- */

test('a crowded cluster names every dot rather than only the leftmost', async ({ page }) => {
  /*
   * The defect `lib/map-labels.js` exists for, checked at the density the
   * corpus actually has: the Nicomedia martyrs sit close enough that the old
   * "place it to the right or drop it" pass named one and dropped the rest.
   * The layout itself is pinned in `tests/map-labels.test.mjs`; this is the
   * proof it is wired to the real picture.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  await searchBox(page).fill('nicomedia');
  await expect(searchRows(page).first()).toContainText('Nicomedia');
  await searchBox(page).press('Enter');

  // Several names at once, which is more than the old pass could manage in
  // a cluster this tight.
  await expect.poll(async () => Number(await canvas.getAttribute('data-labels'))).toBeGreaterThan(3);
});

test('every saint in a cluster is named at the deepest zoom, and none runs off the edge', async ({ page }) => {
  /*
   * Author, 2026-08-31: "On mobile Map page, zooming in as far as you can
   * you still cant see two of the 5 saints located around constantinople."
   * Both halves of that were the column layout: one row met the neighbouring
   * Nicomedia column and was dropped outright, and the widest name ran past
   * the right edge and was clipped mid-word. `lib/map-labels.js` places a
   * column as one block now — held inside the picture, slid up or down until
   * every row in it fits — and `tests/map-labels.test.mjs` pins the
   * arithmetic. This is the proof against the real picture at the real zoom.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  const box = await canvas.boundingBox();
  /*
   * Every dot the reader can see has its name drawn with it. `data-labels`
   * is a count of `fillText` calls, so it can run *above* this for the 300 ms
   * a name that has just lost its place takes to fade out — the claim worth
   * making is that nothing on the picture goes unnamed, not that the two
   * numbers are equal on every frame.
   */
  const everyDotNamed = async () => {
    const drawn = JSON.parse(await canvas.getAttribute('data-dots'));
    const onPicture = drawn.filter((d) => d.x >= 0 && d.x <= box.width && d.y >= 0 && d.y <= box.height);
    expect(onPicture.length, 'premise: the flight landed nowhere near the cluster').toBeGreaterThan(3);
    await expect
      .poll(async () => Number(await canvas.getAttribute('data-labels')))
      .toBeGreaterThanOrEqual(onPicture.length);
  };

  await searchBox(page).fill('constantinople');
  await expect(searchRows(page).first()).toContainText('Constantinople');
  await searchBox(page).press('Enter');

  // Where the search itself lands: both crowded clusters on one picture,
  // which is where a column used to lose a row to its neighbour's.
  await everyDotNamed();

  // And all the way in, from the keyboard — the zoom buttons are hidden on a
  // touch device, and "as far as you can" is what the report was about.
  await canvas.focus();
  for (let i = 0; i < 20; i++) await canvas.press('+');
  await expect(page.locator('[data-zoom-level]')).toHaveText('120.0×');
  await everyDotNamed();
});

test('the year buttons follow the span as it is dragged, not only when it is let go', async ({ page }) => {
  /*
   * Author, 2026-08-31: "The date does not update anymore when sliding the
   * whole bar along." The fill's own drag repainted the highlighted span and
   * the picture but not the two ends, because painting the ends was a second
   * function only `commit` called. They are one function now.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });

  // Narrow first, so the span has somewhere to slide to.
  const fromHandle = page.locator('[data-timeline-from]');
  const toHandle = page.locator('[data-timeline-to]');
  await fromHandle.focus();
  for (let i = 0; i < 5; i++) await fromHandle.press('ArrowRight');
  await toHandle.focus();
  for (let i = 0; i < 5; i++) await toHandle.press('ArrowLeft');

  const before = await yearButtons(page);

  const fill = page.locator('[data-timeline-fill]');
  const box = await fill.boundingBox();
  const midY = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, midY);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, midY, { steps: 5 });

  // Read them *mid-drag*, with the button still down: this is the moment the
  // buttons used to keep printing the year the span had already left.
  const during = await yearButtons(page);
  await page.mouse.up();

  expect(during[0], 'the left-hand year did not move with the span').toBeGreaterThan(before[0]);
  expect(during[1], 'the right-hand year did not move with the span').toBeGreaterThan(before[1]);
});

test('the timeline prints no count of its own any more', async ({ page }) => {
  /*
   * Author, 2026-08-31: "Remove the start date-end date: x/y shown at the
   * bottom of the map page." Its two halves were both said elsewhere — the
   * range by the year buttons, the count by nothing the reader needed once
   * the timeline began dimming rather than removing.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-timeline-readout]')).toHaveCount(0);
  await expect(page.locator('.map-timeline')).not.toContainText(/shown/i);
  // The preset list, which shared that row, is still there.
  await expect(page.locator('[data-timeline-preset]')).toBeVisible();
});

/* ---- the timeline and a life (2026-08-31) -------------------------------- */

test('a saint whose birth is only bounded from above is not lit centuries early', async ({ page }) => {
  /*
   * Author, 2026-08-31: "Moses the Hungarian's dot and name are still lit up
   * even when the timeline bar is 600 years before his birth date." His birth
   * is recorded as "before 1000" — an interval open at its start — and
   * `overlaps` reads an open start as reaching back without limit.
   * `lifeBounds` (`lib/map-track.js`) falls back to the bound the corpus
   * actually states.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  const stateOf = async () =>
    (JSON.parse(await canvas.getAttribute('data-dots')).find((d) => d.slug === 'moses-the-hungarian') ?? {}).state;

  expect(await stateOf(), 'premise: he is not drawn at rest').toBe('live');

  await typeYear(page, 'to', '400');
  await expect.poll(stateOf).toBe('future');
});

test('a saint not yet born is a dot with no name on it', async ({ page }) => {
  /*
   * Author, 2026-08-31: "Before a saint is born, dont display their names
   * anymore, just the dot." They were drawn at `DIM_FUTURE` before, which
   * read as a claim about someone the reader's own range has not reached —
   * and took layout room from the saints who are in it.
   *
   * Nicomedia is the place to ask it: four martyrs of the persecutions, all
   * named at the zoom the search lands on, and all of them plainly unborn in
   * the year 100.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  await searchBox(page).fill('nicomedia');
  await expect(searchRows(page).first()).toContainText('Nicomedia');
  await searchBox(page).press('Enter');
  await expect.poll(async () => Number(await canvas.getAttribute('data-labels'))).toBeGreaterThan(3);

  const before = JSON.parse(await canvas.getAttribute('data-dots'));
  expect(
    before.some((d) => d.state === 'future'),
    'premise: somebody on screen is already unborn at rest',
  ).toBe(false);

  // Back before all of them. The dots stay — the timeline dims rather than
  // removes — and the names go.
  await typeYear(page, 'to', '100');
  await expect
    .poll(async () => JSON.parse(await canvas.getAttribute('data-dots')).filter((d) => d.state === 'future').length)
    .toBeGreaterThan(0);

  const after = JSON.parse(await canvas.getAttribute('data-dots'));
  expect(after.length, 'the unborn were removed rather than left unnamed').toBe(before.length);

  /*
   * No more names than there are saints eligible to carry one. `data-labels`
   * counts `fillText` calls including a name still fading out, so the poll
   * waits that 300 ms out rather than reading the first frame; what it must
   * never settle above is the number of dots that are not `future`.
   */
  const eligible = after.filter((d) => d.state !== 'future').length;
  expect(eligible, 'premise: the squeeze left everyone in range, so nothing is being told apart').toBeLessThan(
    before.length,
  );
  await expect.poll(async () => Number(await canvas.getAttribute('data-labels'))).toBeLessThanOrEqual(eligible);
});

/* ---- the track (2026-08-31) ---------------------------------------------- */

test('a saint with a dated track moves along it as the timeline crosses his life', async ({ page }) => {
  /*
   * Author, 2026-08-31: "Create a test track for St Moses the Hungarian ...
   * where he was born in Hungary and went to Kiev then Poland then back to
   * Kiev ... And show him moving on that rail as the timeline bar scrolls
   * over his lifespan." The waypoints and their years are in his own
   * `saint.json`; `lib/map-track.js` reads a position off them and
   * `tests/map-track.test.mjs` pins that arithmetic. This is the proof the
   * picture actually moves him.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  /*
   * Kyiv, then back out far enough for Hungary and Poland to be on the
   * picture with it — the gazetteer flies to a town at 40x, and a journey
   * across half of Europe does not fit in a town.
   */
  await searchBox(page).fill('kyiv');
  await expect(searchRows(page).first()).toContainText('Kyiv');
  await searchBox(page).press('Enter');
  await canvas.focus();
  for (let i = 0; i < 6; i++) await canvas.press('-');

  const whereIsHe = async () =>
    JSON.parse(await canvas.getAttribute('data-dots')).find((d) => d.slug === 'moses-the-hungarian');

  const at = {};
  for (const year of ['1010', '1016', '1022', '1029', '1040']) {
    await typeYear(page, 'to', year);
    await expect.poll(async () => Boolean(await whereIsHe())).toBe(true);
    at[year] = await whereIsHe();
  }

  const apart = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // Hungary, then Kyiv, then Poland: three different places, not one dot
  // standing still while the years go by.
  expect(apart(at['1010'], at['1016']), 'he never left Hungary').toBeGreaterThan(5);
  expect(apart(at['1016'], at['1022']), 'he was never carried to Poland').toBeGreaterThan(5);
  // And the return is walked rather than jumped: 1029 sits in the gap the
  // sources leave between the release and the Caves, so it is neither end.
  expect(apart(at['1029'], at['1022']), 'the return started nowhere').toBeGreaterThan(2);
  expect(apart(at['1029'], at['1040']), 'the return had already arrived').toBeGreaterThan(2);
});

test('the rest view survives being computed before the canvas has a size', async ({ page }) => {
  /*
   * `render` can run inside a view transition's update callback, where the
   * document's own rendering is suppressed and the freshly written canvas
   * measures 0 by 0. `coverFractions(0, 0)` is 0/0 on both axes, a NaN frame
   * makes a NaN centre, and `toScreen` then puts every dot at NaN for the
   * rest of the visit — an empty picture and a `createRadialGradient`
   * refusing a non-finite radius, found on a desktop window 2026-08-31.
   * `settleHome` waits for a real box instead.
   *
   * Reached by navigating *within* the site rather than by `page.goto`,
   * because it is the client-side transition that suppresses the layout.
   */
  await page.goto('/saints', { waitUntil: 'networkidle' });
  /*
   * A stage with no layout is the same 0-by-0 canvas the transition hands
   * `render`, and it is reachable from a test where the transition itself is
   * not. Added to the live document so it is in force at the moment the
   * client-side navigation renders the map, and taken off again after — which
   * is when a correct `settleHome` finds its box.
   */
  await page.addStyleTag({ content: '.map-stage { display: none !important; }' });
  await page.locator('.site-nav a[href$="/map"]').click();
  await expect(page).toHaveURL(/\/map$/);
  await page.evaluate(() => {
    for (const style of document.querySelectorAll('style')) {
      if (style.textContent.includes('.map-stage')) style.remove();
    }
  });

  const canvas = page.locator('[data-map]');
  await expect
    .poll(async () => {
      const raw = await canvas.getAttribute('data-dots');
      if (!raw) return 'the map never drew';
      const dots = JSON.parse(raw);
      if (!dots.length) return 'the map drew no dots at all';
      const nan = dots.find((d) => !Number.isFinite(d.x) || !Number.isFinite(d.y));
      return nan ? `${nan.slug} was drawn at ${nan.x},${nan.y}` : 'ok';
    })
    .toBe('ok');
});
