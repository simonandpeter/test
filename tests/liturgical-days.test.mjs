import test from 'node:test';
import assert from 'node:assert/strict';
import { LITURGICAL_DAYS, bibleGatewayUrl, recordedDay } from '../src/data/liturgical-days.js';
import { CHURCHES } from '../src/data/churches.js';

/**
 * The days recorded from the calendars themselves.
 *
 * *Amended in place (Amendment 44).* This said "23 August – 19 September 2026,
 * every church, every day", and asserted the key set was exactly those 28. It
 * was the whole truth when four calendars had been read for four weeks; the
 * Russian and Romanian records now run months past it and the other two do
 * not, so the claim is a shape rather than a list:
 *
 *   - **23 August – 19 September 2026**: all four calendars, every day
 *     (Amendments 29 and 31). The one allowed gap is the Greek from 7 to 19
 *     September, whose readings saint.gr had not published when read — those
 *     entries say so in a note instead of inventing anything.
 *   - **After that**: the Russian and the Romanian only, and each stops where
 *     its source stops. Those two horizons are pinned below, because they are
 *     facts about the sources rather than about this repository, and the next
 *     sitting should be able to check them rather than rediscover them.
 *   - **The Greek and the Serbian never appear after 19 September**, which is
 *     the author's instruction of 2026-08-26 holding: their saints are in the
 *     corpus, their days are not.
 */

const FOUR_CALENDARS = [];
for (let d = new Date(Date.UTC(2026, 7, 23)); d <= new Date(Date.UTC(2026, 8, 19)); d.setUTCDate(d.getUTCDate() + 1)) {
  FOUR_CALENDARS.push(d.toISOString().slice(0, 10));
}
const GREEK_UNPUBLISHED = FOUR_CALENDARS.filter((iso) => iso >= '2026-09-07');

/**
 * Where each source stops, measured 2026-08-26.
 *
 * The Russian URL carries the *Julian* date, so it keeps serving through civil
 * 13 January 2027 (Julian 31 December 2026) and 404s the day after. The
 * Romanian URL carries no year at all and the site keeps one calendar year, so
 * `/1-ianuarie` is 1 January *2026* — a date already past — and the last day
 * it can be asked for is 31 December 2026.
 */
const RUSSIAN_LAST = '2027-01-13';
const ROMANIAN_LAST = '2026-12-31';

