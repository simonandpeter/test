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

import { buildNameIndex, buildSurnameIndex, matchableName, usableName } from '../src/lib/cross-link.js';

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
  //: a form must not match inside a longer word.
  assert.deepEqual(found('Anthony the Greatest'), []);
  assert.deepEqual(found('— Anthony the Great.'), ['Anthony the Great']);
});

test('an index with nothing usable in it produces no pattern at all', () => {
  // Rather than an empty alternation, which matches everywhere.
  const { pattern } = buildNameIndex([saint('Christopher'), saint('Laurence')]);
  assert.equal(pattern, null);
});

test('a related saint is linked by given name and surname, and never by the given name alone', () => {
  // Stephen (Kreydich)'s life names "the igumen Eugene (Vyzhva)"; the life of
  // Alexander, presbyter-martyr of 1918, names "the priest Leo Ershov". Both are
  // on those saints' Related lists and both were one word to buildNameIndex.
  const { pattern, bySlug } = buildSurnameIndex([
    { slug: 'eugene-vyzhva', display_name: 'Eugene (Vyzhva)' },
    { slug: 'leo-presbyter-martyr-1918', display_name: 'Leo (Ershov)' },
    { slug: 'theodore-disciple', display_name: 'Theodore, disciple of Maximus' },
    { slug: 'ignatius-1938', display_name: 'Ignatius (1938)' },
  ]);
  const found = (text) => [...text.matchAll(pattern)].map((m) => bySlug.get(m[1]));
  assert.deepEqual(found('with the igumen Eugene (Vyzhva), the igumen'), ['eugene-vyzhva']);
  assert.deepEqual(found('shot with the priest Leo Ershov at Krasnoufimsk'), ['leo-presbyter-martyr-1918']);
  // The bare given name is what put "Pope Theodore" on the wrong saint when
  // measured over the corpus's Related lists; a bracketed year is no surname.
  assert.deepEqual(found('before Pope Theodore; Eugene alone; Ignatius 1938'), []);
  // A different surname is a different man: Macarius (Glukharev) is not Macarius (Sharov).
  assert.deepEqual(
    [...'Macarius (Glukharev)'.matchAll(buildSurnameIndex([{ slug: 'm', display_name: 'Macarius (Sharov)' }]).pattern)],
    [],
  );
});

test('a surname form two related saints share links to neither', () => {
  const { bySlug } = buildSurnameIndex([
    { slug: 'john-a', display_name: 'John (Smirnov)' },
    { slug: 'john-b', display_name: 'John (Smirnov), with others' },
  ]);
  assert.equal(bySlug.get('John (Smirnov)'), null);
  assert.equal(buildSurnameIndex([]).pattern, null);
});
