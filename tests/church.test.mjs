import test from 'node:test';
import assert from 'node:assert/strict';

import { CHURCHES, CHURCHES_BY_ID, enabledChurches } from '../src/data/churches.js';
import { churchIds, churchName, entriesInChurch, keptBy } from '../src/lib/church.js';
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
