/**
 * The paschal cycle's day, in words, in the reader's language (author,
 * 2026-08-26: "make sure you print '13th week after Pentecost' in the chosen
 * language as well").
 *
 * `lib/liturgy.js` says *which* day of the cycle it is and nothing about
 * words; this turns that into a sentence from `STRINGS.calendar.cycle`. The
 * split is the point: the paschal reckoning is one thing and its name in five
 * languages is another, and keeping them in one function is what left this
 * line English for two amendments.
 *
 * Three shapes of key, and the reason there are three:
 *
 * 1. **A named day** — Pascha, Lazarus Saturday, the Sundays of the Triodion.
 *    One string per pack, nothing poured in.
 * 2. **A table of seven** — Holy Week and Bright Week. Slavonic, Serbian and
 *    Greek decline the adjective for the weekday's gender («Великая Среда»
 *    beside «Великий Четверг», «Μεγάλη Παρασκευή» beside «Μέγα Σάββατο»), so
 *    a template with a weekday poured into it would be wrong in three
 *    languages out of five. The set is closed at thirteen days a year, so it
 *    is written out.
 * 3. **A template with a number, and sometimes a weekday.** One placeholder,
 *    `{n}`, carrying the number already in the shape that language wants it.
 *    English is ordinalised here — "13th" — because English ordinals are
 *    irregular and no pattern can build them; Russian, Romanian, Greek and
 *    Serbian take the bare number and add their own suffix in the pattern
 *    («{n}-я седмица», «Săptămâna a {n}-a»). One placeholder rather than two,
 *    so the packs' placeholders match English exactly and the unit test that
 *    checks that stays a real guard. The weekday comes from `Intl` through
 *    `formatDate`, in the nominative, which is the case every one of these
 *    constructions puts it in.
 */

import { STRINGS, fill } from './strings.js';
import { currentLanguage, formatDate } from '../lib/i18n.js';

/** English ordinals are irregular; the other four packs never ask for this. */
const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

/** The weekday name, in the reader's language, from a date in that week. */
function weekdayName(iso, weekday) {
  // Any date with the wanted weekday will do, and 2026-08-23 was a Sunday, so
  // the ISO week beginning there indexes straight off `weekday`.
  const day = new Date(Date.UTC(2026, 7, 23 + weekday));
  return formatDate({ weekday: 'long', timeZone: 'UTC' }, day);
}

/**
 * `{ key, weekday, n }` from `cycleOf`, as a sentence. An unknown key returns
 * the key itself rather than an empty line — a pack that loses an entry
 * should look broken, not blank.
 */
export function cycleName(cycle, iso) {
  if (!cycle?.key) return '';
  const C = STRINGS.calendar.cycle ?? {};
  const value = C[cycle.key];
  if (Array.isArray(value)) return value[cycle.weekday] ?? cycle.key;
  if (!value) return cycle.key;
  return fill(value, {
    weekday: cycle.weekday === undefined ? '' : weekdayName(iso, cycle.weekday),
    n: cycle.n === undefined ? '' : currentLanguage() === 'en' ? ordinal(cycle.n) : cycle.n,
  });
}
