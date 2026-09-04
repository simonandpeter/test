import { dateIn, parseIso } from '../../lib/calendar-page.js';
import { reckoningInForce } from '../../lib/church.js';
import { formatDate, formatDateParts } from '../../lib/i18n.js';

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

/**
 * The heading for one civil day, named in a calendar that is not the civil one
 * (author, 2026-09-02: picking Julian "stays as 2 Sep instead of going back 13
 * days").
 *
 * Two facts about one day, and they come from different places: the **weekday
 * is the civil day's**, because a Wednesday is a Wednesday in every reckoning
 * ever kept, and the **numerals are the chosen calendar's**. So the pattern is
 * taken from `Intl` for the reckoned date and the weekday field alone is
 * replaced — never two formatted strings joined by a comma this language may
 * not use.
 *
 * The reckoned date is handed to `Intl` as though it were Gregorian, which is
 * exactly what is wanted: nothing but the day, month and year numbers is read
 * off it, and those are the ones the reader is being shown.
 */
export const reckonedDate = (iso, calendar, options) => {
  const named = dateIn(calendar, iso);
  const asIf = new Date(Date.UTC(named.year, named.month - 1, named.day));
  const weekday = formatDateParts(options, utc(iso)).find((p) => p.type === 'weekday')?.value;
  return formatDateParts(options, asIf)
    .map((part) => (part.type === 'weekday' && weekday ? weekday : part.value))
    .join('');
};

/** The page's own heading, in a chosen calendar: `headingFmt`'s options. */
export const reckonedHeading = (iso, calendar, { short = false } = {}) =>
  reckonedDate(iso, calendar, {
    weekday: 'long',
    day: 'numeric',
    month: short ? 'short' : 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

/** A date named inside a sentence, in a chosen calendar: `plainDateFmt`'s. */
export const reckonedPlain = (iso, calendar) =>
  reckonedDate(iso, calendar, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** The month's own name, in a chosen calendar. */
export const reckonedMonth = (iso, calendar) =>
  reckonedDate(iso, calendar, { month: 'long', timeZone: 'UTC' });

// A date named inside a sentence rather than set as a heading: no weekday, and
// the month in full, because "13 Jan 2027" reads as a label and this reads as
// prose.
export const plainDateFmt = (d) => formatDate({ day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }, d);

/**
 * A date inside a sentence, in whatever calendar the reader is reading by —
 * `reckoningInForce()` now, not only `storedReckoning()` (2026-09-05): the
 * church's own default once "Follow my church" is what is in force, civil
 * only for a reader whose church keeps Gregorian or who has chosen it
 * outright. `reckonedPlain(iso, 'gregorian')` is identity with
 * `plainDateFmt(utc(iso))`, so this needs no branch for that case either.
 *
 * The two horizons the page names in prose — how far the corpus reaches, and
 * how far the day records do — are civil dates, and a reader being shown 20
 * August cannot be told the readings run out on "13 January" by a different
 * calendar than the one they are reading. `plainDateFmt` stays for the callers
 * that are civil by definition.
 */
export const dayInWords = (iso) => reckonedPlain(iso, reckoningInForce());

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
