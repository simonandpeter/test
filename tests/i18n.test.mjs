import test from 'node:test';
import assert from 'node:assert/strict';

import { STRINGS, fill } from '../src/ui/strings.js';
import {
  LANGUAGES,
  LANGUAGES_BY_ID,
  chooseLanguage,
  ensureAllPacks,
  currentLanguage,
  translateOffice,
  translateReason,
  PACK_ONLY,
} from '../src/lib/i18n.js';

/* The locale packs are fetched per language since 2026-08-27, so they are
   not there the moment this module is evaluated. Every assertion below
   about a translated string wants all four, and node's ESM gives a test
   file top-level await to get them with. */
await ensureAllPacks();

/**
 * The language layer (Amendment 36). The packs are hand-written prose in four
 * languages, which is exactly the kind of artefact where a typo'd key or a
 * dropped {placeholder} survives every reading and fails only in front of a
 * reader — so the structural properties are pinned here, exhaustively,
 * against the English base.
 */

// The EN snapshot has to be taken before any chooseLanguage call in this
// file, and i18n.js took its own at import time — this one is for comparing.
const snapshot = JSON.parse(JSON.stringify(STRINGS));

const walk = (obj, path = []) => {
  const leaves = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) leaves.push(...walk(value, [...path, key]));
    else leaves.push([[...path, key].join('.'), value]);
  }
  return leaves;
};

const at = (obj, dotted) => dotted.split('.').reduce((o, k) => o?.[k], obj);

/* A branch whose keys are themselves English phrases — `reasons`, `offices` —
   and so has no counterpart in the base to be compared against. The list is
   `lib/i18n.js`'s, not this file's: `pruneTo` reads the same one, and a branch
   exempted here but not there rides into every later language. */
const packOnly = (path) => PACK_ONLY.some((b) => path.startsWith(`${b}.`));

const packs = LANGUAGES.filter((l) => l.pack);

test('five languages, each naming itself, English the base', () => {
  assert.deepEqual(LANGUAGES.map((l) => l.id), ['en', 'ru', 'ro', 'el', 'sr']);
  assert.deepEqual(LANGUAGES.map((l) => l.code), ['EN', 'RU', 'RO', 'GR', 'RS']);
  assert.equal(LANGUAGES_BY_ID.en.pack, null);
  for (const l of packs) assert.ok(l.name.length > 0 && l.tag.length === 2);
});

test('every translated key exists in the English base', () => {
  // A pack key with no English counterpart is a translation of nothing — a
  // typo in the path, silently never shown. `reasons` is the one pack-only
  // branch, by design (data-borne English phrases).
  for (const { id, pack } of packs) {
    for (const [path] of walk(pack)) {
      if (packOnly(path)) continue;
      assert.notEqual(at(snapshot, path), undefined, `${id}: ${path} not in the English base`);
    }
  }
});

