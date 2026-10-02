import test from 'node:test';
import assert from 'node:assert/strict';

import { CHURCHES, CHURCHES_BY_ID, enabledChurches } from '../src/data/churches.js';
import {
  attestationsByChurch,
  attestationsIn,
  calendarFor,
  churchIds,
  churchName,
  churchStatus,
  entriesInChurch,
  keptBy,
} from '../src/lib/church.js';
import { facetsOf } from '../src/lib/index-filters.js';
import { WIDE, isWide } from '../src/lib/viewport.js';
import { greatFeast } from '../src/lib/liturgy.js';
import { CALENDAR_LABELS, formatFeast } from '../src/data/calendars.js';
import { fromJdn, gregorianToJdn, isValidDate, toJdn } from '../src/lib/jdn.js';

/**
 * The registry and the one choice made over it (author, 2026-08-22): three
 * churches, two calendars, Pascha Julian in all three. Pure functions here;
 * what the browser has to prove is that the chooser is wired to these.
 */

test('the registry is three churches, each on one of two calendars, Pascha Julian in all', () => {
  assert.deepEqual(CHURCHES.map((c) => c.id), ['russian', 'romanian', 'greek', 'serbian']);
  assert.equal(CHURCHES_BY_ID.russian.default_calendar, 'julian');
  assert.equal(CHURCHES_BY_ID.romanian.default_calendar, 'revised-julian');
  assert.equal(CHURCHES_BY_ID.greek.default_calendar, 'revised-julian');
  assert.equal(CHURCHES_BY_ID.serbian.default_calendar, 'julian');
  for (const c of CHURCHES) assert.equal(c.paschal_computus, 'julian', `${c.id} reckons Pascha by the Julian computus`);
  assert.deepEqual(churchIds(), enabledChurches().map((c) => c.id));
});

test('the Revised Julian is the Gregorian for fixed dates, and says so when printed', () => {
  assert.equal(toJdn('revised-julian', 2026, 1, 17), gregorianToJdn(2026, 1, 17));
  // The same menologion date, thirteen days apart on the civil calendar.
  assert.deepEqual(fromJdn('revised-julian', toJdn('julian', 2026, 1, 17)), { year: 2026, month: 1, day: 30 });
  assert.ok(isValidDate('revised-julian', 2024, 2, 29));
  assert.ok(!isValidDate('revised-julian', 2026, 2, 29));
  assert.equal(formatFeast({ calendar: 'revised-julian', day: 17, month: 1 }), '17 January (Revised Julian)');
  assert.equal(formatFeast({ calendar: 'julian', day: 17, month: 1 }), '17 January (Julian)');
  assert.equal(CALENDAR_LABELS['revised-julian'], 'Revised Julian');
  assert.equal(CALENDAR_LABELS.coptic, undefined);
});

test('a day in one church is that church’s entries, and nothing before a church is chosen', () => {
  const entries = [
    { slug: 'a', church: 'russian' },
    { slug: 'b', church: 'greek' },
    { slug: 'c', church: 'russian' },
  ];
  assert.deepEqual(entriesInChurch(entries, 'russian').map((e) => e.slug), ['a', 'c']);
  assert.deepEqual(entriesInChurch(entries, 'romanian'), []);
  assert.deepEqual(entriesInChurch(entries, null), []);
});

test('a saint is kept by a church that venerates them — and by nobody having chosen yet', () => {
  const card = {
    attestations: [
      { church: 'russian', status: 'venerated' },
      { church: 'romanian', status: 'undocumented' },
    ],
  };
  assert.equal(keptBy(card, 'russian'), true);
  assert.equal(keptBy(card, 'romanian'), false);
  assert.equal(keptBy(card, 'greek'), false);
  // Unanswered sets nothing aside: a filter that hid anyone before the
  // question was answered would be adjudicating by accident.
  assert.equal(keptBy(card, null), true);
  assert.equal(churchName('greek'), 'Greek');
  assert.equal(churchName('nope'), '');
});

/**
 * **A phone is Gregorian and nothing else** (author, 2026-09-12, restoring a
 * gate the Daily rebuild lost and making it stronger than the one it lost).
 *
 * The chooser was always the desktop's; what the old page did below the line
 * was hide the control and leave the church's own reckoning in force, so a
 * Russian reader was shown 30 August on a phone and could not ask for the
 * date their own clock agrees with.
 *
 * Asserted through `greatFeast` as well as through `calendarFor`, because the
 * one thing this must not do is move the label without the arithmetic: the
 * Dormition is 15 August, which a Julian church keeps on civil 28 August, and
 * a phone that printed "Gregorian" over a fast counted by Julian would be the
 * 2026-09-05 defect back at 360 px.
 */
