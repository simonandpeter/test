/**
 * Pure logic for the calendar page: date stepping, week framing, the
 * deterministic hero pick, interval display. No DOM — everything here is
 * unit-tested in Node, and the view is a thin renderer over it.
 */

import { gregorianToJdn, jdnToGregorian, isValidDate, toJdn, fromJdn } from './jdn.js';
import { toIsoDate } from './feasts.js';
import { STRINGS, fill } from '../ui/strings.js';
import { translateOffice } from './i18n.js';
import { translateDisplay } from './date-display.js';

export function parseIso(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? '');
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return isValidDate('gregorian', year, month, day) ? { year, month, day } : null;
}

export const todayIso = (now = new Date()) =>
  toIsoDate({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() });

export function addDaysIso(iso, n) {
  const d = parseIso(iso);
  return toIsoDate(jdnToGregorian(gregorianToJdn(d.year, d.month, d.day) + n));
}

/* ---- one civil day, named by two calendars (2026-09-02) ---------------- */

/**
 * What `calendar` calls the civil day `iso`.
 *
 * The day does not move: 2 September 2026 Gregorian and 20 August 2026 Julian
 * are one day under two names, thirteen apart because that is where the two
 * arithmetics currently stand. Returns `{year, month, day}` in that calendar.
 */
export function dateIn(calendar, iso) {
  const d = parseIso(iso);
  return fromJdn(calendar, gregorianToJdn(d.year, d.month, d.day));
}

/** The civil day on which `calendar` reads (year, month, day). */
export const isoOfDate = (calendar, { year, month, day }) =>
  toIsoDate(jdnToGregorian(toJdn(calendar, year, month, day)));

/**
 * **The other civil day that wears today's name.**
 *
 * Read `iso` in the `read` calendar, then find the civil day the `write`
 * calendar puts those same three numbers on. This is not a conversion of a
 * date — a date converts by standing still — it is the question an Old
 * Calendar reader asks of a New Calendar corpus: *my* church keeps 20 August
 * today, so which of the days you have recorded is the one your calendar
 * calls 20 August?
 *
 * Identity whenever the two calendars agree, which is every reader who has
 * not chosen a reckoning of their own, and every day of the two calendars
 * that already match. So nothing downstream needs to ask whether a shift is
 * in force before calling this.
 *
 * **A date the `write` calendar does not have keeps the day it was given.**
 * The Julian 29 February of 2100 is the first such day (the Revised Julian
 * drops that century's leap and the Gregorian has already), and there is no
 * honest answer for it: the corpus has no 29 February to point at, so the
 * reader stays on the civil day they are standing on rather than being sent
 * to a day that means something else. Seventy-four years away, and a guard
 * rather than a comment because the alternative is a silently wrong date.
 */
export function restateIso(iso, read, write) {
  if (read === write) return iso;
  const named = dateIn(read, iso);
  if (!isValidDate(write, named.year, named.month, named.day)) return iso;
  return isoOfDate(write, named);
}

/**
 * Days in a month of `calendar`, as the distance between two first-of-months.
 *
 * The Gregorian-only version of this lived in `views/daily/picker.js` and is
 * still there for the grid that has no calendar to ask; Addendum G5 has why it
 * is a subtraction rather than a walk upward from 28.
 */
export const daysInMonthOf = (calendar, { year, month }) =>
  toJdn(calendar, year + (month === 12 ? 1 : 0), month === 12 ? 1 : month + 1, 1) -
  toJdn(calendar, year, month, 1);

/** Monday-to-Sunday week containing the date. JDN 0 was a Monday. */
export function weekOf(iso) {
  const d = parseIso(iso);
  const jdn = gregorianToJdn(d.year, d.month, d.day);
  const monday = jdn - (jdn % 7);
  return Array.from({ length: 7 }, (_, i) => toIsoDate(jdnToGregorian(monday + i)));
}

/**
 * The saint the day opens on. Deterministic from the date and the day's
 * entries — the same day shows every visitor the same hero, so a shared link
 * is a shared page. Prefers saints that carry an image, silently.
 */
