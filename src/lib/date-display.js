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

/*
 * The same modifiers written as prose, which the readers do as often as not:
 * "end of the 14th century" beside "late 14th century", "mid 3rd century"
 * without its hyphen, and the two halves, which no modifier covered.
 */
const PHRASE = {
  early: 'centuryEarly',
  late: 'centuryLate',
  'mid-': 'centuryMid',
  mid: 'centuryMid',
  'beginning of': 'centuryEarly',
  'end of': 'centuryLate',
  'middle of': 'centuryMid',
  'first half of': 'centuryFirstHalf',
  'second half of': 'centurySecondHalf',
};
const PHRASES = Object.keys(PHRASE).sort((a, b) => b.length - a.length).join('|');

/* ---- the pieces, each returning null when it does not apply ------------- */

/**
 * `3rd century`, with any of `PHRASE`'s modifiers in front of it and an
 * optional `the` on either side of them — `the end of the 1st century` and
 * `late 1st century` are one shape to a reader.
 */
function readCentury(text) {
  // `mid-9th century` writes the modifier with a hyphen and no space; every
  // other phrase in `PHRASE` is words, so the hyphen is normalised here rather
  // than doubling the pattern.
  const said = text.replace(/^(the )?mid-/, '$1mid ');
  const m = new RegExp(`^(?:the )?(?:(${PHRASES}) (?:the )?)?(\\d+)(?:st|nd|rd|th) century$`).exec(said);
  if (!m) return null;
  return century(Number(m[2]), m[1] ? PHRASE[m[1]] : 'century');
}

/**
 * A bare ordinal: the half of a pair that leaves the word `century` to its
 * partner, as `4th or 5th century` does — and, since the 3 July drafts, as
 * `the mid-17th century, or the end of the 16th` does in the other direction.
 * It takes the same modifiers a whole century phrase takes, prose included.
 */
function readOrdinal(text, which = 'century') {
  const said = text.replace(/^(the )?mid-/, '$1mid ');
  const m = new RegExp(`^(?:the )?(?:(${PHRASES}) (?:the )?)?(\\d+)(?:st|nd|rd|th)$`).exec(said);
  if (!m) return null;
  return { n: Number(m[2]), modifier: m[1] ? PHRASE[m[1]] : which };
}

/**
 * `late 13th to early 14th century`, `9th to mid 10th century`: a span whose
 * two ends carry **their own** modifiers, which `centuryRange` cannot hold —
 * that pattern has one numeral pair and no room for a `late` on one side and an
 * `early` on the other. Each end is read as its own century phrase and the
 * pack's `centurySpan` joins them.
 */
function readCenturySpan(text) {
  const m = new RegExp(
    `^(?:the )?(?:(${PHRASES}) )?(\\d+)(?:st|nd|rd|th) to (?:(${PHRASES}) )?(\\d+)(?:st|nd|rd|th) centur(?:y|ies)$`,
  ).exec(text.replace(/mid-/g, 'mid '));
  if (!m) return null;
  return fill(STRINGS.dates.centurySpan, {
    a: century(Number(m[2]), m[1] ? PHRASE[m[1]] : 'century'),
    b: century(Number(m[4]), m[3] ? PHRASE[m[3]] : 'century'),
  });
}

