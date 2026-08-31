import test from 'node:test';
import assert from 'node:assert/strict';

import { lifeBounds, pointOn, pointOnLeg, progressAt, trackAt, trackPath } from '../src/lib/map-track.js';

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
  { from: null, to: 1000, lat: 47.1625, lon: 19.5033, uncertainty_km: 300 },
  { from: 1015, to: 1018, lat: 50.4501, lon: 30.5234, uncertainty_km: 15 },
  { from: 1018, to: 1025, lat: 52.0693, lon: 19.4803, uncertainty_km: 300 },
  { from: 1033, to: null, lat: 50.4344, lon: 30.5578, uncertainty_km: 1 },
];

test('a year inside a stay is that stay, at its own coordinates', () => {
  assert.equal(trackAt(MOSES, 1016).lon, 30.5234, 'the Kyiv years are not at Kyiv');
  assert.equal(trackAt(MOSES, 1020).lon, 19.4803, 'the captivity is not in Poland');
  assert.equal(trackAt(MOSES, 1040).lon, 30.5578, 'the Caves years are not at the Caves');
});

test('the three years of hiding at Kyiv are three years on the track', () => {
  /*
   * Author, 2026-08-31: "make sure he's in kiev for longer than a year".
   * The Paterikon summary gives three — Boris killed on the Alta in 1015,
   * Boleslaw taking Kyiv in 1018 — and the track has to hold all of them,
   * which it did not while the opening stay in Hungary ran to 1015 and
   * swallowed the first.
   */
  const atKyiv = [1015, 1016, 1017, 1018].filter((y) => trackAt(MOSES, y).lon === 30.5234);
  assert.deepEqual(atKyiv, [1015, 1016, 1017, 1018], 'a year of the hiding is not spent at Kyiv');
  // And 1014 is not: he is still crossing from Hungary.
  assert.notEqual(trackAt(MOSES, 1014).lon, 30.5234);
});

test('before the first stay ends he is at it, however far back the year goes', () => {
  // A null `from` on the opening waypoint is "from birth, year unrecorded".
  assert.equal(trackAt(MOSES, 400).lat, 47.1625);
  assert.equal(trackAt(MOSES, 1000).lat, 47.1625);
});

test('past the last stay he stays there — a dot does not run off the end', () => {
  assert.equal(trackAt(MOSES, 1900).lon, 30.5578);
});

test('the leaving of Hungary is a crossing, not a jump at the last moment', () => {
  /*
   * He was in Prince Boris's service in Rus' before 1015 and no source says
   * when he left Hungary, so the track spends the unrecorded years crossing
   * rather than keeping him at home until the year Boris died. 1000 is his
   * own birth interval's latest, which is the only bound the corpus states
   * about him before 1015.
   */
  const lons = [1004, 1008, 1012].map((y) => trackAt(MOSES, y).lon);
  for (let i = 1; i < lons.length; i++) assert.ok(lons[i] > lons[i - 1], 'he stood still on the way to Rus');
  assert.ok(lons[0] > 19.5033 && lons.at(-1) < 30.5234, 'the crossing left the two ends');
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
  /*
   * Halfway through the gap is halfway along the *road*, which since
   * 2026-08-31 wanders rather than running straight — so this is a loose
   * band around the midpoint rather than the midpoint itself. `WANDER` is a
   * sixteenth of the leg, and the leg is 11 degrees of longitude.
   */
  const mid = trackAt(MOSES, 1029);
  assert.ok(Math.abs(mid.lon - (19.4803 + 30.5578) / 2) < 1.5);
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

/* ---- the wandering road (2026-08-31) -------------------------------------- */

test('a leg leaves and rejoins its two stays exactly, wandering in between', () => {
  /*
   * Author, 2026-08-31: "make the rail a bit more twisty imitating a more
   * messy realistic path between places." The wander is decoration, so the
   * one thing it must never do is move a stay: the map groups saints who
   * share a place by comparing coordinates for equality (`declutter`), and a
   * Caves that is 1e-16 off the Caves is a different place to that test.
   */
  // Two consecutive stays: Hungary and Kyiv, the track's own first leg.
  const [a, b] = MOSES;
  assert.deepEqual(pointOnLeg(a, b, 0), { lon: a.lon, lat: a.lat, uncertainty_km: a.uncertainty_km });
  assert.deepEqual(pointOnLeg(a, b, 1), { lon: b.lon, lat: b.lat, uncertainty_km: b.uncertainty_km });

  // And in between it is off the straight line, at least somewhere.
  const away = [];
  for (let t = 0.05; t < 1; t += 0.05) {
    const p = pointOnLeg(a, b, t);
    const straightLon = a.lon + (b.lon - a.lon) * t;
    const straightLat = a.lat + (b.lat - a.lat) * t;
    away.push(Math.hypot(p.lon - straightLon, p.lat - straightLat));
  }
  assert.ok(Math.max(...away) > 0.3, 'the road runs dead straight');
  // But never far enough to read as a detour: a sixteenth of the leg.
  const length = Math.hypot(b.lon - a.lon, b.lat - a.lat);
  assert.ok(Math.max(...away) < length * 0.1, 'the road wanders further than it should');
});

test('the road is the same road every time it is asked for', () => {
  /*
   * Deterministic from the two endpoints and nothing else. A random wobble
   * would redraw a different road on every frame, and the dot rides this
   * curve — so it would jitter rather than travel.
   */
  const [a, b] = MOSES;
  const once = trackPath([a, b]);
  const again = trackPath([a, b]);
  assert.deepEqual(once, again);
  // A different pair is a different road.
  const other = trackPath([a, MOSES[3]]);
  assert.notDeepEqual(other.map((p) => p.lon), once.map((p) => p.lon));
});

test('the drawn road and the dot are the same curve', () => {
  /*
   * The rail is stroked from `trackPath` and the dot is placed by `pointOn`;
   * if those were two curves that merely met at the stays, the dot would
   * ride beside its own path.
   */
  const path = trackPath(MOSES);
  // The second leg's midpoint, by both routes.
  const viaPoint = pointOn(MOSES, 1.5);
  const nearest = path.reduce((best, p) => {
    const d = Math.hypot(p.lon - viaPoint.lon, p.lat - viaPoint.lat);
    return d < best.d ? { d, p } : best;
  }, { d: Infinity, p: null });
  assert.ok(nearest.d < 0.2, 'the dot is not on the line the reader sees');
});

test('progress is a place on the track, not a position', () => {
  assert.equal(progressAt(MOSES, 900), 0, 'the years before the first stay ends are stay 0');
  assert.equal(progressAt(MOSES, 1016), 1, 'the Kyiv years are stay 1');
  assert.equal(progressAt(MOSES, 1020), 2, 'the captivity is stay 2');
  assert.equal(progressAt(MOSES, 1040), 3, 'the Caves years are the last stay');
  // Halfway along the eight unaccounted years is halfway along that leg.
  assert.ok(Math.abs(progressAt(MOSES, 1029) - 2.5) < 0.001);
});
