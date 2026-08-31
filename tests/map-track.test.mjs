import test from 'node:test';
import assert from 'node:assert/strict';

import { lifeBounds, trackAt } from '../src/lib/map-track.js';

/*
 * The map's reading of a life in time. Both halves exist because of the same
 * report (author, 2026-08-31): Moses the Hungarian's dot was lit six hundred
 * years before his birth, and the author asked for a dot that moves along a
 * dated journey rather than jumping between unordered places.
 */

test('an open birth bound is read as its other end, not as forever ago', () => {
  /*
   * Moses the Hungarian's own dates: "before 1000" is `{ earliest: null,
   * latest: 1000 }`. `lifeInterval` keeps that start open and `overlaps`
   * reads an open start as reaching back without limit, which is what lit
   * his dot in the fourth century.
   */
  const dates = {
    birth: { earliest: null, latest: 1000, basis: 'inferred' },
    death: { earliest: 1043, latest: 1043, basis: 'traditional' },
  };
  assert.deepEqual(lifeBounds(dates), { born: 1000, died: 1043 });
});

test('a life with both ends stated is read as written', () => {
  const dates = {
    birth: { earliest: 1296, latest: 1296, basis: 'attested' },
    death: { earliest: 1357, latest: 1360, basis: 'traditional' },
  };
  assert.deepEqual(lifeBounds(dates), { born: 1296, died: 1360 });
});

test('a death alone is both ends, and a floruit stands in for either', () => {
  assert.deepEqual(lifeBounds({ death: { earliest: 305, latest: 305, basis: 'traditional' } }), {
    born: 305,
    died: 305,
  });
  assert.deepEqual(lifeBounds({ floruit: { earliest: 380, latest: 420, basis: 'inferred' } }), {
    born: 380,
    died: 420,
  });
});

test('a life with no date at all has no bounds to read', () => {
  assert.deepEqual(lifeBounds({}), { born: null, died: null });
  assert.deepEqual(lifeBounds(undefined), { born: null, died: null });
});

/* ---- the track ----------------------------------------------------------- */

/** Moses the Hungarian's own, from `saints/moses-the-hungarian/saint.json`. */
const MOSES = [
  { from: null, to: 1015, lat: 47.1625, lon: 19.5033, uncertainty_km: 300 },
  { from: 1015, to: 1018, lat: 50.4501, lon: 30.5234, uncertainty_km: 15 },
  { from: 1018, to: 1025, lat: 52.0693, lon: 19.4803, uncertainty_km: 300 },
  { from: 1033, to: null, lat: 50.4344, lon: 30.5578, uncertainty_km: 1 },
];

test('a year inside a stay is that stay, at its own coordinates', () => {
  assert.equal(trackAt(MOSES, 1016).lon, 30.5234, 'the Kyiv years are not at Kyiv');
  assert.equal(trackAt(MOSES, 1020).lon, 19.4803, 'the captivity is not in Poland');
  assert.equal(trackAt(MOSES, 1040).lon, 30.5578, 'the Caves years are not at the Caves');
});

test('before the first stay ends he is at it, however far back the year goes', () => {
  // A null `from` on the opening waypoint is "from birth, year unrecorded".
  assert.equal(trackAt(MOSES, 400).lat, 47.1625);
  assert.equal(trackAt(MOSES, 1015).lat, 47.1625);
});

test('past the last stay he stays there — a dot does not run off the end', () => {
  assert.equal(trackAt(MOSES, 1900).lon, 30.5578);
});

test('a gap between two stays is walked, not jumped', () => {
  /*
   * The eight years between the release in Poland (1025) and the Caves
   * (about 1033) are what no source accounts for, so the dot crosses them
   * rather than teleporting on one frame — which is the "moving on that
   * rail" the author asked to see.
   */
  const years = [1026, 1027, 1029, 1031, 1032];
  const lons = years.map((y) => trackAt(MOSES, y).lon);
  for (let i = 1; i < lons.length; i++) {
    assert.ok(lons[i] > lons[i - 1], `the dot did not advance between ${years[i - 1]} and ${years[i]}`);
  }
  // Strictly between the two ends, never at either.
  assert.ok(lons[0] > 19.4803 && lons.at(-1) < 30.5578);
  // Halfway through the gap is halfway along the line.
  const mid = trackAt(MOSES, 1029);
  assert.ok(Math.abs(mid.lon - (19.4803 + 30.5578) / 2) < 0.2);
});

test('the doubt travels with the position', () => {
  /*
   * A dot between a 300 km region and a 1 km site carries a halo between
   * the two rather than either one's — the uncertainty is a property of
   * where it is being drawn, not of where it set out from.
   */
  const mid = trackAt(MOSES, 1029);
  assert.ok(mid.uncertainty_km < 300 && mid.uncertainty_km > 1);
});

test('a saint with no track has no position to read off one', () => {
  assert.equal(trackAt([], 1000), null);
  assert.equal(trackAt(undefined, 1000), null);
});
