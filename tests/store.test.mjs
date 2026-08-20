import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HISTORY_CAP,
  historyRecord,
  isLive,
  liveByRecency,
  merge,
  overflow,
  readingRecord,
  savedRecord,
  tombstone,
} from '../src/lib/store.js';

/**
 * The store's rules, not its plumbing. IndexedDB itself is exercised by the
 * browser specs in e2e/; what matters here is the part a sync adapter will one
 * day have to agree with, which is exactly the part that can be wrong without
 * anything visibly breaking.
 */

test('every record carries a stable id and an updatedAt', () => {
  for (const record of [savedRecord('agnes', 10), readingRecord('agnes', 40, 10), historyRecord('agnes', 10)]) {
    assert.equal(record.id, 'agnes');
    assert.equal(record.slug, 'agnes');
    assert.equal(record.updatedAt, 10);
  }
});

test('an unsave is a tombstone, so it can outlive a stale save', () => {
  const saved = savedRecord('agnes', 10);
  const removed = tombstone(saved, 20);

  assert.equal(isLive(saved), true);
  assert.equal(isLive(removed), false);
  // The tombstone is newer, so last-write-wins keeps the removal rather than
  // resurrecting the record from another device's older copy.
  assert.equal(merge(removed, saved).deletedAt, 20);
  assert.equal(merge(saved, removed).deletedAt, 20);
});

test('merge is last-write-wins on updatedAt, and tolerates a missing side', () => {
  const older = savedRecord('agnes', 10);
  const newer = savedRecord('agnes', 30);
  assert.equal(merge(older, newer).updatedAt, 30);
  assert.equal(merge(newer, older).updatedAt, 30);
  assert.equal(merge(null, older).updatedAt, 10);
  assert.equal(merge(older, null).updatedAt, 10);
  // A tie goes to the incoming record: two writes in the same millisecond are
  // not an ordering anyone can recover, and picking one deterministically
  // beats leaving it to argument order elsewhere.
  assert.equal(merge(savedRecord('a', 5), { id: 'a', updatedAt: 5, marker: true }).marker, true);
});

test('a scroll position is never negative and never fractional', () => {
  assert.equal(readingRecord('agnes', -20, 1).scrollPos, 0);
  assert.equal(readingRecord('agnes', 40.6, 1).scrollPos, 41);
  assert.equal(readingRecord('agnes', Number.NaN, 1).scrollPos, 0);
});

test('recency listing drops tombstones and caps', () => {
  const rows = [
    savedRecord('a', 1),
    savedRecord('b', 3),
    tombstone(savedRecord('c', 2), 4),
    savedRecord('d', 2),
  ];
  assert.deepEqual(liveByRecency(rows, 'savedAt').map((r) => r.slug), ['b', 'd', 'a']);
  assert.deepEqual(liveByRecency(rows, 'savedAt', 2).map((r) => r.slug), ['b', 'd']);
});

test('history overflow is the oldest rows beyond the cap', () => {
  const rows = Array.from({ length: HISTORY_CAP + 3 }, (_, i) => historyRecord(`s${i}`, i));
  const dropped = overflow(rows).map((r) => r.slug);
  assert.deepEqual(dropped, ['s2', 's1', 's0']);
  assert.deepEqual(overflow(rows, 1000), []);
});
