/**
 * Which church the reader keeps (author, 2026-08-22): one of the registry's
 * four — Russian, Romanian, Greek or Serbian — and with it which calendar, because
 * the calendar follows the church (DESIGN.md §5b). One choice for the whole
 * site: the calendar page shows that church's calendar, the Index keeps that
 * church's saints and names what it sets aside, the saint's page reads that
 * church's register first. Asked once on a first visit, changed from the
 * header; `settings.church` holds it, `null` until the reader has answered.
 *
 * This replaces lib/tradition.js — a set of churches with communion and rite
 * toggles, and a separate calendar choice beneath it. A one-communion corpus
 * reads one church at a time, so what is left is Amendment 23's "one calendar
 * at a time" with the layer above it removed: the choice is the calendar.
 */

import { CHURCHES_BY_ID, enabledChurches } from '../data/churches.js';
import { STRINGS } from '../ui/strings.js';
import { readSettings, writeSetting } from './settings.js';

export const churchIds = () => enabledChurches().map((c) => c.id);

/** The stored choice, if the registry still holds it; null otherwise. */
export function storedChurch() {
  const id = readSettings().church;
  const church = typeof id === 'string' ? CHURCHES_BY_ID[id] : null;
  return church && church.enabled !== false ? id : null;
}

/** Null until the reader has answered; a church id once they have. */
export const hasChosen = () => storedChurch() !== null;

/**
 * Which calendar the site opens on before the reader has said (author,
 * 2026-08-26, with the coachmarks that replaced the first-visit gate — see
 * ui/coachmark.js for what that reverses and why the reversal is safe now).
 *
 * Until then this returned nothing, on purpose: a calendar page with no church
 * chosen would be the site picking one silently, so the page waited. What
 * makes a guess honest now is that it is *visible*. The header has named the
 * church on every page since 2026-08-24, a mark under that control says so on
 * a first visit, and the guess is never written to settings — `hasChosen()`
 * still says "the reader has not answered", the coachmark still appears next
 * visit, and the Index still calls this church's saints a selection rather
 * than the corpus.
 *
 * The guess is the browser's own language, which is the only thing about the
 * reader this site knows and does not ask for. It is read fresh each time
 * rather than cached: nothing here is worth a stale copy, and a reader who
 * changes their browser's language between visits should get the other answer.
 *
 * Russian where the browser says nothing useful, and that is a corpus fact
 * rather than a preference: 426 of the 742 folders stand in the Russian
 * calendar against 365 Greek, 127 Romanian and 129 Serbian, and its day
 * records run furthest — to 13 January 2027, where the Greek and Serbian stop
 * on 19 September. It is the calendar that has the most to show.
 */
const BY_LANGUAGE = { ro: 'romanian', ru: 'russian', el: 'greek', sr: 'serbian' };

export function defaultChurch() {
  const stored = readSettings().language;
  // The site's own language first where the reader has picked one — someone
  // reading in Romanian is not shown the Russian calendar — then the browser's.
  const tags = [stored, ...(typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language])];
  for (const tag of tags) {
    const id = BY_LANGUAGE[String(tag ?? '').slice(0, 2).toLowerCase()];
    if (id && CHURCHES_BY_ID[id]?.enabled !== false) return id;
  }
  return 'russian';
}

/**
 * The one live copy. Every consumer — the calendar, the Index, the saint's
 * page, the map — reads through here, so no view holds a copy to drift from
 * another's. Lazy: importing the module does not read storage.
 */
let current;

export function currentChurch() {
  if (current === undefined) current = storedChurch() ?? defaultChurch();
  return current;
}

/**
 * The church the reader has actually **said**, and null until they have.
 *
 * The two are different on a first visit and the difference decides what a
 * guess is allowed to do (2026-08-26). The Daily page reads `currentChurch()`,
 * because a day cannot be shown at all without a calendar and the guess is
 * what lets the page open instead of waiting. Everywhere the absence of a
 * choice was *already* handled gracefully, that handling stands and this is
 * what it reads:
 *
 *   the Index    keeps the whole corpus until the reader has chosen, rather
 *                than setting 316 of 742 saints aside on a page called All
 *                Saints on the strength of a browser language header;
 *   a saint      shows all four churches, holding nothing back, exactly as it
 *                did before there was a default;
 *   the map      counts the same way the Index does.
 *
 * So the guess is confined to the one page that cannot do without it, and the
 * three pages that can do without it are unchanged. A reader who answers the
 * question — from the header, where the coachmark points — gets the same site
 * either way.
 */
export const chosenChurch = () => storedChurch();

/* ---- change notification ------------------------------------------------ */

const listeners = new Set();

