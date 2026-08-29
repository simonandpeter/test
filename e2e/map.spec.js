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
 * answer — that the picture is drawn, that the list carries what the picture
 * shows, and that the reader can work the page without seeing either.
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
   * The caption is written only after the coastline chunk resolves, so it is
   * the page's own report that the fetch landed — and the assertion is on the
   * caption rather than on pixels because a canvas that drew nothing and a
   * canvas that drew the sea are the same screenshot.
   */
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

test('every place on the picture is also a row a reader can reach', async ({ page }) => {
  await page.goto(MAP, { waitUntil: 'networkidle' });

  /*
   * The canvas is one opaque image to a screen reader and to the keyboard both.
   * The list is not a courtesy under it — it *is* the map, and the count on the
   * pressed kind button is the claim the list has to match. If those two ever
   * disagree the picture is showing something the page cannot name.
   */
  const pressed = page.locator('.map-kind[aria-pressed="true"]');
  await expect(pressed).toHaveCount(1);
  const claimed = Number(await pressed.locator('.map-kind-count').textContent());
  await expect(page.locator('.map-places .reg-row')).toHaveCount(claimed);

  // Each row names a saint and links to them, and names where — never the raw
  // region key, which is what the first version of this printed.
  const first = page.locator('.map-places .reg-row').first();
  await expect(first.locator('.reg-name')).not.toHaveText('');
  await expect(first.locator('.map-place')).not.toHaveText('');
  await expect(first.locator('.map-place')).not.toContainText('slavic-east');
  await expect(first.locator('.reg-name')).toHaveAttribute('href', /\/saints\//);
});

test('the four kinds are four different questions, and the map answers one at a time', async ({ page }) => {
  await page.goto(MAP, { waitUntil: 'networkidle' });

  // Death is the default (§8.3), and exactly one kind is ever current.
  await expect(page.locator('.map-kind[aria-pressed="true"]')).toHaveText(/Died/);

  const born = page.locator('.map-kind[data-kind="birth"]');
  const claimed = Number(await born.locator('.map-kind-count').textContent());
  await born.click();

  await expect(born).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.map-kind[aria-pressed="true"]')).toHaveCount(1);
  // The list followed the button rather than the button merely lighting up.
  await expect(page.locator('.map-places .reg-row')).toHaveCount(claimed);
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

test('the saints with no place are named, not dropped', async ({ page }) => {
  await page.goto(MAP, { waitUntil: 'networkidle' });

  /*
   * "They are never silently dropped" (§8.3). Today the tray holds all but
   * seven of the calendar's saints, which is the honest shape of this page —
   * so the assertion is that the tray's count *is* the corpus minus the mapped
   * ones, rather than some number the page felt like printing.
   */
  const tray = page.locator('.map-unlocated');
  await expect(tray).toBeVisible();

  const summary = await tray.locator('summary').textContent();
  const counted = Number(/(\d+)/.exec(summary)[1]);
  expect(counted).toBeGreaterThan(0);

  await tray.locator('summary').click();
  await expect(tray.locator('.map-unlocated-list .reg-row')).toHaveCount(counted);
  // And every one of them is a way back to the saint.
  await expect(tray.locator('.map-unlocated-list .reg-name').first()).toHaveAttribute('href', /\/saints\//);
});

test('the picture reserves its box before the coastline arrives', async ({ page }) => {
  /*
   * Brief §13's no-layout-shift, on the one view whose picture is fetched. The
   * figure's height comes from `aspect-ratio` in CSS, so it is the same before
   * the chunk lands as after — measured either side of the load rather than
   * inferred from the stylesheet.
   *
   * `domcontentloaded`, not `networkidle`: the point is to be looking before
   * the coastline has had a chance to arrive.
   */
  await page.goto(MAP, { waitUntil: 'domcontentloaded' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toBeVisible();
  const before = await canvas.boundingBox();

  await expect(page.locator('[data-caption]')).toContainText('Natural Earth');
  const after = await canvas.boundingBox();

  expect(after.height).toBeCloseTo(before.height, 0);
  expect(after.width).toBeCloseTo(before.width, 0);
  // A box with no height would satisfy the equality above and show nothing.
  expect(before.height).toBeGreaterThan(100);
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

test('a plain wheel scrolls the page; only Ctrl zooms the map', async ({ page }) => {
  /*
   * **The rule the whole arrangement is built around.** A map in the middle of
   * a scrolling page that swallows the wheel is a trap, and it is the reader
   * who wanted to scroll *past* it who pays. So a bare wheel must leave the map
   * alone, and this is the assertion that stops a later refactor from being
   * helpful about it.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  const box = await canvas.boundingBox();
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

  await page.mouse.move(centre.x, centre.y);
  await page.mouse.wheel(0, -400);
  expect(await zoomLevel(page), 'a bare wheel zoomed the map').toBe('1.0×');

  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -400);
  await page.keyboard.up('Control');
  expect(await zoomLevel(page), 'Ctrl and the wheel did not zoom').not.toBe('1.0×');
});

test('the map takes touch gestures only once the reader has zoomed in', async ({ page }) => {
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');

  // `pan-y` leaves the page's vertical scroll to the browser, which is what a
  // thumb on a phone is nearly always doing.
  await expect(canvas).toHaveCSS('touch-action', 'pan-y');

  await page.locator('[data-zoom="in"]').click();
  await expect(canvas).toHaveCSS('touch-action', 'none');

  // And one press of Reset hands it back, so the state is always escapable.
  await page.locator('[data-zoom="home"]').click();
  await expect(canvas).toHaveCSS('touch-action', 'pan-y');
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
   * The figure's height comes from `aspect-ratio`, so zooming redraws inside a
   * box that does not change — brief §13's no-layout-shift, which a control
   * that resized its own picture would break on every press.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  const before = await canvas.boundingBox();

  /*
   * The gap between the picture and the list, not either one's position on
   * screen. `locator.click()` scrolls its target into view (CLAUDE.md trap 3)
   * and the zoom buttons sit in the picture's bottom corner, so pressing one
   * moves the whole page under the viewport — the first version of this read
   * that as a 456 px layout shift, which is the trap doing exactly what the
   * trap list says it does. The distance between two boxes is a fact about the
   * layout and survives any amount of scrolling.
   */
  const gap = async () => {
    const c = await canvas.boundingBox();
    const list = await page.locator('.map-places').boundingBox();
    return list.y - (c.y + c.height);
  };
  const gapBefore = await gap();

  await page.locator('[data-zoom="in"]').click();
  await page.locator('[data-zoom="in"]').click();

  const after = await canvas.boundingBox();
  expect(after.height).toBeCloseTo(before.height, 0);
  expect(after.width).toBeCloseTo(before.width, 0);
  expect(await gap()).toBeCloseTo(gapBefore, 0);
});
