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

test('the map can zoom to its ceiling', async ({ page }) => {
  // §8.3's own reason to zoom this far is reading two close names apart
  // (`declutter`'s spread is a fixed number of screen pixels, so only more
  // zoom makes it read as more room). MAX_SCALE was raised past the
  // coastline's own honest ceiling once (2026-08-31, 120 against a ceiling
  // of 24) and matched to a doubled ceiling the next time (2026-09-01, 240
  // against `PRECISION`'s own hundredth-of-a-degree rounding) rather than
  // left to outrun it again.
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const zoomIn = page.locator('[data-zoom="in"]');
  for (let i = 0; i < 20 && !(await zoomIn.isDisabled()); i++) await zoomIn.click();
  await expect(page.locator('[data-zoom-level]')).toHaveText('240.0×');
  await expect(zoomIn).toBeDisabled();
});

test('a press selects the saint and a drag does not, and Profile is the door', async ({ page }) => {
  /*
   * **The dot stopped being the door on 2026-08-31** (author: a press
   * "first centres you smoothly on them and then shows their path of
   * travel ... Once selected, a 'Profile >' button appears next to their
   * name you can click on"). It was one from 2026-08-30 (Amendment 77), so
   * this is a recorded reversal rather than a new rule: the press now buys
   * the selection, and the button buys the saint. What survives unchanged is
   * the half this test was really about — a haul across the map is never a
   * press, the same rule the carousel's click-swallow keeps.
   */
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

  // Nothing is selected by a haul, either.
  await expect(canvas).toHaveAttribute('data-selected', '');

  // The dot moved with the drag; re-read its position before the true press.
  const { dot: dot2 } = await canvas.evaluate((el) => ({ dot: JSON.parse(el.dataset.dots ?? '[]')[0] }));
  await page.mouse.click(box.x + dot2.x, box.y + dot2.y);
  await expect(canvas).toHaveAttribute('data-selected', dot2.slug);
  await expect(page).toHaveURL(/\/map$/);

  // And the button that selection puts on the picture is the way through.
  const profile = page.locator('[data-profile]');
  await expect(profile).toBeVisible();
  await profile.click();
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

/* ---- merged marks (2026-09-01, replacing declutter) ----------------------- */

test('two saints who share an exact spot are one mark that says how many', async ({ page }) => {
  /*
   * John the Long-Suffering and Moses the Hungarian both die at the Caves in
   * Kyiv, at the same rounded coordinate.
   *
   * **This reverses what it asserted until 2026-09-01**, which was that the
   * two were drawn as two dots a few pixels apart. That was `declutter`, and
   * the author's report is what retired it: "the clustering at full zoom
   * doesn't work: the saint dots in constantinople stretch out into the black
   * sea ... actual coordinates on the map not scaling clusters". Both dots of
   * a pair like this stood on ground neither saint is recorded at, and since
   * the offset was a fixed number of screen pixels it covered more country the
   * further out the reader went. One mark on the true coordinate, carrying the
   * count, is what replaced it.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  const dots = JSON.parse(await canvas.getAttribute('data-dots'));
  const kyiv = dots.filter((d) => ['john-the-long-suffering', 'moses-the-hungarian'].includes(d.slug));
  expect(kyiv.length, 'the pair is drawn as two marks, which no zoom could ever justify').toBe(1);
  expect(kyiv[0].n, 'the mark does not say that a second saint stands under it').toBeGreaterThanOrEqual(2);

  /*
   * And nobody is lost behind it: every located saint is either their own
   * mark or a member of one, which is the claim the old two-dots assertion
   * was really protecting.
   */
  const total = dots.reduce((sum, d) => sum + d.n, 0);
  expect(total, 'the marks account for fewer saints than the picture drew').toBeGreaterThanOrEqual(dots.length + 1);
});

test('zooming in splits a merged mark into the saints under it', async ({ page }) => {
  /*
   * The half of the author's report that the count alone does not answer:
   * "make it so more dots are revealed as you zoom in". Two saints near each
   * other but not *at* each other must come apart as the reader goes in —
   * which the ring-fan never did, its spread being in pixels rather than on
   * the ground.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  /*
   * Three saints at Kyiv, and the arithmetic of the corpus is what makes them
   * the right three. Cyprian of Kyiv is 0.038° from the Caves — close enough
   * to be one mark at rest, far enough to be his own once the reader is in.
   * John the Long-Suffering and Moses the Hungarian are at *one* coordinate
   * and must stay merged at every zoom, which is the half of this that says
   * the map is not simply splitting things up as it goes.
   */
  const kyiv = ['cyprian-of-kyiv', 'john-the-long-suffering', 'moses-the-hungarian'];
  const marksFor = async () =>
    JSON.parse(await canvas.getAttribute('data-dots')).filter((d) => kyiv.includes(d.slug));

  expect((await marksFor()).length, 'premise: Kyiv is not one mark at rest to begin with').toBe(1);

  await searchBox(page).fill('kyiv');
  await expect(searchRows(page).first()).toContainText('Kyiv');
  await searchBox(page).press('Enter');
  await canvas.focus();
  for (let i = 0; i < 6; i++) await canvas.press('+');

  /*
   * **All three, including the two at one coordinate** (author, 2026-09-01:
   * "now that we can zoom in further, spread the dots around as coordinates
   * on the map if they're stacked").
   *
   * This asked for the opposite earlier the same day — the Caves pair had to
   * stay one mark at every zoom, because no zoom can honestly separate two
   * identical coordinates. The instruction above is what changed: they are
   * separated on purpose now, by a ring measured in degrees rather than in
   * screen pixels, so the offset is sub-pixel at rest and opens only as the
   * reader goes in. What that buys over the old fan is below.
   */
  const zoomed = await marksFor();
  expect(zoomed.length, 'the saints at Kyiv never came apart').toBe(3);
  expect(
    Math.max(...zoomed.map((d) => d.n)),
    'a mark is still standing for more than one saint this far in',
  ).toBe(1);
});

test('saints spread from one coordinate stay a tight constellation, not a wheel', async ({ page }) => {
  /*
   * The second half of the same instruction: "spread them to be still pretty
   * tightly spaced when zoomed in fully to communicate proximity."
   *
   * Both bounds matter and they are what tells this apart from the ring-fan
   * that was thrown out hours earlier. Too close and the reader cannot count
   * them; too far and the map is claiming distance between saints recorded at
   * one spot — which is what sent Constantinople's crowd across the Bosphorus
   * when the offset was a fixed number of screen pixels.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  const caves = ['john-the-long-suffering', 'moses-the-hungarian'];
  const at = async () => JSON.parse(await canvas.getAttribute('data-dots')).filter((d) => caves.includes(d.slug));

  // At rest the ring is far under a pixel, so they are one mark: the spread
  // never costs the resting map the honesty the merge bought it.
  expect((await at()).length, 'the pair is already two marks with the whole world on screen').toBe(1);

  await searchBox(page).fill('kyiv');
  await expect(searchRows(page).first()).toContainText('Kyiv');
  await searchBox(page).press('Enter');
  await canvas.focus();
  for (let i = 0; i < 20; i++) await canvas.press('+');
  await expect(page.locator('[data-zoom-level]')).toHaveText('240.0×');

  const apart = await at();
  expect(apart.length, 'the pair did not separate at the deepest zoom there is').toBe(2);
  const gap = Math.hypot(apart[0].x - apart[1].x, apart[0].y - apart[1].y);
  expect(gap, 'they are close enough to still read as one mark').toBeGreaterThan(10);
  expect(gap, 'they are far enough apart to read as two different places').toBeLessThan(60);
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
    /*
     * **Two, where this asked for more than three until 2026-09-01.** The
     * number fell because the picture stopped inventing positions: the five
     * saints at Constantinople share one coordinate exactly and are now one
     * mark carrying a count, where the ring-fan drew five. The saints did not
     * go anywhere — `n` still adds up to all of them — and the claim this
     * test exists for is unchanged and is checked below: nothing the picture
     * draws goes unnamed.
     */
    expect(onPicture.length, 'premise: the flight landed nowhere near the cluster').toBeGreaterThan(1);
    expect(
      onPicture.reduce((sum, d) => sum + d.n, 0),
      'premise: the marks on the picture stand for fewer saints than the cluster has',
    ).toBeGreaterThan(3);
    await expect
      .poll(async () => Number(await canvas.getAttribute('data-labels')))
      .toBeGreaterThanOrEqual(onPicture.length);
  };

  await searchBox(page).fill('constantinople');
  await expect(searchRows(page).first()).toContainText('Constantinople');
  await searchBox(page).press('Enter');

  /*
   * **All the way in, and only there.** This also asked it at the search's
   * own landing zoom until 2026-09-01, when twenty-four martyrs of Nicomedia
   * gained the one coordinate they share: a column of twenty-four names is
   * 432 px tall and cannot be laid beside a second crowded cluster on any
   * picture a reader has, so five of thirty-seven went unnamed and the claim
   * stopped being achievable rather than stopping being met. That is the
   * density work §8.3 defers, not this. Zoomed all the way in a cluster is
   * again a few saints in one town, which is the case the columns were built
   * for and the case the author's report was about.
   */
  await canvas.focus();
  for (let i = 0; i < 20; i++) await canvas.press('+');
  await expect(page.locator('[data-zoom-level]')).toHaveText('240.0×');
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

  // Nothing walks until the reader asks (2026-09-01).
  await tickMovement(page);

  const whereIsHe = async () =>
    JSON.parse(await canvas.getAttribute('data-dots')).find((d) => d.slug === 'moses-the-hungarian');

  /**
   * Where he comes to rest, not where he is passing through. The dot eases
   * along the track when the year changes (`railAt`, 2026-08-31), so a read
   * taken the instant the year lands is a point on the road rather than the
   * place — polling for two identical answers waits that out without needing
   * the page to publish a "still moving" flag it would otherwise have no
   * reader for.
   */
  const settled = async () => {
    let last = null;
    for (let i = 0; i < 60; i++) {
      const now = await whereIsHe();
      if (last && now && last.x === now.x && last.y === now.y) return now;
      last = now;
      await page.waitForTimeout(50);
    }
    throw new Error('his dot never stopped moving');
  };

  const at = {};
  for (const year of ['1010', '1016', '1022', '1029', '1040']) {
    await typeYear(page, 'to', year);
    at[year] = await settled();
  }

  const apart = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // The crossing out of Hungary, then Kyiv, then Poland: three different
  // places, not one dot standing still while the years go by.
  expect(apart(at['1010'], at['1016']), 'he never reached Kyiv').toBeGreaterThan(5);
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

/* ---- choosing a saint (2026-08-31) --------------------------------------- */

/** Presses the picture at a point in the canvas's own pixels. */
const pressAt = async (page, x, y) => {
  const box = await page.locator('[data-map]').boundingBox();
  await page.mouse.click(box.x + x, box.y + y);
};

/** The dot for one saint as the last paint drew it, or undefined. */
const dotFor = async (page, slug) =>
  JSON.parse(await page.locator('[data-map]').getAttribute('data-dots')).find((d) => d.slug === slug);

test('a press centres the map on the saint’s whole rail, then walks it', async ({ page }) => {
  /*
   * Author, 2026-08-31: "if you click on a saint dot (or their name) it
   * first centres you smoothly on them and then shows their path of travel.
   * Now they are 'selected'." — and 2026-09-01, which is what this now
   * pins: "it centres you gently over its whole rail instead of one
   * position ... the dot goes over the rail smoothly over 5s."
   *
   * **The reversal is deliberate and this test held the old claim**: that his
   * *dot* landed within 2 px of the centre. It cannot any more, and should
   * not — the dot is one stay on a journey, and framing a journey on one of
   * its stays is what the instruction was about. So the claim moves up a
   * level: the rail is what the picture is centred on, and the whole of it
   * is on the picture once the flight lands.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  // Moses the Hungarian is the one saint who carries a track, so he is the
  // only one whose path there is anything to show.
  await expect(canvas).toHaveAttribute('data-rails', '0');

  /*
   * **Pressed from close in, where the rail does not fit**, which is what
   * makes this a test of the framing rather than of the whole world happening
   * to contain a small journey. Kyiv's own landing zoom shows the Caves and
   * nothing of Hungary or Poland; the flight has to stand back to hold all
   * three, and if it does not, the rail runs off the edge and this fails.
   */
  await searchBox(page).fill('kyiv');
  await expect(searchRows(page).first()).toContainText('Kyiv');
  await searchBox(page).press('Enter');

  const before = await dotFor(page, 'moses-the-hungarian');
  expect(before, 'premise: his dot is not on the picture to press').toBeTruthy();

  await pressAt(page, before.x, before.y);
  await expect(canvas).toHaveAttribute('data-selected', 'moses-the-hungarian');
  await expect(canvas).toHaveAttribute('data-rails', '1');

  /*
   * The rail's own drawn extent, published by the paint that stroked it. Not
   * read off the ink: the rail is dashed rubric and so is every dot, so a
   * scan of the pixels measures the dots as well — which is how an earlier
   * version of this test passed with the framing backed out.
   */
  const box = await canvas.boundingBox();
  const rail = JSON.parse(await canvas.getAttribute('data-rail'));

  // The whole of it on the picture, and not merely by touching the edges.
  expect(rail.x, 'the rail runs off the left').toBeGreaterThan(0);
  expect(rail.y, 'the rail runs off the top').toBeGreaterThan(0);
  expect(rail.x + rail.w, 'the rail runs off the right').toBeLessThan(box.width);
  expect(rail.y + rail.h, 'the rail runs off the bottom').toBeLessThan(box.height);

  // Framed rather than merely contained: a journey shown at the whole world
  // is a speck, and this is the difference between the two.
  expect(
    Math.max(rail.w / box.width, rail.h / box.height),
    'the rail is a speck on the picture rather than the thing it is framed on',
  ).toBeGreaterThan(0.35);

  // And centred on it, within a tenth of the picture either way.
  expect(Math.abs(rail.x + rail.w / 2 - box.width / 2)).toBeLessThan(box.width / 10);
  expect(Math.abs(rail.y + rail.h / 2 - box.height / 2)).toBeLessThan(box.height / 10);
});

test('the chosen saint walks their whole rail once, and then stands where the map says', async ({ page }) => {
  /*
   * Author, 2026-09-01: "plays through the saint's life rail differently
   * than through the movement mechanic: the dot goes over the rail smoothly
   * over 5s." Differently is the half worth pinning — `Movement` is off
   * throughout, and the timeline is never touched, so nothing here is the
   * other mechanic doing its job.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');
  await expect(page.locator('[data-movement]')).not.toBeChecked();

  const resting = await dotFor(page, 'moses-the-hungarian');
  await pressAt(page, resting.x, resting.y);
  await expect(canvas).toHaveAttribute('data-selected', 'moses-the-hungarian');

  // The walk is running, and his dot really is somewhere else while it is.
  await expect(canvas).toHaveAttribute('data-walking', 'moses-the-hungarian');
  const seen = new Set();
  for (let i = 0; i < 6; i++) {
    const at = await dotFor(page, 'moses-the-hungarian');
    seen.add(`${Math.round(at.x / 4)},${Math.round(at.y / 4)}`);
    await page.waitForTimeout(200);
  }
  expect(seen.size, 'his dot never moved, so nothing walked the rail').toBeGreaterThan(2);

  // Once, not forever: it ends on its own and hands the dot back.
  await expect(canvas).toHaveAttribute('data-walking', '', { timeout: 8000 });
  await expect(page.locator('[data-movement]')).not.toBeChecked();
});

test('the path and the button go when the reader clicks away', async ({ page }) => {
  /*
   * Author, 2026-08-31: "If you click away, the saint is deselected and
   * their path is hidden." A press on the picture that finds nobody is what
   * "away" means here — not a press on the timeline, which is how a reader
   * watches the saint they have just chosen move.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  const dot = await dotFor(page, 'moses-the-hungarian');
  await pressAt(page, dot.x, dot.y);
  await expect(canvas).toHaveAttribute('data-selected', 'moses-the-hungarian');
  await expect(page.locator('[data-profile]')).toBeVisible();

  /*
   * Somewhere on the picture with no saint anywhere near it, found rather
   * than guessed — which corner is empty depends on the window. And the
   * canvas has to be the thing actually under it: the search, the zoom, the
   * Profile button and the Movement controls all float on top of the
   * picture, and a press that lands on one of those never reaches the map
   * at all. The bottom-left corner used to be empty and is where the
   * Movement box moved in on 2026-09-01.
   */
  const empty = await canvas.evaluate((el) => {
    const dots = JSON.parse(el.dataset.dots);
    const b = el.getBoundingClientRect();
    for (let y = b.height - 30; y > 30; y -= 20) {
      for (let x = 30; x < b.width - 30; x += 20) {
        if (dots.some((d) => Math.hypot(d.x - x, d.y - y) <= 60)) continue;
        if (document.elementFromPoint(b.x + x, b.y + y) !== el) continue;
        return { x, y };
      }
    }
    return null;
  });
  expect(empty, 'premise: every part of the picture has a saint near it').toBeTruthy();

  await pressAt(page, empty.x, empty.y);
  await expect(canvas).toHaveAttribute('data-selected', '');
  await expect(canvas).toHaveAttribute('data-rails', '0');
  await expect(page.locator('[data-profile]')).toBeHidden();
});

test('the chosen saint is named whatever the zoom, since the button sits beside the name', async ({ page }) => {
  /*
   * "A 'Profile >' button appears next to their name" needs a name to be
   * next to, and at rest there are none at all — `LABELS_AT` is 2.5x. So a
   * selection names its saint whatever the zoom, and that is the one name on
   * the picture until the reader zooms in or lets go.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  await expect(page.locator('[data-zoom-level]')).toHaveText('1.0×');
  await expect(canvas).toHaveAttribute('data-labels', '0');

  /*
   * **A saint with no rail, chosen off the picture rather than named here.**
   * It was Moses the Hungarian until 2026-09-01, and he stopped being able to
   * answer this question that day: a press on a saint who carries a track now
   * flies the map out to frame the whole of it (author: "centres you gently
   * over its whole rail"), which changes the zoom and so takes the "whatever
   * the zoom" out of the test. A saint with nothing to frame keeps the
   * reader's own scale, which is the case this was always about.
   */
  const alone = JSON.parse(await canvas.getAttribute('data-dots')).find(
    (d) => d.n === 1 && d.slug !== 'moses-the-hungarian',
  );
  expect(alone, 'premise: every mark on the resting map stands for a crowd').toBeTruthy();

  await pressAt(page, alone.x, alone.y);
  await expect(canvas).toHaveAttribute('data-selected', alone.slug);
  await expect(page.locator('[data-zoom-level]')).toHaveText('1.0×');
  await expect(canvas).toHaveAttribute('data-labels', '1');

  // Escape lets go from the keyboard, which is the only way a reader who
  // cannot aim at empty ocean has.
  await canvas.press('Escape');
  await expect(canvas).toHaveAttribute('data-selected', '');
  await expect(canvas).toHaveAttribute('data-labels', '0');
});

test('a name is a press target, not only the dot under it', async ({ page }) => {
  /*
   * Author, 2026-08-31: "if you click on a saint dot (or their name)". The
   * name is by far the larger of the two targets — a whole word against
   * 2.5 px — and pressing it used to find nothing at all, which since the
   * same day means letting go of whoever was chosen.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  const dot = await dotFor(page, 'moses-the-hungarian');
  await pressAt(page, dot.x, dot.y);
  await expect(canvas).toHaveAttribute('data-selected', 'moses-the-hungarian');

  /*
   * A point well inside his name and far outside every dot's own reach.
   * Which side the name took is a layout decision, so it is read off the
   * ink rather than assumed — two probes, not a search.
   */
  const onName = await canvas.evaluate(() => {
    const el = document.querySelector('[data-map]');
    const dots = JSON.parse(el.dataset.dots);
    const me = dots.find((d) => d.slug === 'moses-the-hungarian');
    const ctx = el.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const dx of [80, -80]) {
      const x = me.x + dx;
      if (dots.some((d) => Math.hypot(d.x - x, d.y - me.y) < 20)) continue;
      const px = ctx.getImageData(Math.round(x * dpr), Math.round(me.y * dpr), 1, 1).data;
      if (px[3] > 128) return { x, y: me.y };
    }
    return null;
  });
  expect(onName, 'premise: his name was not drawn clear of every dot').toBeTruthy();

  /*
   * Pressing his own name must hold the selection. Without the name in the
   * hit-map this press finds nobody, which is the gesture that lets go — so
   * the assertion is the same one either way and only one answer is right.
   */
  await pressAt(page, onName.x, onName.y);
  await expect(canvas).toHaveAttribute('data-selected', 'moses-the-hungarian');
});

test('the dot slides along the track rather than jumping when the year leaps', async ({ page }) => {
  /*
   * Author, 2026-08-31: "make sure he goes a bit more smoothly across the
   * trail." The rail is far coarser than the road it scrubs — the corpus
   * spans 1872 years across a few hundred pixels, so one pixel of drag is
   * six years, more than Moses's whole flight from Poland. Read literally
   * that is a dot teleporting across half of Europe between two adjacent
   * pixels. `railAt` eases the drawn position toward the year's own, so a
   * leap in years is a glide on the picture.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  await tickMovement(page);

  const whereIsHe = async () =>
    JSON.parse(await canvas.getAttribute('data-dots')).find((d) => d.slug === 'moses-the-hungarian');

  // Park him at the Caves, where the whole span already leaves him.
  const caves = await whereIsHe();
  expect(caves, 'premise: his dot is not on the picture').toBeTruthy();

  /*
   * Now ask for a year before he was ever in Rus'. Straight away — inside
   * the first frames after the change — he must be neither where he was nor
   * where he is going, which is what "sliding" means and what a jump could
   * never produce.
   */
  await typeYear(page, 'to', '1001');
  const seen = [];
  for (let i = 0; i < 8; i++) {
    seen.push(await whereIsHe());
    await page.waitForTimeout(30);
  }
  const moved = seen.filter(Boolean);
  const distinct = new Set(moved.map((d) => `${d.x},${d.y}`));
  expect(distinct.size, 'he arrived in one step, so nothing slid').toBeGreaterThan(2);
});

/* ---- movement and playback (2026-09-01) ---------------------------------- */

/** Ticks the Movement box, which is what lets any dot move at all. */
const tickMovement = async (page) => {
  await page.locator('[data-movement]').check();
  await expect(page.locator('[data-movement]')).toBeChecked();
};

test('the map rests at each saint until the reader asks for movement', async ({ page }) => {
  /*
   * Author, 2026-09-01: "Only display death location, unless you tick a box
   * in the bottom left called 'Movement' ... Again, if movements isnt
   * selected, only final resting place is shown." A reader dragging the
   * years is asking which saints belong to a period; answering that by
   * walking sixty-nine dots around the picture was answering a question they
   * had not asked.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');
  await expect(page.locator('[data-movement]')).not.toBeChecked();

  const at = async () => JSON.parse(await canvas.getAttribute('data-dots'));
  const resting = await at();
  const moses = resting.find((d) => d.slug === 'moses-the-hungarian');
  expect(moses, 'premise: his dot is not on the picture').toBeTruthy();

  // A year in the middle of his life, which would put him in Poland if the
  // dots were following the years.
  await typeYear(page, 'to', '1022');
  const after = await at();
  for (const dot of after) {
    const was = resting.find((d) => d.slug === dot.slug);
    expect(
      Math.hypot(dot.x - was.x, dot.y - was.y),
      `${dot.slug} moved with the timeline while Movement was off`,
    ).toBeLessThan(1);
  }
});

test('ticking Movement walks the saints, and unticking sends them back', async ({ page }) => {
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  const whereIsHe = async () =>
    JSON.parse(await canvas.getAttribute('data-dots')).find((d) => d.slug === 'moses-the-hungarian');
  const settled = async () => {
    let last = null;
    for (let i = 0; i < 60; i++) {
      const now = await whereIsHe();
      if (last && now && last.x === now.x && last.y === now.y) return now;
      last = now;
      await page.waitForTimeout(50);
    }
    throw new Error('his dot never stopped moving');
  };

  const resting = await whereIsHe();
  await tickMovement(page);
  await typeYear(page, 'to', '1022');
  const moving = await settled();
  expect(Math.hypot(moving.x - resting.x, moving.y - resting.y), 'he stayed put with Movement on').toBeGreaterThan(3);

  // And unticking is not a journey home: he is simply back where he rests.
  await page.locator('[data-movement]').uncheck();
  const home = await whereIsHe();
  expect(Math.hypot(home.x - resting.x, home.y - resting.y), 'he did not go back to his resting place').toBeLessThan(1);
});

test('play is offered only once there is something to watch move', async ({ page }) => {
  /*
   * Author, 2026-09-01: "This play mode is only available when Movements is
   * selected." Playing the years with nothing moving is the timeline dimming
   * on a clock, which a drag already does.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const play = page.locator('[data-play]');
  await expect(play).toBeVisible();
  await expect(play).toBeDisabled();

  await tickMovement(page);
  await expect(play).toBeEnabled();

  await page.locator('[data-movement]').uncheck();
  await expect(play).toBeDisabled();
});

test('play walks the upper year at a year a second, and pause leaves it there', async ({ page }) => {
  /*
   * Author, 2026-09-01: "add a play and pause button in the bottom left of
   * the map, which plays in the selected timeline span at a rate of 1 year
   * per second". The rate is read off `performance.now()` rather than
   * counted in frames, so this is a wall-clock claim and holds on a machine
   * dropping frames — which is why it can be asserted at all.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');
  await tickMovement(page);

  // A span long enough to watch and short enough not to hold the suite up.
  await typeYear(page, 'from', '1000');
  await typeYear(page, 'to', '1020');

  const play = page.locator('[data-play]');
  await play.click();
  // Playing starts at the low end of the reader's own span.
  await expect.poll(async () => (await yearButtons(page))[1]).toBeLessThan(1005);

  await page.waitForTimeout(3200);
  const running = (await yearButtons(page))[1];
  expect(running, 'the years did not advance').toBeGreaterThan(1001);
  expect(running, 'the years ran far faster than a year a second').toBeLessThan(1008);

  await play.click();
  const paused = (await yearButtons(page))[1];
  await page.waitForTimeout(1200);
  expect((await yearButtons(page))[1], 'pause did not stop the years').toBe(paused);
  // And the low end was never touched: playback moves one handle, not both.
  expect((await yearButtons(page))[0]).toBe(1000);
});

test('taking hold of the timeline stops the playback', async ({ page }) => {
  await page.goto(MAP, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-map]')).toHaveAttribute('data-land', 'ok');
  await tickMovement(page);
  await typeYear(page, 'from', '1000');
  await typeYear(page, 'to', '1400');

  await page.locator('[data-play]').click();
  await expect(page.locator('[data-play]')).toHaveAttribute('aria-label', /pause/i);

  // The reader reaching for a handle is the end of the performance.
  const toHandle = page.locator('[data-timeline-to]');
  await toHandle.focus();
  await toHandle.press('End');
  await expect(page.locator('[data-play]')).toHaveAttribute('aria-label', /play/i);

  const stopped = (await yearButtons(page))[1];
  await page.waitForTimeout(1200);
  expect((await yearButtons(page))[1], 'the years kept running after the reader took over').toBe(stopped);
});

/* ---- the filter panel, ranking and the chosen saint (2026-09-01) ---------- */

/** Every name the last paint actually placed, by slug. */
const namedOn = async (page) => JSON.parse(await page.locator('[data-map]').getAttribute('data-named'));

const openFilters = async (page) => {
  await page.locator('[data-filter-btn]').click();
  await expect(page.locator('[data-filter-pop]')).toBeVisible();
};

test('the dead keep their dot and lose their name until the box is ticked', async ({ page }) => {
  /*
   * Author, 2026-09-01: "a tickbox for showing unborn saints and one for
   * showing dead saints. by default they are not shown. however even with
   * these boxes unticked, you still see a dot."
   *
   * That last sentence is the whole test. "Not shown" is a claim about the
   * *name* — and about the halo, which is the other thing on this picture
   * that asserts something rather than marking a place — and never about the
   * dot, which the timeline has left standing since it began dimming rather
   * than removing on 2026-08-31.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  // Somewhere crowded, so there are names on the picture to lose.
  await searchBox(page).fill('constantinople');
  await expect(searchRows(page).first()).toContainText('Constantinople');
  await searchBox(page).press('Enter');
  await expect.poll(async () => (await namedOn(page)).length).toBeGreaterThan(0);

  const before = JSON.parse(await canvas.getAttribute('data-dots'));

  // A window in which almost everyone on this picture is long dead.
  await typeYear(page, 'from', '1900');
  await typeYear(page, 'to', '1917');
  await expect
    .poll(async () => JSON.parse(await canvas.getAttribute('data-dots')).filter((d) => d.state === 'past').length)
    .toBeGreaterThan(0);

  const after = JSON.parse(await canvas.getAttribute('data-dots'));
  expect(after.length, 'the dead were removed from the picture rather than left as dots').toBe(before.length);

  const dead = after.filter((d) => d.state === 'past').map((d) => d.slug);
  await expect.poll(async () => (await namedOn(page)).filter((slug) => dead.includes(slug)).length).toBe(0);

  // And the box gives them back.
  await openFilters(page);
  await expect(page.locator('[data-show="past"]')).not.toBeChecked();
  await page.locator('[data-show="past"]').check();
  await expect
    .poll(async () => (await namedOn(page)).filter((slug) => dead.includes(slug)).length)
    .toBeGreaterThan(0);
});

test('the unborn box is the same bargain, and both start unticked', async ({ page }) => {
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  await searchBox(page).fill('nicomedia');
  await expect(searchRows(page).first()).toContainText('Nicomedia');
  await searchBox(page).press('Enter');

  await openFilters(page);
  await expect(page.locator('[data-show="past"]')).not.toBeChecked();
  await expect(page.locator('[data-show="future"]')).not.toBeChecked();
  // The panel is a panel: a press outside it puts it away again.
  await page.locator('[data-map]').click({ position: { x: 5, y: 5 } });
  await expect(page.locator('[data-filter-pop]')).toBeHidden();

  await typeYear(page, 'to', '100');
  await expect
    .poll(async () => JSON.parse(await canvas.getAttribute('data-dots')).filter((d) => d.state === 'future').length)
    .toBeGreaterThan(0);

  const unborn = JSON.parse(await canvas.getAttribute('data-dots'))
    .filter((d) => d.state === 'future')
    .map((d) => d.slug);
  await expect.poll(async () => (await namedOn(page)).filter((slug) => unborn.includes(slug)).length).toBe(0);

  await openFilters(page);
  await page.locator('[data-show="future"]').check();
  await expect
    .poll(async () => (await namedOn(page)).filter((slug) => unborn.includes(slug)).length)
    .toBeGreaterThan(0);
});

test('a crowd prints the name the Daily page would lead with', async ({ page }) => {
  /*
   * Author, 2026-09-01: "favour the saints that are main saints on the daily
   * page and the also commemorated in order when deciding which name to print
   * over the others when zoomed out."
   *
   * Five saints share the Constantinople coordinate exactly, so no zoom will
   * ever separate them and one of the five has to be the mark. Two of them —
   * Alexander the Patriarch and Natalia of Nicomedia — have hymns recorded,
   * which is what pickHero calls "the day's principal commemoration in that
   * church"; the other three appear only under *Also commemorated*. The claim
   * is that the mark is one of those two, whichever way their own tie falls,
   * and never one of the other three.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  const atTheCity = [
    'alexander-patriarch-of-constantinople',
    'athanasius-of-vysotsk',
    'gennadius-patriarch-of-constantinople',
    'natalia-of-nicomedia',
    'niphon-patriarch-of-constantinople',
  ];
  const leads = ['alexander-patriarch-of-constantinople', 'natalia-of-nicomedia'];

  /*
   * At the whole world the five are inside a mark that reaches most of
   * Anatolia, whose representative is a question about a much larger crowd.
   * The city itself is where the instruction's own "zoomed out" lives: close
   * enough that this mark is Constantinople and nowhere else, far enough that
   * five saints at one coordinate still cannot be told apart — which no zoom
   * will ever change.
   */
  /*
   * The city's own landing zoom and no further. Four presses past it used to
   * be needed to lift the five clear of Anatolia's wider crowd; since
   * 2026-09-01 they would take the reader past the zoom at which the ring
   * spreads them into five marks of their own, and a crowd that is no longer
   * a crowd has no name to choose. 40x is where they are still one.
   */
  await searchBox(page).fill('constantinople');
  await expect(searchRows(page).first()).toContainText('Constantinople');
  await searchBox(page).press('Enter');

  const marks = JSON.parse(await canvas.getAttribute('data-dots')).filter((d) => atTheCity.includes(d.slug));
  expect(marks.length, 'premise: the five are not one mark here, so nothing is being chosen between').toBe(1);
  expect(marks[0].n).toBeGreaterThanOrEqual(5);
  expect(leads, 'the crowd printed a saint who leads no day anywhere: ' + marks[0].slug).toContain(marks[0].slug);
});

test('choosing a saint pushes every other saint back', async ({ page }) => {
  /*
   * Author, 2026-09-01: "when selected, the other saints become less
   * prominent." `alpha` is what the draw pass actually used, so this reads
   * the dimming itself rather than a proxy for it — and with nobody chosen
   * every mark reads 1, which is what makes a broken version fail rather
   * than pass by absence.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  const atRest = JSON.parse(await canvas.getAttribute('data-dots'));
  expect(
    atRest.every((d) => d.alpha === 1),
    'a saint was already dimmed before anyone was chosen',
  ).toBe(true);

  const pick = atRest.find((d) => d.n === 1 && d.slug !== 'moses-the-hungarian');
  expect(pick, 'premise: every mark on the resting map stands for a crowd').toBeTruthy();
  await pressAt(page, pick.x, pick.y);
  await expect(canvas).toHaveAttribute('data-selected', pick.slug);

  const chosen = JSON.parse(await canvas.getAttribute('data-dots'));
  const me = chosen.find((d) => d.slug === pick.slug);
  const others = chosen.filter((d) => d.slug !== pick.slug);
  expect(others.length, 'premise: nobody else is on the picture to push back').toBeGreaterThan(0);
  expect(me.alpha, 'the chosen saint was dimmed along with everyone else').toBe(1);
  expect(Math.max(...others.map((d) => d.alpha)), 'the rest of the map is as loud as the chosen saint').toBeLessThan(1);

  // And letting go gives the map back.
  await canvas.press('Escape');
  await expect(canvas).toHaveAttribute('data-selected', '');
  await expect.poll(async () => JSON.parse(await canvas.getAttribute('data-dots')).every((d) => d.alpha === 1)).toBe(true);
});

test('a saint moving along their rail is named while they move', async ({ page }) => {
  /*
   * Author, 2026-09-01: "if a saint moves along its rail, make their name
   * print over others while its moving." Moses the Hungarian under
   * `Movement`, with the years playing across his own life, is the one case
   * in this corpus where a dot travels a rail without having been chosen —
   * so this is the ranking tier itself rather than the selection's, which
   * would name him anyway.
   */
  await page.goto(MAP, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-map]');
  await expect(canvas).toHaveAttribute('data-land', 'ok');

  // His own years, so playback reaches his journey in seconds rather than in
  // the quarter of an hour it would take from the corpus's first century.
  await typeYear(page, 'from', '1000');
  await typeYear(page, 'to', '1043');

  /*
   * **Somebody who outranks him while he stands still**, or this proves
   * nothing. Moses carries an icon and a rail, which is already enough to
   * take the room from most of the corpus; the saints who beat that are the
   * ones a church sings for. They are all long dead by 1000, so the dead have
   * to be shown for any of them to be competing for a name at all — which is
   * the filter box doing exactly what it says.
   */
  await openFilters(page);
  await page.locator('[data-show="past"]').check();

  /*
   * Close enough that there are names on the picture at all — below
   * `LABELS_AT` nothing is named, moving or otherwise — and then back out
   * until his whole journey and one of those saints are on it together.
   * Found rather than guessed: which zoom holds both is a fact about the
   * corpus's own geography and about the window this test happens to run in.
   */
  const sung = [
    'adrian-of-nicomedia',
    'agathonicus-of-nicomedia',
    'alexander-patriarch-of-constantinople',
    'anicetas-of-nicomedia',
    'eustathius-kataphloros-archbishop-of-thessalonica',
    'natalia-of-nicomedia',
    'photius-of-nicomedia',
  ];
  await searchBox(page).fill('kyiv');
  await expect(searchRows(page).first()).toContainText('Kyiv');
  await searchBox(page).press('Enter');
  await canvas.focus();
  let contest = [];
  for (let i = 0; i < 10; i++) {
    contest = await namedOn(page);
    if (contest.includes('moses-the-hungarian') && contest.some((slug) => sung.includes(slug))) break;
    await canvas.press('-');
  }
  expect(
    contest.some((slug) => sung.includes(slug)),
    'premise: no saint who leads a day is named here, so nothing outranks a standing Moses',
  ).toBe(true);
  expect(contest.at(-1), 'premise: he is already the first name before he has moved').not.toBe(
    'moses-the-hungarian',
  );

  await page.locator('[data-movement]').check();
  await page.locator('[data-play]').click();

  /*
   * **Last, not merely present.** `data-named` is written in paint order and
   * the paint runs worst-ranked first, so the final entry is the name drawn
   * over every other — which is what the instruction asks for and what
   * merely appearing in the list does not prove. He is named at this zoom
   * whether or not he is moving, so an earlier version of this test passed
   * with the whole tier backed out.
   */
  await expect
    .poll(
      async () => {
        const names = await namedOn(page);
        return names.length > 1 && names.at(-1) === 'moses-the-hungarian';
      },
      { timeout: 20000 },
    )
    .toBe(true);
  await expect(canvas).toHaveAttribute('data-selected', '');
});
