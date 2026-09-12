import test from 'node:test';
import assert from 'node:assert/strict';

import { CHURCHES, CHURCHES_BY_ID, enabledChurches } from '../src/data/churches.js';
import { calendarFor, churchIds, churchName, entriesInChurch, keptBy } from '../src/lib/church.js';
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
