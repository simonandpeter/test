import test from 'node:test';
import assert from 'node:assert/strict';

import * as store from '../src/lib/store.js';
import {
  HISTORY_CAP,
  READING_CAP,
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

test('reading overflow is the oldest rows beyond READING_CAP, by lastReadAt', () => {
  const rows = Array.from({ length: READING_CAP + 2 }, (_, i) => readingRecord(`s${i}`, 0, i));
  const dropped = overflow(rows, READING_CAP, 'lastReadAt').map((r) => r.slug);
  assert.deepEqual(dropped, ['s1', 's0']);
  // The shelf itself still only ever shows five, unrelated to the cap.
  assert.deepEqual(overflow(rows, READING_CAP, 'lastReadAt').length, 2);
});

/* ---- export / import (Session 8's surviving third, 2026-08-29) ---------- */

test('an export round-trips, and an import is a merge rather than a replacement', async () => {
  await store.save('round-trip-a');
  await store.save('round-trip-b');
  await store.unsave('round-trip-b'); // a tombstone must travel too
  const dump = await store.exportData();

  assert.equal(dump.schema, 1);
  const saved = dump.stores.saved.filter((r) => r.id.startsWith('round-trip-'));
  assert.equal(saved.length, 2, 'the tombstone did not travel');

  /*
   * Import the dump back over newer local state: the merge rule is newest
   * `updatedAt` wins, so a stale backup must not roll this device backwards -
   * which is the difference between an import and a restore, and the exact
   * behaviour a future sync adapter will be judged by.
   */
  // Genuinely later: updatedAt is Date.now(), and a re-save inside the same
  // millisecond as the tombstone is a tie - which goes to the *incoming*
  // record by rule, making this test fail for the right behaviour. One run in
  // a few did exactly that before this wait.
  await new Promise((r) => setTimeout(r, 3));
  await store.save('round-trip-b'); // saved again, later than the tombstone
  await store.importData(dump);
  assert.equal(await store.isSaved('round-trip-b'), true, 'a stale tombstone rolled the device backwards');
  assert.equal(await store.isSaved('round-trip-a'), true);
});

test('an import that is not an export refuses whole', async () => {
  for (const bad of [null, {}, { schema: 2, stores: {} }, { schema: 1, stores: { saved: [{ id: 5 }] } }]) {
    await assert.rejects(() => store.importData(bad), /not a Daily Dox export/);
  }
  // And nothing half-landed: the malformed row above never reached the store.
  const dump = await store.exportData();
  assert.ok(!dump.stores.saved.some((r) => r.id === 5));
});
