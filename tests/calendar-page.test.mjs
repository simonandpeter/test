import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDaysIso,
  formatInterval,
  formatLifespan,
  parseIso,
  pickHero,
  todayIso,
  weekOf,
} from '../src/lib/calendar-page.js';
import { formatFeast } from '../src/data/calendars.js';

test('ISO parsing accepts only real Gregorian dates', () => {
  assert.deepEqual(parseIso('2026-08-20'), { year: 2026, month: 8, day: 20 });
  assert.equal(parseIso('2026-02-29'), null);
  assert.equal(parseIso('2026-13-01'), null);
  assert.equal(parseIso('nonsense'), null);
  assert.equal(parseIso(undefined), null);
});

test('day stepping crosses months and years correctly', () => {
  assert.equal(addDaysIso('2026-08-31', 1), '2026-09-01');
  assert.equal(addDaysIso('2026-01-01', -1), '2025-12-31');
  assert.equal(addDaysIso('2028-02-28', 1), '2028-02-29');
});

test('the week frame runs Monday to Sunday and contains its date', () => {
  // 20 August 2026 is a Thursday.
  const week = weekOf('2026-08-20');
  assert.equal(week.length, 7);
  assert.equal(week[0], '2026-08-17');
  assert.equal(week[6], '2026-08-23');
  assert.ok(week.includes('2026-08-20'));
  assert.equal(new Date('2026-08-17T00:00Z').getUTCDay(), 1, 'frame starts Monday');
});

test('the hero pick is deterministic and prefers saints with images', () => {
  const bySlug = new Map([
    ['with-image', { image: { src: 'x' } }],
    ['no-image', { image: null }],
    ['also-image', { image: { src: 'y' } }],
  ]);
  const entries = [
    { slug: 'no-image' },
    { slug: 'with-image' },
    { slug: 'also-image' },
    { slug: 'with-image' }, // duplicate church entry must not weight the pick
  ];
  const first = pickHero('2026-08-20', entries, bySlug);
  assert.equal(pickHero('2026-08-20', entries, bySlug), first, 'stable across calls');
  assert.notEqual(first, 'no-image', 'image preferred');
  // Different days spread across the pool rather than always picking one.
  const picks = new Set(
    ['2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24'].map((d) =>
      pickHero(d, entries, bySlug),
    ),
  );
  assert.ok(picks.size > 1, 'the pick varies by date');
});

test('hero pick falls back to imageless saints and to null', () => {
  const bySlug = new Map([['only', { image: null }]]);
  assert.equal(pickHero('2026-08-20', [{ slug: 'only' }], bySlug), 'only');
  assert.equal(pickHero('2026-08-20', [], bySlug), null);
});

test('intervals display honestly: display string, derivation, open bounds', () => {
  assert.equal(formatInterval({ earliest: 285, latest: 295, display: 'c. 291' }), 'c. 291');
  assert.equal(formatInterval({ earliest: 356, latest: 356, display: null }), '356');
  assert.equal(formatInterval({ earliest: 285, latest: 295, display: null }), '285–295');
  assert.equal(formatInterval({ earliest: null, latest: 1000, display: null }), 'before 1000');
  assert.equal(formatInterval({ earliest: 1015, latest: null, display: null }), 'after 1015');
  assert.equal(formatInterval({ earliest: null, latest: null, display: null }), 'undated');
  assert.equal(formatInterval(null), 'undated');
});

test('a lifespan with no bounds at all says undated once, not twice', () => {
  assert.equal(
    formatLifespan({
      birth: { earliest: null, latest: null, display: null },
      death: { earliest: null, latest: null, display: null },
    }),
    'undated',
  );
  assert.equal(
    formatLifespan({
      birth: { earliest: null, latest: null, display: null },
      death: { earliest: 1155, latest: 1165, display: 'c. 1160' },
    }),
    'undated – c. 1160',
  );
});

test('feasts display in their own reckoning', () => {
  assert.equal(formatFeast({ calendar: 'gregorian', day: 17, month: 1 }), '17 January');
  assert.equal(formatFeast({ calendar: 'julian', day: 17, month: 1 }), '17 January (Julian)');
  assert.equal(formatFeast({ calendar: 'revised-julian', day: 17, month: 1 }), '17 January (Revised Julian)');
  assert.equal(formatFeast({ calendar: 'paschal', offset: 0 }), 'Pascha');
  assert.equal(formatFeast({ calendar: 'paschal', offset: 49 }), '49 days after Pascha');
  assert.equal(formatFeast({ calendar: 'paschal', offset: -46 }), '46 days before Pascha');
});

test('todayIso uses the local date, not UTC', () => {
  // 23:30 local on the 20th must be the 20th regardless of timezone.
  const lateEvening = new Date(2026, 7, 20, 23, 30);
  assert.equal(todayIso(lateEvening), '2026-08-20');
});
