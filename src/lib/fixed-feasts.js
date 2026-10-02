/**
 * Resolving a fixed feast onto a civil day, and ranking it against the day's
 * saints.
 *
 * `src/data/feasts-fixed.js` says why these eight records exist outside the
 * corpus. This module is their only reader: it converts each record's
 * per-church `observance` into civil dates exactly as `lib/feasts.js` converts
 * a saint's attestation — same helper, same rule that nothing pre-converted is
 * stored — and then answers the one question the Daily page asks of it.
 */

import { CHURCHES_BY_ID } from '../data/churches.js';
import { FIXED_FEASTS } from '../data/feasts-fixed.js';
import { pickHero } from './calendar-page.js';
import { feastOccurrences, toIsoDate } from './feasts.js';

/**
 * ISO date -> feast record, for one year and one church.
 *
 * Keyed on year *and* church because the answer differs between them: the
 * Nativity is the civil 25 December in the Greek and Romanian calendars and
 * the civil 7 January in the Russian and Serbian, and a single index would
 * have to hold both and then be filtered on every lookup. There are at most
 * four churches and the Daily page's rail spans one year at a time, so the map
 * is small and is built once.
 */
const indexes = new Map();

function indexFor(year, churchId) {
  const key = `${year}:${churchId}`;
  let index = indexes.get(key);
  if (index) return index;
  index = new Map();
  const church = CHURCHES_BY_ID[churchId];
  if (church && church.enabled !== false) {
    for (const feast of FIXED_FEASTS) {
      for (const { church: id, feast: when } of feast.observance) {
        if (id !== churchId) continue;
        for (const occurrence of feastOccurrences(when, year, church)) {
          index.set(toIsoDate(occurrence), feast);
        }
      }
    }
  }
  indexes.set(key, index);
  return index;
}

/** The fixed feast this civil day is in this church, or null. */
export function fixedFeastOn(iso, churchId) {
  if (!iso || !churchId) return null;
  return indexFor(Number(iso.slice(0, 4)), churchId).get(iso) ?? null;
}

/**
 * What leads the day: a feast of the Lord, of the Theotokos or of the angels
 * where the day has one, and otherwise whichever saint `pickHero` chooses.
 *
 * **The feast outranks every saint of the day, including on days that are not
 * empty.** Theophany in the Greek calendar already had saints — 6 January
 * commemorates them — and the page led with one of them while printing the
 * Great Feast's own chip, fast and troparion around him. A feast of the Lord
 * is the day's principal commemoration wherever it falls, and no saint's
 * commemoration ranks above one; any other order would be the page preferring
 * the kind of record it happens to be able to store.
 *
 * `pickHero`'s own rules are untouched and still decide every day that has no
 * fixed feast — this function calls it unchanged for those. The two kinds are
 * returned as a tagged pair rather than as a slug, because a feast has no slug
 * and never gets one: there is no page behind it to link to.
 */
export function dayHero(iso, entries, bySlug, churchId) {
  const feast = fixedFeastOn(iso, churchId);
  if (feast) return { kind: 'feast', feast, slug: null };
  const slug = pickHero(iso, entries, bySlug, churchId);
  return slug ? { kind: 'saint', feast: null, slug } : null;
}
