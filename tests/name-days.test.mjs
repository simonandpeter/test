/**
 * Whose name day it is (author, 2026-08-26: "add name days").
 *
 * The whole of the judgement in `lib/name-days.js` is one reduction — a
 * commemoration to the personal name it starts with — and every rule it
 * follows exists because the corpus holds a shape that breaks the naive
 * version. Each of those shapes is a case below, taken from a real folder.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { givenName, nameDays } from '../src/lib/name-days.js';

const card = (display_name, extra = {}) => ({ slug: display_name.toLowerCase(), display_name, ...extra });

test('a rank, a bracketed surname and an office are not part of the name', () => {
  // The three shapes the corpus files new martyrs under. A life saying "Basil"
  // is the name a reader bears; "Basil Sungurov, Priest" is a folder title.
  assert.equal(givenName(card('Basil Sungurov, Priest')), 'Basil');
  assert.equal(givenName(card('Eugene (Vyzhva), Abbot')), 'Eugene');
  assert.equal(givenName(card('John, Archbishop of Novgorod')), 'John');
  assert.equal(givenName(card('Luke, Abbot of Bathys Ryax')), 'Luke');
});

test('a company gives nobody a name day, and the English decides that', () => {
  /*
   * "The Fifty Martyrs of Palestine" would otherwise contribute "The". The
   * test is on the *English* name for the reason lib/honorific.js gives: the
   * other four languages carry no article to test, so «Пятьдесят мучеников»
   * has no handle of its own.
   */
  assert.equal(givenName(card('The Fifty Martyrs of Palestine')), null);
  assert.equal(
    givenName(card('The Twenty-three Martyrs', { names: { ru: 'Двадцать три мученика' } }), 'ru'),
    null,
  );
});

test('the name is the reader’s own where the corpus recorded one', () => {
  // A name day is the reader's *name*, and «Иоанн» is not "John" to the person
  // whose it is. The recorded forms are already stripped of honorific and rank
  // at build time (lib/saint-name.js), so the first word is the name.
  const john = card('John, Archbishop of Novgorod', { names: { ru: 'Иоанн Новгородский' } });
  assert.equal(givenName(john, 'ru'), 'Иоанн');
  // And no form in that language means the English stands, exactly as it does
  // everywhere else on the site. Nothing is transliterated or guessed.
  assert.equal(givenName(john, 'ro'), 'John');
});

test('a name two saints of the day share is listed once and links to neither', () => {
  /*
   * 20 September in the Russian calendar is the case: two Eugenes, two
   * Macariuses. The site cannot tell which a reader means, so the name stands
   * as text — the same rule the cross-linker's fourth follows, and for the same
   * reason.
   */
  const day = [
    card('Eugene (Vyzhva), Abbot'),
    card('Eugene (Zernov), Metropolitan of Gorky'),
    card('Serapion of Pskov'),
  ];
  const names = nameDays(day);
  assert.deepEqual(
    names.map((n) => n.name),
    ['Eugene', 'Serapion'],
  );
  assert.equal(names[0].slug, null);
  assert.equal(names[1].slug, 'serapion of pskov');
});

test('the order is the reader’s language, not the code points', () => {
  // «Ё» sorts after «Е» in Russian and between them by code point; the site
  // asks Intl rather than the array.
  const names = nameDays(
    [card('B', { names: { ru: 'Ёлкин' } }), card('A', { names: { ru: 'Евдоким' } })],
    { lang: 'ru', locale: 'ru' },
  );
  assert.deepEqual(
    names.map((n) => n.name),
    ['Евдоким', 'Ёлкин'],
  );
});

test('a name too short to be one is not offered', () => {
  // An initial that survived the cut, or a stray mark: two letters is the
  // shortest real name in any of these five languages.
  assert.equal(givenName(card('J. Smith')), null);
  assert.equal(givenName(card('')), null);
});
