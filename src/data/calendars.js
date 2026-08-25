/**
 * Display names for the calendars a feast may be stated in, and the formatter
 * that renders a stored feast in its own reckoning. Gregorian month and
 * weekday names come from Intl rather than a table — the standard library is
 * not a vendor — and the Julian and Revised Julian share the Gregorian month
 * names, so one table serves the fixed calendars.
 *
 * A feast is always *stored* as (day, month, calendar) and converted at render
 * time. Two calendars here (author, 2026-08-22): `julian`, the Old Calendar,
 * and `revised-julian`, the New — fixed feasts on Gregorian dates, which is
 * why the Revised Julian converts exactly as the Gregorian does (lib/jdn.js).
 * The Coptic and Ethiopian month tables that stood here went with the
 * cross-church corpus (archive/cross-church-2026-08).
 *
 * **In the reader's language since 2026-08-26** (author: "The saint profile
 * pages do not have russian, greek, serbian or romanian translations"). Every
 * veneration row on every saint's page ran through here, so a Romanian reader
 * was told a feast falls on "17 January (Revised Julian)" on a page that was
 * otherwise Romanian throughout. The month comes from `Intl` in the current
 * language — which is where the rest of the site's dates already come from —
 * and the four phrases that are words rather than numbers come from the packs.
 *
 * The English behaviour is unchanged to the character, which is what lets the
 * existing tests stand as the check on it.
 */

import { formatDate, currentLanguage } from '../lib/i18n.js';
import { STRINGS, fill } from '../ui/strings.js';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const CALENDAR_LABELS = {
  gregorian: 'Gregorian',
  julian: 'Julian',
  'revised-julian': 'Revised Julian',
  paschal: 'Paschal',
};

/**
 * The month's name. English keeps the table — it is the corpus's own spelling
 * and the one the data files, the schema and every test are written against —
 * and the other four ask Intl, in a year with no bearing on the answer: a
 * month name does not depend on which year it is in, in any of these
 * languages, and the day-of-month is not being formatted here.
 */
export function monthName(calendar, month) {
  if (month < 1 || month > 12) return String(month);
  if (currentLanguage() === 'en') return MONTHS[month - 1];
  return formatDate({ month: 'long', timeZone: 'UTC' }, new Date(Date.UTC(2001, month - 1, 15)));
}

/**
 * A feast in its own reckoning: "17 January (Julian)", "17 January (Revised
 * Julian)", "Pascha", "49 days after Pascha". The Gregorian date it falls on
 * in a given year is the caller's business, via feastOccurrences.
 */
export function formatFeast(feast) {
  if (!feast) return '';
  const F = STRINGS.saint.feastIn;
  if (feast.calendar === 'paschal') {
    const n = feast.offset ?? 0;
    if (n === 0) return F.pascha;
    return n > 0 ? fill(F.afterPascha, { n }) : fill(F.beforePascha, { n: -n });
  }
  // The day before the month in every one of the five, which is why one
  // pattern serves them all; what differs is the word in the brackets.
  const name = fill(F.dayMonth, { day: feast.day, month: monthName(feast.calendar, feast.month) });
  // The fixed calendars share month names, so a feast says which it is in —
  // except the civil Gregorian, which is the page's own reckoning.
  const which = STRINGS.church.calendarNames?.[feast.calendar];
  return which ? fill(F.inCalendar, { feast: name, calendar: which }) : name;
}
