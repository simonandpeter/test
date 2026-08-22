import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FIXED_CALENDARS,
  fromJdn,
  gregorianToJdn,
  isValidDate,
  jdnToGregorian,
  jdnToJulian,
  julianToJdn,
  toJdn,
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

test('the Revised Julian is the Gregorian for every date this site will show', () => {
  // The New Calendar of the Romanian and Greek churches (author, 2026-08-22):
  // fixed feasts on Gregorian dates. Its leap rule differs from the Gregorian
  // only in which century years are leap, and the two first disagree in 2800,
  // so until then it converts as the Gregorian does — and that is what is
  // implemented. The same menologion date, thirteen days apart in 2026.
  assert.deepEqual(FIXED_CALENDARS.sort(), ['gregorian', 'julian', 'revised-julian']);
  for (const [y, m, d] of [[2026, 1, 17], [2026, 8, 6], [2100, 3, 1], [2400, 2, 29]]) {
    assert.equal(toJdn('revised-julian', y, m, d), gregorianToJdn(y, m, d));
    assert.deepEqual(fromJdn('revised-julian', gregorianToJdn(y, m, d)), { year: y, month: m, day: d });
  }
  assert.equal(iso(fromJdn('revised-julian', julianToJdn(2026, 1, 17))), '2026-01-30');
  assert.equal(iso(fromJdn('gregorian', toJdn('revised-julian', 2026, 1, 17))), '2026-01-17');
  assert.throws(() => toJdn('coptic', 1742, 5, 22), /Unknown calendar/);
});

test('validity is decided by round-trip, so impossible dates are rejected', () => {
  assert.ok(isValidDate('gregorian', 2028, 2, 29));
  assert.ok(!isValidDate('gregorian', 2026, 2, 29));
  assert.ok(isValidDate('julian', 1900, 2, 29));
  assert.ok(!isValidDate('gregorian', 2026, 2, 30));
  assert.ok(!isValidDate('gregorian', 2026, 13, 1));
  assert.ok(isValidDate('revised-julian', 2024, 2, 29));
  assert.ok(!isValidDate('revised-julian', 2026, 2, 29));
  // 1900 is leap in the Julian calendar and not in the Revised Julian.
  assert.ok(!isValidDate('revised-julian', 1900, 2, 29));
});
