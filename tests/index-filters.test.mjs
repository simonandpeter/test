import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EMPTY_FILTERS,
  applyFilters,
  facetsOf,
  hasActiveFilters,
  lifeInterval,
  shuffleKey,
  sortCards,
  UNCALENDARED,
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

/* Two of the four carry a picture, because since 2026-08-28 the Random order
   promotes an imaged saint into the first and third places and a fixture with
   none could not tell whether it did. In the corpus the ratio is 128 of 742,
   which is why the promotion is a real intervention rather than a formality. */
const ICON = { src: 'icon.jpg', lqip: '', aspect: 1, w: 100, h: 100 };

const anthony = card('anthony', {
  display_name: 'Anthony the Great',
  image: ICON,
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
  image: ICON,
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
  // Who matches, not in what order: the default order became Earliest on
  // 2026-08-24 and these two assertions were reading as order tests by
  // accident. The orders have tests of their own below.
  const slugs = (result) => result.matched.map((c) => c.slug).sort();
  // Moses is here because his birth bound is open below: nothing we have found
  // rules out his life touching the 4th century, and Overlaps asks exactly
  // that. Narrowing it would mean inventing a lower bound.
  assert.deepEqual(slugs(run({ ...range, rangeMode: 'overlaps' })), ['anthony', 'moses']);
  // Anthony's life runs 250–356 and so is not contained by 300–400.
  assert.deepEqual(slugs(run({ ...range, rangeMode: 'within' })), []);
  assert.deepEqual(slugs(run({ from: 240, to: 400, rangeMode: 'within' })), ['anthony', 'christopher']);
});

test('an open-ended life overlaps but is never entirely within', () => {
  assert.equal(run({ from: 900, to: 1100, rangeMode: 'overlaps' }).matched.length, 1);
  assert.equal(run({ from: 900, to: 1100, rangeMode: 'within' }).matched.length, 0);
});

