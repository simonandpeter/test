import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EMPTY_FILTERS,
  applyFilters,
  breadthOf,
  facetsOf,
  hasActiveFilters,
  lifeInterval,
  sortCards,
} from '../src/lib/index-filters.js';

/**
 * The Index's semantics. The two that matter most are the range toggle — two
 * genuinely different questions, neither a default for the other — and the
 * undated tray, which is what stops a date range from quietly deleting saints
 * whose dates we do not have.
 */

const card = (slug, over = {}) => ({
  slug,
  display_name: over.display_name ?? slug,
  sex: over.sex ?? 'male',
  types: over.types ?? [],
  historicity: over.historicity ?? 'attested',
  dates: over.dates ?? { birth: null, death: null, floruit: null },
  attestations: over.attestations ?? [],
  locations: over.locations ?? [],
  image: over.image ?? null,
});

const anthony = card('anthony', {
  display_name: 'Anthony the Great',
  types: ['monk'],
  dates: {
    birth: { earliest: 250, latest: 252 },
    death: { earliest: 356, latest: 356 },
  },
  attestations: [
    { church: 'roman-catholic', status: 'venerated' },
    { church: 'eastern-orthodox', status: 'venerated' },
    { church: 'coptic', status: 'venerated' },
  ],
  locations: [{ kind: 'death', region: 'egypt' }],
});

// Born before 1000, died 1043: the start of the life is open, and must stay so.
const moses = card('moses', {
  display_name: 'Moses the Hungarian',
  dates: {
    birth: { earliest: null, latest: 1000 },
    death: { earliest: 1043, latest: 1043 },
  },
  attestations: [{ church: 'eastern-orthodox', status: 'venerated' }],
});

const christopher = card('christopher', {
  display_name: 'Christopher',
  historicity: 'legendary',
  dates: { birth: null, death: { earliest: 249, latest: 251 } },
  attestations: [{ church: 'roman-catholic', status: 'venerated' }],
});

const undated = card('undated-one', { display_name: 'A Saint With No Dates' });

const all = [anthony, moses, christopher, undated];
const run = (over) => applyFilters(all, { ...EMPTY_FILTERS, ...over });

test('a life spans from its first interval to its last, keeping open bounds open', () => {
  assert.deepEqual(lifeInterval(anthony.dates), { earliest: 250, latest: 356 });
  // Not { earliest: 1043 }: the birth interval exists and its lower bound is
  // unknown, which is a different claim from "born in 1043".
  assert.deepEqual(lifeInterval(moses.dates), { earliest: null, latest: 1043 });
  // Christopher has no birth interval at all, so the span starts at his death.
  assert.deepEqual(lifeInterval(christopher.dates), { earliest: 249, latest: 251 });
  assert.deepEqual(lifeInterval(undated.dates), { earliest: null, latest: null });
});

test('Overlaps and Entirely within ask different questions', () => {
  const range = { from: 300, to: 400 };
  // Moses is here because his birth bound is open below: nothing we have found
  // rules out his life touching the 4th century, and Overlaps asks exactly
  // that. Narrowing it would mean inventing a lower bound.
  assert.deepEqual(
    run({ ...range, rangeMode: 'overlaps' }).matched.map((c) => c.slug),
    ['anthony', 'moses'],
  );
  // Anthony's life runs 250–356 and so is not contained by 300–400.
  assert.deepEqual(run({ ...range, rangeMode: 'within' }).matched.map((c) => c.slug), []);
  assert.deepEqual(
    run({ from: 240, to: 400, rangeMode: 'within' }).matched.map((c) => c.slug),
    ['anthony', 'christopher'],
  );
});

test('an open-ended life overlaps but is never entirely within', () => {
  assert.equal(run({ from: 900, to: 1100, rangeMode: 'overlaps' }).matched.length, 1);
  assert.equal(run({ from: 900, to: 1100, rangeMode: 'within' }).matched.length, 0);
});

