import test from 'node:test';
import assert from 'node:assert/strict';

import { HOME, MAX_SCALE, MERGE_PX, MIN_SCALE, WHOLE, clampCentre, clampView, coverFractions, fitBounds, mergeDots, panBy, spreadShared, toScreen, toWorld, zoomAbout } from '../src/lib/map-view.js';

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
/*
 * `mergeDots` — what replaced the ring-fan on 2026-09-01, and the pair of
 * failures it was replacing are what these hold it to.
 *
 * The fan drew every saint of a crowd at a position invented for them, a
 * fixed number of *screen* pixels from the spot they shared: at Constantinople
 * that reached across the Bosphorus and into the Black Sea, and because the
 * spread was in pixels rather than on the ground it never dissolved — the
 * same wheel at 1x and at 240x. So the two claims worth pinning are that
 * every mark sits on a coordinate a saint really holds, and that zooming in
 * really does reveal the members rather than redrawing the same knot.
 */

test('a mark stands exactly where its own saint stands', () => {
  const out = mergeDots([{ x: 100, y: 200, slug: 'alone' }]);
  assert.equal(out.length, 1);
  near(out[0].x, 100, 1e-9);
  near(out[0].y, 200, 1e-9);
  assert.equal(out[0].n, 1);
});

test('dots the reader can tell apart are left as they are', () => {
  const points = [{ x: 0, y: 0, slug: 'a' }, { x: 500, y: 500, slug: 'b' }];
  const out = mergeDots(points);
  assert.equal(out.length, 2);
  for (const p of out) assert.equal(p.n, 1);
});

test('two saints at one coordinate are one mark that says so, not two invented places', () => {
  const out = mergeDots([
    { x: 50, y: 50, slug: 'john-the-long-suffering' },
    { x: 50, y: 50, slug: 'moses-the-hungarian' },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].n, 2);
  // On the spot itself — the old fan moved both off it and this must not.
  near(out[0].x, 50, 1e-9);
  near(out[0].y, 50, 1e-9);
  assert.deepEqual(out[0].members.map((p) => p.slug).sort(), ['john-the-long-suffering', 'moses-the-hungarian']);
});

test('zooming in reveals the members, one mark at a time', () => {
  /*
   * The same two saints, 3 px apart on the ground, as the reader zooms: the
   * gap between them grows with the scale and the moment it passes `MERGE_PX`
   * they are two marks. This is the property the fan never had — its ring was
   * the same size at every zoom, so a crowd stayed a crowd forever.
   */
  const seen = [1, 2, 4, 8].map((scale) => {
    const points = [{ x: 0, y: 0, slug: 'a' }, { x: 3 * scale, y: 0, slug: 'b' }];
    return mergeDots(points).length;
  });
  assert.deepEqual(seen, [1, 1, 2, 2], 'the pair should split once their gap passes MERGE_PX');
  // And every mark, merged or not, is still on one of the two real spots.
  for (const scale of [1, 8]) {
    const xs = [0, 3 * scale];
    for (const mark of mergeDots([{ x: 0, y: 0 }, { x: 3 * scale, y: 0 }])) {
      assert.ok(xs.includes(mark.x), `a mark at ${mark.x} is on neither saint's own coordinate`);
    }
  }
});

test('the members of a mark add up to every saint handed in', () => {
  const stack = Array.from({ length: 24 }, (_, i) => ({ x: 100, y: 100, slug: `m${i}` }));
  const out = mergeDots([...stack, { x: 400, y: 400, slug: 'far' }]);
  assert.equal(out.length, 2);
  assert.equal(
    out.reduce((sum, m) => sum + m.n, 0),
    25,
    'a saint went missing between the dots and the marks',
  );
});

test('the mark is the best-ranked of its members, whatever order they arrived in', () => {
  // Rank is what `views/map.js` sorts names by — the chosen saint, then one
  // that is moving, then the Daily page's own precedence. A crowd prints the
  // best-ranked name of it, so that saint has to be the mark itself.
  const points = [
    { x: 10, y: 10, slug: 'also-commemorated', rank: 4 },
    { x: 12, y: 10, slug: 'leads-a-day', rank: 2 },
    { x: 11, y: 11, slug: 'another', rank: 4 },
  ];
  const out = mergeDots(points, undefined, (p) => p.rank);
  assert.equal(out.length, 1);
  assert.equal(out[0].slug, 'leads-a-day');
  assert.equal(out[0].n, 3);
});

