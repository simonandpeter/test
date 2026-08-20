import test from 'node:test';
import assert from 'node:assert/strict';
import { gregorianEaster, julianPascha, paschalOffset } from '../src/lib/computus.js';

const iso = ({ year, month, day }) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

test('Gregorian Easter against known years', () => {
  assert.equal(iso(gregorianEaster(2024)), '2024-03-31');
  assert.equal(iso(gregorianEaster(2025)), '2025-04-20');
  assert.equal(iso(gregorianEaster(2026)), '2026-04-05');
  assert.equal(iso(gregorianEaster(2000)), '2000-04-23');
  assert.equal(iso(gregorianEaster(1961)), '1961-04-02');
});

test('Julian Pascha against known years, expressed in Gregorian dates', () => {
  assert.equal(iso(julianPascha(2024)), '2024-05-05');
  assert.equal(iso(julianPascha(2026)), '2026-04-12');
});

test('the two computus rules coincide in 2025 and diverge either side', () => {
  assert.equal(iso(julianPascha(2025)), iso(gregorianEaster(2025)));
  assert.notEqual(iso(julianPascha(2024)), iso(gregorianEaster(2024)));
  assert.notEqual(iso(julianPascha(2026)), iso(gregorianEaster(2026)));
});

test('Pascha always falls on a Sunday under both rules', () => {
  for (let y = 1900; y <= 2200; y++) {
    for (const fn of [gregorianEaster, julianPascha]) {
      const { year, month, day } = fn(y);
      assert.equal(new Date(Date.UTC(year, month - 1, day)).getUTCDay(), 0, `${fn.name} ${y}`);
    }
  }
});

test('offsets from Pascha', () => {
  assert.equal(iso(paschalOffset('gregorian', 2026, 0)), '2026-04-05');
  assert.equal(iso(paschalOffset('gregorian', 2026, 49)), '2026-05-24'); // Pentecost
  assert.equal(iso(paschalOffset('gregorian', 2026, -46)), '2026-02-18'); // Ash Wednesday
  assert.equal(iso(paschalOffset('julian', 2026, 49)), '2026-05-31');
});
