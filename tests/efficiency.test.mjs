import test from 'node:test';
import assert from 'node:assert/strict';

import { feastIndexFor } from '../src/lib/feasts.js';
import { evictOldest } from '../src/lib/lru.js';
import { daysInMonthOf } from '../src/lib/calendar-page.js';

/* Addendum G, Session 5b. Three cost changes, each pinned by the property that
   would be wrong if the optimisation were wrong. Nothing the reader sees moves;
   the browser suite is the regression gate for that. */

const CHURCHES = { russian: { id: 'russian', calendar: 'julian' } };
const saints = [
  {
    slug: 'a',
    attestations: [{ church: 'russian', status: 'venerated', feast: { calendar: 'julian', month: 9, day: 7 } }],
  },
];

test('G3: the feast index for a year is built once and shared', () => {
  const first = feastIndexFor(saints, 2026, CHURCHES);
  const second = feastIndexFor(saints, 2026, CHURCHES);
  assert.equal(first, second, 'the same year should return the same index object');

  const other = feastIndexFor(saints, 2027, CHURCHES);
  assert.notEqual(first, other, 'a different year is a different index');

  // A different corpus is a different index: the memo is keyed on the array.
  const copy = saints.slice();
  assert.notEqual(feastIndexFor(copy, 2026, CHURCHES), first);
});

test('G4: the detail cache evicts the least recently used, and only past the cap', () => {
  const map = new Map([['a', 1], ['b', 2], ['c', 3]]);
  evictOldest(map, 3);
  assert.deepEqual([...map.keys()], ['a', 'b', 'c'], 'at the cap nothing is evicted');

  map.set('d', 4);
  evictOldest(map, 3);
  assert.deepEqual([...map.keys()], ['b', 'c', 'd'], 'the oldest goes');

  // A hit re-inserts, which is what makes "oldest" mean "least recently used".
  const hit = map.get('b');
  map.delete('b');
  map.set('b', hit);
  map.set('e', 5);
  evictOldest(map, 3);
  assert.deepEqual([...map.keys()], ['d', 'b', 'e'], 'c goes, not b, because b was used');
});

test('G4: eviction terminates on an empty map rather than spinning', () => {
  assert.equal(evictOldest(new Map(), 0).size, 0);
});

test('G5: days in a month, including the leap-year rules', () => {
  const cases = [
    [2026, 1, 31],
    [2026, 2, 28],
    [2024, 2, 29],
    [2000, 2, 29], // divisible by 400
    [1900, 2, 28], // divisible by 100, not 400
    [2026, 4, 30],
    [2026, 12, 31], // rolls into the next year
  ];
  for (const [year, month, expected] of cases) {
    assert.equal(daysInMonthOf('gregorian', { year, month }), expected, `${year}-${month}`);
  }
});
