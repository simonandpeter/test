import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TILES } from '../src/data/terrain-tiles.js';
import { tileUrl, visibleTiles } from '../src/lib/map-terrain.js';
import { coverFractions, HOME, WHOLE } from '../src/lib/map-view.js';
import { ASPECT, project } from '../src/lib/mercator.js';

/**
 * The arithmetic `src/views/map/paint.js` states as an invariant and cannot
 * check for itself.
 *
 * The draw pass needs a canvas, so the pass itself belongs to `e2e/map.spec.js`.
 * What is left is pure: the thresholds the module holds apart by hand, the
 * projection of a tile's own bounds, and which tiles a view overlaps.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAINT = path.join(ROOT, 'src/views/map/paint.js');
const source = readFileSync(PAINT, 'utf8');

/** One `const NAME = <number>;` from the draw pass, read rather than guessed. */
const constant = (name) => {
  const m = new RegExp(`^const ${name} = (-?[0-9.]+);$`, 'm').exec(source);
  assert.ok(m, `paint.js no longer declares ${name} as a plain number`);
  return Number(m[1]);
};

test('the two terrain handovers never run at once', () => {
  /*
   * `fadeBetween`'s own note: cross-dissolving three layers at once dips,
   * because a pixel only one layer covers is only ever as dark as that
   * layer's partial alpha. Nothing but the numbers keeps them apart.
   */
  const tileStart = constant('TILE_FADE_START');
  const tileEnd = constant('TILE_FADE_END');
  const hrStart = constant('HR_FADE_START');
  const hrEnd = constant('HR_FADE_END');
  assert.ok(tileStart < tileEnd, `the 50m handover runs backwards: ${tileStart}..${tileEnd}`);
  assert.ok(hrStart < hrEnd, `the 10m handover runs backwards: ${hrStart}..${hrEnd}`);
  assert.ok(
    tileEnd <= hrStart,
    `the 50m handover (to ${tileEnd}) overlaps the 10m one (from ${hrStart})`,
  );
});

test('names arrive before the leader columns that stack them', () => {
  assert.ok(
    constant('LABELS_AT') < constant('LEADERS_AT'),
    'a column of names cannot be stacked at a zoom that draws no names',
  );
});

test('the unborn are dimmed twice as far as the dead', () => {
  // "greyed out twice as much" read as half the remaining opacity.
  assert.equal(constant('DIM_FUTURE'), constant('DIM_PAST') / 2);
});

test('the fall-back is the flight, not a length of its own', () => {
  assert.match(
    source,
    /^const SELECT_FADE_MS = FLY_MS;$/m,
    'the fade and the flight begin on one press and must land together',
  );
});

test('a tile projects to a box with real width and height', () => {
  /*
   * The draw pass takes a tile's two lon/lat corners, projects each, and hands
   * the pair to `drawImage` as x/y/w/h. A negative width or height there is a
   * tile drawn inside out, which canvas does silently.
   */
  const bad = [];
  for (const tile of TILES) {
    const a = project(tile.lon0, tile.lat0);
    const b = project(tile.lon1, tile.lat1);
    if (!(b.x > a.x) || !(b.y > a.y)) bad.push(`${tile.col}-${tile.row}`);
  }
  assert.deepEqual(bad, [], `tiles whose projected box is inside out: ${bad.join(', ')}`);
});

test('the projection is monotonic in each axis on its own', () => {
  /*
   * Why `visibleTiles` may test two rectangles instead of reprojecting: `x`
   * depends only on `lon` and `y` only on `lat`, both monotonic, so a lon/lat
   * cell is still axis-aligned once projected.
   */
  for (let lon = -180; lon < 180; lon += 5) {
    assert.ok(project(lon, 0).x < project(lon + 5, 0).x, `x is not rising at ${lon}`);
    assert.equal(project(lon, 10).x, project(lon, -70).x, `x moved with latitude at ${lon}`);
  }
  for (let lat = -83; lat < 83; lat += 5) {
    const next = Math.min(83, lat + 5);
    assert.ok(project(0, next).y < project(0, lat).y, `y is not falling northward at ${lat}`);
    assert.equal(project(60, lat).y, project(-120, lat).y, `y moved with longitude at ${lat}`);
  }
});

test('the whole world overlaps the whole grid, and a deep zoom overlaps a handful', () => {
  assert.equal(visibleTiles(TILES, HOME, WHOLE).length, TILES.length);

  const frame = coverFractions(1280, 720, ASPECT);
  const tile = TILES.find((t) => t.hr) ?? TILES[0];
  const a = project(tile.lon0, tile.lat0);
  const b = project(tile.lon1, tile.lat1);
  const near = visibleTiles(TILES, { scale: 120, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }, frame);
  assert.ok(near.length >= 1, 'the cell under the centre is not in view');
  assert.ok(near.length < TILES.length, 'a 120x view still overlaps the whole grid');
  assert.ok(
    near.some((t) => t.col === tile.col && t.row === tile.row),
    'the cell the view is centred on is missing from its own answer',
  );
});

test('a tile has the files the draw pass asks it for, and only an hr cell has four', () => {
  const local = (url) => fileURLToPath(url);
  const missing = [];
  const spare = [];
  for (const tile of TILES) {
    for (const channel of ['green', 'relief']) {
      const f = local(tileUrl(tile.col, tile.row, channel));
      if (!existsSync(f)) missing.push(path.basename(f));
    }
    for (const channel of ['green-hr', 'relief-hr']) {
      const f = local(tileUrl(tile.col, tile.row, channel));
      const there = existsSync(f);
      if (tile.hr && !there) missing.push(path.basename(f));
      if (!tile.hr && there) spare.push(path.basename(f));
    }
  }
  assert.deepEqual(missing, [], `the manifest promises a tile that is not there: ${missing.join(', ')}`);
  assert.deepEqual(spare, [], `a cell the manifest calls 50m-only carries a 10m pair: ${spare.join(', ')}`);
});
