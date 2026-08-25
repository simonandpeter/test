/**
 * Saints named inside a life, linked to their own pages (author, 2026-08-26).
 *
 * The DOM walk is the browser suite's; what is checked here is the index — the
 * four rules that decide what may be linked at all. Each rule was arrived at by
 * running the finished index over all 742 lives (`scripts/cross-link-audit.mjs`) and
 * narrowing until every link it proposed was right, so each case below is a
 * shape the corpus actually holds.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { buildNameIndex, matchableName, usableName } from '../src/lib/cross-link.js';

const saint = (display_name) => ({ slug: display_name.toLowerCase().replace(/\W+/g, '-'), display_name });

test('a folder title is cut back to what a life would actually write', () => {
  assert.equal(matchableName('Ignatius (Lebedev), Schema-archimandrite, Monk-martyr (1938)'), 'Ignatius');
  assert.equal(matchableName('Athanasius of Alexandria'), 'Athanasius of Alexandria');
  assert.equal(matchableName('John, Archbishop of Novgorod'), 'John');
});

test('one word is never distinctive enough to link on', () => {
  // 43 folders are a single name — Christopher, Laurence, Faustus — and a life
  // mentioning a Laurence is not thereby mentioning that Laurence.
  assert.equal(usableName('Ignatius'), false);
  assert.equal(usableName('Christopher'), false);
  assert.equal(usableName('Athanasius of Alexandria'), true);
});

test('a regnal numeral is not disambiguation, and this is why', () => {
  /*
   * The one false positive the whole-corpus run produced. "John II" matched
   * `john-ii-metropolitan-of-kyiv` inside "the emperor John II Komnenos" in
   * Irene the Empress's life — a Kyivan metropolitan offered as a Byzantine
   * emperor. Numerals are shared by emperors, patriarchs and metropolitans of
   * the same name, and the corpus holds several of each.
   */
  assert.equal(usableName('John II'), false);
  assert.equal(usableName('George I'), false);
  assert.equal(usableName('John V'), false);
  // And the rule is about numerals, not about short second words.
  assert.equal(usableName('Paul the New'), true);
});

test('a form two saints share links to neither', () => {
  // Seven forms in the corpus have two claimants — "Alexander the Presbyter",
  // "John the Presbyter" and five more, all new martyrs of the 1930s whose
  // folders differ only by a year. Silence is right: the site cannot tell which
  // is meant, and neither could a reader from a link.
  const { bySlug } = buildNameIndex([
    { slug: 'alexander-presbyter-1937', display_name: 'Alexander the Presbyter (1937)' },
    { slug: 'alexander-presbyter-1938', display_name: 'Alexander the Presbyter (1938)' },
    { slug: 'anthony-the-great', display_name: 'Anthony the Great' },
  ]);
  assert.equal(bySlug.get('Alexander the Presbyter'), null);
  assert.equal(bySlug.get('Anthony the Great'), 'anthony-the-great');
});

test('the pattern finds the longest form first, and stops at letters', () => {
  const { pattern } = buildNameIndex([
    saint('Athanasius of Alexandria'),
    saint('Anthony the Great'),
  ]);
  const found = (text) => [...text.matchAll(pattern)].map((m) => m[1]);
  assert.deepEqual(found('written by Athanasius of Alexandria, which'), ['Athanasius of Alexandria']);
  // Letter boundaries rather than `\b`, which is ASCII-only in JavaScript
  // (Amendment 41): a form must not match inside a longer word.
  assert.deepEqual(found('Anthony the Greatest'), []);
  assert.deepEqual(found('— Anthony the Great.'), ['Anthony the Great']);
});

test('an index with nothing usable in it produces no pattern at all', () => {
  // Rather than an empty alternation, which matches everywhere.
  const { pattern } = buildNameIndex([saint('Christopher'), saint('Laurence')]);
  assert.equal(pattern, null);
});
