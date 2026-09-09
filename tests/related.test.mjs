import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { reverseRelated } from '../scripts/build-manifest.mjs';

/**
 * **`related` says who a life speaks of; `mentionedIn` says whose story a
 * person is remembered inside.** The second is the first read backwards, and
 * the author asked for it on 2026-09-09 — the corpus already held 73 of these
 * and none was visible from the receiving end.
 *
 * The rule these tests exist to protect is the one the reverse index could
 * quietly break: **it is derived from `related`, never from the hyperlinks in
 * a life.** A church, lavra, chapel, feast or ship named for a saint is not an
 * association with them, and 23 of the 86 links the corpus produces are exactly
 * that. Built from links, Alexander Nevsky would acquire six twentieth-century
 * martyrs he never met.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAINTS = path.join(ROOT, 'saints');

/** The corpus's own folders, since `/data/` is gitignored and may not exist. */
const records = readdirSync(SAINTS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => path.join(SAINTS, e.name, 'saint.json'))
  .filter((f) => existsSync(f))
  .map((f) => JSON.parse(readFileSync(f, 'utf8')));

test('every reversed edge is a real forward edge', () => {
  const forward = new Map(records.map((s) => [s.slug, new Set(s.related ?? [])]));
  for (const [target, sources] of reverseRelated(records)) {
    for (const from of sources) {
      assert.ok(
        forward.get(from)?.has(target),
        `${target} claims to be mentioned in ${from}, whose related does not name it`,
      );
    }
  }
});

test('every forward edge is reversed', () => {
  const back = reverseRelated(records);
  for (const saint of records) {
    for (const rel of saint.related ?? []) {
      if (rel === saint.slug) continue;
      assert.ok(
        back.get(rel)?.includes(saint.slug),
        `${saint.slug} names ${rel}, which does not know it`,
      );
    }
  }
});

test('a saint is never mentioned in their own life', () => {
  for (const [target, sources] of reverseRelated(records)) {
    assert.ok(!sources.includes(target), `${target} is listed as mentioning itself`);
  }
});

test('the reverse index is derived, never stored in a folder', () => {
  /*
   * A fact held in two places is a fact that can disagree with itself, and the
   * corpus contract is that a saint's folder is written by hand. If
   * `mentionedIn` ever appears in a `saint.json`, someone has written a
   * derived value back into the source.
   */
  const stored = records.filter((s) => s.mentionedIn !== undefined).map((s) => s.slug);
  assert.deepEqual(stored, [], `mentionedIn is stored in a folder: ${stored.join(', ')}`);
});

test('sources are unique and sorted, so the page order is stable', () => {
  for (const [, sources] of reverseRelated(records)) {
    assert.deepEqual(sources, [...new Set(sources)].sort());
  }
});
