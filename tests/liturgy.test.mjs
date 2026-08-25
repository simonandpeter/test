import test from 'node:test';
import assert from 'node:assert/strict';
import { cycleOf, fasting, liturgicalDay, paschaAround, tone } from '../src/lib/liturgy.js';
import { cycleName } from '../src/ui/cycle-name.js';

/*
 * `cycleTitle` composed an English sentence inside lib/liturgy.js until
 * 2026-08-26, when the author asked for that line in the reader's language
 * too. The reckoning stayed where it was and the words moved out:
 * `cycleOf` returns which day of the cycle it is, `cycleName` renders it from
 * the packs. These assertions read through the pair, so they still pin the
 * same sentences — and the English pack is now one of the things they pin.
 */
const cycleTitle = (iso, computus) => cycleName(cycleOf(iso, computus), iso);

/**
 * The liturgical day, checked against what the three churches' own calendars
 * printed for the week of 23–29 August 2026 (days.pravoslavie.ru for the
 * Russian, doxologia.ro for the Romanian, saint.gr for the Greek; read
 * 2026-08-22) and against the fixed anchors of the paschal cycle.
 */

test('the paschal year is the one whose Pascha is on or before the day', () => {
  // Orthodox Pascha 2026 is 12 April; 2027 is 2 May.
  assert.equal(paschaAround('2026-08-23').paschalYear, 2026);
  assert.equal(paschaAround('2026-04-12').paschalYear, 2026);
  assert.equal(paschaAround('2026-04-11').paschalYear, 2025);
  assert.equal(paschaAround('2027-03-01').paschalYear, 2026);
});

test('the week of 23 August 2026 is the 12th Sunday after Pentecost and the 13th week, Tone 3 — as all three calendars print', () => {
  assert.equal(cycleTitle('2026-08-23'), '12th Sunday after Pentecost');
  assert.equal(cycleTitle('2026-08-24'), '13th week after Pentecost');
  assert.equal(cycleTitle('2026-08-29'), '13th week after Pentecost');
  assert.equal(cycleTitle('2026-08-30'), '13th Sunday after Pentecost');
  for (const day of [23, 24, 25, 26, 27, 28, 29]) assert.equal(tone(`2026-08-${day}`), 3, `tone on ${day} August`);
});

test('the tone turns weekly from Thomas Sunday and restarts after eight', () => {
  // Pascha 2026: 12 April. Thomas Sunday 19 April, Tone 1; All Saints 7 June,
  // Tone 8; the 2nd Sunday after Pentecost, 14 June, Tone 1 again.
  assert.equal(tone('2026-04-19'), 1);
  assert.equal(tone('2026-04-26'), 2);
  assert.equal(tone('2026-06-07'), 8);
  assert.equal(tone('2026-06-14'), 1);
  assert.equal(tone('2026-06-17'), 1, 'a weekday keeps the tone of the Sunday before it');
  // Pentecost has no tone of the cycle; Bright Week turns daily and skips the seventh.
  assert.equal(tone('2026-05-31'), null);
  assert.deepEqual([12, 13, 14, 15, 16, 17, 18].map((d) => tone(`2026-04-${d}`)), [1, 2, 3, 4, 5, 6, 8]);
  // Palm Sunday and Holy Week 2027 (Pascha 2 May): none.
  assert.equal(tone('2027-04-25'), null);
  assert.equal(tone('2027-04-30'), null);
});

/* The composed titles print an ordinary hyphen since 2026-08-25 evening
   ("replace all emm dashes with normal dashes"): the sweep ran over string
   literals only, so this file's own commentary keeps the em dash and the
   assertions below carry what the page now shows. The pack `reasons` maps are
   keyed on these same English strings and were swept in the same pass, so key
   and value still meet. */
test('the named Sundays of the Pentecostarion and the Triodion', () => {
  assert.equal(cycleTitle('2026-04-12'), 'Pascha - the Resurrection of the Lord');
  assert.equal(cycleTitle('2026-04-15'), 'Bright Wednesday');
  assert.equal(cycleTitle('2026-04-19'), 'Thomas Sunday - Antipascha');
  assert.equal(cycleTitle('2026-05-21'), 'Ascension of the Lord');
  assert.equal(cycleTitle('2026-05-31'), 'Pentecost');
  assert.equal(cycleTitle('2026-06-07'), 'Sunday of All Saints');
  // The week takes the number of the Sunday that ends it — the lectionary's
  // count, and the one days.pravoslavie.ru prints ("Седмица 13-я" for 24
  // August): the fast-free week after Pentecost is the 1st, ending with All
  // Saints, and the Monday after All Saints opens the 2nd.
  assert.equal(cycleTitle('2026-06-02'), '1st week after Pentecost');
  assert.equal(cycleTitle('2026-06-08'), '2nd week after Pentecost');
  // Pascha 2027 is 2 May: the Publican and the Pharisee 70 days before,
  // Clean Monday 48, the 1st Sunday of Lent 42, Palm Sunday 7.
  assert.equal(cycleTitle('2027-02-21'), 'Sunday of the Publican and the Pharisee');
  assert.equal(cycleTitle('2027-02-24'), 'Wednesday of the week of the Publican and the Pharisee');
  assert.equal(cycleTitle('2027-03-03'), 'Wednesday of Meatfare Week');
  assert.equal(cycleTitle('2027-03-07'), 'Meatfare Sunday - the Last Judgement');
  assert.equal(cycleTitle('2027-03-10'), 'Wednesday of Cheesefare Week');
  assert.equal(cycleTitle('2027-03-14'), 'Cheesefare Sunday - Forgiveness Sunday');
  assert.equal(cycleTitle('2027-03-15'), 'Clean Monday - Great Lent begins');
  assert.equal(cycleTitle('2027-03-17'), 'Wednesday of the 1st week of Great Lent');
  assert.equal(cycleTitle('2027-03-21'), '1st Sunday of Great Lent - the Triumph of Orthodoxy');
  assert.equal(cycleTitle('2027-04-07'), 'Wednesday of the 4th week of Great Lent');
  assert.equal(cycleTitle('2027-04-24'), 'Lazarus Saturday');
  assert.equal(cycleTitle('2027-04-25'), 'Palm Sunday - the Entry into Jerusalem');
  assert.equal(cycleTitle('2027-04-30'), 'Great and Holy Friday');
});

