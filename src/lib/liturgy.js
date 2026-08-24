/**
 * The liturgical day (author, 2026-08-22): where a civil date stands in the
 * paschal cycle, the tone of the week, and whether it is a fast — each for one
 * church, because each follows that church's reckoning. Everything here is
 * derived from two things the registry already holds: the church's computus,
 * which fixes Pascha, and its calendar, which fixes the dated fasts and
 * feasts. Pure functions, no DOM, checked against the four churches' own
 * calendars for the week of 23 August 2026 in tests/liturgy.test.mjs.
 *
 * What it does not do, on purpose: it states whether a day is a fast and which
 * fast, and the two allowances every typikon shares — fish on a Great Feast
 * that falls on a fast day, and the fast lifted entirely for Nativity and
 * Theophany — and nothing finer. Oil, wine and the grades between them differ
 * between the Greek and Slavic typika and want sourcing per church before the
 * site states them (SESSIONS.md, Amendment 28).
 */

import { CHURCHES_BY_ID } from '../data/churches.js';
import { pascha } from './computus.js';
import { fromJdn, gregorianToJdn } from './jdn.js';

const jdnOf = ({ year, month, day }) => gregorianToJdn(year, month, day);
const parse = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return { year: +m[1], month: +m[2], day: +m[3] };
};
/** 0 = Sunday … 6 = Saturday. JDN 0 was a Monday. */
const weekdayOf = (jdn) => (jdn + 1) % 7;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

/** Pascha of the paschal year the day belongs to, and the next one, as JDNs. */
export function paschaAround(iso, computus = 'julian') {
  const d = parse(iso);
  const jdn = jdnOf(d);
  let year = d.year;
  let p = jdnOf(pascha(computus, year));
  if (jdn < p) {
    year -= 1;
    p = jdnOf(pascha(computus, year));
  }
  return { jdn, pascha: p, next: jdnOf(pascha(computus, year + 1)), paschalYear: year };
}

/**
 * The day's title in the paschal cycle: the named Sundays of the Triodion and
 * the Pentecostarion, the weeks of Great Lent, Bright Week, and otherwise the
 * Nth Sunday — or the weekday of the Nth week — after Pentecost. A weekday
 * belongs to the week that ends with the coming Sunday, which is the
 * lectionary's count and both the Greek and the Slavic usage.
 */
export function cycleTitle(iso, computus = 'julian') {
  const { jdn, pascha: p, next } = paschaAround(iso, computus);
  const d = jdn - p;
  const t = next - jdn;
  const wd = weekdayOf(jdn);
  const day = WEEKDAYS[wd];

  // Holy Week and the Triodion, counted back from the Pascha to come.
  if (t <= 70) {
    if (t === 70) return 'Sunday of the Publican and the Pharisee';
    if (t === 63) return 'Sunday of the Prodigal Son';
    if (t === 56) return 'Meatfare Sunday — the Last Judgement';
    if (t === 49) return 'Cheesefare Sunday — Forgiveness Sunday';
    if (t === 42) return '1st Sunday of Great Lent — the Triumph of Orthodoxy';
    if (t === 35) return '2nd Sunday of Great Lent — St Gregory Palamas';
    if (t === 28) return '3rd Sunday of Great Lent — the Veneration of the Cross';
    if (t === 21) return '4th Sunday of Great Lent — St John Climacus';
    if (t === 14) return '5th Sunday of Great Lent — St Mary of Egypt';
    if (t === 8) return 'Lazarus Saturday';
    if (t === 7) return 'Palm Sunday — the Entry into Jerusalem';
    if (t < 7) return `Great and Holy ${day}`;
    // The weeks between the Sundays take the name of the Sunday that ends
    // them: the fast-free week after the Publican and the Pharisee, Meatfare
    // Week before Meatfare Sunday, Cheesefare Week before Forgiveness Sunday.
    if (t > 63) return `${day} of the week of the Publican and the Pharisee`;
    if (t > 56) return `${day} of Meatfare Week`;
    if (t > 49) return `${day} of Cheesefare Week`;
    if (t === 48) return 'Clean Monday — Great Lent begins';
    const week = Math.floor((48 - t) / 7) + 1;
    return `${day} of the ${ordinal(week)} week of Great Lent`;
  }

  if (d === 0) return 'Pascha — the Resurrection of the Lord';
  if (d < 7) return `Bright ${day}`;
  if (d === 7) return 'Thomas Sunday — Antipascha';
  if (d === 14) return 'Sunday of the Myrrh-bearing Women';
  if (d === 21) return 'Sunday of the Paralytic';
  if (d === 24) return 'Mid-Pentecost';
  if (d === 28) return 'Sunday of the Samaritan Woman';
  if (d === 35) return 'Sunday of the Blind Man';
  if (d === 38) return 'Leavetaking of Pascha';
  if (d === 39) return 'Ascension of the Lord';
  if (d === 42) return 'Sunday of the Holy Fathers of the First Council';
  if (d === 48) return 'Saturday of Souls';
  if (d === 49) return 'Pentecost';
  if (d === 50) return 'Monday of the Holy Spirit';
  if (d === 56) return 'Sunday of All Saints';
  if (d < 49) return `${day} of the ${ordinal(Math.floor(d / 7) + 1)} week of Pascha`;
  if (wd === 0) return `${ordinal((d - 49) / 7)} Sunday after Pentecost`;
  // The week that ends with the coming Sunday.
  const n = Math.floor((d - 49) / 7) + 1;
  return `${ordinal(n)} week after Pentecost`;
}

