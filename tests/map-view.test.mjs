import test from 'node:test';
import assert from 'node:assert/strict';

import { HOME, MAX_SCALE, MIN_SCALE, clampCentre, clampView, coverFractions, panBy, toScreen, toWorld, zoomAbout } from '../src/lib/map-view.js';

/*
 * The map's view, held to the two things that are actually easy to get wrong
 * and hard to see: a pan that walks the world off its own box, and a zoom that
 * drifts away from the thing being zoomed at. Both are arithmetic, so neither
 * needs a browser — and a drift of a few percent per step is exactly the kind
 * of bug that looks fine in a screenshot and is maddening to use.
 */

const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} is not within ${tol} of ${b}`);

test('the whole world is the way out, and there is nothing beyond it', () => {
  assert.equal(clampView({ ...HOME, scale: 0.2 }).scale, MIN_SCALE);
  assert.equal(clampView({ ...HOME, scale: 500 }).scale, MAX_SCALE);
});

test('unzoomed, there is nowhere to pan to', () => {
  // The box is the world at scale 1, so a drag must not slide the Atlantic off
  // the side. The clamp range collapses to the single point 0.5.
  const panned = panBy(HOME, 0.4, -0.3);
  near(panned.cx, 0.5);
  near(panned.cy, 0.5);
});

test('the world never comes away from the edges of its box', () => {
  for (const scale of [1, 1.5, 2, 5, MAX_SCALE]) {
    for (const [cx, cy] of [[-5, -5], [5, 5], [0, 1], [1, 0]]) {
      const v = clampView({ scale, cx, cy });
      const half = 0.5 / scale;
      assert.ok(v.cx >= half - 1e-9 && v.cx <= 1 - half + 1e-9, `cx ${v.cx} escaped at scale ${scale}`);
      assert.ok(v.cy >= half - 1e-9 && v.cy <= 1 - half + 1e-9, `cy ${v.cy} escaped at scale ${scale}`);
      // Said the other way, which is the way a reader would notice: the box's
      // own corners still land inside the world.
      const tl = toScreen(v, 0, 0);
      const br = toScreen(v, 1, 1);
      assert.ok(tl.x <= 1e-9 && tl.y <= 1e-9, `a gap opened at the top left at scale ${scale}`);
      assert.ok(br.x >= 1 - 1e-9 && br.y >= 1 - 1e-9, `a gap opened at the bottom right at scale ${scale}`);
    }
  }
});

test('the centre of the world is the centre of the box, unzoomed', () => {
  const p = toScreen(HOME, 0.5, 0.5);
  near(p.x, 0.5);
  near(p.y, 0.5);
});

test('screen and world are each other read backwards', () => {
  const v = clampView({ scale: 4, cx: 0.55, cy: 0.4 });
  for (const [ax, ay] of [[0.5, 0.5], [0, 0], [1, 1], [0.23, 0.77]]) {
    const { px, py } = toWorld(v, ax, ay);
    const back = toScreen(v, px, py);
    near(back.x, ax);
    near(back.y, ay);
  }
});

test('zooming at a point leaves that point where it was', () => {
  /*
   * The whole difference between zooming *at* something and zooming and then
   * hunting for it again. Anchors away from the centre, and a zoom deep enough
   * that a per-step drift of even a percent would be obvious by the end.
   */
  let v = clampView({ scale: 2, cx: 0.5, cy: 0.5 });
  const anchor = [0.3, 0.7];
  const target = toWorld(v, ...anchor);

  for (let i = 0; i < 6; i++) v = zoomAbout(v, 1.4, ...anchor);

  assert.ok(v.scale > 2, 'it did not actually zoom');
  const now = toScreen(v, target.px, target.py);
  near(now.x, anchor[0], 1e-6);
  near(now.y, anchor[1], 1e-6);
});

test('zooming out from anywhere comes home to the whole world', () => {
  let v = clampView({ scale: MAX_SCALE, cx: 0.9, cy: 0.1 });
  for (let i = 0; i < 40; i++) v = zoomAbout(v, 1 / 1.4, 0.5, 0.5);
  assert.equal(v.scale, MIN_SCALE);
  // And the centre came back with it rather than staying stuck in a corner.
  near(v.cx, 0.5);
  near(v.cy, 0.5);
});

test('a drag moves the land with the finger at every zoom', () => {
  /*
   * Panning in fractions of the *box*: dragging a tenth of the width should
   * move the map a tenth of the width, whatever the scale — so the world
   * distance covered shrinks as you zoom in. Divide by the wrong thing and the
   * map races the pointer when zoomed, which is the classic version of this
   * bug.
   */
  const dx = 0.1;
  for (const scale of [2, 4, 8]) {
    const v = clampView({ scale, cx: 0.5, cy: 0.5 });
    const before = toScreen(v, v.cx, v.cy);
    const after = toScreen(panBy(v, dx, 0), v.cx, v.cy);
    near(after.x - before.x, dx, 1e-9);
  }
});

/* ---- covering a window of any shape (2026-08-29) ------------------------ */

test('the world covers its box rather than fitting inside it', () => {
  /*
   * The stage is the browser window now, and a window is whatever shape the
   * reader made it. Fitting would letterbox — dead ground down the sides of a
   * wide desktop, and a map filling less than half a phone. So one axis shows
   * the whole world and the other is cropped, and which one depends on whether
   * the box is wider or narrower than the projection.
   */
  const A = 1.1243;

  // A wide desktop window: full width, cropped top and bottom.
  const wide = coverFractions(1280, 860, A);
  near(wide.fx, 1, 1e-12);
  assert.ok(wide.fy < 1, `nothing was cropped: fy ${wide.fy}`);

  // A phone: full height, cropped left and right.
  const tall = coverFractions(360, 700, A);
  near(tall.fy, 1, 1e-12);
  assert.ok(tall.fx < 1, `nothing was cropped: fx ${tall.fx}`);

  // A box of the projection's own shape crops nothing at all.
  const exact = coverFractions(1124.3, 1000, A);
  near(exact.fx, 1, 1e-6);
  near(exact.fy, 1, 1e-6);
});

test('there is nowhere to pan on the axis that already shows everything', () => {
  const wide = coverFractions(1280, 860, 1.1243);
  // Full width: sliding sideways is refused, and the crop top-to-bottom is not.
  const panned = panBy(HOME, 0.3, 0.3, wide);
  near(panned.cx, 0.5);
  assert.ok(panned.cy !== 0.5, 'the cropped axis should have somewhere to go');
});

test('a covered box stays covered, at every scale and in either shape', () => {
  for (const [w, h] of [[1280, 860], [360, 700], [1000, 1000]]) {
    const frame = coverFractions(w, h, 1.1243);
    for (const scale of [1, 2, 5, MAX_SCALE]) {
      for (const [cx, cy] of [[-5, -5], [5, 5], [0, 1], [1, 0]]) {
        const v = clampView({ scale, cx, cy }, frame);
        // The box's own corners still land inside the world — no dead ground
        // anywhere, which is the promise "cover" makes.
        const tl = toScreen(v, 0, 0, frame);
        const br = toScreen(v, 1, 1, frame);
        assert.ok(tl.x <= 1e-9 && tl.y <= 1e-9, `a gap opened at the top left in ${w}x${h} at ${scale}`);
        assert.ok(br.x >= 1 - 1e-9 && br.y >= 1 - 1e-9, `a gap opened at the bottom right in ${w}x${h} at ${scale}`);
      }
    }
  }
});

test('zooming at a point still holds it still in a cropped box', () => {
  const frame = coverFractions(1280, 860, 1.1243);
  let v = clampView({ scale: 2, cx: 0.5, cy: 0.5 }, frame);
  const anchor = [0.3, 0.7];
  const target = toWorld(v, ...anchor, frame);

  for (let i = 0; i < 6; i++) v = zoomAbout(v, 1.4, ...anchor, frame);

  const now = toScreen(v, target.px, target.py, frame);
  near(now.x, anchor[0], 1e-6);
  near(now.y, anchor[1], 1e-6);
});
