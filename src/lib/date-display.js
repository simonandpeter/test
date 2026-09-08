/**
 * A recorded date *display* string, in the reader's own language.
 *
 * **This reverses `formatInterval`'s own refusal to touch a `display`**
 * (author, 2026-09-08: "change lifespans to translated"). That refusal was
 * right about what these strings are — quoted, source-shaped prose, written by
 * a reading rather than composed by the site — and wrong about what a reader
 * meets, which was «Архиепископ Константинопольский · c. 347 по Р. Х. – 14
 * September 407 по Р. Х.» and «Игумен · Кончина - 13th C.»: an English month
 * and an English ordinal in the middle of a Russian line, on the same line the
 * offices had just been translated on.
 *
 * **Parsed rather than tabulated**, which is the opposite choice from the
 * offices beside it, and the reason is the shape of the two corpora. An office
 * is 139 fixed phrases and the next one is unpredictable; a date display is
 * 438 strings built from a vocabulary of about fifteen words, and almost all
 * of the variety is *numbers*. A table would have to grow by a row for every
 * new year the corpus records. So the grammar is read here and the words come
 * from the packs.
 *
 * **Conservative on purpose.** Anything this cannot account for *whole* is
 * returned exactly as recorded — English, as it was before — rather than
 * half-translated. A date is a claim, and a claim rendered by a parser that
 * guessed at part of it is worse than one left in the language it was written
 * in. `tests/dates-display.test.mjs` walks the corpus and holds every display
 * string it actually contains to being recognised, so "unrecognised" stays a
 * statement about a *new* shape rather than a quiet fallback nobody sees.
 *
 * The one part that is a table is `eras`: "under Diocletian", "at the Council
 * of Ephesus" — a ruler's name is not a number and Slavonic wants a case for
 * it («при Диоклетиане»), so those nineteen phrases sit in the packs as whole
 * strings, the same pack-only arrangement `reasons` and `offices` use.
 */

import { STRINGS, fill } from '../ui/strings.js';
import { LANGUAGES_BY_ID, currentLanguage, dateFormatter } from './i18n.js';

const pack = () => LANGUAGES_BY_ID[currentLanguage()]?.pack ?? null;

/** A whole recorded phrase the packs carry, or null where they do not. */
const era = (text) => pack()?.eras?.[text] ?? null;

/*
 * Roman numerals, because three of the five languages set a century in them
 * («IV в.», "sec. al IV-lea"), Greek sets it in Arabic and English in its own
 * ordinal.
 *
 * **Which one is a pack's decision and travels as `dates.centuryNumeral`**, so
 * every pattern has the one `{n}` and the numeral arrives already in the right
 * shape. Handing all three tokens to the pattern and letting each pack pick was
 * tried first and `tests/i18n.test.mjs` refused it, correctly: that test holds
 * a translation to the *same* placeholders as its English base, which is what
 * catches a dropped `{name}`, and a branch where the packs deliberately use
 * different tokens would have had to be exempted from it. A named numeral
 * style costs one key and keeps the check.
 */
const ROMAN = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

function roman(n) {
  let left = n;
  let out = '';
  for (const [value, sign] of ROMAN) {
    while (left >= value) {
      out += sign;
      left -= value;
    }
  }
  return out;
}

/** English's own ordinal suffix, which only the English base ever prints. */
const ordinal = (n) => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
};

const centuryPattern = (which) => STRINGS.dates[which] ?? STRINGS.dates.century;

/** The century's number as this language writes it. */
function numeral(n) {
  const style = STRINGS.dates.centuryNumeral;
  if (style === 'roman') return roman(n);
  if (style === 'arabic') return String(n);
  return ordinal(n);
}

const century = (n, which = 'century') => fill(centuryPattern(which), { n: numeral(n) });

/** `12th–13th century`, either dash. */
const centuryRange = (a, b) => fill(STRINGS.dates.centuryRange, { a: numeral(a), b: numeral(b) });

const MODIFIER = { early: 'centuryEarly', late: 'centuryLate', 'mid-': 'centuryMid' };

/* ---- the pieces, each returning null when it does not apply ------------- */

/** `3rd century`, with an optional `early`/`late`/`mid-` in front. */
function readCentury(text) {
  const m = /^(early |late |mid-)?(\d+)(?:st|nd|rd|th) century$/.exec(text);
  if (!m) return null;
  return century(Number(m[2]), m[1] ? MODIFIER[m[1].trim() === 'mid-' ? 'mid-' : m[1].trim()] : 'century');
}

/** A bare ordinal, which only ever appears as the left half of `4th or 5th century`. */
function readOrdinal(text, which = 'century') {
  const m = /^(early |late |mid-)?(\d+)(?:st|nd|rd|th)$/.exec(text);
  if (!m) return null;
  return { n: Number(m[2]), modifier: m[1] ? MODIFIER[m[1].trim() === 'mid-' ? 'mid-' : m[1].trim()] : which };
}

