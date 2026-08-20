import test from 'node:test';
import assert from 'node:assert/strict';
import {
  centuryOf,
  isUnbounded,
  isUndated,
  makeInterval,
  midpoint,
  overlaps,
  primaryCentury,
  width,
} from '../src/lib/dates.js';
import { regionOf } from '../src/lib/regions.js';
import { within } from '../src/lib/dates.js';

test('a precise date is an interval whose bounds are equal', () => {
  const precise = makeInterval({ earliest: 430, latest: 430, basis: 'attested' });
  assert.equal(width(precise), 0);
  assert.ok(!isUndated(precise));
  assert.ok(!isUnbounded(precise));
});

test('an open bound is a finding, not a missing value', () => {
  // "No later than 550" — a name first appearing in a 6th-century martyrology.
  const bounded = makeInterval({ earliest: null, latest: 550, basis: 'inferred' });
  assert.ok(!isUndated(bounded), 'one-sided bounds are not undated');
  assert.ok(isUnbounded(bounded));
  assert.equal(width(bounded), null, 'width must not invent a number');
  assert.ok(overlaps(bounded, 300, 400), 'still filterable by range');
  assert.ok(!overlaps(bounded, 600, 700));
  assert.ok(!within(bounded, 0, 900), 'an open interval is never entirely within');
});

test('undated intervals match no range and go to the tray instead', () => {
  const undated = makeInterval(null);
  assert.ok(isUndated(undated));
  assert.ok(!overlaps(undated, -10000, 10000));
  assert.ok(!within(undated, -10000, 10000));
});

test('overlaps and within are different questions', () => {
  const iv = makeInterval({ earliest: 285, latest: 305 });
  assert.ok(overlaps(iv, 300, 400));
  assert.ok(!within(iv, 300, 400));
  assert.ok(within(iv, 200, 400));
  assert.ok(overlaps(iv, 305, 305), 'bounds are inclusive');
  assert.ok(!overlaps(iv, 306, 400));
});

test('midpoint is a layout position, and only defined where something is known', () => {
  assert.equal(midpoint(makeInterval({ earliest: 285, latest: 295 })), 290);
  assert.equal(midpoint(makeInterval({ earliest: null, latest: 550 })), 550);
  assert.equal(midpoint(makeInterval(null)), null);
});

test('centuries, including across the year-zero boundary', () => {
  assert.equal(centuryOf(1), 1);
  assert.equal(centuryOf(100), 1);
  assert.equal(centuryOf(101), 2);
  assert.equal(centuryOf(430), 5);
  assert.equal(centuryOf(0), -1, 'astronomical year 0 is 1 BC');
  assert.equal(centuryOf(-43), -1, '44 BC is in the 1st century BC');
  assert.equal(centuryOf(-99), -1, '100 BC is the last year of the 1st century BC');
  assert.equal(centuryOf(-100), -2, '101 BC is the 2nd century BC');
  assert.equal(centuryOf(null), null);
});

test('a saint is filed by death, falling back to floruit then birth', () => {
  assert.equal(primaryCentury({ death: { earliest: 430, latest: 430 }, birth: { earliest: 354, latest: 354 } }), 5);
  assert.equal(primaryCentury({ birth: { earliest: 354, latest: 354 } }), 4);
  assert.equal(primaryCentury({ floruit: { earliest: 500, latest: 560 } }), 6);
  assert.equal(primaryCentury({}), null);
});

test('regions resolve from coordinates, and unclassified stays null', () => {
  assert.equal(regionOf(41.9028, 12.4964), 'italy'); // Rome
  assert.equal(regionOf(31.2001, 29.9187), 'egypt'); // Alexandria
  assert.equal(regionOf(28.5556, 33.9756), 'egypt'); // Mount Sinai
  assert.equal(regionOf(41.0082, 28.9784), 'anatolia'); // Constantinople
  assert.equal(regionOf(37.9838, 23.7275), 'greece-aegean'); // Athens
  assert.equal(regionOf(50.4501, 30.5234), 'slavic-east'); // Kyiv
  assert.equal(regionOf(9.0192, 38.7525), 'nubia-ethiopia'); // Addis Ababa
  assert.equal(regionOf(31.7683, 35.2137), 'levant'); // Jerusalem
  assert.equal(regionOf(36.2021, 36.1608), 'levant'); // Antioch
  assert.equal(regionOf(37.0662, 41.2158), 'mesopotamia'); // Nisibis
  assert.equal(regionOf(-77, 166), null, 'no box, so no claim');
  assert.equal(regionOf(undefined, undefined), null);
});

test('the straits the bounding boxes were nearly wrong about', () => {
  // Hippo Regius sits at Sicily's latitude and Sardinia's longitude; a single
  // Italy box claimed Augustine before these were split out.
  assert.equal(regionOf(36.8833, 7.75), 'maghreb'); // Hippo Regius
  assert.equal(regionOf(36.8065, 10.1815), 'maghreb'); // Carthage
  assert.equal(regionOf(38.1157, 13.3615), 'italy'); // Palermo
  assert.equal(regionOf(36.6889, 15.1097), 'italy'); // Syracuse
  // Tangier is south of Tarifa by two tenths of a degree.
  assert.equal(regionOf(35.7595, -5.834), 'maghreb'); // Tangier
  assert.equal(regionOf(37.3891, -5.9845), 'iberia'); // Seville
  assert.equal(regionOf(36.8381, -2.4597), 'iberia'); // Almería
});
