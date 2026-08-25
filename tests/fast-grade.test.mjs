import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeForDay, gradeFromNote } from '../src/lib/fast-grade.js';

/**
 * What a day's fast allows, read off the calendar's own words. The file had no
 * unit test until Amendment 44 — only browser coverage of the days already
 * transcribed — and the defect below is exactly the kind that hides there,
 * because the page renders correctly and simply says less than it should.
 */

test('the grade is the calendar\'s own word, in each of the four languages', () => {
  assert.equal(gradeFromNote('Успенский пост; Пища с растительным маслом'), 'oil');
  assert.equal(gradeFromNote('День постный; Разрешается рыба'), 'fish');
  assert.equal(gradeFromNote('Горячая пища без масла'), 'no-oil');
  assert.equal(gradeFromNote('Поста нет'), 'none');
  assert.equal(gradeFromNote('Νηστεία — επιτρέπεται το λάδι και ο οίνος'), 'oil');
  assert.equal(gradeFromNote('Dezlegare la pește'), 'fish');
  assert.equal(gradeFromNote('Пост (означен у календару)'), null,
    'a calendar that says a day is a fast and not what it allows gets no grade');
});

test('a Latin letter inside a Cyrillic word does not cost the day its grade', () => {
  /*
   * days.pravoslavie.ru prints the strictest allowance in its vocabulary as
   * «Монастырский устав: cухоядение (хлеб, овощи, фрукты)» — and the first
   * letter of that word is a LATIN SMALL LETTER C, not the Cyrillic «с». It
   * renders identically. Before Amendment 44 the phrase matched nothing and
   * the day silently showed no grade at all.
   *
   * The literal below is built from codepoints on purpose. Typed as text it
   * would be indistinguishable from the all-Cyrillic word on the screen, in a
   * diff and in a review, which is the whole difficulty.
   */
  const latinC = String.fromCharCode(0x63); // LATIN SMALL LETTER C
  const cyrillicS = String.fromCharCode(0x0441); // CYRILLIC SMALL LETTER ES
  assert.notEqual(latinC, cyrillicS, 'two codepoints, one glyph');

  const asPrinted = `Успенский пост; Монастырский устав: ${latinC}ухоядение (хлеб, овощи, фрукты)`;
  assert.equal(gradeFromNote(asPrinted), 'xerophagy');
  // and the ordinary all-Cyrillic spelling still works
  assert.equal(gradeFromNote(`Монастырский устав: ${cyrillicS}ухоядение`), 'xerophagy');
});

test('folding never turns a Latin-script note into a Cyrillic match', () => {
  // The Romanian and Greek notes are Latin and Greek script and mean it; they
  // are matched as printed, before any folding happens.
  assert.equal(gradeFromNote('Dezlegare la ulei'), 'oil');
  assert.equal(gradeFromNote('Tedeum'), null, 'a note that is not about fasting gets no grade');
  assert.equal(gradeFromNote('Post'), null, 'a fast named without its allowance gets no grade');
  assert.equal(gradeFromNote(''), null);
  assert.equal(gradeFromNote(null), null);
});

test('fish comes from liturgy.js only where the calendar itself is silent', () => {
  assert.equal(gradeForDay({ kind: 'fish' }, null), 'fish');
  assert.equal(gradeForDay({ kind: 'fish' }, 'Сухоядение'), 'xerophagy',
    'what the calendar printed outranks what the cycle would imply');
  assert.equal(gradeForDay({ kind: 'fast' }, null), null,
    'a fast whose allowance no calendar stated is left unstated');
  assert.equal(gradeForDay(null, null), null);
});