/** Views that read the church subscribe on render and unsubscribe on destroy. */
export function subscribeChurch(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ---- the reckoning, chosen apart from the church (2026-09-02) ----------- */

/**
 * Which reckoning the *page* reads by, when the reader has said.
 *
 * Author, 2026-09-02: the calendar's own header names the reckoning and
 * "have the ability only on desktop to click on this and in a drop down menu
 * select between Revised Julian, Julian and any other available calendar
 * dates. Make sure all dates on the website then change to match this selected
 * calendar date."
 *
 * **This is the Old/New Calendar setting the Orthodox build has been deferring
 * since it was seeded** (docs/HANDOFF-ORTHODOX.md §2.2 and §6, where it is the
 * withdrawn reckoning toggle of Amendments 16-19 "returning with a reason to
 * exist"). It arrives as an override rather than as a second church: a church
 * is who keeps the calendar and this is which arithmetic the day is read by,
 * and the two are separate questions the moment a reader wants their own
 * parish's practice rather than their patriarchate's default.
 *
 * Null means "follow the church" — not "civil", a distinction the label and
 * the heading did not keep until 2026-09-05 (author: "'Follow my church'
 * doesnt work as it implies but just goes to Gregorian ... make sure the
 * 'Follow my church' selection actually works as it says, so that if you
 * have Romanian calendar selected it goes to Revised Julian, Russian
 * calendar goes to Julian etc" — see `reckoningInForce` below). Gregorian is
 * an explicit third choice now rather than only ever an implicit default,
 * for the reader whose own church keeps Julian or Revised Julian but who
 * wants the civil date the URL is written in regardless.
 *
 * **What it does and does not reach, stated plainly.** It replaces the
 * calendar a *fixed* day is read in: the fasts, the Great Feasts, and which
 * civil day a fixed feast falls on. It does not touch the paschal computus —
 * all four churches here reckon Pascha by the Julian one, so there is nothing
 * to choose — and it does not rewrite what a saint's own attestation *says*:
 * the veneration register still prints "17 January (Julian)" because that is
 * what the source states, whatever reckoning the reader is reading the year
 * by.
 */
export const RECKONINGS = ['julian', 'revised-julian', 'gregorian'];

export function storedReckoning() {
  const id = readSettings().reckoning;
  return RECKONINGS.includes(id) ? id : null;
}

/** The reckoning in force for a church: the reader's own, or the registry's. */
export const calendarFor = (churchId) =>
  storedReckoning() ?? CHURCHES_BY_ID[churchId]?.default_calendar ?? 'julian';

/**
 * `calendarFor(currentChurch())` — the one answer every view that names a
 * reckoning now reads, in place of each keeping its own `storedReckoning()
 * ?? 'gregorian'` (2026-09-05, the fix recorded on `RECKONINGS` above).
 * `calendarFor` already governed the fast correctly on "Follow my church" —
 * a Russian reader was already shown the Julian Great Feasts with nothing
 * chosen, `calendarFor`'s own reason for existing apart from the plain
 * stored value — but the button's own word, the heading's numerals and the
 * grid's own month all read a *different*, unconditional `'gregorian'`
 * fallback, so the page routinely named itself "Gregorian" while quietly
 * reading its fast by Julian underneath. One function now answers both
 * questions the same way; `dateIn`/`reckonedHeading` already treat
 * `'gregorian'` as identity, so nothing downstream has to branch on whether
 * a reckoning is "really" in force.
 */
export const reckoningInForce = () => calendarFor(currentChurch());

/**
 * **`churchDayFor` is gone (author, 2026-09-04, reversing the 2026-09-02
 * decision recorded above): a chosen reckoning is a label, not a day.**
 *
 * The 2026-09-02 change made a reckoning move which of the church's recorded
 * days a reader was shown — 20 August under a Julian reckoning meant the
 * saints, readings and hymns of civil 2 September, thirteen days from today.
 * The author's own report that day ("it stays as 2 Sep instead of going back
 * 13 days") asked for the *heading* to read 20 August; the fix built moved
 * the content too, on the reasoning that fasts of one calendar beside saints
 * of another was a page reading no calendar that exists. That reasoning did
 * not hold up: today is today regardless of which calendar names it, and a
 * reader picking Julian was shown neither today's saints nor the day their
 * own church actually keeps — a real day nobody's calendar calls today,
 * under a label that used to be true and had quietly become a claim about a
 * different day. `allEntriesFor` and `dayRecordFor` (`views/daily/entries.js`)
 * and `recordsReach` (`views/daily/record.js`) now read the civil `iso`
 * directly; `dateIn`/`restateIso` (`lib/calendar-page.js`) still do the
 * labelling work everywhere the reckoning is only ever printed —
 * `reckonedHeading`/`reckonedPlain`/`reckonedMonth` (`views/daily/format.js`),
 * the rail and month numerals (`gridCalendar`), the full-screen calendar.
 */

/**
 * Chosen, or unchosen by passing null — which puts the reader back on their
 * church's own default rather than on a third state.
 *
 * Notifies through the same listeners the church does, and deliberately so:
 * every view that repaints when the calendar changes has to repaint when the
 * reckoning does, and they are the same views for the same reason.
 */
export function chooseReckoning(id) {
  if (id !== null && !RECKONINGS.includes(id)) throw new Error(`Unknown reckoning: ${id}`);
  writeSetting('reckoning', id);
  for (const fn of listeners) fn(current);
  return id;
}

export function chooseChurch(id) {
  if (!CHURCHES_BY_ID[id]) throw new Error(`Unknown church: ${id}`);
  current = id;
  writeSetting('church', id);
  for (const fn of listeners) fn(id);
  return id;
}

// Through STRINGS first (Amendment 36), so the locale packs reach it; the
// registry's display_name is the fallback and the English truth.
export const churchName = (id) => STRINGS.church.names?.[id] ?? CHURCHES_BY_ID[id]?.display_name ?? '';

/* ---- what it does ------------------------------------------------------- */

/** One church's share of a day: the entries that church's calendar keeps. */
export const entriesInChurch = (entries, churchId) =>
  churchId ? entries.filter((e) => e.church === churchId) : [];

/**
 * Whether a saint stands in this church's calendar: an attestation of
 * veneration by it. No church chosen yet keeps everything — an unanswered
 * reader has set nothing aside, and a filter that hid anyone before the
 * question was answered would be adjudicating by accident.
 */
export const keptBy = (card, churchId) =>
  !churchId ||
  (card.attestations ?? []).some((a) => a.church === churchId && a.status === 'venerated');