export function pickHero(iso, entries, bySlug, churchId = null) {
  const slugs = [...new Set(entries.map((e) => e.slug))].sort();
  if (slugs.length === 0) return null;
  // The saint the chosen church sings for that day — one with that church's
  // hymns recorded — is the day's principal commemoration in that church, and
  // stands as the hero before any image does (author, 2026-08-22); then the
  // saints with images; then anyone.
  const sung = churchId ? slugs.filter((slug) => bySlug.get(slug)?.hymned?.includes(churchId)) : [];
  const withImage = slugs.filter((slug) => bySlug.get(slug)?.image);
  /*
   * **And an icon breaks the tie inside the sung pool** (author, 2026-08-28:
   * "Make sure all main saint cards for each day and each calendar has an
   * image in its profile"). This does not reverse the 2026-08-22 rule above —
   * a saint the church sings for still outranks any imaged saint who is not —
   * it only decides *which* of the sung, where before that was the hash alone.
   *
   * Measured over **calendar year 2026**, which is the 133 day-and-church
   * combinations carrying at least one entry: without this tie-break **37**
   * led with an imageless hero and **32 distinct saints** were involved; with
   * it, **26** and **21** (2026-08-28). It was 38 / 27 / 22 until Macarie got
   * his portrait, so one icon closed exactly one day. The rest are days where
   * nobody the church sings for has an icon. Those are a data gap and are not
   * code's to close — an icon needs a licence someone has actually checked,
   * which is the rule this repository is built around.
   *
   * **State the population with the number.** This said "the days the four
   * calendars cover", which nobody could check. Re-measured then
   * against this amendment's own commit: the 133 and the 27 came back exactly,
   * which is what says the method is the same one — and the third figure did
   * not. It read 19 and is 22. A count whose denominator is a phrase is a
   * count nobody can audit, including the person who wrote it down.
   */
  const sungImaged = sung.filter((slug) => bySlug.get(slug)?.image);
  const pool = sungImaged.length
    ? sungImaged
    : sung.length
      ? sung
      : withImage.length
        ? withImage
        : slugs;
  // FNV-1a over the ISO date: stable across sessions and visitors.
  let h = 0x811c9dc5;
  for (const ch of iso) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return pool[(h >>> 0) % pool.length];
}

/**
 * The order the day's saints stand in: the hero, then the ones with a picture,
 * then the ones without.
 *
 * **The pictures come first and the imageless last** (author; the rule was
 * lost in the 2026-09-12 rebuild and restored the same day). 130 of the 862
 * folders carry an icon, so a day left in the corpus's own order is a handful
 * of pictures scattered through a wall of glyph mats — and the reader meets
 * the wall before they meet the day. Sorting them forward is not a claim that
 * an imaged saint matters more; it is the only lever the page has over how a
 * day *opens*, and the alternative is that the lever belongs to whichever
 * order the folders happened to be read in.
 *
 * **Stable within each half**, which is what keeps the rest of the rule
 * intact: `filter` preserves order, so inside the pictured group and inside
 * the imageless one the saints still stand in the day's own order — the one
 * order on this page that is not a judgement about which saint matters more.
 *
 * The hero leads regardless of whether it has a picture, because `pickHero`
 * has already preferred one and `views/daily/open.js` opens the first tile:
 * moving the day's principal commemoration down to sit with the imageless
 * would hand the open card to somebody else.
 */
export function dayOrder(entries, iso, bySlug, churchId = null) {
  const hero = pickHero(iso, entries, bySlug, churchId);
  const rest = entries.filter((e) => e.slug !== hero);
  const pictured = (e) => Boolean(bySlug.get(e.slug)?.image);
  return [
    ...entries.filter((e) => e.slug === hero),
    ...rest.filter(pictured),
    ...rest.filter((e) => !pictured(e)),
  ];
}

/**
 * The era, where a reader would otherwise have to supply it (author,
 * 2026-08-26: "add AD back to the dates so it's more obvious for stuff like
 * 'Reposed 105' what that means"). It was dropped then — "BC only,
 * no AD" — and this is that reversal, with a rule rather than a blanket:
 *
 *   marked where the number does not carry its own era. A three-digit year
 *   or a century inside the first millennium reads as a quantity as easily as
 *   a date; 1937 reads as a date to anyone. So "Reposed 105 AD" and "Reposed
 *   3rd C. AD", and "Reposed 1937" unchanged.
 *
 * It is appended only to a display that *ends in the number* — "under
 * Licinius" and "in the reign of Diocletian" are sentences, and "under
 * Licinius AD" is not English. A display that already names an era keeps its
 * own; the four BC entries in the corpus are among them.
 */
const ERA_OBVIOUS = 1000;

/**
 * Whether the era has to be said, decided **on the recorded English** and never
 * on whatever a pack made of it (2026-09-08). Every clause is a fact about the
 * English shape — it already says AD or BC, it ends in a year or in the century
 * abbreviation this page prints — and none of them survives translation: «IV в.»
 * ends in neither a digit nor "C.", and would have quietly stopped being marked
 * the moment the display started reading in Russian.
 */
function eraNeeded(text, iv) {
  if (!text || /\b(AD|BC)\b/.test(text)) return false;
  const bounds = [iv?.earliest, iv?.latest].filter((n) => typeof n === 'number');
  if (!bounds.length || Math.max(...bounds) >= ERA_OBVIOUS || Math.min(...bounds) <= 0) return false;
  return /(\d|\bC\.)$/.test(text);
}

