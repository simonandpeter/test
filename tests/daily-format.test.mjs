import test from 'node:test';
import assert from 'node:assert/strict';
import { reckonedHeading, utc, utcYmd } from '../src/views/daily/format.js';

/**
 * `Date.UTC` maps a year of 0–99 onto 1900–1999. Every date the Daily page
 * prints goes through `utc`, so without the guard `/calendar/0099-01-01`
 * headed the page "1999" while the register, the fast and the paschal cycle
 * under it were all reckoned for the year 99.
 *
 * The three claims are the mapping itself, the day surviving it, and the
 * heading the reader actually sees.
 */
test('a first-century day keeps its own year', () => {
  assert.equal(utcYmd(99, 1, 1).toISOString().slice(0, 10), '0099-01-01');
  assert.equal(utcYmd(1, 12, 31).toISOString().slice(0, 10), '0001-12-31');
  assert.equal(utc('0050-06-15').toISOString().slice(0, 10), '0050-06-15');
  assert.match(reckonedHeading('0099-01-01', 'gregorian'), /\b99\b/);
  assert.doesNotMatch(reckonedHeading('0099-01-01', 'gregorian'), /1999/);
});

test('years of three digits and up are unchanged by the guard', () => {
  assert.equal(utc('0100-01-01').toISOString().slice(0, 10), '0100-01-01');
  assert.equal(utc('2026-01-30').toISOString().slice(0, 10), '2026-01-30');
  assert.equal(utc('2024-02-29').toISOString().slice(0, 10), '2024-02-29');
});
