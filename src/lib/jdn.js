/**
 * Calendar conversion, pivoted through the Julian Day Number.
 *
 * Every calendar converts to and from JDN and nothing converts directly to
 * anything else. Four calendars would otherwise need twelve conversion pairs
 * to maintain and test; through JDN it is eight functions, and adding a fifth
 * calendar later costs two more rather than eight.
 *
 * Years use astronomical numbering: 1 BC is year 0, 2 BC is year -1. Saints
 * include Old Testament figures venerated across all four communions, so the
 * BC range is real and not a hypothetical. Every formula here relies on
 * Math.floor's floor-division behaviour for negatives, which is what the
 * standard algorithms assume — do not substitute truncation.
 */

/** Days from JDN epoch to 1 Thout 1 AM (29 August 284 Julian), minus one. */
const COPTIC_EPOCH = 1825029;

/** Days from JDN epoch to 1 Mäskäräm 1 EC (29 August 8 Julian), minus one. */
const ETHIOPIC_EPOCH = 1724220;

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

/**
 * Coptic and Ethiopic share a structure — twelve 30-day months plus a short
 * thirteenth of 5 days, 6 when the year is one before a Julian leap year — and
 * differ only in epoch. Ethiopic years run 276 ahead of Coptic.
 */
function alexandrianToJdn(epoch, year, month, day) {
  return epoch + 365 * (year - 1) + Math.floor(year / 4) + 30 * (month - 1) + day;
}

function jdnToAlexandrian(epoch, jdn) {
  const n = jdn - epoch - 1;
  const cycle = Math.floor(n / 1461);
  const rem = n - cycle * 1461;
  // Within a four-year block the leap year is the third, so the day counts run
  // 365, 365, 366, 365. Written out rather than solved in closed form because
  // the closed form is where this kind of code usually goes wrong.
  let offset;
  let dayOfYear;
  if (rem < 365) {
    offset = 0;
    dayOfYear = rem;
  } else if (rem < 730) {
    offset = 1;
    dayOfYear = rem - 365;
  } else if (rem < 1096) {
    offset = 2;
    dayOfYear = rem - 730;
  } else {
    offset = 3;
    dayOfYear = rem - 1096;
  }
  return {
    year: cycle * 4 + offset + 1,
    month: Math.floor(dayOfYear / 30) + 1,
    day: (dayOfYear % 30) + 1,
  };
}

export const copticToJdn = (year, month, day) =>
  alexandrianToJdn(COPTIC_EPOCH, year, month, day);
export const jdnToCoptic = (jdn) => jdnToAlexandrian(COPTIC_EPOCH, jdn);
export const ethiopianToJdn = (year, month, day) =>
  alexandrianToJdn(ETHIOPIC_EPOCH, year, month, day);
export const jdnToEthiopian = (jdn) => jdnToAlexandrian(ETHIOPIC_EPOCH, jdn);

const TO_JDN = {
  gregorian: gregorianToJdn,
  julian: julianToJdn,
  coptic: copticToJdn,
  ethiopian: ethiopianToJdn,
};

const FROM_JDN = {
  gregorian: jdnToGregorian,
  julian: jdnToJulian,
  coptic: jdnToCoptic,
  ethiopian: jdnToEthiopian,
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
 * different date. This catches 30 February, and the sixth epagomenal day in a
 * non-leap Coptic year, through one rule instead of four.
 */
export function isValidDate(calendar, year, month, day) {
  if (!Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || day < 1) return false;
  const back = fromJdn(calendar, toJdn(calendar, year, month, day));
  return back.year === year && back.month === month && back.day === day;
}