function withEra(text, iv) {
  return eraNeeded(text, iv) ? fill(STRINGS.dates.ad, { when: text }) : text;
}

/** The same, where the sentence printed and the sentence judged are not one. */
function withEra2(text, english, iv) {
  return eraNeeded(english, iv) ? fill(STRINGS.dates.ad, { when: text }) : text;
}

/** A year interval for display: its own display string, or derived honestly. */
export function formatInterval(iv) {
  if (!iv) return STRINGS.dates.undated;
  // The data says "3rd century"; the page prints "3rd C." (author,
  // 2026-08-24). A render-time abbreviation, not a data edit: the displays
  // are quoted source-shaped strings and stay whole in the corpus.
  if (iv.display) {
    const english = iv.display.replace(/\bcentury\b/g, 'C.');
    /*
     * **And it reads in the reader's own language** (author, 2026-09-08:
     * "change lifespans to translated"), which reverses the line above this
     * one. `lib/date-display.js` argues the reversal, and hands the recorded
     * English straight back wherever it cannot account for a string *whole* —
     * so the fallback is exactly the behaviour that stood before it.
     */
    const said = translateDisplay(iv.display);
    return withEra2(said === iv.display ? english : said, english, iv);
  }
  const { earliest, latest } = iv;
  if (earliest === null && latest === null) return STRINGS.dates.undated;
  if (earliest === null) return withEra(fill(STRINGS.dates.before, { y: latest }), iv);
  if (latest === null) return withEra(fill(STRINGS.dates.after, { y: earliest }), iv);
  if (earliest === latest) return withEra(String(earliest), iv);
  return withEra(`${earliest}–${latest}`, iv);
}

export function formatLifespan(dates) {
  const birth = formatInterval(dates?.birth);
  const death = formatInterval(dates?.death);
  if (birth === STRINGS.dates.undated && death === STRINGS.dates.undated) {
    /*
     * Neither end is recorded, but the sources place the life somewhere — a
     * council the man sat at, a reign he lived under, a century a chronicler
     * puts him in (author, 2026-08-26: "find dates or at least centuries for
     * every saint"). `floruit` has carried that since the schema was written
     * and nothing printed it, so a saint whose life said "took part in the
     * Third Ecumenical Council" still read Undated.
     */
    const flourished = formatInterval(dates?.floruit);
    if (flourished !== STRINGS.dates.undated) return fill(STRINGS.dates.flourished, { when: flourished });
    return STRINGS.dates.undated;
  }
  // A life with no recorded beginning is read from its end (author,
  // 2026-08-24): "undated – 1779" told the reader what we do not know before
  // what we do. 304 of the corpus's lives open this way. The death display is
  // not always a year, so the preposition follows its shape: "in 1779",
  // "in the 5th century", and none for "before 556" or "under Licinius",
  // which carry their own.
  if (birth === STRINGS.dates.undated) {
    if (/^(before|after|under)\s/.test(death)) return fill(STRINGS.dates.repose, { when: death });
    if (/\bC\./.test(death)) return fill(STRINGS.dates.reposeInThe, { when: death });
    return fill(STRINGS.dates.reposeIn, { when: death });
  }
  return `${birth} – ${death}`;
}

/**
 * The line under a saint's name: what they held, then when they lived
 * (2026-08-27). The rank moved into the name with the naming addendum, and
 * the office moved out of it; this is where the office landed.
 *
 * Office first, because it is the half a reader is placing the name by, and
 * because the dates are the half that reads fine truncated.
 *
 * **It was printed as the corpus recorded it, which is English, and that is
 * reversed** (author, 2026-09-08: "Offices, e.g. 'Princess' or 'Abbot' etc.
 * not translated to other languages ... translate it"). The reasoning stood
 * here for a fortnight and is worth keeping beside its reversal: "Bishop of
 * Voronezh" is a fact about a see rather than a UI string, and the packs
 * cannot hold 340 of them. The first half is true and does not decide it — a
 * see has a name in Russian and in Greek, and printing the English one on an
 * otherwise Russian page is not deference to the record, it is a gap. The
 * second half was arithmetic, and wrong: the corpus's 337 offices are 139
 * distinct phrases built from 38 ranks and 96 places, and a pack holds them.
 * `lib/i18n.js`'s `translateOffice` is the reading, and a phrase no pack knows
 * still comes through in English.
 */
export function formatSubtext(card) {
  const life = formatLifespan(card?.dates);
  return card?.office ? `${translateOffice(card.office)} · ${life}` : life;
}
