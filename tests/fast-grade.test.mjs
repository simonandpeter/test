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
  assert.equal(gradeForDay(null, null), null);
});

test('a fast whose calendar printed nothing is strict, and only Cheesefare escapes it', () => {
  /*
   * The reversal of 2026-08-26 evening (author: '"Fast - Friday" becomes
   * "Strict Fasting"'). This used to return null and the page used to print
   * only which fast it was — which meant three of the four calendars never
   * named a type at all, because only days.pravoslavie.ru prints one.
   *
   * The direction matters as much as the default: strict is the reading that
   * cannot mislead a reader into eating something their church set aside. See
   * lib/fast-grade.js for where it is knowably wrong and why capturing the
   * missing notes is the fix rather than a cleverer default.
   */
  assert.equal(gradeForDay({ kind: 'fast' }, null), 'strict');
  assert.equal(gradeForDay({ kind: 'fast', reason: 'Friday' }, null), 'strict');
  // A note that names an allowance still outranks the default, in either
  // direction - looser as well as stricter.
  assert.equal(gradeForDay({ kind: 'fast' }, 'разрешается рыба'), 'fish');
  assert.equal(gradeForDay({ kind: 'fast' }, 'сухоядение'), 'xerophagy');
  // And a note that names none does not: «Post» is not an allowance.
  assert.equal(gradeForDay({ kind: 'fast' }, 'Post'), 'strict');

  /*
   * Cheesefare is the one day the default would contradict the reason printed
   * beside it - liturgy.js's own words are "no meat; dairy and eggs
   * permitted" - so that branch hands the allowance over rather than letting
   * the default guess past it.
   */
  assert.equal(
    gradeForDay({ kind: 'fast', reason: 'Cheesefare Week - no meat; dairy and eggs permitted', allows: 'dairy' }, null),
    'dairy',
  );
  // A fast-free day still has no grade: there is no allowance to name.
  assert.equal(gradeForDay({ kind: 'fast-free', reason: null }, null), null);
});
