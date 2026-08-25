import test from 'node:test';
import assert from 'node:assert/strict';

import { factRows, formatPlace, renderDateFacts } from '../src/ui/datefacts.js';

/**
 * Dates and places are one register keyed by `kind`. What these defend is that
 * a gap on either axis is still a row: "we know where he died and not when" is
 * a finding, and the thing that would quietly lose it is a join that drops any
 * kind missing one side.
 */

const anthony = {
  dates: {
    birth: { earliest: 250, latest: 252, display: 'c. 251' },
    death: { earliest: 356, latest: 356, display: '356' },
  },
  locations: [
    { kind: 'birth', historical_name: 'Coma', modern_name: 'Qiman al-Arus, Egypt' },
    { kind: 'death', historical_name: 'Mount Colzim', modern_name: 'Monastery of St Anthony, Egypt' },
  ],
};

test('a date and a place of the same kind share one row', () => {
  const rows = factRows(anthony.dates, anthony.locations);
  assert.deepEqual(
    rows.map((r) => [r.kind, r.date, r.place?.historical_name]),
    [
      ['birth', 'c. 251 AD', 'Coma'],
      ['death', '356 AD', 'Mount Colzim'],
    ],
  );
});

test('a kind with only one of the two still gets its row', () => {
  const datedOnly = factRows({ death: { earliest: 430, latest: 430 } }, []);
  assert.deepEqual(datedOnly.map((r) => [r.kind, r.date, r.place]), [['death', '430 AD', null]]);

  const placedOnly = factRows({}, [{ kind: 'see', historical_name: 'Alexandria' }]);
  assert.equal(placedOnly.length, 1);
  assert.equal(placedOnly[0].date, null);
  assert.equal(placedOnly[0].place.historical_name, 'Alexandria');
});

test('rows run in the order a life runs, not the order the file lists them', () => {
  const rows = factRows(anthony.dates, [
    { kind: 'relics', historical_name: 'Arles' },
    { kind: 'death', historical_name: 'Mount Colzim' },
    { kind: 'birth', historical_name: 'Coma' },
  ]);
  assert.deepEqual(rows.map((r) => r.kind), ['birth', 'death', 'relics']);
});

test('a second place of one kind is another line, not a second claim about the year', () => {
  const rows = factRows({ death: { earliest: 430, latest: 430 } }, [
    { kind: 'death', historical_name: 'Hippo Regius' },
    { kind: 'relics', historical_name: 'Pavia' },
  ]);
  const relics = factRows({ relics: null }, [
    { kind: 'relics', historical_name: 'Pavia' },
    { kind: 'relics', historical_name: 'Cagliari' },
  ]);
  assert.equal(rows[0].date, '430 AD');
  assert.deepEqual(relics.map((r) => r.date), [null, null]);
});

test('a place says what it was called and where it is now, without repeating itself', () => {
  assert.equal(formatPlace({ historical_name: 'Coma', modern_name: 'Qiman al-Arus, Egypt' }),
    'Coma - Qiman al-Arus, Egypt');
  assert.equal(formatPlace({ historical_name: 'Alexandria' }), 'Alexandria');
  assert.equal(formatPlace({ modern_name: 'Annaba, Algeria' }), 'Annaba, Algeria');
  assert.equal(formatPlace({ historical_name: 'Rome', modern_name: 'Rome' }), 'Rome');
});

test('a life with nothing on either axis says so rather than drawing an empty register', () => {
  assert.match(renderDateFacts({ birth: null, death: null }, []), /date-facts-undated/);
});

test('the shell reserves a box for every place name before any name exists', () => {
  // The manifest carries a location's kind but not its name, so the rows are
  // drawn from the card and filled when the saint's own file lands. Reserving
  // the box is what keeps that from being a reflow.
  const html = renderDateFacts(anthony.dates, anthony.locations);
  assert.equal((html.match(/data-place="\d+"/g) ?? []).length, 2);
  assert.equal((html.match(/class="skeleton"/g) ?? []).length, 2);
});