test('under 1024 px the reckoning is Gregorian, and the fast moves with the label', () => {
  const real = Object.getOwnPropertyDescriptor(globalThis, 'matchMedia');
  const at = (px) => {
    globalThis.matchMedia = (q) => ({ matches: q === WIDE && px >= 1024 });
  };
  try {
    at(360);
    assert.equal(calendarFor('russian'), 'gregorian');
    assert.equal(calendarFor('serbian'), 'gregorian');
    assert.equal(calendarFor('romanian'), 'gregorian');
    assert.equal(greatFeast('2026-08-15', 'russian'), 'dormition');
    assert.equal(greatFeast('2026-08-28', 'russian'), null);

    at(1280);
    assert.equal(calendarFor('russian'), 'julian');
    assert.equal(calendarFor('romanian'), 'revised-julian');
    assert.equal(greatFeast('2026-08-28', 'russian'), 'dormition');
    assert.equal(greatFeast('2026-08-15', 'russian'), null);
  } finally {
    if (real) Object.defineProperty(globalThis, 'matchMedia', real);
    else delete globalThis.matchMedia;
  }

  // No `matchMedia` is not a phone. Every test written before this one, and
  // every build step that reads a calendar without a window, depends on it.
  assert.equal(isWide(), true);
  assert.equal(calendarFor('russian'), 'julian');
});

/*
 * One church, more than one day (the author, 2 October 2026: "whats so hard
 * about having the same saint profile commemorated on 2 days"). The corpus held
 * one feast to a church by convention and not by rule — the schema never
 * forbade a second — so the readers that mapped a church to *one* attestation
 * were the whole obstacle, and these three functions are what they read now.
 */

const twiceInGreek = {
  attestations: [
    { church: 'greek', status: 'venerated', feast: { day: 4, month: 9, calendar: 'revised-julian' }, titles: ['Martyr'] },
    { church: 'romanian', status: 'venerated', feast: { day: 5, month: 10, calendar: 'revised-julian' } },
    { church: 'greek', status: 'venerated', feast: { day: 5, month: 10, calendar: 'revised-julian' }, titles: ['Martyr', 'of Amisos'] },
    { church: 'serbian', status: 'undocumented' },
  ],
};

test('a church’s attestations are all of them, in the order the folder wrote them', () => {
  assert.deepEqual(
    attestationsIn(twiceInGreek.attestations, 'greek').map((a) => a.feast.month),
    [9, 10],
  );
  assert.equal(attestationsIn(twiceInGreek.attestations, 'romanian').length, 1);
  // A church that attests nothing, and a saint whose folder has no array at
  // all, both read as none rather than throwing: the readers walk the whole
  // registry and most saints answer for one calendar.
  assert.deepEqual(attestationsIn(twiceInGreek.attestations, 'russian'), []);
  assert.deepEqual(attestationsIn(undefined, 'greek'), []);
});

test('grouping by church keeps both days and leaves the silent churches out', () => {
  const by = attestationsByChurch(twiceInGreek.attestations);
  assert.deepEqual([...by.keys()], ['greek', 'romanian', 'serbian']);
  assert.equal(by.get('greek').length, 2);
  assert.equal(by.get('russian'), undefined);
  assert.equal(attestationsByChurch(undefined).size, 0);
});

test('one word for a church that recorded more than one row', () => {
  assert.equal(churchStatus(attestationsIn(twiceInGreek.attestations, 'greek')), 'venerated');
  assert.equal(churchStatus([]), 'undocumented');
  assert.equal(churchStatus([{ status: 'not-venerated' }]), 'not-venerated');
  // Veneration carries: a refusal recorded beside a feast is a refusal of that
  // other day, not of the saint, so the row may not read "Not venerated".
  assert.equal(churchStatus([{ status: 'not-venerated' }, { status: 'venerated' }]), 'venerated');
});

test('a saint kept twice by one church still stands in it, and once', () => {
  assert.ok(keptBy(twiceInGreek, 'greek'));
  assert.deepEqual(facetsOf([twiceInGreek]).churches, ['greek', 'romanian']);
});
