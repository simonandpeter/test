/**
 * Resolving a stored feast to the Gregorian dates it falls on in a given year.
 *
 * Feasts are stored as (day, month, calendar) or as a signed offset from
 * Pascha, and converted here at render time. Nothing pre-converted is ever
 * stored: a Julian feast day is not a fact about the Gregorian calendar, and
 * baking one in would need rewriting in 2100 when the offset moves to 14 days.
 */

import { fromJdn, gregorianToJdn, isValidDate, jdnToGregorian, toJdn } from './jdn.js';
import { paschalOffset } from './computus.js';

/**
 * Every Gregorian date in `year` on which this feast falls — an array, because
 * the answer is not always exactly one.
 *
 * Zero is the case that really arises: a 29 February feast in a common year, or
 * the sixth epagomenal day in a non-leap Coptic year. Those saints have no
 * feast at all in most years, and a signature returning `date | null` is one
 * every caller eventually forgets to null-check. Two occurrences cannot happen
 * for the four calendars here, whose years are all close enough to 365 days
 * that a given date recurs no sooner; the array simply means a calendar with a
 * shorter year would not force a signature change.
 */
export function feastOccurrences(feast, year, church) {
  if (!feast) return [];

  if (feast.calendar === 'paschal') {
    const computus = feast.computus ?? church?.paschal_computus;
    if (!computus) {
      throw new Error(
        `Paschal feast needs a computus: none on the feast and none on church ${church?.id ?? '(unknown)'}`,
      );
    }
    return [paschalOffset(computus, year, feast.offset ?? 0)];
  }

  const { calendar, month, day } = feast;
  const first = fromJdn(calendar, gregorianToJdn(year, 1, 1)).year;
  const last = fromJdn(calendar, gregorianToJdn(year, 12, 31)).year;

  const out = [];
  for (let cy = first; cy <= last; cy++) {
    if (!isValidDate(calendar, cy, month, day)) continue;
    const g = jdnToGregorian(toJdn(calendar, cy, month, day));
    if (g.year === year) out.push(g);
  }
  return out;
}

export const toIsoDate = ({ year, month, day }) =>
  `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

/**
 * Index of ISO date -> [{ slug, church, feast }] for one Gregorian year, which
 * is what the calendar page actually needs. Built from the manifest in one pass
 * so that moving between days costs a map lookup rather than a re-resolution.
 */
export function buildFeastIndex(saints, year, churchesById) {
  const index = new Map();
  for (const saint of saints) {
    for (const att of saint.attestations ?? []) {
      if (att.status !== 'venerated' || !att.feast) continue;
      const church = churchesById[att.church];
      if (!church || church.enabled === false) continue;
      for (const occurrence of feastOccurrences(att.feast, year, church)) {
        const key = toIsoDate(occurrence);
        if (!index.has(key)) index.set(key, []);
        index.get(key).push({ slug: saint.slug, church: att.church, feast: att.feast });
      }
    }
  }
  return index;
}
