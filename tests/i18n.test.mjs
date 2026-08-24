import test from 'node:test';
import assert from 'node:assert/strict';

import { STRINGS, fill } from '../src/ui/strings.js';
import {
  LANGUAGES,
  LANGUAGES_BY_ID,
  chooseLanguage,
  currentLanguage,
  translateReason,
} from '../src/lib/i18n.js';

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
      if (path.startsWith('reasons.')) continue;
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
      if (path.startsWith('reasons.')) continue;
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
  assert.equal(STRINGS.nav.calendar, 'Сегодня');
  assert.equal(churchBranch.heading, 'По какому календарю вы живёте?');
  assert.equal(STRINGS.church, churchBranch);

  // ru → ro must not build Romanian on Russian: a key Romanian happens to
  // share with English must come back English-shaped, not stay Russian.
  chooseLanguage('ro');
  assert.equal(STRINGS.nav.calendar, 'Astăzi');

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
