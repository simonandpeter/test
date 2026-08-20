/**
 * Display names for the non-Gregorian calendars' months, and the formatter
 * that renders a stored feast in its own reckoning. Gregorian month and
 * weekday names come from Intl rather than a table — the standard library is
 * not a vendor.
 *
 * A feast is always *stored* as (day, month, calendar) and converted at render
 * time; these names exist because the honest display of a Coptic feast is
 * "22 Tobi", not only the Gregorian date it happens to land on this year.
 */

const JULIAN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const COPTIC_MONTHS = [
  'Thout', 'Paopi', 'Hathor', 'Koiak', 'Tobi', 'Meshir',
  'Paremhat', 'Parmouti', 'Pashons', 'Paoni', 'Epip', 'Mesori', 'Nasie',
];

const ETHIOPIAN_MONTHS = [
  'Mäskäräm', 'Ṭəqəmt', 'Ḫədar', 'Taḫśaś', 'Ṭərr', 'Yäkatit',
  'Mägabit', 'Miyazya', 'Gənbot', 'Säne', 'Ḥamle', 'Nähase', 'Ṗagumen',
];

export const CALENDAR_LABELS = {
  gregorian: 'Gregorian',
  julian: 'Julian',
  coptic: 'Coptic',
  ethiopian: 'Ethiopian',
  paschal: 'Paschal',
};

export function monthName(calendar, month) {
  const table =
    calendar === 'coptic' ? COPTIC_MONTHS
    : calendar === 'ethiopian' ? ETHIOPIAN_MONTHS
    : JULIAN_MONTHS;
  return table[month - 1] ?? String(month);
}

/**
 * A feast in its own reckoning: "17 January (Julian)", "22 Tobi", "Pascha",
 * "49 days after Pascha". The Gregorian date it falls on in a given year is
 * the caller's business, via feastOccurrences.
 */
export function formatFeast(feast) {
  if (!feast) return '';
  if (feast.calendar === 'paschal') {
    const n = feast.offset ?? 0;
    if (n === 0) return 'Pascha';
    return n > 0 ? `${n} days after Pascha` : `${-n} days before Pascha`;
  }
  const name = `${feast.day} ${monthName(feast.calendar, feast.month)}`;
  // Coptic and Ethiopian month names identify their calendar by themselves;
  // Julian and Gregorian share month names, so those two must say which.
  if (feast.calendar === 'julian') return `${name} (Julian)`;
  if (feast.calendar === 'gregorian') return name;
  return name;
}
