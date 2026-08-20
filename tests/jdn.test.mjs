import test from 'node:test';
import assert from 'node:assert/strict';
import {
  copticToJdn,
  ethiopianToJdn,
  gregorianToJdn,
  isValidDate,
  jdnToCoptic,
  jdnToEthiopian,
  jdnToGregorian,
  jdnToJulian,
  julianToJdn,
} from '../src/lib/jdn.js';

const iso = ({ year, month, day }) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

test('JDN anchors', () => {
  assert.equal(gregorianToJdn(2000, 1, 1), 2451545);
  // JDN 0 is 1 January 4713 BC in the Julian calendar, which is 24 November
  // 4714 BC proleptic Gregorian. Astronomical numbering makes those -4712
  // and -4713, and getting this pair right is what proves the BC range works.
  assert.equal(julianToJdn(-4712, 1, 1), 0);
  assert.equal(gregorianToJdn(-4713, 11, 24), 0);
});

test('Gregorian and Julian round-trip, including BC', () => {
  for (const [y, m, d] of [
    [2026, 8, 20],
    [1582, 10, 15],
    [1, 1, 1],
    [0, 2, 29],
    [-44, 3, 15],
    [-4712, 1, 1],
  ]) {
    assert.equal(iso(jdnToGregorian(gregorianToJdn(y, m, d))), iso({ year: y, month: m, day: d }));
    assert.equal(iso(jdnToJulian(julianToJdn(y, m, d))), iso({ year: y, month: m, day: d }));
  }
});

test('Julian to Gregorian offset follows the general rule, not a constant', () => {
  // Days to add to a Julian date to get the Gregorian one. The Julian date
  // lags, so its JDN for the same nominal day is the larger of the two.
  const offsetAt = (y) => julianToJdn(y, 1, 1) - gregorianToJdn(y, 1, 1);
  assert.equal(offsetAt(1700), 10);
  assert.equal(offsetAt(1800), 11);
  assert.equal(offsetAt(1900), 12);
  assert.equal(offsetAt(2026), 13);
  // The constant everyone hard-codes expires here; the general rule does not.
  assert.equal(offsetAt(2200), 14);
});

test('Julian feast days land on the expected Gregorian dates', () => {
  // St Anthony the Great, 17 January in the Julian reckoning.
  assert.equal(iso(jdnToGregorian(julianToJdn(2026, 1, 17))), '2026-01-30');
  assert.equal(iso(jdnToGregorian(julianToJdn(1900, 1, 1))), '1900-01-13');
});

test('Alexandrian epochs sit where the Julian calendar says they do', () => {
  // 1 Thout 1 AM = 29 August 284 Julian; 1 Mäskäräm 1 EC = 29 August 8 Julian.
  assert.equal(copticToJdn(1, 1, 1), julianToJdn(284, 8, 29));
  assert.equal(ethiopianToJdn(1, 1, 1), julianToJdn(8, 8, 29));
  // Ethiopic years run 276 ahead of Coptic ones.
  assert.equal(copticToJdn(1742, 1, 1), ethiopianToJdn(2018, 1, 1));
});

test('Coptic and Ethiopic new year 2025', () => {
  assert.equal(iso(jdnToGregorian(copticToJdn(1742, 1, 1))), '2025-09-11');
  assert.equal(iso(jdnToGregorian(ethiopianToJdn(2018, 1, 1))), '2025-09-11');
});

test('Coptic Tobi 22 is St Anthony, independently of the Julian path', () => {
  // Reaching 30 January 2026 from the Coptic calendar as well as the Julian one
  // is the cross-check: two unrelated conversions agreeing on a known feast.
  assert.equal(iso(jdnToGregorian(copticToJdn(1742, 5, 22))), '2026-01-30');
});

test('Alexandrian calendars round-trip across a leap boundary', () => {
  for (let jdn = copticToJdn(1739, 13, 1); jdn <= copticToJdn(1740, 1, 5); jdn++) {
    assert.equal(copticToJdn(...Object.values(jdnToCoptic(jdn))), jdn);
    assert.equal(ethiopianToJdn(...Object.values(jdnToEthiopian(jdn))), jdn);
  }
});

test('validity is decided by round-trip, so impossible dates are rejected', () => {
  assert.ok(isValidDate('gregorian', 2028, 2, 29));
  assert.ok(!isValidDate('gregorian', 2026, 2, 29));
  assert.ok(isValidDate('julian', 1900, 2, 29));
  assert.ok(!isValidDate('gregorian', 2026, 2, 30));
  assert.ok(!isValidDate('gregorian', 2026, 13, 1));
  // The sixth epagomenal day exists only when the Coptic year is 3 mod 4.
  assert.ok(isValidDate('coptic', 1739, 13, 6));
  assert.ok(!isValidDate('coptic', 1740, 13, 6));
  assert.ok(isValidDate('coptic', 1740, 13, 5));
});
