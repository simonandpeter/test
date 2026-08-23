import test from 'node:test';
import assert from 'node:assert/strict';
import { LITURGICAL_DAYS, bibleGatewayUrl, recordedDay } from '../src/data/liturgical-days.js';
import { CHURCHES } from '../src/data/churches.js';

/**
 * The four weeks recorded from the four calendars (author's instruction,
 * 2026-08-22 and 2026-08-23; Amendments 29 and 31): every day carries every
 * church, every church carries an Apostle and a Gospel with a source page,
 * and the links are well formed. The one allowed gap is the Greek calendar
 * from 7 to 19 September, whose readings saint.gr had not yet published when
 * read — those entries say so in a note instead of inventing anything.
 */

const DAYS = [];
for (let d = new Date(Date.UTC(2026, 7, 23)); d <= new Date(Date.UTC(2026, 8, 19)); d.setUTCDate(d.getUTCDate() + 1)) {
  DAYS.push(d.toISOString().slice(0, 10));
}
const GREEK_UNPUBLISHED = DAYS.filter((iso) => iso >= '2026-09-07');

test('the recorded days are 23 August – 19 September 2026, every church, every day', () => {
  const days = Object.keys(LITURGICAL_DAYS).sort();
  assert.deepEqual(days, DAYS);
  for (const iso of days) {
    for (const { id } of CHURCHES) {
      const rec = recordedDay(iso, id);
      assert.ok(rec, `${iso} ${id} is recorded`);
      if (id === 'greek' && GREEK_UNPUBLISHED.includes(iso)) {
        assert.equal(rec.readings.length, 0, `${iso} greek: nothing invented`);
        assert.match(rec.note, /saint\.gr had not yet published/, `${iso} greek says why it is empty`);
      } else {
        // Two at least — an Apostle and a Gospel; some days print more (a feast's set, a Saturday's two Apostles).
        assert.ok(rec.readings.length >= 2, `${iso} ${id} has an Apostle and a Gospel`);
      }
      for (const r of rec.readings) assert.match(r.ref, /^[1-3]?\s?[A-Z][a-z]+ \d+:\d/, `${iso} ${id} reference "${r.ref}" is a normalised English reference`);
      assert.match(rec.source.url, /^https:\/\/(days\.pravoslavie\.ru|doxologia\.ro|www\.saint\.gr|www\.pravoslavno\.rs)\//, `${iso} ${id} names the page it was read from`);
      for (const h of rec.hymns ?? []) {
        assert.equal(h.church, id, `${iso} ${id}: a day's hymn belongs to the church whose calendar printed it`);
        assert.ok(h.text.length > 40 && h.source?.url, `${iso} ${id}: a hymn carries its text and its source`);
      }
    }
  }
  assert.equal(recordedDay('2026-09-20', 'greek'), null, 'an unrecorded day is null, never invented');
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
  // The three weeks that followed (Amendment 31): 8 September is the Nativity
  // of the Theotokos for the Romanian and Greek calendars — the feast's
  // pericopes and hymns — while the Russian reads 26 August (Julian), Adrian
  // and Natalia, with the Vladimir icon's hymns; 11 September is the Beheading
  // for the Russian and Serbian calendars, a strict fast.
  assert.equal(recordedDay('2026-09-08', 'romanian').readings[0].ref, 'Philippians 2:5-11');
  assert.ok(recordedDay('2026-09-08', 'romanian').hymns.some((h) => h.kind === 'troparion' && /Naşterea ta/.test(h.text)));
  assert.ok(recordedDay('2026-09-08', 'greek').hymns.some((h) => h.kind === 'troparion' && /γέννησίς σου/.test(h.text)), 'the Greek apolytikion of the Nativity travels with the day as a troparion');
  assert.equal(recordedDay('2026-09-08', 'russian').readings[0].ref, 'Galatians 2:21-3:7');
  assert.ok(recordedDay('2026-09-08', 'russian').hymns.some((h) => /Владимирск/.test(h.source.text)));
  assert.equal(recordedDay('2026-09-11', 'russian').readings[0].ref, 'Acts 13:25-32');
  assert.match(recordedDay('2026-09-11', 'russian').fastingNote, /Строгий пост/);
  assert.equal(recordedDay('2026-09-11', 'serbian').readings[1].ref, 'Acts 13:25-32');
  // A Russian day with several sets of pericopes keeps the set's label.
  assert.ok(recordedDay('2026-09-17', 'russian').readings.some((r) => r.label === 'Epistle (Свв)' && r.ref === 'Hebrews 11:33-12:2'));
  // Serbian day troparia of feasts: the Belt (13 September), the Archangel (19 September).
  assert.ok(recordedDay('2026-09-13', 'serbian').hymns.some((h) => /Полагање појаса/.test(h.source.text)));
  assert.ok(recordedDay('2026-09-19', 'serbian').hymns.some((h) => /архангела Михаила/.test(h.source.text)));
});

test('a reference becomes a Bible Gateway link in the NKJV', () => {
  assert.equal(
    bibleGatewayUrl('1 Corinthians 15:1-11'),
    'https://www.biblegateway.com/passage/?search=1%20Corinthians%2015%3A1-11&version=NKJV',
  );
  assert.match(bibleGatewayUrl('Luke 10:38-42; 11:27-28'), /search=Luke%2010%3A38-42%3B%2011%3A27-28&version=NKJV$/);
});
