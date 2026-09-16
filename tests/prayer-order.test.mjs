import test from 'node:test';
import assert from 'node:assert/strict';
import { CHURCHES_BY_ID } from '../src/data/churches.js';
import {
  hymnedSaints,
  neighboursAt,
  relatedFor,
  SAME_DAY_MAX,
  sameDayFor,
  stepOrder,
} from '../src/lib/prayer-order.js';

/*
 * **Plain objects, never the manifest** (`tests/hymn-merge.test.mjs` is the
 * pattern). `/data/` is gitignored, so `npm test` on CI runs before
 * `build:manifest` has written one — and a test that reads the corpus is a test
 * that changes its answer the day someone adds a saint.
 *
 * The one thing taken from the source is `CHURCHES_BY_ID`, because the whole
 * point of `sameDayFor` is that the Old Calendar church resolves a menologion
 * position to a different civil day from the New Calendar ones, and a
 * hand-written registry would be testing the fixture rather than the code.
 */

const card = (slug, extra = {}) => ({ slug, display_name: slug, ...extra });

test('the page’s corpus is the saints the manifest says have a hymn', () => {
  const cards = [
    card('with-one', { hymned: ['russian'] }),
    card('with-none', { hymned: [] }),
    card('with-no-field'),
    card('with-two', { hymned: ['greek', 'russian'] }),
  ];
  assert.deepEqual(
    hymnedSaints(cards).map((c) => c.slug),
    ['with-one', 'with-two'],
  );
});

test('the step order is All Saints’ own name order, over the hymned alone', () => {
  const cards = [
    card('zosimas', { display_name: 'Zosimas', hymned: ['greek'] }),
    card('anna', { display_name: 'Anna', hymned: ['russian'] }),
    card('basil', { display_name: 'Basil' }),
    card('martha', { display_name: 'Martha', hymned: ['serbian'] }),
  ];
  assert.deepEqual(
    stepOrder(cards).map((c) => c.slug),
    ['anna', 'martha', 'zosimas'],
  );
});

test('the step order holds still: the same cards give the same order', () => {
  const cards = [
    card('b', { display_name: 'B', hymned: ['greek'] }),
    card('a', { display_name: 'A', hymned: ['greek'] }),
    card('c', { display_name: 'C', hymned: ['greek'] }),
  ];
  const once = stepOrder(cards).map((c) => c.slug);
  assert.deepEqual(stepOrder(cards).map((c) => c.slug), once);
  // And the caller's array is not reordered underneath it.
  assert.deepEqual(cards.map((c) => c.slug), ['b', 'a', 'c']);
});

test('the first saint has nobody before and the last nobody after — the ends do not wrap', () => {
  const order = [card('a'), card('b'), card('c')];
  assert.equal(neighboursAt(order, 0).prev, null);
  assert.equal(neighboursAt(order, 0).next.slug, 'b');
  assert.equal(neighboursAt(order, 1).prev.slug, 'a');
  assert.equal(neighboursAt(order, 1).next.slug, 'c');
  assert.equal(neighboursAt(order, 2).next, null);
  assert.deepEqual(neighboursAt([], 0), { prev: null, next: null });
});

test('recorded-with reads the relation from both ends, mentionedIn first', () => {
  const subject = card('paul', { mentionedIn: ['antony', 'jerome'] });
  const detail = { related: ['antony', 'athanasius'] };
  assert.deepEqual(relatedFor(subject, detail), ['antony', 'jerome', 'athanasius']);
});

test('recorded-with drops the saint themself and every duplicate', () => {
  const subject = card('paul', { mentionedIn: ['paul', 'antony', 'antony'] });
  assert.deepEqual(relatedFor(subject, { related: ['paul', 'antony'] }), ['antony']);
});

test('recorded-with answers before the payload lands, rather than throwing', () => {
  assert.deepEqual(relatedFor(card('paul', { mentionedIn: ['antony'] })), ['antony']);
  assert.deepEqual(relatedFor(card('paul', { mentionedIn: ['antony'] }), null), ['antony']);
  assert.deepEqual(relatedFor(card('paul')), []);
  assert.deepEqual(relatedFor(null), []);
});

