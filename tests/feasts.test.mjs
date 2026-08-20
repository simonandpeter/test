import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFeastIndex, feastOccurrences, toIsoDate } from '../src/lib/feasts.js';
import { CHURCHES_BY_ID } from '../src/data/churches.js';

const dates = (feast, year, church) => feastOccurrences(feast, year, church).map(toIsoDate);

test('a fixed feast resolves through its own calendar', () => {
  assert.deepEqual(dates({ calendar: 'gregorian', month: 1, day: 21 }, 2026), ['2026-01-21']);
  assert.deepEqual(dates({ calendar: 'julian', month: 1, day: 17 }, 2026), ['2026-01-30']);
  assert.deepEqual(dates({ calendar: 'coptic', month: 5, day: 22 }, 2026), ['2026-01-30']);
});

test('a feast that does not occur in a given year returns nothing', () => {
  const leapDay = { calendar: 'gregorian', month: 2, day: 29 };
  assert.deepEqual(dates(leapDay, 2026), []);
  assert.deepEqual(dates(leapDay, 2028), ['2028-02-29']);

  // The sixth epagomenal day exists only in a Coptic leap year, so this feast
  // is absent from three Gregorian years in four rather than sliding to the 5th.
  const epagomenal = { calendar: 'coptic', month: 13, day: 6 };
  const present = [2023, 2024, 2025, 2026].filter((y) => dates(epagomenal, y).length > 0);
  assert.equal(present.length, 1);
});

test('every fixed feast resolves in most years and never silently duplicates', () => {
  for (const calendar of ['gregorian', 'julian', 'coptic', 'ethiopian']) {
    for (let y = 2020; y <= 2030; y++) {
      const got = dates({ calendar, month: 3, day: 12 }, y);
      assert.equal(got.length, 1, `${calendar} ${y}`);
      assert.ok(got[0].startsWith(String(y)));
    }
  }
});

test('paschal feasts take the computus from their church', () => {
  const rome = CHURCHES_BY_ID['roman-catholic'];
  const orthodox = CHURCHES_BY_ID['eastern-orthodox'];
  const feast = { calendar: 'paschal', offset: 0 };
  assert.deepEqual(dates(feast, 2026, rome), ['2026-04-05']);
  assert.deepEqual(dates(feast, 2026, orthodox), ['2026-04-12']);
});

test('an attestation may override its church computus, and must have one', () => {
  const orthodox = CHURCHES_BY_ID['eastern-orthodox'];
  const overridden = { calendar: 'paschal', offset: 0, computus: 'gregorian' };
  assert.deepEqual(dates(overridden, 2026, orthodox), ['2026-04-05']);
  assert.throws(() => feastOccurrences({ calendar: 'paschal', offset: 0 }, 2026, undefined), /computus/);
});

test('the feast index groups saints by Gregorian date and skips non-veneration', () => {
  const saints = [
    {
      slug: 'anthony-the-great',
      attestations: [
        { church: 'eastern-orthodox', status: 'venerated', feast: { calendar: 'julian', month: 1, day: 17 } },
        { church: 'coptic', status: 'venerated', feast: { calendar: 'coptic', month: 5, day: 22 } },
        { church: 'roman-catholic', status: 'venerated', feast: { calendar: 'gregorian', month: 1, day: 17 } },
      ],
    },
    {
      slug: 'rejected-figure',
      attestations: [
        { church: 'roman-catholic', status: 'not-venerated', feast: { calendar: 'gregorian', month: 1, day: 17 } },
        { church: 'coptic', status: 'undocumented' },
      ],
    },
  ];
  const index = buildFeastIndex(saints, 2026, CHURCHES_BY_ID);

  // Two traditions land on 30 January by different routes; Rome keeps the 17th.
  assert.equal(index.get('2026-01-30').length, 2);
  assert.deepEqual(
    index.get('2026-01-30').map((e) => e.church).sort(),
    ['coptic', 'eastern-orthodox'],
  );
  assert.deepEqual(index.get('2026-01-17').map((e) => e.slug), ['anthony-the-great']);
});
