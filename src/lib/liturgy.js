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
/* Still English, and deliberately: these name a *fasting reason* — "a Great
   Feast on a Friday" — which the packs translate through their `reasons` map,
   the arrangement Amendment 36 settled. Nothing else here composes words. */
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
 * *Which* day of the paschal cycle this is — a key, and the number the key
 * needs — rather than a sentence about it (author, 2026-08-26: "make sure you
 * print '13th week after Pentecost' in the chosen language as well").
 *
 * It returned an English string until then, composed here, which put a
 * sentence in the reader's language beyond reach: this module is the one
 * place that knows the paschal reckoning and the one place that must not know
 * about words. Amendment 36 recorded that as an accepted seam and HANDOFF has
 * carried it as open since. `ui/cycle-name.js` renders the key.
 *
 * The named Sundays of the Triodion and the Pentecostarion, the weeks of
 * Great Lent, Bright Week, and otherwise the Nth Sunday — or the weekday of
 * the Nth week — after Pentecost. A weekday belongs to the week that ends
 * with the coming Sunday, which is the lectionary's count and both the Greek
 * and the Slavic usage.
 *
 * `weekday` is 0 = Sunday, and is carried on every key that needs to name a
 * day: the Slavic and Greek names of Holy Week and Bright Week decline for
 * gender ("Великая Среда" beside "Великий Четверг"), so those two runs are
 * a table of seven in each pack rather than a template with a weekday poured
 * into it.
 */
export function cycleOf(iso, computus = 'julian') {
  const { jdn, pascha: p, next } = paschaAround(iso, computus);
  const d = jdn - p;
  const t = next - jdn;
  const weekday = weekdayOf(jdn);

  // Holy Week and the Triodion, counted back from the Pascha to come.
  if (t <= 70) {
    if (t === 70) return { key: 'publican' };
    if (t === 63) return { key: 'prodigal' };
    if (t === 56) return { key: 'meatfare' };
    if (t === 49) return { key: 'cheesefare' };
    if (t === 42) return { key: 'lent1' };
    if (t === 35) return { key: 'lent2' };
    if (t === 28) return { key: 'lent3' };
    if (t === 21) return { key: 'lent4' };
    if (t === 14) return { key: 'lent5' };
    if (t === 8) return { key: 'lazarus' };
    if (t === 7) return { key: 'palm' };
    if (t < 7) return { key: 'holyWeek', weekday };
    // The weeks between the Sundays take the name of the Sunday that ends
    // them: the fast-free week after the Publican and the Pharisee, Meatfare
    // Week before Meatfare Sunday, Cheesefare Week before Forgiveness Sunday.
    if (t > 63) return { key: 'publicanWeekday', weekday };
    if (t > 56) return { key: 'meatfareWeekday', weekday };
    if (t > 49) return { key: 'cheesefareWeekday', weekday };
    if (t === 48) return { key: 'cleanMonday' };
    return { key: 'lentWeekday', weekday, n: Math.floor((48 - t) / 7) + 1 };
  }

  if (d === 0) return { key: 'pascha' };
  if (d < 7) return { key: 'brightWeek', weekday };
  if (d === 7) return { key: 'thomas' };
  if (d === 14) return { key: 'myrrhbearers' };
  if (d === 21) return { key: 'paralytic' };
  if (d === 24) return { key: 'midPentecost' };
  if (d === 28) return { key: 'samaritan' };
  if (d === 35) return { key: 'blindMan' };
  if (d === 38) return { key: 'leavetaking' };
  if (d === 39) return { key: 'ascension' };
  if (d === 42) return { key: 'fathers' };
  if (d === 48) return { key: 'souls' };
  if (d === 49) return { key: 'pentecost' };
  if (d === 50) return { key: 'holySpirit' };
  if (d === 56) return { key: 'allSaints' };
  if (d < 49) return { key: 'paschaWeekday', weekday, n: Math.floor(d / 7) + 1 };
  if (weekday === 0) return { key: 'sundayAfterPentecost', n: (d - 49) / 7 };
  // The week that ends with the coming Sunday.
  return { key: 'weekAfterPentecost', n: Math.floor((d - 49) / 7) + 1 };
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
  /*
   * `reasonKind: 'greatFeast'` on every reason that is *only* the feast's own
   * name. The view drops the occasion chip for these when `greatFeast()` has
   * named the day, because "the Dormition" beside "Great Feast - The
   * Dormition of the Theotokos" is the author's own complaint of 2026-08-26
   * evening — "Don't mention the event for fasting in the fasting label, e.g.
   * the Beheading of the Forerunner, or Dormition" — reappearing one chip to
   * the right.
   *
   * The Beheading and the Eve of Theophany are deliberately *not* marked:
   * neither is in the Twelve, so nothing else on the line names them and the
   * chip is the only place a reader learns why the day is a fast. Nor are
   * "the Transfiguration, in the Dormition Fast" and "the Annunciation, in
   * Great Lent", which say which fast the feast sits inside — more than the
   * feast chip beside them says.
   */
  if (x === 1225 || x === 106) {
    return { kind: 'fast-free', reason: x === 1225 ? 'Nativity of the Lord' : 'Theophany', reasonKind: 'greatFeast' };
  }
  if (d >= 0 && d < 7) return { kind: 'fast-free', reason: 'Bright Week' };
  if (d >= 50 && d < 56) return { kind: 'fast-free', reason: 'the week after Pentecost' };
  if (x >= 1225 || x <= 104) return { kind: 'fast-free', reason: 'the days of the Nativity' };
  if (t > 63 && t < 70) return { kind: 'fast-free', reason: 'the week of the Publican and the Pharisee' };

  // Three strict days whatever the weekday.
  if (x === 829) return { kind: 'fast', reason: 'the Beheading of the Forerunner' };
  if (x === 914) return { kind: 'fast', reason: 'the Exaltation of the Cross', reasonKind: 'greatFeast' };
  if (x === 105) return { kind: 'fast', reason: 'the Eve of Theophany' };

  // Great Lent and Holy Week, with the two days fish is permitted.
  if (t <= 48) {
    if (t === 7) return { kind: 'fish', reason: 'Palm Sunday' };
    if (x === 325) return { kind: 'fish', reason: 'the Annunciation, in Great Lent' };
    return { kind: 'fast', reason: t < 7 ? 'Holy Week' : 'Great Lent' };
  }
  if (t > 49 && t < 56) {
    /*
     * Cheesefare carries `allows`, and it is the only branch here that does.
     * From 2026-08-26 a fast whose calendar printed no allowance is labelled
     * Strict Fasting by default (lib/fast-grade.js), and this is the one day
     * that default would contradict outright: the reason beside it says in as
     * many words that dairy and eggs are permitted. Where this function
     * already knows the allowance it hands it over rather than letting the
     * default guess past it.
     */
    return wedFri
      ? { kind: 'fast', reason: 'Cheesefare Week - no meat; dairy and eggs permitted', allows: 'dairy' }
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
      /*
       * `reasonKind` again, for the other reason a chip beside it can say
       * better: where `greatFeast()` names the day, "a Great Feast on a
       * Friday" and "Great Feast - The Dormition of the Theotokos" are the
       * same sentence twice. The two great feasts that are not of the Twelve
       * (24 and 29 June) reach this branch with nothing else to name them, so
       * the view suppresses on the *feast being named*, not on this mark
       * alone.
       */
      return { kind: 'fish', reason: `a Great Feast on a ${WEEKDAYS[wd]}`, reasonKind: 'greatFeast' };
    }
    /*
     * `reasonKind` marks the one reason that is not worth printing beside the
     * grade: on an ordinary Wednesday or Friday the reason *is* the weekday,
     * and the reader is looking at the date. The author's own example of the
     * 2026-08-26 relabelling is this exact case — "Fast - Friday" becomes
     * "Strict Fasting" — while "Strict Fasting - Great Lent" keeps its
     * reason, because that one says where in the year the reader is.
     */
    return { kind: 'fast', reason: WEEKDAYS[wd], reasonKind: 'weekday' };
  }
  if (x === 815) return { kind: 'fast-free', reason: 'the Dormition', reasonKind: 'greatFeast' };
  return { kind: 'fast-free', reason: null };
}