test('a bigger radius merges more, a smaller one less', () => {
  const points = [{ x: 0, y: 0 }, { x: 20, y: 0 }];
  assert.equal(mergeDots(points, 4).length, 2);
  assert.equal(mergeDots(points, 40).length, 1);
});

/*
 * `fitBounds` — "centres you gently over its whole rail instead of one
 * position" (author, 2026-09-01). A journey framed on the stay the dot
 * happens to stand on is a journey whose ends the reader cannot see, so the
 * claims are that everything handed in lands on the picture, and that it is
 * centred rather than merely contained.
 */

test('a whole rail fits inside the box, with room to spare', () => {
  const frame = WHOLE;
  const rail = [
    { x: 0.52, y: 0.3 },
    { x: 0.56, y: 0.34 },
    { x: 0.54, y: 0.28 },
  ];
  const v = fitBounds(rail, frame);
  for (const p of rail) {
    const s = toScreen(v, p.x, p.y, frame);
    assert.ok(s.x > 0 && s.x < 1 && s.y > 0 && s.y < 1, `a stay landed off the picture at ${s.x}, ${s.y}`);
    // The margin is real room, not a rounding: nothing sits against an edge.
    assert.ok(s.x > 0.1 && s.x < 0.9, `a stay is jammed against the side at ${s.x}`);
  }
});

test('the rail is centred on its own middle, not on one of its ends', () => {
  const rail = [{ x: 0.4, y: 0.4 }, { x: 0.6, y: 0.5 }];
  const v = fitBounds(rail, WHOLE);
  const mid = toScreen(v, 0.5, 0.45, WHOLE);
  near(mid.x, 0.5, 1e-9);
  near(mid.y, 0.5, 1e-9);
});

test('a rail with no extent asks for the deepest zoom, and the caller caps it', () => {
  // One stay is a point, and a point fits at any scale — so this hands back
  // the ceiling rather than a division by zero, and `views/map.js` holds it
  // to `RAIL_FIT_MAX` for the reader's sake.
  const v = fitBounds([{ x: 0.5, y: 0.5 }], WHOLE);
  assert.equal(v.scale, MAX_SCALE);
});

test('a rail wider than the world cannot zoom past the whole of it', () => {
  const v = fitBounds([{ x: 0.01, y: 0.01 }, { x: 0.99, y: 0.99 }], WHOLE);
  assert.equal(v.scale, MIN_SCALE);
});

/*
 * `spreadShared` — the ring that opens as the reader zooms, in degrees rather
 * than in screen pixels (author, 2026-09-01: "spread the dots around as
 * coordinates on the map if they're stacked ... still pretty tightly spaced
 * when zoomed in fully to communicate proximity").
 *
 * The unit is the whole of it, and the reason there are tests here at all:
 * the fan this replaces was measured in pixels, so it covered more country
 * the further out the reader went and never resolved at any zoom. A ground
 * offset is the opposite on both counts — invisible at rest, opening only as
 * the picture magnifies — and neither property is visible in a screenshot.
 */

test('a saint standing alone is not moved at all', () => {
  const points = [{ lon: 30.5, lat: 50.4, slug: 'alone' }];
  assert.deepEqual(spreadShared(points), points);
});

test('saints at different coordinates are left where they are', () => {
  // Close, but not identical: the map can already tell these apart by zooming,
  // so moving them would be inventing a distance for no reason.
  const points = [
    { lon: 30.5234, lat: 50.4501, slug: 'cyprian' },
    { lon: 30.5578, lat: 50.4344, slug: 'moses' },
  ];
  assert.deepEqual(spreadShared(points), points);
});

