/**
 * Errors 1 — a failure may degrade the page, never fake it — for the two
 * loaders that parse a network body, and for the strings the failure branches
 * reach for.
 *
 * The rendered half of the rule is `e2e/failure-honesty.spec.js`; this file is
 * the part that needs no browser: that `texts.failed` exists in every pack and
 * is not `texts.empty`, and that nothing but an outright failure can reach a
 * figure stated about the corpus.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { STRINGS } from '../src/ui/strings.js';
import { ru } from '../src/ui/locales/ru.js';
import { ro } from '../src/ui/locales/ro.js';
import { el } from '../src/ui/locales/el.js';
import { sr } from '../src/ui/locales/sr.js';

const PACKS = { en: STRINGS, ru, ro, el, sr };

test('every pack says "could not load" in words of its own, not "nothing here"', () => {
  for (const [id, pack] of Object.entries(PACKS)) {
    const texts = pack.texts;
    assert.equal(typeof texts.failed, 'string', `${id}: texts.failed missing`);
    assert.ok(texts.failed.length > 10, `${id}: texts.failed is a stub`);
    /*
     * The whole of the defect this test exists for: the Texts page rendered
     * `empty` when `data/texts.json` failed, so an offline reader was told the
     * site cites no primary sources at all. The two strings answer different
     * questions and may never be the same words.
     */
    assert.notEqual(texts.failed, texts.empty, `${id}: failed and empty are the same string`);
  }
});

test('the manifest loader refuses a 200 that carries a page', async (t) => {
  const { indexManifest } = await import('../src/lib/manifest.js');
  // `ok` is private, so the rule is exercised through what it protects: a
  // manifest that is not an array must throw rather than index to nothing.
  assert.throws(() => indexManifest({ saints: [] }), TypeError);
  assert.throws(() => indexManifest('<!doctype html>'), TypeError);
  // And the honest shape still indexes.
  const { bySlug } = indexManifest([{ slug: 'aaron' }]);
  assert.equal(bySlug.get('aaron').slug, 'aaron');
  t.diagnostic('the content-type guard itself is covered by e2e/failure-honesty.spec.js');
});
