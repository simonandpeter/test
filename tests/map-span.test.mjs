/**
 * How long a saint reads as alive on the map (author, 2026-09-02: "Venerable
 * Sergius of Radonezh is apparently alive in 66 AD, along with several others
 * ... any saint who is on the map for longer than 100 years as alive may need
 * a check").
 *
 * The report looked like bad birth ranges and was not one. `pointAt` reads an
 * **undated** life as `live` — full strength and a halo, in every year the
 * timeline can show — so eleven located saints were lit from the corpus's
 * first year to its last. Not one of them had a wrong date; they had no date
 * at all, because the corpus takes its years from days.pravoslavie.ru and
 * these are saints the Russian calendar does not keep.
 *
 * This is the author's own threshold made into a check. It runs over the
 * saint files rather than the manifest so it fails on the data that caused it
 * rather than on a build artefact, and both lists below are named rather than
 * counted: a saint leaving either one is a finding, and a saint joining one is
 * a decision somebody has to write down here.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lifeBounds } from '../src/lib/map-track.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAINTS = path.join(ROOT, 'saints');

/**
 * Located saints the corpus genuinely cannot date. saint.gr, which is the
 * only calendar that keeps them, prints no year for any of these — and a
 * martyrdom the sources place only by naming a persecution is not a date.
 * They are still drawn, and still drawn `live` in every year; shortening this
 * list means finding a source, not inventing a century.
 */
const UNDATED = new Set([
  'basilissa-of-sirmium',
  'eulalius-the-hierarch',
  'myron-of-tamasos',
  'seven-virgins-of-gaza',
  'six-martyrs-of-melitene',
  'three-hundred-sixty-six-martyrs-of-nicomedia',
]);

/**
 * And the saints who really do read as alive for more than a century, each
 * because the corpus is right about them rather than in spite of it. Two
 * lived that long — the tradition is emphatic that Paul of Thebes reached 113
 * and Anthony 105 — and the third is a group whose death the Russian calendar
 * prints as “III-IV”, a two-hundred-year window that is the source's own.
 */
const LONG_LIVED = new Map([
  ['martyrs-3628-of-nicomedia', 200],
  ['paul-of-thebes', 123],
  ['anthony-the-great', 107],
]);

const located = [];
for (const slug of await readdir(SAINTS)) {
  const file = path.join(SAINTS, slug, 'saint.json');
  const card = await readFile(file, 'utf8').catch(() => null);
  if (!card) continue;
  const parsed = JSON.parse(card);
  if ((parsed.locations?.length ?? 0) === 0 && (parsed.track?.length ?? 0) === 0) continue;
  located.push(parsed);
}

test('the corpus has saints on the map to judge at all', () => {
  // The two lists below are both allowlists, so an empty sweep would pass
  // every assertion in this file while checking nothing.
  assert.ok(located.length > 50, `only ${located.length} located saints found`);
});

test('a located saint is either dated or named as undatable', () => {
  const bare = located
    .filter((card) => {
      const { born, died } = lifeBounds(card.dates);
      return born === null || died === null;
    })
    .map((card) => card.slug)
    .sort();
  assert.deepEqual(bare, [...UNDATED].sort());
});

test('nobody on the map is alive for over a century without a reason', () => {
  for (const card of located) {
    const { born, died } = lifeBounds(card.dates);
    if (born === null || died === null) continue;
    const span = died - born + 1;
    if (LONG_LIVED.has(card.slug)) {
      assert.equal(span, LONG_LIVED.get(card.slug), `${card.slug}'s span moved`);
      continue;
    }
    assert.ok(span <= 100, `${card.slug} reads as alive for ${span} years (${born}-${died})`);
  }
});

test('Sergius of Radonezh is not alive in 66 AD', () => {
  // The report itself. 66 is the year Euodus of Antioch died, and was the low
  // end of the timeline's own rail when this was written.
  const sergius = located.find((card) => card.slug === 'sergius-of-radonezh');
  assert.ok(sergius, 'Sergius is not on the map at all');
  const { born, died } = lifeBounds(sergius.dates);
  assert.equal(born, 1392);
  assert.equal(died, 1392);
});
