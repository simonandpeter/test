import { test, expect } from './fixtures.js';
import { ready } from './helpers.js';

/**
 * The map (Session 7, 2026-08-29). One file per surface, as the rest of the
 * suite is.
 *
 * **What this surface is has to be said before the tests make sense.** The
 * brief's §8.3 describes a `d3-geo` orthographic globe with clustering,
 * collide-detected labels and a timeline brush; the author asked for "a simple
 * mercator projection 2d map for now, something very light", and the density
 * machinery is deferred besides, because seven of 742 saints carry a location
 * and sixteen points cannot exercise a cluster threshold. So there are no tests
 * here for clustering or labels: there is nothing to test, and a green test over
 * absent machinery is worse than no test.
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

test('the page is the map, a small footer, and nothing else', async ({ page }) => {
  /*
   * Author, 2026-08-30: "remove everything on the map page outside of the map
   * itself except for leaving a small footer with the coastline map credit and
   * scroll to zoom hint." That reverses Amendment 76's below-map reading — the
   * lede, the Index's facets, the Places register and the unlocated tray all
   * go — so this is the assertion that they stay gone, and that what the
   * instruction kept is actually there: the credit and the hint, in a footer.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });

  for (const gone of ['.map-below', '.map-places', '.map-unlocated', '[data-map-facets]', '[data-map-lede]']) {
    await expect(page.locator(gone)).toHaveCount(0);
  }

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
   * and the height left under the bar and above the footer — the one strip
   * the author kept below the picture (2026-08-30). `--chrome-h-reserve` is
   * where the bar's number comes from, so this is also what catches the two
   * drifting apart — a header that grew without the token growing would leave
   * the map hanging off the bottom of the screen with nothing else to say so.
   */
  const room = await page.evaluate(() => ({
    vw: document.documentElement.clientWidth,
    vh: window.innerHeight,
    bar: document.querySelector('.chrome-bar').getBoundingClientRect().height,
    foot: document.querySelector('.map-foot').getBoundingClientRect().height,
  }));
  expect(after.width).toBeCloseTo(room.vw, 0);
  expect(after.height).toBeCloseTo(room.vh - room.bar - room.foot, 0);

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
