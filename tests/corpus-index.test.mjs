import test from 'node:test';
import assert from 'node:assert/strict';

import { civilDate, churchDate, feastIndex, onCivilDay, onMenologionDay, fold } from '../scripts/corpus-index.mjs';

/**
 * **The two feast keys, and why one of them is not enough.**
 *
 * It was settled that candidates are deduped on the feast date and never
 * on the name: name matching found none of the eight saints the corpus already
 * held for one day and invented pairs instead, and five of the eight would
 * have entered as silent duplicates.
 *
 * Writing `docs/CORPUS.md` found the second half of that rule, which the
 * amendment had used and not written down. A *civil-day* scan is not the key.
 * The Russian church's 18 September is civil 1 October and the Greek church's
 * 18 September is civil 18 September — one menologion page, two civil days a
 * fortnight apart — so a corpus holding a saint on the Greek day reports the
 * Russian day as empty, and the folder is written twice.
 *
 * Both scans are needed and they answer different questions: the civil one is
 * "what does this church show on this date", the menologion one is "does this
 * person already have a folder". These tests hold both, on a synthetic corpus
 * so that nothing here names a saint (`PLAN.md` section 5).
 */

test('a church calendar and the civil date are thirteen days apart, in the right direction', () => {
  // Julian 18 September 2026 is civil 1 October 2026.
  assert.equal(civilDate('julian', 9, 18, 2026), '2026-10-01');
  // Revised Julian is the Gregorian for a fixed feast until 2800.
  assert.equal(civilDate('revised-julian', 9, 18, 2026), '2026-09-18');
  assert.deepEqual(churchDate('julian', '2026-10-01'), { year: 2026, month: 9, day: 18 });
  assert.deepEqual(churchDate('revised-julian', '2026-10-01'), { year: 2026, month: 10, day: 1 });
});

const CORPUS = [
  {
    slug: 'a-greek-saint',
    saint: {
      slug: 'a-greek-saint',
      attestations: [
        { church: 'greek', status: 'venerated', feast: { day: 18, month: 9, calendar: 'revised-julian' } },
        { church: 'russian', status: 'undocumented' },
      ],
    },
  },
  {
    slug: 'a-russian-saint',
    saint: {
      slug: 'a-russian-saint',
      attestations: [{ church: 'russian', status: 'venerated', feast: { day: 18, month: 9, calendar: 'julian' } }],
    },
  },
];

test('the civil scan answers what a church shows on a date, and misses the other calendar', () => {
  const index = feastIndex(CORPUS);
  assert.deepEqual(onCivilDay(index, 'greek', '2026-09-18'), ['a-greek-saint']);
  assert.deepEqual(onCivilDay(index, 'russian', '2026-10-01'), ['a-russian-saint']);
  // The trap, stated as an assertion: on the Russian church's own 18 September
  // the Greek folder is invisible, and this is the reading that writes a
  // duplicate.
  assert.deepEqual(onCivilDay(index, 'greek', '2026-10-01'), []);
});

test('the menologion scan finds the folder whatever calendar keeps it', () => {
  const index = feastIndex(CORPUS);
  assert.deepEqual(onMenologionDay(index, 9, 18), ['a-greek-saint', 'a-russian-saint']);
  assert.deepEqual(onMenologionDay(index, 9, 17), []);
});

test('an unsourced or refused attestation is not a feast the index may hold', () => {
  /*
   * A feast day is a claim about veneration and the schema forbids one on a
   * refusal or a gap. The index enforces the same thing from the other side, so
   * a half-written folder cannot make a day look occupied.
   */
  const index = feastIndex([
    {
      slug: 'x',
      saint: { slug: 'x', attestations: [{ church: 'russian', status: 'undocumented', note: 'not read' }] },
    },
  ]);
  assert.deepEqual(onMenologionDay(index, 9, 18), []);
});

test('the name fold is a suspicion and says so by what it will not do', () => {
  // Diacritics, case and the joining words go, and the fold is script-blind
  // only within one script.
  assert.equal(fold('Sfântul Cuvios Siluan Athonitul'), 'sfantul cuvios siluan athonitul');
  assert.equal(fold('Theodore, of the Kyiv Caves'), 'theodore kyiv caves');
  // It will not fold across scripts or transliterations, which is exactly why
  // it may never be the decision — the feast index is.
  assert.notEqual(fold('Θεόδωρος'), fold('Theodore'));
});
