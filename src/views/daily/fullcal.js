/**
 * The full-screen calendar (author, 2026-09-01).
 *
 * "Make an expandable calendar button under the weekly display called 'Full
 * Screen Calendar' that opens up a full screen calendar modal in the same style
 * as the smaller one but with lots more detail, with text of the fast days and
 * feasts and periods like dormition and great lent, christmas etc. Fill this in
 * with information from each church calendar as we have it and fill in any
 * content gaps you notice as you work."
 *
 * **Nothing here is a new claim about the church year.** Every word in the grid
 * is read from the same three places the Daily page reads its own single day
 * from — `liturgicalDay` for the fast and the Great Feast, `gradeForDay` over
 * the church's own printed note for which grade of fast, and the feast index
 * for how many saints the day carries. The month view under the week rail shows
 * one of those facts, as a colour; this shows all of them, as words. That is the
 * whole of what "lots more detail" is: the same data, unabbreviated.
 *
 * The periods strip is the one thing assembled rather than looked up, and it is
 * assembled by reading, not by asserting: the month's days are walked, each is
 * asked for its fast's reason, and runs of days that answer the same thing are
 * collapsed into one line. So "Great Lent - 19 February to 4 April" is a
 * *report* of what `lib/liturgy.js` said day by day, and it cannot drift from
 * the grid beside it or from the chip on the Daily page. Nothing here decides
 * where a fast begins.
 *
 * One church at a time, as every other surface on this page is (author,
 * 2026-08-22), and the modal says which in its own header rather than leaving
 * the reader to remember what the chrome is set to.
 */

import { toJdn } from '../../lib/jdn.js';
import { dateIn, daysInMonthOf, isoOfDate, todayIso } from '../../lib/calendar-page.js';
import { churchName, storedReckoning } from '../../lib/church.js';
import { escapeHtml as esc } from '../../lib/markdown.js';
import { greatFeast, liturgicalDay } from '../../lib/liturgy.js';
import { gradeForDay } from '../../lib/fast-grade.js';
import { formatDate, translateReason } from '../../lib/i18n.js';
import { STRINGS, fill } from '../../ui/strings.js';
import { countFor, dayRecordFor } from './entries.js';
import { plainDateFmt, reckonedMonth, reckonedPlain, utc, weekdayFmt } from './format.js';

import { state } from './state.js';
import { stepCursor } from './picker.js';

/*
 * A format of its own, because `format.js`'s month carries the year with it —
 * which reads as "1 - 14 Sep 2026" inside a strip already headed with the year.
 * The month's own name, in the reader's language.
 */
const longMonth = (d) => formatDate({ month: 'long', timeZone: 'UTC' }, d);

/** The button that opens it, under the week (author's placement, in those words). */
export const fullCalButton = () =>
  `<button type="button" class="fullcal-open" data-fullcal
    aria-haspopup="dialog">${esc(STRINGS.calendar.fullScreen)}</button>`;

/**
 * **The calendar this month is counted in** (2026-09-02), which is the small
 * picker's `gridCalendar` and the same decision: the civil one until the
 * reader chooses a reckoning of their own, and identity for the Revised
 * Julian, so nothing below branches on whether a shift is in force.
 *
 * The full-screen month is the same month as the one under the week, and a
 * reader who has just been shown 20 August by the page they opened it from
 * cannot be handed a grid of Septembers.
 */
const gridCalendar = () => storedReckoning() ?? 'gregorian';

const daysInMonth = (c) => daysInMonthOf(gridCalendar(), c);

/** The civil day the counted calendar puts (cursor, day) on. */
const isoAt = (c, day) => isoOfDate(gridCalendar(), { year: c.year, month: c.month, day });

/** A day's own number in the calendar this month is counted in. */
const numeralOf = (iso) => dateIn(gridCalendar(), iso).day;

/**
 * A day named in the calendar this month is counted in — the whole date for a
 * screen reader, and the month's name for the two strips beside the grid.
 *
 * The month matters more than it looks: a fast that runs from the Julian 1
 * August starts on the civil 14th, and printing "1 August" beside a numeral
 * taken from one calendar and a name taken from the other is how a strip comes
 * to read "20 September" for a day the grid above it calls 20 August.
 */
