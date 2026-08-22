import test from 'node:test';
import assert from 'node:assert/strict';
import { LITURGICAL_DAYS, bibleGatewayUrl, recordedDay } from '../src/data/liturgical-days.js';
import { CHURCHES } from '../src/data/churches.js';

/**
 * The week recorded by hand from the three calendars (author's instruction,
 * 2026-08-22): every day carries every church, every church carries an
 * Apostle and a Gospel with a source page, and the links are well formed.
 */

test('the recorded week is 23–29 August 2026, every church, every day', () => {
  const days = Object.keys(LITURGICAL_DAYS).sort();
  assert.deepEqual(days, ['2026-08-23', '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29']);
  for (const iso of days) {
    for (const { id } of CHURCHES) {
      const rec = recordedDay(iso, id);
      assert.ok(rec, `${iso} ${id} is recorded`);
      assert.equal(rec.readings.length, 2, `${iso} ${id} has an Apostle and a Gospel`);
      for (const r of rec.readings) assert.match(r.ref, /^[1-3]?\s?[A-Z][a-z]+ \d/, `${iso} ${id} reference "${r.ref}" is a normalised English reference`);
      assert.match(rec.source.url, /^https:\/\/(days\.pravoslavie\.ru|doxologia\.ro|www\.saint\.gr)\//, `${iso} ${id} names the page it was read from`);
    }
  }
  assert.equal(recordedDay('2026-08-30', 'greek'), null, 'an unrecorded day is null, never invented');
});

test('the readings differ where the calendars differ, and agree where they agree', () => {
  // 23 August: the Greek reads the Leavetaking of the Dormition; the Russian
  // and the Romanian the Sunday. 28 August: the Russian reads the Dormition
  // (15 August Julian); the others the weekday.
  assert.equal(recordedDay('2026-08-23', 'greek').readings[0].ref, 'Philippians 2:5-11');
  assert.equal(recordedDay('2026-08-23', 'romanian').readings[0].ref, '1 Corinthians 15:1-11');
  assert.equal(recordedDay('2026-08-23', 'russian').readings[0].ref, '1 Corinthians 15:1-11');
  assert.equal(recordedDay('2026-08-28', 'russian').readings[0].ref, 'Philippians 2:5-11');
  assert.equal(recordedDay('2026-08-28', 'greek').readings[1].ref, 'Mark 4:1-9');
  // And a feast's hymns travel with the day where the day is the feast's.
  assert.equal(recordedDay('2026-08-23', 'greek').hymns.length, 2);
  assert.equal(recordedDay('2026-08-23', 'greek').hymns[0].kind, 'troparion');
});

test('a reference becomes a Bible Gateway link in the NKJV', () => {
  assert.equal(
    bibleGatewayUrl('1 Corinthians 15:1-11'),
    'https://www.biblegateway.com/passage/?search=1%20Corinthians%2015%3A1-11&version=NKJV',
  );
  assert.match(bibleGatewayUrl('Luke 10:38-42; 11:27-28'), /search=Luke%2010%3A38-42%3B%2011%3A27-28&version=NKJV$/);
});
