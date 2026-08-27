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

// The page's own date wears the abbreviated month (author, 2026-08-24:
// "display abbreviated months, e.g. Aug"); the buttons' aria-labels keep
// dayFmt's full month, because a label is spoken, not glanced at.
export const headingFmt = (d) =>
  formatDate({ weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }, d);

export const weekdayFmt = (d) => formatDate({ weekday: 'short', timeZone: 'UTC' }, d);

// A date named inside a sentence rather than set as a heading: no weekday, and
// the month in full, because "13 Jan 2027" reads as a label and this reads as
// prose.
export const plainDateFmt = (d) => formatDate({ day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }, d);

// Abbreviated (author, 2026-08-21): the name sits in the gutter beside the
// grid, and a full "September" reached across into the dates.
export const monthFmt = (d) => formatDate({ month: 'short', year: 'numeric', timeZone: 'UTC' }, d);

export const utc = (iso) => {
  const d = parseIso(iso);
  return new Date(Date.UTC(d.year, d.month - 1, d.day));
};
