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
 */

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

export function monthName(calendar, month) {
  return MONTHS[month - 1] ?? String(month);
}

/**
 * A feast in its own reckoning: "17 January (Julian)", "17 January (Revised
 * Julian)", "Pascha", "49 days after Pascha". The Gregorian date it falls on
 * in a given year is the caller's business, via feastOccurrences.
 */
export function formatFeast(feast) {
  if (!feast) return '';
  if (feast.calendar === 'paschal') {
    const n = feast.offset ?? 0;
    if (n === 0) return 'Pascha';
    return n > 0 ? `${n} days after Pascha` : `${-n} days before Pascha`;
  }
  const name = `${feast.day} ${monthName(feast.calendar, feast.month)}`;
  // The fixed calendars share month names, so a feast says which it is in —
  // except the civil Gregorian, which is the page's own reckoning.
  if (feast.calendar === 'julian') return `${name} (Julian)`;
  if (feast.calendar === 'revised-julian') return `${name} (Revised Julian)`;
  return name;
}