/** `12th–13th century`, and the same pair written out: `the 12th and 13th centuries`. */
function readCenturyRange(text) {
  const m = /^(?:the )?(\d+)(?:st|nd|rd|th)\s*(?:[–-]|and)\s*(\d+)(?:st|nd|rd|th) centur(?:y|ies)$/.exec(text);
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

/** `May 925` — a month the source gives without a day. */
function readMonthYear(text) {
  const m = /^([A-Z][a-z]+) (\d{1,4})$/.exec(text);
  if (!m) return null;
  const month = MONTHS.indexOf(m[1]);
  if (month < 0) return null;
  const at = new Date(Date.UTC(2000, month, 1));
  at.setUTCFullYear(Number(m[2]));
  return dateFormatter({ month: 'long', year: 'numeric', timeZone: 'UTC' }).format(at);
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** `under Diocletian (284-305)`, `at the Council of Ephesus`. */
function readEra(text) {
  // The years after the reign are the source's own gloss on it and stay as
  // digits; only the phrase in front of them is a translation. A reading takes
  // them in parentheses or after a comma — «under Diocletian (284-305)» and
  // «under Justin I, 518-527» are one shape to a reader — and both keep the
  // punctuation they were written with.
  const m = /^(.+?)(?: \((\d+[–-]\d+)\)|, (\d+[–-]\d+))$/.exec(text);
  if (m) {
    const said = era(m[1]);
    if (said === null) return null;
    return m[2] ? `${said} (${m[2]})` : `${said}, ${m[3]}`;
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
  // `about 1228` is the same claim as `c. 1228` and readers write both, and
  // `1121 to 1130` the same range as `1121–1130`.
  const m = /^(c\. |about )?(\d+)(?:\s*(?:[–-]|to)\s*(\d+))?$/.exec(text);
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
    readCenturySpan(text) ??
    readCenturyRange(text) ??
    readCentury(text) ??
    readFullDate(text) ??
    readMonthYear(text) ??
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
  /*
   * `about` is `c.` in words, and a reader writes it in front of a whole
   * phrase as often as in front of a year: "about the end of the 1st century".
   * Taken off here for the same reason `probably` is — it wraps the phrase
   * rather than belonging to any part of it. `readNumber` keeps its own
   * `about` for the bare year, which reaches it by other routes.
   */
  let about = false;
  if (body.startsWith('about ')) {
    about = true;
    body = body.slice('about '.length);
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
    /*
     * `c.` sits in front of a year and a phrase wants the word: «ок. конец I
     * в.» reads as an abbreviation dropped in front of a noun in the wrong
     * case, and «примерно конец I в.» is what the language says.
     */
    if (about) {
      out = fill(STRINGS.dates[/^\d+$/.test(body) ? 'circa' : 'circaPhrase'], { when: out });
    }
    return probably ? fill(STRINGS.dates.probably, { when: out }) : out;
  };

  /*
   * The bounds, longest first so `not before 885` is not read as a `before`
   * with the word `not` left over.
   */
  const bound = [
    ['not before ', 'notBefore'],
    ['soon after ', 'soonAfter'],
    ['before ', 'before'],
    ['after ', 'after'],
  ].find(([word]) => body.startsWith(word));
  if (bound) {
    const rest = readTerm(body.slice(bound[0].length), null);
    if (rest !== null) return dress(fill(STRINGS.dates[bound[1]], { y: rest }));
    /*
     * Not a bound this can compose: "before the middle of the 5th century" has a
     * tail no term reads, and the packs carry it whole. Falling through to the era
     * table below is the only way such a phrase is ever reached.
     */
  }

  /*
   * A window rather than a bound: doxologia gives Xenia of Saint Petersburg's
   * repose as «între 1794 și 1806» and names no year, so the display is the
   * pair. Read before the `or` split below, because the `and` is the join here
   * and splitting on `or` would never reach it.
   */
  const window = /^between (.+) and (.+)$/.exec(body);
  if (window) {
    // `between the 13th and the 14th century` says the word once, on the end
    // that carries it, and means it at both ends.
    const shared = /centur(?:y|ies)$/.test(window[2]) ? 'century' : null;
    const a = readTerm(window[1], shared);
    const b = readTerm(window[2], null);
    if (a !== null && b !== null) return dress(fill(STRINGS.dates.between, { a, b }));
    return display;
  }

  /*
   * A year the source gives beside the other reckonings' years for the same
   * event: «1383, or 1373 by another reckoning». The tail is prose and belongs
   * to the pair, so it is read here rather than in a term, and the alternatives
   * are read one by one — one of them offers two.
   */
  const reckoned =
    /^(.+?), or (?:by (another|other) accounts? (.+)|(.+) by (?:(another) reckoning|(other) reckonings))$/.exec(body);
  if (reckoned) {
    // The year the source prefers can itself be a pair — «1707 or 1708» — so
    // the left side is read as a list, exactly as the tail is.
    const first = reckoned[1].split(' or ').map((part) => readTerm(part, null));
    const when = first.every((term) => term !== null) ? first.join(STRINGS.dates.or) : null;
    const one = (reckoned[2] ?? reckoned[5]) === 'another';
    const others = (reckoned[3] ?? reckoned[4]).split(' or ').map((part) => readTerm(part, null));
    if (when !== null && others.every((other) => other !== null)) {
      return dress(
        others.length === 1 && one
          ? fill(STRINGS.dates.byAnotherReckoning, { when, other: others[0] })
          : fill(STRINGS.dates.byOtherReckonings, { when, others: others.join(STRINGS.dates.or) }),
      );
    }
    return display;
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
  /*
   * A comma is the same join where a source lists years: `82, 85 or 86`. The
   * `, or ` of `about 1640, or 1664` is one join and not two, so it is spelled
   * out first — splitting on the comma alone left `or 1664` standing, which
   * nothing reads.
   */
  const parts = body.split(/,\s*or\s+|,\s*|\s+or\s+/);
  const said = [];
  /*
   * The word `century` is written once for the whole list, and **not always on
   * the last part**: `the mid-17th century, or the end of the 16th` puts it
   * first. So the list is asked whether any part carries it before any part is
   * read, rather than the previous reading's trailing part alone.
   */
  const carry = parts.some((part) => /centur(?:y|ies)$/.test(part)) ? 'century' : null;
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const term = readTerm(parts[i], carry);
    if (term === null) return display;
    said.unshift(term);
  }
  return dress(said.length > 1 ? said.join(STRINGS.dates.or) : said[0]);
}
