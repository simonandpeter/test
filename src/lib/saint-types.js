/**
 * A saint's types, in words (author, 2026-08-25 evening: "add the other
 * language equivalents of the search terms like 'abbot', and make all the
 * search terms have a capital letter at the start, like 'Abbot'").
 *
 * The corpus stores them as slugs — `abbot`, `venerable-martyr`,
 * `fool-for-christ` — because they are keys: the filter matches on them, the
 * manifest carries them, and a key that reads as English would drift the day a
 * pack disagreed. What the reader is shown is a *name*, and this is the one
 * place that turns one into the other.
 *
 * Three things fall out of that, and all three are the point:
 *
 * 1. **The name follows the language.** The vocabulary lives in ui/strings.js
 *    and the packs, like every other word on the site.
 * 2. **A type with no translation falls back rather than disappearing.** The
 *    packs translate the hagiographic vocabulary their own synaxaria use and
 *    leave the rest to English — an honest gap, and visible as one.
 * 3. **A type nobody has named at all still reads as a word.** `titleCase`
 *    turns the slug into "Fool For Christ" rather than printing
 *    `fool-for-christ` at a reader. The corpus grows types; the display must
 *    not wait for the pack.
 *
 * The search index takes every language's name at once (`allNames`), not the
 * chosen one: a reader typing «игумен» finds the abbots whatever the chrome
 * is set to, and switching language does not rebuild the index.
 */

import { STRINGS } from '../ui/strings.js';
import { LANGUAGES } from './i18n.js';

/** `venerable-martyr` → `Venerable Martyr`, for a type no pack has named. */
const titleCase = (id) =>
  String(id)
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/** The type's name in the chosen language. */
export const typeName = (id) => STRINGS.saints.types?.[id] ?? titleCase(id);

/** Several, joined as the info line and the card fallback want them. */
export const typeNames = (ids) => (ids ?? []).map(typeName).join(', ');

/**
 * A historicity's own word, taken off the front of the sentence the saint
 * page already prints for it ("Attested - documented by sources close to the
 * events."). Derived rather than added as a second string, so the chip and
 * the sentence can never disagree about the word, and every pack gets it for
 * free — all five write the same `word - gloss.` shape.
 */
export const historicityName = (id) =>
  String(STRINGS.saint?.historicity?.[id] ?? id).split(' - ')[0].replace(/\.$/, '');

/**
 * Every name this type has in any of the five, for the search index. Read off
 * the packs directly rather than through STRINGS, because STRINGS holds one
 * language at a time and the index is built once.
 *
 * English is the title-cased slug rather than the English string, for the same
 * reason: `STRINGS.saints.types` is whichever language is current. It costs
 * nothing — for every type in the corpus the two tokenise identically ("Equal
 * To The Apostles" against "Equal to the Apostles"), and MiniSearch indexes
 * tokens, not sentences.
 */
export function allNames(id) {
  const names = new Set([titleCase(id), id]);
  for (const language of LANGUAGES) {
    const name = language.pack?.saints?.types?.[id];
    if (name) names.add(name);
  }
  return [...names];
}
