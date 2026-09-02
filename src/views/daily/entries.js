import { CHURCHES_BY_ID } from '../../data/churches.js';
import { recordedDay } from '../../data/days.js';
import { addDaysIso, parseIso, todayIso } from '../../lib/calendar-page.js';
import { churchDayFor, entriesInChurch } from '../../lib/church.js';
import { feastIndexFor } from '../../lib/feasts.js';
import { dayInWords } from './format.js';
import { state } from './state.js';

/**
 * Which saints a day has, and how far the corpus reaches.
 *
 * The feast index is built once per year and cached, because it is the same
 * arithmetic for every day of that year and the rail asks for a fortnight of
 * them at a time. Everything downstream reads a day through here — the hero,
 * the register, the day button's accessible name — so the page counts one
 * church everywhere rather than in the one place someone remembered.
 */

// The cache lives in lib/feasts.js now (Addendum G3), so the Index's
// feast-month facet and this page share one index rather than building the
// same walk over 742 saints twice.
const indexFor = (year, data) => feastIndexFor(data.saints, year, CHURCHES_BY_ID);

/**
 * The day's commemorations in the one calendar the page shows (author,
 * 2026-08-22). Everything downstream reads through here — the hero, the
 * register, the density dots under every date at both grains — so the page
 * counts one church everywhere rather than in the one place someone
 * remembered. The church itself is re-read from lib/church.js whenever it
 * changes, never cached beyond `state.calendar`.
 *
 * **And the day asked for is the reader's, while the day looked up is their
 * church's** (2026-09-02). `churchDayFor` is identity until a reckoning is
 * chosen, and when one is it hands back the civil day the church's own
 * calendar files today's name under — so the rail's density, the register,
 * the hero and the reach all move together rather than one of them being
 * remembered.
 */
export const allEntriesFor = (iso, data) => {
  const day = churchDayFor(iso, state?.calendar);
  return indexFor(parseIso(day).year, data).get(day) ?? [];
};

export const entriesFor = (iso, data) => entriesInChurch(allEntriesFor(iso, data), state?.calendar);

export const countFor = (iso, data) => entriesFor(iso, data).length;

/**
 * The church's record for the day the reader is keeping — readings, hymns and
 * the printed fasting note.
 *
 * The same restatement `allEntriesFor` makes, in the one other place the page
 * fetches a day by its civil date, and here rather than at each of the seven
 * call sites so that the two cannot answer for different days. Identity until
 * a reckoning is chosen.
 */
export const dayRecordFor = (iso, churchId = state?.calendar) =>
  recordedDay(churchDayFor(iso, churchId), churchId);

/**
 * How far ahead the corpus has a saint for, in the calendar the reader keeps.
 *
 * The Daily page prints this in the note for a day whose calendar is recorded
 * but whose saints are not folders yet, and until 2026-08-27 it printed a
 * literal - "the corpus reaches 19 September" - which had been stale for a
 * fortnight. A printed sentence that names a date is a sentence that goes
 * stale, so this reads it off the index instead.
 *
 * **The run, not the furthest date, and the run tolerates a gap.** The feast
 * index maps a saint's (month, day) onto every year, so the single Russian
 * saint with a November feast would have "the corpus reaches" say November
 * while the two months before it were bare. And an unbroken run is too strict
 * the other way: 28 August 2026 has no Russian folder at all - it is the
 * Dormition, whose subject is the feast - so a run that stops at the first
 * empty day would have reported today. What the sentence means is "we have
 * folders up to about here", so the walk carries on over a fortnight of
 * silence and stops at anything longer.
 */
const REACH_GAP = 14;

const reachCache = new Map();

function corpusReaches() {
  const key = state.calendar;
  if (reachCache.has(key)) return reachCache.get(key);
  let day = todayIso();
  let last = null;
  let empty = 0;
  for (let i = 0; i < 500; i += 1) {
    if (countFor(day, state.data) > 0) {
      last = day;
      empty = 0;
    } else if (last && (empty += 1) > REACH_GAP) break;
    day = addDaysIso(day, 1);
  }
  reachCache.set(key, last);
  return last;
}

/** The reach, named in the reader's language; an empty string if there is none. */
export const reachInWords = () => {
  const reach = corpusReaches();
  return reach ? dayInWords(reach) : '';
};