/** `12th–13th century`. */
function readCenturyRange(text) {
  const m = /^(\d+)(?:st|nd|rd|th)[–-](\d+)(?:st|nd|rd|th) century$/.exec(text);
  return m ? centuryRange(Number(m[1]), Number(m[2])) : null;
}

/** `13 November 354` — through Intl, so the month is the reader's own word. */
function readFullDate(text) {
  const m = /^(\d{1,2}) ([A-Z][a-z]+) (\d{1,4})$/.exec(text);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2]);
  if (month < 0) return null;
  /*
   * `Date.UTC` refuses to place a year under 100 where it means it — it reads
   * 67 as 1967 — so the year is set explicitly afterwards. Every date this
   * meets is a real Gregorian-projected calendar date the corpus wrote down;
   * the formatter only ever changes the words, never the numbers.
   */
  const at = new Date(Date.UTC(2000, month, Number(m[1])));
  at.setUTCFullYear(Number(m[3]));
  return dateFormatter({ day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(at);
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** `under Diocletian (284-305)`, `at the Council of Ephesus`. */
function readEra(text) {
  // The parenthetical years are the source's own gloss on the reign and stay
  // as digits; only the phrase in front of them is a translation.
  const m = /^(.+) \((\d+[–-]\d+)\)$/.exec(text);
  if (m) {
    const said = era(m[1]);
    return said === null ? null : `${said} (${m[2]})`;
  }
  return era(text);
}

/**
 * A plain year or a year range, either of which may wear `c.`. The era is not
 * read here: it is stripped once, from the whole string, by `translateDisplay`
 * — because in "7th-6th century BC" it belongs to the pair and not to either
 * end of it, and one place reading it is the only way that stays true.
 */
function readNumber(text) {
  const m = /^(c\. )?(\d+)(?:[–-](\d+))?$/.exec(text);
  if (!m) return null;
  const out = m[3] ? fill(STRINGS.dates.yearRange, { a: m[2], b: m[3] }) : m[2];
  return m[1] ? fill(STRINGS.dates.circa, { when: out }) : out;
}

/**
 * One phrase with no `or` in it. `carry` is the century a later half of an
 * `or` supplied — "4th or 5th century" says *century* once and means it twice.
 */
function readTerm(text, carry) {
  const ord = readOrdinal(text, carry);
  if (ord && carry) return century(ord.n, ord.modifier);
  return (
    readCenturyRange(text) ??
    readCentury(text) ??
    readFullDate(text) ??
    readNumber(text) ??
    readEra(text) ??
    null
  );
}

/**
 * The whole recorded display, or the recorded English where any part of it is
 * a shape this does not know.
 */
export function translateDisplay(display) {
  const text = String(display ?? '').trim();
  if (!text) return display;
  if (currentLanguage() === 'en' || !pack()) return display;

  /*
   * The two things that wrap the whole phrase rather than any part of it, taken
   * off here and put back at the end. `BC` in "7th-6th century BC" belongs to
   * the pair, not to either end of it, and reading it in one place is the only
   * way that stays true as the parts below get more capable.
   */
  let body = text;
  let probably = false;
  if (body.startsWith('probably ')) {
    probably = true;
    body = body.slice('probably '.length);
  }
  let mark = null;
  const marked = /^(.*)( BC| AD)$/.exec(body);
  if (marked) {
    mark = marked[2].trim();
    body = marked[1];
  }

  const dress = (said) => {
    let out = said;
    if (mark === 'BC') out = fill(STRINGS.dates.bc, { when: out });
    else if (mark === 'AD') out = fill(STRINGS.dates.ad, { when: out });
    return probably ? fill(STRINGS.dates.probably, { when: out }) : out;
  };

  if (body.startsWith('before ') || body.startsWith('after ')) {
    const which = body.startsWith('before ') ? 'before' : 'after';
    const rest = readTerm(body.slice(which.length + 1), null);
    return rest === null ? display : dress(fill(STRINGS.dates[which], { y: rest }));
  }

  /*
   * A recorded phrase is tried whole before it is taken apart, because one of
   * them has an `or` inside it that is not a join at all: "under Hadrian or
   * Antoninus" is one reign-or-the-other, and splitting it hands the second
   * half over as a bare name nothing can read.
   */
  const whole = readEra(body);
  if (whole !== null) return dress(whole);

  /*
   * `or` is the only join in the corpus, and it is read right to left because
   * the *right* half is the one that carries the unit: "4th or 5th century" and
   * "late 9th or 10th century" each say century once and mean it twice. A left
   * half that is a bare ordinal takes it; anything else stands on its own.
   */
  const parts = body.split(' or ');
  const said = [];
  let carry = null;
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const term = readTerm(parts[i], carry);
    if (term === null) return display;
    if (i === parts.length - 1 && /century$/.test(parts[i])) carry = 'century';
    said.unshift(term);
  }
  return dress(said.length > 1 ? said.join(STRINGS.dates.or) : said[0]);
}