const dateTextOf = (iso) => {
  const chosen = storedReckoning();
  return chosen ? reckonedPlain(iso, chosen) : plainDateFmt(utc(iso));
};

const monthTextOf = (iso) => {
  const chosen = storedReckoning();
  return chosen ? reckonedMonth(iso, chosen) : longMonth(utc(iso));
};

/**
 * What a day's fast is, in the words the Daily page's own chip uses.
 *
 * The grade is read off the church's printed note where there is one and
 * defaulted where there is not — `lib/fast-grade.js` owns that boundary and
 * this must not restate it, which is why the note is fetched here and the
 * judgement is not made here.
 */
function fastOf(iso, church) {
  const day = liturgicalDay(iso, church);
  const f = day.fasting;
  const isFast = f.kind === 'fast' || f.kind === 'fish';
  const grade = isFast ? gradeForDay(f, dayRecordFor(iso, church)?.fastingNote) : null;
  return {
    kind: f.kind,
    reason: f.reason,
    reasonKind: f.reasonKind,
    grade,
    // The same three tones the rail's dots and the chip take, and for the same
    // reason they follow the grade rather than the kind: a chip whose colour
    // contradicts its own words is worse than an uncoloured one (calendar.js).
    tone: isFast ? (grade === 'fish' ? 'fish' : 'fast') : 'free',
    label: grade ? STRINGS.calendar.fastModal.grades[grade] : STRINGS.calendar.liturgy.free,
    feast: day.feast,
  };
}

/**
 * The runs of days in a month that share one reason for their fast.
 *
 * Read rather than declared: the days are walked and asked, and neighbours that
 * answer the same thing are joined. A reason that is only the weekday is left
 * out — "Friday" is not a period, and the grid prints the day's own name above
 * it anyway.
 */
export function periodsIn(cursor, church) {
  const runs = [];
  const days = daysInMonth(cursor);
  for (let day = 1; day <= days; day += 1) {
    const iso = isoAt(cursor, day);
    const f = fastOf(iso, church);
    /*
     * Two reasons are left out, and both because something else on the screen
     * says them better — the same suppression the Daily page's chips make and
     * the cells above make.
     *
     * A weekday is not a season: "Friday" would open a one-day run in this
     * strip for every Wednesday and Friday of the year, which is the calendar
     * telling the reader what day it is. And where the reason is only the
     * feast's own name, the feast has a line of its own under *Great Feasts* —
     * "a Great Feast on a Friday - 28 August" sitting above "The Dormition of
     * the Theotokos - 28 August" is one fact twice, and the vaguer of the two
     * first.
     */
    const named = f.feast && STRINGS.calendar.feasts.names[f.feast];
    const saidBetter = f.reasonKind === 'weekday' || (f.reasonKind === 'greatFeast' && named);
    const reason = saidBetter ? null : f.reason;
    if (!reason) continue;
    const last = runs[runs.length - 1];
    if (last && last.reason === reason && last.toDay === day - 1) {
      last.toDay = day;
      last.to = iso;
      continue;
    }
    runs.push({ reason, tone: f.tone, from: iso, to: iso, toDay: day });
  }
  return runs;
}

/** The Great Feasts falling in one month, in date order. */
export function feastsIn(cursor, church) {
  const found = [];
  const days = daysInMonth(cursor);
  for (let day = 1; day <= days; day += 1) {
    const iso = isoAt(cursor, day);
    const key = greatFeast(iso, church);
    if (key && STRINGS.calendar.feasts.names[key]) found.push({ iso, key });
  }
  return found;
}

/* ---- the markup --------------------------------------------------------- */

