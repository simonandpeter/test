import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { withHonorific } from '../src/lib/honorific.js';
import { chooseLanguage } from '../src/lib/i18n.js';

/**
 * The honorific in front of a name (author, 2026-08-24). It is applied when a
 * name is drawn and never written into the data, so these assertions are about
 * the function alone — and about the one case the corpus makes real, the
 * companies of martyrs that announce themselves with an article.
 */

test('a saint is read with St. before the name', () => {
  // The stop arrived 2026-08-25 at the author's instruction; it was bare "St"
  // from 2026-08-24 until then.
  assert.equal(withHonorific('John Chrysostom'), 'St. John Chrysostom');
  assert.equal(withHonorific('Anthony the Great'), 'St. Anthony the Great');
});

test('the honorific is the reader’s language, abbreviated in all five', () => {
  /*
   * Author, 2026-08-25: "same in other languages if this grammar applies".
   * It applies to all five, because every one of these is an abbreviation and
   * takes an abbreviation's stop. The abbreviated forms are also the ones
   * that dodge the grammar this corpus cannot answer — Greek and Slavonic
   * decline the honorific for a woman, and 68 of these saints are women, so a
   * spelled-out form would need a rule per language rather than a word.
   */
  try {
    for (const [language, expected] of [
      ['ro', 'Sf. Tit'],
      ['ru', 'Св. Tit'],
      ['el', 'Άγ. Tit'],
      ['sr', 'Св. Tit'],
      ['en', 'St. Tit'],
    ]) {
      chooseLanguage(language);
      assert.equal(withHonorific('Tit'), expected, language);
    }
  } finally {
    chooseLanguage('en');
  }
});

test('a name already carrying any of the five honorifics is left alone', () => {
  try {
    chooseLanguage('ro');
    assert.equal(withHonorific('Sf. Tit'), 'Sf. Tit');
    chooseLanguage('ru');
    assert.equal(withHonorific('Св. Тит'), 'Св. Тит');
    chooseLanguage('en');
    // Including the stopless English the corpus itself was written with.
    assert.equal(withHonorific('St Nektarios of Aegina'), 'St Nektarios of Aegina');
  } finally {
    chooseLanguage('en');
  }
});

test('a collective keeps its article and takes no honorific', () => {
  // "St The Fifty Martyrs of Palestine" is not English. There are 26 of these.
  assert.equal(withHonorific('The Fifty Martyrs of Palestine'), 'The Fifty Martyrs of Palestine');
  assert.equal(withHonorific('The 3,628 Martyrs of Nicomedia'), 'The 3,628 Martyrs of Nicomedia');
});

test('the honorific is never doubled', () => {
  assert.equal(withHonorific('St Nektarios of Aegina'), 'St Nektarios of Aegina');
  assert.equal(withHonorific('Saint Sozon'), 'Saint Sozon');
});

test('an empty name stays empty rather than becoming a bare honorific', () => {
  assert.equal(withHonorific(''), '');
  assert.equal(withHonorific(undefined), '');
});

test('every name in the corpus takes the honorific or is a company', () => {
  // The rank — martyr, hieromartyr, presbyter — is a category in `types` and
  // is printed on the saint page's facts line, so nothing here reads it.
  const slugs = readdirSync('saints');
  let honoured = 0;
  let collective = 0;
  for (const slug of slugs) {
    const { display_name: name } = JSON.parse(readFileSync(`saints/${slug}/saint.json`, 'utf8'));
    const out = withHonorific(name);
    if (out === name) {
      assert.match(name, /^The\s/, `${slug}: a name left unhonoured must be a company`);
      collective++;
    } else {
      assert.equal(out, `St. ${name}`);
      honoured++;
    }
  }
  assert.equal(honoured + collective, slugs.length);
  assert.ok(collective > 0 && collective < 40, 'the companies are a small minority of the corpus');
});