/**
 * The tone of the week: the Octoechos turns once a week from Thomas Sunday
 * (Tone 1) until Palm Sunday of the next year, and a weekday keeps the tone
 * of the Sunday before it. Bright Week turns daily and leaves out the
 * seventh; Holy Week, Palm Sunday and Pentecost have no tone of the cycle.
 * Returns 1–8, or null.
 */
export function tone(iso, computus = 'julian') {
  const { jdn, pascha: p, next } = paschaAround(iso, computus);
  const d = jdn - p;
  const t = next - jdn;
  if (t <= 7) return null; // Palm Sunday and Holy Week
  if (d === 49) return null; // Pentecost
  if (d < 7) return [1, 2, 3, 4, 5, 6, 8][d]; // Bright Week, daily
  const thomas = p + 7;
  const sunday = jdn - weekdayOf(jdn); // the preceding-or-same Sunday
  const n = Math.floor((sunday - thomas) / 7);
  return ((n % 8) + 8) % 8 + 1;
}

/* ---- fasting -------------------------------------------------------------- */

const md = (date) => date.month * 100 + date.day;
const between = (x, a, b) => x >= a && x <= b;

/**
 * Whether the day is a fast for this church, and which. `kind` is one of
 * 'fast', 'fish' (a fast day on which fish is permitted — a Great Feast on a
 * Wednesday or Friday, the Transfiguration inside the Dormition Fast, Palm
 * Sunday and the Annunciation inside Great Lent) or 'fast-free'; `reason`
 * names the fast, the feast or the weekday. The dated fasts and feasts are
 * taken in the church's own calendar, which is why the Russian calendar is
 * still in the Dormition Fast when the Romanian and Greek are not.
 */
export function fasting(iso, churchId) {
  const church = CHURCHES_BY_ID[churchId];
  const computus = church?.paschal_computus ?? 'julian';
  const calendar = church?.default_calendar ?? 'julian';
  const { jdn, pascha: p, next } = paschaAround(iso, computus);
  const d = jdn - p;
  const t = next - jdn;
  const wd = weekdayOf(jdn);
  const own = fromJdn(calendar, jdn); // the day in the church's own calendar
  const x = md(own);
  const wedFri = wd === 3 || wd === 5;

  // The fast lifted entirely: Nativity and Theophany, and the fast-free weeks.
  if (x === 1225 || x === 106) return { kind: 'fast-free', reason: x === 1225 ? 'Nativity of the Lord' : 'Theophany' };
  if (d >= 0 && d < 7) return { kind: 'fast-free', reason: 'Bright Week' };
  if (d >= 50 && d < 56) return { kind: 'fast-free', reason: 'the week after Pentecost' };
  if (x >= 1225 || x <= 104) return { kind: 'fast-free', reason: 'the days of the Nativity' };
  if (t > 63 && t < 70) return { kind: 'fast-free', reason: 'the week of the Publican and the Pharisee' };

  // Three strict days whatever the weekday.
  if (x === 829) return { kind: 'fast', reason: 'the Beheading of the Forerunner' };
  if (x === 914) return { kind: 'fast', reason: 'the Exaltation of the Cross' };
  if (x === 105) return { kind: 'fast', reason: 'the Eve of Theophany' };

  // Great Lent and Holy Week, with the two days fish is permitted.
  if (t <= 48) {
    if (t === 7) return { kind: 'fish', reason: 'Palm Sunday' };
    if (x === 325) return { kind: 'fish', reason: 'the Annunciation, in Great Lent' };
    return { kind: 'fast', reason: t < 7 ? 'Holy Week' : 'Great Lent' };
  }
  if (t > 49 && t < 56) {
    return wedFri
      ? { kind: 'fast', reason: 'Cheesefare Week — no meat; dairy and eggs permitted' }
      : { kind: 'fast-free', reason: 'Cheesefare Week' };
  }

  // The Dormition Fast, 1–14 August in the church's calendar, with the
  // Transfiguration inside it.
  if (between(x, 801, 814)) {
    return x === 806 ? { kind: 'fish', reason: 'the Transfiguration, in the Dormition Fast' } : { kind: 'fast', reason: 'the Dormition Fast' };
  }
  // The Nativity Fast, 15 November – 24 December.
  if (x >= 1115 && x <= 1224) return { kind: 'fast', reason: 'the Nativity Fast' };
  // The Apostles' Fast, from the Monday after All Saints to 28 June — which
  // the New Calendar can shorten to nothing.
  if (d >= 57 && x <= 628 && x >= 501) return { kind: 'fast', reason: 'the Apostles’ Fast' };

  if (wedFri) {
    // A Great Feast on a Wednesday or Friday: fish.
    const greatFixed = [202, 325, 624, 629, 806, 815, 908, 1121];
    if (greatFixed.includes(x) || d === 24 || d === 38) {
      return { kind: 'fish', reason: `a Great Feast on a ${WEEKDAYS[wd]}` };
    }
    return { kind: 'fast', reason: WEEKDAYS[wd] };
  }
  if (x === 815) return { kind: 'fast-free', reason: 'the Dormition' };
  return { kind: 'fast-free', reason: null };
}

/** Everything the Daily page prints under the date, for one church. */
export function liturgicalDay(iso, churchId) {
  const church = CHURCHES_BY_ID[churchId];
  const computus = church?.paschal_computus ?? 'julian';
  return { title: cycleTitle(iso, computus), tone: tone(iso, computus), fasting: fasting(iso, churchId) };
}