test('four calendars for the four weeks, two for the months after, and no day invented past either source', () => {
  const days = Object.keys(LITURGICAL_DAYS).sort();

  // the days are contiguous from the first: no hole anyone would have to explain
  assert.equal(days[0], '2026-08-23');
  for (let i = 1; i < days.length; i += 1) {
    const prev = new Date(`${days[i - 1]}T00:00:00Z`);
    prev.setUTCDate(prev.getUTCDate() + 1);
    assert.equal(days[i], prev.toISOString().slice(0, 10), `no gap before ${days[i]}`);
  }
  assert.ok(days.length > FOUR_CALENDARS.length, 'the records run past the four weeks');

  for (const iso of days) {
    const beyond = iso > '2026-09-19';
    for (const { id } of CHURCHES) {
      const rec = recordedDay(iso, id);
      if (beyond) {
        if (id === 'greek' || id === 'serbian') {
          assert.equal(rec, null, `${iso} ${id}: not recorded past the four weeks, and not invented`);
          continue;
        }
        if (id === 'russian' && iso > RUSSIAN_LAST) {
          assert.equal(rec, null, `${iso} russian: past what days.pravoslavie.ru serves`);
          continue;
        }
        if (id === 'romanian' && iso > ROMANIAN_LAST) {
          assert.equal(rec, null, `${iso} romanian: past what doxologia.ro serves`);
          continue;
        }
      }
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

  // each source is followed to its own end and no further
  assert.ok(recordedDay(RUSSIAN_LAST, 'russian'), 'the Russian is recorded to its last served day');
  assert.ok(recordedDay(ROMANIAN_LAST, 'romanian'), 'the Romanian is recorded to its last served day');
  assert.equal(days[days.length - 1], RUSSIAN_LAST, 'and the corpus stops with the later of the two');
  assert.equal(recordedDay('2026-09-20', 'greek'), null, 'an unrecorded day is null, never invented');
  assert.equal(recordedDay('2026-09-20', 'serbian'), null);
  assert.ok(recordedDay('2026-09-20', 'russian'), 'but the day the site used to go dark on is lit');
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
  // 15 September (2 September Julian): the source page's second pericope pair
  // carries its own label — "за понедельник и за вторник (под зачало)" — not
  // the day's plain "Epistle"/"Gospel" the first pair uses.
  assert.ok(recordedDay('2026-09-15', 'russian').readings.some((r) => r.label === 'Epistle (за понедельник и за вторник)' && r.ref === 'Galatians 5:11-21'));
  assert.ok(recordedDay('2026-09-15', 'russian').readings.some((r) => r.label === 'Gospel (за понедельник и за вторник)' && r.ref === 'Mark 7:5-16'));
  // Serbian day troparia of feasts: the Belt (13 September), the Archangel (19 September).
  assert.ok(recordedDay('2026-09-13', 'serbian').hymns.some((h) => /Полагање појаса/.test(h.source.text)));
  assert.ok(recordedDay('2026-09-19', 'serbian').hymns.some((h) => /архангела Михаила/.test(h.source.text)));
});

test('the months past the four weeks: what the two calendars printed, and nothing else', () => {
  /*
   * Amendment 44 (author: "Do the Romanian and Russian day records for the
   * next 6 months"). Six months was not there to be had — both sources stop
   * inside their own 2026 — but everything they do publish is here, and the
   * Daily page no longer runs dry on 19 September.
   *
   * 14 October 2026 is 1 October Julian, the Protection of the Theotokos, and
   * days.pravoslavie.ru prints it thus:
   *
   *   Седмица 20-я по Пятидесятнице.   Глас 2.
   *   День постный.                    Разрешается рыба.
   *   Утр. - Лк., 4 зач., I, 39-49, 56.
   *   Лит. - Богородицы: Евр., 320 зач., IX, 1-7.  Лк., 54 зач., X, 38-42; XI, 27-28.
   */
  const pokrov = recordedDay('2026-10-14', 'russian');
  assert.ok(pokrov, '14 October is recorded — months past where the records used to stop');
  // The Liturgy's readings, in the page's order, with the page's own set label
  // kept as printed. The Matins reading above is not one of them.
  assert.deepEqual(
    pokrov.readings.map((r) => [r.label, r.ref]),
    [
      ['Epistle (Богородицы)', 'Hebrews 9:1-7'],
      ['Gospel (Богородицы)', 'Luke 10:38-42; 11:27-28'],
    ],
  );
  assert.equal(pokrov.title, 'Седмица 20-я по Пятидесятнице');
  // Both fasting spans the page prints, joined and unaltered — the day is a
  // fast and fish is allowed, which are two different statements.
  assert.match(pokrov.fastingNote, /День постный/);
  assert.match(pokrov.fastingNote, /Разрешается рыба/);
  // The source line names the Julian date, because that is what the URL is.
  assert.match(pokrov.source.text, /1 октября ст\. ст\./);
  assert.equal(pokrov.source.url, 'https://days.pravoslavie.ru/Days/20261001.html');
  // A great feast keeps its hymns; they are the Russian's own and cite the day.
  assert.ok(pokrov.hymns?.length, 'a day the Typikon calls a great feast sings');
  for (const h of pokrov.hymns) {
    assert.equal(h.church, 'russian');
    assert.equal(h.lang, 'cu');
    assert.match(h.source.url, /days\.pravoslavie\.ru/);
  }
});

test('the hymns that travel with a day are the calendars\' own top rank, and the rest are left out on purpose', () => {
  /*
   * `liturgical-days.js` is imported eagerly, so every byte is in the first
   * download. Measured on the 28 hand-written days: readings, titles and
   * fasting notes cost 0.8 kB a day; adding the hymns of every festal service
   * costs 3.9 kB. Six months of the second is about 450 kB on a 116 kB module,
   * which is a bad trade for a page opened on a phone.
   *
   * So a day added here sings only where its own calendar gives it the top
   * rank — the Russian's T6, «Совершается служба великому празднику». That is
   * the calendar's judgement, not this repository's, and every hymn left out
   * is banked whole. An ordinary weekday carries none, and that is the point.
   */
  const ordinary = recordedDay('2026-10-15', 'russian');
  assert.ok(ordinary?.readings.length >= 2, 'an ordinary day still has its readings');
  assert.ok(!ordinary.hymns, 'and no hymns, so the six months stay a download anyone can afford');
});

test('a reference becomes a Bible Gateway link in the NKJV', () => {
  assert.equal(
    bibleGatewayUrl('1 Corinthians 15:1-11'),
    'https://www.biblegateway.com/passage/?search=1%20Corinthians%2015%3A1-11&version=NKJV',
  );
  assert.match(bibleGatewayUrl('Luke 10:38-42; 11:27-28'), /search=Luke%2010%3A38-42%3B%2011%3A27-28&version=NKJV$/);
});
