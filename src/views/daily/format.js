import { parseIso } from '../../lib/calendar-page.js';
import { formatDate } from '../../lib/i18n.js';

/**
 * The Daily page's dates, in words.
 *
 * Four `Intl` formats and one parse, shared by everything that prints a day:
 * the heading, the rail's weekday, the month's gutter, and the prose that
 * names a date inside a sentence. They are here rather than in `lib/` because
 * the choices in them are this page's — `plainDateFmt` spells the month out
 * because it reads as prose where the heading reads as a label.
 */

// The page's own date wears the month in full again (author, 2026-09-01: "on
// Daily page print the full month name"), reversing 2026-08-24's "display
// abbreviated months, e.g. Aug". The abbreviation was bought when the heading
// shared its line with a narrow column; the desktop page is two columns and
// most of a window wide now, and "1 Sept 2026" was saving room nothing needs.
// The month gutter beside the grid keeps its own abbreviation — `monthFmt`
// below — where the reason still holds.
export const headingFmt = (d) =>
  formatDate({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }, d);

/**
 * The same heading with the month abbreviated, for a phone (author,
 * 2026-09-02: "today's date print on mobile in the large font on mobile was
 * always supposed to be 'Sep' not 'September' as I said only allow 'September'
 * on desktop view to avoid 2 rows for the date on mobile").
 *
 * The date is the largest type on the page, so at 360 px "Saturday, 5
 * September 2026" is two rows and every row costs the day's own content. The
 * short month is what buys the single line, and it is the reader's own short
 * month — `formatDate` goes through the pack, so this is «сент.» and Σεπ as
 * readily as Sep.
 */
export const headingShortFmt = (d) =>
  formatDate({ weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }, d);

export const weekdayFmt = (d) => formatDate({ weekday: 'short', timeZone: 'UTC' }, d);

// A date named inside a sentence rather than set as a heading: no weekday, and
// the month in full, because "13 Jan 2027" reads as a label and this reads as
// prose.
export const plainDateFmt = (d) => formatDate({ day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }, d);

// Abbreviated (author, 2026-08-21): the name sits in the gutter beside the
// grid, and a full "September" reached across into the dates.
export const monthFmt = (d) => formatDate({ month: 'short', year: 'numeric', timeZone: 'UTC' }, d);

/**
 * The month's whole name, for the calendar's own header row (author,
 * 2026-09-02: "display the full month name").
 *
 * `monthFmt` above abbreviates because it was printing into the gutter beside
 * the grid, where "September" reached across into the dates. The header has a
 * line of its own on a desktop now and no such constraint — and the name is
 * the largest thing the picker says about itself.
 */
export const monthLongFmt = (d) =>
  formatDate({ month: 'long', year: 'numeric', timeZone: 'UTC' }, d);

export const utc = (iso) => {
  const d = parseIso(iso);
  return new Date(Date.UTC(d.year, d.month - 1, d.day));
};

export // Through lib/i18n.js's cache rather than module constants (Amendment 36): a
// formatter built once can never change language.
const dayFmt = (d) => formatDate({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }, d);
