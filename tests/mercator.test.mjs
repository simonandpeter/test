import test from 'node:test';
import assert from 'node:assert/strict';

import { ASPECT, MAX_LAT, project } from '../src/lib/mercator.js';

/*
 * The map's whole geometry, held to places rather than to arithmetic. A
 * projection that is wrong is wrong in a way you can name — Athens above
 * Jerusalem, the Atlantic on the wrong side — so the assertions are named
 * places, and a browser test is not needed to make any of them.
 */

const near = (a, b, tol = 1e-4) => assert.ok(Math.abs(a - b) < tol, `${a} is not within ${tol} of ${b}`);

test('the equator is halfway down and Greenwich halfway across', () => {
  const p = project(0, 0);
  near(p.x, 0.5);
  near(p.y, 0.5);
});

test('the antimeridian is both edges, and neither is off the box', () => {
  near(project(-180, 0).x, 0);
  near(project(180, 0).x, 1);
});

test('the cutoff parallels are the top and bottom of the box', () => {
  near(project(0, MAX_LAT).y, 0);
  near(project(0, -MAX_LAT).y, 1);
});

test('a place past the cutoff is drawn at the edge, not dropped', () => {
  // A real place, and the alternative to clamping is a NaN or a point at
  // infinity — the map would silently lose it. Longitude is untouched.
  const p = project(-68, 89.9);
  assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
  near(p.y, 0);
  near(p.x, (180 - 68) / 360);
});

test('the cities land where a reader would look for them', () => {
  const athens = project(23.7, 38.0);
  const jerusalem = project(35.2, 31.8);
  const moscow = project(37.6, 55.75);
  const newYork = project(-74, 40.7);

  // North is up: Moscow above Athens above Jerusalem.
  assert.ok(moscow.y < athens.y, 'Moscow should sit above Athens');
  assert.ok(athens.y < jerusalem.y, 'Athens should sit above Jerusalem');
  // East is right, and the Atlantic is between New York and Athens.
  assert.ok(newYork.x < athens.x, 'New York should sit west of Athens');
  assert.ok(athens.x < jerusalem.x, 'Athens should sit west of Jerusalem');
  // All four inside the box.
  for (const [name, p] of Object.entries({ athens, jerusalem, moscow, newYork })) {
    assert.ok(p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1, `${name} fell outside the box`);
  }
});

test('Mercator stretches toward the poles, which is the thing it is known for', () => {
  // Equal steps of latitude take more of the picture the further north they
  // are. If this ever came out equal, the projection would have quietly become
  // equirectangular and every coastline would be wrong in a way that still
  // looked like a map.
  const low = project(0, 0).y - project(0, 10).y;
  const high = project(0, 60).y - project(0, 70).y;
  assert.ok(high > low * 1.5, `10 degrees at the equator took ${low}, at 60 north ${high}`);
});

test('the box is wider than it is tall, and the CSS is told the same number', () => {
  // The map reserves its height from this before the canvas draws, so a wrong
  // value is a layout shift rather than a squashed picture.
  assert.ok(ASPECT > 1, 'the world at this cutoff is wider than it is tall');
  // Recomputed independently of the module's own arithmetic.
  const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const expected = 360 / ((merc(MAX_LAT) - merc(-MAX_LAT)) * (180 / Math.PI));
  near(ASPECT, expected);
});
