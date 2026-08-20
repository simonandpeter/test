/**
 * Two computus rules, because there are two Paschas.
 *
 * Rome and the Armenian Apostolic Church reckon Easter by the Gregorian
 * computus; the Eastern Orthodox, the Oriental Orthodox other than the
 * Armenians, and the Church of the East reckon it by the Julian one. They
 * coincide occasionally — 2025 was one such year — and otherwise diverge by
 * one, four or five weeks. A single easter() would therefore be silently wrong
 * for most of this corpus, which is why the church registry carries
 * paschal_computus and every movable feast resolves through it.
 *
 * Both functions return a Gregorian calendar date, so callers never have to
 * know which computus produced it.
 */

import { gregorianToJdn, jdnToGregorian, julianToJdn } from './jdn.js';

/** Anonymous Gregorian computus (Meeus/Jones/Butcher). */
export function gregorianEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = h + l - 7 * m + 114;
  return { year, month: Math.floor(n / 31), day: (n % 31) + 1 };
}

/**
 * Meeus's Julian algorithm. It yields a date in the Julian calendar, which is
 * then converted — this is the step that makes the 13-day gap fall out of the
 * general rule instead of being added as a constant that would quietly expire
 * in 2100.
 */
export function julianPascha(year) {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const n = d + e + 114;
  const julianMonth = Math.floor(n / 31);
  const julianDay = (n % 31) + 1;
  return jdnToGregorian(julianToJdn(year, julianMonth, julianDay));
}

const COMPUTUS = { gregorian: gregorianEaster, julian: julianPascha };

/** Gregorian date of Pascha in `year` under the named computus. */
export function pascha(computus, year) {
  const fn = COMPUTUS[computus];
  if (!fn) throw new Error(`Unknown paschal computus: ${computus}`);
  return fn(year);
}

/** Gregorian date `offset` days from Pascha. Negative offsets precede it. */
export function paschalOffset(computus, year, offset) {
  const p = pascha(computus, year);
  return jdnToGregorian(gregorianToJdn(p.year, p.month, p.day) + offset);
}
