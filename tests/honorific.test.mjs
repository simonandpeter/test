import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { rankKey, rankLabel, saintName, typesBeside, withHonorific } from '../src/lib/honorific.js';
import { chooseLanguage } from '../src/lib/i18n.js';

/**
 * The rank in front of a name (author, 2026-08-27), which replaced the blanket
 * "St." of 2026-08-24. It is applied when a name is drawn and never written
 * into the data, so most of what follows is about the function alone — and
 * then about the corpus, which is where a precedence walk either holds or
 * quietly prints the wrong word 742 times.
 */

const card = (props) => ({ display_name: 'Tit', sex: 'male', types: [], ...props });

test('a rank is printed where there is one, and St where there is not', () => {
  assert.equal(saintName(card({ display_name: 'Gorazd', types: ['hieromartyr', 'bishop'] })), 'Hieromartyr Gorazd');
  assert.equal(saintName(card({ display_name: 'Moses the Ethiopian', types: ['venerable'] })), 'Venerable Moses the Ethiopian');
  assert.equal(saintName(card({ display_name: 'Hezekiah', types: ['righteous', 'king'] })), 'Righteous Hezekiah');
  // The marked case: a hierarch has no rank of his own and keeps the honorific.
  assert.equal(saintName(card({ display_name: 'John Chrysostom', types: ['hierarch', 'bishop'] })), 'St John Chrysostom');
});

test('the honorific carries no stop', () => {
  // Author, 2026-08-27: "print 'St.' prefixed, and then strip the ." — which
  // reverses 2026-08-25's "please add '.' after St or Sf", and is stripped in
  // all five packs rather than in English alone.
  assert.equal(withHonorific('Tit', card()), 'St Tit');
  try {
    for (const [language, expected] of [
      ['ro', 'Sf Tit'],
      ['ru', 'Св Tit'],
      ['el', 'Άγ Tit'],
      ['sr', 'Св Tit'],
    ]) {
      chooseLanguage(language);
      assert.equal(withHonorific('Tit', card()), expected, language);
    }
  } finally {
    chooseLanguage('en');
  }
});

test('the rank declines with the saint’s sex in the four that decline', () => {
  /*
   * The old file's own header called a spelled-out honorific impossible
   * because it "would need the saint's sex, which the manifest carries, and a
   * grammar per language, which it does not". Half of that was true: `sex` is
   * populated on all 742 records, so what is needed is two forms per label,
   * which is a table. Unknown reads as the masculine, the unmarked form.
   */
  const she = card({ display_name: 'Anna', sex: 'female', types: ['martyr'] });
  const he = card({ display_name: 'Andrew', sex: 'male', types: ['martyr'] });
  const it = card({ display_name: 'Faustus', sex: 'unknown', types: ['martyr'] });
  try {
    chooseLanguage('ru');
    assert.equal(saintName(she), 'Мученица Anna');
    assert.equal(saintName(he), 'Мученик Andrew');
    assert.equal(saintName(it), 'Мученик Faustus', 'unknown takes the unmarked form');
    chooseLanguage('el');
    assert.equal(saintName(card({ display_name: 'Paraskevi', sex: 'female', types: ['venerable'] })), 'Οσία Paraskevi');
  } finally {
    chooseLanguage('en');
  }
});

test('the precedence is walked, not guessed', () => {
  // A saint with several ranks is named by one of them, and which one is an
  // editorial choice written out in the file's header.
  assert.equal(rankKey(card({ types: ['martyr', 'hieromartyr', 'presbyter'] })), 'hieromartyr');
  assert.equal(rankKey(card({ types: ['martyr', 'great-martyr', 'virgin'] })), 'great-martyr');
  assert.equal(rankKey(card({ types: ['martyr', 'virgin'] })), 'virgin-martyr');
  assert.equal(rankKey(card({ types: ['prophet', 'righteous'] })), 'prophet');
  assert.equal(rankKey(card({ types: ['righteous', 'patriarch-of-israel'] })), 'forefather');
  assert.equal(rankKey(card({ types: ['hierarch', 'bishop', 'theologian'] })), 'honorific');
});

test('a monastic is Venerable whether or not the record says so', () => {
  // Nine folders carry monk/hermit/ascetic/monastic without `venerable`, and
  // three of them are among the seven saints who have an icon.
  for (const type of ['monk', 'hermit', 'ascetic', 'monastic', 'abbot', 'abbess']) {
    assert.equal(rankKey(card({ types: [type] })), 'venerable', type);
  }
  assert.equal(saintName(card({ display_name: 'Anthony the Great', types: ['monk', 'hermit', 'abbot'] })), 'Venerable Anthony the Great');
});

test('a collective keeps its article and takes no rank', () => {
  // "Martyr The Fifty Martyrs of Palestine" is not English. There are 22.
  const many = card({ display_name: 'The Fifty Martyrs of Palestine', types: ['martyr'] });
  assert.equal(saintName(many), 'The Fifty Martyrs of Palestine');
  assert.equal(saintName(card({ display_name: 'The 3,628 Martyrs of Nicomedia', types: ['martyr'] })), 'The 3,628 Martyrs of Nicomedia');
});

