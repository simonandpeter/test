/**
 * Calendar conversion, pivoted through the Julian Day Number.
 *
 * Every calendar converts to and from JDN and nothing converts directly to
 * anything else: n calendars need 2n functions rather than n(n-1) pairs, and
 * adding one costs two more. The cross-church build held four here (Coptic
 * and Ethiopian beside these two); the Orthodox project holds the Julian and
 * the Gregorian, which the Revised Julian shares until 2800 (below).
 *
 * Years use astronomical numbering: 1 BC is year 0, 2 BC is year -1. Saints
 * include Old Testament figures, so the BC range is real and not a
 * hypothetical. Every formula here relies on Math.floor's floor-division
 * behaviour for negatives, which is what the standard algorithms assume — do
 * not substitute truncation.
 */

export function gregorianToJdn(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

export function jdnToGregorian(jdn) {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    year: 100 * b + d - 4800 + Math.floor(m / 10),
    month: m + 3 - 12 * Math.floor(m / 10),
    day: e - Math.floor((153 * m + 2) / 5) + 1,
  };
}

export function julianToJdn(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
}

export function jdnToJulian(jdn) {
  const c = jdn + 32082;
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    year: d - 4800 + Math.floor(m / 10),
    month: m + 3 - 12 * Math.floor(m / 10),
    day: e - Math.floor((153 * m + 2) / 5) + 1,
  };
}

/*
 * The Revised Julian calendar (author, 2026-08-22): the New Calendar of the
 * Romanian and Greek churches, whose fixed feasts fall on Gregorian dates. Its
 * leap rule differs from the Gregorian only in which century years are leap
 * (the Revised Julian keeps those leaving 200 or 600 on division by 900), and
 * the two first disagree in 2800 — so until then it converts as the Gregorian
 * does, and that is what is implemented. The Coptic and Ethiopian calendars
 * that stood here went with the cross-church corpus.
 */
const TO_JDN = {
  gregorian: gregorianToJdn,
  julian: julianToJdn,
  'revised-julian': gregorianToJdn,
};

const FROM_JDN = {
  gregorian: jdnToGregorian,
  julian: jdnToJulian,
  'revised-julian': jdnToGregorian,
};

/** Calendars addressed by a fixed (day, month). Paschal feasts are not one. */
export const FIXED_CALENDARS = Object.keys(TO_JDN);

export function toJdn(calendar, year, month, day) {
  const fn = TO_JDN[calendar];
  if (!fn) throw new Error(`Unknown calendar: ${calendar}`);
  return fn(year, month, day);
}

export function fromJdn(calendar, jdn) {
  const fn = FROM_JDN[calendar];
  if (!fn) throw new Error(`Unknown calendar: ${calendar}`);
  return fn(jdn);
}

/**
 * True when (year, month, day) names a real day in that calendar.
 *
 * Checked by round-tripping rather than by per-calendar leap rules: an
 * impossible date still converts to some JDN, but that JDN converts back to a
 * different date. This catches 30 February and 29 February in a common year
 * through one rule instead of one per calendar.
 */
export function isValidDate(calendar, year, month, day) {
  if (!Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || day < 1) return false;
  const back = fromJdn(calendar, toJdn(calendar, year, month, day));
  return back.year === year && back.month === month && back.day === day;
}