test('the week of 23 August 2026: the Julian-calendar churches are still in the Dormition Fast, the New Calendar churches are not', () => {
  // days.pravoslavie.ru: Успенский пост Sunday to Thursday; Friday is the
  // Dormition, "разрешается рыба"; Saturday "поста нет".
  // pravoslavno.rs marks the Serbian week the same way: "пост" Monday to
  // Friday, nothing on Sunday 23 or Saturday 29 — the same Julian calendar.
  for (const church of ['russian', 'serbian']) {
    for (const day of [23, 24, 25, 26, 27]) {
      assert.deepEqual(fasting(`2026-08-${day}`, church), { kind: 'fast', reason: 'the Dormition Fast' }, `${church} ${day}`);
    }
    assert.equal(fasting('2026-08-28', church).kind, 'fish', `${church} Dormition`);
    assert.equal(fasting('2026-08-29', church).kind, 'fast-free', `${church} Saturday`);
  }
  // doxologia.ro and saint.gr: nothing Sunday to Tuesday, fast on Wednesday
  // and Friday, and the Beheading on Saturday — "(Post)", "Νηστεία".
  for (const church of ['romanian', 'greek']) {
    assert.equal(fasting('2026-08-23', church).kind, 'fast-free', `${church} Sunday`);
    assert.equal(fasting('2026-08-25', church).kind, 'fast-free', `${church} Tuesday`);
    assert.deepEqual(fasting('2026-08-26', church), { kind: 'fast', reason: 'Wednesday' }, `${church} Wednesday`);
    assert.equal(fasting('2026-08-27', church).kind, 'fast-free', `${church} Thursday`);
    assert.deepEqual(fasting('2026-08-28', church), { kind: 'fast', reason: 'Friday' }, `${church} Friday`);
    assert.deepEqual(fasting('2026-08-29', church), { kind: 'fast', reason: 'the Beheading of the Forerunner' }, `${church} Saturday`);
  }
});

test('the other fasts and the feasts that lift them, in the church’s own calendar', () => {
  // Greek: Nativity 25 December is civil; fast-free through 4 January; the
  // Eve of Theophany strict; Theophany free. Russian: the same dates 13 days on.
  assert.equal(fasting('2026-12-25', 'greek').kind, 'fast-free');
  assert.equal(fasting('2027-01-05', 'greek').reason, 'the Eve of Theophany');
  assert.equal(fasting('2027-01-06', 'greek').reason, 'Theophany');
  assert.equal(fasting('2026-12-25', 'russian').reason, 'the Nativity Fast');
  assert.equal(fasting('2027-01-07', 'russian').reason, 'Nativity of the Lord');
  // Great Lent 2027 from Clean Monday 22 March; the Annunciation inside it is
  // fish on the New Calendar (25 March) and on the Old (7 April civil).
  assert.equal(fasting('2027-03-22', 'greek').reason, 'Great Lent');
  assert.equal(fasting('2027-03-25', 'greek').kind, 'fish');
  assert.equal(fasting('2027-04-07', 'russian').kind, 'fish');
  assert.equal(fasting('2027-04-25', 'greek').reason, 'Palm Sunday');
  assert.equal(fasting('2027-04-30', 'russian').reason, 'Holy Week');
  // Bright Week is free; the Wednesday after Pentecost is free; the
  // Transfiguration inside the Dormition Fast is fish.
  assert.equal(fasting('2027-05-05', 'greek').reason, 'Bright Week');
  assert.equal(fasting('2026-06-03', 'greek').reason, 'the week after Pentecost');
  assert.equal(fasting('2026-08-19', 'russian').kind, 'fish');
  assert.equal(fasting('2026-08-06', 'greek').kind, 'fish');
  // The Exaltation is a strict fast whatever the day; 14 September Greek is a Monday in 2026.
  assert.equal(fasting('2026-09-14', 'greek').reason, 'the Exaltation of the Cross');
});

test('liturgicalDay gathers the three for the chosen church', () => {
  // `title` became `cycle` on 2026-08-26: a key and its number rather than an
  // English sentence, so the line can be printed in five languages. The
  // rendering is asserted through cycleName above.
  assert.deepEqual(liturgicalDay('2026-08-28', 'russian'), {
    cycle: { key: 'weekAfterPentecost', n: 13 },
    tone: 3,
    fasting: { kind: 'fish', reason: 'a Great Feast on a Friday' },
  });
  assert.deepEqual(liturgicalDay('2026-08-23', 'greek'), {
    cycle: { key: 'sundayAfterPentecost', n: 12 },
    tone: 3,
    fasting: { kind: 'fast-free', reason: null },
  });
});