test('a feast opts out by name of the whole mechanism', () => {
  /*
   * Before the Great Feasts become folders, not after: a blanket prefix would
   * emit "St Dormition of the Theotokos", and "Martyr Mary" if the Theotokos
   * ever gets an entry of her own. Nothing in the corpus sets `kind` yet, so
   * this is the only place the flag is exercised.
   */
  const feast = { display_name: 'Dormition of the Theotokos', kind: 'feast', types: [], sex: 'unknown' };
  assert.equal(saintName(feast), 'Dormition of the Theotokos');
  assert.equal(withHonorific('Dormition of the Theotokos', feast), 'Dormition of the Theotokos');
});

test('a name already carrying an honorific is left alone', () => {
  try {
    chooseLanguage('ro');
    assert.equal(withHonorific('Sf. Tit', card()), 'Sf. Tit');
    chooseLanguage('ru');
    assert.equal(withHonorific('Св. Тит', card()), 'Св. Тит');
  } finally {
    chooseLanguage('en');
  }
  assert.equal(withHonorific('St Nektarios of Aegina', card()), 'St Nektarios of Aegina');
  assert.equal(withHonorific('Saint Sozon', card()), 'Saint Sozon');
});

test('an empty name stays empty rather than becoming a bare rank', () => {
  assert.equal(withHonorific('', card()), '');
  assert.equal(withHonorific(undefined, card()), '');
});

test('the facts line stops repeating the rank the name already prints', () => {
  assert.deepEqual(typesBeside(card({ types: ['hieromartyr', 'bishop'] })), ['bishop']);
  assert.deepEqual(typesBeside(card({ types: ['martyr', 'hieromartyr', 'presbyter'] })), ['presbyter']);
  // Venerable does not say Abbot, so Abbot stays.
  assert.deepEqual(typesBeside(card({ types: ['venerable', 'abbot'] })), ['abbot']);
  assert.deepEqual(typesBeside(card({ types: ['hierarch', 'bishop'] })), ['hierarch', 'bishop']);
  // And the office says its own word once: "Bishop of Bohemia and
  // Moravia-Silesia · Bishop" was the facts line before this.
  assert.deepEqual(
    typesBeside(card({ types: ['hieromartyr', 'bishop'], office: 'Bishop of Bohemia and Moravia-Silesia' })),
    [],
  );
  // Both halves already said: the name prints Righteous, the office prints
  // Grand Prince, and the line adds nothing.
  assert.deepEqual(typesBeside(card({ types: ['prince', 'righteous'], office: 'Grand Prince' })), []);
  assert.deepEqual(typesBeside(card({ types: ['prince', 'martyr', 'soldier'], office: 'Grand Prince' })), ['soldier']);
});

test('every name in the corpus resolves, and the split left nothing behind', () => {
  const slugs = readdirSync('saints');
  const counts = new Map();
  for (const slug of slugs) {
    const rec = JSON.parse(readFileSync(`saints/${slug}/saint.json`, 'utf8'));
    const key = /^The\s/.test(rec.display_name) ? '(collective)' : rankKey(rec);
    counts.set(key, (counts.get(key) ?? 0) + 1);

    /*
     * The migration of 2026-08-27 took the rank, the office and the death
     * year out of `display_name`. If any of the three creeps back in, the
     * prefix collides with it and the name reads "Hieromartyr Alexander
     * (Lyubimov), Presbyter, Hieromartyr (1918)" again — which is exactly
     * what the addendum's "data first, naming second" was protecting against.
     */
    assert.doesNotMatch(
      rec.display_name,
      /,\s*(Hieromartyr|Martyr|New Martyr|Great Martyr|Monk-martyr|Nun-martyr|Confessor|Righteous|Venerable)\b/,
      `${slug}: a rank is back in the name`,
    );
    assert.doesNotMatch(rec.display_name, /\(\s*(?:c\.\s*)?\d{3,4}\s*\)/, `${slug}: a death year is back in the name`);
    assert.doesNotMatch(
      rec.display_name,
      /,\s*(Presbyter|Archpriest|Bishop|Archbishop|Metropolitan|Patriarch|Deacon|Hieromonk|Archimandrite|Abbot|Abbess)\b/,
      `${slug}: an office is back in the name`,
    );

    // And the printed name never says its rank twice.
    const shown = saintName(rec);
    const label = /^The\s/.test(rec.display_name) ? null : rankLabel(rec);
    if (label) {
      const times = shown.split(label).length - 1;
      assert.equal(times, 1, `${slug}: "${label}" appears ${times} times in "${shown}"`);
    }
  }
  // The shape of the corpus, which is what makes "St." the marked case: it is
  // 58 of 742, against 253 martyrs and 156 hieromartyrs.
  assert.equal(counts.get('(collective)'), 22);
  assert.ok(counts.get('honorific') < 100, `St is the marked case (${counts.get('honorific')} of ${slugs.length})`);
  assert.ok(counts.get('martyr') > 200);
});
