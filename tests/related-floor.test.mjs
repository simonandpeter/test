import test from 'node:test';
import assert from 'node:assert/strict';

import { readCorpus } from '../scripts/corpus-index.mjs';
import { proseMatches, readExclusions, key } from '../scripts/related-floor.mjs';

/**
 * **Every saint the page hyperlinks in a life is in that life's Related
 * section, and in that saint's.** The author's rule, stated many times; this
 * is the half of it `tests/life-links.test.mjs` does not cover — that one
 * reads the `/saints/<slug>` links a hand wrote, this one the names
 * `src/lib/cross-link.js` turns into links at render time.
 *
 * **Why a test and not a script.** The hyperlink is derived from the whole
 * corpus at render time; `related` is typed by hand into `saint.json`. The two
 * have no connection, so they diverge every time a folder is added — not by
 * neglect but by construction, which is why four rounds of hand-editing never
 * closed it. `dumitru-staniloae` carried no `related` key at all while Gregory
 * Palamas rendered as a link on his page. `node scripts/related-floor.mjs
 * --write` is the fix; this is what stops it reopening.
 *
 * It reads `saints/` through `readCorpus`, never `data/manifest.json`, which is
 * gitignored and absent when CI runs this.
 */

const corpus = readCorpus();
const rows = proseMatches(corpus);
const excluded = readExclusions();
const related = new Map(corpus.map((c) => [c.slug, new Set(c.saint.related ?? [])]));

test('a saint the linker finds in a life is a related row on that life', () => {
  const missing = rows
    .filter((r) => !excluded[key(r)] && !related.get(r.dir)?.has(r.slug))
    .map((r) => `${key(r)}   ${r.quote}`);
  assert.deepEqual(
    missing,
    [],
    `${missing.length} name(s) the page links with no related row — ` +
      '`node scripts/related-floor.mjs --write`:\n  ' +
      missing.join('\n  '),
  );
});

test('and on the saint it names, so the reader can walk back', () => {
  /*
   * Two-way, as the hand-written tier was: a reader who arrives at B because
   * A's life speaks of him has to be able to get from B to A. The reverse
   * index `build-manifest.mjs` derives is not this — it reverses `related`,
   * so a row absent from `related` is absent from both faces of the page.
   */
  const missing = rows
    .filter((r) => !excluded[key(r)] && !related.get(r.slug)?.has(r.dir))
    .map((r) => `${r.slug} -> ${r.dir}   (named in ${r.dir}'s life: ${r.quote})`);
  assert.deepEqual(
    missing,
    [],
    `${missing.length} reverse row(s) missing — ` +
      '`node scripts/related-floor.mjs --write`:\n  ' +
      missing.join('\n  '),
  );
});

test('every exclusion still describes a match the index makes', () => {
  /*
   * The point of the list is that the gap is visible. A line that no longer
   * matches anything — the life rewritten, the folder renamed — is a reading
   * nobody can check, and leaving it there hides the next real one under it.
   * The same bargain `life-links.test.mjs` strikes with `KEPT`.
   */
  const found = new Set(rows.map(key));
  const stale = Object.keys(excluded).filter((k) => !found.has(k));
  assert.deepEqual(stale, [], `exclusion names a match no life makes: ${stale.join(', ')}`);
});

test('every exclusion says which category it is and why', () => {
  // A row with no reason is a silent exclusion, which is the failure this
  // whole list exists to avoid — the same gap, one layer down.
  const bare = Object.entries(excluded)
    .filter(([, v]) => !v?.category || !v?.reason)
    .map(([k]) => k);
  assert.deepEqual(bare, [], `exclusion with no category or reason: ${bare.join(', ')}`);
  assert.ok(Object.keys(excluded).length > 0, 'the exclusion list emptied — the readings behind it were lost');
});

test('a related row names a folder that exists', () => {
  // The floor writes slugs from the index, so they exist by construction; a
  // hand-written row beside them need not, and this is the cheapest place to
  // say so now that 10,000 edges run through the page.
  const dead = [];
  for (const { slug, saint } of corpus) {
    for (const rel of saint.related ?? []) if (!related.has(rel)) dead.push(`${slug} -> ${rel}`);
  }
  assert.deepEqual(dead, [], `related names no folder: ${dead.join(', ')}`);
});