test('a date range sets undated saints aside rather than deleting them', () => {
  // sort pinned: this test is about the tray, and the default order is
  // Random since 2026-08-24 (evening).
  const { matched, undated: tray } = run({ from: 300, to: 400, sort: 'earliest' });
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

test('random is the default order, and earliest and name are still offered', () => {
  // Author, 2026-08-24, evening — reversing the same morning's Earliest
  // default: Random opens the Index on a different hand of the corpus each
  // visit "so each time you open the site you get exposed to more saints".
  // The seed is minted by the view, not here: EMPTY_FILTERS stays unseeded,
  // and sortCards without one must still deal a stable (not thrown) order.
  assert.equal(EMPTY_FILTERS.sort, 'random');
  assert.equal(EMPTY_FILTERS.shuffleSeed, null);
  assert.deepEqual(sortCards(all).map((c) => c.slug), sortCards(all).map((c) => c.slug));
  assert.deepEqual(sortCards(all, 'earliest').map((c) => c.slug), [
    'christopher',
    'anthony',
    'moses',
    'undated-one',
  ]);
  assert.deepEqual(sortCards(all, 'name').map((c) => c.slug), [
    'undated-one',
    'anthony',
    'christopher',
    'moses',
  ]);
});

test('latest runs the other way, and undated sorts last at either end', () => {
  /*
   * Author, 2026-08-24. Both date orders were ascending until then and keyed
   * only on a different bound, so they produced nearly the same list and
   * *Latest date* read as a control that did nothing. The undated saint is the
   * part worth pinning: negating the comparator would have floated them to the
   * head of the descending list, which is the opposite of having no place on
   * a timeline.
   */
  assert.deepEqual(sortCards(all, 'latest').map((c) => c.slug), [
    'moses',
    'anthony',
    'christopher',
    'undated-one',
  ]);
  assert.equal(sortCards(all, 'earliest').at(-1).slug, 'undated-one');
  assert.equal(sortCards(all, 'latest').at(-1).slug, 'undated-one');
  // The two orders are now genuinely different questions, not one question
  // asked twice.
  assert.notDeepEqual(
    sortCards(all, 'latest').map((c) => c.slug),
    sortCards(all, 'earliest').map((c) => c.slug),
  );
});

test('random is a seeded order, so it holds still until the seed changes', () => {
  /*
   * The Index is virtualised and re-filters on every keystroke, so a shuffled
   * array would be re-dealt under the reader mid-scroll. The order is derived
   * from (seed, slug) instead, which is why the same seed twice is the same
   * list and no seed at all is still a stable one.
   */
  const order = (seed) => sortCards(all, 'random', { seed }).map((c) => c.slug);
  assert.deepEqual(order('one'), order('one'));
  assert.deepEqual(sortCards(all, 'random').map((c) => c.slug), sortCards(all, 'random').map((c) => c.slug));
  // Every card is still present — a shuffle that loses or duplicates one is
  // the failure mode worth catching.
  assert.deepEqual(order('two').slice().sort(), all.map((c) => c.slug).sort());
  // Some seed in a handful must deal a different hand, or the key is not
  // spreading at all.
  const seeds = ['a', 'b', 'c', 'd', 'e', 'f'];
  assert.ok(seeds.some((seed) => order(seed).join() !== order('one').join()));
});

test('the shuffle key is a pure function of seed and slug', () => {
  assert.equal(shuffleKey('anthony', 'seed'), shuffleKey('anthony', 'seed'));
  assert.notEqual(shuffleKey('anthony', 'seed'), shuffleKey('anthony', 'other'));
  assert.notEqual(shuffleKey('anthony', 'seed'), shuffleKey('moses', 'seed'));
  // A uint32, so the comparator's subtraction can never overflow into a
  // wrong sign.
  for (const slug of ['anthony', 'moses', 'christopher', 'undated-one']) {
    const key = shuffleKey(slug, 'seed');
    assert.ok(Number.isInteger(key) && key >= 0 && key <= 0xffffffff);
  }
});

test('the facet lists offer only what the corpus contains', () => {
  const facets = facetsOf(all);
  assert.deepEqual(facets.types, ['monk']);
  assert.deepEqual(facets.regions, ['egypt']);
  /*
   * **A saint no calendar keeps is a value, not a gap** (author, 2026-08-28:
   * "a new option for Not calendarised … so that people get exposed to the
   * full range and not have hidden saints without their realising"). This
   * fixture has one, so the option is offered here. The live corpus does not —
   * all 742 carry a venerated attestation — so the reader is not shown a
   * control that selects nobody, and would be the day that changed.
   */
  assert.deepEqual(facets.churches.sort(), [
    'coptic',
    'eastern-orthodox',
    'roman-catholic',
    UNCALENDARED,
  ]);
  assert.deepEqual(facets.historicities, ['attested', 'legendary']);
});

test('the empty-calendar value selects the saints no calendar keeps, and only those', () => {
  const kept = (churches) =>
    applyFilters(all, { ...EMPTY_FILTERS, churches, sort: 'name' }).matched.map((c) => c.slug);
  const uncalendared = kept([UNCALENDARED]);
  assert.ok(uncalendared.length > 0, 'the fixture has a saint with no venerated attestation');
  for (const slug of uncalendared) {
    const card = all.find((c) => c.slug === slug);
    assert.equal(
      card.attestations.some((a) => a.status === 'venerated'),
      false,
    );
  }
  // And it adds to the others rather than intersecting them away: ticking a
  // calendar and the empty value shows both sets, which is what "all ticked by
  // default" has to mean for the default to show the whole corpus.
  const both = kept(['coptic', UNCALENDARED]);
  for (const slug of [...kept(['coptic']), ...uncalendared]) assert.ok(both.includes(slug));
});

test('a random deal leads with pictures in the first and third places', () => {
  /*
   * Author, 2026-08-28: "Despite applying a random order, make it so the first
   * and third entries in the Advanced search are always profiles with an
   * image, for user engagement purposes."
   *
   * Every seed, not one: the whole point is that it holds for whichever hand
   * is dealt, and a single seed would be one deal's luck all over again — the
   * defect this repository spent 2026-08-27 on.
   */
  const imaged = all.filter((c) => c.image).length;
  assert.ok(imaged >= 2, 'the fixture has pictures to lead with');
  for (let i = 0; i < 40; i += 1) {
    const seed = `seed-${i}`;
    const { matched } = applyFilters(all, { ...EMPTY_FILTERS, sort: 'random', shuffleSeed: seed });
    assert.ok(matched[0].image, `no picture first under ${seed}`);
    assert.ok(matched[2].image, `no picture third under ${seed}`);
    // Nobody is lost or duplicated by the promotion.
    assert.equal(matched.length, all.length);
    assert.equal(new Set(matched.map((c) => c.slug)).size, all.length);
  }
});

test('the other three orders are left exactly as the reader asked for them', () => {
  // A reader who asked for alphabetical and got someone else first is looking
  // at a bug; Random is the only order that promised nothing.
  for (const sort of ['name', 'earliest', 'latest']) {
    const { matched } = applyFilters(all, { ...EMPTY_FILTERS, sort });
    assert.deepEqual(
      matched.map((c) => c.slug),
      sortCards(all, sort).map((c) => c.slug),
    );
  }
});

test('an untouched filter set is inactive, and any one of them activates it', () => {
  assert.equal(hasActiveFilters(EMPTY_FILTERS), false);
  assert.equal(hasActiveFilters({ ...EMPTY_FILTERS, query: '  ' }), false);
  assert.equal(hasActiveFilters({ ...EMPTY_FILTERS, from: 300 }), true);
  // Sorting is not filtering: changing the order hides nothing.
  assert.equal(hasActiveFilters({ ...EMPTY_FILTERS, sort: 'earliest' }), false);
});

test('sorting by earliest orders open-ended lives by the bound they do have', () => {
  const moses1043 = lifeInterval(moses.dates);
  assert.equal(moses1043.earliest, null);
  assert.equal(sortCards([moses, anthony], 'earliest')[0].slug, 'anthony');
});

/*
 * Addendum G2: the per-card values are derived once, not once per comparison.
 *
 * A cost claim needs a cost measurement, so these count how many times a card
 * is asked for the fields the derivation reads. `dates` and `attestations`
 * become getters that tally; nothing else about the card changes, and the
 * semantics are pinned by every test above rather than here.
 */
const counting = (slug, over = {}) => {
  const reads = { dates: 0, attestations: 0 };
  const base = card(slug, over);
  const { dates, attestations } = base;
  Object.defineProperties(base, {
    dates: {
      get() {
        reads.dates += 1;
        return dates;
      },
    },
    attestations: {
      get() {
        reads.attestations += 1;
        return attestations;
      },
    },
  });
  return { card: base, reads };
};

test('a date sort derives each card key once, not once per comparison', () => {
  // Enough cards that `sort` must compare each of them several times: with
  // n = 24, `Array.sort` runs its comparator far more often than 24 times, and
  // the old code asked both operands for a key on every call.
  const made = Array.from({ length: 24 }, (_, i) =>
    counting(`s${String(i).padStart(2, '0')}`, {
      dates: { birth: { earliest: 1900 + i, latest: 1900 + i }, death: null, floruit: null },
    }),
  );
  const cards = made.map((m) => m.card);

  const ordered = sortCards(cards, 'earliest');
  assert.equal(ordered.length, 24);
  assert.deepEqual(
    ordered.map((c) => c.slug),
    cards.map((c) => c.slug),
    'already in ascending order, so the sort should not disturb them',
  );

  for (const { card: c, reads } of made) {
    assert.equal(reads.dates, 1, `${c.slug} was asked for its dates ${reads.dates} times`);
  }
});

test('the derivation is shared across calls, not repeated per call', () => {
  const { card: c, reads } = counting('shared', {
    dates: { birth: { earliest: 400, latest: 400 }, death: null, floruit: null },
    attestations: [{ church: 'russian', status: 'venerated' }],
  });

  sortCards([c], 'earliest');
  sortCards([c], 'latest');
  applyFilters([c], { ...EMPTY_FILTERS, churches: ['russian'] });
  assert.equal(reads.dates, 1, `derived ${reads.dates} times across three calls`);
  assert.equal(reads.attestations, 1, `read attestations ${reads.attestations} times`);

});