function dayCell(iso, church, data) {
  const f = fastOf(iso, church);
  const day = numeralOf(iso);
  const count = countFor(iso, data);
  const feastName = f.feast ? STRINGS.calendar.feasts.names[f.feast] : null;
  /*
   * The occasion is dropped where something else on the cell already says it —
   * the same suppression the Daily page's own chips make, for the same reason:
   * "the Dormition" under "The Dormition of the Theotokos" is one sentence
   * twice, and an ordinary Friday's reason is the weekday printed above it.
   */
  const saidBetter = f.reasonKind === 'weekday' || (f.reasonKind === 'greatFeast' && feastName);
  const occasion = f.reason && !saidBetter ? translateReason(f.reason) : null;
  const marks = [iso === todayIso() ? 'is-today' : '', iso === state.selected ? 'is-selected' : '']
    .filter(Boolean)
    .join(' ');
  return `<button type="button" class="fc-day fast-${esc(f.tone)}${marks ? ` ${marks}` : ''}"
      data-iso="${iso}"${iso === state.selected ? ' aria-current="date"' : ''}
      aria-label="${esc(dateTextOf(iso))} - ${esc(f.label)}">
      <span class="fc-num">${day}<span class="fc-day-name utility">${esc(weekdayFmt(utc(iso)))}</span></span>
      <span class="fc-fast utility">${esc(f.label)}</span>
      ${feastName ? `<span class="fc-feast">${esc(feastName)}</span>` : ''}
      ${occasion ? `<span class="fc-occasion utility">${esc(occasion)}</span>` : ''}
      ${count ? `<span class="fc-count utility">${esc(countLine(count))}</span>` : ''}
    </button>`;
}

const countLine = (n) =>
  n === 1 ? STRINGS.calendar.fullCountOne : fill(STRINGS.calendar.fullCount, { n: String(n) });

/** "1 - 14 August", or a single date where the run is one day. */
function span(run) {
  const from = numeralOf(run.from);
  const to = numeralOf(run.to);
  const month = monthTextOf(run.from);
  return from === to ? `${from} ${month}` : `${from} - ${to} ${month}`;
}

function grid(cursor, church, data) {
  // JDN 0 was a Monday, so the remainder is how many blanks the month opens
  // with — the same arithmetic the small month view uses, deliberately.
  const lead = toJdn(gridCalendar(), cursor.year, cursor.month, 1) % 7;
  /*
   * Any Monday-to-Sunday will do for the column headings, and 5-11 January 2026
   * is one — the names come from Intl in the reader's language, so the week they
   * are read off is arbitrary and only its weekdays matter.
   */
  const names = ['05', '06', '07', '08', '09', '10', '11'].map(
    (d) => `<span class="fc-wd utility">${esc(weekdayFmt(utc(`2026-01-${d}`)))}</span>`,
  );
  const cells = [];
  for (let i = 0; i < lead; i += 1) cells.push('<span class="fc-blank"></span>');
  const days = daysInMonth(cursor);
  for (let day = 1; day <= days; day += 1) {
    cells.push(dayCell(isoAt(cursor, day), church, data));
  }
  /*
   * One box around the two, and it is not cosmetic: `.fc-body` is the grid that
   * puts the month beside the month's seasons, so the day names and the days
   * have to arrive in it as a single item or they are dealt into two of its
   * columns — which is exactly what happened the first time this was written.
   */
  return `<div class="fc-month">
      <div class="fc-weekdays" aria-hidden="true">${names.join('')}</div>
      <div class="fc-grid">${cells.join('')}</div>
    </div>`;
}

function aside(cursor, church) {
  const S = STRINGS.calendar;
  const runs = periodsIn(cursor, church);
  const feasts = feastsIn(cursor, church);
  const periods = runs.length
    ? `<h3 class="register-heading">${esc(S.fullPeriods)}</h3>
       <ul class="fc-list">${runs
         .map(
           (run) => `<li class="fc-period fast-${esc(run.tone)}">
             <span class="fc-period-name">${esc(translateReason(run.reason))}</span>
             <span class="fc-period-span utility">${esc(span(run))}</span>
           </li>`,
         )
         .join('')}</ul>`
    : '';
  const great = feasts.length
    ? `<h3 class="register-heading">${esc(S.fullFeasts)}</h3>
       <ul class="fc-list">${feasts
         .map(
           (f) => `<li class="fc-great">
             <span class="fc-period-name">${esc(S.feasts.names[f.key])}</span>
             <span class="fc-period-span utility">${numeralOf(f.iso)} ${esc(monthTextOf(f.iso))}</span>
           </li>`,
         )
         .join('')}</ul>`
    : '';
  /*
   * A month with neither is not a gap in the data — most months of the year
   * have no Great Feast and several have no named fasting period — so it says
   * so in a sentence rather than showing two empty headings, which is the
   * furniture DESIGN.md 5b refuses.
   */
  return periods || great
    ? `<div class="fc-aside">${periods}${great}</div>`
    : `<div class="fc-aside"><p class="utility">${esc(S.fullQuiet)}</p></div>`;
}

