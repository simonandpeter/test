import test from 'node:test';
import assert from 'node:assert/strict';

import { indexManifest } from '../src/lib/manifest.js';

/**
 * The two lookups every view is handed. `loadManifest` fetches and this
 * indexes, which is the half with a rule in it: an alias is a slug a merge
 * folded away (TODO item 13, the author's ruling of 2 October 2026 that the two
 * Charitinas are one woman), and a reader's bookmark of the dead slug has to
 * keep opening the saint it was folded into.
 *
 * The corpus itself is not read here — a test that reads `data/manifest.json`
 * at module scope has cost three red CI runs, the file being gitignored and
 * built after `npm test`. `tests/corpus-break.test.mjs` is where the corpus is
 * read, through `readCorpus`.
 */

const card = (slug, over = {}) => ({ slug, display_name: slug, ...over });

test('a slug a merge folded away still finds the saint it was folded into', () => {
  const heir = card('charitina-the-martyr-5-october', { aliases: ['charitina-the-martyr-4-september'] });
  const { bySlug, byAlias } = indexManifest([card('anthony-the-great'), heir]);

  assert.equal(bySlug.get('charitina-the-martyr-5-october'), heir);
  // The alias is *not* in `bySlug`: the saint page asks that first, and an
  // alias answering there would render the page under the dead URL instead of
  // redirecting to the live one.
  assert.equal(bySlug.get('charitina-the-martyr-4-september'), undefined);
  assert.equal(byAlias.get('charitina-the-martyr-4-september'), heir);
  assert.equal(byAlias.get('anthony-the-great'), undefined);
});

test('a card with no aliases contributes none, and the common case builds an empty map', () => {
  const { byAlias } = indexManifest([card('anthony-the-great'), card('paul-of-thebes', { aliases: [] })]);
  assert.equal(byAlias.size, 0);
});

/*
 * `scripts/build-manifest.mjs` fails the build over an alias that is a live
 * folder's slug, so this state cannot reach a reader. The index refuses it a
 * second time rather than trusting that, because the cost of being wrong is a
 * saint whose own URL bounces to a different saint — and the two are different
 * programs: the gate runs on the corpus, this runs on whatever was fetched.
 */
test('a live folder is never shadowed by another folder’s alias', () => {
  const live = card('charitina-the-martyr-4-september');
  const claimer = card('charitina-the-martyr-5-october', { aliases: ['charitina-the-martyr-4-september'] });
  const { bySlug, byAlias } = indexManifest([live, claimer]);

  assert.equal(bySlug.get('charitina-the-martyr-4-september'), live);
  assert.equal(byAlias.size, 0);
});