test('every translated string keeps its English placeholders, exactly', () => {
  // fill() substitutes {name} tokens; a translation that drops one loses the
  // datum, and one that invents one prints a literal "{typo}" to the reader.
  const tokens = (s) => (typeof s === 'string' ? [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort() : []);
  for (const { id, pack } of packs) {
    for (const [path, value] of walk(pack)) {
      if (packOnly(path)) continue;
      const base = at(snapshot, path);
      if (typeof base !== 'string') continue;
      assert.deepEqual(tokens(value), tokens(base), `${id}: ${path} placeholder mismatch`);
    }
  }
});

test('switching language mutates STRINGS in place, and English restores exactly', () => {
  // In place is the contract: church-chooser.js holds `const C =
  // STRINGS.church` from import time, so the branch object must be mutated,
  // never replaced.
  const churchBranch = STRINGS.church;
  const before = currentLanguage();

  chooseLanguage('ru');
  assert.equal(STRINGS.nav.calendar, 'Ежедневно');
  assert.equal(churchBranch.heading, 'По какому календарю вы живёте?');
  assert.equal(STRINGS.church, churchBranch);

  // ru → ro must not build Romanian on Russian: a key Romanian happens to
  // share with English must come back English-shaped, not stay Russian.
  chooseLanguage('ro');
  assert.equal(STRINGS.nav.calendar, 'Zilnic');

  chooseLanguage('en');
  assert.deepEqual(JSON.parse(JSON.stringify(STRINGS)), snapshot);
  chooseLanguage(before);
});

test('fill works over a translated template', () => {
  chooseLanguage('sr');
  assert.equal(fill(STRINGS.calendar.densityLabel, { count: 3 }), 'Помена: 3');
  chooseLanguage('en');
});

test('reasons translate the recurring fasts and pass the unknown through', () => {
  chooseLanguage('ru');
  assert.equal(translateReason('the Dormition Fast'), 'Успенский пост');
  assert.equal(translateReason('some reason no pack has heard of'), 'some reason no pack has heard of');
  chooseLanguage('en');
  assert.equal(translateReason('the Dormition Fast'), 'the Dormition Fast');
  // Every pack carries the fast a reader meets first — the site went live in
  // the Dormition Fast — and the two weekday fasts.
  for (const { id, pack } of packs) {
    for (const key of ['the Dormition Fast', 'Wednesday', 'Friday', 'Great Lent']) {
      assert.ok(pack.reasons?.[key], `${id}: reasons lacks "${key}"`);
    }
  }
});

test('the church names read through STRINGS, so the packs reach them', async () => {
  const { churchName } = await import('../src/lib/church.js');
  chooseLanguage('ru');
  assert.equal(churchName('russian'), 'Русская');
  chooseLanguage('en');
  assert.equal(churchName('russian'), 'Russian');
});

test('no string the site prints carries an em dash, in any of the five', () => {
  /*
   * Author, 2026-08-25 evening: "replace all emm dashes with normal dashes."
   * The sweep ran over string literals only — a scanner that knows a literal
   * from a comment — so the house's own prose in the source keeps its em
   * dashes and the reader gets none.
   *
   * Here rather than only in the browser, and that is the lesson of a backout
   * that escaped: reverting `liturgy.fast` to "Fast — {reason}" left the
   * browser test green, because every day it looks at has a *graded* fast and
   * never reaches that string. A page test can only see the strings that page
   * happens to print. This walks all five packs entire.
   *
   * What is deliberately not covered is the corpus: those em dashes are
   * inside quoted source text transcribed from four synaxaria, and editing a
   * quotation for typography is what Amendment 2 forbids.
   */
  const dashed = (value, path, found) => {
    if (typeof value === 'string') {
      if (value.includes('\u2014')) found.push(`${path}: ${value.slice(0, 60)}`);
    } else if (value && typeof value === 'object') {
      for (const [key, inner] of Object.entries(value)) dashed(inner, `${path}.${key}`, found);
    }
    return found;
  };
  for (const id of ['en', 'ru', 'ro', 'el', 'sr']) {
    chooseLanguage(id);
    assert.deepEqual(dashed(STRINGS, id, []), [], `${id} prints an em dash`);
  }
  chooseLanguage('en');
});

/*
 * The offices, which are the packs' second data-borne branch (2026-09-08).
 *
 * Author: "Offices, e.g. 'Princess' or 'Abbot' etc. not translated to other
 * languages. I had asked for a full sweep of all content to check for
 * translation misses, im disappointed it wasnt all translated." The sweep that
 * missed them was a sweep of *strings*, and an office is not a string in this
 * repository — it is a field in 337 saints' own files, so nothing that walked
 * `ui/` could have seen it. That is why the check below walks the corpus and
 * not the packs: the same reasoning would have missed it again.
 */
test('every office and title the corpus records reads in all four languages', async () => {
  /*
   * **The saints' own folders, not `data/manifest.json`** — which is the
   * difference between a green run here and a red one on CI, and cost one
   * (`1fed4d4`, 2026-09-08). `/data/` is gitignored: the manifest is generated,
   * and the workflow's own `npm test` step runs *before* `build:manifest`, so
   * on the runner that file does not exist at all. It is on this desk, because
   * this desk has built the site. `tests/lives.test.mjs` reads the folders for
   * the same reason and said so first.
   */
  const { readdir, readFile } = await import('node:fs/promises');
  const root = new URL('../saints/', import.meta.url);
  const phrases = new Set();
  for (const slug of await readdir(root)) {
    let card;
    try {
      card = JSON.parse(await readFile(new URL(`${slug}/saint.json`, root), 'utf8'));
    } catch {
      continue;
    }
    if (card.office) phrases.add(card.office);
    for (const att of card.attestations ?? []) for (const t of att.titles ?? []) phrases.add(t);
  }
  // The premise, per trap 5: a corpus that stopped recording offices would
  // otherwise make this test pass by having nothing to check.
  assert.ok(phrases.size > 100, `the corpus records ${phrases.size} distinct offices and titles`);

  for (const { id, pack } of packs) {
    const gap = [...phrases].filter((p) => !pack.offices?.[p]);
    assert.deepEqual(gap, [], `${id} has no office for: ${gap.slice(0, 8).join(' | ')}`);
  }

  // And each reads as its own language rather than as a copy of the English.
  for (const { id, pack } of packs) {
    const same = [...phrases].filter((p) => pack.offices[p] === p);
    assert.deepEqual(same, [], `${id} repeats the English for: ${same.slice(0, 8).join(' | ')}`);
  }
});

test('an office reads in the reader language, and an unknown one passes through', () => {
  chooseLanguage('ru');
  assert.equal(translateOffice('Bishop of Nicomedia'), 'Епископ Никомидийский');
  // The composed ones, which are where a table of whole phrases earns its
  // keep: the second half is a see in its own right and reads as one.
  assert.equal(translateOffice('Apostle of the Seventy, Bishop of Sardis'), 'Апостол от семидесяти, епископ Сардийский');
  chooseLanguage('el');
  assert.equal(translateOffice('Bishop of Nicomedia'), 'Επίσκοπος Νικομηδείας');
  // A phrase no pack has heard of is printed as the corpus recorded it. An
  // invented translation would be a claim about a see nobody has read.
  assert.equal(translateOffice('Bishop of Nowhere'), 'Bishop of Nowhere');
  chooseLanguage('en');
  assert.equal(translateOffice('Bishop of Nicomedia'), 'Bishop of Nicomedia');
});
