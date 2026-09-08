import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

import { STRINGS } from '../src/ui/strings.js';
import { chooseLanguage, ensureAllPacks } from '../src/lib/i18n.js';
import { translateDisplay } from '../src/lib/date-display.js';
import { formatInterval } from '../src/lib/calendar-page.js';

await ensureAllPacks();

/**
 * The lifespans, in the reader's own language (author, 2026-09-08: "change
 * lifespans to translated").
 *
 * `lib/date-display.js` parses a recorded `display` rather than looking it up,
 * and it is deliberately conservative: anything it cannot account for *whole*
 * comes back in the English the corpus recorded. That fallback is honest and
 * it is also exactly the thing that could go unnoticed for a month, so the
 * check that matters is the one below — every display string the corpus
 * actually holds, in every pack, is *recognised*.
 *
 * The saints' own folders, not `data/manifest.json`: `/data/` is gitignored and
 * the workflow runs `npm test` before `build:manifest`, so on the runner the
 * manifest does not exist yet. That cost a red CI run on 2026-09-08 with the
 * offices, and this is the same reading of the same corpus.
 */
const displays = new Set();
const root = new URL('../saints/', import.meta.url);
for (const slug of await readdir(root)) {
  let card;
  try {
    card = JSON.parse(await readFile(new URL(`${slug}/saint.json`, root), 'utf8'));
  } catch {
    continue;
  }
  for (const key of ['birth', 'death', 'floruit']) {
    const display = card.dates?.[key]?.display;
    if (display) displays.add(display);
  }
}

const PACKS = ['ru', 'ro', 'el', 'sr'];

test('every recorded date display is read, in all four languages', () => {
  // The premise, per trap 5: a corpus that stopped recording displays would
  // make this pass with nothing checked.
  assert.ok(displays.size > 300, `the corpus records ${displays.size} distinct displays`);

  for (const id of PACKS) {
    chooseLanguage(id);
    const unread = [];
    for (const display of displays) {
      const said = translateDisplay(display);
      /*
       * A pure number is its own translation — "1937" is "1937" in all five —
       * so equality is only a failure where the English carries a *word*. That
       * is the whole distinction this parser exists to make.
       */
      if (said === display && /[A-Za-z]/.test(display)) unread.push(display);
    }
    assert.deepEqual(unread, [], `${id} cannot read: ${unread.slice(0, 8).join(' | ')}`);
  }
  chooseLanguage('en');
});

test('a century, a range, an era and a full date each read as their language writes them', () => {
  chooseLanguage('ru');
  assert.equal(translateDisplay('4th century'), 'IV в.');
  assert.equal(translateDisplay('late 4th century'), 'конец IV в.');
  assert.equal(translateDisplay('mid-8th century'), 'середина VIII в.');
  assert.equal(translateDisplay('12th–13th century'), 'XII–XIII вв.');
  assert.equal(translateDisplay('8th century BC'), 'VIII в. до Р. Х.');
  assert.equal(translateDisplay('c. 250'), 'ок. 250');
  assert.equal(translateDisplay('under Diocletian (284-305)'), 'при Диоклетиане (284-305)');
  // The unit is said once and meant twice, and it is the *right* half that
  // carries it: "4th or 5th century".
  assert.equal(translateDisplay('4th or 5th century'), 'IV в. или V в.');
  assert.equal(translateDisplay('late 4th or early 5th century'), 'конец IV в. или начало V в.');
  assert.equal(translateDisplay('probably 1481 or 1482'), 'вероятно, 1481 или 1482');
  // The month through Intl, so it is the reader's own word and its own order.
  assert.match(translateDisplay('14 September 407'), /сентября 407/);

  chooseLanguage('el');
  assert.equal(translateDisplay('4th century'), '4ος αι.');
  assert.equal(translateDisplay('at the Council of Ephesus'), 'στη Σύνοδο της Εφέσου');

  chooseLanguage('ro');
  assert.equal(translateDisplay('4th century'), 'sec. al IV-lea');

  chooseLanguage('en');
  // English is the base and reads its own recorded string, untouched.
  assert.equal(translateDisplay('4th century'), '4th century');
});

test('a shape no pack knows comes back in the English it was recorded in', () => {
  chooseLanguage('ru');
  assert.equal(translateDisplay('during the reign of nobody in particular'), 'during the reign of nobody in particular');
  // Half a phrase is not translated either: the `or` splits, one half is a
  // year and the other is nothing this knows, so the *whole* string falls back.
  assert.equal(translateDisplay('1918 or some other year'), '1918 or some other year');
  chooseLanguage('en');
});

test('the era is still marked, and the decision is made on the English', () => {
  /*
   * `Reposed 105 AD` and `Reposed 3rd C. AD`, but `Reposed 1937` unchanged
   * (author, 2026-08-26). Every clause of that rule reads the English shape —
   * "ends in a digit or in C." — and «IV в.» ends in neither, so the decision
   * is taken before the translation and applied after it.
   */
  const third = { earliest: 200, latest: 299, display: '3rd century' };
  chooseLanguage('en');
  assert.equal(formatInterval(third), '3rd C. AD');
  chooseLanguage('ru');
  assert.equal(formatInterval(third), 'III в. по Р. Х.');
  // And a year that carries its own era is not marked twice.
  const modern = { earliest: 1937, latest: 1937, display: '1937' };
  assert.equal(formatInterval(modern), '1937');
  chooseLanguage('en');
});