/*
 * The fixture below is one menologion date — 17 January — kept by three
 * churches, of which the Russian is the Old Calendar one. So "the same day" is
 * a different civil day and a different set of saints depending on who is
 * asking, which is the whole reason this is not a lookup.
 */
const feastSaints = [
  card('anthony', {
    hymned: ['russian'],
    attestations: [
      { church: 'russian', status: 'venerated', feast: { calendar: 'julian', month: 1, day: 17 } },
      { church: 'greek', status: 'venerated', feast: { calendar: 'revised-julian', month: 1, day: 17 } },
    ],
  }),
  card('theodosia', {
    attestations: [
      { church: 'russian', status: 'venerated', feast: { calendar: 'julian', month: 1, day: 17 } },
    ],
  }),
  card('kyriakos', {
    attestations: [
      { church: 'greek', status: 'venerated', feast: { calendar: 'revised-julian', month: 1, day: 17 } },
    ],
  }),
  card('elsewhere', {
    attestations: [
      { church: 'russian', status: 'venerated', feast: { calendar: 'julian', month: 7, day: 4 } },
    ],
  }),
  /*
   * The saint who makes the second filter necessary: 4 January Julian lands on
   * the same civil 17 January as the Greek church's 17 January, so this one
   * shares a *date* with Anthony's Greek feast while sharing no day with him at
   * all. A Greek reader is not kept company by the Russian calendar.
   */
  card('same-date-other-church', {
    attestations: [
      { church: 'russian', status: 'venerated', feast: { calendar: 'julian', month: 1, day: 4 } },
    ],
  }),
];

test('the same day is resolved by the reader’s own church, not read off the record', () => {
  const ru = sameDayFor(feastSaints[0], {
    saints: feastSaints,
    churchId: 'russian',
    churchesById: CHURCHES_BY_ID,
    year: 2026,
  });
  // 17 January Julian is 30 January in 2026, and the Russian day holds
  // Theodosia — who does not stand in the Greek one at all.
  assert.equal(ru.iso, '2026-01-30');
  assert.deepEqual(ru.slugs, ['theodosia']);

  const el = sameDayFor(feastSaints[0], {
    saints: feastSaints,
    churchId: 'greek',
    churchesById: CHURCHES_BY_ID,
    year: 2026,
  });
  assert.equal(el.iso, '2026-01-17');
  // Kyriakos and nobody else: another church's saint standing on the same civil
  // date is not kept the same day, which is the distinction the filter makes.
  assert.deepEqual(el.slugs, ['kyriakos']);
});

test('the same day never names the saint it is standing beside', () => {
  const { slugs } = sameDayFor(feastSaints[0], {
    saints: feastSaints,
    churchId: 'russian',
    churchesById: CHURCHES_BY_ID,
    year: 2026,
  });
  assert.ok(!slugs.includes('anthony'));
});

test('a busy day is capped, and says how many it left out', () => {
  const many = [
    feastSaints[0],
    ...Array.from({ length: 5 }, (_, i) =>
      card(`other-${i}`, {
        attestations: [
          { church: 'russian', status: 'venerated', feast: { calendar: 'julian', month: 1, day: 17 } },
        ],
      }),
    ),
  ];
  const ask = (limit) =>
    sameDayFor(many[0], {
      saints: many,
      churchId: 'russian',
      churchesById: CHURCHES_BY_ID,
      year: 2026,
      limit,
    });
  assert.equal(ask(2).slugs.length, 2);
  assert.equal(ask(2).total, 5);
  // Under the cap there is nothing left out, so nothing to say.
  assert.equal(ask(SAME_DAY_MAX).slugs.length, 5);
  assert.equal(ask(SAME_DAY_MAX).total, 5);
});

test('a saint with no feast in this church has no day, rather than the wrong one', () => {
  const answer = sameDayFor(feastSaints[2], {
    saints: feastSaints,
    churchId: 'russian',
    churchesById: CHURCHES_BY_ID,
    year: 2026,
  });
  assert.deepEqual(answer, { iso: null, slugs: [], total: 0 });
  assert.deepEqual(sameDayFor(feastSaints[0], { saints: feastSaints, churchesById: CHURCHES_BY_ID, year: 2026 }), {
    iso: null,
    slugs: [],
    total: 0,
  });
  assert.deepEqual(sameDayFor(null), { iso: null, slugs: [], total: 0 });
});
