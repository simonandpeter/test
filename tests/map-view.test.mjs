import test from 'node:test';
import assert from 'node:assert/strict';

import { BLOB_MAX, HOME, MAX_SCALE, MERGE_PX, MIN_SCALE, WHOLE, capacitatedGroups, clampCentre, clampView, convexHull, coverFractions, distToHull, fitBounds, inflateHull, maxScaleFor, mergeDots, panBy, pointInHull, relaxLayout, separateGroups, spreadShared, toScreen, toWorld, zoomAbout } from '../src/lib/map-view.js';

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

test('a pan does not clamp the scale to the desktop ceiling on a narrower window', () => {
  /*
   * The bug a mobile reader actually hit: zoom past 240x on a window narrow
   * enough that `maxScaleFor` allows it, then pan — and the pan silently
   * dropped back to 240x, because `panBy` re-clamped the scale it was
   * handed against its own default `max` (the desktop `MAX_SCALE`) rather
   * than the caller's own ceiling. A pan never changes scale on purpose; it
   * must not change it by accident either.
   */
  const ceiling = maxScaleFor(200); // narrow enough to exceed MAX_SCALE
  assert.ok(ceiling > MAX_SCALE, 'the test premise needs a ceiling above MAX_SCALE');
  const zoomed = { scale: ceiling, cx: 0.5, cy: 0.5 };
  const panned = panBy(zoomed, 0.01, 0, WHOLE, ceiling);
  assert.equal(panned.scale, ceiling);
  // The default is still the desktop ceiling, for a caller with no window to ask about.
  assert.equal(panBy({ scale: 500, cx: 0.5, cy: 0.5 }, 0).scale, MAX_SCALE);
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
 * `spreadShared` — the crowd that opens as the reader zooms, in degrees
 * rather than in screen pixels (author, 2026-09-01: "spread the dots around
 * as coordinates on the map if they're stacked ... still pretty tightly
 * spaced when zoomed in fully to communicate proximity").
 *
 * The unit is the whole of it, and the reason there are tests here at all:
 * the fan this replaces was measured in pixels, so it covered more country
 * the further out the reader went and never resolved at any zoom. A ground
 * offset is the opposite on both counts — invisible at rest, opening only as
 * the picture magnifies — and neither property is visible in a screenshot.
 *
 * **The packing itself changed from concentric rings to a relaxed random
 * scatter on 2026-09-04** (author: "make the dot scatter according to this
 * logic", a standalone mockup — `scatter-mockup/index.html` — comparing four
 * candidates against the shipped rings at the Nicomedia martyrs' own count).
 * Every bound below is unchanged in *kind* — small at rest, resolvable at the
 * ceiling, round on the picture, growing as the square root — but two of the
 * tests that pinned a ring's own exact geometry no longer describe what is
 * drawn, and are rewritten rather than merely renamed.
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

test('the scatter is a pure function of the coordinate, not a fresh roll every paint', () => {
  /*
   * `paintCanvas` calls this every frame of a drag. A `Math.random()` scatter
   * would make a crowd swim under the reader's own finger; seeding from the
   * group's own key (`lib/map-view.js`'s `scatterRand`) is what keeps two
   * calls with the same input landing on the same pixels.
   */
  const points = Array.from({ length: 24 }, (_, i) => ({ lon: 29.92, lat: 40.77, slug: `m${i}` }));
  assert.deepEqual(spreadShared(points), spreadShared(points));
});

test('the crowd is small enough to be inside its own dot at rest', () => {
  /*
   * The bound that keeps this from being the old fan. At scale 1 a 1280 px
   * picture spans 360°, so a degree is 3.6 px: the whole crowd has to be well
   * under the 2.5 px radius of the mark it came from, or the resting map
   * shows a smudge where it should show one honest dot.
   */
  const out = spreadShared(Array.from({ length: 24 }, (_, i) => ({ lon: 29.92, lat: 40.77, slug: `m${i}` })));
  const worst = Math.max(...out.map((p) => Math.hypot(p.lon - 29.92, p.lat - 40.77)));
  assert.ok(worst * (1280 / 360) < 2.5, `the crowd is ${(worst * (1280 / 360)).toFixed(2)}px across at rest`);
});

test('and large enough to be countable at the deepest zoom', () => {
  /*
   * The same 24 at 240x: a degree of longitude is 853 px there, and
   * neighbours have to clear `MERGE_PX` or the map has spread them and then
   * merged them again.
   *
   * **The latitude difference is divided back by `squash` before it is
   * measured** — `spreadShared` multiplied it by `squash` on the way out
   * precisely so the *drawn*, Mercator-projected picture reads round
   * (`mergeDots` runs on real projected screen coordinates, which already
   * undo this the way `project` itself does); measuring the raw degree
   * difference instead double-counts the correction and makes a pair that
   * happens to sit mostly north-south of each other read as closer than the
   * reader will ever see them. A relaxed scatter, unlike the ring it
   * replaced, has no reason to keep every pair equally oriented, so this
   * seed (29.92, 40.77) is the one on record that found the gap: 10.8px
   * measured the old way against a true 14.2px.
   */
  const lon = 29.92;
  const lat = 40.77;
  const squash = Math.cos((lat * Math.PI) / 180);
  const out = spreadShared(Array.from({ length: 24 }, (_, i) => ({ lon, lat, slug: `m${i}` })));
  const px = (1280 * 240) / 360;
  let closest = Infinity;
  for (let i = 0; i < out.length; i += 1) {
    for (let j = i + 1; j < out.length; j += 1) {
      const dlon = out[i].lon - out[j].lon;
      const dlat = (out[i].lat - out[j].lat) / squash;
      closest = Math.min(closest, Math.hypot(dlon, dlat) * px);
    }
  }
  assert.ok(closest > MERGE_PX, `two of them are ${closest.toFixed(1)}px apart at full zoom`);
});

test('the crowd is drawn round on the picture, which means squashed in latitude', () => {
  /*
   * Mercator stretches latitude by 1/cos(lat), so an offset of equal degrees
   * draws taller than it is wide — at Kyiv half again as tall, and worse
   * further north. `spreadShared` multiplies only the latitude component of
   * `relaxLayout`'s own idealised offset by `cos(lat)` to undo exactly that,
   * so this pins the *composition* directly against the raw layout rather
   * than against any particular shape it produces — the relaxed scatter is
   * not a circle the way the ring it replaced was, so there is no longer one
   * shared radius to check every point against.
   */
  const lon = 30.52;
  const lat = 50.45;
  const squash = Math.cos((lat * Math.PI) / 180);
  const points = Array.from({ length: 6 }, (_, i) => ({ lon, lat, slug: `s${i}` }));
  const out = spreadShared(points);
  const raw = relaxLayout(6, 0.0167, `${lon},${lat}`);
  for (let i = 0; i < out.length; i += 1) {
    assert.ok(Math.abs(out[i].lon - lon - raw[i].x) < 1e-9, `lon offset ${i}`);
    assert.ok(Math.abs((out[i].lat - lat) / squash - raw[i].y) < 1e-9, `lat offset ${i}`);
  }
});

test('a bigger group grows as the square root, not with the count', () => {
  const ringOf = (n) => {
    const out = spreadShared(Array.from({ length: n }, (_, i) => ({ lon: 0, lat: 0, slug: `s${i}` })));
    return Math.max(...out.map((p) => Math.hypot(p.lon, p.lat)));
  };
  /*
   * Six rather than a pair: with only two points, relaxation does nothing
   * more than push them `radiusDeg` apart from wherever the random start
   * happened to land them, so a pair's own distance from centre is mostly
   * the seed talking and swings widely from one coordinate to the next —
   * measured over 500 coordinates, the 24-vs-2 ratio ranged from 2.3 to 6.5.
   * Six is dense enough that relaxation is actually packing them, and the
   * same sweep held under 3.1 against a threshold of 4.
   */
  assert.ok(ringOf(24) < ringOf(6) * 4, `24 spread to ${ringOf(24)} against six's ${ringOf(6)}`);
});

/*
 * `capacitatedGroups`/`convexHull`/`inflateHull`/`pointInHull`/`distToHull` —
 * the blobs a crowd over `BLOB_MAX` is partitioned into (author, 2026-09-04:
 * "only do this blob function wherever there are more than 8 saints, at
 * which point you will have 2 blobs — no point in having a single blob, the
 * function of the blob is for large clusters"). `views/map.js` reads
 * `BLOB_MAX` to decide *whether* to call any of this at all; these tests are
 * the shape of what it gets back once it does.
 */

test('a group at or under the cap is not split', () => {
  const pts = Array.from({ length: BLOB_MAX }, (_, i) => ({ x: i, y: 0 }));
  const groups = capacitatedGroups(pts, BLOB_MAX, 'k');
  assert.deepEqual(groups, [pts.map((_, i) => i)]);
});

test('a group over the cap splits into groups of at most the cap, covering every point once', () => {
  const pts = Array.from({ length: 27 }, (_, i) => ({ x: Math.cos(i) * 10, y: Math.sin(i) * 10 }));
  const groups = capacitatedGroups(pts, 8, 'nicomedia');
  assert.equal(groups.length, Math.ceil(27 / 8));
  for (const g of groups) assert.ok(g.length <= 8, `a group of ${g.length}`);
  assert.deepEqual([...groups.flat()].sort((a, b) => a - b), pts.map((_, i) => i));
});

test('the same crowd and seed partitions the same way every time', () => {
  // `views/map.js` calls this once a paint; a partition that reshuffled
  // itself from one frame to the next would read as the crowd rearranging
  // under the reader mid-drag, the same bug `spreadShared`'s own determinism
  // test exists for.
  const pts = Array.from({ length: 20 }, (_, i) => ({ x: (i * 37) % 11, y: (i * 53) % 7 }));
  assert.deepEqual(capacitatedGroups(pts, 8, 'seed-a'), capacitatedGroups(pts, 8, 'seed-a'));
});

test('capacitated groups are invariant to a uniform scale and translation', () => {
  /*
   * The reason `views/map.js` can compute this once, on the group's own
   * lon/lat offsets, rather than every paint on screen pixels: panning and
   * zooming apply the same scale and the same translation to every point in
   * a group at once, and nearest-centroid-with-a-free-seat only ever compares
   * *relative* distances — which a uniform scale and translation cannot
   * reorder.
   */
  const pts = Array.from({ length: 15 }, (_, i) => ({ x: Math.cos(i * 1.3) * 5, y: Math.sin(i * 1.3) * 5 }));
  const transformed = pts.map((p) => ({ x: p.x * 240 + 1000, y: p.y * 240 + 400 }));
  assert.deepEqual(capacitatedGroups(pts, 8, 's'), capacitatedGroups(transformed, 8, 's'));
});

test('a hull under three points is handed back unchanged', () => {
  const pts = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
  assert.deepEqual(convexHull(pts), pts);
  assert.deepEqual(convexHull([]), []);
});

test('the hull of a square with a point in the middle is the square, not the middle', () => {
  const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  const centre = { x: 5, y: 5 };
  const hull = convexHull([...square, centre]);
  assert.equal(hull.length, 4);
  assert.ok(!hull.includes(centre), 'the interior point is not a hull vertex');
  for (const corner of square) assert.ok(hull.includes(corner), `${JSON.stringify(corner)} missing from the hull`);
});

test('inflating a hull pushes every vertex further from its own centre', () => {
  const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  const inflated = inflateHull(square, 5);
  const centre = { x: 5, y: 5 };
  for (let i = 0; i < square.length; i += 1) {
    const before = Math.hypot(square[i].x - centre.x, square[i].y - centre.y);
    const after = Math.hypot(inflated[i].x - centre.x, inflated[i].y - centre.y);
    assert.ok(after > before, `vertex ${i} did not move outward`);
  }
});

test('a point is reported inside a hull it is inside, and not one it is outside', () => {
  const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  assert.equal(pointInHull({ x: 5, y: 5 }, square), true);
  assert.equal(pointInHull({ x: 20, y: 20 }, square), false);
  // Under three points there is no polygon to be inside of.
  assert.equal(pointInHull({ x: 0, y: 0 }, [{ x: 0, y: 0 }, { x: 1, y: 1 }]), false);
});

test('the distance to a hull is zero on its own boundary and positive beyond it', () => {
  const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  assert.ok(Math.abs(distToHull({ x: 5, y: 0 }, square)) < 1e-9);
  assert.ok(Math.abs(distToHull({ x: 15, y: 5 }, square) - 5) < 1e-9);
});

/*
 * `separateGroups` — pushes a blob's own sub-groups apart once
 * `capacitatedGroups` has partitioned a crowd, so the hulls `views/map.js`
 * draws around them read as organised regions rather than an overlapping
 * mess (2026-09-04, the root of "the blobs are overlapping each other").
 * Each group stands for the circle its own furthest member sits on, and the
 * cap is on how close two such circles, plus `gap` of daylight, are allowed
 * to come.
 */

test('a lone group has nothing to separate from, and is left where it stood', () => {
  const group = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
  const offsets = separateGroups([group], 10);
  assert.equal(offsets.length, 1);
  assert.ok(Math.hypot(offsets[0].x, offsets[0].y) < 1e-9);
});

test('groups already clear of each other by more than the gap are left alone', () => {
  const a = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
  const b = [{ x: 100, y: 0 }, { x: 101, y: 0 }];
  const offsets = separateGroups([a, b], 5);
  assert.ok(Math.hypot(offsets[0].x, offsets[0].y) < 1e-6);
  assert.ok(Math.hypot(offsets[1].x, offsets[1].y) < 1e-6);
});

test('overlapping groups are pushed apart until their own circles clear the gap', () => {
  const a = [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]; // centroid (0,0), radius 1
  const b = [{ x: 0.5, y: 0 }, { x: 2.5, y: 0 }, { x: 1.5, y: 1 }, { x: 1.5, y: -1 }]; // centroid (1.5,0), radius 1
  const gap = 10;
  const offsets = separateGroups([a, b], gap);
  const ca = { x: 0 + offsets[0].x, y: 0 + offsets[0].y };
  const cb = { x: 1.5 + offsets[1].x, y: 0 + offsets[1].y };
  const d = Math.hypot(ca.x - cb.x, ca.y - cb.y);
  assert.ok(d >= 1 + 1 + gap - 1e-6, `expected the two circles at least 12 apart, got ${d}`);
});

/*
 * `maxScaleFor` — the ceiling is a claim about what the reader can resolve,
 * so it has the picture's width in it (author, 2026-09-01: "match zoom
 * capabilities on mobile to what we now have on desktop, because we cant see
 * the individual dots on mobile").
 */

test('the desk keeps the ceiling it was measured on', () => {
  assert.equal(maxScaleFor(1280), MAX_SCALE);
  // Wider than the reference asks for *less* zoom, and is refused: the
  // ceiling never comes in under the number the coastline was argued at.
  assert.equal(maxScaleFor(2560), MAX_SCALE);
});

test('a narrower picture is allowed further in, in proportion', () => {
  // Half the width, twice the zoom: the same ring of stacked saints spans the
  // same order of pixels either way.
  assert.ok(Math.abs(maxScaleFor(640) - MAX_SCALE * 2) < 1e-9);
  assert.ok(Math.abs(maxScaleFor(360) - (MAX_SCALE * 1280) / 360) < 1e-9);
});

test('the ceiling stops at four times the desk, however narrow the glass', () => {
  assert.equal(maxScaleFor(10), MAX_SCALE * 4);
});

test('a picture with no width yet falls back rather than dividing by zero', () => {
  assert.equal(maxScaleFor(0), MAX_SCALE);
  assert.equal(maxScaleFor(undefined), MAX_SCALE);
});

test('the ceiling is honoured by the arithmetic that zooms', () => {
  // The number alone is not the feature: `zoomAbout` and `clampView` have to
  // take it, or a phone's wheel still stops at the desk's ceiling.
  const deep = maxScaleFor(360);
  const v = zoomAbout({ scale: 200, cx: 0.5, cy: 0.5 }, 100, 0.5, 0.5, WHOLE, deep);
  assert.ok(Math.abs(v.scale - deep) < 1e-9, `stopped at ${v.scale}`);
  assert.equal(clampView({ scale: 5000, cx: 0.5, cy: 0.5 }, WHOLE, deep).scale, deep);
  // And without one, the desk's ceiling is still the default.
  assert.equal(clampView({ scale: 5000, cx: 0.5, cy: 0.5 }).scale, MAX_SCALE);
});
