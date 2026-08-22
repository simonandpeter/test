import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFeastIndex, feastOccurrences, toIsoDate } from '../src/lib/feasts.js';
import { CHURCHES_BY_ID } from '../src/data/churches.js';

const dates = (feast, year, church) => feastOccurrences(feast, year, church).map(toIsoDate);

test('a fixed feast resolves through its own calendar', () => {
  assert.deepEqual(dates({ calendar: 'gregorian', month: 1, day: 21 }, 2026), ['2026-01-21']);
  assert.deepEqual(dates({ calendar: 'julian', month: 1, day: 17 }, 2026), ['2026-01-30']);
  // The New Calendar: the same menologion date, on the civil day of that name.
  assert.deepEqual(dates({ calendar: 'revised-julian', month: 1, day: 17 }, 2026), ['2026-01-17']);
});

test('a feast that does not occur in a given year returns nothing', () => {
  const leapDay = { calendar: 'gregorian', month: 2, day: 29 };
  assert.deepEqual(dates(leapDay, 2026), []);
  assert.deepEqual(dates(leapDay, 2028), ['2028-02-29']);
  // Julian 29 February falls in a civil year whenever the Julian year is leap:
  // 1900 is one, and it lands on 13 March 1900.
  assert.deepEqual(dates({ calendar: 'julian', month: 2, day: 29 }, 1900), ['1900-03-13']);
});

test('every fixed feast resolves in most years and never silently duplicates', () => {
  for (const calendar of ['gregorian', 'julian', 'revised-julian']) {
    for (let y = 2020; y <= 2030; y++) {
      const got = dates({ calendar, month: 3, day: 12 }, y);
      assert.equal(got.length, 1, `${calendar} ${y}`);
      assert.ok(got[0].startsWith(String(y)));
    }
  }
});

test('paschal feasts take the computus from their church, and all three reckon Pascha by the Julian one', () => {
  const feast = { calendar: 'paschal', offset: 0 };
  for (const id of ['russian', 'romanian', 'greek']) {
    assert.deepEqual(dates(feast, 2026, CHURCHES_BY_ID[id]), ['2026-04-12'], id);
  }
  // Ascension and Pentecost from the same computus.
  assert.deepEqual(dates({ calendar: 'paschal', offset: 39 }, 2026, CHURCHES_BY_ID.romanian), ['2026-05-21']);
  assert.deepEqual(dates({ calendar: 'paschal', offset: 49 }, 2026, CHURCHES_BY_ID.greek), ['2026-05-31']);
});

test('an attestation may override its church computus, and must have one', () => {
  const russian = CHURCHES_BY_ID.russian;
  const overridden = { calendar: 'paschal', offset: 0, computus: 'gregorian' };
  assert.deepEqual(dates(overridden, 2026, russian), ['2026-04-05']);
  assert.throws(() => feastOccurrences({ calendar: 'paschal', offset: 0 }, 2026, undefined), /computus/);
});

test('the feast index groups saints by Gregorian date and skips non-veneration', () => {
  const saints = [
    {
      slug: 'anthony-the-great',
      attestations: [
        { church: 'russian', status: 'venerated', feast: { calendar: 'julian', month: 1, day: 17 } },
        { church: 'romanian', status: 'venerated', feast: { calendar: 'revised-julian', month: 1, day: 17 } },
        { church: 'greek', status: 'venerated', feast: { calendar: 'revised-julian', month: 1, day: 17 } },
      ],
    },
    {
      slug: 'local-figure',
      attestations: [
        { church: 'russian', status: 'venerated', feast: { calendar: 'julian', month: 7, day: 4 } },
        { church: 'romanian', status: 'undocumented' },
        { church: 'greek', status: 'not-venerated', feast: { calendar: 'revised-julian', month: 1, day: 17 } },
      ],
    },
  ];
  const index = buildFeastIndex(saints, 2026, CHURCHES_BY_ID);

  // One menologion date, two civil days: the Old Calendar church on the 30th,
  // the two New Calendar churches on the 17th — and a refusal is not a feast.
  assert.deepEqual(index.get('2026-01-30').map((e) => [e.slug, e.church]), [['anthony-the-great', 'russian']]);
  assert.deepEqual(
    index.get('2026-01-17').map((e) => e.church).sort(),
    ['greek', 'romanian'],
  );
  assert.deepEqual(index.get('2026-01-17').map((e) => e.slug), ['anthony-the-great', 'anthony-the-great']);
  assert.deepEqual(index.get('2026-01-17').map((e) => [e.slug, e.church]), [['anthony-the-great', 'romanian'], ['anthony-the-great', 'greek']]);
});