test('a date range sets undated saints aside rather than deleting them', () => {
  const { matched, undated: tray } = run({ from: 300, to: 400 });
  assert.deepEqual(matched.map((c) => c.slug), ['anthony', 'moses']);
  assert.deepEqual(tray.map((c) => c.slug), ['undated-one']);

  // With no range there is no tray: nothing is being excluded for want of a date.
  assert.deepEqual(run({}).undated, []);

  // And the tray respects the other filters — someone excluded by type is not
  // undated, they simply do not match.
  assert.deepEqual(run({ from: 300, to: 400, types: ['monk'] }).undated, []);
});

test('facet filters are OR within a facet and AND between facets', () => {
  assert.deepEqual(run({ churches: ['coptic'] }).matched.map((c) => c.slug), ['anthony']);
  assert.equal(run({ churches: ['coptic', 'roman-catholic'] }).matched.length, 2);
  assert.equal(run({ churches: ['coptic'], historicities: ['legendary'] }).matched.length, 0);
  assert.deepEqual(run({ regions: ['egypt'] }).matched.map((c) => c.slug), ['anthony']);
  assert.deepEqual(run({ historicities: ['legendary'] }).matched.map((c) => c.slug), ['christopher']);
});

test('feast months come from the caller, who owns the calendar arithmetic', () => {
  const monthsBySlug = new Map([['anthony', new Set([1])]]);
  const filtered = applyFilters(all, { ...EMPTY_FILTERS, months: [1] }, { monthsBySlug });
  assert.deepEqual(filtered.matched.map((c) => c.slug), ['anthony']);
  assert.equal(applyFilters(all, { ...EMPTY_FILTERS, months: [2] }, { monthsBySlug }).matched.length, 0);
});

test('breadth counts communions, not churches', () => {
  // Three churches, but Roman Catholic and Eastern Orthodox and Coptic sit in
  // three different communions, so the breadth is three.
  assert.equal(breadthOf(anthony), 3);
  assert.equal(breadthOf(moses), 1);
  assert.deepEqual(run({ breadth: 2 }).matched.map((c) => c.slug), ['anthony']);
  assert.equal(run({ breadth: 4 }).matched.length, 0);
});

test('name is the default order, and breadth is never it', () => {
  assert.equal(EMPTY_FILTERS.sort, 'name');
  assert.deepEqual(sortCards(all).map((c) => c.slug), ['undated-one', 'anthony', 'christopher', 'moses']);
  assert.deepEqual(sortCards(all, 'breadth')[0].slug, 'anthony');
  // Undated saints have no place on a timeline, so they sort last rather than
  // to year zero.
  assert.deepEqual(sortCards(all, 'earliest').map((c) => c.slug), [
    'christopher',
    'anthony',
    'moses',
    'undated-one',
  ]);
});

test('the facet lists offer only what the corpus contains', () => {
  const facets = facetsOf(all);
  assert.deepEqual(facets.types, ['monk']);
  assert.deepEqual(facets.regions, ['egypt']);
  assert.deepEqual(facets.churches.sort(), ['coptic', 'eastern-orthodox', 'roman-catholic']);
  assert.deepEqual(facets.historicities, ['attested', 'legendary']);
});

test('an untouched filter set is inactive, and any one of them activates it', () => {
  assert.equal(hasActiveFilters(EMPTY_FILTERS), false);
  assert.equal(hasActiveFilters({ ...EMPTY_FILTERS, query: '  ' }), false);
  assert.equal(hasActiveFilters({ ...EMPTY_FILTERS, breadth: 1 }), true);
  assert.equal(hasActiveFilters({ ...EMPTY_FILTERS, from: 300 }), true);
  // Sorting is not filtering: changing the order hides nothing.
  assert.equal(hasActiveFilters({ ...EMPTY_FILTERS, sort: 'breadth' }), false);
});

test('sorting by earliest orders open-ended lives by the bound they do have', () => {
  const moses1043 = lifeInterval(moses.dates);
  assert.equal(moses1043.earliest, null);
  assert.equal(sortCards([moses, anthony], 'earliest')[0].slug, 'anthony');
});