/* ---- the Great Feasts ----------------------------------------------------- */

/**
 * The nine *fixed* Great Feasts, keyed by month-day in the church's own
 * calendar, in the order the church year keeps them (1 September).
 *
 * These are not a new claim. `fasting()` above already asserts this list —
 * it is the `greatFixed` array its Wednesday-and-Friday branch reads, plus
 * the three it handles earlier because they override the weekday outright
 * (Nativity, Theophany, the Exaltation). Naming them is the same assertion
 * said out loud, so nothing here can drift from the fast rule without the
 * unit test that pins the two together going red.
 *
 * What is deliberately absent: the Nativity of the Forerunner (24 June) and
 * Saints Peter and Paul (29 June), which `greatFixed` carries because the
 * fish rule wants them and which are *great* feasts without being of the
 * Twelve; and the four movable ones — Pascha, Palm Sunday, the Ascension and
 * Pentecost — which the cycle line under the date already names in all five
 * languages (`STRINGS.calendar.cycle`), and naming them a second time in a
 * chip beside it would be the same words twice.
 */
const GREAT_FIXED = {
  908: 'nativityTheotokos',
  914: 'exaltation',
  1121: 'entryTheotokos',
  1225: 'nativity',
  106: 'theophany',
  202: 'meeting',
  325: 'annunciation',
  806: 'transfiguration',
  815: 'dormition',
};

/**
 * Which Great Feast the day is, or null. The month and day are taken in the
 * church's own calendar, exactly as the dated fasts are — which is why the
 * Russian calendar keeps the Dormition on the civil 28 August and the other
 * three on the 15th.
 *
 * The key is a `STRINGS.calendar.feasts` key, never a rendered name: the
 * words belong to the reader's language pack, not to this file.
 */
export function greatFeast(iso, churchId) {
  const church = CHURCHES_BY_ID[churchId];
  const calendar = church?.default_calendar ?? 'julian';
  const own = fromJdn(calendar, jdnOf(parse(iso)));
  return GREAT_FIXED[md(own)] ?? null;
}

/** Everything the Daily page prints under the date, for one church. */
export function liturgicalDay(iso, churchId) {
  const church = CHURCHES_BY_ID[churchId];
  const computus = church?.paschal_computus ?? 'julian';
  return {
    cycle: cycleOf(iso, computus),
    tone: tone(iso, computus),
    fasting: fasting(iso, churchId),
    feast: greatFeast(iso, churchId),
  };
}