/* ---- the dialog --------------------------------------------------------- */

/** The month the modal is showing, which starts at the day the page is on. */
let cursor = null;

function paint(dialog) {
  const { data } = state;
  const church = state.calendar;
  const S = STRINGS.calendar;
  const first = isoAt(cursor, 1);
  dialog.querySelector('[data-fc-title]').textContent = `${longMonth(utc(first))} ${cursor.year}`;
  dialog.querySelector('[data-fc-church]').textContent = churchName(church);
  dialog.querySelector('[data-fc-body]').innerHTML = `
    ${grid(cursor, church, data)}
    ${aside(cursor, church)}`;
  dialog.querySelector('[data-fc-step="-1"]').setAttribute('aria-label', S.prevMonth);
  dialog.querySelector('[data-fc-step="1"]').setAttribute('aria-label', S.nextMonth);
}

function build(el) {
  const S = STRINGS.calendar;
  const dialog = document.createElement('dialog');
  dialog.className = 'fullcal';
  dialog.setAttribute('aria-label', S.fullScreen);
  dialog.innerHTML = `
    <div class="fc-head">
      <div class="fc-title">
        <h2 data-fc-title></h2>
        <p class="fc-church utility" data-fc-church></p>
      </div>
      <div class="fc-nav">
        <button type="button" class="fc-step" data-fc-step="-1">&lsaquo;</button>
        <button type="button" class="fc-step" data-fc-step="1">&rsaquo;</button>
        <button type="button" class="fc-close" data-fc-close>${esc(S.fullClose)}</button>
      </div>
    </div>
    <div class="fc-body" data-fc-body></div>`;
  el.append(dialog);
  return dialog;
}

/**
 * Wires the button, and builds the dialog the first time it is asked for.
 *
 * Built late on purpose: a month of cells is a few hundred nodes and thirty-one
 * walks through the paschal arithmetic, and the overwhelming majority of visits
 * to the Daily page never open it. Nothing is paid for until it is.
 */
export function wireFullCal(el) {
  const open = el.querySelector('[data-fullcal]');
  if (!open) return null;
  let dialog = null;

  const step = (n) => {
    cursor = stepCursor(cursor, n);
    paint(dialog);
  };

  const onBody = (e) => {
    const stepper = e.target.closest('[data-fc-step]');
    if (stepper) {
      step(Number(stepper.dataset.fcStep));
      return;
    }
    if (e.target.closest('[data-fc-close]')) {
      dialog.close();
      return;
    }
    const day = e.target.closest('[data-iso]');
    if (day) {
      // Picking a day closes the calendar and moves the page under it, which is
      // what a reader who has just found a date wants; the small month view
      // deliberately does the opposite, because it is not covering the page.
      dialog.close();
      state.select(day.dataset.iso);
    }
  };

  /*
   * **The page goes down while this is open** (author, 2026-09-02: "make the
   * full screen calendar however have this animation of moving the rest of
   * the contents all down"). The flag is on the root because what moves is
   * `#view`, which this module does not own — calendar.css holds the motion
   * and the margins, and both are desktop-only.
   *
   * On `close` rather than only beside `dialog.close()`: Escape closes a modal
   * without going through any of this file's own handlers, and a page left
   * translated down with nothing over it is the worst of the three states.
   */
  const shift = (on) => {
    if (on) document.documentElement.dataset.fullcal = 'open';
    else delete document.documentElement.dataset.fullcal;
  };

  const onClose = () => shift(false);

  const onOpen = () => {
    if (!dialog) {
      dialog = build(el);
      dialog.addEventListener('click', onBody);
      dialog.addEventListener('close', onClose);
    }
    const { year, month } = dateIn(gridCalendar(), state.selected);
    cursor = { year, month };
    paint(dialog);
    dialog.showModal();
    shift(true);
  };

  open.addEventListener('click', onOpen);
  return () => {
    open.removeEventListener('click', onOpen);
    dialog?.removeEventListener('click', onBody);
    dialog?.removeEventListener('close', onClose);
    dialog?.remove();
    dialog = null;
    // Leaving the page with it open must not strand the shift on the root.
    shift(false);
  };
}