test('saints at one coordinate are moved off it, and each somewhere different', () => {
  const out = spreadShared([
    { lon: 30.5578, lat: 50.4344, slug: 'john' },
    { lon: 30.5578, lat: 50.4344, slug: 'moses' },
  ]);
  assert.equal(out.length, 2);
  for (const p of out) assert.notEqual(`${p.lon},${p.lat}`, '30.5578,50.4344');
  assert.notEqual(`${out[0].lon},${out[0].lat}`, `${out[1].lon},${out[1].lat}`);
  // Every other field travels with the point.
  assert.deepEqual(out.map((p) => p.slug).sort(), ['john', 'moses']);
});

test('the ring is small enough to be inside its own dot at rest', () => {
  /*
   * The bound that keeps this from being the old fan. At scale 1 a 1280 px
   * picture spans 360°, so a degree is 3.6 px: the whole ring has to be well
   * under the 2.5 px radius of the mark it came from, or the resting map
   * shows a smudge where it should show one honest dot.
   */
  const out = spreadShared(Array.from({ length: 24 }, (_, i) => ({ lon: 29.92, lat: 40.77, slug: `m${i}` })));
  const worst = Math.max(...out.map((p) => Math.hypot(p.lon - 29.92, p.lat - 40.77)));
  assert.ok(worst * (1280 / 360) < 2.5, `the ring is ${(worst * (1280 / 360)).toFixed(2)}px across at rest`);
});

test('and large enough to be countable at the deepest zoom', () => {
  // The same 24 at 240x: a degree is 853 px there, and neighbours have to
  // clear `MERGE_PX` or the map has spread them and then merged them again.
  const out = spreadShared(Array.from({ length: 24 }, (_, i) => ({ lon: 29.92, lat: 40.77, slug: `m${i}` })));
  const px = (1280 * 240) / 360;
  let closest = Infinity;
  for (let i = 0; i < out.length; i += 1) {
    for (let j = i + 1; j < out.length; j += 1) {
      closest = Math.min(closest, Math.hypot(out[i].lon - out[j].lon, out[i].lat - out[j].lat) * px);
    }
  }
  assert.ok(closest > MERGE_PX, `two of them are ${closest.toFixed(1)}px apart at full zoom`);
});

test('the ring is round on the picture, which means squashed in latitude', () => {
  /*
   * Mercator stretches latitude by 1/cos(lat), so a ring of equal degrees
   * draws as a tall ellipse — at Kyiv half again as tall as it is wide, and
   * worse further north. The latitude offsets are multiplied by cos(lat) to
   * undo exactly that, so this asserts the *drawn* ring is round: the widest
   * north-south offset, stretched back by 1/cos, matches the east-west one.
   */
  const lat = 50.45;
  /*
   * Four, so every one of them is on the first ring: the first version of
   * this compared the widest north-south offset with the widest east-west
   * one over *eight* points, which straddle two rings, and it was measuring
   * the ring count rather than the squash.
   */
  const out = spreadShared(Array.from({ length: 4 }, (_, i) => ({ lon: 30.52, lat, slug: `s${i}` })));
  const squash = Math.cos((lat * Math.PI) / 180);
  const drawn = out.map((p) => Math.hypot(p.lon - 30.52, (p.lat - lat) / squash));
  // Every point the same distance from the centre once latitude is stretched
  // back the way Mercator will stretch it: a circle on the picture.
  for (const r of drawn) assert.ok(Math.abs(r - drawn[0]) < 1e-9, `${r} against ${drawn[0]}`);
  // And a circle rather than a point: it is the ring's own radius.
  assert.ok(Math.abs(drawn[0] - 0.0167) < 1e-9, `radius ${drawn[0]}`);
});

test('a bigger group grows as the square root, not with the count', () => {
  const ringOf = (n) => {
    const out = spreadShared(Array.from({ length: n }, (_, i) => ({ lon: 0, lat: 0, slug: `s${i}` })));
    return Math.max(...out.map((p) => Math.hypot(p.lon, p.lat)));
  };
  // Twenty-four martyrs at one coordinate sit inside three rings, not a wheel
  // twelve times the width of a pair — the same reasoning the old fan's own
  // concentric rings were written with, kept when the unit changed.
  assert.ok(ringOf(24) < ringOf(2) * 4, `24 spread to ${ringOf(24)} against a pair's ${ringOf(2)}`);
});
